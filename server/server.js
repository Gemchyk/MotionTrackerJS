const config = require('./src/config');
const { TrackingService } = require('./src/TrackingService');
const { TrackingServer } = require('./src/TrackingServer');

const trackingService = new TrackingService({
    retries: config.modelLoadRetries,
    retryDelayMs: config.modelLoadRetryDelayMs,
});

const server = new TrackingServer(trackingService, config);
server.start();

// Start serving immediately; /api/status reports readiness while this runs.
trackingService.initializeModel().catch((error) => {
    console.error('Model initialization failed:', error);
});

const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await server.stop();
    process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
