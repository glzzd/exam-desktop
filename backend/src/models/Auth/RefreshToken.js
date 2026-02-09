const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true
    },
    expires: {
        type: Date,
        required: true
    },
    createdByIp: {
        type: String,
        required: true
    },
    revoked: {
        type: Date
    },
    revokedByIp: {
        type: String
    },
    replacedByToken: {
        type: String
    }
}, {
    timestamps: true
});

// Virtual property to check if token is expired
refreshTokenSchema.virtual('isExpired').get(function() {
    return Date.now() >= this.expires;
});

// Virtual property to check if token is active
refreshTokenSchema.virtual('isActive').get(function() {
    return !this.revoked && !this.isExpired;
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
