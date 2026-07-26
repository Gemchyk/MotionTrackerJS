const tf = require('@tensorflow/tfjs');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const jpeg = require('jpeg-js');

const DATA_URL_PREFIX = /^data:image\/\w+;base64,/;

class ModelNotReadyError extends Error {
    constructor() {
        super('Model is not ready yet.');
        this.name = 'ModelNotReadyError';
    }
}

class InvalidFrameError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InvalidFrameError';
    }
}

/** Loads COCO-SSD once and runs detection on incoming JPEG frames. */
class TrackingService {
    constructor({ retries, retryDelayMs }) {
        this.model = null;
        this.isReady = false;
        this.retries = retries;
        this.retryDelayMs = retryDelayMs;
    }

    /**
     * Loads the model, retrying on failure. The previous version gave up after
     * one attempt, leaving the server permanently reporting "not ready".
     */
    async initializeModel() {
        await tf.setBackend('cpu');
        await tf.ready();

        for (let attempt = 1; attempt <= this.retries; attempt += 1) {
            try {
                console.log(`Loading COCO-SSD model (attempt ${attempt}/${this.retries})...`);
                this.model = await cocoSsd.load();
                this.isReady = true;
                console.log('Model loaded successfully.');
                return;
            } catch (error) {
                console.error(`Model load attempt ${attempt} failed:`, error.message);
                if (attempt < this.retries) {
                    await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
                }
            }
        }

        console.error('Giving up on model load; /api/detect will stay unavailable.');
    }

    /** Decodes a base64 JPEG data URL into an int32 RGB tensor. */
    static decodeFrame(base64Image) {
        if (typeof base64Image !== 'string' || base64Image.length === 0) {
            throw new InvalidFrameError('Frame must be a non-empty base64 string.');
        }

        const base64Data = base64Image.replace(DATA_URL_PREFIX, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        if (imageBuffer.length === 0) {
            throw new InvalidFrameError('Frame is not valid base64 data.');
        }

        let rawImageData;
        try {
            rawImageData = jpeg.decode(imageBuffer, { useTArray: true });
        } catch (error) {
            throw new InvalidFrameError('Frame is not a decodable JPEG image.');
        }

        const { width, height, data } = rawImageData;
        const numPixels = width * height;
        const rgbPixels = new Int32Array(numPixels * 3);

        // Drop the alpha channel: RGBA source -> RGB tensor input.
        for (let i = 0; i < numPixels; i += 1) {
            rgbPixels[i * 3] = data[i * 4];
            rgbPixels[i * 3 + 1] = data[i * 4 + 1];
            rgbPixels[i * 3 + 2] = data[i * 4 + 2];
        }

        return tf.tensor3d(rgbPixels, [height, width, 3], 'int32');
    }

    async detectObjects(base64Image) {
        if (!this.isReady || !this.model) {
            throw new ModelNotReadyError();
        }

        let tensor = null;
        try {
            tensor = TrackingService.decodeFrame(base64Image);
            return await this.model.detect(tensor);
        } finally {
            tensor?.dispose();
        }
    }

    getStatus() {
        return this.isReady;
    }
}

module.exports = { TrackingService, ModelNotReadyError, InvalidFrameError };
