const express = require('express');
const router = express.Router();
const {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleStatus
} = require('../../controllers/questionController');
const { authenticate } = require('../../middlewares/authMiddleware');

// Base route: /api/v1/questions

router.route('/')
  .get(authenticate, getQuestions)
  .post(authenticate, createQuestion);

router.route('/:id')
  .put(authenticate, updateQuestion)
  .delete(authenticate, deleteQuestion);

router.route('/:id/status')
  .patch(authenticate, toggleStatus);

module.exports = router;
