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
         LEFT JOIN users owner ON owner.user_id = j.owner_id
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
         LEFT JOIN users owner ON owner.user_id = j.owner_id
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
      await db.execute("DELETE FROM job_parts WHERE part_id = ?", [Number(partId)]);
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
