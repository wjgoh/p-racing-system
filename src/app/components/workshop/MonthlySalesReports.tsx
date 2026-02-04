import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, FileText, Wallet } from "lucide-react";
import { format } from "date-fns";
import { getStoredUser } from "../api/session";
import {
  apiListWorkshopReportRequests,
  apiRequestMonthlyReport,
  type ReportRequestRecord,
} from "../api/reports";

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM dd, yyyy");
};

const getStatusClasses = (status: ReportRequestRecord["status"]) => {
  switch (status) {
    case "generated":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
};

export function MonthlySalesReports() {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [requests, setRequests] = useState<ReportRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<ReportRequestRecord | null>(null);

  const loadRequests = async () => {
    const user = getStoredUser();
    if (!user?.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiListWorkshopReportRequests(user.workshop_id);
      setRequests(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load report requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const handleRequest = async () => {
    const user = getStoredUser();
    if (!user?.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await apiRequestMonthlyReport({
        workshopId: user.workshop_id,
        month: Number(month),
        year: Number(year),
      });

      setRequests((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.request_id === created.request_id
        );
        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = created;
          return copy;
        }
        return [created, ...prev];
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to request report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = (request: ReportRequestRecord) => {
    setSelectedRequest(request);
    setDetailOpen(true);
  };

  const selectedMonthLabel = selectedRequest
    ? monthOptions.find(
        (option) => Number(option.value) === selectedRequest.month
      )?.label
    : "";

  const selectedTotals = selectedRequest
    ? {
        totalRevenue: Number(selectedRequest.total_revenue ?? 0),
        paidRevenue: Number(selectedRequest.paid_revenue ?? 0),
        invoiceCount: Number(selectedRequest.invoice_count ?? 0),
      }
    : { totalRevenue: 0, paidRevenue: 0, invoiceCount: 0 };

  const selectedOutstanding = Math.max(
    selectedTotals.totalRevenue - selectedTotals.paidRevenue,
    0
  );

  const selectedBreakdown = [
    { name: "Paid", value: selectedTotals.paidRevenue, color: "#10b981" },
    { name: "Outstanding", value: selectedOutstanding, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Performance Reports
          </h2>
          <p className="text-slate-600 mt-1">
            Track monthly sales performance and report requests.
          </p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>

      <Card className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label htmlFor="report-month">Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger id="report-month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="report-year">Year</Label>
            <Input
              id="report-year"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <Button
              onClick={handleRequest}
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting ? "Requesting..." : "Request Report"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Monthly Sales Report Requests */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Requested</TableHead>
                <TableHead className="hidden lg:table-cell">Generated</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Paid Revenue
                </TableHead>
              <TableHead className="text-right hidden lg:table-cell">
                Invoices
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">Loading requests...</p>
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No report requests yet
                  </p>
                </TableCell>
              </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell>
                      {monthOptions.find(
                        (option) => Number(option.value) === request.month
                      )?.label ?? request.month}
                    </TableCell>
                    <TableCell>{request.year}</TableCell>
                    <TableCell>
                      <Badge className={getStatusClasses(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(request.generated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(request.total_revenue ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      ${Number(request.paid_revenue ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {request.invoice_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetails(request)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Report Details
              {selectedRequest
                ? ` - ${selectedMonthLabel} ${selectedRequest.year}`
                : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.status === "generated"
                ? "Sales report is ready."
                : "Draft report pending admin approval."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getStatusClasses(selectedRequest.status)}>
                  {selectedRequest.status === "generated"
                    ? "generated"
                    : "draft"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Requested</p>
                  <p className="font-medium">
                    {formatDate(selectedRequest.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Generated</p>
                  <p className="font-medium">
                    {formatDate(selectedRequest.generated_at)}
                  </p>
                </div>
              </div>

              {selectedRequest.status === "generated" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Total Revenue
                          </p>
                          <p className="text-xl font-semibold">
                            ${selectedTotals.totalRevenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                            <TrendingUp className="h-4 w-4" />
                            Generated for this month
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Paid Revenue
                          </p>
                          <p className="text-xl font-semibold">
                            ${selectedTotals.paidRevenue.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                            <TrendingUp className="h-4 w-4" />
                            From paid invoices
                          </p>
                        </div>
                        <Wallet className="h-8 w-8 text-blue-600" />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Outstanding
                          </p>
                          <p className="text-xl font-semibold">
                            ${selectedOutstanding.toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                            <TrendingUp className="h-4 w-4" />
                            Awaiting payment
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-orange-600" />
                      </div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Invoices
                          </p>
                          <p className="text-xl font-semibold">
                            {selectedTotals.invoiceCount}
                          </p>
                          <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                            <TrendingUp className="h-4 w-4" />
                            Total issued invoices
                          </p>
                        </div>
                        <FileText className="h-8 w-8 text-purple-600" />
                      </div>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h3 className="text-base font-semibold mb-4">
                        Revenue Summary
                      </h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart
                          data={[
                            {
                              label: selectedMonthLabel || "Report",
                              total: selectedTotals.totalRevenue,
                              paid: selectedTotals.paidRevenue,
                            },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line
                            type="monotone"
                            dataKey="total"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Total Revenue"
                          />
                          <Line
                            type="monotone"
                            dataKey="paid"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Paid Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                    <Card className="p-4">
                      <h3 className="text-base font-semibold mb-4">
                        Revenue Breakdown
                      </h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={selectedBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={90}
                            dataKey="value"
                          >
                            {selectedBreakdown.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This report is still in draft. It will be finalized once the
                  admin approves it.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
