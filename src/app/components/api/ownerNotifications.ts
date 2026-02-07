const API_BASE = "http://127.0.0.1:4000";

export type OwnerNotificationEvent = {
  notification_id: number;
  owner_id: number;
  source: "admin" | "workshop" | "system" | string;
  event_type: string;
  title: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};

export type OwnerServiceReminder = {
  id: string;
  type: "service";
  title: string;
  message: string;
  due_date?: string | null;
};

export async function apiListOwnerNotifications(ownerId: number): Promise<{
  events: OwnerNotificationEvent[];
  reminders: OwnerServiceReminder[];
}> {
  const res = await fetch(`${API_BASE}/api/owner/notifications?ownerId=${ownerId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load notifications");
  return {
    events: (data?.events ?? []) as OwnerNotificationEvent[],
    reminders: (data?.reminders ?? []) as OwnerServiceReminder[],
  };
}

export async function apiMarkOwnerNotificationsRead(payload: {
  ownerId: number;
  notificationIds?: number[];
}) {
  const res = await fetch(`${API_BASE}/api/owner/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to mark notifications read");
  return data;
}

