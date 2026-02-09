const express = require('express');
const router = express.Router();
const examTypeController = require('../../controllers/examTypeController');
const { authenticate: protect } = require('../../middlewares/authMiddleware');
// You might want to add RBAC middleware here later
// const { checkPermission } = require('../../middlewares/rbacMiddleware');

router.use(protect);

router.get('/', examTypeController.getAllExamTypes);
router.post('/', examTypeController.createExamType);
router.put('/:id', examTypeController.updateExamType);
router.delete('/:id', examTypeController.deleteExamType);
router.patch('/:id/status', examTypeController.toggleStatus);

module.exports = router;
