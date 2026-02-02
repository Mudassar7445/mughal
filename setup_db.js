const db = require("./db");

async function setup() {
  try {
    // Products Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT,
        price REAL DEFAULT 0,
        stock REAL DEFAULT 0,
        feet REAL DEFAULT 0,
        unit_type TEXT
      )
    `);

    // Khata Records (Bills)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS khata_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_phone TEXT,
        total_amount REAL,
        advance_paid REAL,
        remaining_balance REAL,
        items_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        balance REAL DEFAULT 0
      )
    `);

    // Detailed Khata
    await db.execute(`
      CREATE TABLE IF NOT EXISTS customers_detailed_khata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        customer_phone TEXT,
        customer_address TEXT,
        khata_details TEXT,
        total_amount REAL,
        paid_amount REAL,
        balance_amount REAL,
        entry_date TEXT
      )
    `);

    console.log("Tables created successfully on Turso!");
  } catch (err) {
    console.error("Error creating tables:", err);
  }
}

setup();