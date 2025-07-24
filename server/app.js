const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');

// Import database initialization
const { createTables } = require('./config/initDb');

const app = express();

// Initialize database tables
createTables();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Smart Attendance Management System API is running!',
    version: '1.0.0',
    endpoints: {
      students: {
        register: 'POST /api/students/register',
        login: 'POST /api/students/login',
        profile: 'GET /api/students/profile',
        attendance: 'GET /api/students/attendance'
      },
      teachers: {
        register: 'POST /api/teachers/register',
        login: 'POST /api/teachers/login',
        profile: 'GET /api/teachers/profile',
        markAttendance: 'POST /api/teachers/attendance'
      }
    }
  });
});

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
