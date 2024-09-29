// server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import terminalRoutes from './routes/terminalRoutes.js';
import http from 'http';
import { Server } from 'socket.io';
import Docker from 'dockerode';
import ContainerModel from './models/ContainerModel.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Adjust this in production for security
        methods: ['GET', 'POST'],
    },
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Setup routes
app.use('/api/terminal', terminalRoutes);

// Initialize Docker
// const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const docker = new Docker({ socketPath: '//./pipe/docker_engine' })

// Handle socket connections for web terminal
io.on('connection', (socket) => {
    console.log('Client connected to terminal');

    let execInstance;
    let stream;

    // Listen for 'join' event to initiate terminal session
    socket.on('join', async (data) => {
        const { containerId } = data;

        try {
            // Verify if container exists and is running
            const container = docker.getContainer(containerId);
            const containerInfo = await container.inspect();

            if (!containerInfo.State.Running) {
                socket.emit('output', 'Container is not running.\n');
                return;
            }

            // Create an exec instance with interactive shell
            execInstance = await container.exec({
                Cmd: ['/bin/bash'], // Use '/bin/sh' for Alpine
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: true,
                Tty: true,
            });

            // Start the exec session
            stream = await execInstance.start({ hijack: true, stdin: true });

            // Pipe data from Docker to client
            stream.on('data', (chunk) => {
                socket.emit('output', chunk.toString('utf-8'));
            });

            stream.on('end', () => {
                socket.emit('output', '\n*** Session ended ***\n');
            });

            stream.on('error', (err) => {
                console.error('Stream error:', err);
                socket.emit('output', `\n*** Stream error: ${err.message} ***\n`);
            });

            // Optionally, resize the TTY if needed
            // socket.on('resize', (size) => {
            //     execInstance.resize(size.cols, size.rows);
            // });

        } catch (err) {
            console.error('Error setting up exec:', err);
            socket.emit('output', `\n*** Error: ${err.message} ***\n`);
        }
    });

    // Listen for 'command' event to receive user input
    socket.on('command', (data) => {
        if (stream && !stream.destroyed) {
            stream.write(data.command);
        } else {
            socket.emit('output', '\n*** Stream is not available ***\n');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (stream) {
            stream.end();
        }
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
