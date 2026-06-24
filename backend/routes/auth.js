const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();

// ── Helper: generate a unique string user ID ───────────────────────────
const generateUserId = () => `user_${Math.random().toString(36).substr(2, 10)}`;

// ── Helper: verify JWT ─────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ── POST /api/auth/login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];

    // Support both bcrypt-hashed passwords and plain-text (for existing users)
    let isMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Log action
    try {
      await db.execute(
        'INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['System', `User ${user.name} logged in.`]
      );
    } catch (_) { /* audit_logs may differ in schema */ }

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── POST /api/auth/register ────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required' });

  const allowedRoles = ['customer', 'admin', 'marketing', 'account', 'design',
    'digitizer', 'ordermanagement', 'production', 'delivery', 'telecaller', 'vendor'];
  const userRole = allowedRoles.includes(role) ? role : 'customer';

  try {
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: 'Email is already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const userId = generateUserId();

    await db.execute(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email.toLowerCase().trim(), hashed, userRole]
    );

    const token = jwt.sign(
      { id: userId, email, role: userRole, name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    try {
      await db.execute(
        'INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['System', `User ${name} registered as ${userRole}.`]
      );
    } catch (_) { /* audit_logs may differ */ }

    res.status(201).json({
      token,
      user: { id: userId, name, email, role: userRole }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/users ────────────────────────────────────────────────
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, email, role FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/users/:id ────────────────────────────────────────────
router.put('/users/:id', authenticateToken, async (req, res) => {
  const { name, email, password, role } = req.body;
  const userId = req.params.id;

  try {
    const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let updatedPassword = user.password;
    if (password && password.trim() !== '') {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    await db.execute(
      'UPDATE users SET name = ?, email = ?, password = ?, role = ? WHERE id = ?',
      [name || user.name, email ? email.toLowerCase().trim() : user.email, updatedPassword, role || user.role, userId]
    );

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['System', `User ${userId} updated by Admin.`]);
    } catch (_) {}

    res.json({ id: userId, name: name || user.name, email: email || user.email, role: role || user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/auth/users/:id ─────────────────────────────────────────
router.delete('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  try {
    const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await db.execute('DELETE FROM users WHERE id = ?', [userId]);

    try {
      await db.execute('INSERT INTO audit_logs (role, message) VALUES (?, ?)',
        ['System', `User ${user.name} (${userId}) deleted by Admin.`]);
    } catch (_) {}

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, authenticateToken };

