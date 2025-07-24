const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Middleware to verify JWT token for students
const authenticateStudent = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Student token required.' });
    }

    // Verify student exists in database
    const result = await pool.query('SELECT id, name, email, branch, year FROM students WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token. Student not found.' });
    }

    req.student = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

// Middleware to verify JWT token for teachers
const authenticateTeacher = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Teacher token required.' });
    }

    // Verify teacher exists in database
    const result = await pool.query('SELECT id, name, email, subject FROM teachers WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token. Teacher not found.' });
    }

    req.teacher = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

module.exports = {
  authenticateStudent,
  authenticateTeacher
};
