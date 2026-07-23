import express from "express";
import path from "path";
import cors from "cors";
import { createClient } from "@libsql/client";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB Client
const dbUrl = process.env.TURSO_URL || "libsql://appclinicas-devaro.aws-us-east-1.turso.io";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ3Njk5NDgsImlkIjoiMDE5ZjhjODEtN2UwMS03ODhjLWE5ZTctMDI1NmRiNjAyMjI2Iiwia2lkIjoiVTdRbzBEZmExY3hLRjNvYzNoTFRGLUtwZ2ljNGFMcEpVMkY3cFpqbnk2MCIsInJpZCI6ImI3YTZkMzkzLWEzOGMtNGVkZS1hNjliLTczOGU3ZTNlZWVjMyJ9.wQhdCQXnNN_CLggww09L0_2Czt4ThLjbTXy3rEe9weY0XVNYQ4gzLaThUbwbjzV6ZAwavU_bzv3YOXNoa5_FDA";

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Setup File Uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clinics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        cpf TEXT,
        birth_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        patient_id INTEGER,
        date TEXT,
        time TEXT,
        description TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS anamnesis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        type TEXT,
        url TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS consent_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT,
        signature_base64 TEXT,
        pdf_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS financial (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic_id INTEGER,
        patient_id INTEGER,
        description TEXT,
        amount REAL,
        type TEXT,
        payment_method TEXT,
        status TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        name TEXT,
        total_sessions INTEGER,
        used_sessions INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Seed initial clinic if empty
  const rs = await db.execute("SELECT * FROM clinics");
  if (rs.rows.length === 0) {
    await db.execute("INSERT INTO clinics (name) VALUES ('Clínica Principal')");
  }
}

async function startServer() {
  await initDb().catch(e => console.error("DB Init Error:", e));

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // For base64 signatures
  app.use('/uploads', express.static(uploadDir)); // Serve uploaded files

  // API Routes
  
  // Clinics
  app.get("/api/clinics", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM clinics");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Patients
  app.get("/api/patients", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM patients ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/patients", async (req, res) => {
    const { clinic_id, name, phone, email, cpf, birth_date } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO patients (clinic_id, name, phone, email, cpf, birth_date) VALUES (?, ?, ?, ?, ?, ?)",
        args: [clinic_id || 1, name, phone, email, cpf, birth_date]
      });
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM patients WHERE id = ?",
        args: [req.params.id]
      });
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const result = await db.execute("SELECT a.*, p.name as patient_name, p.phone as patient_phone FROM appointments a JOIN patients p ON a.patient_id = p.id ORDER BY date, time");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/appointments", async (req, res) => {
    const { clinic_id, patient_id, date, time, description, status } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO appointments (clinic_id, patient_id, date, time, description, status) VALUES (?, ?, ?, ?, ?, ?)",
        args: [clinic_id || 1, patient_id, date, time, description, status || 'Scheduled']
      });
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/appointments/:id", async (req, res) => {
      const { status } = req.body;
      try {
          await db.execute({
              sql: "UPDATE appointments SET status = ? WHERE id = ?",
              args: [status, req.params.id]
          });
          res.json({ success: true });
      } catch (e: any) { res.status(500).json({ error: e.message }); }
  })

  // Financial
  app.get("/api/financial", async (req, res) => {
    try {
      const result = await db.execute("SELECT f.*, p.name as patient_name FROM financial f LEFT JOIN patients p ON f.patient_id = p.id ORDER BY date DESC");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id/financial", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM financial WHERE patient_id = ? ORDER BY date DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/financial", async (req, res) => {
    const { clinic_id, patient_id, description, amount, type, payment_method, status, date } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO financial (clinic_id, patient_id, description, amount, type, payment_method, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [clinic_id || 1, patient_id, description, amount, type, payment_method, status, date]
      });
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  
  app.put("/api/financial/:id/status", async (req, res) => {
    const { status, payment_method } = req.body;
    try {
      await db.execute({
        sql: "UPDATE financial SET status = ?, payment_method = ? WHERE id = ?",
        args: [status, payment_method, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Photos Upload
  app.post("/api/photos/upload", upload.single('photo'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const { patient_id, type, date } = req.body;
    const url = "/uploads/" + req.file.filename;
    
    try {
      const result = await db.execute({
        sql: "INSERT INTO photos (patient_id, type, url, date) VALUES (?, ?, ?, ?)",
        args: [patient_id, type, url, date]
      });
      res.json({ id: result.lastInsertRowid, url });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id/photos", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM photos WHERE patient_id = ? ORDER BY date DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Anamnesis
  app.get("/api/patients/:id/anamnesis", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM anamnesis WHERE patient_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/patients/:id/anamnesis", async (req, res) => {
    const { content } = req.body; // JSON string
    try {
      const result = await db.execute({
        sql: "INSERT INTO anamnesis (patient_id, content) VALUES (?, ?)",
        args: [req.params.id, content]
      });
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Consent Forms (Signatures)
  app.post("/api/consent-forms/upload-pdf", upload.single('pdf'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const { patient_id, title, signature_base64 } = req.body;
    const url = "/uploads/" + req.file.filename;
    
    try {
      const result = await db.execute({
        sql: "INSERT INTO consent_forms (patient_id, title, signature_base64, pdf_url) VALUES (?, ?, ?, ?)",
        args: [patient_id, title, signature_base64, url]
      });
      res.json({ id: result.lastInsertRowid, url });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id/consent-forms", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM consent_forms WHERE patient_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Packages
  app.get("/api/patients/:id/packages", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM packages WHERE patient_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/patients/:id/packages", async (req, res) => {
    const { name, total_sessions } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO packages (patient_id, name, total_sessions, used_sessions) VALUES (?, ?, ?, ?)",
        args: [req.params.id, name, total_sessions, 0]
      });
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/packages/:id/use", async (req, res) => {
    try {
      await db.execute({
        sql: "UPDATE packages SET used_sessions = used_sessions + 1 WHERE id = ? AND used_sessions < total_sessions",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
