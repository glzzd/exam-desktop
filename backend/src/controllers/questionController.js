const Question = require('../models/Question/Question');
const ExamType = require('../models/Exam/ExamType');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const xlsx = require('xlsx');

// @desc    Import questions from Excel
// @route   POST /api/v1/questions/import
// @access  Private
exports.importQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Fayl yüklənmədi', 400);
    }

    const { examType, structureCodes } = req.body;

    if (!examType) {
      return errorResponse(res, 'İmtahan növü seçilməlidir', 400);
    }

    if (!structureCodes) {
      return errorResponse(res, 'Ən azı bir struktur seçilməlidir', 400);
    }

    // Parse structureCodes (it might come as a stringified array or single string)
    let parsedStructureCodes = [];
    try {
        if (Array.isArray(structureCodes)) {
            parsedStructureCodes = structureCodes;
        } else {
            // Check if it's a JSON string array
            if (structureCodes.trim().startsWith('[')) {
                parsedStructureCodes = JSON.parse(structureCodes);
            } else {
                // Comma separated string
                parsedStructureCodes = structureCodes.split(',').map(s => s.trim());
            }
        }
    } catch (e) {
        // Fallback to single item array if parsing fails
        parsedStructureCodes = [structureCodes];
    }

    if (parsedStructureCodes.length === 0) {
        return errorResponse(res, 'Ən azı bir struktur seçilməlidir', 400);
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return errorResponse(res, 'Excel faylında məlumat tapılmadı', 400);
    }

    const results = {
      added: 0,
      failed: 0,
      errors: []
    };

    for (const [index, row] of data.entries()) {
      try {
        const text = row['question'] || row['Sual'] || row['Text'] || row['text'] || row['question'];
        const optionA = row['optionA'] || row['A'] || row['a'];
        const optionB = row['optionB'] || row['B'] || row['b'];
        const optionC = row['optionC'] || row['C'] || row['c'];
        const optionD = row['optionD'] || row['D'] || row['d'];
        // Expecting 'A', 'B', 'C', 'D' as values or full text matches? 
        // Let's assume the column contains the letter of the correct answer like 'A'
        let correctOption = row['correctAnswer'] || row['Duzgun Cavab'] || row['Correct'] || row['correct'] || row['Answer'];

        if (!text || !optionA || !optionB || !optionC || !optionD || !correctOption) {
          results.failed++;
          results.errors.push(`Sətir ${index + 2}: Məlumatlar çatışmır`);
          continue;
        }

        correctOption = String(correctOption).trim().toUpperCase();
        const validOptions = ['A', 'B', 'C', 'D'];
        
        if (!validOptions.includes(correctOption)) {
             results.failed++;
             results.errors.push(`Sətir ${index + 2}: Düzgün cavab formatı yanlışdır (A, B, C, D olmalıdır)`);
             continue;
        }

        const options = [
            { text: String(optionA), isCorrect: correctOption === 'A' },
            { text: String(optionB), isCorrect: correctOption === 'B' },
            { text: String(optionC), isCorrect: correctOption === 'C' },
            { text: String(optionD), isCorrect: correctOption === 'D' }
        ];

        await Question.create({
          text: String(text).trim(),
          options,
          examType,
          structureCodes: parsedStructureCodes,
          isActive: true,
          createdBy: req.user._id
        });

        results.added++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Sətir ${index + 2}: ${err.message}`);
      }
    }

    successResponse(res, results, 'Import tamamlandı');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Get all questions
// @route   GET /api/v1/questions
// @access  Private
exports.getQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 10, examType, search, structureCode } = req.query;
    const query = {};

    if (examType) {
      query.examType = examType;
    }

    if (search) {
      query.text = { $regex: search, $options: 'i' };
    }

    if (structureCode) {
      query.structureCodes = structureCode;
    }

    const total = await Question.countDocuments(query);
    const questions = await Question.find(query)
      .populate('examType', 'name slug')
      .populate('createdBy', 'personalData.firstName personalData.lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    successResponse(res, {
      questions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    }, 'Suallar uğurla gətirildi');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Create a question
// @route   POST /api/v1/questions
// @access  Private
exports.createQuestion = async (req, res) => {
  try {
    const { text, options, examType, structureCodes, isActive } = req.body;

    const question = await Question.create({
      text,
      options,
      examType,
      structureCodes,
      isActive,
      createdBy: req.user._id
    });

    successResponse(res, question, 'Sual uğurla yaradıldı', 201);
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Update a question
// @route   PUT /api/v1/questions/:id
// @access  Private
exports.updateQuestion = async (req, res) => {
  try {
    const { text, options, examType, structureCodes, isActive } = req.body;

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        text,
        options,
        examType,
        structureCodes,
        isActive,
        updatedBy: req.user._id
      },
      { new: true, runValidators: true }
    );

    if (!question) {
      return errorResponse(res, 'Sual tapılmadı', 404);
    }

    successResponse(res, question, 'Sual uğurla yeniləndi');
  } catch (error) {
    errorResponse(res, error.message);
  }
};

// @desc    Delete a question
// @route   DELETE /api/v1/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return errorResponse(res, 'Sual tapılmadı', 404);
    }

    successResponse(res, null, 'Sual uğurla silindi');
  } catch (error) {
    errorResponse(res, error.message);
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
      return errorResponse(res, 'Sual tapılmadı', 404);
    }

    successResponse(res, question, 'Status dəyişdirildi');
  } catch (error) {
    errorResponse(res, error.message);
  }
};
