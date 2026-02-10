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
      const ExamSession = require('./src/models/ExamSession');

      const examTypes = await ExamType.find({ isActive: true }).sort({ name: 1 });
      socket.emit('active-exam-types', examTypes);

      // Also fetch and send student's progress for these types
      const student = students.find(s => s.socketId === socket.id);
      if (student && student.uuid) {
          const activeSession = await ExamSession.findOne({ 
              machineUuid: student.uuid, 
              status: { $in: ['confirmed', 'started'] } 
          });

          if (activeSession && activeSession.examState && activeSession.examState.length > 0) {
              const progressMap = {};
              
              activeSession.examState.forEach(state => {
                  const total = state.questions ? state.questions.length : 0;
                  const answered = state.answers ? state.answers.size : 0;
                  
                  progressMap[state.examTypeId] = {
                      status: state.status,
                      answeredCount: answered,
                      totalQuestions: total,
                      // We can include more if needed, but this is enough for the card UI
                  };
              });

              socket.emit('student-exam-progress', progressMap);
           }
           
           // Sync Global Timer if session is started
           if (activeSession && activeSession.startedAt) {
               socket.emit('session-timer-sync', { startTime: activeSession.startedAt });
           }
       }

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
      
      // Load Models
      const Question = require('./src/models/Question/Question');
      const ExamType = require('./src/models/Exam/ExamType');

      // 1. Get Exam Type details
      const examType = await ExamType.findById(examTypeId);
      if (!examType) {
        socket.emit('error', { message: 'İmtahan növü tapılmadı' });
        return;
      }

      // 2. Validate Structure Code
      if (!student.assignedStructure || !student.assignedStructure.code) {
         socket.emit('error', { message: 'Struktur kodu təyin edilməyib' });
         return;
      }
      const structureCode = student.assignedStructure.code;

      // 3. Fetch Questions
      // Logic: examType matches AND structureCodes array contains student's structureCode
      const questions = await Question.find({
        examType: examTypeId,
        structureCodes: structureCode,
        isActive: true
      });

      if (questions.length === 0) {
        socket.emit('error', { message: 'Bu imtahan növü və struktur üçün sual tapılmadı' });
        return;
      }

      // 4. Shuffle Questions (Moved inside logic)
      // const shuffled = questions.sort(() => 0.5 - Math.random());
      
      // 5. Limit question count if needed (based on examType.questionCount)
      // const selectedQuestions = shuffled.slice(0, examType.questionCount);

      // 6. Prepare payload (remove isCorrect) (Moved inside logic)
      /*
      const sanitizedQuestions = selectedQuestions.map(q => ({
        _id: q._id,
        text: q.text,
        options: q.options.map(o => ({ _id: o._id, text: o.text })), // Hide isCorrect
        // structureCodes: q.structureCodes // Optional to send back
      }));
      */

      // 7. Update Student State
      student.status = 'started';
      student.examTypeId = examTypeId;
      student.examTypeName = examType.name;
      student.startTime = new Date();
      student.duration = examType.duration; // in minutes
      // student.totalQuestions will be set after sanitizedQuestions is populated
      
      // Update DB Session
      const ExamSession = require('./src/models/ExamSession');
      const activeSession = await ExamSession.findOne({ 
        machineUuid: student.uuid, 
        status: { $in: ['confirmed', 'started'] } 
      }).sort({ createdAt: -1 });

      let sanitizedQuestions = [];
      let previousAnswers = {};
      let isResume = false;

      if (activeSession) {
        // Only update status and startedAt if it's the FIRST time
        if (activeSession.status === 'confirmed') {
            activeSession.status = 'started';
            activeSession.startedAt = new Date();
        }

        // Check if this exam type is already started/generated
        const existingExamState = activeSession.examState.find(e => e.examTypeId.toString() === examTypeId);
        
        if (existingExamState) {
            // CHECK COMPLETED STATUS
            if (existingExamState.status === 'completed') {
                socket.emit('error', { message: 'Bu imtahan növü artıq tamamlanıb. Yenidən başlaya bilməzsiniz.' });
                return;
            }

            console.log(`Resuming exam ${examTypeId} for ${student.hostname}`);
            isResume = true;
            // Use existing questions
            sanitizedQuestions = existingExamState.questions.map(q => ({
                _id: q._id,
                text: q.text,
                options: q.options.map(o => ({ _id: o._id, text: o.text }))
            }));
            // Convert Map to Object for transmission
            previousAnswers = Object.fromEntries(existingExamState.answers);
        } else {
             // 4. Shuffle Questions
            const shuffled = questions.sort(() => 0.5 - Math.random());
            
            // 5. Limit question count if needed (based on examType.questionCount)
            const selectedQuestions = shuffled.slice(0, examType.questionCount);

            // 6. Prepare payload (remove isCorrect)
            sanitizedQuestions = selectedQuestions.map(q => ({
                _id: q._id,
                text: q.text,
                options: q.options.map(o => ({ _id: o._id, text: o.text })), // Hide isCorrect
            }));

            // Save to DB
            activeSession.examState.push({
                examTypeId: examTypeId,
                questions: selectedQuestions.map(q => ({
                    _id: q._id,
                    text: q.text,
                    options: q.options.map(o => ({ _id: o._id, text: o.text }))
                })),
                answers: {},
                status: 'in_progress',
                startTime: new Date()
            });
        }
        
        await activeSession.save();
      } else {
           // Fallback if no session found (shouldn't happen in normal flow but for dev)
           // Just shuffle and send
           const shuffled = questions.sort(() => 0.5 - Math.random());
           const selectedQuestions = shuffled.slice(0, examType.questionCount);
           sanitizedQuestions = selectedQuestions.map(q => ({
            _id: q._id,
            text: q.text,
            options: q.options.map(o => ({ _id: o._id, text: o.text })),
          }));
      }

      // Late Update of Student State
      student.totalQuestions = sanitizedQuestions.length;
      student.answeredCount = Object.keys(previousAnswers).length;

      // Notify admins
      io.emit('student-list-updated', students);
      
      // Send questions to student
      socket.emit('exam-started', {
        examTypeId, // Include examTypeId so client knows which one
        questions: sanitizedQuestions,
        previousAnswers, // Send back previous answers if resuming
        duration: examType.duration, // minutes
        startTime: activeSession?.startedAt || new Date() // Use session start time
      });

    } catch (err) {
      console.error('Error starting exam:', err);
      socket.emit('error', { message: 'İmtahan başadılarkən xəta baş verdi' });
    }
  });

  // Handle progress update
  socket.on('update-exam-progress', async ({ examTypeId, questionId, optionId, answeredCount, timeSpent }) => {
      const student = students.find(s => s.socketId === socket.id);
      if (student) {
          student.answeredCount = answeredCount;
          io.emit('student-list-updated', students);

          // Save answer to DB if details provided
          if (examTypeId && questionId) {
             try {
                 const ExamSession = require('./src/models/ExamSession');
                 const updates = {};
                 
                 // Update Answer
                 if (optionId !== undefined) { // Check undefined to allow null (deselect)
                    if (optionId) {
                        updates[`examState.$.answers.${questionId}`] = optionId;
                    } else {
                         // We can't use $unset inside $set, need separate operation for unset
                         // But for simplicity, let's use separate update if it's unset
                    }
                 }

                 // Update Time Spent
                 if (timeSpent !== undefined) {
                    updates[`examState.$.timeSpent.${questionId}`] = timeSpent;
                 }

                 if (Object.keys(updates).length > 0) {
                     await ExamSession.updateOne(
                        { machineUuid: student.uuid, status: { $in: ['confirmed', 'started'] }, "examState.examTypeId": examTypeId },
                        { $set: updates }
                     );
                 }
                 
                 // Handle unset separately if needed
                 if (optionId === null) {
                     await ExamSession.updateOne(
                        { machineUuid: student.uuid, status: { $in: ['confirmed', 'started'] }, "examState.examTypeId": examTypeId },
                        { $unset: { [`examState.$.answers.${questionId}`]: "" } }
                     );
                 }

             } catch (err) {
                 console.error("Error saving answer:", err);
             }
          }
      }
  });

  // Helper to generate result
  const generateExamResult = async (student, examSession, saveToDb = true) => {
      const ExamResult = require('./src/models/ExamResult');
      const Question = require('./src/models/Question/Question');
      const ExamType = require('./src/models/Exam/ExamType');
      const Employee = require('./src/models/Employee/Employee');
      const Structure = require('./src/models/Structure/Structure');

      // Fetch full employee details to ensure accuracy
      const employee = await Employee.findById(examSession.employee);
      let structureName = '';
      let structureCode = '';
      
      if (employee && employee.structureId) {
          const structure = await Structure.findById(employee.structureId);
          if (structure) {
              structureName = structure.name;
              structureCode = structure.code;
          }
      }

      const resultData = {
          student: {
              employeeId: examSession.employee,
              firstName: employee?.personalData?.firstName || student.firstName,
              lastName: employee?.personalData?.lastName || student.lastName,
              fatherName: employee?.personalData?.fatherName || student.fatherName,
              gender: employee?.personalData?.gender,
              structureName: structureName || student.assignedStructure?.name,
              structureCode: structureCode || student.assignedStructure?.code
          },
          examSessionId: examSession._id,
          deskNumber: examSession.deskNumber,
          deskLabel: examSession.deskLabel,
          machineUuid: examSession.machineUuid,
          macAddress: examSession.macAddress,
          ipAddress: examSession.ipAddress,
          startTime: examSession.startedAt,
          endTime: new Date(),
          totalDurationSeconds: Math.floor((new Date() - new Date(examSession.startedAt)) / 1000),
          examTypes: []
      };

      for (const state of examSession.examState) {
          const examType = await ExamType.findById(state.examTypeId);
          
          const typeResult = {
              examTypeId: state.examTypeId,
              examTypeName: examType?.name || 'Unknown',
              startTime: state.startTime,
              endTime: state.endTime || new Date(),
              durationSeconds: Math.floor(((state.endTime || new Date()) - new Date(state.startTime)) / 1000),
              questions: [],
              correctCount: 0,
              wrongCount: 0,
              emptyCount: 0,
              totalQuestions: state.questions.length,
              passed: false,
              score: 0
          };

          for (const qData of state.questions) {
              const originalQuestion = await Question.findById(qData._id);
              const selectedOptionId = state.answers.get(qData._id.toString());
              const timeSpent = state.timeSpent ? state.timeSpent.get(qData._id.toString()) || 0 : 0;
              
              const correctOption = originalQuestion.options.find(o => o.isCorrect);
              const isCorrect = selectedOptionId && correctOption && selectedOptionId === correctOption._id.toString();

              if (!selectedOptionId) {
                  typeResult.emptyCount++;
              } else if (isCorrect) {
                  typeResult.correctCount++;
              } else {
                  typeResult.wrongCount++;
              }

              typeResult.questions.push({
                  questionId: originalQuestion._id,
                  text: originalQuestion.text,
                  options: originalQuestion.options.map(o => ({
                      _id: o._id.toString(),
                      text: o.text,
                      isCorrect: o.isCorrect
                  })),
                  selectedOptionId: selectedOptionId || null,
                  isCorrect: !!isCorrect,
                  timeSpentSeconds: timeSpent
              });
          }
          
          // Calculate pass status (example logic)
          if (examType && examType.minCorrectAnswers <= typeResult.correctCount) {
              typeResult.passed = true;
          }
          typeResult.score = (typeResult.correctCount / typeResult.totalQuestions) * 100;

          resultData.examTypes.push(typeResult);
      }

      if (saveToDb) {
          const result = await ExamResult.create(resultData);
          console.log(`Exam Result generated and saved for ${student.hostname}`);
          return result;
      } else {
          console.log(`Exam Result generated (preview) for ${student.hostname}`);
          // Return as a plain object or transient Mongoose doc
          // Using plain object is safer to avoid accidental saves if returned to other logic
          return resultData; 
      }
  };

  // Handle finishing an exam type
  socket.on('student-finish-exam-type', async ({ examTypeId }) => {
      const student = students.find(s => s.socketId === socket.id);
      if (student) {
          try {
             const ExamSession = require('./src/models/ExamSession');
             // Mark type as completed
             await ExamSession.updateOne(
                { machineUuid: student.uuid, status: { $in: ['confirmed', 'started'] }, "examState.examTypeId": examTypeId },
                { $set: { "examState.$.status": 'completed', "examState.$.endTime": new Date() } }
             );
             
             // Check if ALL exams are completed
             const activeSession = await ExamSession.findOne({ 
                machineUuid: student.uuid, 
                status: { $in: ['confirmed', 'started'] } 
             });
             
             /* 
             // REMOVED AUTO-COMPLETION: Prevents session from closing prematurely if user refreshes
             // or if there are other exam types to take.
             if (activeSession) {
                 const allCompleted = activeSession.examState.every(s => s.status === 'completed');
                 if (allCompleted) {
                     // Finish the whole session
                     activeSession.status = 'completed';
                     activeSession.completedAt = new Date();
                     await activeSession.save();
                     
                     // Generate detailed result
                     await generateExamResult(student, activeSession);
                     
                     socket.emit('exam-finished-all');
                 }
             }
             */
             
             // Still generate/update result for this specific exam type if needed, 
             // but for now we rely on ExamSession persistence.
             // Maybe we can generate an intermediate result? 
             // For now, let's just keep the session open so the user doesn't get kicked out on refresh.

             console.log(`Student ${student.hostname} finished exam type: ${examTypeId}`);
          } catch (err) {
             console.error("Error finishing exam type:", err);
          }
      }
  });

  // Handle request for results
  socket.on('student-get-results', async () => {
    const student = students.find(s => s.socketId === socket.id);
    if (!student) return;

    try {
        const ExamSession = require('./src/models/ExamSession');
        const ExamResult = require('./src/models/ExamResult');
        
        const activeSession = await ExamSession.findOne({ 
            machineUuid: student.uuid, 
            status: { $in: ['confirmed', 'started'] } 
        });

        if (!activeSession) {
             socket.emit('error', { message: 'Aktiv sessiya tapılmadı.' });
             return;
        }

        // Check if all exams are completed
        const allCompleted = activeSession.examState.every(s => s.status === 'completed');
        if (!allCompleted) {
            socket.emit('error', { message: 'Nəticələri görmək üçün bütün imtahanları bitirməlisiniz.' });
            return;
        }

        // Check if result already exists for this session
        let result = await ExamResult.findOne({ examSessionId: activeSession._id });
        
        if (!result) {
            // Generate it now (PREVIEW ONLY - DO NOT SAVE TO DB YET)
            result = await generateExamResult(student, activeSession, false);
        }

        socket.emit('student-results', result);

    } catch (err) {
        console.error('Error fetching results:', err);
        socket.emit('error', { message: 'Nəticələri əldə edərkən xəta baş verdi.' });
    }
  });

  // Handle student finishing the entire session
  socket.on('student-finish-session', async () => {
    const student = students.find(s => s.socketId === socket.id);
    if (!student) return;

    console.log(`Student ${student.hostname} requested to finish session`);

    try {
        const ExamSession = require('./src/models/ExamSession');
        
        const activeSession = await ExamSession.findOne({ 
            machineUuid: student.uuid, 
            status: { $in: ['confirmed', 'started'] } 
        });

        if (activeSession) {
            // Mark session as completed
            activeSession.status = 'completed';
            activeSession.completedAt = new Date();
            await activeSession.save();
            
            // Generate and Save detailed result
            const result = await generateExamResult(student, activeSession, true);
            
            // Update student object in memory to include results for Admin Panel
            student.status = 'completed'; 
            student.results = result.examTypes.map(t => ({
                examTypeName: t.examTypeName,
                correctCount: t.correctCount,
                wrongCount: t.wrongCount,
                emptyCount: t.emptyCount,
                score: t.score,
                passed: t.passed
            }));

            // Notify student
            socket.emit('exam-finished-all'); 
            
            // Notify admins
            io.emit('student-list-updated', students);
            
            console.log(`Session finished for ${student.hostname}. Results generated.`);
        }
    } catch (err) {
        console.error('Error finishing session:', err);
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
