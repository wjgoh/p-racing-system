import http from "http";
import { URL } from "url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const userSchema = {
  hasStatus: false,
  hasCreatedAt: false,
};

async function ensureUserSchema() {
  const dbName = process.env.DB_NAME;
  if (!dbName) return;

  try {
    const [rows] = await db.execute(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [dbName]
    );
    const existing = new Set(
      (rows as any[]).map((row) => String(row.COLUMN_NAME))
    );

    if (existing.has("status")) {
      userSchema.hasStatus = true;
    } else {
      await db.execute(
        "ALTER TABLE users ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'"
      );
      userSchema.hasStatus = true;
    }

    if (existing.has("created_at")) {
      userSchema.hasCreatedAt = true;
    } else {
      await db.execute(
        "ALTER TABLE users ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
      );
      userSchema.hasCreatedAt = true;
    }
  } catch (err) {
    console.error("User schema check failed:", err);
  }
}

void ensureUserSchema();

async function ensureReportSchema() {
  try {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS report_requests (
        request_id INT(11) NOT NULL AUTO_INCREMENT,
        workshop_id INT(11) NOT NULL,
        month INT(11) NOT NULL,
        year INT(11) NOT NULL,
        status ENUM('pending','generated','rejected') NOT NULL DEFAULT 'pending',
        invoice_count INT(11) NOT NULL DEFAULT 0,
        total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        paid_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        generated_at DATETIME DEFAULT NULL,
        PRIMARY KEY (request_id),
        KEY report_requests_workshop_id (workshop_id),
        CONSTRAINT report_requests_ibfk_1
          FOREIGN KEY (workshop_id) REFERENCES workshops (workshop_id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`
    );
  } catch (err) {
    console.error("Report schema check failed:", err);
  }
}

void ensureReportSchema();

function buildUserSelectColumns() {
  const columns = [
    "u.user_id",
    "u.name",
    "u.email",
    "u.role",
    "u.workshop_id",
  ];
  columns.push(userSchema.hasStatus ? "u.status" : "'active' AS status");
  columns.push(
    userSchema.hasCreatedAt ? "u.created_at" : "NULL AS created_at"
  );
  return columns;
}

async function fetchUserRecord(userId: number) {
  const columns = buildUserSelectColumns();
  const [rows] = await db.execute(
    `SELECT ${columns.join(", ")} FROM users u WHERE u.user_id = ? LIMIT 1`,
    [Number(userId)]
  );
  return (rows as any[])[0] ?? null;
}

const SERVICE_INTERVAL_MONTHS = 6;
const SERVICE_INTERVAL_MILES = 5000;

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computeNextServiceDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed);
  next.setMonth(next.getMonth() + SERVICE_INTERVAL_MONTHS);
  return formatDateOnly(next);
}

async function syncInvoiceForJob(jobId: number, createIfMissing: boolean) {
  const [jobRows] = await db.execute(
    "SELECT owner_id, workshop_id FROM jobs WHERE job_id = ? LIMIT 1",
    [Number(jobId)]
  );
  const job = (jobRows as any[])[0];
  if (!job) return;

  const [invoiceRows] = await db.execute(
    "SELECT invoice_id FROM invoices WHERE job_id = ? LIMIT 1",
    [Number(jobId)]
  );
  let invoiceId = (invoiceRows as any[])[0]?.invoice_id as number | undefined;

  if (!invoiceId && !createIfMissing) {
    return;
  }

  const [partsRows] = await db.execute(
    "SELECT name, quantity, unit_cost, total_cost FROM job_parts WHERE job_id = ?",
    [Number(jobId)]
  );

  let subtotal = 0;
  const items = (partsRows as any[]).map((part) => {
    const qty = Number(part.quantity ?? 0);
    const unit = Number(part.unit_cost ?? 0);
    const total = Number(
      part.total_cost ?? Math.round(qty * unit * 100) / 100
    );
    subtotal += total;
    return {
      description: String(part.name),
      quantity: qty,
      unit_price: unit,
      total,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  const tax = 0;
  const totalAmount = subtotal;

  if (!invoiceId) {
    const [invoiceResult] = await db.execute(
      `INSERT INTO invoices
       (job_id, owner_id, workshop_id, subtotal, tax, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        Number(jobId),
        Number(job.owner_id),
        Number(job.workshop_id),
        subtotal,
        tax,
        totalAmount,
      ]
    );
    invoiceId = (invoiceResult as any).insertId as number;
  } else {
    await db.execute(
      "UPDATE invoices SET subtotal = ?, tax = ?, total_amount = ? WHERE invoice_id = ?",
      [subtotal, tax, totalAmount, Number(invoiceId)]
    );
  }

  await db.execute("DELETE FROM invoice_items WHERE invoice_id = ?", [
    Number(invoiceId),
  ]);

  if (items.length > 0) {
    for (const item of items) {
      await db.execute(
        `INSERT INTO invoice_items
         (invoice_id, description, quantity, unit_price, total)
         VALUES (?, ?, ?, ?, ?)`,
        [
          Number(invoiceId),
          item.description,
          item.quantity,
          item.unit_price,
          item.total,
        ]
      );
    }
  }
}

function sendJson(res: http.ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  
// POST /api/register
if (req.method === "POST" && url.pathname === "/api/register") {
  const body = await readBody(req);
  const { name, email, password, role, vehicles, workshop, workshopId } = body;

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: "name, email, password required" });
  }

  // default role OWNER
  const userRole = (role ?? "OWNER") as string;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    let workshopIdForUser: number | null = null;

    if (userRole === "WORKSHOP") {
      const workshopName = String(workshop?.name ?? "").trim();
      if (!workshopName) {
        return sendJson(res, 400, { error: "workshop name required" });
      }

      const [workshopResult] = await db.execute(
        `INSERT INTO workshops (name, email, phone, address)
         VALUES (?, ?, ?, ?)`,
        [
          workshopName,
          workshop?.email ?? email ?? null,
          workshop?.phone ?? null,
          workshop?.address ?? null,
        ]
      );

      workshopIdForUser = (workshopResult as any).insertId as number;
    } else if (userRole === "MECHANIC" && workshopId) {
      const parsedWorkshopId = Number(workshopId);
      if (!Number.isNaN(parsedWorkshopId)) {
        workshopIdForUser = parsedWorkshopId;
      }
    }

    // 1) create user
    const [result] = await db.execute(
    `INSERT INTO users (name, email, password_hash, role, workshop_id)
    VALUES (?, ?, ?, ?, ?)`,
    [name, email, passwordHash, userRole, workshopIdForUser]
    );

    const userId = (result as any).insertId as number;
    let ownerId: number | null = null;

    // 2) If OWNER, create vehicle_owners row
    if (userRole === "OWNER") {
      const [ownerResult] = await db.execute(
        `INSERT INTO vehicle_owners (user_id, phone) VALUES (?, ?)`,
        [userId, null]
      );
      ownerId = (ownerResult as any).insertId as number;
    }

    // 3) OPTIONAL: insert vehicles if you have a vehicles table
    // If you DON'T have vehicles table yet, skip this whole block.
    if (userRole === "OWNER" && ownerId && Array.isArray(vehicles) && vehicles.length > 0) {
      for (const v of vehicles) {
        // adjust column names to your vehicles table schema
        await db.execute(
          `INSERT INTO vehicles (owner_id, plate_number, make, model, year, color)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [ownerId, v.plateNumber, v.make, v.model, v.year, v.color]
        );
      }
    }

    return sendJson(res, 201, { user_id: userId, owner_id: ownerId, workshop_id: workshopIdForUser });
  } catch (err: any) {
    // duplicate email
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return sendJson(res, 409, { error: "Email already exists" });
    }
    console.error(err);
    return sendJson(res, 500, { error: "Server error" });
  }
}
  // GET /api/workshops
  if (req.method === "GET" && url.pathname === "/api/workshops") {
    try {
      const [rows] = await db.execute(
        "SELECT workshop_id, name FROM workshops ORDER BY name"
      );
      return sendJson(res, 200, { workshops: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/login
  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJson(res, 400, { error: "email and password required" });
    }

    // IMPORTANT: adjust column names if your table differs
    const statusColumn = userSchema.hasStatus ? ", u.status" : "";
    const [rows] = await db.execute(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, u.workshop_id${statusColumn},
              vo.owner_id
       FROM users u
       LEFT JOIN vehicle_owners vo ON vo.user_id = u.user_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    const user = (rows as any[])[0];
    if (!user) return sendJson(res, 401, { error: "Invalid credentials" });

    if (userSchema.hasStatus && String(user.status) === "inactive") {
      return sendJson(res, 403, { error: "Account is banned" });
    }

    // ASSIGNMENT MODE: plain password compare
    const verify = await bcrypt.compare(password, user.password_hash);
    if (!verify) 
        return sendJson(res, 401, { error: "Invalid credentials" });

    return sendJson(res, 200, {
      user: {
        user_id: user.user_id,
        owner_id: user.owner_id ?? null,
        name: user.name,
        email: user.email,
        role: user.role,
        workshop_id: user.workshop_id ?? null,
      },
    });
  }

  // GET /api/owner/profile?ownerId=1
  if (req.method === "GET" && url.pathname === "/api/owner/profile") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT vo.owner_id, u.user_id, u.name, u.email, vo.phone
         FROM vehicle_owners vo
         LEFT JOIN users u ON u.user_id = vo.user_id
         WHERE vo.owner_id = ? LIMIT 1`,
        [Number(ownerId)]
      );
      const profile = (rows as any[])[0];
      if (!profile) {
        return sendJson(res, 404, { error: "Owner not found" });
      }
      return sendJson(res, 200, { profile });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/owner/profile
  if (req.method === "POST" && url.pathname === "/api/owner/profile") {
    const body = await readBody(req);
    const { ownerId, name, email, phone, oldPassword, newPassword } = body;

    if (!ownerId || !name) {
      return sendJson(res, 400, { error: "ownerId and name required" });
    }

    const cleanedName = String(name).trim();
    const cleanedEmail =
      typeof email === "string" && email.trim() ? email.trim() : null;
    const cleanedPhone =
      typeof phone === "string" && phone.trim() ? phone.trim() : null;
    const cleanedOldPassword =
      typeof oldPassword === "string" && oldPassword.trim()
        ? oldPassword.trim()
        : null;
    const cleanedPassword =
      typeof newPassword === "string" && newPassword.trim()
        ? newPassword.trim()
        : null;

    if (!cleanedName) {
      return sendJson(res, 400, { error: "name required" });
    }

    if ((cleanedOldPassword && !cleanedPassword) || (!cleanedOldPassword && cleanedPassword)) {
      return sendJson(res, 400, {
        error: "oldPassword and newPassword are required to change password",
      });
    }

    try {
      const [ownerRows] = await db.execute(
        `SELECT vo.owner_id, vo.user_id, u.email, u.password_hash
         FROM vehicle_owners vo
         LEFT JOIN users u ON u.user_id = vo.user_id
         WHERE vo.owner_id = ? LIMIT 1`,
        [Number(ownerId)]
      );
      const owner = (ownerRows as any[])[0];
      if (!owner) {
        return sendJson(res, 404, { error: "Owner not found" });
      }

      if (cleanedEmail && String(owner.email) !== String(cleanedEmail)) {
        return sendJson(res, 400, { error: "Email cannot be changed" });
      }

      await db.execute(
        "UPDATE users SET name = ? WHERE user_id = ?",
        [cleanedName, Number(owner.user_id)]
      );

      if (cleanedPassword) {
        if (!cleanedOldPassword) {
          return sendJson(res, 400, { error: "oldPassword required" });
        }
        const isValid = await bcrypt.compare(
          cleanedOldPassword,
          String(owner.password_hash ?? "")
        );
        if (!isValid) {
          return sendJson(res, 403, { error: "Old password is incorrect" });
        }
        if (cleanedPassword.length < 6) {
          return sendJson(res, 400, {
            error: "New password must be at least 6 characters",
          });
        }
        const passwordHash = await bcrypt.hash(cleanedPassword, 10);
        await db.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [
          passwordHash,
          Number(owner.user_id),
        ]);
      }

      await db.execute(
        "UPDATE vehicle_owners SET phone = ? WHERE owner_id = ?",
        [cleanedPhone, Number(ownerId)]
      );

      const [rows] = await db.execute(
        `SELECT vo.owner_id, u.user_id, u.name, u.email, vo.phone
         FROM vehicle_owners vo
         LEFT JOIN users u ON u.user_id = vo.user_id
         WHERE vo.owner_id = ? LIMIT 1`,
        [Number(ownerId)]
      );

      return sendJson(res, 200, { profile: (rows as any[])[0] });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/admin/users
  if (req.method === "GET" && url.pathname === "/api/admin/users") {
    try {
      const columns = buildUserSelectColumns();
      const orderBy = userSchema.hasCreatedAt
        ? "u.created_at DESC, u.user_id DESC"
        : "u.user_id DESC";
      const [rows] = await db.execute(
        `SELECT ${columns.join(", ")} FROM users u ORDER BY ${orderBy}`
      );
      return sendJson(res, 200, { users: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/users
  if (req.method === "POST" && url.pathname === "/api/admin/users") {
    const body = await readBody(req);
    const { name, email, password, role, status, workshopId } = body;

    if (!name || !email || !password || !role) {
      return sendJson(res, 400, {
        error: "name, email, password, role required",
      });
    }

    const normalizedRole = String(role).toUpperCase();
    const allowedRoles = new Set(["ADMIN", "WORKSHOP", "MECHANIC", "OWNER"]);
    if (!allowedRoles.has(normalizedRole)) {
      return sendJson(res, 400, { error: "invalid role" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    try {
      let workshopIdForUser: number | null = null;

      if (normalizedRole === "WORKSHOP") {
        const workshopName = String(body.workshopName ?? name ?? "").trim();
        if (!workshopName) {
          return sendJson(res, 400, { error: "workshop name required" });
        }

        const [workshopResult] = await db.execute(
          `INSERT INTO workshops (name, email, phone, address)
           VALUES (?, ?, ?, ?)`,
          [workshopName, email ?? null, null, null]
        );

        workshopIdForUser = (workshopResult as any).insertId as number;
      } else if (normalizedRole === "MECHANIC" && workshopId) {
        const parsedWorkshopId = Number(workshopId);
        if (!Number.isNaN(parsedWorkshopId)) {
          workshopIdForUser = parsedWorkshopId;
        }
      }

      const columns = ["name", "email", "password_hash", "role", "workshop_id"];
      const values: Array<string | number | null> = [
        String(name),
        String(email),
        passwordHash,
        normalizedRole,
        workshopIdForUser,
      ];

      if (userSchema.hasStatus) {
        columns.push("status");
        values.push(status === "inactive" ? "inactive" : "active");
      }

      const placeholders = columns.map(() => "?").join(", ");
      const [result] = await db.execute(
        `INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );

      const userId = (result as any).insertId as number;
      let ownerId: number | null = null;

      if (normalizedRole === "OWNER") {
        const [ownerResult] = await db.execute(
          `INSERT INTO vehicle_owners (user_id, phone) VALUES (?, ?)`,
          [userId, null]
        );
        ownerId = (ownerResult as any).insertId as number;
      }

      const userRecord = await fetchUserRecord(userId);
      return sendJson(res, 201, {
        user: userRecord,
        owner_id: ownerId,
        workshop_id: workshopIdForUser,
      });
    } catch (err: any) {
      if (String(err?.code) === "ER_DUP_ENTRY") {
        return sendJson(res, 409, { error: "Email already exists" });
      }
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/users/update
  if (req.method === "POST" && url.pathname === "/api/admin/users/update") {
    const body = await readBody(req);
    const { userId, status, name, email, role, password, workshopId } = body;

    if (!userId) {
      return sendJson(res, 400, { error: "userId required" });
    }

    try {
      if (
        name !== undefined ||
        email !== undefined ||
        role !== undefined ||
        password !== undefined ||
        workshopId !== undefined
      ) {
        return sendJson(res, 400, {
          error: "Only status updates are allowed",
        });
      }

      if (!userSchema.hasStatus) {
        return sendJson(res, 400, { error: "Status updates not supported" });
      }

      if (status === undefined) {
        return sendJson(res, 400, { error: "status required" });
      }

      const normalizedStatus = status === "inactive" ? "inactive" : "active";
      await db.execute("UPDATE users SET status = ? WHERE user_id = ?", [
        normalizedStatus,
        Number(userId),
      ]);

      const userRecord = await fetchUserRecord(Number(userId));
      if (!userRecord) {
        return sendJson(res, 404, { error: "User not found" });
      }

      return sendJson(res, 200, { user: userRecord });
    } catch (err: any) {
      if (String(err?.code) === "ER_DUP_ENTRY") {
        return sendJson(res, 409, { error: "Email already exists" });
      }
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/users/delete
  if (req.method === "POST" && url.pathname === "/api/admin/users/delete") {
    const body = await readBody(req);
    const { userId } = body;

    if (!userId) {
      return sendJson(res, 400, { error: "userId required" });
    }

    try {
      if (userSchema.hasStatus) {
        await db.execute("UPDATE users SET status = 'inactive' WHERE user_id = ?", [
          Number(userId),
        ]);
        return sendJson(res, 200, { ok: true, status: "inactive" });
      }

      await db.execute("DELETE FROM users WHERE user_id = ?", [Number(userId)]);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/reports/request
  if (req.method === "POST" && url.pathname === "/api/reports/request") {
    const body = await readBody(req);
    const { workshopId, month, year } = body;

    const parsedWorkshopId = Number(workshopId);
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (
      Number.isNaN(parsedWorkshopId) ||
      Number.isNaN(parsedMonth) ||
      Number.isNaN(parsedYear)
    ) {
      return sendJson(res, 400, { error: "workshopId, month, year required" });
    }

    if (parsedMonth < 1 || parsedMonth > 12) {
      return sendJson(res, 400, { error: "month must be 1-12" });
    }

    try {
      const [existingRows] = await db.execute(
        `SELECT r.*, w.name AS workshop_name
         FROM report_requests r
         LEFT JOIN workshops w ON w.workshop_id = r.workshop_id
         WHERE r.workshop_id = ? AND r.month = ? AND r.year = ?
         ORDER BY r.created_at DESC
         LIMIT 1`,
        [parsedWorkshopId, parsedMonth, parsedYear]
      );

      const existing = (existingRows as any[])[0];
      if (existing) {
        return sendJson(res, 200, { request: existing, existed: true });
      }

      const [result] = await db.execute(
        `INSERT INTO report_requests (workshop_id, month, year, status)
         VALUES (?, ?, ?, 'pending')`,
        [parsedWorkshopId, parsedMonth, parsedYear]
      );

      const requestId = (result as any).insertId as number;
      const [rows] = await db.execute(
        `SELECT r.*, w.name AS workshop_name
         FROM report_requests r
         LEFT JOIN workshops w ON w.workshop_id = r.workshop_id
         WHERE r.request_id = ? LIMIT 1`,
        [Number(requestId)]
      );

      return sendJson(res, 201, { request: (rows as any[])[0] });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/reports/requests?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/reports/requests") {
    const workshopId = url.searchParams.get("workshopId");
    if (!workshopId) {
      return sendJson(res, 400, { error: "workshopId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT r.*, w.name AS workshop_name
         FROM report_requests r
         LEFT JOIN workshops w ON w.workshop_id = r.workshop_id
         WHERE r.workshop_id = ?
         ORDER BY r.created_at DESC`,
        [Number(workshopId)]
      );
      return sendJson(res, 200, { requests: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/admin/report-requests
  if (req.method === "GET" && url.pathname === "/api/admin/report-requests") {
    const status = url.searchParams.get("status");
    const allowedStatuses = new Set(["pending", "generated", "rejected"]);
    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (status) {
      if (!allowedStatuses.has(String(status))) {
        return sendJson(res, 400, { error: "invalid status" });
      }
      conditions.push("r.status = ?");
      params.push(String(status));
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    try {
      const [rows] = await db.execute(
        `SELECT r.*, w.name AS workshop_name
         FROM report_requests r
         LEFT JOIN workshops w ON w.workshop_id = r.workshop_id
         ${whereClause}
         ORDER BY r.created_at DESC`,
        params
      );
      return sendJson(res, 200, { requests: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/report-requests/generate
  if (
    req.method === "POST" &&
    url.pathname === "/api/admin/report-requests/generate"
  ) {
    const body = await readBody(req);
    const { requestId } = body;

    if (!requestId) {
      return sendJson(res, 400, { error: "requestId required" });
    }

    try {
      const [requestRows] = await db.execute(
        `SELECT request_id, workshop_id, month, year
         FROM report_requests
         WHERE request_id = ? LIMIT 1`,
        [Number(requestId)]
      );
      const request = (requestRows as any[])[0];
      if (!request) {
        return sendJson(res, 404, { error: "Request not found" });
      }

      const [summaryRows] = await db.execute(
        `SELECT
           COUNT(*) AS invoice_count,
           COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN total_amount ELSE 0 END), 0) AS total_revenue,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid_revenue
         FROM invoices
         WHERE workshop_id = ?
           AND YEAR(created_at) = ?
           AND MONTH(created_at) = ?`,
        [Number(request.workshop_id), Number(request.year), Number(request.month)]
      );

      const summary = (summaryRows as any[])[0] ?? {};
      const invoiceCount = Number(summary.invoice_count ?? 0);
      const totalRevenue = Number(summary.total_revenue ?? 0);
      const paidRevenue = Number(summary.paid_revenue ?? 0);

      await db.execute(
        `UPDATE report_requests
         SET status = 'generated',
             invoice_count = ?,
             total_revenue = ?,
             paid_revenue = ?,
             generated_at = NOW()
         WHERE request_id = ?`,
        [invoiceCount, totalRevenue, paidRevenue, Number(requestId)]
      );

      const [rows] = await db.execute(
        `SELECT r.*, w.name AS workshop_name
         FROM report_requests r
         LEFT JOIN workshops w ON w.workshop_id = r.workshop_id
         WHERE r.request_id = ? LIMIT 1`,
        [Number(requestId)]
      );

      return sendJson(res, 200, { request: (rows as any[])[0] });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/admin/reports/yearly?workshopId=5&year=2026
  if (req.method === "GET" && url.pathname === "/api/admin/reports/yearly") {
    const workshopId = url.searchParams.get("workshopId");
    const year = url.searchParams.get("year");

    if (!workshopId || !year) {
      return sendJson(res, 400, { error: "workshopId and year required" });
    }

    const parsedWorkshopId = Number(workshopId);
    const parsedYear = Number(year);
    if (Number.isNaN(parsedWorkshopId) || Number.isNaN(parsedYear)) {
      return sendJson(res, 400, { error: "Invalid workshopId or year" });
    }

    try {
      const [workshopRows] = await db.execute(
        "SELECT name FROM workshops WHERE workshop_id = ? LIMIT 1",
        [parsedWorkshopId]
      );
      const workshopName = (workshopRows as any[])[0]?.name ?? null;

      const [rows] = await db.execute(
        `SELECT
           MONTH(created_at) AS month,
           COUNT(*) AS invoice_count,
           COALESCE(SUM(CASE WHEN status IN ('approved','paid') THEN total_amount ELSE 0 END), 0) AS total_revenue,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) AS paid_revenue
         FROM invoices
         WHERE workshop_id = ?
           AND YEAR(created_at) = ?
         GROUP BY MONTH(created_at)
         ORDER BY MONTH(created_at)`,
        [parsedWorkshopId, parsedYear]
      );

      const byMonth = new Map<number, any>();
      for (const row of rows as any[]) {
        byMonth.set(Number(row.month), {
          month: Number(row.month),
          invoice_count: Number(row.invoice_count ?? 0),
          total_revenue: Number(row.total_revenue ?? 0),
          paid_revenue: Number(row.paid_revenue ?? 0),
        });
      }

      const months: Array<{
        month: number;
        invoice_count: number;
        total_revenue: number;
        paid_revenue: number;
      }> = [];

      for (let m = 1; m <= 12; m += 1) {
        months.push(
          byMonth.get(m) ?? {
            month: m,
            invoice_count: 0,
            total_revenue: 0,
            paid_revenue: 0,
          }
        );
      }

      return sendJson(res, 200, {
        workshop_id: parsedWorkshopId,
        workshop_name: workshopName,
        year: parsedYear,
        months,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/vehicles?ownerId=123 (ownerId = vehicle_owners.owner_id)
  if (req.method === "GET" && url.pathname === "/api/vehicles") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }
    try {
      const [rows] = await db.execute(
        `SELECT vehicle_id, owner_id, plate_number, make, model, year, color,
                last_service_date, next_service_date, last_service_mileage, next_service_mileage
         FROM vehicles
         WHERE owner_id = ?
         ORDER BY vehicle_id DESC`,
        [Number(ownerId)]
      );
      return sendJson(res, 200, { vehicles: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/vehicles
  if (req.method === "POST" && url.pathname === "/api/vehicles") {
    const body = await readBody(req);
    const {
      ownerId,
      plateNumber,
      make,
      model,
      year,
      color,
      lastServiceDate,
      nextServiceDate,
      lastServiceMileage,
      nextServiceMileage,
    } = body;

    if (!ownerId || !plateNumber) {
      return sendJson(res, 400, { error: "ownerId and plateNumber required" });
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO vehicles
         (owner_id, plate_number, make, model, year, color,
          last_service_date, next_service_date, last_service_mileage, next_service_mileage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(ownerId),
          plateNumber,
          make ?? null,
          model ?? null,
          year ?? null,
          color ?? null,
          lastServiceDate ?? null,
          nextServiceDate ?? null,
          lastServiceMileage ?? null,
          nextServiceMileage ?? null,
        ]
      );
      const vehicleId = (result as any).insertId as number;
      return sendJson(res, 201, { vehicle_id: vehicleId });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/vehicles/service
  if (req.method === "POST" && url.pathname === "/api/vehicles/service") {
    const body = await readBody(req);
    const { vehicleId, ownerId, lastServiceDate, lastServiceMileage } = body;

    if (!vehicleId) {
      return sendJson(res, 400, { error: "vehicleId required" });
    }

    const lastMileageProvided = lastServiceMileage !== undefined;
    const lastDateProvided = lastServiceDate !== undefined;
    if (!lastMileageProvided && !lastDateProvided) {
      return sendJson(res, 400, {
        error: "lastServiceDate or lastServiceMileage required",
      });
    }

    try {
      const [rows] = await db.execute(
        `SELECT owner_id, last_service_date, last_service_mileage
         FROM vehicles
         WHERE vehicle_id = ? LIMIT 1`,
        [Number(vehicleId)]
      );
      const vehicle = (rows as any[])[0];
      if (!vehicle) {
        return sendJson(res, 404, { error: "Vehicle not found" });
      }
      if (ownerId && Number(ownerId) !== Number(vehicle.owner_id)) {
        return sendJson(res, 403, { error: "Owner mismatch" });
      }

      const updatedLastDate =
        lastServiceDate !== undefined
          ? (lastServiceDate ? String(lastServiceDate) : null)
          : (vehicle.last_service_date as string | null);

      let updatedLastMileage: number | null =
        lastServiceMileage !== undefined ? Number(lastServiceMileage) : null;
      if (lastServiceMileage !== undefined) {
        if (Number.isNaN(updatedLastMileage)) {
          return sendJson(res, 400, { error: "lastServiceMileage must be a number" });
        }
      } else {
        updatedLastMileage =
          vehicle.last_service_mileage !== undefined
            ? Number(vehicle.last_service_mileage)
            : null;
        if (Number.isNaN(updatedLastMileage)) updatedLastMileage = null;
      }

      const nextServiceDate = updatedLastDate
        ? computeNextServiceDate(updatedLastDate)
        : null;
      const nextServiceMileage =
        updatedLastMileage !== null
          ? updatedLastMileage + SERVICE_INTERVAL_MILES
          : null;

      await db.execute(
        `UPDATE vehicles
         SET last_service_date = ?,
             last_service_mileage = ?,
             next_service_date = ?,
             next_service_mileage = ?
         WHERE vehicle_id = ?`,
        [
          updatedLastDate,
          updatedLastMileage,
          nextServiceDate,
          nextServiceMileage,
          Number(vehicleId),
        ]
      );

      return sendJson(res, 200, {
        ok: true,
        next_service_date: nextServiceDate,
        next_service_mileage: nextServiceMileage,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/vehicles/history?vehicleId=123&ownerId=1
  if (req.method === "GET" && url.pathname === "/api/vehicles/history") {
    const vehicleId = url.searchParams.get("vehicleId");
    const ownerId = url.searchParams.get("ownerId");
    if (!vehicleId) {
      return sendJson(res, 400, { error: "vehicleId required" });
    }

    try {
      const [vehicleRows] = await db.execute(
        "SELECT owner_id FROM vehicles WHERE vehicle_id = ? LIMIT 1",
        [Number(vehicleId)]
      );
      const vehicle = (vehicleRows as any[])[0];
      if (!vehicle) {
        return sendJson(res, 404, { error: "Vehicle not found" });
      }
      if (ownerId && Number(ownerId) !== Number(vehicle.owner_id)) {
        return sendJson(res, 403, { error: "Owner mismatch" });
      }

      const [rows] = await db.execute(
        `SELECT j.job_id, j.service_type, j.description,
                j.updated_at AS completed_at,
                j.scheduled_date,
                mech.name AS mechanic_name,
                MAX(mr.performed_at) AS performed_at,
                SUM(mr.cost) AS total_cost
         FROM jobs j
         LEFT JOIN maintenance_records mr ON mr.job_id = j.job_id
         LEFT JOIN users mech ON mech.user_id = j.assigned_mechanic_id
         WHERE j.vehicle_id = ? AND j.status = 'completed'
         GROUP BY j.job_id, j.service_type, j.description, j.updated_at, j.scheduled_date, mech.name
         ORDER BY j.updated_at DESC`,
        [Number(vehicleId)]
      );

      return sendJson(res, 200, { history: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/bookings?ownerId=123 or /api/bookings?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/bookings") {
    const ownerId = url.searchParams.get("ownerId");
    const workshopId = url.searchParams.get("workshopId");
    const status = url.searchParams.get("status");

    if (!ownerId && !workshopId) {
      return sendJson(res, 400, { error: "ownerId or workshopId required" });
    }

    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (ownerId) {
      conditions.push("b.owner_id = ?");
      params.push(Number(ownerId));
    }
    if (workshopId) {
      conditions.push("b.workshop_id = ?");
      params.push(Number(workshopId));
    }
    if (status) {
      conditions.push("b.status = ?");
      params.push(status);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const [rows] = await db.execute(
        `SELECT b.booking_id, b.owner_id, b.workshop_id, b.vehicle_id,
                b.customer_name, b.customer_email, b.customer_phone,
                b.service_type, b.preferred_date, b.preferred_time,
                b.description, b.status, b.created_at,
                v.make, v.model, v.plate_number, v.year, v.color
         FROM service_bookings b
         LEFT JOIN vehicles v ON b.vehicle_id = v.vehicle_id
         ${whereClause}
         ORDER BY b.created_at DESC`,
        params
      );
      return sendJson(res, 200, { bookings: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/bookings
  if (req.method === "POST" && url.pathname === "/api/bookings") {
    const body = await readBody(req);
    const {
      ownerId,
      workshopId,
      vehicleId,
      customerName,
      customerEmail,
      customerPhone,
      serviceType,
      preferredDate,
      preferredTime,
      description,
    } = body;

    if (!ownerId || !workshopId || !serviceType || !preferredDate || !preferredTime) {
      return sendJson(res, 400, { error: "ownerId, workshopId, serviceType, preferredDate, preferredTime required" });
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO service_bookings
          (owner_id, workshop_id, vehicle_id, customer_name, customer_email, customer_phone,
           service_type, preferred_date, preferred_time, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          Number(ownerId),
          Number(workshopId),
          vehicleId ? Number(vehicleId) : null,
          customerName ?? null,
          customerEmail ?? null,
          customerPhone ?? null,
          serviceType,
          preferredDate,
          preferredTime,
          description ?? null,
        ]
      );

      const bookingId = (result as any).insertId as number;
      return sendJson(res, 201, { booking_id: bookingId });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/bookings/status
  if (req.method === "POST" && url.pathname === "/api/bookings/status") {
    const body = await readBody(req);
    const { bookingId, status } = body;

    const allowed = new Set(["pending", "confirmed", "rejected", "in-progress", "completed"]);
    if (!bookingId || !status || !allowed.has(String(status))) {
      return sendJson(res, 400, { error: "bookingId and valid status required" });
    }

    try {
      await db.execute(
        "UPDATE service_bookings SET status = ? WHERE booking_id = ?",
        [status, Number(bookingId)]
      );

      if (String(status) === "confirmed") {
        const [existing] = await db.execute(
          "SELECT job_id FROM jobs WHERE booking_id = ? LIMIT 1",
          [Number(bookingId)]
        );
        const already = (existing as any[])[0];
        if (!already) {
          const [rows] = await db.execute(
            `SELECT owner_id, workshop_id, vehicle_id, service_type, description, preferred_date
             FROM service_bookings
             WHERE booking_id = ? LIMIT 1`,
            [Number(bookingId)]
          );
          const booking = (rows as any[])[0];
          if (booking) {
            await db.execute(
              `INSERT INTO jobs
               (booking_id, owner_id, vehicle_id, workshop_id, service_type, description, priority, status, scheduled_date)
               VALUES (?, ?, ?, ?, ?, ?, 'medium', 'unassigned', ?)`,
              [
                Number(bookingId),
                booking.owner_id,
                booking.vehicle_id,
                booking.workshop_id,
                booking.service_type,
                booking.description ?? null,
                booking.preferred_date ?? null,
              ]
            );
          }
        }
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/ratings?ownerId=123
  if (req.method === "GET" && url.pathname === "/api/ratings") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT sr.rating_id, sr.booking_id, sr.owner_id, sr.workshop_id, sr.mechanic_id,
                sr.rating, sr.comment, sr.response, sr.created_at, sr.responded_at,
                COALESCE(j.service_type, b.service_type) AS service_type,
                b.preferred_date, j.scheduled_date, j.updated_at AS completed_at,
                v.make, v.model, v.year, v.plate_number
         FROM service_ratings sr
         LEFT JOIN service_bookings b ON b.booking_id = sr.booking_id
         LEFT JOIN jobs j ON j.booking_id = sr.booking_id
         LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         WHERE sr.owner_id = ? AND sr.deleted_at IS NULL
         ORDER BY sr.created_at DESC`,
        [Number(ownerId)]
      );
      return sendJson(res, 200, { ratings: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/ratings/pending?ownerId=123
  if (req.method === "GET" && url.pathname === "/api/ratings/pending") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT j.job_id, j.booking_id, j.owner_id, j.workshop_id,
                j.assigned_mechanic_id,
                COALESCE(j.service_type, b.service_type) AS service_type,
                b.preferred_date, j.scheduled_date, j.updated_at AS completed_at,
                v.make, v.model, v.year, v.plate_number
         FROM jobs j
         LEFT JOIN service_bookings b ON b.booking_id = j.booking_id
         LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         LEFT JOIN service_ratings sr
           ON sr.booking_id = j.booking_id AND sr.deleted_at IS NULL
         WHERE j.owner_id = ?
           AND j.status = 'completed'
           AND j.booking_id IS NOT NULL
           AND sr.rating_id IS NULL
         ORDER BY j.updated_at DESC`,
        [Number(ownerId)]
      );
      return sendJson(res, 200, { pending: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/ratings
  if (req.method === "POST" && url.pathname === "/api/ratings") {
    const body = await readBody(req);
    const { bookingId, ownerId, rating, comment } = body;

    const numericRating = Number(rating);
    if (
      !bookingId ||
      !ownerId ||
      Number.isNaN(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return sendJson(res, 400, {
        error: "bookingId, ownerId, and rating (1-5) required",
      });
    }

    try {
      const [bookingRows] = await db.execute(
        "SELECT booking_id, owner_id, workshop_id FROM service_bookings WHERE booking_id = ? LIMIT 1",
        [Number(bookingId)]
      );
      const booking = (bookingRows as any[])[0];
      if (!booking) {
        return sendJson(res, 404, { error: "Booking not found" });
      }
      if (Number(booking.owner_id) !== Number(ownerId)) {
        return sendJson(res, 403, { error: "Owner mismatch" });
      }

      const [existing] = await db.execute(
        "SELECT rating_id FROM service_ratings WHERE booking_id = ? AND deleted_at IS NULL LIMIT 1",
        [Number(bookingId)]
      );
      if ((existing as any[])[0]) {
        return sendJson(res, 409, { error: "Review already submitted" });
      }

      const [jobRows] = await db.execute(
        "SELECT assigned_mechanic_id FROM jobs WHERE booking_id = ? LIMIT 1",
        [Number(bookingId)]
      );
      const mechanicId = (jobRows as any[])[0]?.assigned_mechanic_id ?? null;
      const cleanedComment =
        typeof comment === "string" && comment.trim() ? comment.trim() : null;

      const [result] = await db.execute(
        `INSERT INTO service_ratings
         (booking_id, owner_id, workshop_id, mechanic_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Number(bookingId),
          Number(booking.owner_id),
          Number(booking.workshop_id),
          mechanicId,
          numericRating,
          cleanedComment,
        ]
      );

      return sendJson(res, 201, { rating_id: (result as any).insertId });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/admin/ratings
  if (req.method === "GET" && url.pathname === "/api/admin/ratings") {
    try {
      const [rows] = await db.execute(
        `SELECT sr.rating_id, sr.booking_id, sr.owner_id, sr.workshop_id, sr.mechanic_id,
                sr.rating, sr.comment, sr.response, sr.created_at, sr.responded_at,
                CASE
                  WHEN sr.response IS NOT NULL AND sr.response <> '' THEN 'resolved'
                  WHEN sr.responded_at IS NOT NULL THEN 'reviewed'
                  ELSE 'new'
                END AS status,
                COALESCE(j.service_type, b.service_type) AS service_type,
                b.preferred_date, j.scheduled_date, j.updated_at AS completed_at,
                v.make, v.model, v.year, v.plate_number,
                COALESCE(owner.name, b.customer_name, 'Customer') AS customer_name,
                mech.name AS mechanic_name,
                w.name AS workshop_name
         FROM service_ratings sr
         LEFT JOIN service_bookings b ON b.booking_id = sr.booking_id
         LEFT JOIN jobs j ON j.booking_id = sr.booking_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = sr.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = sr.mechanic_id
         LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         LEFT JOIN workshops w ON w.workshop_id = sr.workshop_id
         WHERE sr.deleted_at IS NULL
         ORDER BY sr.created_at DESC`
      );
      return sendJson(res, 200, { ratings: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/ratings/update
  if (req.method === "POST" && url.pathname === "/api/admin/ratings/update") {
    const body = await readBody(req);
    const { ratingId, rating, comment, response, status } = body;

    if (!ratingId) {
      return sendJson(res, 400, { error: "ratingId required" });
    }

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return sendJson(res, 400, { error: "rating must be 1-5" });
      }
      updates.push("rating = ?");
      params.push(numericRating);
    }

    if (comment !== undefined) {
      const cleanedComment =
        typeof comment === "string" && comment.trim() ? comment.trim() : null;
      updates.push("comment = ?");
      params.push(cleanedComment);
    }

    const statusValue = typeof status === "string" ? status : undefined;
    const allowedStatus = new Set(["new", "reviewed", "resolved"]);
    if (statusValue && !allowedStatus.has(statusValue)) {
      return sendJson(res, 400, { error: "status must be new, reviewed, or resolved" });
    }

    if (statusValue === "new") {
      updates.push("responded_at = NULL");
      updates.push("response = NULL");
    }

    if (statusValue === "reviewed") {
      updates.push("responded_at = NOW()");
      updates.push("response = NULL");
    }

    if (statusValue === "resolved") {
      updates.push("responded_at = NOW()");
    }

    const responseProvided = Object.prototype.hasOwnProperty.call(body, "response");
    if (responseProvided && statusValue !== "new" && statusValue !== "reviewed") {
      const cleanedResponse =
        typeof response === "string" && response.trim() ? response.trim() : null;
      updates.push("response = ?");
      params.push(cleanedResponse);
      if (cleanedResponse) {
        updates.push("responded_at = NOW()");
      }
    }

    if (updates.length === 0) {
      return sendJson(res, 400, { error: "No updates provided" });
    }

    try {
      params.push(Number(ratingId));
      await db.execute(
        `UPDATE service_ratings SET ${updates.join(", ")} WHERE rating_id = ?`,
        params
      );
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/ratings/delete
  if (req.method === "POST" && url.pathname === "/api/admin/ratings/delete") {
    const body = await readBody(req);
    const { ratingId } = body;
    if (!ratingId) {
      return sendJson(res, 400, { error: "ratingId required" });
    }

    try {
      await db.execute(
        "UPDATE service_ratings SET deleted_at = NOW() WHERE rating_id = ?",
        [Number(ratingId)]
      );
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/workshop/ratings?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/workshop/ratings") {
    const workshopId = url.searchParams.get("workshopId");
    if (!workshopId) {
      return sendJson(res, 400, { error: "workshopId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT sr.rating_id, sr.booking_id, sr.owner_id, sr.workshop_id, sr.mechanic_id,
                sr.rating, sr.comment, sr.response, sr.created_at, sr.responded_at,
                COALESCE(j.service_type, b.service_type) AS service_type,
                b.preferred_date, j.scheduled_date, j.updated_at AS completed_at,
                v.make, v.model, v.year, v.plate_number,
                COALESCE(owner.name, b.customer_name, 'Customer') AS customer_name,
                mech.name AS mechanic_name,
                w.name AS workshop_name
         FROM service_ratings sr
         LEFT JOIN service_bookings b ON b.booking_id = sr.booking_id
         LEFT JOIN jobs j ON j.booking_id = sr.booking_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = sr.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = sr.mechanic_id
         LEFT JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         LEFT JOIN workshops w ON w.workshop_id = sr.workshop_id
         WHERE sr.workshop_id = ? AND sr.deleted_at IS NULL
         ORDER BY sr.created_at DESC`,
        [Number(workshopId)]
      );
      return sendJson(res, 200, { ratings: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/workshop/ratings/response
  if (req.method === "POST" && url.pathname === "/api/workshop/ratings/response") {
    const body = await readBody(req);
    const { ratingId, workshopId, response, status } = body;

    if (!ratingId || !workshopId) {
      return sendJson(res, 400, { error: "ratingId and workshopId required" });
    }

    const allowedStatus = new Set(["new", "reviewed", "resolved"]);
    const statusValue = typeof status === "string" ? status : undefined;
    if (statusValue && !allowedStatus.has(statusValue)) {
      return sendJson(res, 400, { error: "status must be new, reviewed, or resolved" });
    }

    try {
      const [ratingRows] = await db.execute(
        "SELECT rating_id FROM service_ratings WHERE rating_id = ? AND workshop_id = ? AND deleted_at IS NULL LIMIT 1",
        [Number(ratingId), Number(workshopId)]
      );
      const ratingRow = (ratingRows as any[])[0];
      if (!ratingRow) {
        return sendJson(res, 404, { error: "Rating not found" });
      }

      const updates: string[] = [];
      const params: Array<string | number | null> = [];

      const responseProvided = Object.prototype.hasOwnProperty.call(body, "response");
      const cleanedResponse =
        typeof response === "string" && response.trim() ? response.trim() : null;
      const hasResponse = responseProvided && cleanedResponse;
      const effectiveStatus = hasResponse ? "resolved" : statusValue;

      if (effectiveStatus === "new") {
        updates.push("responded_at = NULL");
        if (!responseProvided) {
          updates.push("response = NULL");
        }
      }

      if (effectiveStatus === "reviewed") {
        updates.push("responded_at = NOW()");
        if (!responseProvided) {
          updates.push("response = NULL");
        }
      }

      if (effectiveStatus === "resolved") {
        updates.push("responded_at = NOW()");
      }

      if (responseProvided) {
        updates.push("response = ?");
        params.push(cleanedResponse);
        if (cleanedResponse) {
          updates.push("responded_at = NOW()");
        }
      }

      if (updates.length === 0) {
        return sendJson(res, 400, { error: "No updates provided" });
      }

      params.push(Number(ratingId));
      await db.execute(
        `UPDATE service_ratings SET ${updates.join(", ")} WHERE rating_id = ?`,
        params
      );

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/workshop/ratings/request-delete
  if (req.method === "POST" && url.pathname === "/api/workshop/ratings/request-delete") {
    const body = await readBody(req);
    const { ratingId, workshopId, requestedBy, reason } = body;

    if (!ratingId || !workshopId) {
      return sendJson(res, 400, { error: "ratingId and workshopId required" });
    }

    try {
      const [ratingRows] = await db.execute(
        "SELECT rating_id FROM service_ratings WHERE rating_id = ? AND workshop_id = ? AND deleted_at IS NULL LIMIT 1",
        [Number(ratingId), Number(workshopId)]
      );
      const ratingRow = (ratingRows as any[])[0];
      if (!ratingRow) {
        return sendJson(res, 404, { error: "Rating not found" });
      }

      const [existingRows] = await db.execute(
        "SELECT request_id FROM rating_requests WHERE rating_id = ? AND status = 'pending' LIMIT 1",
        [Number(ratingId)]
      );
      if ((existingRows as any[])[0]) {
        return sendJson(res, 409, { error: "Request already pending" });
      }

      const cleanedReason =
        typeof reason === "string" && reason.trim() ? reason.trim() : null;

      const [result] = await db.execute(
        `INSERT INTO rating_requests
         (rating_id, workshop_id, requested_by, reason, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [
          Number(ratingId),
          Number(workshopId),
          requestedBy ? Number(requestedBy) : null,
          cleanedReason,
        ]
      );

      return sendJson(res, 201, { request_id: (result as any).insertId });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/workshop/ratings/requests?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/workshop/ratings/requests") {
    const workshopId = url.searchParams.get("workshopId");
    if (!workshopId) {
      return sendJson(res, 400, { error: "workshopId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT rr.request_id, rr.rating_id, rr.workshop_id, rr.requested_by,
                rr.reason, rr.status, rr.admin_notes, rr.created_at, rr.resolved_at,
                sr.rating, sr.comment, sr.created_at AS rating_created_at
         FROM rating_requests rr
         LEFT JOIN service_ratings sr ON sr.rating_id = rr.rating_id
         WHERE rr.workshop_id = ?
         ORDER BY rr.created_at DESC`,
        [Number(workshopId)]
      );
      return sendJson(res, 200, { requests: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/admin/rating-requests
  if (req.method === "GET" && url.pathname === "/api/admin/rating-requests") {
    try {
      const [rows] = await db.execute(
        `SELECT rr.request_id, rr.rating_id, rr.workshop_id, rr.requested_by,
                rr.reason, rr.status, rr.admin_notes, rr.created_at, rr.resolved_at,
                sr.rating, sr.comment, sr.response, sr.created_at AS rating_created_at,
                COALESCE(j.service_type, b.service_type) AS service_type,
                COALESCE(owner.name, b.customer_name, 'Customer') AS customer_name,
                mech.name AS mechanic_name,
                w.name AS workshop_name
         FROM rating_requests rr
         LEFT JOIN service_ratings sr ON sr.rating_id = rr.rating_id
         LEFT JOIN service_bookings b ON b.booking_id = sr.booking_id
         LEFT JOIN jobs j ON j.booking_id = sr.booking_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = sr.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = sr.mechanic_id
         LEFT JOIN workshops w ON w.workshop_id = rr.workshop_id
         ORDER BY rr.created_at DESC`
      );
      return sendJson(res, 200, { requests: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/admin/rating-requests/resolve
  if (req.method === "POST" && url.pathname === "/api/admin/rating-requests/resolve") {
    const body = await readBody(req);
    const { requestId, action, adminNotes } = body;

    const allowed = new Set(["approved", "rejected", "deleted"]);
    if (!requestId || !action || !allowed.has(String(action))) {
      return sendJson(res, 400, { error: "requestId and valid action required" });
    }

    try {
      const [rows] = await db.execute(
        "SELECT request_id, rating_id FROM rating_requests WHERE request_id = ? LIMIT 1",
        [Number(requestId)]
      );
      const request = (rows as any[])[0];
      if (!request) {
        return sendJson(res, 404, { error: "Request not found" });
      }

      const cleanedNotes =
        typeof adminNotes === "string" && adminNotes.trim()
          ? adminNotes.trim()
          : null;

      await db.execute(
        `UPDATE rating_requests
         SET status = ?, admin_notes = ?, resolved_at = NOW()
         WHERE request_id = ?`,
        [String(action), cleanedNotes, Number(requestId)]
      );

      if (String(action) === "approved" && request.rating_id) {
        await db.execute(
          "UPDATE service_ratings SET deleted_at = NOW() WHERE rating_id = ?",
          [Number(request.rating_id)]
        );
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/create
  if (req.method === "POST" && url.pathname === "/api/jobs/create") {
    const body = await readBody(req);
    const { bookingId, priority, estimatedTime } = body;
    if (!bookingId) {
      return sendJson(res, 400, { error: "bookingId required" });
    }

    try {
      const [existing] = await db.execute(
        "SELECT job_id FROM jobs WHERE booking_id = ? LIMIT 1",
        [Number(bookingId)]
      );
      const already = (existing as any[])[0];
      if (already) {
        return sendJson(res, 200, { job_id: already.job_id, existed: true });
      }

      const [rows] = await db.execute(
        `SELECT owner_id, workshop_id, vehicle_id, service_type, description, preferred_date, status
         FROM service_bookings
         WHERE booking_id = ? LIMIT 1`,
        [Number(bookingId)]
      );
      const booking = (rows as any[])[0];
      if (!booking) {
        return sendJson(res, 404, { error: "Booking not found" });
      }
      if (String(booking.status) === "rejected") {
        return sendJson(res, 400, { error: "Cannot create job for rejected booking" });
      }

      if (String(booking.status) === "pending") {
        await db.execute(
          "UPDATE service_bookings SET status = 'confirmed' WHERE booking_id = ?",
          [Number(bookingId)]
        );
      }

      const jobPriority =
        priority && ["low", "medium", "high"].includes(String(priority))
          ? String(priority)
          : "medium";

      const [result] = await db.execute(
        `INSERT INTO jobs
         (booking_id, owner_id, vehicle_id, workshop_id, service_type, description, priority, status, scheduled_date, estimated_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'unassigned', ?, ?)`,
        [
          Number(bookingId),
          booking.owner_id,
          booking.vehicle_id,
          booking.workshop_id,
          booking.service_type,
          booking.description ?? null,
          jobPriority,
          booking.preferred_date ?? null,
          estimatedTime ?? null,
        ]
      );

      const jobId = (result as any).insertId as number;
      return sendJson(res, 201, { job_id: jobId, existed: false });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/mechanics?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/mechanics") {
    const workshopId = url.searchParams.get("workshopId");
    if (!workshopId) {
      return sendJson(res, 400, { error: "workshopId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT u.user_id, u.name,
                COALESCE(SUM(CASE WHEN j.status IN ('assigned','in-progress') THEN 1 ELSE 0 END), 0) AS current_jobs
         FROM users u
         LEFT JOIN jobs j
           ON j.assigned_mechanic_id = u.user_id
          AND j.status IN ('assigned','in-progress')
         WHERE u.role = 'MECHANIC' AND u.workshop_id = ?
         GROUP BY u.user_id, u.name
         ORDER BY u.name`,
        [Number(workshopId)]
      );
      return sendJson(res, 200, { mechanics: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/jobs?workshopId=5
  if (req.method === "GET" && url.pathname === "/api/jobs") {
    const workshopId = url.searchParams.get("workshopId");
    const status = url.searchParams.get("status");
    if (!workshopId) {
      return sendJson(res, 400, { error: "workshopId required" });
    }

    const conditions: string[] = ["j.workshop_id = ?"];
    const params: Array<string | number> = [Number(workshopId)];
    if (status) {
      conditions.push("j.status = ?");
      params.push(status);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    try {
      const [rows] = await db.execute(
        `SELECT j.job_id, j.booking_id, j.owner_id, j.vehicle_id, j.workshop_id,
                j.assigned_mechanic_id, j.service_type, j.description,
                j.priority, j.status, j.scheduled_date, j.estimated_time,
                j.notes, j.created_at, j.updated_at,
                owner.name AS owner_name,
                mech.name AS assigned_mechanic_name,
                v.make, v.model, v.year, v.plate_number
         FROM jobs j
         LEFT JOIN vehicle_owners vo ON vo.owner_id = j.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = j.assigned_mechanic_id
         LEFT JOIN vehicles v ON v.vehicle_id = j.vehicle_id
         ${whereClause}
         ORDER BY j.created_at DESC`,
        params
      );
      return sendJson(res, 200, { jobs: rows });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/mechanic/jobs?mechanicId=7
  if (req.method === "GET" && url.pathname === "/api/mechanic/jobs") {
    const mechanicId = url.searchParams.get("mechanicId");
    if (!mechanicId) {
      return sendJson(res, 400, { error: "mechanicId required" });
    }

    try {
      const [rows] = await db.execute(
        `SELECT j.job_id, j.booking_id, j.owner_id, j.vehicle_id, j.workshop_id,
                j.assigned_mechanic_id, j.service_type, j.description,
                j.priority, j.status, j.scheduled_date, j.estimated_time,
                j.notes, j.created_at, j.updated_at,
                owner.name AS owner_name,
                mech.name AS assigned_mechanic_name,
                v.make, v.model, v.year, v.plate_number
         FROM jobs j
         LEFT JOIN vehicle_owners vo ON vo.owner_id = j.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = j.assigned_mechanic_id
         LEFT JOIN vehicles v ON v.vehicle_id = j.vehicle_id
         WHERE j.assigned_mechanic_id = ?
         ORDER BY j.updated_at DESC`,
        [Number(mechanicId)]
      );

      const jobs = rows as any[];
      if (jobs.length === 0) {
        return sendJson(res, 200, { jobs: [] });
      }

      const jobIds = jobs.map((j) => j.job_id);
      const placeholders = jobIds.map(() => "?").join(",");

      const [partsRows] = await db.execute(
        `SELECT part_id, job_id, name, quantity, unit_cost
         FROM job_parts
         WHERE job_id IN (${placeholders})`,
        jobIds
      );
      const [repairsRows] = await db.execute(
        `SELECT repair_id, job_id, description, logged_at
         FROM job_repairs
         WHERE job_id IN (${placeholders})`,
        jobIds
      );

      const partsByJob: Record<number, any[]> = {};
      for (const part of partsRows as any[]) {
        if (!partsByJob[part.job_id]) partsByJob[part.job_id] = [];
        partsByJob[part.job_id].push(part);
      }

      const repairsByJob: Record<number, any[]> = {};
      for (const rep of repairsRows as any[]) {
        if (!repairsByJob[rep.job_id]) repairsByJob[rep.job_id] = [];
        repairsByJob[rep.job_id].push(rep);
      }

      const withDetails = jobs.map((job) => ({
        ...job,
        parts: partsByJob[job.job_id] ?? [],
        repairs: repairsByJob[job.job_id] ?? [],
      }));

      return sendJson(res, 200, { jobs: withDetails });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/invoices?workshopId=5 or /api/invoices?ownerId=3
  if (req.method === "GET" && url.pathname === "/api/invoices") {
    const workshopId = url.searchParams.get("workshopId");
    const ownerId = url.searchParams.get("ownerId");
    if (!workshopId && !ownerId) {
      return sendJson(res, 400, { error: "workshopId or ownerId required" });
    }

    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (workshopId) {
      conditions.push("i.workshop_id = ?");
      params.push(Number(workshopId));
    }
    if (ownerId) {
      conditions.push("i.owner_id = ?");
      params.push(Number(ownerId));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const [rows] = await db.execute(
        `SELECT i.invoice_id, i.job_id, i.record_id, i.owner_id, i.workshop_id,
                i.subtotal, i.tax, i.total_amount, i.status, i.created_at,
                i.due_date, i.paid_date, i.notes,
                owner.name AS owner_name,
                mech.name AS mechanic_name,
                j.service_type,
                v.make, v.model, v.year, v.plate_number
         FROM invoices i
         LEFT JOIN jobs j ON j.job_id = i.job_id
         LEFT JOIN vehicle_owners vo ON vo.owner_id = i.owner_id
         LEFT JOIN users owner ON owner.user_id = vo.user_id
         LEFT JOIN users mech ON mech.user_id = j.assigned_mechanic_id
         LEFT JOIN vehicles v ON v.vehicle_id = j.vehicle_id
         ${whereClause}
         ORDER BY i.created_at DESC`,
        params
      );

      const invoices = rows as any[];
      if (invoices.length === 0) {
        return sendJson(res, 200, { invoices: [] });
      }

      const invoiceIds = invoices.map((inv) => inv.invoice_id);
      const placeholders = invoiceIds.map(() => "?").join(",");
      const [itemRows] = await db.execute(
        `SELECT item_id, invoice_id, description, quantity, unit_price, total
         FROM invoice_items
         WHERE invoice_id IN (${placeholders})`,
        invoiceIds
      );

      const itemsByInvoice: Record<number, any[]> = {};
      for (const item of itemRows as any[]) {
        if (!itemsByInvoice[item.invoice_id]) itemsByInvoice[item.invoice_id] = [];
        itemsByInvoice[item.invoice_id].push(item);
      }

      const withItems = invoices.map((invoice) => ({
        ...invoice,
        items: itemsByInvoice[invoice.invoice_id] ?? [],
      }));

      return sendJson(res, 200, { invoices: withItems });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/invoices/status
  if (req.method === "POST" && url.pathname === "/api/invoices/status") {
    const body = await readBody(req);
    const { invoiceId, status, notes } = body;
    const allowed = new Set([
      "draft",
      "pending",
      "approved",
      "rejected",
      "paid",
      "overdue",
    ]);

    if (!invoiceId || !status || !allowed.has(String(status))) {
      return sendJson(res, 400, { error: "invoiceId and valid status required" });
    }

    try {
      const updates: string[] = ["status = ?"];
      const params: Array<string | number | null> = [String(status)];

      if (String(status) === "paid") {
        updates.push("paid_date = NOW()");
      }

      if (notes !== undefined) {
        updates.push("notes = ?");
        params.push(notes ? String(notes) : null);
      }

      params.push(Number(invoiceId));
      await db.execute(
        `UPDATE invoices SET ${updates.join(", ")} WHERE invoice_id = ?`,
        params
      );

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/assign
  if (req.method === "POST" && url.pathname === "/api/jobs/assign") {
    const body = await readBody(req);
    const { jobId, mechanicId } = body;
    if (!jobId || !mechanicId) {
      return sendJson(res, 400, { error: "jobId and mechanicId required" });
    }

    try {
      const [jobRows] = await db.execute(
        "SELECT job_id, workshop_id, status FROM jobs WHERE job_id = ? LIMIT 1",
        [Number(jobId)]
      );
      const job = (jobRows as any[])[0];
      if (!job) return sendJson(res, 404, { error: "Job not found" });
      if (String(job.status) === "completed") {
        return sendJson(res, 400, { error: "Cannot assign a completed job" });
      }

      const [mechRows] = await db.execute(
        "SELECT user_id, workshop_id FROM users WHERE user_id = ? AND role = 'MECHANIC' LIMIT 1",
        [Number(mechanicId)]
      );
      const mech = (mechRows as any[])[0];
      if (!mech) return sendJson(res, 404, { error: "Mechanic not found" });
      if (Number(mech.workshop_id) !== Number(job.workshop_id)) {
        return sendJson(res, 400, { error: "Mechanic not in this workshop" });
      }

      const [countRows] = await db.execute(
        "SELECT COUNT(*) as cnt FROM jobs WHERE assigned_mechanic_id = ? AND status IN ('assigned','in-progress')",
        [Number(mechanicId)]
      );
      const current = Number((countRows as any[])[0]?.cnt ?? 0);
      if (current >= 2) {
        return sendJson(res, 409, { error: "Mechanic is busy" });
      }

      await db.execute(
        "UPDATE jobs SET assigned_mechanic_id = ?, status = 'assigned' WHERE job_id = ?",
        [Number(mechanicId), Number(jobId)]
      );
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/parts
  if (req.method === "POST" && url.pathname === "/api/jobs/parts") {
    const body = await readBody(req);
    const { jobId, name, quantity, cost } = body;
    if (!jobId || !name) {
      return sendJson(res, 400, { error: "jobId and name required" });
    }

    try {
      const qty = Number(quantity ?? 1);
      const unitCost = Number(cost ?? 0);
      const totalCost = qty * unitCost;

      const [result] = await db.execute(
        `INSERT INTO job_parts (job_id, name, quantity, unit_cost, total_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [Number(jobId), String(name), qty, unitCost, totalCost]
      );

      const partId = (result as any).insertId as number;

      try {
        const [jobRows] = await db.execute(
          "SELECT status FROM jobs WHERE job_id = ? LIMIT 1",
          [Number(jobId)]
        );
        const job = (jobRows as any[])[0];
        if (job && String(job.status) === "completed") {
          await syncInvoiceForJob(Number(jobId), false);
        }
      } catch (err) {
        console.error("Invoice sync failed:", err);
      }

      return sendJson(res, 201, {
        part_id: partId,
        job_id: Number(jobId),
        name: String(name),
        quantity: qty,
        unit_cost: unitCost,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/parts/delete
  if (req.method === "POST" && url.pathname === "/api/jobs/parts/delete") {
    const body = await readBody(req);
    const { partId } = body;
    if (!partId) {
      return sendJson(res, 400, { error: "partId required" });
    }

    try {
      const [partRows] = await db.execute(
        "SELECT job_id FROM job_parts WHERE part_id = ? LIMIT 1",
        [Number(partId)]
      );
      const part = (partRows as any[])[0];

      await db.execute("DELETE FROM job_parts WHERE part_id = ?", [Number(partId)]);

      if (part?.job_id) {
        try {
          const [jobRows] = await db.execute(
            "SELECT status FROM jobs WHERE job_id = ? LIMIT 1",
            [Number(part.job_id)]
          );
          const job = (jobRows as any[])[0];
          if (job && String(job.status) === "completed") {
            await syncInvoiceForJob(Number(part.job_id), false);
          }
        } catch (err) {
          console.error("Invoice sync failed:", err);
        }
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/repairs
  if (req.method === "POST" && url.pathname === "/api/jobs/repairs") {
    const body = await readBody(req);
    const { jobId, description } = body;
    if (!jobId || !description) {
      return sendJson(res, 400, { error: "jobId and description required" });
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO job_repairs (job_id, description)
         VALUES (?, ?)`,
        [Number(jobId), String(description)]
      );

      const repairId = (result as any).insertId as number;
      const [rows] = await db.execute(
        "SELECT logged_at FROM job_repairs WHERE repair_id = ?",
        [repairId]
      );
      const loggedAt = (rows as any[])[0]?.logged_at ?? null;

      return sendJson(res, 201, {
        repair_id: repairId,
        job_id: Number(jobId),
        description: String(description),
        logged_at: loggedAt,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/notes
  if (req.method === "POST" && url.pathname === "/api/jobs/notes") {
    const body = await readBody(req);
    const { jobId, notes } = body;
    if (!jobId) {
      return sendJson(res, 400, { error: "jobId required" });
    }

    try {
      await db.execute("UPDATE jobs SET notes = ? WHERE job_id = ?", [
        notes ?? null,
        Number(jobId),
      ]);
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/jobs/status
  if (req.method === "POST" && url.pathname === "/api/jobs/status") {
    const body = await readBody(req);
    const { jobId, status } = body;
    const allowed = new Set([
      "unassigned",
      "assigned",
      "in-progress",
      "completed",
      "on-hold",
    ]);
    if (!jobId || !status || !allowed.has(String(status))) {
      return sendJson(res, 400, { error: "jobId and valid status required" });
    }

    try {
      await db.execute(
        "UPDATE jobs SET status = ? WHERE job_id = ?",
        [status, Number(jobId)]
      );

      if (String(status) === "completed") {
        await syncInvoiceForJob(Number(jobId), true);
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => console.log(`API running on http://localhost:${port}`));
