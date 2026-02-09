const express = require('express');
const router = express.Router();
const structureController = require('../../controllers/structureController');
const { authenticate: protect } = require('../../middlewares/authMiddleware');
const { authorize } = require('../../middlewares/rbacMiddleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// All routes are protected
router.use(protect);

router.post('/import', upload.single('file'), structureController.importStructures);

router.route('/')
  .get(structureController.getAllStructures)
  .post(structureController.createStructure);

router.route('/:id')
  .put(structureController.updateStructure)
  .delete(structureController.deleteStructure);

router.patch('/:id/status', structureController.toggleStatus);

module.exports = router;
