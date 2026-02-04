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

async function syncInvoiceForJob(jobId: number, createIfMissing: boolean) {
  const [jobRows] = await db.execute(
    "SELECT owner_id, workshop_id FROM jobs WHERE job_id = ? LIMIT 1",
    [Number(jobId)],
  );
  const job = (jobRows as any[])[0];
  if (!job) return;

  const [invoiceRows] = await db.execute(
    "SELECT invoice_id FROM invoices WHERE job_id = ? LIMIT 1",
    [Number(jobId)],
  );
  let invoiceId = (invoiceRows as any[])[0]?.invoice_id as number | undefined;

  if (!invoiceId && !createIfMissing) {
    return;
  }

  const [partsRows] = await db.execute(
    "SELECT name, quantity, unit_cost, total_cost FROM job_parts WHERE job_id = ?",
    [Number(jobId)],
  );

  let subtotal = 0;
  const items = (partsRows as any[]).map((part) => {
    const qty = Number(part.quantity ?? 0);
    const unit = Number(part.unit_cost ?? 0);
    const total = Number(part.total_cost ?? Math.round(qty * unit * 100) / 100);
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
      ],
    );
    invoiceId = (invoiceResult as any).insertId as number;
  } else {
    await db.execute(
      "UPDATE invoices SET subtotal = ?, tax = ?, total_amount = ? WHERE invoice_id = ?",
      [subtotal, tax, totalAmount, Number(invoiceId)],
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
        ],
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
    const { name, email, password, role, vehicles, workshop, workshopId } =
      body;

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
          ],
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
        [name, email, passwordHash, userRole, workshopIdForUser],
      );

      const userId = (result as any).insertId as number;
      let ownerId: number | null = null;

      // 2) If OWNER, create vehicle_owners row
      if (userRole === "OWNER") {
        const [ownerResult] = await db.execute(
          `INSERT INTO vehicle_owners (user_id, phone) VALUES (?, ?)`,
          [userId, null],
        );
        ownerId = (ownerResult as any).insertId as number;
      }

      // 3) OPTIONAL: insert vehicles if you have a vehicles table
      // If you DON'T have vehicles table yet, skip this whole block.
      if (
        userRole === "OWNER" &&
        ownerId &&
        Array.isArray(vehicles) &&
        vehicles.length > 0
      ) {
        for (const v of vehicles) {
          // adjust column names to your vehicles table schema
          await db.execute(
            `INSERT INTO vehicles (owner_id, plate_number, make, model, year, color)
           VALUES (?, ?, ?, ?, ?, ?)`,
            [ownerId, v.plateNumber, v.make, v.model, v.year, v.color],
          );
        }
      }

      return sendJson(res, 201, {
        user_id: userId,
        owner_id: ownerId,
        workshop_id: workshopIdForUser,
      });
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
        "SELECT workshop_id, name FROM workshops ORDER BY name",
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
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.role, u.workshop_id,
              vo.owner_id
       FROM users u
       LEFT JOIN vehicle_owners vo ON vo.user_id = u.user_id
       WHERE u.email = ? LIMIT 1`,
      [email],
    );

    const user = (rows as any[])[0];
    if (!user) return sendJson(res, 401, { error: "Invalid credentials" });

    // ASSIGNMENT MODE: plain password compare
    const verify = await bcrypt.compare(password, user.password_hash);
    if (!verify) return sendJson(res, 401, { error: "Invalid credentials" });

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

  // GET /api/vehicles?ownerId=123 (ownerId = vehicle_owners.owner_id)
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
        [Number(ownerId)],
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
    const { ownerId, plateNumber, make, model, year, color } = body;

    if (!ownerId || !plateNumber) {
      return sendJson(res, 400, { error: "ownerId and plateNumber required" });
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO vehicles (owner_id, plate_number, make, model, year, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Number(ownerId),
          plateNumber,
          make ?? null,
          model ?? null,
          year ?? null,
          color ?? null,
        ],
      );
      const vehicleId = (result as any).insertId as number;
      return sendJson(res, 201, { vehicle_id: vehicleId });
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

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

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
        params,
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

    if (
      !ownerId ||
      !workshopId ||
      !serviceType ||
      !preferredDate ||
      !preferredTime
    ) {
      return sendJson(res, 400, {
        error:
          "ownerId, workshopId, serviceType, preferredDate, preferredTime required",
      });
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
        ],
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

    const allowed = new Set([
      "pending",
      "confirmed",
      "rejected",
      "in-progress",
      "completed",
    ]);
    if (!bookingId || !status || !allowed.has(String(status))) {
      return sendJson(res, 400, {
        error: "bookingId and valid status required",
      });
    }

    try {
      await db.execute(
        "UPDATE service_bookings SET status = ? WHERE booking_id = ?",
        [status, Number(bookingId)],
      );

      if (String(status) === "confirmed") {
        const [existing] = await db.execute(
          "SELECT job_id FROM jobs WHERE booking_id = ? LIMIT 1",
          [Number(bookingId)],
        );
        const already = (existing as any[])[0];
        if (!already) {
          const [rows] = await db.execute(
            `SELECT owner_id, workshop_id, vehicle_id, service_type, description, preferred_date
             FROM service_bookings
             WHERE booking_id = ? LIMIT 1`,
            [Number(bookingId)],
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
              ],
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
        [Number(bookingId)],
      );
      const already = (existing as any[])[0];
      if (already) {
        return sendJson(res, 200, { job_id: already.job_id, existed: true });
      }

      const [rows] = await db.execute(
        `SELECT owner_id, workshop_id, vehicle_id, service_type, description, preferred_date, status
         FROM service_bookings
         WHERE booking_id = ? LIMIT 1`,
        [Number(bookingId)],
      );
      const booking = (rows as any[])[0];
      if (!booking) {
        return sendJson(res, 404, { error: "Booking not found" });
      }
      if (String(booking.status) === "rejected") {
        return sendJson(res, 400, {
          error: "Cannot create job for rejected booking",
        });
      }

      if (String(booking.status) === "pending") {
        await db.execute(
          "UPDATE service_bookings SET status = 'confirmed' WHERE booking_id = ?",
          [Number(bookingId)],
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
        ],
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
        [Number(workshopId)],
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
        params,
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
        [Number(mechanicId)],
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
        jobIds,
      );
      const [repairsRows] = await db.execute(
        `SELECT repair_id, job_id, description, logged_at
         FROM job_repairs
         WHERE job_id IN (${placeholders})`,
        jobIds,
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

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

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
        params,
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
        invoiceIds,
      );

      const itemsByInvoice: Record<number, any[]> = {};
      for (const item of itemRows as any[]) {
        if (!itemsByInvoice[item.invoice_id])
          itemsByInvoice[item.invoice_id] = [];
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
      return sendJson(res, 400, {
        error: "invoiceId and valid status required",
      });
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
        params,
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
        [Number(jobId)],
      );
      const job = (jobRows as any[])[0];
      if (!job) return sendJson(res, 404, { error: "Job not found" });
      if (String(job.status) === "completed") {
        return sendJson(res, 400, { error: "Cannot assign a completed job" });
      }

      const [mechRows] = await db.execute(
        "SELECT user_id, workshop_id FROM users WHERE user_id = ? AND role = 'MECHANIC' LIMIT 1",
        [Number(mechanicId)],
      );
      const mech = (mechRows as any[])[0];
      if (!mech) return sendJson(res, 404, { error: "Mechanic not found" });
      if (Number(mech.workshop_id) !== Number(job.workshop_id)) {
        return sendJson(res, 400, { error: "Mechanic not in this workshop" });
      }

      const [countRows] = await db.execute(
        "SELECT COUNT(*) as cnt FROM jobs WHERE assigned_mechanic_id = ? AND status IN ('assigned','in-progress')",
        [Number(mechanicId)],
      );
      const current = Number((countRows as any[])[0]?.cnt ?? 0);
      if (current >= 2) {
        return sendJson(res, 409, { error: "Mechanic is busy" });
      }

      await db.execute(
        "UPDATE jobs SET assigned_mechanic_id = ?, status = 'assigned' WHERE job_id = ?",
        [Number(mechanicId), Number(jobId)],
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
        [Number(jobId), String(name), qty, unitCost, totalCost],
      );

      const partId = (result as any).insertId as number;

      try {
        const [jobRows] = await db.execute(
          "SELECT status FROM jobs WHERE job_id = ? LIMIT 1",
          [Number(jobId)],
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
        [Number(partId)],
      );
      const part = (partRows as any[])[0];

      await db.execute("DELETE FROM job_parts WHERE part_id = ?", [
        Number(partId),
      ]);

      if (part?.job_id) {
        try {
          const [jobRows] = await db.execute(
            "SELECT status FROM jobs WHERE job_id = ? LIMIT 1",
            [Number(part.job_id)],
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
        [Number(jobId), String(description)],
      );

      const repairId = (result as any).insertId as number;
      const [rows] = await db.execute(
        "SELECT logged_at FROM job_repairs WHERE repair_id = ?",
        [repairId],
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
      await db.execute("UPDATE jobs SET status = ? WHERE job_id = ?", [
        status,
        Number(jobId),
      ]);

      if (String(status) === "completed") {
        await syncInvoiceForJob(Number(jobId), true);
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/service-history?ownerId=123
  if (req.method === "GET" && url.pathname === "/api/service-history") {
    const ownerId = url.searchParams.get("ownerId");
    if (!ownerId) {
      return sendJson(res, 400, { error: "ownerId required" });
    }

    try {
      const [records] = await db.execute(
        `SELECT mr.record_id, mr.service_type, mr.description, mr.cost,
                mr.performed_at, j.vehicle_id, v.make, v.model, v.year, v.plate_number,
                j.job_id, w.name as workshop_name
         FROM maintenance_records mr
         LEFT JOIN jobs j ON mr.job_id = j.job_id
         LEFT JOIN vehicles v ON j.vehicle_id = v.vehicle_id
         LEFT JOIN workshops w ON j.workshop_id = w.workshop_id
         WHERE j.owner_id = ?
         ORDER BY mr.performed_at DESC`,
        [Number(ownerId)],
      );
      return sendJson(res, 200, { records });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/user-profile?userId=123
  if (req.method === "GET" && url.pathname === "/api/user-profile") {
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return sendJson(res, 400, { error: "userId required" });
    }

    try {
      const [users] = await db.execute(
        `SELECT u.user_id, u.name, u.email, u.role, 
                vo.owner_id, vo.phone
         FROM users u
         LEFT JOIN vehicle_owners vo ON u.user_id = vo.user_id
         WHERE u.user_id = ? LIMIT 1`,
        [Number(userId)],
      );
      
      if ((users as any[]).length === 0) {
        return sendJson(res, 404, { error: "User not found" });
      }

      return sendJson(res, 200, { user: (users as any[])[0] });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // PUT /api/user-profile/:userId
  if (req.method === "PUT" && url.pathname.startsWith("/api/user-profile/")) {
    const userId = url.pathname.split("/")[3];
    const body = await readBody(req);
    const { name, email, phone } = body;

    if (!userId) {
      return sendJson(res, 400, { error: "userId required" });
    }

    try {
      await db.execute("UPDATE users SET name = ?, email = ? WHERE user_id = ?", [
        name,
        email,
        Number(userId),
      ]);

      if (phone) {
        await db.execute(
          "UPDATE vehicle_owners SET phone = ? WHERE user_id = ?",
          [phone, Number(userId)],
        );
      }

      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/notifications?userId=123
  if (req.method === "GET" && url.pathname === "/api/notifications") {
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return sendJson(res, 400, { error: "userId required" });
    }

    try {
      // Get recent service bookings as notifications
      const [bookings] = await db.execute(
        `SELECT b.booking_id as id, CONCAT('Service ', b.status) as title,
                CONCAT('Your ', b.service_type, ' is ', b.status) as message,
                'info' as type, b.created_at as timestamp, 0 as read
         FROM service_bookings b
         WHERE b.owner_id = (SELECT owner_id FROM vehicle_owners WHERE user_id = ?)
         ORDER BY b.created_at DESC LIMIT 10`,
        [Number(userId)],
      );

      // Get recent invoices as notifications
      const [invoices] = await db.execute(
        `SELECT i.invoice_id as id, CONCAT('Invoice ', i.status) as title,
                CONCAT('Invoice #', i.invoice_id, ' is ', i.status) as message,
                'success' as type, i.created_at as timestamp, 0 as read
         FROM invoices i
         WHERE i.owner_id = (SELECT owner_id FROM vehicle_owners WHERE user_id = ?)
         ORDER BY i.created_at DESC LIMIT 10`,
        [Number(userId)],
      );

      const allNotifications = [
        ...(bookings as any[]),
        ...(invoices as any[]),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return sendJson(res, 200, { notifications: allNotifications.slice(0, 10) });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // POST /api/report-requests
  if (req.method === "POST" && url.pathname === "/api/report-requests") {
    const body = await readBody(req);
    const { workshopId, type, description, priority } = body;

    if (!workshopId || !type || !description) {
      return sendJson(res, 400, {
        error: "workshopId, type, description required",
      });
    }

    try {
      const [result] = await db.execute(
        `INSERT INTO service_bookings (owner_id, workshop_id, customer_name, 
         service_type, preferred_date, preferred_time, description, status)
         VALUES (1, ?, ?, ?, CURDATE(), CURTIME(), ?, 'pending')`,
        [Number(workshopId), `Report: ${type}`, type, description],
      );

      return sendJson(res, 201, { id: (result as any).insertId });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // GET /api/report-requests?status=pending
  if (req.method === "GET" && url.pathname === "/api/report-requests") {
    const status = url.searchParams.get("status");

    try {
      let query = `SELECT booking_id as id, service_type as type, 
                          description, preferred_date as requestedDate, 
                          status, 'high' as priority, customer_name as workshopName
                   FROM service_bookings
                   WHERE customer_name LIKE 'Report:%'`;
      const params: any[] = [];

      if (status) {
        query += " AND status = ?";
        params.push(status);
      }

      query += " ORDER BY preferred_date DESC";

      const [requests] = await db.execute(query, params);
      return sendJson(res, 200, { requests });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  // PUT /api/report-requests/:id
  if (req.method === "PUT" && url.pathname.startsWith("/api/report-requests/")) {
    const id = url.pathname.split("/")[3];
    const body = await readBody(req);
    const { status, adminNotes } = body;

    if (!id || !status) {
      return sendJson(res, 400, { error: "id and status required" });
    }

    try {
      await db.execute(
        "UPDATE service_bookings SET status = ?, description = CONCAT(description, ?) WHERE booking_id = ?",
        [status, adminNotes ? `\n\nAdmin Notes: ${adminNotes}` : "", Number(id)],
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
server.listen(port, () =>
  console.log(`API running on http://localhost:${port}`),
);
