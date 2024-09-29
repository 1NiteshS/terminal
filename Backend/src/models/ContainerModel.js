// models/ContainerModel.js
import mongoose from 'mongoose';

const ContainerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    containerId: { type: String, required: true },
    osType: { type: String, required: true },
    status: { type: String, default: 'running' }, // Can be running, stopped
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Container', ContainerSchema);
