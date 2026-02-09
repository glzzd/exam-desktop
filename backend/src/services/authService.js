const User = require('../models/User/User');
const RefreshToken = require('../models/Auth/RefreshToken');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours in ms

/**
 * Generate Access Token
 * @param {Object} user 
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        { 
            id: user._id,
            tokenVersion: user.tokenVersion || 0
        },
        process.env.JWT_TOKEN_SECRET || process.env.JWT_SECRET,
        { expiresIn: '15m' } // Short lived access token
    );
};

/**
 * Generate Refresh Token
 * @param {Object} user 
 * @param {String} ipAddress 
 */
const generateRefreshToken = async (user, ipAddress) => {
    // Generate random token
    const token = crypto.randomBytes(40).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshToken = new RefreshToken({
        user: user._id,
        token: token,
        expires: expires,
        createdByIp: ipAddress
    });

    await refreshToken.save();
    return refreshToken;
};

/**
 * Login user
 * @param {String} username 
 * @param {String} password 
 * @param {String} ipAddress 
 */
const login = async (username, password, ipAddress) => {
    // Populate role and permissions on login
    const user = await User.findOne({ username })
        .select('+password')
        .populate({
            path: 'role',
            populate: {
                path: 'permissions'
            }
        });
    
    if (!user) {
        throw { statusCode: 401, message: 'İstifadəçi adı və ya şifrə yanlışdır.' };
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
        const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
        throw { statusCode: 403, message: `Hesabınız bloklanıb. Zəhmət olmasa ${waitMinutes} dəqiqə sonra cəhd edin.` };
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        // Increment failed attempts
        user.failedLoginAttempts += 1;
        
        // Lock account if attempts exceeded
        if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.lockUntil = Date.now() + LOCK_TIME;
            await user.save();
            throw { statusCode: 403, message: `Hesabınız çox sayda yanlış cəhd səbəbindən 2 saat müddətinə bloklandı.` };
        }

        await user.save();
        throw { statusCode: 401, message: 'İstifadəçi adı və ya şifrə yanlışdır.' };
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLogin = Date.now();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, ipAddress);

    return {
        user,
        accessToken,
        refreshToken: refreshToken.token
    };
};

/**
 * Refresh Access Token
 * @param {String} token 
 * @param {String} ipAddress 
 */
const refreshToken = async (token, ipAddress) => {
    const refreshToken = await RefreshToken.findOne({ token }).populate('user');

    if (!refreshToken || !refreshToken.isActive) {
        throw { statusCode: 401, message: 'Yeniləmə tokeni etibarsızdır' };
    }

    const { user } = refreshToken;

    // Increment token version to invalidate old access tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Rotate refresh token
    const newRefreshToken = await generateRefreshToken(user, ipAddress);
    
    // Revoke old token
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();

    // Generate new access token
    const accessToken = generateAccessToken(user);

    return {
        accessToken,
        refreshToken: newRefreshToken.token
    };
};

/**
 * Revoke Token (Logout)
 * @param {String} token 
 * @param {String} ipAddress 
 */
const revokeToken = async (token, ipAddress) => {
    const refreshToken = await RefreshToken.findOne({ token }).populate('user');

    if (!refreshToken || !refreshToken.isActive) {
        throw { statusCode: 400, message: 'Token tapılmadı və ya artıq ləğv edilib' };
    }

    // Invalidate all access tokens for this user
    if (refreshToken.user) {
        refreshToken.user.tokenVersion = (refreshToken.user.tokenVersion || 0) + 1;
        await refreshToken.user.save();
    }

    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();

    return true;
};

/**
 * Get current user with full details
 * @param {String} userId 
 */
const getMe = async (userId) => {
    const user = await User.findById(userId)
        .populate({
            path: 'role',
            populate: {
                path: 'permissions'
            }
        });

    if (!user) {
        throw { statusCode: 404, message: 'İstifadəçi tapılmadı' };
    }

    return user;
};

module.exports = {
    login,
    refreshToken,
    revokeToken,
    getMe
};
