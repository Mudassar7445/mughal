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

// --- ROUTES ---
app.get("/login", (req, res) => res.render("login", { error: null }));
app.post("/login", (req, res) => {
    if (req.body.password === "mughal123") {
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

// --- KHATA ROUTES ---
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

// --- DELETE KHATA ROUTE (YE ADD HUA HAI) ---
app.get("/delete_khata/:id", requireAuth, async (req, res) => {
    try {
        await db.execute({
            sql: "DELETE FROM customers_detailed_khata WHERE id = ?",
            args: [req.params.id]
        });
        res.redirect("/customer_khata");
    } catch (e) {
        res.send(`<h3>Error Deleting:</h3><p>${e.message}</p><a href='/customer_khata'>Go Back</a>`);
    }
});

// --- BAAKI ROUTES (Shortened for space, ye zaroori hain) ---
app.get("/add_customer", requireAuth, (req, res) => res.render("add_customer"));
app.post("/add_customer", requireAuth, async (req, res) => {
     // ... (Add Customer Code same as before)
     res.redirect("/customer_khata");
});
app.get("/inventory", requireAuth, async (req, res) => {
    const result = await db.execute("SELECT * FROM products ORDER BY id DESC");
    res.render("inventory", { products: result.rows });
});
app.get("/billing", requireAuth, async (req, res) => {
    const products = await db.execute("SELECT * FROM products");
    res.render("billing", { products: products.rows });
});
app.post("/save_khata", requireAuth, async (req, res) => {
    // ... (Save Khata Code)
    res.json({ status: "success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mughal Molding Server is Running on port ${PORT}!`));