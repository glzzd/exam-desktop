const authService = require('../services/authService');
const { validateLogin } = require('../validators/authValidator');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const login = async (req, res) => {
    try {
        const errors = validateLogin(req.body);
        if (errors.length > 0) {
            return errorResponse(res, 'Məlumatlar natamamdır', 400, errors);
        }

        const { username, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        const result = await authService.login(username, password, ipAddress);

        // Set Refresh Token in HTTP Only Cookie
        setTokenCookie(res, result.refreshToken);

        return successResponse(res, {
            user: {
                id: result.user._id,
                username: result.user.username,
                firstName: result.user.personalData.firstName,
                lastName: result.user.personalData.lastName,
                role: result.user.role // This now contains full role object with permissions
            },
            accessToken: result.accessToken
        }, 'Giriş uğurla tamamlandı');

    } catch (error) {
        return errorResponse(res, error.message || 'Giriş zamanı xəta baş verdi', error.statusCode || 500);
    }
};

const refreshToken = async (req, res) => {
    try {
        const token = req.cookies.refreshToken || req.body.refreshToken;
        const ipAddress = req.ip || req.connection.remoteAddress;

        if (!token) {
            return errorResponse(res, 'Token tələb olunur', 400);
        }

        const result = await authService.refreshToken(token, ipAddress);

        setTokenCookie(res, result.refreshToken);

        return successResponse(res, { accessToken: result.accessToken }, 'Token uğurla yeniləndi');

    } catch (error) {
        return errorResponse(res, error.message || 'Yeniləmə zamanı xəta baş verdi', error.statusCode || 500);
    }
};

const logout = async (req, res) => {
    try {
        const token = req.cookies.refreshToken || req.body.refreshToken;
        const ipAddress = req.ip || req.connection.remoteAddress;

        if (!token) {
            return errorResponse(res, 'Token tələb olunur', 400);
        }

        await authService.revokeToken(token, ipAddress);
        
        // Clear cookie
        res.clearCookie('refreshToken');

        return successResponse(res, null, 'Çıxış uğurla tamamlandı');

    } catch (error) {
        return errorResponse(res, error.message || 'Çıxış zamanı xəta baş verdi', error.statusCode || 500);
    }
};

const getMe = async (req, res) => {
    try {
        // req.user is set by authenticate middleware
        const user = await authService.getMe(req.user.id);
        
        return successResponse(res, {
            id: user._id,
            username: user.username,
            firstName: user.personalData.firstName,
            lastName: user.personalData.lastName,
            role: user.role
        }, 'İstifadəçi məlumatları uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, error.message || 'İstifadəçi məlumatları gətirilərkən xəta baş verdi', error.statusCode || 500);
    }
};

// Helper to set cookie
const setTokenCookie = (res, token) => {
    const cookieOptions = {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        // secure: process.env.NODE_ENV === 'production', // Use secure in production
        // sameSite: 'strict'
    };
    res.cookie('refreshToken', token, cookieOptions);
};

module.exports = {
    login,
    refreshToken,
    logout,
    getMe
};
