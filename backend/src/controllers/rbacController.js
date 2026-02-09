const rbacService = require('../services/rbacService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const createPermission = async (req, res) => {
    try {
        const permission = await rbacService.createPermission(req.body);
        return successResponse(res, permission, 'İcazə uğurla yaradıldı', 201);
    } catch (error) {
        // Mongoose duplicate key error
        if (error.code === 11000) {
            return errorResponse(res, 'Bu icazə kodu (slug) artıq mövcuddur', 409);
        }
        return errorResponse(res, error.message || 'İcazə yaradılarkən xəta baş verdi', error.statusCode || 500);
    }
};

const createRole = async (req, res) => {
    try {
        const role = await rbacService.createRole(req.body);
        return successResponse(res, role, 'Rol uğurla yaradıldı', 201);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 'Bu rol adı artıq mövcuddur', 409);
        }
        return errorResponse(res, error.message || 'Rol yaradılarkən xəta baş verdi', error.statusCode || 500);
    }
};

const assignPermissionsToRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body; // Array of permission IDs
        const role = await rbacService.assignPermissionsToRole(roleId, permissions);
        return successResponse(res, role, 'İcazələr rola uğurla təyin edildi');
    } catch (error) {
        return errorResponse(res, error.message || 'İcazələr təyin edilərkən xəta baş verdi', error.statusCode || 500);
    }
};

const assignRoleToUser = async (req, res) => {
    try {
        const { userId, roleId } = req.body;
        
        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        };
        
        const user = await rbacService.assignRoleToUser(userId, roleId, metaData);
        return successResponse(res, user, 'Rol istifadəçiyə uğurla təyin edildi');
    } catch (error) {
        return errorResponse(res, error.message || 'Rol təyin edilərkən xəta baş verdi', error.statusCode || 500);
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await rbacService.getRoles();
        return successResponse(res, roles, 'Rollar uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, error.message || 'Rollar gətirilərkən xəta baş verdi', 500);
    }
};

const getPermissions = async (req, res) => {
    try {
        const permissions = await rbacService.getPermissions();
        return successResponse(res, permissions, 'İcazələr uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, error.message || 'İcazələr gətirilərkən xəta baş verdi', 500);
    }
};

const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await rbacService.getRoleById(id);
        return successResponse(res, role, 'Rol detallar uğurla gətirildi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message || 'Rol detallar gətirilərkən xəta baş verdi', error.statusCode || 500);
    }
};

const getPermissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const permission = await rbacService.getPermissionById(id);
        return successResponse(res, permission, 'İcazə detallar uğurla gətirildi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message || 'İcazə detallar gətirilərkən xəta baş verdi', error.statusCode || 500);
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        await rbacService.deleteRole(id);
        return successResponse(res, null, 'Rol uğurla silindi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message || 'Rol silinərkən xəta baş verdi', error.statusCode || 500);
    }
};

const deletePermission = async (req, res) => {
    try {
        const { id } = req.params;
        await rbacService.deletePermission(id);
        return successResponse(res, null, 'İcazə uğurla silindi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message || 'İcazə silinərkən xəta baş verdi', error.statusCode || 500);
    }
};

const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const role = await rbacService.updateRole(id, req.body);
        return successResponse(res, role, 'Rol uğurla yeniləndi');
    } catch (error) {
         if (error.code === 11000) {
            return errorResponse(res, 'Bu rol adı artıq mövcuddur', 409);
        }
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, error.message || 'Rol yenilənərkən xəta baş verdi', error.statusCode || 500);
    }
};

module.exports = {
    createPermission,
    createRole,
    updateRole,
    assignPermissionsToRole,
    assignRoleToUser,
    getRoles,
    getPermissions,
    getRoleById,
    getPermissionById,
    deleteRole,
    deletePermission
};
