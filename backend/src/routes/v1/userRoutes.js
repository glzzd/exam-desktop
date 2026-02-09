const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const { checkPermission } = require('../../middlewares/rbacMiddleware');
const { createUser, updateUser, getUserHistory, getAllUsers, getUserById } = require('../../controllers/userController');

// Public routes (or protected if needed later)
router.post('/add-new', createUser);

// Protected routes
router.get('/get-all', authenticate, checkPermission('users.read.all'), getAllUsers);
router.get('/:id', authenticate, checkPermission(['users.read.one', 'users.read.all'], { allowOwner: true }), getUserById);
router.put('/:id', authenticate, checkPermission(['users.update.one', 'users.update.all'], { allowOwner: true }), updateUser);
router.get('/:id/history', authenticate, checkPermission(['users.history.read', 'users.read.all'], { allowOwner: true }), getUserHistory);

module.exports = router;
