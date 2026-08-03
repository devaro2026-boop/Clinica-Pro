import express from "express";
import path from "path";
import cors from "cors";
import { createClient } from "@libsql/client";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";

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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS catalog_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        unit_price REAL NOT NULL,
        unit_type TEXT NOT NULL,
        stock INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    await db.execute("ALTER TABLE catalog_items ADD COLUMN stock INTEGER DEFAULT NULL");
  } catch (e) {
    // Column already exists or table doesn't exist yet
  }
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS budget_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER,
        item_id INTEGER,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL
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
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Seed initial clinic if empty
  const rs = await db.execute("SELECT * FROM clinics");
  if (rs.rows.length === 0) {
    await db.execute("INSERT INTO clinics (name) VALUES ('Clínica Principal')");
  }

  // Seed default business hours settings
  const checkSettings = await db.execute("SELECT * FROM settings WHERE key = 'schedule_hours'");
  if (checkSettings.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
      args: ['schedule_hours', JSON.stringify({
        start: '08:00',
        end: '18:00',
        interval: 30,
        workdays: [1, 2, 3, 4, 5] // Monday-Friday
      })]
    });
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
      const result = await db.execute("SELECT * FROM patients ORDER BY created_at DESC LIMIT 10");
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
      res.json({ id: Number(result.lastInsertRowid) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/patients/:id", async (req, res) => {
    const { name, phone, email, cpf, birth_date } = req.body;
    try {
      await db.execute({
        sql: "UPDATE patients SET name = ?, phone = ?, email = ?, cpf = ?, birth_date = ? WHERE id = ?",
        args: [name, phone, email, cpf, birth_date, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/patients/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM patients WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
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
    const { content } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO anamnesis (patient_id, content) VALUES (?, ?)",
        args: [req.params.id, content]
      });
      res.json({ id: Number(result.lastInsertRowid) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Appointments
  app.get("/api/appointments", async (req, res) => {
    try {
      const result = await db.execute("SELECT a.*, p.name as patient_name, p.phone as patient_phone FROM appointments a JOIN patients p ON a.patient_id = p.id ORDER BY date DESC, time DESC LIMIT 100");
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
      res.json({ id: Number(result.lastInsertRowid) });
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
      const result = await db.execute("SELECT f.*, p.name as patient_name FROM financial f LEFT JOIN patients p ON f.patient_id = p.id ORDER BY date DESC LIMIT 10");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id/financial", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM financial WHERE patient_id = ? ORDER BY date DESC LIMIT 10",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/financial", async (req, res) => {
    const { clinic_id, patient_id, description, amount, type, payment_method, status, date, items } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO financial (clinic_id, patient_id, description, amount, type, payment_method, status, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [clinic_id || 1, patient_id, description, amount, type, payment_method, status, date]
      });

      // Automatically deduct product stock if items are sent
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.type === 'product') {
            await db.execute({
              sql: "UPDATE catalog_items SET stock = CASE WHEN stock >= ? THEN stock - ? ELSE 0 END WHERE id = ? AND stock IS NOT NULL",
              args: [item.quantity, item.quantity, item.id]
            });
          }
        }
      }

      res.json({ id: Number(result.lastInsertRowid) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/financial/:id", async (req, res) => {
    const { description, amount, type, payment_method, status, date } = req.body;
    try {
      await db.execute({
        sql: "UPDATE financial SET description = ?, amount = ?, type = ?, payment_method = ?, status = ?, date = ? WHERE id = ?",
        args: [description, amount, type, payment_method, status, date, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/financial/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM financial WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
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
    
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';
      const url = `data:${mimeType};base64,${base64}`;
      
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {}

      const result = await db.execute({
        sql: "INSERT INTO photos (patient_id, type, url, date) VALUES (?, ?, ?, ?)",
        args: [patient_id, type, url, date || new Date().toISOString()]
      });
      res.json({ id: Number(result.lastInsertRowid), url });
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

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM photos WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
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
      res.json({ id: Number(result.lastInsertRowid) });
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
      res.json({ id: Number(result.lastInsertRowid), url });
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
      res.json({ id: Number(result.lastInsertRowid) });
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

  // Catalog
  app.get("/api/catalog", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM catalog_items ORDER BY name ASC");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/catalog", async (req, res) => {
    const { type, name, description, unit_price, unit_type, stock } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO catalog_items (type, name, description, unit_price, unit_type, stock) VALUES (?, ?, ?, ?, ?, ?)",
        args: [type, name, description, unit_price, unit_type, stock !== undefined ? stock : null]
      });
      res.json({ id: Number(result.lastInsertRowid) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  
  app.put("/api/catalog/:id", async (req, res) => {
    const { type, name, description, unit_price, unit_type, stock } = req.body;
    try {
      await db.execute({
        sql: "UPDATE catalog_items SET type = ?, name = ?, description = ?, unit_price = ?, unit_type = ?, stock = ? WHERE id = ?",
        args: [type, name, description, unit_price, unit_type, stock !== undefined ? stock : null, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/catalog/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM catalog_items WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Budgets
  app.get("/api/patients/:id/budgets", async (req, res) => {
    try {
      const budgetsRes = await db.execute({
        sql: "SELECT * FROM budgets WHERE patient_id = ? ORDER BY created_at DESC",
        args: [req.params.id]
      });
      
      const budgets = [];
      for (const b of budgetsRes.rows) {
        const itemsRes = await db.execute({
           sql: "SELECT bi.*, c.name, c.type, c.unit_type FROM budget_items bi JOIN catalog_items c ON bi.item_id = c.id WHERE bi.budget_id = ?",
           args: [b.id]
        });
        budgets.push({ ...b, items: itemsRes.rows });
      }
      res.json(budgets);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/patients/:id/budgets", async (req, res) => {
    const { total_amount, notes, items } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO budgets (patient_id, total_amount, notes) VALUES (?, ?, ?)",
        args: [req.params.id, total_amount, notes]
      });
      const budgetId = Number(result.lastInsertRowid);
      
      for (const item of items) {
        await db.execute({
          sql: "INSERT INTO budget_items (budget_id, item_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)",
          args: [budgetId, item.item_id, item.quantity, item.unit_price, item.total_price]
        });
      }
      res.json({ id: budgetId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/budgets/:id/status", async (req, res) => {
    const { status } = req.body;
    try {
      await db.execute({
        sql: "UPDATE budgets SET status = ? WHERE id = ?",
        args: [status, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Settings & Schedule Configurations
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [req.params.key]
      });
      if (result.rows.length === 0) {
        return res.json(null);
      }
      res.json(JSON.parse(result.rows[0].value as string));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/settings/:key", async (req, res) => {
    try {
      const valueStr = JSON.stringify(req.body);
      await db.execute({
        sql: "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        args: [req.params.key, valueStr]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Client Portal Auth & Registration
  app.post("/api/portal/auth", async (req, res) => {
    const { phone, cpf } = req.body;
    try {
      let result;
      if (phone && cpf) {
        result = await db.execute({
          sql: "SELECT * FROM patients WHERE phone = ? OR cpf = ? LIMIT 1",
          args: [phone, cpf]
        });
      } else if (phone) {
        result = await db.execute({
          sql: "SELECT * FROM patients WHERE phone = ? LIMIT 1",
          args: [phone]
        });
      } else if (cpf) {
        result = await db.execute({
          sql: "SELECT * FROM patients WHERE cpf = ? LIMIT 1",
          args: [cpf]
        });
      } else {
        return res.status(400).json({ error: "Informe o telefone ou CPF para entrar." });
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Cliente não cadastrado. Por favor, cadastre-se primeiro!" });
      }
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/portal/register", async (req, res) => {
    const { name, phone, email, cpf, birth_date } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Nome e Telefone são obrigatórios." });
    }
    try {
      // Check if phone or CPF already exists
      const check = await db.execute({
        sql: "SELECT * FROM patients WHERE phone = ? OR (cpf IS NOT NULL AND cpf != '' AND cpf = ?)",
        args: [phone, cpf || '']
      });
      if (check.rows.length > 0) {
        return res.status(400).json({ error: "Um cliente com este telefone ou CPF já está cadastrado." });
      }

      const result = await db.execute({
        sql: "INSERT INTO patients (clinic_id, name, phone, email, cpf, birth_date) VALUES (?, ?, ?, ?, ?, ?)",
        args: [1, name, phone, email || '', cpf || '', birth_date || '']
      });
      
      const newId = Number(result.lastInsertRowid);
      const newPatient = await db.execute({
        sql: "SELECT * FROM patients WHERE id = ?",
        args: [newId]
      });

      // Create welcome notification
      await db.execute({
        sql: "INSERT INTO client_notifications (patient_id, title, message) VALUES (?, ?, ?)",
        args: [newId, "Bem-vindo!", `Olá ${name}! Seja bem-vindo ao portal do cliente do Gestto. Aqui você pode realizar agendamentos online e acompanhar seu histórico.`]
      });

      res.json(newPatient.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Patient Appointments for Portal
  app.get("/api/portal/patients/:id/appointments", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC, time DESC",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Available Slots calculation
  app.get("/api/portal/available-slots", async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date is required" });
    try {
      const configRes = await db.execute("SELECT value FROM settings WHERE key = 'schedule_hours'");
      let config = { start: '08:00', end: '18:00', interval: 30, workdays: [1, 2, 3, 4, 5] };
      if (configRes.rows.length > 0) {
        config = JSON.parse(configRes.rows[0].value as string);
      }

      const d = new Date(date + 'T00:00:00');
      const dayOfWeek = d.getDay();
      
      if (!config.workdays.includes(dayOfWeek)) {
        return res.json({ status: 'closed', slots: [] });
      }

      const slots: string[] = [];
      let current = config.start;
      const end = config.end;
      const interval = config.interval || 30;

      const parseMinutes = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };

      const formatMinutes = (mins: number) => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const m = (mins % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
      };

      let currentMins = parseMinutes(current);
      const endMins = parseMinutes(end);

      while (currentMins < endMins) {
        slots.push(formatMinutes(currentMins));
        currentMins += interval;
      }

      const bookedRes = await db.execute({
        sql: "SELECT time FROM appointments WHERE date = ? AND status != 'cancelled'",
        args: [date as string]
      });
      const bookedTimes = bookedRes.rows.map(r => r.time as string);
      const available = slots.filter(s => !bookedTimes.includes(s));

      res.json({ status: 'open', slots: available });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Client notifications with automatic proximity notification generator
  app.get("/api/portal/patients/:id/notifications", async (req, res) => {
    const patientId = req.params.id;
    try {
      // 1. Check for upcoming appointments (today and tomorrow) to generate proximity notifications
      const todayStr = new Date().toISOString().split('T')[0];
      const upcoming = await db.execute({
        sql: "SELECT * FROM appointments WHERE patient_id = ? AND date >= ? AND status != 'cancelled'",
        args: [patientId, todayStr]
      });

      for (const appt of upcoming.rows) {
        const apptDateStr = appt.date as string;
        const apptTimeStr = appt.time as string;
        
        // Search if we already created a proximity notice for this appointment's date & time
        const checkAlert = await db.execute({
          sql: "SELECT * FROM client_notifications WHERE patient_id = ? AND message LIKE ?",
          args: [patientId, `%${apptDateStr}%${apptTimeStr}%`]
        });

        if (checkAlert.rows.length === 0) {
          await db.execute({
            sql: "INSERT INTO client_notifications (patient_id, title, message) VALUES (?, ?, ?)",
            args: [
              patientId,
              "Agendamento se aproximando!",
              `Lembrete: Seu agendamento para o dia ${apptDateStr.split('-').reverse().join('/')} às ${apptTimeStr} está próximo. Esperamos por você!`
            ]
          });
        }
      }

      // 2. Retrieve all notifications
      const result = await db.execute({
        sql: "SELECT * FROM client_notifications WHERE patient_id = ? ORDER BY created_at DESC LIMIT 50",
        args: [patientId]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/portal/notifications/:id/read", async (req, res) => {
    try {
      await db.execute({
        sql: "UPDATE client_notifications SET is_read = 1 WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Backup & Restore
  app.get("/api/backup", async (req, res) => {
    try {
      const tables = ['clinics', 'patients', 'appointments', 'financial', 'packages', 'catalog_items', 'budgets', 'budget_items', 'anamnesis', 'photos', 'settings', 'client_notifications'];
      const data: Record<string, any[]> = {};
      for (const t of tables) {
        const result = await db.execute(`SELECT * FROM ${t}`);
        data[t] = result.rows;
      }
      res.json({ version: 1, timestamp: new Date().toISOString(), data });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/restore", async (req, res) => {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: "Invalid backup data" });
    try {
      const tables = ['budget_items', 'budgets', 'photos', 'anamnesis', 'financial', 'packages', 'appointments', 'patients', 'catalog_items', 'clinics', 'settings', 'client_notifications'];
      for (const t of tables) {
        await db.execute(`DELETE FROM ${t}`);
      }

      for (const t of Object.keys(data)) {
        const rows = data[t];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          const keys = Object.keys(row);
          const placeholders = keys.map(() => '?').join(', ');
          const values = keys.map(k => row[k]);
          const sql = `INSERT INTO ${t} (${keys.join(', ')}) VALUES (${placeholders})`;
          await db.execute({ sql, args: values });
        }
      }
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
