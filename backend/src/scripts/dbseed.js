const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Permission = require('../models/RBAC/Permission');
const Role = require('../models/RBAC/Role');
const User = require('../models/User/User');
const Structure = require('../models/Structure/Structure');
const xlsx = require('xlsx');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/electron-test');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // ==========================================
    // 1. Permissions
    // ==========================================
    const permissionsPath = path.join(__dirname, '../consts/permissions.json');
    
    if (!fs.existsSync(permissionsPath)) {
        console.error('permissions.json not found!');
        process.exit(1);
    }

    const permissionsData = JSON.parse(fs.readFileSync(permissionsPath, 'utf-8'));

    // Flatten the structure
    const permissionsToInsert = [];

    permissionsData.forEach(moduleData => {
      const { module, moduleKey, permissions } = moduleData;
      
      permissions.forEach(perm => {
        permissionsToInsert.push({
          ...perm,
          module,
          moduleKey
        });
      });
    });

    // Clear existing permissions
    try {
      await Permission.collection.drop();
      console.log('Old permissions collection dropped.');
    } catch (err) {
      if (err.code === 26) {
        console.log('Permissions collection does not exist, creating new one...');
      } else {
        throw err;
      }
    }

    // Insert new permissions
    let createdPermissions = [];
    if (permissionsToInsert.length > 0) {
        createdPermissions = await Permission.insertMany(permissionsToInsert);
        console.log(`Successfully imported ${createdPermissions.length} permissions.`);
    }

    // ==========================================
    // 2. Roles (Super Admin)
    // ==========================================
    
    // Clear existing roles
    try {
        await Role.collection.drop();
        console.log('Old roles collection dropped.');
    } catch (err) {
        if (err.code === 26) {
            console.log('Roles collection does not exist, creating new one...');
        } else {
            throw err;
        }
    }

    const allPermissionIds = createdPermissions.map(p => p._id);

    const superAdminRole = await Role.create({
        name: 'Super Admin',
        slug: 'superadmin',
        description: 'Tam yetkili yönetici rolü',
        permissions: allPermissionIds,
        isActive: true
    });
    console.log('Super Admin role created with all permissions.');

    // ==========================================
    // 3. Structures (from Excel)
    // ==========================================
    const structuresPath = path.join(__dirname, '../consts/strukturlar.xlsx');

    if (fs.existsSync(structuresPath)) {
        try {
            const workbook = xlsx.readFile(structuresPath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            if (data && data.length > 0) {
                // Clear existing structures
                try {
                    await Structure.collection.drop();
                    console.log('Old structures collection dropped.');
                } catch (err) {
                    if (err.code === 26) {
                        console.log('Structures collection does not exist, creating new one...');
                    } else {
                        throw err;
                    }
                }

                const structuresToInsert = [];
                for (const row of data) {
                    const code = row.structureCode || row.Code || row.kod || row.Kod;
                    
                    if (code) {
                        structuresToInsert.push({
                            code: String(code).trim(),
                            name: String(code).trim(), // Defaulting name to code since Excel only has code
                            isActive: true
                        });
                    }
                }
                
                if (structuresToInsert.length > 0) {
                    await Structure.insertMany(structuresToInsert);
                    console.log(`Successfully imported ${structuresToInsert.length} structures.`);
                }
            }
        } catch (err) {
            console.error('Error seeding structures:', err);
        }
    } else {
        console.log('strukturlar.xlsx not found, skipping structures seed.');
    }

    // ==========================================
    // 4. User (ilkin.guluzade@scis.gov.az)
    // ==========================================
    const targetUsername = 'ilkin.guluzade@scis.gov.az';
    const userPayload = {
        username: targetUsername,
        password: 'ilkin123', // Varsayılan şifre
        personalData: {
            firstName: 'Ilkin',
            lastName: 'Guluzade',
            gender: 'male'
        },
        role: superAdminRole._id,
        isActive: true
    };

    // Check if user exists
    let user = await User.findOne({ username: targetUsername });

    if (user) {
        user.role = superAdminRole._id;
        user.personalData = { ...user.personalData, ...userPayload.personalData }; // Merge personal data
        // Şifreyi sıfırlamak isterseniz burayı açabilirsiniz:
        // user.password = userPayload.password;
        await user.save();
        console.log(`User '${targetUsername}' updated with Super Admin role.`);
    } else {
        await User.create(userPayload);
        console.log(`User '${targetUsername}' created successfully.`);
    }

    console.log('Database seeding completed successfully.');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

seedDatabase();
