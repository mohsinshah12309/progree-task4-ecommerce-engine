const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'progree-ecommerce-super-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Local SQLite Database
const dbPath = path.join(__dirname, 'ecommerce.db');
const db = new DatabaseSync(dbPath);

// Create Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 10,
    category TEXT DEFAULT 'Electronics',
    icon TEXT DEFAULT '📦'
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_email TEXT NOT NULL,
    total REAL NOT NULL,
    payment_id TEXT NOT NULL,
    items TEXT NOT NULL,
    status TEXT DEFAULT 'succeeded',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Products if table is empty
const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, stock, category, icon)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run('Mechanical Pro Keyboard', 'RGB hot-swappable tactile switches with low latency.', 89.99, 15, 'Peripherals', '⌨️');
  insertProduct.run('Noise-Cancelling Wireless Headphones', 'Active ANC with 40h battery life and premium drivers.', 149.50, 10, 'Audio', '🎧');
  insertProduct.run('Ergonomic Precision Mouse', 'Lightweight 26K DPI optical sensor with wireless charging.', 59.99, 20, 'Peripherals', '🖱️');
  insertProduct.run('Ultra-Wide 34" Curved Monitor', '144Hz WQHD IPS display for ultimate multitasking.', 399.00, 8, 'Displays', '🖥️');
  insertProduct.run('Studio Condenser Microphone', 'Cardioid USB microphone with integrated pop filter.', 79.00, 12, 'Audio', '🎙️');
  insertProduct.run('Fast 100W GaN Desktop Charger', 'Multi-port USB-C fast charger for laptops & phones.', 39.99, 25, 'Accessories', '⚡');
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required. Please sign in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

// ================= AUTH ROUTES ================= //

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `).run(name.trim(), normalizedEmail, passwordHash);

    const userPayload = { id: result.lastInsertRowid, name: name.trim(), email: normalizedEmail };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: userPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const userPayload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userPayload
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ================= PRODUCT & INVENTORY ROUTES ================= //

// GET /api/products
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= CHECKOUT SANDBOX & INVENTORY ADJUSTMENT ================= //

// POST /api/checkout/sandbox
app.post('/api/checkout/sandbox', authenticateToken, (req, res) => {
  try {
    const { items, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart is empty. Please add items before checking out.' });
    }

    // Step 1: Validate stock for all items
    const validatedItems = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.id);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ID ${item.id} not found.` });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: `Invalid quantity for ${product.name}.` });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          error: `Insufficient inventory for "${product.name}". Only ${product.stock} remaining in stock.`
        });
      }

      calculatedTotal += product.price * qty;
      validatedItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: qty
      });
    }

    // Step 2: Simulate Secure Stripe Payment Sandbox Gateway
    const paymentIntentId = `pi_sandbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Step 3: Backend Inventory Adjustment Transaction (Atomic decrements)
    db.exec('BEGIN TRANSACTION');
    try {
      const decrementStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      for (const item of validatedItems) {
        decrementStock.run(item.quantity, item.id);
      }

      // Record Order
      const recordOrder = db.prepare(`
        INSERT INTO orders (user_id, user_email, total, payment_id, items, status)
        VALUES (?, ?, ?, ?, ?, 'succeeded')
      `);
      const orderResult = recordOrder.run(
        req.user.id,
        req.user.email,
        Number(calculatedTotal.toFixed(2)),
        paymentIntentId,
        JSON.stringify(validatedItems)
      );

      db.exec('COMMIT');

      // Fetch updated products list
      const updatedProducts = db.prepare('SELECT * FROM products ORDER BY id ASC').all();

      res.status(200).json({
        success: true,
        message: 'Payment authorized and order processed successfully!',
        order: {
          orderId: orderResult.lastInsertRowid,
          paymentIntentId,
          amount: Number(calculatedTotal.toFixed(2)),
          status: 'succeeded',
          items: validatedItems,
          customer: req.user.email,
          createdAt: new Date().toISOString()
        },
        updatedProducts
      });
    } catch (txnError) {
      db.exec('ROLLBACK');
      throw txnError;
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders - Get user's order history
app.get('/api/orders', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
    const parsed = orders.map(o => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    res.json({ success: true, orders: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Secure E-Commerce Engine running on http://localhost:${PORT}`);
});
