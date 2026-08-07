import express from "express";
import path from "path";
import cors from "cors";
import { createClient } from "@libsql/client";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { AsyncLocalStorage } from "async_hooks";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Context storage for active store slug
const storeStorage = new AsyncLocalStorage<{ slug: string }>();

// List of tables that should be isolated per store
const tablesToPrefix = [
  'patients', 'appointments', 'financial', 'packages', 'catalog_items', 
  'budgets', 'budget_items', 'anamnesis', 'photos', 'consent_forms', 
  'settings', 'client_notifications', 'hub_messages', 'wallets', 'credit_cards'
];

// Initialize DB Client (Internal Raw Connection)
const dbUrl = process.env.TURSO_URL || "libsql://appclinicas-devaro.aws-us-east-1.turso.io";
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ3Njk5NDgsImlkIjoiMDE5ZjhjODEtN2UwMS03ODhjLWE5ZTctMDI1NmRiNjAyMjI2Iiwia2lkIjoiVTdRbzBEZmExY3hLRjNvYzNoTFRGLUtwZ2ljNGFMcEpVMkY3cFpqbnk2MCIsInJpZCI6ImI3YTZkMzkzLWEzOGMtNGVkZS1hNjliLTczOGU3ZTNlZWVjMyJ9.wQhdCQXnNN_CLggww09L0_2Czt4ThLjbTXy3rEe9weY0XVNYQ4gzLaThUbwbjzV6ZAwavU_bzv3YOXNoa5_FDA";

const rawDb = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Cache for external database clients per clinic
const storeDbClients = new Map<string, any>();

async function getDbClientForSlug(slug: string): Promise<any> {
  if (!slug || slug === 'principal') return rawDb;
  if (storeDbClients.has(slug)) return storeDbClients.get(slug);

  try {
    const res = await rawDb.execute({
      sql: "SELECT db_url, db_token FROM clinics WHERE slug = ?",
      args: [slug]
    });
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const url = row.db_url ? String(row.db_url).trim() : null;
      const token = row.db_token ? String(row.db_token).trim() : null;
      if (url) {
        console.log(`[DB Pool] Establishing custom Turso connection for: ${slug}, url: ${url}`);
        const client = createClient({
          url,
          authToken: token || undefined
        });
        storeDbClients.set(slug, client);
        return client;
      }
    }
  } catch (e) {
    console.error(`Error loading custom database configuration for ${slug}:`, e);
  }
  return rawDb;
}

// Proxy wrapper for db to support multi-store dynamic routing and custom isolated databases
const db = {
  execute: async (query: any) => {
    let sql = typeof query === 'string' ? query : query.sql;
    const args = typeof query === 'string' ? [] : (query.args || []);
    
    const context = storeStorage.getStore();
    let client = rawDb;
    if (context && context.slug) {
      const slug = context.slug;
      
      // Dynamic connection router
      client = await getDbClientForSlug(slug);
      
      for (const table of tablesToPrefix) {
        const regex = new RegExp(`\\b${table}\\b`, 'gi');
        sql = sql.replace(regex, `store_${slug}_${table}`);
      }
    }
    
    return client.execute({ sql, args });
  }
};


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
  // Setup Master Table
  await rawDb.execute(`
    CREATE TABLE IF NOT EXISTS clinics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        admin_email TEXT UNIQUE,
        admin_password TEXT,
        created_at DATETIME,
        db_url TEXT,
        db_token TEXT,
        billing_status TEXT DEFAULT 'pago',
        billing_due_date TEXT,
        billing_last_paid TEXT,
        is_blocked INTEGER DEFAULT 0
    );
  `);

  // Fallback migrations to add columns if they don't exist
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN slug TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN admin_email TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN admin_password TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN created_at DATETIME"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN db_url TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN db_token TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN billing_status TEXT DEFAULT 'pago'"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN billing_due_date TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN billing_last_paid TEXT"); } catch(e){}
  try { await rawDb.execute("ALTER TABLE clinics ADD COLUMN is_blocked INTEGER DEFAULT 0"); } catch(e){}

  // Run data transition for legacy data (ensure backward compatibility)
  await transitionExistingData().catch(e => console.error("Legacy transition error:", e));

  // Run schema updates on all existing stores
  await migrateAllStores().catch(e => console.error("Periodic migration error:", e));
}

async function createStoreTables(slug: string, targetDb: any = rawDb) {
  // Use the custom target connection to support external and isolated database structures
  const prefix = `store_${slug}_`;
  
  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}patients (
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
  
  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}appointments (
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

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}anamnesis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        type TEXT,
        url TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}consent_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT,
        signature_base64 TEXT,
        pdf_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}financial (
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

  // Dynamically add new fields to financial table for advanced forms
  const financialFields = [
    { name: 'category', type: 'TEXT' },
    { name: 'cost_center', type: 'TEXT' },
    { name: 'responsible', type: 'TEXT' },
    { name: 'apportionment', type: 'TEXT' },
    { name: 'installments', type: 'TEXT' },
    { name: 'account_card', type: 'TEXT' },
    { name: 'due_date', type: 'TEXT' },
    { name: 'competency_date', type: 'TEXT' }
  ];

  for (const field of financialFields) {
    try {
      await targetDb.execute(`ALTER TABLE ${prefix}financial ADD COLUMN ${field.name} ${field.type}`);
    } catch (e) {
      // Column might already exist, which is fine
    }
  }

  // Create Wallets table (Contas e carteiras)
  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'conta corrente', 'outros', 'poupança'
        balance REAL DEFAULT 0,
        bank_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Credit Cards table
  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}credit_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        invoice_amount REAL DEFAULT 0,
        available_limit REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default wallets if empty
  try {
    const checkWallets = await targetDb.execute(`SELECT COUNT(*) as count FROM ${prefix}wallets`);
    if ((checkWallets.rows[0]?.count as number) === 0) {
      const defaultWallets = [
        { name: 'PAGCORP', type: 'outros', balance: 1543.20 },
        { name: 'A RECEBER', type: 'outros', balance: 0 },
        { name: 'A RECEBER SOL AGORA', type: 'outros', balance: 0 },
        { name: 'Banco do Brasil - Entradas do mês', type: 'conta corrente', balance: 12450.00 },
        { name: 'Banco do Nordeste', type: 'conta corrente', balance: 3200.50 },
        { name: 'Bradesco - Despesas Fixas', type: 'conta corrente', balance: -450.00 },
        { name: 'BTG - Intersolis LTDA', type: 'conta corrente', balance: 45000.00 },
        { name: 'BTG Pactual - Intermobility', type: 'conta corrente', balance: 15200.10 },
        { name: 'C6 Bank (INTERMOBILITY)', type: 'conta corrente', balance: 8900.00 },
        { name: 'Conta Administrativa', type: 'conta corrente', balance: 1250.00 },
        { name: 'Conta Comercial - Matriz', type: 'outros', balance: 5400.00 },
        { name: 'Conta Inicial', type: 'outros', balance: 0 }
      ];
      for (const w of defaultWallets) {
        await targetDb.execute({
          sql: `INSERT INTO ${prefix}wallets (name, type, balance, bank_name) VALUES (?, ?, ?, ?)`,
          args: [w.name, w.type, w.balance, w.name.split(' - ')[0]]
        });
      }
    }
  } catch (err) {
    console.error("Error seeding default wallets:", err);
  }

  // Seed default credit cards if empty
  try {
    const checkCards = await targetDb.execute(`SELECT COUNT(*) as count FROM ${prefix}credit_cards`);
    if ((checkCards.rows[0]?.count as number) === 0) {
      const defaultCards = [
        { name: 'CARTÃO ITAU BUSINESS', invoice_amount: 8180.06, available_limit: -9278.41 },
        { name: 'CARTÃO SANTANDER', invoice_amount: 0.00, available_limit: 22800.00 }
      ];
      for (const c of defaultCards) {
        await targetDb.execute({
          sql: `INSERT INTO ${prefix}credit_cards (name, invoice_amount, available_limit) VALUES (?, ?, ?)`,
          args: [c.name, c.invoice_amount, c.available_limit]
        });
      }
    }
  } catch (err) {
    console.error("Error seeding default credit cards:", err);
  }

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        name TEXT,
        total_sessions INTEGER,
        used_sessions INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}catalog_items (
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

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'draft',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}budget_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        budget_id INTEGER,
        item_id INTEGER,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}client_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await targetDb.execute(`
    CREATE TABLE IF NOT EXISTS ${prefix}hub_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        type TEXT DEFAULT 'announcement',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default business hours settings for this store
  const checkSettings = await targetDb.execute(`SELECT * FROM ${prefix}settings WHERE key = 'schedule_hours'`);
  if (checkSettings.rows.length === 0) {
    await targetDb.execute({
      sql: `INSERT INTO ${prefix}settings (key, value) VALUES (?, ?)`,
      args: ['schedule_hours', JSON.stringify({
        start: '08:00',
        end: '18:00',
        interval: 30,
        workdays: [1, 2, 3, 4, 5]
      })]
    });
  }
}

async function transitionExistingData() {
  // Ensure the default 'principal' clinic exists in the clinics master table
  const checkPrincipal = await rawDb.execute("SELECT * FROM clinics WHERE slug = 'principal'");
  if (checkPrincipal.rows.length === 0) {
    const clinicsRes = await rawDb.execute("SELECT * FROM clinics");
    if (clinicsRes.rows.length > 0) {
      const id = clinicsRes.rows[0].id;
      await rawDb.execute({
        sql: "UPDATE clinics SET slug = ?, admin_email = ?, admin_password = ? WHERE id = ?",
        args: ['principal', 'admin@gestto.com', 'admin', id]
      });
    } else {
      await rawDb.execute({
        sql: "INSERT INTO clinics (name, slug, admin_email, admin_password) VALUES (?, ?, ?, ?)",
        args: ['Clínica Principal', 'principal', 'admin@gestto.com', 'admin']
      });
    }
  }

  // Build tables for default 'principal' clinic
  await createStoreTables('principal');

  // Migrate legacy records (from global un-prefixed tables to prefixed tables)
  const tables = [
    'patients', 'appointments', 'financial', 'packages', 'catalog_items', 
    'budgets', 'budget_items', 'anamnesis', 'photos', 'consent_forms', 
    'settings', 'client_notifications'
  ];

  for (const t of tables) {
    try {
      const countNew = await rawDb.execute(`SELECT COUNT(*) as count FROM store_principal_${t}`);
      const hasNewRows = (countNew.rows[0]?.count as number) > 0;
      if (!hasNewRows) {
        const oldRows = await rawDb.execute(`SELECT * FROM ${t}`);
        if (oldRows.rows.length > 0) {
          console.log(`[Transition] Migrating ${oldRows.rows.length} rows from ${t} to store_principal_${t}`);
          for (const row of oldRows.rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => row[k]);
            await rawDb.execute({
              sql: `INSERT INTO store_principal_${t} (${keys.join(', ')}) VALUES (${placeholders})`,
              args: values
            });
          }
        }
      }
    } catch (e) {
      // Legacy table might not exist or already migrated
    }
  }
}

async function migrateAllStores() {
  const result = await rawDb.execute("SELECT slug FROM clinics WHERE slug IS NOT NULL");
  for (const row of result.rows) {
    const slug = row.slug as string;
    try {
      await createStoreTables(slug);
    } catch (err) {
      console.error(`[Migration] Error migrating store ${slug}:`, err);
    }
  }
}


async function runDataCleanup() {
  try {
    const result = await db.execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ['data_cleanup']
    });
    let enabled = true;
    let retentionDays = 30;

    if (result.rows.length > 0) {
      try {
        const config = JSON.parse(result.rows[0].value as string);
        enabled = config.enabled !== undefined ? config.enabled : true;
        retentionDays = Number(config.retentionDays) || 30;
      } catch (parseErr) {
        console.error("[Cleanup] Error parsing data_cleanup settings:", parseErr);
      }
    }

    if (!enabled) {
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Clean up appointments
    await db.execute({
      sql: "DELETE FROM appointments WHERE date < ?",
      args: [cutoffStr]
    });

    // Clean up financial entries
    await db.execute({
      sql: "DELETE FROM financial WHERE date < ?",
      args: [cutoffStr]
    });

    // Clean up client notifications
    await db.execute({
      sql: "DELETE FROM client_notifications WHERE datetime(created_at) < datetime(?)",
      args: [`${cutoffStr} 00:00:00`]
    });

  } catch (err) {
    console.error("[Cleanup] Error running automatic cleanup for active store:", err);
  }
}

async function runDataCleanupAllStores() {
  try {
    const clinics = await rawDb.execute("SELECT slug FROM clinics WHERE slug IS NOT NULL");
    console.log(`[Cleanup] Starting multi-store cleanup for ${clinics.rows.length} stores...`);
    for (const row of clinics.rows) {
      const slug = row.slug as string;
      await storeStorage.run({ slug }, async () => {
        await runDataCleanup();
      });
    }
    console.log("[Cleanup] Multi-store cleanup completed successfully.");
  } catch (err) {
    console.error("[Cleanup] Error in runDataCleanupAllStores:", err);
  }
}

async function startServer() {
  await initDb().catch(e => console.error("DB Init Error:", e));

  // Initialize automatic data cleanup on startup and schedule it daily
  setTimeout(() => {
    runDataCleanupAllStores().catch(err => console.error("Startup Cleanup Error:", err));
  }, 5000);
  const ONEDAY_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runDataCleanupAllStores().catch(err => console.error("Periodic Cleanup Error:", err));
  }, ONEDAY_MS);


  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // For base64 signatures
  app.use('/uploads', express.static(uploadDir)); // Serve uploaded files

  // Store context interceptor middleware with blocking check support
  app.use(async (req, res, next) => {
    let slug = req.headers['x-store-slug'];
    if (!slug && req.headers.referer) {
      const referer = String(req.headers.referer);
      const match = referer.match(/\/loja\/([^/]+)/);
      if (match) {
        slug = match[1];
      }
    }
    if (!slug) {
      slug = 'principal';
    }

    // Block non-billing API requests if the store is in active blocked state
    if (slug && slug !== 'principal' && req.path.startsWith('/api/') && !req.path.includes('/billing') && !req.path.includes('/stores') && !req.path.includes('/hub')) {
      try {
        const checkBlocked = await rawDb.execute({
          sql: "SELECT is_blocked FROM clinics WHERE slug = ?",
          args: [String(slug)]
        });
        if (checkBlocked.rows.length > 0 && checkBlocked.rows[0].is_blocked === 1) {
          return res.status(403).json({
            error: 'STORE_BLOCKED',
            message: 'Esta loja está bloqueada devido a pendências de mensalidade. Por favor, regularize o pagamento.'
          });
        }
      } catch (err) {
        console.error("Error verifying block status in middleware:", err);
      }
    }

    storeStorage.run({ slug: String(slug) }, () => {
      next();
    });
  });

  // Multi-Store Management Routes
  
  // List all registered stores
  app.get("/api/stores", async (req, res) => {
    try {
      const result = await rawDb.execute("SELECT id, name, slug FROM clinics WHERE slug IS NOT NULL ORDER BY id DESC");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create/Register a new store
  app.post("/api/stores/register", async (req, res) => {
    const { name, slug, admin_email, admin_password, db_url, db_token } = req.body;

    if (!name || !slug || !admin_email || !admin_password) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    
    // Reserve system keywords
    const reservedSlugs = ['api', 'portal', 'dashboard', 'settings', 'patients', 'financial', 'packages', 'catalog', 'pdv', 'loja', 'principal'];
    if (reservedSlugs.includes(cleanSlug)) {
      return res.status(400).json({ error: "Este link da loja é reservado e não pode ser utilizado." });
    }

    try {
      // Check if slug or email already exists
      const checkSlug = await rawDb.execute({
        sql: "SELECT id FROM clinics WHERE slug = ?",
        args: [cleanSlug]
      });
      if (checkSlug.rows.length > 0) {
        return res.status(400).json({ error: "Já existe uma clínica com este link. Escolha outro." });
      }

      const checkEmail = await rawDb.execute({
        sql: "SELECT id FROM clinics WHERE admin_email = ?",
        args: [admin_email]
      });
      if (checkEmail.rows.length > 0) {
        return res.status(400).json({ error: "Este e-mail administrativo já está cadastrado." });
      }

      // Initialize database client target (either custom isolated or global internal raw connection)
      let targetDb = rawDb;
      if (db_url && db_url.trim()) {
        try {
          console.log(`[Register] Testing connection to custom db URL: ${db_url}`);
          targetDb = createClient({
            url: db_url.trim(),
            authToken: db_token ? db_token.trim() : undefined
          });
          // Do a test execute
          await targetDb.execute("SELECT 1");
          // Cache it for pooling
          storeDbClients.set(cleanSlug, targetDb);
        } catch (err: any) {
          return res.status(400).json({ error: `Conexão falhou com o Banco de Dados fornecido: ${err.message}` });
        }
      }

      // Initialize store tables dynamically
      await createStoreTables(cleanSlug, targetDb);

      const trialDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Insert new clinic row
      await rawDb.execute({
        sql: `INSERT INTO clinics (
                name, slug, admin_email, admin_password, created_at, db_url, db_token, billing_status, billing_due_date, is_blocked
              ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'pago', ?, 0)`,
        args: [
          name, 
          cleanSlug, 
          admin_email, 
          admin_password, 
          db_url ? db_url.trim() : null, 
          db_token ? db_token.trim() : null,
          trialDueDate
        ]
      });

      res.status(201).json({ success: true, slug: cleanSlug });
    } catch (e: any) {
      res.status(500).json({ error: `Erro no servidor: ${e.message}` });
    }
  });

  // Administrator login per store
  app.post("/api/stores/login", async (req, res) => {
    const { admin_email, admin_password } = req.body;

    if (!admin_email || !admin_password) {
      return res.status(400).json({ error: "Preencha o e-mail e a senha." });
    }

    try {
      const result = await rawDb.execute({
        sql: "SELECT name, slug, admin_password, is_blocked FROM clinics WHERE admin_email = ?",
        args: [admin_email]
      });

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      const clinic = result.rows[0];
      if (clinic.admin_password !== admin_password) {
        return res.status(401).json({ error: "E-mail ou senha inválidos." });
      }

      res.json({
        success: true,
        slug: clinic.slug,
        name: clinic.name,
        is_blocked: clinic.is_blocked === 1
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // HUB CENTRAL (SUPER-ADMIN) ENDPOINTS
  // ==========================================

  app.post("/api/hub/login", async (req, res) => {
    const { email, password } = req.body;
    const allowedEmails = ['devaro2026@gmail.com', 'financeiro@gestto.com'];
    
    let correctPassword = (process.env.HUB_PASSWORD || "gestto2026").trim();
    if (correctPassword.startsWith('"') && correctPassword.endsWith('"')) {
      correctPassword = correctPassword.slice(1, -1);
    }
    if (correctPassword.startsWith("'") && correctPassword.endsWith("'")) {
      correctPassword = correctPassword.slice(1, -1);
    }

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!allowedEmails.includes(cleanEmail)) {
      return res.status(401).json({ error: "Este e-mail não possui acesso de administrador do HUB." });
    }

    if (password !== correctPassword) {
      return res.status(401).json({ error: "Senha incorreta. Verifique suas credenciais mestre." });
    }

    res.json({ success: true, email: cleanEmail });
  });

  // List all clinics in detail (Hub Dashboard)
  app.get("/api/hub/clinics", async (req, res) => {
    try {
      const result = await rawDb.execute("SELECT * FROM clinics WHERE slug IS NOT NULL ORDER BY id DESC");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update clinic details (billing, db credentials, status, blocked)
  app.put("/api/hub/clinics/:id", async (req, res) => {
    const { id } = req.params;
    const { name, db_url, db_token, billing_status, billing_due_date, is_blocked } = req.body;

    try {
      const clinicRes = await rawDb.execute({
        sql: "SELECT slug FROM clinics WHERE id = ?",
        args: [id]
      });

      if (clinicRes.rows.length === 0) {
        return res.status(404).json({ error: "Clínica não encontrada." });
      }

      const slug = clinicRes.rows[0].slug as string;

      // Update in master clinics database table
      await rawDb.execute({
        sql: `UPDATE clinics SET 
                name = ?, 
                db_url = ?, 
                db_token = ?, 
                billing_status = ?, 
                billing_due_date = ?, 
                is_blocked = ? 
              WHERE id = ?`,
        args: [
          name, 
          db_url ? db_url.trim() : null, 
          db_token ? db_token.trim() : null, 
          billing_status || 'pago', 
          billing_due_date || null, 
          is_blocked ? 1 : 0, 
          id
        ]
      });

      // Evict old client cache connection
      storeDbClients.delete(slug);

      // Try migrating new database structure if they just added a database
      if (db_url) {
        try {
          const client = await getDbClientForSlug(slug);
          await createStoreTables(slug, client);
        } catch (e) {
          console.error(`Error migrating store ${slug} to new database:`, e);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete clinic and clean up internal tables to preserve database economy
  app.delete("/api/hub/clinics/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const clinicRes = await rawDb.execute({
        sql: "SELECT id, name, slug, db_url FROM clinics WHERE id = ?",
        args: [id]
      });

      if (clinicRes.rows.length === 0) {
        return res.status(404).json({ error: "Clínica não encontrada." });
      }

      const clinic = clinicRes.rows[0];
      const slug = clinic.slug as string;
      const isCustomDb = !!clinic.db_url;

      if (slug === 'principal') {
        return res.status(400).json({ error: "A clínica principal não pode ser excluída." });
      }

      // If internal database is used, drop its prefixed tables to keep database light and economical
      if (!isCustomDb) {
        for (const table of tablesToPrefix) {
          try {
            await rawDb.execute(`DROP TABLE IF EXISTS store_${slug}_${table}`);
          } catch (dropErr) {
            console.error(`Failed to drop table store_${slug}_${table} for deleted clinic ${slug}:`, dropErr);
          }
        }
      }

      // Delete from clinics master table
      await rawDb.execute({
        sql: "DELETE FROM clinics WHERE id = ?",
        args: [id]
      });

      // Evict from client connections cache
      storeDbClients.delete(slug);

      res.json({ success: true, message: `Clínica "${clinic.name}" excluída com sucesso.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Send messages from Hub (Bulk or Single)
  app.post("/api/hub/messages", async (req, res) => {
    const { target, title, message, type } = req.body; // target: 'all' or specific slug

    if (!title || !message) {
      return res.status(400).json({ error: "Título e mensagem são obrigatórios." });
    }

    try {
      let targets: string[] = [];
      if (target === 'all') {
        const clinicsRes = await rawDb.execute("SELECT slug FROM clinics WHERE slug IS NOT NULL AND slug != 'principal'");
        targets = clinicsRes.rows.map(r => r.slug as string);
      } else {
        targets = [target];
      }

      let successCount = 0;
      for (const slug of targets) {
        try {
          const prefix = `store_${slug}_`;
          const client = await getDbClientForSlug(slug);
          await client.execute({
            sql: `INSERT INTO ${prefix}hub_messages (title, message, type) VALUES (?, ?, ?)`,
            args: [title, message, type || 'announcement']
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to send message to clinic database: ${slug}`, err);
        }
      }

      res.json({ success: true, message: `Mensagem enviada com sucesso para ${successCount} de ${targets.length} clínicas.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // STORE BILLING & MESSAGES CLIENT ENDPOINTS
  // ==========================================

  // Get active store billing info
  app.get("/api/billing/info", async (req, res) => {
    const context = storeStorage.getStore();
    if (!context || !context.slug) {
      return res.status(400).json({ error: "Sem contexto de loja ativo." });
    }
    const slug = context.slug;

    try {
      const result = await rawDb.execute({
        sql: "SELECT billing_status, billing_due_date, billing_last_paid, is_blocked FROM clinics WHERE slug = ?",
        args: [slug]
      });

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Clínica não encontrada." });
      }

      const info = result.rows[0];
      res.json({
        billing_status: info.billing_status || 'pago',
        billing_due_date: info.billing_due_date || '',
        billing_last_paid: info.billing_last_paid || '',
        is_blocked: info.is_blocked === 1,
        monthly_fee: 149.90
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Perform Pix Payment (Mercado Pago integration simulation)
  app.post("/api/billing/pay", async (req, res) => {
    const context = storeStorage.getStore();
    if (!context || !context.slug) {
      return res.status(400).json({ error: "Sem contexto de loja ativo." });
    }
    const slug = context.slug;

    try {
      const clinicRes = await rawDb.execute({
        sql: "SELECT billing_due_date FROM clinics WHERE slug = ?",
        args: [slug]
      });

      if (clinicRes.rows.length === 0) {
        return res.status(404).json({ error: "Clínica não encontrada." });
      }

      const currentDue = clinicRes.rows[0].billing_due_date as string;
      let newDue = new Date();
      if (currentDue) {
        const parsedDue = new Date(currentDue);
        if (parsedDue > new Date()) {
          newDue = new Date(parsedDue.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          newDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      } else {
        newDue = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const formattedNewDue = newDue.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Update in master clinics table
      await rawDb.execute({
        sql: "UPDATE clinics SET billing_status = 'pago', billing_due_date = ?, billing_last_paid = ?, is_blocked = 0 WHERE slug = ?",
        args: [formattedNewDue, todayStr, slug]
      });

      // Insert billing confirmation inside store's messages
      try {
        const prefix = `store_${slug}_`;
        const client = await getDbClientForSlug(slug);
        await client.execute({
          sql: `INSERT INTO ${prefix}hub_messages (title, message, type) VALUES (?, ?, 'billing')`,
          args: [
            'Mensalidade Quitada!', 
            `A mensalidade do seu painel Gestto foi quitada com sucesso via Mercado Pago (Pix). Acesso prorrogado até o dia ${formattedNewDue.split('-').reverse().join('/')}. Obrigado por utilizar nossa plataforma!`,
            'billing'
          ]
        });

        // Add expense log inside store's financial table
        await client.execute({
          sql: `INSERT INTO ${prefix}financial (description, amount, type, payment_method, status, date) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            'Assinatura Mensal Gestto Multi-Lojas',
            149.90,
            'expense',
            'pix',
            'paid',
            todayStr
          ]
        });
      } catch (err) {
        console.error("Error logging local financial entry for paid billing:", err);
      }

      res.json({
        success: true,
        message: "Mensalidade quitada com sucesso!",
        new_due_date: formattedNewDue
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // List notifications unified for store bell
  app.get("/api/notifications/bell", async (req, res) => {
    const context = storeStorage.getStore();
    if (!context || !context.slug) {
      return res.status(400).json({ error: "Sem contexto de loja ativo." });
    }
    const slug = context.slug;

    try {
      const list: any[] = [];

      // 1. Unconfirmed / Pending Appointments
      try {
        const appointments = await db.execute("SELECT id, date, time, description, status FROM appointments WHERE status = 'pending' ORDER BY date ASC, time ASC LIMIT 10");
        for (const appt of appointments.rows) {
          list.push({
            id: `appt_${appt.id}`,
            originalId: appt.id,
            type: 'appointment',
            title: 'Novo Agendamento Recebido',
            message: `${appt.description || 'Consulta'} marcada para dia ${appt.date} às ${appt.time}.`,
            created_at: new Date().toISOString(),
            is_read: 0
          });
        }
      } catch (e) {
        console.error("Bell fetch appointments error:", e);
      }

      // 2. Unread Hub messages
      try {
        const hubMessages = await db.execute("SELECT id, title, message, type, created_at, is_read FROM hub_messages WHERE is_read = 0 ORDER BY id DESC LIMIT 10");
        for (const msg of hubMessages.rows) {
          list.push({
            id: `msg_${msg.id}`,
            originalId: msg.id,
            type: 'hub_message',
            title: msg.title,
            message: msg.message,
            created_at: msg.created_at,
            is_read: msg.is_read
          });
        }
      } catch (e) {
        console.error("Bell fetch hub messages error:", e);
      }

      // 3. Billing alert
      try {
        const billing = await rawDb.execute({
          sql: "SELECT billing_status, billing_due_date, is_blocked FROM clinics WHERE slug = ?",
          args: [slug]
        });

        if (billing.rows.length > 0) {
          const info = billing.rows[0];
          const dueDateStr = info.billing_due_date as string;
          if (dueDateStr) {
            const dueDate = new Date(dueDateStr);
            const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            
            if (info.is_blocked === 1) {
              list.push({
                id: 'billing_blocked',
                type: 'billing',
                title: 'CONTA BLOQUEADA',
                message: 'Seu acesso foi temporariamente suspenso por falta de pagamento. Clique para pagar via Pix.',
                created_at: new Date().toISOString(),
                is_read: 0
              });
            } else if (info.billing_status === 'atraso' || diffDays <= 5) {
              list.push({
                id: 'billing_warning',
                type: 'billing',
                title: 'Vencimento de Mensalidade',
                message: diffDays <= 0 
                  ? 'Sua mensalidade de R$ 149,90 venceu. Pague para evitar bloqueios.' 
                  : `A mensalidade de R$ 149,90 vence em ${diffDays} dias (${dueDateStr.split('-').reverse().join('/')}).`,
                created_at: new Date().toISOString(),
                is_read: 0
              });
            }
          }
        }
      } catch (e) {
        console.error("Bell fetch billing info error:", e);
      }

      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get store hub messages list
  app.get("/api/hub-messages", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM hub_messages ORDER BY id DESC LIMIT 50");
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Mark store hub message as read
  app.post("/api/hub-messages/:id/read", async (req, res) => {
    const { id } = req.params;
    try {
      await db.execute({
        sql: "UPDATE hub_messages SET is_read = 1 WHERE id = ?",
        args: [id]
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Legacy Clinics Endpoint (keeps compatibility)
  app.get("/api/clinics", async (req, res) => {
    try {
      const result = await rawDb.execute("SELECT * FROM clinics");
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

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM appointments WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Financial
  app.get("/api/financial", async (req, res) => {
    try {
      const result = await db.execute("SELECT f.*, p.name as patient_name FROM financial f LEFT JOIN patients p ON f.patient_id = p.id ORDER BY date DESC LIMIT 500");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/patients/:id/financial", async (req, res) => {
    try {
      const result = await db.execute({
        sql: "SELECT * FROM financial WHERE patient_id = ? ORDER BY date DESC LIMIT 500",
        args: [req.params.id]
      });
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/financial", async (req, res) => {
    const { 
      clinic_id, patient_id, description, amount, type, payment_method, status, date, items,
      category, cost_center, responsible, apportionment, installments, account_card, due_date, competency_date
    } = req.body;
    try {
      const result = await db.execute({
        sql: `INSERT INTO financial (
                clinic_id, patient_id, description, amount, type, payment_method, status, date,
                category, cost_center, responsible, apportionment, installments, account_card, due_date, competency_date
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          clinic_id || 1, 
          patient_id || null, 
          description, 
          amount, 
          type, 
          payment_method, 
          status, 
          date,
          category || 'Outros',
          cost_center || 'Geral',
          responsible || 'MIRIA ROCHELLE APRIGIO DOS SANTOS',
          apportionment ? JSON.stringify(apportionment) : null,
          installments || 'À vista',
          account_card || '',
          due_date || date,
          competency_date || date
        ]
      });

      // Update associated wallet balance if status is 'paid'
      if (status === 'paid' && account_card) {
        try {
          const adj = type === 'income' ? amount : -amount;
          await db.execute({
            sql: "UPDATE wallets SET balance = balance + ? WHERE name = ? OR bank_name = ?",
            args: [adj, account_card, account_card]
          });
        } catch (walletErr) {
          console.error("Failed to auto-update wallet balance:", walletErr);
        }
      }

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
    const { 
      description, amount, type, payment_method, status, date,
      category, cost_center, responsible, apportionment, installments, account_card, due_date, competency_date
    } = req.body;
    try {
      // Find old transaction to adjust wallet balances if status or amount changed
      let oldRecord: any = null;
      try {
        const oldResult = await db.execute({
          sql: "SELECT * FROM financial WHERE id = ?",
          args: [req.params.id]
        });
        if (oldResult.rows.length > 0) {
          oldRecord = oldResult.rows[0];
        }
      } catch (err) {
        console.error("Error fetching old record for update reconciliation:", err);
      }

      await db.execute({
        sql: `UPDATE financial SET 
                description = ?, amount = ?, type = ?, payment_method = ?, status = ?, date = ?,
                category = ?, cost_center = ?, responsible = ?, apportionment = ?, installments = ?, account_card = ?, due_date = ?, competency_date = ?
              WHERE id = ?`,
        args: [
          description, amount, type, payment_method, status, date,
          category || 'Outros',
          cost_center || 'Geral',
          responsible || 'MIRIA ROCHELLE APRIGIO DOS SANTOS',
          apportionment ? JSON.stringify(apportionment) : null,
          installments || 'À vista',
          account_card || '',
          due_date || date,
          competency_date || date,
          req.params.id
        ]
      });

      // Reconcile Wallet balance changes dynamically
      if (oldRecord) {
        try {
          // Revert old transaction effect
          if (oldRecord.status === 'paid' && oldRecord.account_card) {
            const oldAdj = oldRecord.type === 'income' ? -oldRecord.amount : oldRecord.amount;
            await db.execute({
              sql: "UPDATE wallets SET balance = balance + ? WHERE name = ?",
              args: [oldAdj, oldRecord.account_card]
            });
          }
          // Apply new transaction effect
          if (status === 'paid' && account_card) {
            const newAdj = type === 'income' ? amount : -amount;
            await db.execute({
              sql: "UPDATE wallets SET balance = balance + ? WHERE name = ?",
              args: [newAdj, account_card]
            });
          }
        } catch (reconcileErr) {
          console.error("Error adjusting wallet balances on financial update:", reconcileErr);
        }
      }

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/financial/:id", async (req, res) => {
    try {
      // Revert wallet balance if we are deleting a paid transaction
      try {
        const oldResult = await db.execute({
          sql: "SELECT * FROM financial WHERE id = ?",
          args: [req.params.id]
        });
        if (oldResult.rows.length > 0) {
          const oldRecord = oldResult.rows[0];
          if (oldRecord.status === 'paid' && oldRecord.account_card) {
            const oldAdj = oldRecord.type === 'income' ? -oldRecord.amount : oldRecord.amount;
            await db.execute({
              sql: "UPDATE wallets SET balance = balance + ? WHERE name = ?",
              args: [oldAdj, oldRecord.account_card]
            });
          }
        }
      } catch (err) {
        console.error("Error adjusting wallet balance on delete:", err);
      }

      await db.execute({
        sql: "DELETE FROM financial WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  
  app.put("/api/financial/:id/status", async (req, res) => {
    const { status, payment_method, account_card } = req.body;
    try {
      let oldRecord: any = null;
      try {
        const oldResult = await db.execute({
          sql: "SELECT * FROM financial WHERE id = ?",
          args: [req.params.id]
        });
        if (oldResult.rows.length > 0) {
          oldRecord = oldResult.rows[0];
        }
      } catch (err) {}

      await db.execute({
        sql: "UPDATE financial SET status = ?, payment_method = ?, account_card = COALESCE(?, account_card) WHERE id = ?",
        args: [status, payment_method, account_card || null, req.params.id]
      });

      // Update wallet if status updated to paid
      if (oldRecord) {
        const activeCard = account_card || oldRecord.account_card;
        if (oldRecord.status !== 'paid' && status === 'paid' && activeCard) {
          const adj = oldRecord.type === 'income' ? oldRecord.amount : -oldRecord.amount;
          await db.execute({
            sql: "UPDATE wallets SET balance = balance + ? WHERE name = ?",
            args: [adj, activeCard]
          });
        } else if (oldRecord.status === 'paid' && status !== 'paid' && activeCard) {
          // Changed back to pending
          const adj = oldRecord.type === 'income' ? -oldRecord.amount : oldRecord.amount;
          await db.execute({
            sql: "UPDATE wallets SET balance = balance + ? WHERE name = ?",
            args: [adj, activeCard]
          });
        }
      }

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Wallets (Contas e Carteiras) Endpoints
  app.get("/api/wallets", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM wallets ORDER BY name ASC");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/wallets", async (req, res) => {
    const { name, type, balance, bank_name } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO wallets (name, type, balance, bank_name) VALUES (?, ?, ?, ?)",
        args: [name, type, balance || 0, bank_name || name]
      });
      res.json({ id: Number(result.lastInsertRowid), name, type, balance: balance || 0 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/wallets/:id", async (req, res) => {
    const { name, type, balance, bank_name } = req.body;
    try {
      await db.execute({
        sql: "UPDATE wallets SET name = ?, type = ?, balance = ?, bank_name = ? WHERE id = ?",
        args: [name, type, balance, bank_name, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/wallets/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM wallets WHERE id = ?",
        args: [req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Simulation: Reconcile Account (Conciliar)
  app.post("/api/wallets/reconcile", async (req, res) => {
    const { walletId, transactions } = req.body;
    try {
      // In a real flow this matches bank statement transactions with our system records
      // We'll simulate this beautifully on the client, and we can save notes or statuses.
      res.json({ success: true, reconciledCount: transactions?.length || 0 });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Credit Cards Endpoints
  app.get("/api/credit-cards", async (req, res) => {
    try {
      const result = await db.execute("SELECT * FROM credit_cards ORDER BY name ASC");
      res.json(result.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/credit-cards", async (req, res) => {
    const { name, invoice_amount, available_limit } = req.body;
    try {
      const result = await db.execute({
        sql: "INSERT INTO credit_cards (name, invoice_amount, available_limit) VALUES (?, ?, ?)",
        args: [name, invoice_amount || 0, available_limit || 0]
      });
      res.json({ id: Number(result.lastInsertRowid), name, invoice_amount, available_limit });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/credit-cards/:id", async (req, res) => {
    const { name, invoice_amount, available_limit } = req.body;
    try {
      await db.execute({
        sql: "UPDATE credit_cards SET name = ?, invoice_amount = ?, available_limit = ? WHERE id = ?",
        args: [name, invoice_amount, available_limit, req.params.id]
      });
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/credit-cards/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM credit_cards WHERE id = ?",
        args: [req.params.id]
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

  app.delete("/api/portal/notifications/:id", async (req, res) => {
    try {
      await db.execute({
        sql: "DELETE FROM client_notifications WHERE id = ?",
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

  // Manual Trigger for Data Cleanup
  app.post("/api/cleanup/now", async (req, res) => {
    try {
      await runDataCleanup();
      res.json({ success: true, message: "Limpeza de dados realizada com sucesso!" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
