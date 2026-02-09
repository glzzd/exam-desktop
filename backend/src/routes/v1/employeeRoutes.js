const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authenticate } = require('../../middlewares/authMiddleware');
const { checkPermission } = require('../../middlewares/rbacMiddleware');
const { 
    createEmployee, 
    updateEmployee, 
    deleteEmployee, 
    getAllEmployees, 
    getEmployeeById,
    importEmployees
} = require('../../controllers/employeeController');

// Reuse 'users' permissions for now, or create specific 'employees' permissions
// Assuming employees are managed similarly to users
// Ideally, we should add 'employees.create', 'employees.read', etc.
// For now, I'll map them to 'users' permissions to avoid seeding new permissions immediately unless requested.
// BUT the user asked for "Employee model and backend", so distinct permissions are better.
// However, adding permissions requires DB seeding.
// I will reuse 'users' permissions for simplicity as the UI is "System Users" -> "Employees".
// Wait, if I use 'users.read.all', it allows reading users.
// I should probably use the same permissions or add new ones.
// Given the user instructions "employee-ler çekilmeli", I will stick to 'users' permissions for now to avoid breaking the app with missing permissions,
// OR I can quickly add 'employees' permissions.
// Let's stick to 'users' permissions as "Employees" are a subset of system users in concept.

router.post('/add-new', authenticate, checkPermission('users.create'), createEmployee);
router.post('/import', authenticate, checkPermission('users.create'), upload.single('file'), importEmployees);
router.get('/get-all', authenticate, checkPermission('users.read.all'), getAllEmployees);
router.get('/:id', authenticate, checkPermission(['users.read.one', 'users.read.all']), getEmployeeById);
router.put('/:id', authenticate, checkPermission(['users.update.one', 'users.update.all']), updateEmployee);
router.delete('/:id', authenticate, checkPermission(['users.delete.one', 'users.delete.all']), deleteEmployee);

module.exports = router;
