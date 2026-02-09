const Question = require('../models/Question/Question');
const ExamType = require('../models/Exam/ExamType');
const responseHandler = require('../utils/responseHandler');

// @desc    Get all questions
// @route   GET /api/v1/questions
// @access  Private
exports.getQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 10, examType, search } = req.query;
    const query = {};

    if (examType) {
      query.examType = examType;
    }

    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('examType', 'name slug')
      .populate('createdBy', 'personalData.firstName personalData.lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    responseHandler.success(res, {
      questions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    responseHandler.error(res, error.message);
  }
};

// @desc    Create a question
// @route   POST /api/v1/questions
// @access  Private
exports.createQuestion = async (req, res) => {
  try {
    const { text, options, examType, difficulty, isActive } = req.body;

    const question = await Question.create({
      text,
      options,
      examType,
      difficulty,
      isActive,
      createdBy: req.user._id
    });

    responseHandler.success(res, question, 201);
  } catch (error) {
    responseHandler.error(res, error.message);
  }
};

// @desc    Update a question
// @route   PUT /api/v1/questions/:id
// @access  Private
exports.updateQuestion = async (req, res) => {
  try {
    const { text, options, examType, difficulty, isActive } = req.body;

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        text,
        options,
        examType,
        difficulty,
        isActive,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    if (!question) {
      return responseHandler.error(res, 'Sual tapılmadı', 404);
    }

    responseHandler.success(res, question);
  } catch (error) {
    responseHandler.error(res, error.message);
  }
};

// @desc    Delete a question
// @route   DELETE /api/v1/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return responseHandler.error(res, 'Sual tapılmadı', 404);
    }

    responseHandler.success(res, { message: 'Sual silindi' });
  } catch (error) {
    responseHandler.error(res, error.message);
  }
};

// @desc    Toggle question status
// @route   PATCH /api/v1/questions/:id/status
// @access  Private
exports.toggleStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isActive, updatedBy: req.user._id },
      { new: true }
    );

    if (!question) {
      return responseHandler.error(res, 'Sual tapılmadı', 404);
    }

    responseHandler.success(res, question);
  } catch (error) {
    responseHandler.error(res, error.message);
  }
};
