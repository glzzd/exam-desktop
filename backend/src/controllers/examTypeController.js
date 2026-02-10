const ExamType = require('../models/Exam/ExamType');
const { successResponse, errorResponse } = require('../utils/responseHandler');

const slugify = (text) => {
  const map = {
    'ə': 'e', 'Ə': 'e',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ı': 'i', 'I': 'i',
    'İ': 'i',
    'ğ': 'g', 'Ğ': 'g',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c'
  };
  
  return text
    .split('')
    .map(char => map[char] || char)
    .join('')
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '');
};

// Get all exam types
exports.getAllExamTypes = async (req, res) => {
  try {
    const examTypes = await ExamType.find().sort({ createdAt: -1 });
    return successResponse(res, examTypes, 'Exam types retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Create new exam type
exports.createExamType = async (req, res) => {
  try {
    const { name, description, isActive, duration, minCorrectAnswers, questionCount } = req.body;
    
    // Generate slug from name using custom slugify
    const slug = slugify(name);

    const existingExamType = await ExamType.findOne({ $or: [{ name }, { slug }] });
    if (existingExamType) {
      return errorResponse(res, 'Exam type with this name already exists', 400);
    }

    const examType = await ExamType.create({
      name,
      slug,
      description,
      duration: duration || 60,
      minCorrectAnswers: minCorrectAnswers || 0,
      questionCount: questionCount || 10,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    return successResponse(res, examType, 'Exam type created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update exam type
exports.updateExamType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, duration, minCorrectAnswers, questionCount } = req.body;

    const examType = await ExamType.findById(id);
    if (!examType) {
      return errorResponse(res, 'Exam type not found', 404);
    }

    // If name is changed, check for duplicates and update slug
    if (name && name !== examType.name) {
      const slug = slugify(name);
      const existing = await ExamType.findOne({ 
        $or: [{ name }, { slug }],
        _id: { $ne: id }
      });
      
      if (existing) {
        return errorResponse(res, 'Exam type with this name already exists', 400);
      }
      
      examType.name = name;
      examType.slug = slug;
    }

    if (description !== undefined) examType.description = description;
    if (isActive !== undefined) examType.isActive = isActive;
    if (duration !== undefined) examType.duration = duration;
    if (minCorrectAnswers !== undefined) examType.minCorrectAnswers = minCorrectAnswers;
    if (questionCount !== undefined) examType.questionCount = questionCount;
    
    examType.updatedBy = req.user._id;

    await examType.save();

    return successResponse(res, examType, 'Exam type updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete exam type
exports.deleteExamType = async (req, res) => {
  try {
    const { id } = req.params;
    const examType = await ExamType.findByIdAndDelete(id);
    
    if (!examType) {
      return errorResponse(res, 'Exam type not found', 404);
    }

    return successResponse(res, null, 'Exam type deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Toggle status
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const examType = await ExamType.findByIdAndUpdate(
      id, 
      { isActive, updatedBy: req.user._id },
      { new: true }
    );

    if (!examType) {
      return errorResponse(res, 'Exam type not found', 404);
    }

    return successResponse(res, examType, 'Exam type status updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
