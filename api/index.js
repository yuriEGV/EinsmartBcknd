export default async (req, res) => {
    try {
        const serverModule = await import('../src/server.js');
        const app = serverModule.default;
        return app(req, res);
    } catch (err) {
        console.error('CRASH_ON_IMPORT:', err);
        res.status(500).json({
            error: 'CRASH_ON_IMPORT',
            message: err.message,
            stack: err.stack,
            name: err.name
        });
    }
};
