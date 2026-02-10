import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.status(200).send('HEALTH_OK_BAREBONE'));
app.get('/', (req, res) => res.status(200).send('ROOT_OK_BAREBONE'));

export default app;
