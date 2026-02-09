const Structure = require('../models/Structure/Structure');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const xlsx = require('xlsx');

// Import structures from Excel
exports.importStructures = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'File is required', 400);
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return errorResponse(res, 'No data found in Excel file', 400);
    }

    const results = {
      added: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        // Expected headers: structureCode, structureName (optional: description)
        const code = row.structureCode || row.Code || row.kod || row.Kod;
        const name = row.structureName || row.Name || row.ad || row.Ad;
        const description = row.description || row.Description || row.tesvir || row.Tesvir;

        if (!code) {
          results.failed++;
          results.errors.push(`Row missing code: ${JSON.stringify(row)}`);
          continue;
        }

        // Default name to code if missing, or skip? Assuming name is required by model.
        // if (!name) {
        //   results.failed++;
        //   results.errors.push(`Row missing name for code ${code}`);
        //   continue;
        // }

        // Upsert: Update if exists, Insert if new
        const existing = await Structure.findOne({ code: String(code).trim() });
        
        if (existing) {
          if (name) existing.name = name;
          if (description) existing.description = description;
          existing.updatedBy = req.user._id;
          await existing.save();
          results.updated++;
        } else {
          await Structure.create({
            code: String(code).trim(),
            name: name ? String(name).trim() : String(code).trim(), // Default name to code if missing
            description: description || '',
            isActive: true,
            createdBy: req.user._id
          });
          results.added++;
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing row: ${err.message}`);
      }
    }

    return successResponse(res, results, 'Import completed');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Get all structures
exports.getAllStructures = async (req, res) => {
  try {
    const structures = await Structure.find().sort({ createdAt: -1 });
    return successResponse(res, structures, 'Structures retrieved successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Create new structure
exports.createStructure = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    
    const existingStructure = await Structure.findOne({ code });
    if (existingStructure) {
      return errorResponse(res, 'Structure with this code already exists', 400);
    }

    const structure = await Structure.create({
      name,
      code,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user._id
    });

    return successResponse(res, structure, 'Structure created successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Update structure
exports.updateStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const structure = await Structure.findById(id);
    if (!structure) {
      return errorResponse(res, 'Structure not found', 404);
    }

    // If code is changed, check for duplicates
    if (code && code !== structure.code) {
      const existing = await Structure.findOne({ 
        code,
        _id: { $ne: id }
      });
      
      if (existing) {
        return errorResponse(res, 'Structure with this code already exists', 400);
      }
      structure.code = code;
    }

    if (name) structure.name = name;
    if (description !== undefined) structure.description = description;
    if (isActive !== undefined) structure.isActive = isActive;
    structure.updatedBy = req.user._id;

    await structure.save();

    return successResponse(res, structure, 'Structure updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Delete structure
exports.deleteStructure = async (req, res) => {
  try {
    const { id } = req.params;
    const structure = await Structure.findByIdAndDelete(id);
    
    if (!structure) {
      return errorResponse(res, 'Structure not found', 404);
    }

    return successResponse(res, null, 'Structure deleted successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// Toggle status
exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const structure = await Structure.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    );

    if (!structure) {
      return errorResponse(res, 'Structure not found', 404);
    }

    return successResponse(res, structure, 'Status updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};
