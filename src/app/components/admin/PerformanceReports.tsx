import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import {
  apiGenerateReportRequest,
  apiGetYearlyWorkshopReport,
  apiListAdminReportRequests,
  type ReportRequestRecord,
  type YearlyReport,
} from "../api/reports";
import { apiListWorkshops, type Workshop } from "../api/auth";

const monthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatReportDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM dd, yyyy");
};

const getReportStatusClasses = (status: ReportRequestRecord["status"]) => {
  switch (status) {
    case "generated":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    default:
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
};

export function PerformanceReports() {
  const [reportStatus, setReportStatus] = useState<
    "pending" | "generated" | "rejected" | "all"
  >("pending");
  const [requests, setRequests] = useState<ReportRequestRecord[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const [workshopsError, setWorkshopsError] = useState<string | null>(null);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyError, setYearlyError] = useState<string | null>(null);

  const loadRequests = async (status: typeof reportStatus) => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const data = await apiListAdminReportRequests({
        status: status === "all" ? undefined : status,
      });
      setRequests(data);
    } catch (err: any) {
      setRequestsError(err?.message ?? "Failed to load report requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadWorkshops = async () => {
    setWorkshopsLoading(true);
    setWorkshopsError(null);
    try {
      const data = await apiListWorkshops();
      setWorkshops(data);
    } catch (err: any) {
      setWorkshopsError(err?.message ?? "Failed to load workshops");
    } finally {
      setWorkshopsLoading(false);
    }
  };

  const loadYearlyReport = async (workshopId: string, year: string) => {
    const parsedWorkshopId = Number(workshopId);
    const parsedYear = Number(year);
    if (Number.isNaN(parsedWorkshopId) || Number.isNaN(parsedYear)) {
      setYearlyError("Select a valid workshop and year.");
      return;
    }
    setYearlyLoading(true);
    setYearlyError(null);
    try {
      const data = await apiGetYearlyWorkshopReport({
        workshopId: parsedWorkshopId,
        year: parsedYear,
      });
      setYearlyReport(data);
    } catch (err: any) {
      setYearlyError(err?.message ?? "Failed to load yearly report");
    } finally {
      setYearlyLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests(reportStatus);
  }, [reportStatus]);

  useEffect(() => {
    void loadWorkshops();
  }, []);

  useEffect(() => {
    if (!selectedWorkshopId) return;
    void loadYearlyReport(selectedWorkshopId, selectedYear);
  }, [selectedWorkshopId, selectedYear]);

  const handleGenerate = async (requestId: number) => {
    if (generatingId) return;
    setGeneratingId(requestId);
    setRequestsError(null);
    try {
      const updated = await apiGenerateReportRequest(requestId);
      setRequests((prev) => {
        if (reportStatus === "pending") {
          return prev.filter((item) => item.request_id !== updated.request_id);
        }
        return prev.map((item) =>
          item.request_id === updated.request_id ? updated : item
        );
      });
    } catch (err: any) {
      setRequestsError(err?.message ?? "Failed to generate report");
    } finally {
      setGeneratingId(null);
    }
  };

  const yearlySeries = useMemo(() => {
    if (!yearlyReport) return [];
    return yearlyReport.months.map((month) => ({
      label: monthLabels[month.month - 1]?.slice(0, 3) ?? `M${month.month}`,
      total: Number(month.total_revenue ?? 0),
      paid: Number(month.paid_revenue ?? 0),
      invoices: Number(month.invoice_count ?? 0),
      month: month.month,
    }));
  }, [yearlyReport]);

  const yearlyTotals = useMemo(() => {
    const totalRevenue = yearlySeries.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const paidRevenue = yearlySeries.reduce(
      (sum, item) => sum + item.paid,
      0
    );
    const invoiceCount = yearlySeries.reduce(
      (sum, item) => sum + item.invoices,
      0
    );
    return { totalRevenue, paidRevenue, invoiceCount };
  }, [yearlySeries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Performance Reports</h1>
          <p className="text-muted-foreground">
            Monitor business performance and analytics
          </p>
        </div>
      </div>

      {/* Monthly Sales Report Requests */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold">
              Monthly Sales Report Requests
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Generate monthly sales reports for each workshop.
            </p>
            {requestsError && (
              <p className="text-sm text-red-500 mt-2">{requestsError}</p>
            )}
          </div>
          <div className="w-full md:w-48">
            <Label htmlFor="report-status">Status</Label>
            <Select
              value={reportStatus}
              onValueChange={(value) =>
                setReportStatus(
                  value as "pending" | "generated" | "rejected" | "all"
                )
              }
            >
              <SelectTrigger id="report-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workshop</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Requested</TableHead>
                <TableHead className="hidden lg:table-cell">Generated</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden md:table-cell">
                  Paid
                </TableHead>
                <TableHead className="text-right hidden xl:table-cell">
                  Invoices
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requestsLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Loading report requests...
                    </p>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No report requests found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.request_id}>
                    <TableCell className="font-medium">
                      {request.workshop_name ?? `Workshop #${request.workshop_id}`}
                    </TableCell>
                    <TableCell>
                      {monthLabels[request.month - 1] ?? `Month ${request.month}`}
                    </TableCell>
                    <TableCell>{request.year}</TableCell>
                    <TableCell>
                      <Badge className={getReportStatusClasses(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatReportDate(request.created_at)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatReportDate(request.generated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(request.total_revenue ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      ${Number(request.paid_revenue ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell">
                      {request.invoice_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === "pending" ? (
                        <Button
                          size="sm"
                          onClick={() => handleGenerate(request.request_id)}
                          disabled={generatingId === request.request_id}
                        >
                          {generatingId === request.request_id
                            ? "Approving..."
                            : "Approve"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Generated
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Yearly Workshop Report */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold">
              Yearly Workshop Report
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Select a workshop to view its yearly sales summary.
            </p>
            {(workshopsError || yearlyError) && (
              <p className="text-sm text-red-500 mt-2">
                {workshopsError ?? yearlyError}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="w-full sm:w-56">
              <Label htmlFor="workshop-select">Workshop</Label>
              <Select
                value={selectedWorkshopId}
                onValueChange={setSelectedWorkshopId}
                disabled={workshopsLoading}
              >
                <SelectTrigger id="workshop-select">
                  <SelectValue
                    placeholder={
                      workshopsLoading ? "Loading workshops..." : "Select workshop"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem
                      key={workshop.workshop_id}
                      value={String(workshop.workshop_id)}
                    >
                      {workshop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-32">
              <Label htmlFor="year-select">Year</Label>
              <Input
                id="year-select"
                type="number"
                min="2000"
                max="2100"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              />
            </div>
          </div>
        </div>

        {selectedWorkshopId ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-semibold">
                    ${yearlyTotals.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Paid Revenue</p>
                  <p className="text-xl font-semibold text-green-600">
                    ${yearlyTotals.paidRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
              {yearlyLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading yearly report...
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearlySeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Revenue" />
                    <Bar dataKey="paid" fill="#10b981" name="Paid Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoices</p>
                  <p className="text-2xl font-semibold">
                    {yearlyTotals.invoiceCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-xl font-semibold text-orange-600">
                    $
                    {Math.max(
                      yearlyTotals.totalRevenue - yearlyTotals.paidRevenue,
                      0
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlySeries.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell>
                          {monthLabels[month.month - 1] ?? `Month ${month.month}`}
                        </TableCell>
                        <TableCell className="text-right">
                          ${month.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          ${month.paid.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {month.invoices}
                        </TableCell>
                      </TableRow>
                    ))}
                    {yearlySeries.length === 0 && !yearlyLoading && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6">
                          <p className="text-sm text-muted-foreground">
                            No yearly data available.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="mt-6">
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Select a workshop to view the yearly report.
              </p>
            </Card>
          </div>
        )}
      </Card>

    </div>
  );
}
