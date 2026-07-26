const parsePort = (value, fallback) => {
    const port = Number.parseInt(value, 10);
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
};

module.exports = {
    port: parsePort(process.env.PORT, 5000),

    /**
     * Origins allowed to call the API. Defaults to the Vite dev server.
     * Set CLIENT_ORIGIN to a comma-separated list to override.
     */
    allowedOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:4000')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    /** Upper bound on the JSON body carrying a base64 frame. */
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE ?? '10mb',

    /** Retry settings for the initial model download. */
    modelLoadRetries: 5,
    modelLoadRetryDelayMs: 3000,
};
