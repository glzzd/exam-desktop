const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./src/config/db');
const ClientMachine = require('./src/models/ClientMachine');
const ExamSession = require('./src/models/ExamSession');
const Employee = require('./src/models/Employee/Employee');
const Structure = require('./src/models/Structure/Structure');
const userRoutes = require('./src/routes/v1/userRoutes');
const rbacRoutes = require('./src/routes/v1/rbacRoutes');
const authRoutes = require('./src/routes/v1/authRoutes');
const examTypeRoutes = require('./src/routes/v1/examTypeRoutes');
const structureRoutes = require('./src/routes/v1/structureRoutes');
const questionRoutes = require('./src/routes/v1/questionRoutes');
const employeeRoutes = require('./src/routes/v1/employeeRoutes');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for Electron/Dev
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  },
  pingTimeout: 60000, // Increase timeout for robustness
  pingInterval: 25000 // Regular heartbeats
});

const port = process.env.PORT || 3001;

// Make io accessible globally or pass it to routes
app.set('io', io);

// Store connected students
let students = [];

// Socket.IO Connection Logic
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Handle student joining
  socket.on('student-join', async (data) => {
    try {
      const { uuid, mac, hostname } = data;
      let machine = null;
      
      if (uuid) {
        machine = await ClientMachine.findOne({ uuid })
          .populate('assignedEmployee')
          .populate('assignedStructure');
        
        if (!machine) {
          // Assign new desk
          const lastMachine = await ClientMachine.findOne().sort({ deskNumber: -1 });
          const nextDeskNumber = lastMachine ? lastMachine.deskNumber + 1 : 1;
          
          machine = await ClientMachine.create({
            uuid,
            mac,
            hostname,
            deskNumber: nextDeskNumber,
            label: `Masa ${nextDeskNumber}`
          });
        } else {
          // Update existing info
          machine.mac = mac;
          machine.hostname = hostname;
          machine.lastConnected = new Date();
          await machine.save();
        }
      }

      const studentInfo = {
        socketId: socket.id,
        ip: socket.handshake.address.replace('::ffff:', ''), // Clean IPv6 mapping
        connectedAt: new Date(),
        deskNumber: machine ? machine.deskNumber : null,
        label: machine ? machine.label : 'Atanmamış',
        assignedEmployee: machine ? machine.assignedEmployee : null,
        assignedStructure: machine ? machine.assignedStructure : null,
        ...data
      };

      // Check for active exam session (Persistence check)
      let isConfirmed = false;
      try {
        const activeSession = await ExamSession.findOne({ 
          machineUuid: uuid, 
          status: { $in: ['confirmed', 'started'] } 
        }).sort({ createdAt: -1 });

        if (activeSession) {
          isConfirmed = true;
          console.log(`Restoring active session for ${hostname} (Session ID: ${activeSession._id})`);
        }
      } catch (sessionErr) {
        console.error('Error checking active session:', sessionErr);
      }

      // Check for desk number conflict in memory (Prevent duplicate Desk 1)
      if (machine) {
        const conflictIndex = students.findIndex(s => s.deskNumber === machine.deskNumber && s.uuid !== uuid);
        if (conflictIndex !== -1) {
          console.log(`Detected duplicate desk ${machine.deskNumber} in memory. Removing stale entry for UUID: ${students[conflictIndex].uuid}`);
          students.splice(conflictIndex, 1);
        }
      }

      // Check if student exists by UUID (reconnection)
      const existingStudentIndex = students.findIndex(s => s.uuid === uuid);

      const finalStudentInfo = {
        ...studentInfo,
        status: 'connected',
        isDuplicate: false,
        disconnectedAt: null,
        isConfirmed: isConfirmed
      };
      
      if (existingStudentIndex !== -1) {
        // Update existing student
        students[existingStudentIndex] = {
          ...students[existingStudentIndex],
          ...finalStudentInfo,
          // Ensure desk number is restored if it was cleared
          deskNumber: machine ? machine.deskNumber : null,
          label: machine ? machine.label : 'Atanmamış',
          assignedEmployee: machine ? machine.assignedEmployee : null,
          assignedStructure: machine ? machine.assignedStructure : null
        };
      } else {
        // Add new student
        students.push(finalStudentInfo);
      }

      console.log(`Student Joined/Reconnected: ${studentInfo.hostname} (${studentInfo.label}) - IP: ${studentInfo.ip} - Confirmed: ${isConfirmed}`);
      io.emit('student-list-updated', students);
      
      // Notify client about their desk assignment
      if (machine) {
        socket.emit('desk-assigned', { 
          label: machine.label, 
          deskNumber: machine.deskNumber,
          assignedEmployee: machine.assignedEmployee,
          assignedStructure: machine.assignedStructure
        });

        // If confirmed, restore exam state immediately
        if (isConfirmed) {
           socket.emit('exam-activated', {
             timestamp: new Date(),
             assignedEmployee: machine.assignedEmployee,
             assignedStructure: machine.assignedStructure,
             restored: true
           });
        }
      }
    } catch (err) {
      console.error('Error in student-join:', err);
    }
  });

  // Handle admin requesting list
  socket.on('admin-get-students', () => {
    socket.emit('student-list-updated', students);
  });

  // Handle admin updating desk number
  socket.on('admin-update-desk-number', async ({ uuid, deskNumber }) => {
    try {
      const newDeskNum = parseInt(deskNumber);
      if (isNaN(newDeskNum)) return;

      const sourceMachine = await ClientMachine.findOne({ uuid });
      if (!sourceMachine) return;

      const oldDeskNum = sourceMachine.deskNumber;

      // Check if target desk number is already taken
      const targetMachine = await ClientMachine.findOne({ deskNumber: newDeskNum });

      if (targetMachine && targetMachine.uuid !== uuid) {
        // SWAP LOGIC
        console.log(`Swapping Desk ${oldDeskNum} (UUID: ${uuid}) with Desk ${newDeskNum} (UUID: ${targetMachine.uuid})`);

        // 1. Set target to a temp value to avoid unique constraint error
        const tempDesk = -1 * newDeskNum; // Simple temp value
        targetMachine.deskNumber = tempDesk;
        await targetMachine.save();

        // 2. Set source to new desk
        sourceMachine.deskNumber = newDeskNum;
        sourceMachine.label = `Masa ${newDeskNum}`;
        await sourceMachine.save();

        // 3. Set target to old desk (if valid positive integer)
        // If source didn't have a valid desk (e.g. it was new or bugged), assign a new one
        const finalTargetDesk = oldDeskNum > 0 ? oldDeskNum : (await getNextFreeDeskNumber());
        
        targetMachine.deskNumber = finalTargetDesk;
        targetMachine.label = `Masa ${finalTargetDesk}`;
        await targetMachine.save();

        // Update in-memory list for Target
        const targetStudent = students.find(s => s.uuid === targetMachine.uuid);
        if (targetStudent) {
          targetStudent.deskNumber = finalTargetDesk;
          targetStudent.label = `Masa ${finalTargetDesk}`;
          io.to(targetStudent.socketId).emit('desk-assigned', { 
            label: targetMachine.label, 
            deskNumber: targetMachine.deskNumber,
            assignedEmployee: targetMachine.assignedEmployee,
            assignedStructure: targetMachine.assignedStructure
          });
        }

      } else {
        // DIRECT UPDATE (No conflict)
        sourceMachine.deskNumber = newDeskNum;
        sourceMachine.label = `Masa ${newDeskNum}`;
        await sourceMachine.save();
      }

      // Update in-memory list for Source
      const sourceStudent = students.find(s => s.uuid === uuid);
      if (sourceStudent) {
        sourceStudent.deskNumber = newDeskNum;
        sourceStudent.label = `Masa ${newDeskNum}`;
        io.to(sourceStudent.socketId).emit('desk-assigned', { 
          label: sourceMachine.label, 
          deskNumber: sourceMachine.deskNumber,
          assignedEmployee: sourceMachine.assignedEmployee,
          assignedStructure: sourceMachine.assignedStructure
        });
      }

      io.emit('student-list-updated', students);
      console.log(`Updated desk number for ${uuid} to ${newDeskNum}`);

    } catch (err) {
      console.error('Error updating desk number:', err);
      // Optional: Emit error back to client
    }
  });

  // Handle admin searching employees
  socket.on('admin-search-employees', async (query = '') => {
    try {
      const searchRegex = new RegExp(query, 'i');
      const employees = await Employee.find({
        $or: [
          { 'personalData.firstName': searchRegex },
          { 'personalData.lastName': searchRegex },
          { 'timsUserName': searchRegex }
        ],
        isActive: true,
        isDeleted: false
      }).limit(50).select('personalData timsUserName');
      
      socket.emit('admin-employees-result', employees);
    } catch (err) {
      console.error('Error searching employees:', err);
    }
  });

  // Handle admin searching structures
  socket.on('admin-search-structures', async (query = '') => {
    try {
      const searchRegex = new RegExp(query, 'i');
      const structures = await Structure.find({
        name: searchRegex,
        isActive: true
      }).limit(50).select('name code');
      
      socket.emit('admin-structures-result', structures);
    } catch (err) {
      console.error('Error searching structures:', err);
    }
  });

  // Handle admin assigning employee to machine
  socket.on('admin-assign-employee', async ({ uuid, employeeId }) => {
    try {
      const machine = await ClientMachine.findOne({ uuid });
      if (machine) {
        machine.assignedEmployee = employeeId || null; // null to unassign
        if (!employeeId) {
             machine.assignedStructure = null; // Also clear structure if resetting
        }
        await machine.save();
        
        // Populate to get full details
        await machine.populate('assignedEmployee');
        await machine.populate('assignedStructure');

        // Notify the student about the assignment
        const student = students.find(s => s.uuid === uuid);
        if (student) {
          student.assignedEmployee = machine.assignedEmployee;
          student.assignedStructure = machine.assignedStructure;
          // Also emit to the specific socket
          io.to(student.socketId).emit('desk-assigned', {
            label: machine.label,
            deskNumber: machine.deskNumber,
            assignedEmployee: machine.assignedEmployee,
            assignedStructure: machine.assignedStructure
          });
        }
        
        io.emit('student-list-updated', students);

        console.log(`Assigned employee ${employeeId} to machine ${uuid}`);
      }
    } catch (err) {
      console.error('Error assigning employee:', err);
    }
  });

  // Handle admin assigning structure to machine
  socket.on('admin-assign-structure', async ({ uuid, structureId }) => {
    try {
      const machine = await ClientMachine.findOne({ uuid });
      if (machine) {
        machine.assignedStructure = structureId || null;
        await machine.save();
        
        // Populate to get full details
        await machine.populate('assignedEmployee');
        await machine.populate('assignedStructure');

        // Notify the student about the assignment
        const student = students.find(s => s.uuid === uuid);
        if (student) {
          student.assignedEmployee = machine.assignedEmployee;
          student.assignedStructure = machine.assignedStructure;
          
          // Also emit to the specific socket
          io.to(student.socketId).emit('desk-assigned', {
            label: machine.label,
            deskNumber: machine.deskNumber,
            assignedEmployee: machine.assignedEmployee,
            assignedStructure: machine.assignedStructure
          });
        }
        
        io.emit('student-list-updated', students);

        console.log(`Assigned structure ${structureId} to machine ${uuid}`);
      }
    } catch (err) {
      console.error('Error assigning structure:', err);
    }
  });

  // Handle admin confirming desk info and saving to DB
  socket.on('admin-confirm-desk-info', async ({ targetUuids }) => {
    try {
      if (!Array.isArray(targetUuids) || targetUuids.length === 0) return;

      console.log(`Confirming desk info for ${targetUuids.length} students: ${targetUuids.join(', ')}`);
      
      const successUuids = [];

      for (const uuid of targetUuids) {
        const student = students.find(s => s.uuid === uuid && s.status === 'connected');
        if (student && student.assignedEmployee && student.assignedStructure) {
          
          // Create ExamSession record
          try {
            await ExamSession.create({
              employee: student.assignedEmployee._id,
              structure: student.assignedStructure._id,
              deskNumber: student.deskNumber,
              deskLabel: student.label,
              machineUuid: student.uuid,
              macAddress: student.mac,
              hostname: student.hostname,
              ipAddress: student.ip,
              platform: student.platform || 'unknown', // Assuming platform might be sent in handshake or data
              status: 'confirmed',
              confirmedAt: new Date()
            });
            
            // Mark student as confirmed in memory
            student.isConfirmed = true;

            console.log(`Exam session confirmed/saved for: ${student.hostname}`);

            // Emit event to specific student to start exam flow (or just acknowledge)
            io.to(student.socketId).emit('exam-activated', {
              timestamp: new Date(),
              assignedEmployee: student.assignedEmployee,
              assignedStructure: student.assignedStructure
            });
            
            successUuids.push(uuid);

          } catch (dbError) {
            console.error(`Failed to save exam session for ${uuid}:`, dbError);
          }
        }
      }
      
      // Emit success back to admin
      socket.emit('desk-info-confirmed-success', { count: successUuids.length });

      // Notify all admins about the update (including confirmation status)
      io.emit('student-list-updated', students);

    } catch (err) {
      console.error('Error confirming desk info:', err);
    }
  });

  // Helper to get next free desk number
  async function getNextFreeDeskNumber() {
    const lastMachine = await ClientMachine.findOne().sort({ deskNumber: -1 });
    return lastMachine ? lastMachine.deskNumber + 1 : 1;
  }

  socket.on('disconnect', (reason) => {
    console.log(`User Disconnected: ${socket.id} Reason: ${reason}`);
    
    // Check if it was a student
    const student = students.find(s => s.socketId === socket.id);
    if (student) {
      // Only mark as disconnected if not already exited
      if (student.status !== 'exited') {
        student.status = 'disconnected'; // Mark as disconnected (network issue)
        student.isDuplicate = true; 
        student.disconnectedAt = new Date();
        console.log(`Student Left (Marked Offline): ${student.hostname}`);
        io.emit('student-list-updated', students);
      }
    }
  });

  // Handle client requesting active exam types
  socket.on('get-active-exam-types', async () => {
    try {
      const ExamType = require('./src/models/Exam/ExamType');
      const examTypes = await ExamType.find({ isActive: true }).sort({ name: 1 });
      socket.emit('active-exam-types', examTypes);
    } catch (err) {
      console.error('Error fetching active exam types for client:', err);
    }
  });

  // Handle student starting an exam
  socket.on('student-start-exam', async ({ examTypeId }) => {
    try {
      const student = students.find(s => s.socketId === socket.id);
      if (!student) return;

      console.log(`Student ${student.hostname} started exam type: ${examTypeId}`);

      // Update in-memory status
      student.status = 'started';
      
      // Update DB Session
      const ExamSession = require('./src/models/ExamSession');
      const activeSession = await ExamSession.findOne({ 
        machineUuid: student.uuid, 
        status: 'confirmed' 
      }).sort({ createdAt: -1 });

      if (activeSession) {
        activeSession.status = 'started';
        activeSession.startedAt = new Date();
        // You might want to store examTypeId in the session too, but schema update needed
        await activeSession.save();
      }

      // Notify admins
      io.emit('student-list-updated', students);
      
      // Notify student success (optional, can trigger next UI step)
      socket.emit('exam-start-success', { examTypeId });

    } catch (err) {
      console.error('Error starting exam:', err);
    }
  });

  // Handle explicit exit
  socket.on('student-exit', () => {
    const student = students.find(s => s.socketId === socket.id);
    if (student) {
      student.status = 'exited'; // Explicit exit
      student.isDuplicate = true;
      student.disconnectedAt = new Date();
      console.log(`Student Exited App: ${student.hostname}`);
      io.emit('student-list-updated', students);
    }
  });

  socket.on('error', (err) => {
    console.error(`Socket Error: ${err.message}`);
  });
});

// Init MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: true, // Allow all origins dynamically
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/rbac', rbacRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/exam-types', examTypeRoutes);
app.use('/api/v1/structures', structureRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/employees', employeeRoutes);

const os = require('os');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '0.0.0.0';
}

server.listen(port, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log(`Server is running on port ${port}`);
  console.log(`Local Access: http://localhost:${port}`);
  console.log(`Network Access: http://${localIp}:${port}`);
});
