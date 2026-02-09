const mongoose = require('mongoose');
const Employee = require('../models/Employee/Employee');

/**
 * Create a new employee
 * @param {Object} employeeData 
 * @param {Object} metaData 
 */
const createEmployee = async (employeeData, metaData) => {
    const { timsUserName, firstName, lastName, fatherName, gender, position, department, rank, note } = employeeData;

    const newEmployee = new Employee({
        timsUserName,
        position,
        department,
        rank,
        note,
        personalData: {
            firstName,
            lastName,
            fatherName,
            gender
        },
        createdBy: metaData.createdBy
    });

    await newEmployee.save();
    return newEmployee;
};

/**
 * Update employee
 * @param {String} id 
 * @param {Object} updates 
 * @param {Object} metaData 
 */
const updateEmployee = async (id, updates, metaData) => {
    const employee = await Employee.findById(id);
    if (!employee) {
        throw { statusCode: 404, message: 'Əməkdaş tapılmadı' };
    }

    if (updates.timsUserName) employee.timsUserName = updates.timsUserName;
    if (updates.position) employee.position = updates.position;
    if (updates.department) employee.department = updates.department;
    if (updates.rank) employee.rank = updates.rank;
    if (updates.note) employee.note = updates.note;
    if (updates.isActive !== undefined) employee.isActive = updates.isActive;
    
    if (updates.firstName) employee.personalData.firstName = updates.firstName;
    if (updates.lastName) employee.personalData.lastName = updates.lastName;
    if (updates.fatherName) employee.personalData.fatherName = updates.fatherName;
    if (updates.gender) employee.personalData.gender = updates.gender;

    await employee.save();
    return employee;
};

/**
 * Soft delete employee
 * @param {String} id 
 * @param {Object} metaData 
 */
const deleteEmployee = async (id, metaData) => {
    const employee = await Employee.findById(id);
    if (!employee) {
        throw { statusCode: 404, message: 'Əməkdaş tapılmadı' };
    }

    employee.isDeleted = true;
    employee.isActive = false;
    employee.deletedAt = new Date();

    await employee.save();
    return employee;
};

/**
 * Get all employees with pagination
 * @param {Number} page 
 * @param {Number} limit 
 * @param {Object} filters 
 */
const getAllEmployees = async (page = 1, limit = 10, filters = {}) => {
    const skip = (page - 1) * limit;
    
    const query = { isDeleted: false };

    // Search
    if (filters.search) {
        const searchRegex = new RegExp(filters.search, 'i');
        const searchConditions = [
            { 'personalData.firstName': searchRegex },
            { 'personalData.lastName': searchRegex },
            { timsUserName: searchRegex }
        ];
        query.$or = searchConditions;
    }

    const [employees, total] = await Promise.all([
        Employee.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Employee.countDocuments(query)
    ]);

    return {
        employees,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get employee by ID
 * @param {String} id 
 */
const getEmployeeById = async (id) => {
    const employee = await Employee.findById(id);
    
    if (!employee) {
        throw { statusCode: 404, message: 'Əməkdaş tapılmadı' };
    }

    return employee;
};

const xlsx = require('xlsx');

/**
 * Import employees from Excel file
 * @param {Buffer} fileBuffer
 * @param {Object} metaData 
 */
const importEmployeesFromExcel = async (fileBuffer, metaData) => {
    try {
        if (!fileBuffer) {
            throw { statusCode: 400, message: 'Fayl təqdim edilməyib' };
        }

        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const row of data) {
            try {
                // Check if row has necessary data
                if (!row.fullName) continue;

                // Parse fullName
                const fullNameParts = row.fullName.trim().split(/\s+/);
                
                let firstName = '';
                let lastName = '';
                let fatherName = '';
                let gender = 'male'; // Default or logic based

                if (fullNameParts.length >= 2) {
                    lastName = fullNameParts[0];
                    firstName = fullNameParts[1];
                    if (fullNameParts.length > 2) {
                        fatherName = fullNameParts[2];
                    }
                }

                // Determine gender from the last part of the name string in Excel if it contains suffix
                // Or checking the suffix of the full name string
                const fullString = row.fullName.trim();
                if (fullString.endsWith('qızı')) {
                    gender = 'female';
                } else if (fullString.endsWith('oğlu')) {
                    gender = 'male';
                } else {
                    // Fallback or specific logic if needed
                    gender = 'male'; 
                }
                
                // Create employee object
                const employeeData = {
                    timsUserName: '', // Default empty as requested
                    firstName,
                    lastName,
                    fatherName,
                    gender,
                    rank: row.rank || '',
                    note: row.note || row.Note || ''
                };

                // Create
                try {
                    await createEmployee(employeeData, metaData);
                    results.success++;
                } catch (err) {
                    console.error('Import row error:', err);
                     throw err;
                }

            } catch (err) {
                results.failed++;
                results.errors.push({ row: row, error: err.message });
            }
        }

        return results;

    } catch (error) {
        throw error;
    }
};

module.exports = {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getAllEmployees,
    getEmployeeById,
    importEmployeesFromExcel
};
