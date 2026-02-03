const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

// --- DATABASE CONNECTION ---
const { createClient } = require("@libsql/client/web");

const db = createClient({
  url: "https://mughal-db-mudassar7445.aws-ap-south-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAwNTEyMzEsImlkIjoiOGJlZDE1YWItOWUyNy00MjRiLThjYzMtNmFjN2NiZTIzY2UxIiwicmlkIjoiMjY1YjNiMTgtZDA1YS00OTUxLWI2YzktMDMzYzNlZjFhNjJiIn0.zVBC046n-Ngq-_DGweCU8iHp_gUJDTZUMqJPQzRcgdLhYrq3ID6ltbj8n0HvwvsgnoLbLOWUK7vujFlc7vjvDA"
});

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || "mughal_secret",
    resave: false,
    saveUninitialized: true
}));

const requireAuth = (req, res, next) => {
    if (!req.session.auth) return res.redirect("/login");
    next();
};

app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", (req, res) => {
    if (req.body.password === "ali1122") {
        req.session.auth = true;
        return res.redirect("/");
    }
    res.render("login", { error: "Ghalat Password!" });
});
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get("/", requireAuth, async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    try {
        const [daily, udhaar, bills, khata] = await Promise.all([
            db.execute({ sql: "SELECT SUM(total_amount) as total FROM khata_records WHERE date(created_at) = ?", args: [today] }),
            db.execute("SELECT SUM(balance_amount) as total FROM customers_detailed_khata"),
            db.execute("SELECT * FROM khata_records ORDER BY id DESC LIMIT 5"),
            db.execute("SELECT * FROM customers_detailed_khata ORDER BY id DESC LIMIT 5")
        ]);
        res.render("index", {
            daily_sale: daily.rows[0]?.total || 0,
            monthly_sale: 0,
            total_udhaar: udhaar.rows[0]?.total || 0,
            recent_bills: bills.rows,
            recent_khata: khata.rows,
            date: new Date().toDateString()
        });
    } catch (e) {
        res.send("Dashboard Load Error: " + e.message);
    }
});

app.get("/customer_khata", requireAuth, async (req, res) => {
    try {
        const history = await db.execute("SELECT * FROM customers_detailed_khata ORDER BY id DESC");
        res.render("customer_khata", { history: history.rows, msg: null });
    } catch(e) {
        res.send("Error loading Khata: " + e.message);
    }
});

app.post("/customer_khata", requireAuth, async (req, res) => {
    const { customer_name, customer_phone, entry_date, khata_details, total_amount, paid_amount } = req.body;
    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(paid_amount) || 0;
    const balance = total - paid;
    try {
        await db.execute({
            sql: "INSERT INTO customers_detailed_khata (customer_name, customer_phone, customer_address, khata_details, total_amount, paid_amount, balance_amount, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            args: [customer_name, customer_phone, "", khata_details, total, paid, balance, entry_date]
        });
        res.redirect("/customer_khata");
    } catch (e) {
        res.send(`<h3>Error Saving:</h3><p>${e.message}</p><a href='/customer_khata'>Back</a>`);
    }
});

// --- UPDATE KHATA ---
app.post("/update_khata", requireAuth, async (req, res) => {
    const { id, customer_name, customer_phone, khata_details, total_amount, paid_amount, entry_date } = req.body;
    const balance = parseFloat(total_amount) - parseFloat(paid_amount); 
    try {
        await db.execute({
            sql: "UPDATE customers_detailed_khata SET customer_name=?, customer_phone=?, khata_details=?, total_amount=?, paid_amount=?, balance_amount=?, entry_date=? WHERE id=?",
            args: [customer_name, customer_phone, khata_details, total_amount, paid_amount, balance, entry_date, id]
        });
        res.redirect("/customer_khata");
    } catch (e) {
        res.send(`<h3>Update Error:</h3><p>${e.message}</p>`);
    }
});

// --- SINGLE DELETE ---
app.get("/delete_khata/:id", requireAuth, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM customers_detailed_khata WHERE id = ?",
            args: [req.params.id]
        });
        res.redirect("/customer_khata");
    } catch (e) {
        res.send(`<h3>Error Deleting:</h3><p>${e.message}</p>`);
    }
});

// --- DELETE ALL KHATA (Detailed Register) ---
app.get("/delete_all_khata_confirm", requireAuth, async (req, res) => {
    try {
        await db.execute("DELETE FROM customers_detailed_khata");
        res.redirect("/customer_khata");
    } catch (e) {
        res.send(`<h3>Error Deleting All:</h3><p>${e.message}</p>`);
    }
});

// --- DELETE ALL BILLS (Saved Bills - NEW ADDED) ---
app.get("/delete_all_bills_confirm", requireAuth, async (req, res) => {
    try {
        await db.execute("DELETE FROM khata_records");
        res.redirect("/customers");
    } catch (e) {
        res.send(`<h3>Error Deleting Bills:</h3><p>${e.message}</p>`);
    }
});
// --------------------------------------------------

app.get("/add_customer", requireAuth, (req, res) => res.render("add_customer"));
app.post("/add_customer", requireAuth, async (req, res) => {
    const name = req.body.name || "Unknown";
    const phone = req.body.phone || "";
    const address = req.body.address || "";
    const opening_balance = parseFloat(req.body.opening_balance) || 0;
    const date = req.body.date || new Date().toISOString().split('T')[0];
    try {
        const check = await db.execute({
            sql: "SELECT * FROM customers WHERE name = ? AND phone = ?",
            args: [name, phone]
        });
        if (check.rows.length === 0) {
            await db.execute({
                sql: "INSERT INTO customers (name, phone, balance) VALUES (?, ?, ?)",
                args: [name, phone, opening_balance]
            });
        } else {
            await db.execute({
                sql: "UPDATE customers SET balance = balance + ? WHERE name = ? AND phone = ?",
                args: [opening_balance, name, phone]
            });
        }
        if (opening_balance > 0) {
            await db.execute({
                sql: "INSERT INTO customers_detailed_khata (customer_name, customer_phone, customer_address, khata_details, total_amount, paid_amount, balance_amount, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [name, phone, address, "Opening Balance (Purana Khata)", opening_balance, 0, opening_balance, date]
            });
        }
        res.redirect("/customer_khata"); 
    } catch (e) {
        res.send(`Error: ${e.message}`);
    }
});

app.get("/inventory", requireAuth, async (req, res) => {
    const result = await db.execute("SELECT * FROM products ORDER BY id DESC");
    res.render("inventory", { products: result.rows });
});
app.post("/insert_product", requireAuth, async (req, res) => {
    const { item_name, stock, feet, unit_type } = req.body;
    await db.execute({ sql: "INSERT INTO products (item_name, price, stock, feet, unit_type) VALUES (?, 0, ?, ?, ?)", args: [item_name, stock, feet || 0, unit_type] });
    res.redirect("/inventory");
});
app.post("/update_product", requireAuth, async (req, res) => {
    const { id, item_name, stock, feet, unit_type } = req.body;
    await db.execute({ sql: "UPDATE products SET item_name = ?, stock = stock + ?, feet = feet + ?, unit_type = ? WHERE id = ?", args: [item_name, stock, feet, unit_type, id] });
    res.redirect("/inventory");
});
app.get("/delete_product/:id", requireAuth, async (req, res) => {
    await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [req.params.id] });
    res.redirect("/inventory");
});
app.get("/billing", requireAuth, async (req, res) => {
    const products = await db.execute("SELECT * FROM products");
    res.render("billing", { products: products.rows });
});
app.post("/save_khata", requireAuth, async (req, res) => {
    const { name, phone, total, advance, remaining, items } = req.body;
    try {
        await db.execute({ sql: "INSERT INTO khata_records (customer_name, customer_phone, total_amount, advance_paid, remaining_balance, items_json) VALUES (?, ?, ?, ?, ?, ?)", args: [name, phone, total, advance, remaining, items] });
        const itemsList = JSON.parse(items);
        for (let item of itemsList) {
            await db.execute({ sql: "UPDATE products SET stock = stock - ?, feet = feet - ? WHERE id = ?", args: [item.qty, item.feet || 0, item.id] });
        }
        res.json({ status: "success" });
    } catch (e) { res.json({ status: "error", message: e.message }); }
});
app.get("/bill_history", requireAuth, async (req, res) => {
    const query = req.query.query || "";
    const result = await db.execute({ sql: "SELECT * FROM khata_records WHERE customer_name LIKE ? OR id = ? ORDER BY id DESC", args: [`%${query}%`, query] });
    res.render("bill_history", { bills: result.rows, query });
});
app.get("/customers", requireAuth, async (req, res) => {
    const records = await db.execute("SELECT * FROM khata_records ORDER BY id DESC");
    res.render("customers", { records: records.rows });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mughal Molding Server is Running on port ${PORT}!`));