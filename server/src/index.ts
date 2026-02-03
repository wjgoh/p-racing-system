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

    // 2) OPTIONAL: insert vehicles if you have a vehicles table
    // If you DON'T have vehicles table yet, skip this whole block.
    if (userRole === "OWNER" && Array.isArray(vehicles) && vehicles.length > 0) {
      for (const v of vehicles) {
        // adjust column names to your vehicles table schema
        await db.execute(
          `INSERT INTO vehicles (owner_id, plate_number, make, model, year, color)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, v.plateNumber, v.make, v.model, v.year, v.color]
        );
      }
    }

    return sendJson(res, 201, { user_id: userId, workshop_id: workshopIdForUser });
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
    const [rows] = await db.execute(
      "SELECT user_id, name, email, password_hash, role, workshop_id FROM users WHERE email = ? LIMIT 1",
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
        workshop_id: user.workshop_id ?? null,
      },
    });
  }

  // GET /api/vehicles?ownerId=123
  if (req.method === "GET" && url.pathname === "/api/vehicles") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }
    try {
      const [rows] = await db.execute(
        `SELECT vehicle_id, owner_id, plate_number, make, model, year, color
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
