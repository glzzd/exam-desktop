const employeeService = require('../services/employeeService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// @desc    Create new employee
// @route   POST /api/v1/employees/add-new
const createEmployee = async (req, res) => {
    try {
        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            createdBy: req.user ? req.user._id : null
        };

        const newEmployee = await employeeService.createEmployee(req.body, metaData);
        return successResponse(res, newEmployee, 'Əməkdaş uğurla yaradıldı', 201);
    } catch (error) {
        if (error.code === 11000) {
            return errorResponse(res, 'İstifadəçi adı artıq mövcuddur', 409);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    Update employee
// @route   PUT /api/v1/employees/:id
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            modifiedBy: req.user ? req.user._id : null
        };

        const updatedEmployee = await employeeService.updateEmployee(id, req.body, metaData);
        return successResponse(res, updatedEmployee, 'Əməkdaş məlumatları yeniləndi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    Delete employee
// @route   DELETE /api/v1/employees/:id
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            modifiedBy: req.user ? req.user._id : null
        };

        await employeeService.deleteEmployee(id, metaData);
        return successResponse(res, null, 'Əməkdaş uğurla silindi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    Get all employees
// @route   GET /api/v1/employees
const getAllEmployees = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';

        const result = await employeeService.getAllEmployees(page, limit, { search });
        return successResponse(res, result, 'Əməkdaşlar siyahısı uğurla gətirildi');
    } catch (error) {
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

// @desc    Get employee by ID
// @route   GET /api/v1/employees/:id
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await employeeService.getEmployeeById(id);
        return successResponse(res, employee, 'Əməkdaş məlumatları uğurla gətirildi');
    } catch (error) {
        if (error.statusCode === 404) {
            return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'Server xətası', 500, error.message);
    }
};

const importEmployees = async (req, res) => {
    try {
        if (!req.file) {
            return errorResponse(res, 'Fayl seçilməyib', 400);
        }

        const metaData = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            createdBy: req.user ? req.user._id : null
        };

        const result = await employeeService.importEmployeesFromExcel(req.file.buffer, metaData);
        return successResponse(res, result, `İmport tamamlandı. Uğurlu: ${result.success}, Uğursuz: ${result.failed}`);
    } catch (error) {
        if (error.statusCode === 404) {
             return errorResponse(res, error.message, 404);
        }
        return errorResponse(res, 'İmport zamanı xəta baş verdi', 500, error.message);
    }
};

module.exports = {
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getAllEmployees,
    getEmployeeById,
    importEmployees
};
