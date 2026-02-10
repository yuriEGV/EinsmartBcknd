export default async (req, res) => {
    try {
        // Dynamic import to catch initialization errors
        const serverModule = await import('../src/server.js');
        const app = serverModule.default;

        // Handle health check directly to verify boot
        if (req.url.startsWith('/health')) {
            return res.status(200).json({ status: 'BOOT_OK', env: process.env.NODE_ENV });
        }

        return app(req, res);
    } catch (err) {
        console.error('DIAGNOSTIC_ERR:', err);
        res.status(200).send(`
      <div style="font-family: monospace; padding: 20px; color: #d00;">
        <h1>🚩 Backend Boot Crash Detected</h1>
        <p><strong>Error:</strong> ${err.message}</p>
        <hr/>
        <p><strong>Stack Trace:</strong></p>
        <pre>${err.stack}</pre>
        <hr/>
        <p><strong>Node Env:</strong> ${process.env.NODE_ENV}</p>
      </div>
    `);
    }
}
