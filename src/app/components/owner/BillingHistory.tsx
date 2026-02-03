import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
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
  Receipt,
  Download,
  Eye,
  CreditCard,
  DollarSign,
  FileText,
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
  vehicle: string;
  serviceType: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "paid" | "pending" | "overdue";
  date: Date;
  dueDate?: Date;
  paidDate?: Date;
}

const formatInvoiceId = (id: number) => `INV-${String(id).padStart(4, "0")}`;

const formatVehicle = (invoice: InvoiceRecord) => {
  const parts = [invoice.make, invoice.model, invoice.year]
    .filter(Boolean)
    .join(" ");
  const plate = invoice.plate_number ? ` (${invoice.plate_number})` : "";
  return `${parts || "Vehicle"}${plate}`;
};

const mapOwnerStatus = (
  status: InvoiceRecord["status"]
): Invoice["status"] => {
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return "pending";
};

export function BillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    const user = getStoredUser();
    if (!user) {
      setError("No active session. Please sign in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiListInvoices({ ownerId: user.user_id });
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
          vehicle: formatVehicle(inv),
          serviceType: inv.service_type ?? "Service",
          items,
          subtotal,
          tax,
          total,
          status: mapOwnerStatus(inv.status),
          date: new Date(inv.created_at),
          dueDate: inv.due_date ? new Date(inv.due_date) : undefined,
          paidDate: inv.paid_date ? new Date(inv.paid_date) : undefined,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalPending = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + inv.total, 0);

  const handlePayInvoice = async (invoiceId: number) => {
    if (payingId) return;
    setPayingId(invoiceId);
    setError(null);
    try {
      await apiUpdateInvoiceStatus({ invoiceId, status: "paid" });
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.invoiceId === invoiceId
            ? { ...inv, status: "paid", paidDate: new Date() }
            : inv
        )
      );
      setDetailsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to pay invoice");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Billing History</h2>
        <p className="text-slate-600 mt-1">
          View and manage your service invoices
        </p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Paid</p>
              <p className="text-2xl font-semibold text-green-600">
                ${totalPaid.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <CreditCard className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">
                ${totalPending.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Invoices</p>
              <p className="text-2xl font-semibold text-slate-900">
                {invoices.length}
              </p>
            </div>
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
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
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
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg">{invoice.id}</h3>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Vehicle: </span>
                    <span className="font-medium">{invoice.vehicle}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Service: </span>
                    <span className="font-medium">{invoice.serviceType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date: </span>
                    <span className="font-medium">
                      {format(invoice.date, "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Amount: </span>
                    <span className="font-semibold text-lg text-blue-600">
                      ${invoice.total.toFixed(2)}
                    </span>
                  </div>
                  {invoice.status === "pending" && invoice.dueDate && (
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Due Date: </span>
                      <span className="font-medium text-yellow-600">
                        {format(invoice.dueDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
                  {invoice.paidDate && (
                    <div className="md:col-span-2">
                      <span className="text-slate-500">Paid On: </span>
                      <span className="font-medium text-green-600">
                        {format(invoice.paidDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                  )}
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
                  View
                </Button>
                <Button variant="outline" className="flex-1 md:flex-none gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {invoice.status === "pending" && (
                  <Button
                    onClick={() => handlePayInvoice(invoice.invoiceId)}
                    className="flex-1 md:flex-none gap-2"
                    disabled={payingId === invoice.invoiceId}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay Now
                  </Button>
                )}
              </div>
            </div>
            </Card>
          ))
        )}

        {!loading && filteredInvoices.length === 0 && (
          <Card className="p-12 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
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
                  <Label className="text-slate-500">Vehicle</Label>
                  <p className="font-medium">{selectedInvoice.vehicle}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Service Type</Label>
                  <p className="font-medium">{selectedInvoice.serviceType}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Invoice Date</Label>
                  <p className="font-medium">
                    {format(selectedInvoice.date, "MMMM dd, yyyy")}
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            {selectedInvoice?.status === "pending" && (
              <Button
                onClick={() =>
                  selectedInvoice && handlePayInvoice(selectedInvoice.invoiceId)
                }
                className="gap-2"
                disabled={payingId === selectedInvoice.invoiceId}
              >
                <CreditCard className="h-4 w-4" />
                Pay Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
