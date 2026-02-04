export type AdminUserRecord = {
  user_id: number;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "MECHANIC" | "WORKSHOP" | "OWNER" | string | null;
  status?: "active" | "inactive" | null;
  created_at?: string | Date | null;
  workshop_id?: number | null;
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiListAdminUsers(): Promise<AdminUserRecord[]> {
  const res = await fetch(`${API_BASE}/api/admin/users`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load users");
  return (data?.users ?? []) as AdminUserRecord[];
}

export async function apiCreateAdminUser(payload: {
  name: string;
  email: string;
  role: "ADMIN" | "MECHANIC" | "WORKSHOP" | "OWNER";
  status?: "active" | "inactive";
  password: string;
}) {
  const res = await fetch(`${API_BASE}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create user");
  return data?.user as AdminUserRecord;
}

export async function apiUpdateAdminUser(payload: {
  userId: number;
  name?: string;
  email?: string;
  role?: "ADMIN" | "MECHANIC" | "WORKSHOP" | "OWNER";
  status?: "active" | "inactive";
  password?: string;
}) {
  const res = await fetch(`${API_BASE}/api/admin/users/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update user");
  return data?.user as AdminUserRecord;
}

export async function apiDeactivateAdminUser(userId: number) {
  const res = await fetch(`${API_BASE}/api/admin/users/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to deactivate user");
  return data;
}
