export type Job = {
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
};

export type MechanicSummary = {
  user_id: number;
  name: string;
  current_jobs: number;
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiListJobs(params: {
  workshopId: number;
  status?: string;
}): Promise<Job[]> {
  const search = new URLSearchParams();
  search.set("workshopId", String(params.workshopId));
  if (params.status) search.set("status", params.status);

  const res = await fetch(`${API_BASE}/api/jobs?${search.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load jobs");
  return (data?.jobs ?? []) as Job[];
}

export async function apiListMechanics(
  workshopId: number
): Promise<MechanicSummary[]> {
  const res = await fetch(`${API_BASE}/api/mechanics?workshopId=${workshopId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load mechanics");
  return (data?.mechanics ?? []) as MechanicSummary[];
}

export async function apiAssignJob(payload: {
  jobId: number;
  mechanicId: number;
}) {
  const res = await fetch(`${API_BASE}/api/jobs/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to assign mechanic");
  return data;
}

export async function apiCreateJobFromBooking(payload: {
  bookingId: number;
  priority?: "low" | "medium" | "high";
  estimatedTime?: string;
}) {
  const res = await fetch(`${API_BASE}/api/jobs/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create job");
  return data;
}

export async function apiUpdateJobStatus(payload: {
  jobId: number;
  status: "unassigned" | "assigned" | "in-progress" | "completed" | "on-hold";
}) {
  const res = await fetch(`${API_BASE}/api/jobs/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update status");
  return data;
}
