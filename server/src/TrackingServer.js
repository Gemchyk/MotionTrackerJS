const express = require('express');
const cors = require('cors');
const { ModelNotReadyError, InvalidFrameError } = require('./TrackingService');

class TrackingServer {
    constructor(trackingService, config) {
        this.app = express();
        this.config = config;
        this.trackingService = trackingService;
        this.httpServer = null;

        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandler();
    }

    initializeMiddlewares() {
        // Previously cors() allowed every origin; now restricted to the client.
        this.app.use(cors({ origin: this.config.allowedOrigins }));
        this.app.use(express.json({ limit: this.config.maxPayloadSize }));
    }

    initializeRoutes() {
        this.app.get('/api/status', (req, res) => {
            res.status(200).json({
                server: 'Running',
                aiModelReady: this.trackingService.getStatus(),
            });
        });

        this.app.post('/api/detect', async (req, res, next) => {
            try {
                const { frame } = req.body ?? {};

                if (typeof frame !== 'string' || frame.length === 0) {
                    return res
                        .status(400)
                        .json({ error: 'Request body must include a base64 "frame" string.' });
                }

                const objects = await this.trackingService.detectObjects(frame);
                return res.status(200).json({ success: true, objects });
            } catch (error) {
                return next(error);
            }
        });
    }

    /**
     * Maps known failures to status codes and hides everything else behind a
     * generic message, so internal details never reach the client.
     */
    initializeErrorHandler() {
        // eslint-disable-next-line no-unused-vars -- Express needs the 4-arg shape.
        this.app.use((error, req, res, next) => {
            if (error instanceof InvalidFrameError) {
                return res.status(400).json({ error: error.message });
            }
            if (error instanceof ModelNotReadyError) {
                return res
                    .status(503)
                    .json({ error: 'AI model is still warming up. Try again in a moment.' });
            }

            console.error('Unhandled request error:', error);
            return res.status(500).json({ error: 'Internal server error.' });
        });
    }

    start() {
        this.httpServer = this.app.listen(this.config.port, () => {
            console.log(`Server is running on http://localhost:${this.config.port}`);
        });
        return this.httpServer;
    }

    stop() {
        return new Promise((resolve) => {
            if (!this.httpServer) return resolve();
            this.httpServer.close(() => resolve());
        });
    }
}

module.exports = { TrackingServer };
