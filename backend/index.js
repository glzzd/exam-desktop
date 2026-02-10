const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./src/config/db');
const ClientMachine = require('./src/models/ClientMachine');
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
        machine = await ClientMachine.findOne({ uuid });
        
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
        ...data
      };

      // Remove existing if any (shouldn't happen with new socket id but good practice)
      students = students.filter(s => s.socketId !== socket.id);
      students.push(studentInfo);

      console.log(`Student Joined: ${studentInfo.hostname} (${studentInfo.label}) - IP: ${studentInfo.ip}`);
      io.emit('student-list-updated', students);
      
      // Notify client about their desk assignment
      if (machine) {
        socket.emit('desk-assigned', { label: machine.label, deskNumber: machine.deskNumber });
      }
    } catch (err) {
      console.error('Error in student-join:', err);
    }
  });

  // Handle admin requesting list
  socket.on('admin-get-students', () => {
    socket.emit('student-list-updated', students);
  });

  socket.on('disconnect', (reason) => {
    console.log(`User Disconnected: ${socket.id} Reason: ${reason}`);
    
    // Check if it was a student
    const index = students.findIndex(s => s.socketId === socket.id);
    if (index !== -1) {
      const removed = students[index];
      students.splice(index, 1);
      console.log(`Student Left: ${removed.hostname}`);
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
