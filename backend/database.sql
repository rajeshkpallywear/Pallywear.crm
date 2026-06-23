-- ============================================================
-- Pallywear CRM - MySQL Database Schema
-- Run this file to create all required tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS username_pallywearcrm;
USE username_pallywearcrm;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','marketing','account','design','digitizer','ordermanagement','production','delivery','telecaller','vendor','customer') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- LEADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  status ENUM('New','Dialed','Connected','Converted','Closed') DEFAULT 'New',
  source VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(20) PRIMARY KEY,
  client_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(200),
  items TEXT NOT NULL,
  total_val DECIMAL(10,2) NOT NULL,
  status ENUM('Design','Digitizing','Production','Delivery','Completed','Cancelled') DEFAULT 'Design',
  priority ENUM('Low','Medium','High') DEFAULT 'Medium',
  address TEXT,
  hub_details TEXT,
  design_id VARCHAR(20),
  order_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- DESIGNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS designs (
  id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(20),
  title VARCHAR(200) NOT NULL,
  status ENUM('Pending Review','In Progress','Approved','Rejected') DEFAULT 'Pending Review',
  designer VARCHAR(100),
  notes TEXT,
  design_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ============================================================
-- DIGITIZER QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS digitizer_queue (
  id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(20),
  filename VARCHAR(200) NOT NULL,
  status ENUM('Queue','In Progress','Completed') DEFAULT 'Queue',
  stitches INT DEFAULT 0,
  colors INT DEFAULT 0,
  format VARCHAR(20) DEFAULT 'DST',
  assigned_to VARCHAR(100),
  task_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ============================================================
-- PRODUCTION QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS production_queue (
  id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(20),
  item VARCHAR(200) NOT NULL,
  qty INT DEFAULT 0,
  machine VARCHAR(100),
  progress INT DEFAULT 0,
  status ENUM('Queue','Stitching','Ready') DEFAULT 'Queue',
  production_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ============================================================
-- SHIPMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS shipments (
  id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(20),
  courier VARCHAR(100),
  tracking_no VARCHAR(100) UNIQUE,
  status ENUM('Picked Up','In Transit','Out for Delivery','Delivered','Returned') DEFAULT 'Picked Up',
  destination TEXT,
  eta DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(30) PRIMARY KEY,
  order_id VARCHAR(20),
  type ENUM('Revenue','Expense') DEFAULT 'Revenue',
  client VARCHAR(150),
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Paid','Overdue','Cancelled') DEFAULT 'Pending',
  description TEXT,
  invoice_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- VENDORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  rating DECIMAL(3,1) DEFAULT 0.0,
  active_orders INT DEFAULT 0,
  material_price VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PURCHASE ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(20) PRIMARY KEY,
  vendor VARCHAR(150) NOT NULL,
  items TEXT NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  status ENUM('Sent','Received','Cancelled') DEFAULT 'Sent',
  po_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- CALLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS calls (
  id VARCHAR(20) PRIMARY KEY,
  caller VARCHAR(100),
  lead_id VARCHAR(20),
  lead_name VARCHAR(150),
  outcome ENUM('Connected','Left Voicemail','Busy','No Answer','Converted') DEFAULT 'Connected',
  notes TEXT,
  call_time TIME,
  call_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED: Default Users (passwords are bcrypt hashed for "admin123" etc)
-- ============================================================
INSERT IGNORE INTO users (name, email, password, role) VALUES
('Admin Staff',          'admin@pallywear.com',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'admin'),
('Marketing Manager',    'marketing@pallywear.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'marketing'),
('Lead Graphic Designer','designer@pallywear.com',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'design'),
('Embroidery Specialist','digitizer@pallywear.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'digitizer'),
('Operations Officer',   'operations@pallywear.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'ordermanagement'),
('Lead Telecaller',      'telecaller@pallywear.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'telecaller'),
('Mock Customer',        'customer@gmail.com',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVoMY8y5US', 'customer');

-- Note: All seed passwords are 'admin123' (hashed above).
-- Users should change passwords via the app after first login.

-- ============================================================
-- SEED: Default Vendors
-- ============================================================
INSERT IGNORE INTO vendors (id, name, category, rating, active_orders, material_price) VALUES
('VND-001', 'ThreadSupply Corp', 'Threads & Needles', 4.8, 0, '$4.50 / cone'),
('VND-002', 'TexFab Wholesale',  'Blank Apparel',     4.6, 1, '$12.00 / hoodie'),
('VND-003', 'VectorPro Agency',  'Design Overflows',  4.2, 0, '$45.00 / logo');

-- Initial audit log
INSERT INTO audit_logs (role, message) VALUES ('System', 'Pallywear CRM Database Initialized successfully.');
