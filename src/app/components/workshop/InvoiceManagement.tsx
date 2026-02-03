import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { apiListInvoices, apiUpdateInvoiceStatus, type InvoiceRecord } from "../api/invoices";
import { getStoredUser } from "../api/session";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  invoiceId: number;
  id: string;
  jobId: string;
  customerName: string;
  vehicle: string;
  mechanic: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "pending" | "approved" | "rejected" | "paid";
  createdAt: Date;
  notes?: string;
}

const formatInvoiceId = (id: number) => `INV-${String(id).padStart(4, "0")}`;
const formatJobId = (id: number | null) =>
  id ? `J${String(id).padStart(3, "0")}` : "-";

const formatVehicle = (invoice: InvoiceRecord) => {
  const parts = [invoice.make, invoice.model, invoice.year]
    .filter(Boolean)
    .join(" ");
  const plate = invoice.plate_number ? ` (${invoice.plate_number})` : "";
  return `${parts || "Vehicle"}${plate}`;
};

const mapWorkshopStatus = (
  status: InvoiceRecord["status"]
): Invoice["status"] => {
  if (
    status === "draft" ||
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "paid"
  ) {
    return status;
  }
  return "pending";
};

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadInvoices = async () => {
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiListInvoices({ workshopId: user.workshop_id });
      const mapped = data.map((inv) => {
        const items = (inv.items ?? []).map((item) => {
          const qty = Number(item.quantity ?? 0);
          const unit = Number(item.unit_price ?? 0);
          const total = Number(item.total ?? qty * unit);
          return {
            description: item.description,
            quantity: qty,
            unitPrice: unit,
            total,
          };
        });
        const computedSubtotal = items.reduce((sum, item) => sum + item.total, 0);
        const subtotal = Number(inv.subtotal ?? computedSubtotal);
        const tax = Number(inv.tax ?? 0);
        const total = Number(inv.total_amount ?? subtotal + tax);
        return {
          invoiceId: inv.invoice_id,
          id: formatInvoiceId(inv.invoice_id),
          jobId: formatJobId(inv.job_id ?? null),
          customerName: inv.owner_name ?? "Customer",
          vehicle: formatVehicle(inv),
          mechanic: inv.mechanic_name ?? "Unassigned",
          items,
          subtotal,
          tax,
          total,
          status: mapWorkshopStatus(inv.status),
          createdAt: new Date(inv.created_at),
          notes: inv.notes ?? undefined,
        } as Invoice;
      });
      setInvoices(mapped);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) => filterStatus === "all" || inv.status === filterStatus
  );

  const handleApprove = async (invoiceId: number) => {
    if (statusUpdatingId) return;
    setStatusUpdatingId(invoiceId);
    setError(null);
    try {
      await apiUpdateInvoiceStatus({ invoiceId, status: "approved" });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoiceId ? { ...inv, status: "approved" } : inv
        )
      );
      setDetailsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to approve invoice");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleReject = async (invoiceId: number) => {
    if (statusUpdatingId) return;
    setStatusUpdatingId(invoiceId);
    setError(null);
    try {
      await apiUpdateInvoiceStatus({
        invoiceId,
        status: "rejected",
        notes: rejectionReason || null,
      });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoiceId
            ? { ...inv, status: "rejected", notes: rejectionReason || inv.notes }
            : inv
        )
      );
      setRejectionReason("");
      setDetailsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to reject invoice");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "paid":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const pendingCount = invoices.filter((i) => i.status === "pending").length;
  const approvedCount = invoices.filter((i) => i.status === "approved").length;
  const totalPending = invoices
    .filter((i) => i.status === "pending")
    .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Invoice Management
        </h2>
        <p className="text-slate-600 mt-1">
          Review, validate, and finalize customer invoices
        </p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <p className="text-sm">Pending Review</p>
            </div>
            <p className="text-2xl font-semibold text-yellow-600">{pendingCount}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle className="h-4 w-4" />
              <p className="text-sm">Approved</p>
            </div>
            <p className="text-2xl font-semibold text-green-600">{approvedCount}</p>
          </div>
        </Card>
        <Card className="p-4 md:col-span-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign className="h-4 w-4" />
              <p className="text-sm">Pending Amount</p>
            </div>
            <p className="text-2xl font-semibold text-blue-600">
              ${totalPending.toFixed(2)}
            </p>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-slate-500">Loading invoices...</p>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{invoice.id}</h3>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                    <Badge variant="outline">Job #{invoice.jobId}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Customer: </span>
                      <span className="font-medium">{invoice.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{invoice.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Mechanic: </span>
                      <span className="font-medium">{invoice.mechanic}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Date: </span>
                      <span className="font-medium">
                        {format(invoice.createdAt, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Total Amount: </span>
                      <span className="font-semibold text-lg text-blue-600">
                        ${invoice.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setDetailsDialogOpen(true);
                    }}
                    className="flex-1 md:flex-none gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Review
                  </Button>
                  {invoice.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleApprove(invoice.invoiceId)}
                        className="flex-1 md:flex-none gap-2"
                        disabled={statusUpdatingId === invoice.invoiceId}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
            </Card>
          ))
        )}

        {!loading && filteredInvoices.length === 0 && (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No invoices found</p>
          </Card>
        )}
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-slate-500">Customer</Label>
                  <p className="font-medium">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Vehicle</Label>
                  <p className="font-medium">{selectedInvoice.vehicle}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Job ID</Label>
                  <p className="font-medium">{selectedInvoice.jobId}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Mechanic</Label>
                  <p className="font-medium">{selectedInvoice.mechanic}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Date</Label>
                  <p className="font-medium">
                    {format(selectedInvoice.createdAt, "MMMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <Label className="mb-3 block">Invoice Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">
                    ${selectedInvoice.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax (10%):</span>
                  <span className="font-medium">
                    ${selectedInvoice.tax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-slate-200">
                  <span>Total:</span>
                  <span className="text-blue-600">
                    ${selectedInvoice.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <Label className="mb-2 block">Notes</Label>
                  <p className="p-3 bg-slate-50 rounded-lg text-sm">
                    {selectedInvoice.notes}
                  </p>
                </div>
              )}

              {/* Rejection Reason (if rejecting) */}
              {selectedInvoice.status === "pending" && (
                <div>
                  <Label htmlFor="rejection-reason">
                    Rejection Reason (Optional)
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Provide a reason for rejecting this invoice..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedInvoice?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedInvoice && handleReject(selectedInvoice.invoiceId)
                  }
                  className="gap-2"
                  disabled={statusUpdatingId === selectedInvoice.invoiceId}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() =>
                    selectedInvoice && handleApprove(selectedInvoice.invoiceId)
                  }
                  className="gap-2"
                  disabled={statusUpdatingId === selectedInvoice.invoiceId}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {selectedInvoice?.status !== "pending" && (
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
