export type MechanicJob = {
  job_id: number;
  booking_id: number | null;
  owner_id: number;
  vehicle_id: number | null;
  workshop_id: number;
  assigned_mechanic_id: number | null;
  service_type: string | null;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "unassigned" | "assigned" | "in-progress" | "completed" | "on-hold";
  scheduled_date: string | null;
  estimated_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  owner_name?: string | null;
  assigned_mechanic_name?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  plate_number?: string | null;
  parts: Array<{
    part_id: number;
    job_id: number;
    name: string;
    quantity: number;
    unit_cost: number | null;
  }>;
  repairs: Array<{
    repair_id: number;
    job_id: number;
    description: string;
    logged_at: string;
  }>;
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiListMechanicJobs(
  mechanicId: number
): Promise<MechanicJob[]> {
  const res = await fetch(`${API_BASE}/api/mechanic/jobs?mechanicId=${mechanicId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load mechanic jobs");
  return (data?.jobs ?? []) as MechanicJob[];
}

export async function apiAddJobPart(payload: {
  jobId: number;
  name: string;
  quantity: number;
  cost: number;
}) {
  const res = await fetch(`${API_BASE}/api/jobs/parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to add part");
  return data as {
    part_id: number;
    job_id: number;
    name: string;
    quantity: number;
    unit_cost: number;
  };
}

export async function apiRemoveJobPart(partId: number) {
  const res = await fetch(`${API_BASE}/api/jobs/parts/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to remove part");
  return data;
}

export async function apiAddJobRepair(payload: {
  jobId: number;
  description: string;
}) {
  const res = await fetch(`${API_BASE}/api/jobs/repairs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to add repair");
  return data as {
    repair_id: number;
    job_id: number;
    description: string;
    logged_at: string | null;
  };
}

export async function apiUpdateJobNotes(payload: {
  jobId: number;
  notes: string;
}) {
  const res = await fetch(`${API_BASE}/api/jobs/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update notes");
  return data;
}

export async function apiUpdateMechanicJobStatus(payload: {
  jobId: number;
  status: "pending" | "in-progress" | "completed" | "on-hold";
}) {
  const mapped =
    payload.status === "pending" ? "assigned" : payload.status;

  const res = await fetch(`${API_BASE}/api/jobs/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: payload.jobId, status: mapped }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update status");
  return data;
}
