const mongoose = require('mongoose');
const User = require('../models/User/User');
const UserHistory = require('../models/User/UserHistory');
const Role = require('../models/RBAC/Role');

/**
 * Yeni istifadəçi yaradır
 * @param {Object} userData - İstifadəçi məlumatları
 * @param {Object} metaData - Metadata (ip, userAgent)
 * @returns {Promise<Object>} Yaradılmış istifadəçi
 */
const createUser = async (userData, metaData) => {
    const { username, password, firstName, lastName, fatherName, gender, role } = userData;

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        throw { code: 11000, message: 'İstifadəçi adı artıq mövcuddur' };
    }

    // Handle Role Assignment
    let roleId = null;
    if (role) {
        if (mongoose.Types.ObjectId.isValid(role)) {
            const roleExists = await Role.findById(role);
            if (!roleExists) throw { statusCode: 400, message: 'Göstərilən rol tapılmadı' };
            roleId = role;
        } else {
            const roleByName = await Role.findOne({ name: { $regex: new RegExp(`^${role}$`, 'i') } });
            if (!roleByName) throw { statusCode: 400, message: 'Göstərilən rol tapılmadı' };
            roleId = roleByName._id;
        }
    } else {
        // Default role: User
        const defaultRole = await Role.findOne({ name: 'User' });
        if (defaultRole) {
            roleId = defaultRole._id;
        }
    }

    const newUser = new User({
        username,
        password,
        role: roleId,
        personalData: {
            firstName,
            lastName,
            fatherName,
            gender
        }
    });

    // Metadata for history
    newUser.$locals.ipAddress = metaData.ipAddress;
    newUser.$locals.userAgent = metaData.userAgent;

    await newUser.save();
    return newUser;
};

/**
 * İstifadəçi məlumatlarını yeniləyir
 * @param {String} userId - İstifadəçi ID
 * @param {Object} updates - Yenilənəcək məlumatlar
 * @param {Object} metaData - Metadata (ip, userAgent, modifiedBy)
 * @returns {Promise<Object>} Yenilənmiş istifadəçi
 */
const updateUser = async (userId, updates, metaData) => {
    const user = await User.findById(userId);
    if (!user) {
        throw { statusCode: 404, message: 'İstifadəçi tapılmadı' };
    }

    // Fields to update
    if (updates.username) user.username = updates.username;
    if (updates.password) user.password = updates.password;
    
    if (updates.firstName) user.personalData.firstName = updates.firstName;
    if (updates.lastName) user.personalData.lastName = updates.lastName;
    if (updates.fatherName) user.personalData.fatherName = updates.fatherName;
    if (updates.gender) user.personalData.gender = updates.gender;

    // Metadata
    user.$locals.ipAddress = metaData.ipAddress;
    user.$locals.userAgent = metaData.userAgent;
    user.$locals.modifiedBy = metaData.modifiedBy;

    await user.save();
    return user;
};

/**
 * İstifadəçi tarixçəsini gətirir
 * @param {String} userId - İstifadəçi ID
 * @returns {Promise<Array>} Tarixçə
 */
const getUserHistory = async (userId) => {
    const history = await UserHistory.find({ targetUser: userId }).sort({ createdAt: -1 });
    return history;
};

/**
 * Bütün istifadəçiləri gətirir (Pagination ilə)
 * @param {Number} page - Səhifə nömrəsi
 * @param {Number} limit - Səhifə limiti
 * @returns {Promise<Object>} İstifadəçilər siyahısı və meta məlumatlar
 */
const getAllUsers = async (page = 1, limit = 10, filters = {}) => {
    const skip = (page - 1) * limit;
    
    const query = { isDeleted: false }; // Exclude deleted users

    // Filter by Status
    if (filters.status && filters.status.length > 0) {
        const statusValues = filters.status.map(s => s === 'true');
        query.isActive = { $in: statusValues };
    }

    // Filter by Roles
    if (filters.roles && filters.roles.length > 0) {
        const roleRegexes = filters.roles.map(r => new RegExp(`^${r}$`, 'i'));
        const roles = await Role.find({ name: { $in: roleRegexes } });
        const roleIds = roles.map(r => r._id);
        
        if (roleIds.length > 0) {
            query.role = { $in: roleIds };
        } else {
            // No matching roles found, return empty result
            return {
                users: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                }
            };
        }
    }

    // Search
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        const searchConditions = [
            { username: searchRegex },
            { 'personalData.firstName': searchRegex },
            { 'personalData.lastName': searchRegex }
        ];
        
        if (query.$or) {
            query.$and = [
                { $or: query.$or },
                { $or: searchConditions }
            ];
            delete query.$or;
        } else {
            query.$or = searchConditions;
        }
    }

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password')
            .populate('role', 'name description')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        User.countDocuments(query)
    ]);

    return {
        users,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * ID-yə görə istifadəçini gətirir
 * @param {String} userId - İstifadəçi ID
 * @returns {Promise<Object>} İstifadəçi məlumatları
 */
const getUserById = async (userId) => {
    const user = await User.findById(userId)
        .select('-password')
        .populate('role', 'name description permissions');
    
    if (!user) {
        throw { statusCode: 404, message: 'İstifadəçi tapılmadı' };
    }

    return user;
};

module.exports = {
    createUser,
    updateUser,
    getUserHistory,
    getAllUsers,
    getUserById
};