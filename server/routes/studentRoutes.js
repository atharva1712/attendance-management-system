const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateStudent } = require('../middleware/auth');

const router = express.Router();

// POST /api/student/register - Register a new student
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branch, year } = req.body;

    // Validate required fields
    if (!name || !email || !password || !branch || !year) {
      return res.status(400).json({ 
        error: 'All fields are required: name, email, password, branch, year' 
      });
    }

    // Check if student already exists
    const existingStudent = await pool.query(
      'SELECT id FROM students WHERE email = $1',
      [email]
    );

    if (existingStudent.rows.length > 0) {
      return res.status(400).json({ error: 'Student with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new student
    const result = await pool.query(
      'INSERT INTO students (name, email, password, branch, year) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, branch, year',
      [name, email, hashedPassword, branch, year]
    );

    const newStudent = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: newStudent.id, email: newStudent.email, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Student registered successfully',
      student: newStudent,
      token
    });

  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/student/login - Student login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find student by email
    const result = await pool.query(
      'SELECT id, name, email, password, branch, year FROM students WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const student = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, student.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: student.id, email: student.email, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...studentData } = student;

    res.json({
      message: 'Login successful',
      student: studentData,
      token
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/student/profile - Get student profile (protected)
router.get('/profile', authenticateStudent, async (req, res) => {
  try {
    res.json({
      message: 'Student profile retrieved successfully',
      student: req.student
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/student/attendance - Get logged-in student's attendance with filtering (protected)
router.get('/attendance', authenticateStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const { subject, date_from, date_to } = req.query;

    // Build dynamic query based on filters
    let query = `
      SELECT 
        a.id, 
        a.date, 
        a.status, 
        a.subject,
        t.name as teacher_name
      FROM attendance a
      LEFT JOIN teachers t ON a.teacher_id = t.id
      WHERE a.student_id = $1
    `;
    
    const queryParams = [studentId];
    let paramCount = 1;

    // Add subject filter if provided
    if (subject) {
      paramCount++;
      query += ` AND a.subject ILIKE $${paramCount}`;
      queryParams.push(`%${subject}%`);
    }

    // Add date range filters if provided
    if (date_from) {
      paramCount++;
      query += ` AND a.date >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      query += ` AND a.date <= $${paramCount}`;
      queryParams.push(date_to);
    }

    query += ' ORDER BY a.date DESC, a.subject';

    const result = await pool.query(query, queryParams);

    // Get unique subjects for the student
    const subjectsResult = await pool.query(
      'SELECT DISTINCT subject FROM attendance WHERE student_id = $1 ORDER BY subject',
      [studentId]
    );

    res.json({
      message: 'Attendance records retrieved successfully',
      student: {
        id: req.student.id,
        name: req.student.name
      },
      filters: {
        subject: subject || null,
        date_from: date_from || null,
        date_to: date_to || null
      },
      subjects: subjectsResult.rows.map(row => row.subject),
      attendance: result.rows
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
