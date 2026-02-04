export type ReportRequestRecord = {
  request_id: number;
  workshop_id: number;
  workshop_name?: string | null;
  month: number;
  year: number;
  status: "pending" | "generated" | "rejected";
  invoice_count: number;
  total_revenue: number;
  paid_revenue: number;
  created_at: string;
  generated_at?: string | null;
};

export type YearlyReportMonth = {
  month: number;
  total_revenue: number;
  paid_revenue: number;
  invoice_count: number;
};

export type YearlyReport = {
  workshop_id: number;
  workshop_name?: string | null;
  year: number;
  months: YearlyReportMonth[];
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiRequestMonthlyReport(payload: {
  workshopId: number;
  month: number;
  year: number;
}) {
  const res = await fetch(`${API_BASE}/api/reports/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to request report");
  return data?.request as ReportRequestRecord;
}

export async function apiListWorkshopReportRequests(
  workshopId: number
): Promise<ReportRequestRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/reports/requests?workshopId=${workshopId}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load requests");
  return (data?.requests ?? []) as ReportRequestRecord[];
}

export async function apiListAdminReportRequests(params?: {
  status?: "pending" | "generated" | "rejected";
}): Promise<ReportRequestRecord[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  const query = search.toString();
  const res = await fetch(
    `${API_BASE}/api/admin/report-requests${query ? `?${query}` : ""}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load requests");
  return (data?.requests ?? []) as ReportRequestRecord[];
}

export async function apiGenerateReportRequest(requestId: number) {
  const res = await fetch(`${API_BASE}/api/admin/report-requests/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to generate report");
  return data?.request as ReportRequestRecord;
}

export async function apiGetYearlyWorkshopReport(params: {
  workshopId: number;
  year: number;
}): Promise<YearlyReport> {
  const search = new URLSearchParams();
  search.set("workshopId", String(params.workshopId));
  search.set("year", String(params.year));
  const res = await fetch(
    `${API_BASE}/api/admin/reports/yearly?${search.toString()}`
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load yearly report");
  return data as YearlyReport;
}
