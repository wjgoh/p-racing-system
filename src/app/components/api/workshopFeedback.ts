const API_BASE = "http://127.0.0.1:4000";

export type WorkshopRatingRecord = {
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

export type WorkshopRatingRequestRecord = {
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
  rating_created_at: string | null;
};

export async function apiListWorkshopRatings(
  workshopId: number
): Promise<WorkshopRatingRecord[]> {
  const res = await fetch(`${API_BASE}/api/workshop/ratings?workshopId=${workshopId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load reviews");
  return (data?.ratings ?? []) as WorkshopRatingRecord[];
}

export async function apiUpdateWorkshopRatingResponse(payload: {
  ratingId: number;
  workshopId: number;
  response?: string | null;
  status?: "new" | "reviewed" | "resolved";
}) {
  const res = await fetch(`${API_BASE}/api/workshop/ratings/response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update response");
  return data;
}

export async function apiRequestWorkshopRatingDelete(payload: {
  ratingId: number;
  workshopId: number;
  requestedBy?: number | null;
  reason?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/workshop/ratings/request-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to request deletion");
  return data;
}

export async function apiListWorkshopRatingRequests(
  workshopId: number
): Promise<WorkshopRatingRequestRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/workshop/ratings/requests?workshopId=${workshopId}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load requests");
  return (data?.requests ?? []) as WorkshopRatingRequestRecord[];
}
