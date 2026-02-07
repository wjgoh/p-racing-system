export type InvoiceItemRecord = {
  item_id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number | string | null;
  total: number | string | null;
};

export type InvoiceRecord = {
  invoice_id: number;
  job_id: number | null;
  owner_id: number;
  workshop_id: number;
  subtotal: number | string | null;
  tax: number | string | null;
  total_amount: number | string | null;
  status: "draft" | "pending" | "approved" | "rejected" | "paid" | "overdue";
  created_at: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  owner_name?: string | null;
  mechanic_name?: string | null;
  service_type?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  plate_number?: string | null;
  items: InvoiceItemRecord[];
};

const API_BASE = "http://127.0.0.1:4000";

export async function apiListInvoices(params: {
  ownerId?: number;
  workshopId?: number;
}): Promise<InvoiceRecord[]> {
  const search = new URLSearchParams();
  if (params.ownerId) search.set("ownerId", String(params.ownerId));
  if (params.workshopId) search.set("workshopId", String(params.workshopId));
  const res = await fetch(`${API_BASE}/api/invoices?${search.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to load invoices");
  return (data?.invoices ?? []) as InvoiceRecord[];
}

export async function apiUpdateInvoiceStatus(payload: {
  invoiceId: number;
  status: "draft" | "pending" | "approved" | "rejected" | "paid" | "overdue";
  notes?: string | null;
}) {
  const res = await fetch(`${API_BASE}/api/invoices/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Failed to update invoice");
  return data;
}

export async function apiDownloadInvoicePdf(invoiceId: number): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/api/invoices/pdf?invoiceId=${encodeURIComponent(
      String(invoiceId)
    )}`
  );

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      throw new Error(data?.error ?? "Failed to download invoice PDF");
    }
    throw new Error("Failed to download invoice PDF");
  }

  return await res.blob();
}
