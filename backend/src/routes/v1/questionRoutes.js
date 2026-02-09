const express = require('express');
const router = express.Router();
const {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleStatus
} = require('../../controllers/questionController');
const { protect, authorize } = require('../../middlewares/authMiddleware');

// Base route: /api/v1/questions

router.route('/')
  .get(protect, getQuestions)
  .post(protect, createQuestion);

router.route('/:id')
  .put(protect, updateQuestion)
  .delete(protect, deleteQuestion);

router.route('/:id/status')
  .patch(protect, toggleStatus);

module.exports = router;
