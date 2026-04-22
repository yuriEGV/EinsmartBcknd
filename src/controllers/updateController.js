import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

class UpdateController {
    /**
     * Check if there are updates available on GitHub
     */
    static async checkUpdates(req, res) {
        try {
            // 1. Fetch from remote
            await execAsync('git fetch origin main');
            
            // 2. Compare local HEAD with remote main
            const { stdout: localHash } = await execAsync('git rev-parse HEAD');
            const { stdout: remoteHash } = await execAsync('git rev-parse origin/main');
            
            const hasUpdate = localHash.trim() !== remoteHash.trim();
            
            res.json({
                hasUpdate,
                localHash: localHash.trim().substring(0, 7),
                remoteHash: remoteHash.trim().substring(0, 7),
                lastChecked: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error checking updates:', error);
            res.status(500).json({ 
                message: 'Error al verificar actualizaciones', 
                error: error.message 
            });
        }
    }

    /**
     * Run the update script (setup.sh)
     */
    static async runUpdate(req, res) {
        try {
            // This is a long running process, but since we are resetsizing docker containers
            // the connection might drop. We send a response first or stream.
            // For simplicity in this environment, we'll try to run it.
            
            const scriptPath = path.join(process.cwd(), 'setup.sh');
            
            // We'll use exec and not await it fully if we want to avoid timeout, 
            // but the user wants to see it. 
            // IMPROVEMENT: Return a message that it started.
            
            exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Update Error: ${error}`);
                    return;
                }
                console.log(`Update Success: ${stdout}`);
            });

            res.json({ 
                message: 'Proceso de actualización iniciado en el servidor. El sistema se reiniciará en breve.',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({ message: 'Error al iniciar actualización', error: error.message });
        }
    }
}

export default UpdateController;
