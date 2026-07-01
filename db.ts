import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'pallywearuser',
  password: process.env.DB_PASSWORD || 'Pallywear@24',
  database: process.env.DB_NAME || 'pallywearcrm',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(sql: string, params?: any[]) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function initDB() {
  console.log('Initializing database connection and schemas...');
  try {
    // 1. Create users table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` varchar(50) NOT NULL,
        \`email\` varchar(100) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`role\` varchar(50) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // Seed default admin in database if table is empty
    const [userRows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    if ((userRows as any)[0].count === 0) {
      await pool.execute(
        'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)',
        ['admin-ceo', 'ceo@pallywear.com', 'pally@123', 'CEO Admin', 'admin']
      );
      console.log('Seeded default admin account into database.');
    }

    // 2. Create leads table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`leads\` (
        \`id\` varchar(50) NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`number\` varchar(50) NOT NULL,
        \`companyName\` varchar(100) DEFAULT NULL,
        \`gst\` varchar(50) DEFAULT NULL,
        \`leadType\` varchar(20) DEFAULT NULL,
        \`entryDate\` varchar(50) DEFAULT NULL,
        \`forecastedValue\` decimal(15,2) DEFAULT NULL,
        \`convertedValue\` decimal(15,2) DEFAULT NULL,
        \`totalOrderValue\` decimal(15,2) DEFAULT NULL,
        \`discountCode\` varchar(50) DEFAULT NULL,
        \`discountAmount\` decimal(15,2) DEFAULT NULL,
        \`netTotal\` decimal(15,2) DEFAULT NULL,
        \`createdBy\` varchar(50) DEFAULT NULL,
        \`createdByName\` varchar(100) DEFAULT NULL,
        \`description\` text,
        \`assignedTo\` varchar(50) DEFAULT NULL,
        \`assignedToName\` varchar(100) DEFAULT NULL,
        \`isTaken\` tinyint(1) DEFAULT '0',
        \`email\` varchar(255) DEFAULT NULL,
        \`status\` varchar(50) DEFAULT 'New',
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 3. Create orders table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` varchar(50) NOT NULL,
        \`customerName\` varchar(100) NOT NULL,
        \`customerCompany\` varchar(100) DEFAULT NULL,
        \`customerPhone\` varchar(50) NOT NULL,
        \`customerAddress\` text NOT NULL,
        \`category\` varchar(50) NOT NULL,
        \`quantity\` int NOT NULL,
        \`details\` text NOT NULL,
        \`sizeBreakdown\` text NOT NULL,
        \`totalAmount\` decimal(15,2) DEFAULT NULL,
        \`advancePay\` decimal(15,2) DEFAULT NULL,
        \`balanceAmount\` decimal(15,2) DEFAULT NULL,
        \`gstAmount\` decimal(15,2) DEFAULT NULL,
        \`discountAmount\` decimal(15,2) DEFAULT NULL,
        \`shippingCharges\` decimal(15,2) DEFAULT NULL,
        \`status\` varchar(100) DEFAULT 'Design',
        \`isUrgent\` tinyint(1) DEFAULT '0',
        \`notes\` text,
        \`staffImages\` text,
        \`staffPdfs\` text,
        \`staffAttachments\` text,
        \`accountsAttachments\` text,
        \`orderManagementAttachments\` text,
        \`designAttachments\` text,
        \`machineFiles\` text,
        \`createdAt\` bigint NOT NULL,
        \`updatedAt\` bigint NOT NULL,
        \`holdReason\` text,
        \`holdByUserId\` varchar(50) DEFAULT NULL,
        \`holdByUserName\` varchar(100) DEFAULT NULL,
        \`previousStatus\` varchar(50) DEFAULT NULL,
        \`assignedDesigner\` varchar(50) DEFAULT NULL,
        \`createdBy\` varchar(50) DEFAULT NULL,
        \`createdByName\` varchar(100) DEFAULT NULL,
        \`lastUpdatedBy\` varchar(50) DEFAULT NULL,
        \`vendorName\` varchar(100) DEFAULT NULL,
        \`vendorNumber\` varchar(50) DEFAULT NULL,
        \`vendorCompany\` varchar(100) DEFAULT NULL,
        \`vendorSize\` varchar(50) DEFAULT NULL,
        \`vendorQty\` int DEFAULT NULL,
        \`vendorHub\` varchar(50) DEFAULT NULL,
        \`vendorMaterial\` varchar(100) DEFAULT NULL,
        \`vendorModel\` varchar(100) DEFAULT NULL,
        \`vendorSleeve\` varchar(50) DEFAULT NULL,
        \`vendorPocket\` varchar(50) DEFAULT NULL,
        \`vendorColor\` varchar(50) DEFAULT NULL,
        \`vendorInstructions\` text,
        \`vendorDeliveryName\` varchar(100) DEFAULT NULL,
        \`vendorDeliveryPhone\` varchar(50) DEFAULT NULL,
        \`vendorDeliveryVehicle\` varchar(100) DEFAULT NULL,
        \`vendorDeliveryCourier\` varchar(100) DEFAULT NULL,
        \`vendorDeliveryTransportType\` varchar(100) DEFAULT NULL,
        \`vendorDeliveryQty\` int DEFAULT NULL,
        \`marketing_image\` longtext,
        \`marketing_notes\` text,
        \`invoice_file\` longtext,
        \`invoice_file_name\` varchar(255) DEFAULT NULL,
        \`original_design_file\` longtext,
        \`original_design_filename\` varchar(255) DEFAULT NULL,
        \`digitizer_file\` longtext,
        \`digitizer_filename\` varchar(255) DEFAULT NULL,
        \`is_hold\` tinyint DEFAULT '0',
        \`balance_received_notes\` text,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 4. Create invoices table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` varchar(50) NOT NULL,
        \`invoiceNumber\` varchar(50) DEFAULT NULL,
        \`date\` varchar(50) DEFAULT NULL,
        \`createdAt\` varchar(50) DEFAULT NULL,
        \`dueDate\` varchar(50) DEFAULT NULL,
        \`billToName\` varchar(100) DEFAULT NULL,
        \`billToEmail\` varchar(100) DEFAULT NULL,
        \`billToPhone\` varchar(50) DEFAULT NULL,
        \`billToAddress\` text,
        \`shipToAddress\` text,
        \`trackingNumber\` varchar(100) DEFAULT NULL,
        \`items\` text,
        \`subtotal\` decimal(15,2) DEFAULT NULL,
        \`discountTotal\` decimal(15,2) DEFAULT NULL,
        \`shippingCost\` decimal(15,2) DEFAULT NULL,
        \`salesTax\` decimal(15,2) DEFAULT NULL,
        \`total\` decimal(15,2) DEFAULT NULL,
        \`amountPaid\` decimal(15,2) DEFAULT NULL,
        \`balanceDue\` decimal(15,2) DEFAULT NULL,
        \`notes\` text,
        \`paymentInstructions\` text,
        \`paymentMethod\` varchar(50) DEFAULT NULL,
        \`productType\` varchar(100) DEFAULT NULL,
        \`productSubCategory\` varchar(100) DEFAULT NULL,
        \`customerPhoneNumber\` varchar(50) DEFAULT NULL,
        \`companySignature\` longtext,
        \`bankName\` varchar(100) DEFAULT NULL,
        \`bankAccountName\` varchar(100) DEFAULT NULL,
        \`bankIfscCode\` varchar(50) DEFAULT NULL,
        \`bankAccountNumber\` varchar(50) DEFAULT NULL,
        \`createdBy\` varchar(50) DEFAULT NULL,
        \`createdByName\` varchar(100) DEFAULT NULL,
        \`leadId\` varchar(50) DEFAULT NULL,
        \`invoice_file\` longtext,
        \`invoice_file_name\` varchar(255) DEFAULT NULL,
        \`order_id\` varchar(50) DEFAULT NULL,
        \`type\` varchar(50) DEFAULT 'Revenue',
        \`client\` varchar(150) DEFAULT NULL,
        \`amount\` decimal(15,2) NOT NULL DEFAULT '0.00',
        \`status\` varchar(50) DEFAULT 'Pending',
        \`description\` text,
        \`invoice_date\` varchar(50) DEFAULT NULL,
        \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    // 5. Create inventory_movements table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS \`inventory_movements\` (
        \`id\` varchar(50) NOT NULL,
        \`type\` varchar(20) NOT NULL,
        \`vendor\` varchar(100) DEFAULT NULL,
        \`customer\` varchar(100) DEFAULT NULL,
        \`date\` varchar(50) NOT NULL,
        \`transportName\` varchar(100) DEFAULT NULL,
        \`transportNumber\` varchar(50) DEFAULT NULL,
        \`orderId\` varchar(50) DEFAULT NULL,
        \`product\` varchar(100) NOT NULL,
        \`productType\` varchar(100) NOT NULL,
        \`sleeve\` varchar(50) DEFAULT NULL,
        \`pocket\` varchar(50) DEFAULT NULL,
        \`quantity\` int NOT NULL,
        \`createdAt\` bigint NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export default pool;
