const API_BASE = "http://127.0.0.1:4000";

export type WorkshopNotificationEvent = {
  notification_id: number;
  workshop_id: number;
  source: "owner" | "mechanic" | "admin" | "system" | string;
  event_type: string;
  title: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};

export async function apiListWorkshopNotifications(workshopId: number): Promise<{
  events: WorkshopNotificationEvent[];
}> {
  const res = await fetch(
    `${API_BASE}/api/workshop/notifications?workshopId=${workshopId}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load notifications");
  return {
    events: (data?.events ?? []) as WorkshopNotificationEvent[],
  };
}

export async function apiMarkWorkshopNotificationsRead(payload: {
  workshopId: number;
  notificationIds?: number[];
}) {
  const res = await fetch(`${API_BASE}/api/workshop/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to mark notifications read");
  return data;
}

