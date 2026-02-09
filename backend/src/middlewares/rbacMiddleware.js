const { errorResponse } = require('../utils/responseHandler');

/**
 * RBAC Permission Check Middleware
 * @param {String|Array} requiredPermissionSlugs - Required permission slug (e.g., 'users.read.all') or array of slugs
 * @param {Object} options - Options { allowOwner: boolean }
 */
const checkPermission = (requiredPermissionSlugs, options = { allowOwner: false }) => {
    return (req, res, next) => {
        const user = req.user;
        const targetId = req.params.id;

        if (!user) {
            return errorResponse(res, 'Giriş tələb olunur', 401);
        }

        // 1. Check Ownership (if allowed)
        if (options.allowOwner && targetId && user._id.toString() === targetId) {
            return next();
        }

        // 2. Check Permission
        if (!user.role) {
            return errorResponse(res, 'Bu əməliyyat üçün icazəniz yoxdur', 403);
        }

        if (user.role.isActive === false) {
            return errorResponse(res, 'Rolunuz deaktiv edilib', 403);
        }

        // Normalize to array
        const requiredSlugs = Array.isArray(requiredPermissionSlugs) 
            ? requiredPermissionSlugs 
            : [requiredPermissionSlugs];

        // Check if user has ANY of the required permissions
        const hasPermission = user.role.permissions && user.role.permissions.some(
            permission => requiredSlugs.includes(permission.slug)
        );

        if (!hasPermission) {
            return errorResponse(res, 'Bu əməliyyat üçün icazəniz yoxdur', 403);
        }

        next();
    };
};

module.exports = {
    checkPermission
};