const API_BASE = "http://127.0.0.1:4000";

export type ServiceRatingRecord = {
  rating_id: number;
  booking_id: number;
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
};

export type PendingRatingRecord = {
  job_id: number;
  booking_id: number;
  owner_id: number;
  workshop_id: number;
  assigned_mechanic_id: number | null;
  service_type: string | null;
  preferred_date: string | null;
  scheduled_date: string | null;
  completed_at: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  plate_number: string | null;
};

export async function apiListRatings(
  ownerId: number
): Promise<ServiceRatingRecord[]> {
  const res = await fetch(`${API_BASE}/api/ratings?ownerId=${ownerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load ratings");
  return (data?.ratings ?? []) as ServiceRatingRecord[];
}

export async function apiListPendingRatings(
  ownerId: number
): Promise<PendingRatingRecord[]> {
  const res = await fetch(`${API_BASE}/api/ratings/pending?ownerId=${ownerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load pending reviews");
  return (data?.pending ?? []) as PendingRatingRecord[];
}

export async function apiSubmitRating(payload: {
  bookingId: number;
  ownerId: number;
  rating: number;
  comment?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to submit rating");
  return data;
}
