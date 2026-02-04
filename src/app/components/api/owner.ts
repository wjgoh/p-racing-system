export async function apiGetServiceHistory(ownerId: number) {
  const response = await fetch(
    `http://localhost:4000/api/service-history?ownerId=${ownerId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch service history");
  const data = await response.json();
  return data.records || [];
}

export async function apiGetUserProfile(userId: number) {
  const response = await fetch(
    `http://localhost:4000/api/user-profile?userId=${userId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch user profile");
  const data = await response.json();
  return data.user;
}

export async function apiUpdateUserProfile(
  userId: number,
  profileData: {
    name: string;
    email: string;
    phone?: string;
  },
) {
  const response = await fetch(
    `http://localhost:4000/api/user-profile/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    },
  );
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
}

export async function apiGetNotifications(userId: number) {
  const response = await fetch(
    `http://localhost:4000/api/notifications?userId=${userId}`,
  );
  if (!response.ok) throw new Error("Failed to fetch notifications");
  const data = await response.json();
  return data.notifications || [];
}

export async function apiCreateReportRequest(reportData: {
  workshopId: number;
  type: string;
  description: string;
  priority: string;
}) {
  const response = await fetch("http://localhost:4000/api/report-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error("Failed to create report request");
  return response.json();
}

export async function apiGetReportRequests(status?: string) {
  let url = "http://localhost:4000/api/report-requests";
  if (status) url += `?status=${status}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch report requests");
  const data = await response.json();
  return data.requests || [];
}

export async function apiUpdateReportRequest(
  id: number,
  updateData: {
    status: string;
    adminNotes?: string;
  },
) {
  const response = await fetch(
    `http://localhost:4000/api/report-requests/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    },
  );
  if (!response.ok) throw new Error("Failed to update report request");
  return response.json();
}
