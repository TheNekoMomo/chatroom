const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('message', chatroomSchema);