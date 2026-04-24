import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

class UpdateController {
    /**
     * Check if there are updates available on GitHub
     */
    static async checkUpdates(req, res) {
        try {
            const gitDir = path.join(process.cwd(), '.git');
            if (!fs.existsSync(gitDir)) {
                return res.json({
                    hasUpdate: false,
                    message: 'No se detectó un repositorio Git. Las actualizaciones automáticas están desactivadas.',
                    lastChecked: new Date().toISOString()
                });
            }

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
            // Return a valid JSON even on error to avoid console spamming with 500
            res.status(200).json({ 
                hasUpdate: false,
                message: 'Error al verificar actualizaciones en el servidor Git.',
                error: error.message,
                lastChecked: new Date().toISOString()
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
            
            const scriptPath = path.join(process.cwd(), 'update_system.sh');
            
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
