const userService = require('../services/userService');
const { validateUserCreation, validateUserUpdate } = require('../validators/userValidator');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Yeni istifadəçi yarat
// @route   POST /api/v1/users/add-new
// @access  Public
const createUser = async (req, res) => {
    try {
        const validationErrors = validateUserCreation(req.body);
        if (validationErrors.length > 0) {
            return errorResponse(res, 'Məlumatlar natamamdır', 400, validationErrors);
        }

        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };

        const newUser = await userService.createUser(req.body, metaData);
        
        return successResponse(res, newUser, 'İstifadəçi uğurla yaradıldı', 201);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 'İstifadəçi adı artıq mövcuddur', 409);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    İstifadəçi məlumatlarını yenilə
// @route   PUT /api/v1/users/:id
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const validationErrors = validateUserUpdate(updates);
        if (validationErrors.length > 0) {
            return errorResponse(res, 'Məlumatlar yalnışdır', 400, validationErrors);
        }

        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            modifiedBy: req.user ? req.user._id : null
        };

        const updatedUser = await userService.updateUser(id, updates, metaData);

        return successResponse(res, updatedUser, 'İstifadəçi məlumatları yeniləndi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    İstifadəçi tarixçəsini gətir
// @route   GET /api/v1/users/:id/history
const getUserHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await userService.getUserHistory(id);
        return successResponse(res, history, 'Tarixçə uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    Bütün istifadəçiləri gətir
// @route   GET /api/v1/users
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Extract filters
        const search = req.query.search || '';
        const roles = req.query.roles ? (Array.isArray(req.query.roles) ? req.query.roles : [req.query.roles]) : [];
        const status = req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : [];

        const filters = {
            search,
            roles,
            status
        };

        const result = await userService.getAllUsers(page, limit, filters);
        return successResponse(res, result, 'İstifadəçilər siyahısı uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    İstifadəçi məlumatlarını gətir (ID ilə)
// @route   GET /api/v1/users/:id
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userService.getUserById(id);
        return successResponse(res, user, 'İstifadəçi məlumatları uğurla gətirildi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

module.exports = {
    createUser,
    updateUser,
    getUserHistory,
    getAllUsers,
    getUserById
};
