const Role = require('../models/RBAC/Role');
const Permission = require('../models/RBAC/Permission');
const User = require('../models/User/User');

/**
 * Yeni icazə yaradır
 * @param {Object} data - İcazə məlumatları
 */
const createPermission = async (data) => {
    const { name, key, slug, description } = data;
    const existing = await Permission.findOne({ slug });
    if (existing) throw { code: 11000, message: 'Bu icazə artıq mövcuddur' };

    const permission = await Permission.create({ name, key, slug, description });
    return permission;
};

/**
 * Yeni rol yaradır
 * @param {Object} data - Rol məlumatları
 */
const createRole = async (data) => {
    const { name, description, permissions } = data;
    const existing = await Role.findOne({ name });
    if (existing) throw { code: 11000, message: 'Bu rol adı artıq mövcuddur' };

    const role = await Role.create({ name, description, permissions });
    return role;
};

/**
 * Rola icazələr təyin edir (mövcudları yeniləyir)
 * @param {String} roleId 
 * @param {Array} permissionIds 
 */
const assignPermissionsToRole = async (roleId, permissionIds) => {
    const role = await Role.findById(roleId);
    if (!role) throw { statusCode: 404, message: 'Rol tapılmadı' };

    role.permissions = permissionIds;
    await role.save();
    return role;
};

/**
 * İstifadəçiyə rol təyin edir
 * @param {String} userId 
 * @param {String} roleId 
 * @param {Object} metaData - Metadata (ip, userAgent)
 */
const assignRoleToUser = async (userId, roleId, metaData = {}) => {
    const user = await User.findById(userId);
    if (!user) throw { statusCode: 404, message: 'İstifadəçi tapılmadı' };

    const role = await Role.findById(roleId);
    if (!role) throw { statusCode: 404, message: 'Rol tapılmadı' };

    user.role = roleId;
    
    // Metadata for history
    user.$locals.ipAddress = metaData.ipAddress || 'system'; 
    user.$locals.userAgent = metaData.userAgent || 'system';

    await user.save();
    return user;
};

/**
 * Bütün rolları gətirir (istifadəçi sayı ilə birlikdə)
 */
const getRoles = async () => {
    const roles = await Role.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'role',
                as: 'roleUsers'
            }
        },
        {
            $lookup: {
                from: 'permissions',
                localField: 'permissions',
                foreignField: '_id',
                as: 'permissions'
            }
        },
        {
            $addFields: {
                userCount: { $size: '$roleUsers' }
            }
        },
        {
            $project: {
                roleUsers: 0
            }
        }
    ]);
    return roles;
};

/**
 * Bütün icazələri gətirir
 */
const getPermissions = async () => {
    return await Permission.find();
};

/**
 * Rol detallarını gətirir (ID ilə) - Bu rola sahib istifadəçiləri də daxil edir
 * @param {String} id
 */
const getRoleById = async (id) => {
    const role = await Role.findById(id).populate('permissions');
    if (!role) throw { statusCode: 404, message: 'Rol tapılmadı' };
    
    // Find users with this role
    const users = await User.find({ role: id }).select('username personalData isActive email');
    
    return {
        ...role.toObject(),
        users
    };
};

/**
 * İcazə detallarını gətirir (ID ilə)
 * @param {String} id
 */
const getPermissionById = async (id) => {
    const permission = await Permission.findById(id);
    if (!permission) throw { statusCode: 404, message: 'İcazə tapılmadı' };
    return permission;
};

/**
 * Rol silir (ID ilə) - Kaskad silmə (İstifadəçilərdən rol silinir)
 * @param {String} id
 */
const deleteRole = async (id) => {
    const role = await Role.findById(id);
    if (!role) throw { statusCode: 404, message: 'Rol tapılmadı' };
    
    // Remove role from all users who have it
    await User.updateMany({ role: id }, { $set: { role: null } });
    
    await Role.findByIdAndDelete(id);
    return true;
};

/**
 * İcazə silir (ID ilə) - Kaskad silmə (Rolların icazə siyahısından silinir)
 * @param {String} id
 */
const deletePermission = async (id) => {
    const permission = await Permission.findById(id);
    if (!permission) throw { statusCode: 404, message: 'İcazə tapılmadı' };
    
    // Remove permission from all roles that have it
    await Role.updateMany(
        { permissions: id },
        { $pull: { permissions: id } }
    );
    
    await Permission.findByIdAndDelete(id);
    return true;
};

/**
 * Rol məlumatlarını yeniləyir
 * @param {String} id
 * @param {Object} data
 */
const updateRole = async (id, data) => {
    const { name, description } = data;
    const role = await Role.findById(id);
    if (!role) throw { statusCode: 404, message: 'Rol tapılmadı' };

    // Check name uniqueness if changed
    if (name && name !== role.name) {
        const existing = await Role.findOne({ name });
        if (existing) throw { code: 11000, message: 'Bu rol adı artıq mövcuddur' };
        role.name = name;
    }
    
    if (description !== undefined) role.description = description;
    
    await role.save();
    return role;
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
