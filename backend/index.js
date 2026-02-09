const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./src/config/db');
const userRoutes = require('./src/routes/v1/userRoutes');
const rbacRoutes = require('./src/routes/v1/rbacRoutes');
const authRoutes = require('./src/routes/v1/authRoutes');
const examTypeRoutes = require('./src/routes/v1/examTypeRoutes');
const structureRoutes = require('./src/routes/v1/structureRoutes');
const questionRoutes = require('./src/routes/v1/questionRoutes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

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

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});
