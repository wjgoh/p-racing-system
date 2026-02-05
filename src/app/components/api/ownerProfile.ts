const API_BASE = "http://127.0.0.1:4000";

export type OwnerProfile = {
  owner_id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string | null;
};

export async function apiGetOwnerProfile(ownerId: number): Promise<OwnerProfile> {
  const res = await fetch(`${API_BASE}/api/owner/profile?ownerId=${ownerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load profile");
  return data?.profile as OwnerProfile;
}

export async function apiUpdateOwnerProfile(payload: {
  ownerId: number;
  name: string;
  phone?: string | null;
  oldPassword?: string;
  newPassword?: string;
}): Promise<OwnerProfile> {
  const res = await fetch(`${API_BASE}/api/owner/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update profile");
  return data?.profile as OwnerProfile;
}
