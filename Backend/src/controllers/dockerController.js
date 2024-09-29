// controllers/dockerController.js
import { exec } from 'child_process';
import Docker from 'dockerode'; // Ensure this package is installed and Docker is set up correctly
const docker = new Docker();

export const spawnContainer = async (req, res) => {
    const { userId, osType } = req.body;

    console.log(`Request received to create container for user ${userId} with OS: ${osType}`);

    if (!userId || !osType) {
        console.log('Invalid userId or osType');
        return res.status(400).json({ message: 'Invalid userId or osType' });
    }

    try {
        const image = osType === 'ubuntu' ? 'ubuntu:latest' : 'alpine:latest';

        // Generate a valid container name (starting with userId or valid prefix)
        const containerName = `${userId.replace(/[^a-zA-Z0-9]/g, '')}-${osType}`; // Ensure no invalid characters
        console.log(`Creating container with name: ${containerName}`);

        docker.pull(image, (err, stream) => {
            if (err) {
                console.error('Error pulling Docker image', err);
                return res.status(500).json({ message: 'Error pulling Docker image', error: err });
            }

            docker.createContainer({
                Image: image,
                Cmd: ['/bin/bash'], // Command based on OS
                name: containerName, // Valid container name
                Tty: true,
            }, (err, container) => {
                if (err) {
                    console.error('Error creating Docker container', err); // Print exact error
                    return res.status(500).json({ message: 'Error creating Docker container', error: err.message });
                }

                console.log(`Container created with ID: ${container.id}`);
                container.start((err, data) => {
                    if (err) {
                        console.error('Error starting Docker container', err);
                        return res.status(500).json({ message: 'Error starting Docker container', error: err.message });
                    }

                    console.log(`Container started successfully with ID: ${container.id}`);
                    res.json({ containerId: container.id });
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error during Docker container creation', error);
        res.status(500).json({ message: 'Unexpected error during container creation', error: error.message });
    }
};

// Stop a running Docker container
export const stopContainer = async (req, res) => {
    const { containerId } = req.body;

    if (!containerId) {
        console.error('Container ID is required to stop the container.');
        return res.status(400).json({ message: 'Container ID is required' });
    }

    try {
        const container = docker.getContainer(containerId);
        await container.stop();

        // Update the container status in the database
        await ContainerModel.findOneAndUpdate({ containerId }, { status: 'stopped' });

        res.status(200).json({ message: 'Container stopped successfully' });
    } catch (err) {
        console.error('Error stopping container:', err);
        res.status(500).json({ message: 'Failed to stop container', error: err.message });
    }
};
