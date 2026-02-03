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
  const { name, email, password, role, vehicles } = body;

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: "name, email, password required" });
  }

  // default role OWNER
  const userRole = (role ?? "OWNER") as string;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // 1) create user
    const [result] = await db.execute(
    `INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)`,
    [name, email, passwordHash, userRole]
    );

    const userId = (result as any).insertId as number;

    // 2) OPTIONAL: insert vehicles if you have a vehicles table
    // If you DON'T have vehicles table yet, skip this whole block.
    if (Array.isArray(vehicles) && vehicles.length > 0) {
      for (const v of vehicles) {
        // adjust column names to your vehicles table schema
        await db.execute(
          `INSERT INTO vehicles (owner_id, plate_number, make, model, year, color)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, v.plateNumber, v.make, v.model, v.year, v.color]
        );
      }
    }

    return sendJson(res, 201, { user_id: userId });
  } catch (err: any) {
    // duplicate email
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return sendJson(res, 409, { error: "Email already exists" });
    }
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
    const [rows] = await db.execute(
      "SELECT user_id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    const user = (rows as any[])[0];
    if (!user) return sendJson(res, 401, { error: "Invalid credentials" });

    // ASSIGNMENT MODE: plain password compare
    const verify = await bcrypt.compare(password, user.password_hash);
    if (!verify) 
        return sendJson(res, 401, { error: "Invalid credentials" });

    return sendJson(res, 200, {
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }

  return sendJson(res, 404, { error: "Not found" });
});

const port = Number(process.env.PORT ?? 4000);
server.listen(port, () => console.log(`API running on http://localhost:${port}`));
