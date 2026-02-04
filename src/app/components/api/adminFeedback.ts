const API_BASE = "http://127.0.0.1:4000";

export type AdminRatingRecord = {
  rating_id: number;
  booking_id: number | null;
  owner_id: number;
  workshop_id: number;
  mechanic_id: number | null;
  rating: number;
  comment: string | null;
  response: string | null;
  created_at: string;
  responded_at: string | null;
  status: "new" | "reviewed" | "resolved";
  service_type: string | null;
  preferred_date: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  plate_number: string | null;
  customer_name: string | null;
  mechanic_name: string | null;
  workshop_name: string | null;
};

export type AdminRatingRequestRecord = {
  request_id: number;
  rating_id: number | null;
  workshop_id: number;
  requested_by: number | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "deleted";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  rating: number | null;
  comment: string | null;
  response: string | null;
  rating_created_at: string | null;
  service_type: string | null;
  customer_name: string | null;
  mechanic_name: string | null;
  workshop_name: string | null;
};

export async function apiListAdminRatings(): Promise<AdminRatingRecord[]> {
  const res = await fetch(`${API_BASE}/api/admin/ratings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load feedback");
  return (data?.ratings ?? []) as AdminRatingRecord[];
}

export async function apiListAdminRatingRequests(): Promise<AdminRatingRequestRecord[]> {
  const res = await fetch(`${API_BASE}/api/admin/rating-requests`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load requests");
  return (data?.requests ?? []) as AdminRatingRequestRecord[];
}

export async function apiResolveAdminRatingRequest(payload: {
  requestId: number;
  action: "approved" | "rejected" | "deleted";
  adminNotes?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/admin/rating-requests/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to resolve request");
  return data;
}

export async function apiUpdateAdminRating(payload: {
  ratingId: number;
  rating?: number;
  comment?: string | null;
  response?: string | null;
  status?: "new" | "reviewed" | "resolved";
}) {
  const res = await fetch(`${API_BASE}/api/admin/ratings/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update rating");
  return data;
}

export async function apiDeleteAdminRating(ratingId: number) {
  const res = await fetch(`${API_BASE}/api/admin/ratings/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ratingId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to delete rating");
  return data;
}
