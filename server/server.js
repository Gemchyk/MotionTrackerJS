const express = require('express');
const cors = require('cors');
const tf= require('@tensorflow/tfjs');
const cocoSsd = require('@tensorflow-models/coco-ssd');
const jpeg = require('jpeg-js');

class TrackingService {
    constructor() {
        this.model = null;
        this.isReady = false;
        this.initializeModel();
    }

    async initializeModel() {
        try {
            await tf.setBackend('cpu');
            await tf.ready();
            
            console.log('Loading COCO-SSD model using standard TensorFlow (Pure JS)...');
            this.model = await cocoSsd.load();
            this.isReady = true;
            console.log('Model loaded successfully.');
        } catch (error) {
            console.error('Failed to load model:', error);
        }
    }

    async detectObjects(base64Image) {
        if (!this.isReady || !this.model) {
            throw new Error('Model is not ready yet.');
        }

        let tensor = null;

        try {
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64');

            const rawImageData = jpeg.decode(imageBuffer, { useTArray: true });

            const numPixels = rawImageData.width * rawImageData.height;
            const rgbPixels = new Int32Array(numPixels * 3);
            
            for (let i = 0; i < numPixels; i++) {
                rgbPixels[i * 3] = rawImageData.data[i * 4];         // Red
                rgbPixels[i * 3 + 1] = rawImageData.data[i * 4 + 1]; // Green
                rgbPixels[i * 3 + 2] = rawImageData.data[i * 4 + 2]; // Blue
            }

            tensor = tf.tensor3d(rgbPixels, [rawImageData.height, rawImageData.width, 3], 'int32');
            const predictions = await this.model.detect(tensor);
            return predictions;

        } catch (error) {
            console.error('Error during image processing:', error);
            throw new Error('Failed to process image frame.');
        } finally {
            if (tensor) {
                tensor.dispose();
            }
        }
    }

    getStatus() {
        return this.isReady;
    }
}

class TrackingServer {
    constructor(port) {
        this.app = express();
        this.port = port;
        
        this.trackingService = new TrackingService();
        
        this.initializeMiddlewares();
        this.initializeRoutes();
    }

    initializeMiddlewares() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' })); 
    }

    initializeRoutes() {
        this.app.get('/api/status', (req, res) => {
            res.status(200).json({ 
                server: 'Running', 
                aiModelReady: this.trackingService.getStatus() 
            });
        });

        this.app.post('/api/detect', async (req, res) => {
            try {
                const { frame } = req.body;

                if (!frame) {
                    return res.status(400).json({ error: 'No image frame provided in the request body.' });
                }

                if (!this.trackingService.getStatus()) {
                    return res.status(503).json({ error: 'AI Model is still warming up. Try again in a moment.' });
                }

                const predictions = await this.trackingService.detectObjects(frame);
                
                res.status(200).json({ 
                    success: true, 
                    objects: predictions 
                });

            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`Server is running on http://localhost:${this.port}`);
        });
    }
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const server = new TrackingServer(PORT);
server.start();