const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

const UPLOADS_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "inventory.json");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

const storage = multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    }
});

const loadItems = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const saveItems = (items) => fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/items", (req, res) => {
    res.json(loadItems());
});

app.post("/api/items", upload.single("photo"), (req, res) => {
    const items = loadItems();
    const item = {
        id: Date.now().toString(),
        name: req.body.name || "Unnamed",
        category: req.body.category || "Other",
        color: req.body.color || "",
        brand: req.body.brand || "",
        size: req.body.size || "",
        notes: req.body.notes || "",
        photo: req.file ? `/uploads/${req.file.filename}` : null,
        createdAt: new Date().toISOString()
    };
    items.push(item);
    saveItems(items);
    res.json(item);
});

app.put("/api/items/:id", upload.single("photo"), (req, res) => {
    const items = loadItems();
    const idx = items.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Item not found" });

    const existing = items[idx];
    if (req.file && existing.photo) {
        const old = path.join(__dirname, existing.photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    items[idx] = {
        ...existing,
        name: req.body.name || existing.name,
        category: req.body.category || existing.category,
        color: req.body.color !== undefined ? req.body.color : existing.color,
        brand: req.body.brand !== undefined ? req.body.brand : existing.brand,
        size: req.body.size !== undefined ? req.body.size : existing.size,
        notes: req.body.notes !== undefined ? req.body.notes : existing.notes,
        photo: req.file ? `/uploads/${req.file.filename}` : existing.photo,
    };
    saveItems(items);
    res.json(items[idx]);
});

app.delete("/api/items/:id", (req, res) => {
    let items = loadItems();
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    if (item.photo) {
        const filePath = path.join(__dirname, item.photo);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    items = items.filter(i => i.id !== req.params.id);
    saveItems(items);
    res.json({ success: true });
});

app.listen(3000, () => {
    console.log("Clothing inventory running at http://localhost:3000");
});
