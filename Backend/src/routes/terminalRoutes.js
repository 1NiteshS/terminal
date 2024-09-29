// routes/terminalRoutes.js
import express from 'express';
import { spawnContainer, stopContainer } from '../controllers/dockerController.js';

const router = express.Router();

// Route to start a container based on OS selection
router.post('/create', spawnContainer);

// Route to stop the container
router.post('/stop', stopContainer);

export default router;
