export type Vehicle = {
  vehicle_id: number;
  owner_id: number;
  plate_number: string;
  make: string | null;
  model: string | null;
  year: string | null;
  color: string | null;
};

export type Workshop = {
  workshop_id: number;
  name: string;
};

export type Booking = {
  booking_id: number;
  owner_id: number;
  workshop_id: number;
  vehicle_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_type: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  description: string | null;
  status: "pending" | "confirmed" | "rejected" | "in-progress" | "completed";
  created_at: string;
  make?: string | null;
  model?: string | null;
  plate_number?: string | null;
  year?: string | null;
  color?: string | null;
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiListVehicles(ownerId: number): Promise<Vehicle[]> {
  const res = await fetch(`${API_BASE}/api/vehicles?ownerId=${ownerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load vehicles");
  return (data?.vehicles ?? []) as Vehicle[];
}

export async function apiListWorkshops(): Promise<Workshop[]> {
  const res = await fetch(`${API_BASE}/api/workshops`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load workshops");
  return (data?.workshops ?? []) as Workshop[];
}

export async function apiListBookings(params: {
  ownerId?: number;
  workshopId?: number;
  status?: string;
}): Promise<Booking[]> {
  const search = new URLSearchParams();
  if (params.ownerId) search.set("ownerId", String(params.ownerId));
  if (params.workshopId) search.set("workshopId", String(params.workshopId));
  if (params.status) search.set("status", params.status);

  const res = await fetch(`${API_BASE}/api/bookings?${search.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load bookings");
  return (data?.bookings ?? []) as Booking[];
}

export async function apiCreateBooking(payload: {
  ownerId: number;
  workshopId: number;
  vehicleId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  description?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to create booking");
  return data;
}

export async function apiUpdateBookingStatus(payload: {
  bookingId: number;
  status: "pending" | "confirmed" | "rejected" | "in-progress" | "completed";
}) {
  const res = await fetch(`${API_BASE}/api/bookings/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update booking");
  return data;
}
