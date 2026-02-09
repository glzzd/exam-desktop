const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/responseHandler');
const User = require('../models/User/User');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return errorResponse(res, 'Giriş icazəsi tələb olunur (Token yoxdur)', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET || process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.id).populate({
            path: 'role',
            populate: {
                path: 'permissions'
            }
        });
        
        if (!user) {
            return errorResponse(res, 'İstifadəçi tapılmadı', 401);
        }

        // Token Version Check
        const userTokenVersion = user.tokenVersion || 0;
        const tokenVersion = decoded.tokenVersion || 0;

        if (tokenVersion !== userTokenVersion) {
            return errorResponse(res, 'Sessiya bitmişdir (Token etibarsızdır)', 401);
        }

        // Account Status Checks
        if (!user.isActive) {
            return errorResponse(res, 'Hesabınız deaktiv edilib', 403);
        }

        if (user.lockUntil && user.lockUntil > Date.now()) {
            const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            return errorResponse(res, `Hesabınız bloklanıb. ${waitMinutes} dəqiqə sonra cəhd edin.`, 403);
        }

        req.user = user;
        next();
    } catch (err) {
        return errorResponse(res, 'Token etibarsızdır və ya vaxtı bitib', 403);
    }
};

module.exports = {
    authenticate
};
