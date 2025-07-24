const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateTeacher } = require('../middleware/auth');

const router = express.Router();

// POST /api/teacher/register - Register a new teacher
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, subject } = req.body;

    // Validate required fields
    if (!name || !email || !password || !subject) {
      return res.status(400).json({ 
        error: 'All fields are required: name, email, password, subject' 
      });
    }

    // Check if teacher already exists
    const existingTeacher = await pool.query(
      'SELECT id FROM teachers WHERE email = $1',
      [email]
    );

    if (existingTeacher.rows.length > 0) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new teacher
    const result = await pool.query(
      'INSERT INTO teachers (name, email, password, subject) VALUES ($1, $2, $3, $4) RETURNING id, name, email, subject',
      [name, email, hashedPassword, subject]
    );

    const newTeacher = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: newTeacher.id, email: newTeacher.email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Teacher registered successfully',
      teacher: newTeacher,
      token
    });

  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /api/teacher/login - Teacher login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find teacher by email
    const result = await pool.query(
      'SELECT id, name, email, password, subject FROM teachers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const teacher = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, teacher.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, role: 'teacher' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...teacherData } = teacher;

    res.json({
      message: 'Login successful',
      teacher: teacherData,
      token
    });

  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/teacher/profile - Get teacher profile (protected)
router.get('/profile', authenticateTeacher, async (req, res) => {
  try {
    res.json({
      message: 'Teacher profile retrieved successfully',
      teacher: req.teacher
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teachers/students - Get all students for attendance marking (protected)
router.get('/students', authenticateTeacher, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, branch, year FROM students ORDER BY name'
    );

    res.json({
      message: 'Students retrieved successfully',
      students: result.rows
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/teachers/attendance-summary - Get attendance summary for all students (protected)
router.get('/attendance-summary', authenticateTeacher, async (req, res) => {
  try {
    // Query to get attendance summary for all students
    const query = `
      SELECT 
        s.id as student_id,
        s.name,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    const result = await pool.query(query);

    // Convert counts from strings to numbers
    const summary = result.rows.map(row => ({
      student_id: row.student_id,
      name: row.name,
      present: parseInt(row.present) || 0,
      absent: parseInt(row.absent) || 0,
      late: parseInt(row.late) || 0
    }));

    res.json({
      message: 'Attendance summary retrieved successfully',
      summary: summary
    });

  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// POST /api/teacher/attendance - Mark attendance for a student (protected)
router.post('/attendance', authenticateTeacher, async (req, res) => {
  try {
    const { student_id, date, status } = req.body;

    // Validate required fields
    if (!student_id || !date || !status) {
      return res.status(400).json({ 
        error: 'All fields are required: student_id, date, status' 
      });
    }

    // Validate status
    if (!['present', 'absent', 'late'].includes(status.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Status must be one of: present, absent, late' 
      });
    }

    // Check if student exists
    const studentCheck = await pool.query(
      'SELECT id, name FROM students WHERE id = $1',
      [student_id]
    );

    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentCheck.rows[0];

    // Get teacher's subject for the attendance record
    const teacherSubject = req.teacher.subject;
    const teacherId = req.teacher.id;

    // Check if attendance already exists for this student, teacher, subject and date
    const existingAttendance = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND teacher_id = $2 AND subject = $3 AND date = $4',
      [student_id, teacherId, teacherSubject, date]
    );

    let result;
    if (existingAttendance.rows.length > 0) {
      // Update existing attendance
      result = await pool.query(
        'UPDATE attendance SET status = $1 WHERE student_id = $2 AND teacher_id = $3 AND subject = $4 AND date = $5 RETURNING id, student_id, teacher_id, subject, date, status',
        [status.toLowerCase(), student_id, teacherId, teacherSubject, date]
      );
    } else {
      // Insert new attendance record
      result = await pool.query(
        'INSERT INTO attendance (student_id, teacher_id, subject, date, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, student_id, teacher_id, subject, date, status',
        [student_id, teacherId, teacherSubject, date, status.toLowerCase()]
      );
    }

    const attendanceRecord = result.rows[0];

    res.json({
      message: existingAttendance.rows.length > 0 ? 'Attendance updated successfully' : 'Attendance marked successfully',
      attendance: {
        ...attendanceRecord,
        student_name: student.name
      },
      marked_by: {
        teacher_id: req.teacher.id,
        teacher_name: req.teacher.name
      }
    });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
