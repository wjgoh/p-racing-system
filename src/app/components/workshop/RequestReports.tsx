import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";

interface ReportRequest {
  id: string;
  type: "performance" | "statistics" | "revenue" | "maintenance";
  requestedDate: string;
  status: "pending" | "approved" | "rejected";
  description: string;
  priority: "low" | "medium" | "high";
}

export function RequestReports() {
  const [reports, setReports] = useState<ReportRequest[]>([
    {
      id: "REQ001",
      type: "performance",
      requestedDate: "2026-02-04",
      status: "approved",
      description: "Monthly Performance Metrics",
      priority: "high",
    },
    {
      id: "REQ002",
      type: "statistics",
      requestedDate: "2026-02-03",
      status: "pending",
      description: "Job Completion Statistics",
      priority: "medium",
    },
    {
      id: "REQ003",
      type: "revenue",
      requestedDate: "2026-02-02",
      status: "rejected",
      description: "Revenue Analysis Q1",
      priority: "low",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    type: "performance",
    description: "",
    priority: "medium",
  });

  const handleRequestReport = () => {
    if (!newReport.description) {
      alert("Please fill in all fields");
      return;
    }

    const report: ReportRequest = {
      id: `REQ${String(reports.length + 1).padStart(3, "0")}`,
      type: newReport.type as
        | "performance"
        | "statistics"
        | "revenue"
        | "maintenance",
      requestedDate: new Date().toISOString().split("T")[0],
      status: "pending",
      description: newReport.description,
      priority: newReport.priority as "low" | "medium" | "high",
    };

    setReports([...reports, report]);
    setNewReport({
      type: "performance",
      description: "",
      priority: "medium",
    });
    setIsDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const stats = [
    {
      label: "Total Requests",
      value: reports.length,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: "Approved",
      value: reports.filter((r) => r.status === "approved").length,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Pending",
      value: reports.filter((r) => r.status === "pending").length,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Rejected",
      value: reports.filter((r) => r.status === "rejected").length,
      icon: AlertCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Report Requests</h2>
          <p className="text-muted-foreground">
            Request and track report generation from admin
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Request Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request New Report</DialogTitle>
              <DialogDescription>
                Submit a report request for admin approval
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Report Type</Label>
                <Select
                  value={newReport.type}
                  onValueChange={(value) =>
                    setNewReport({ ...newReport, type: value })
                  }
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">
                      Performance Metrics
                    </SelectItem>
                    <SelectItem value="statistics">Statistics</SelectItem>
                    <SelectItem value="revenue">Revenue Analysis</SelectItem>
                    <SelectItem value="maintenance">
                      Maintenance Report
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newReport.priority}
                  onValueChange={(value) =>
                    setNewReport({ ...newReport, priority: value })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Describe what you need in this report..."
                  value={newReport.description}
                  onChange={(e) =>
                    setNewReport({ ...newReport, description: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleRequestReport} className="w-full">
                Submit Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Reports Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No report requests yet
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">
                      {report.id}
                    </TableCell>
                    <TableCell className="capitalize">{report.type}</TableCell>
                    <TableCell>{report.description}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${
                          report.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : report.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {report.priority}
                      </span>
                    </TableCell>
                    <TableCell>{report.requestedDate}</TableCell>
                    <TableCell>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(
                          report.status,
                        )}`}
                      >
                        {getStatusIcon(report.status)}
                        <span className="capitalize">{report.status}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
