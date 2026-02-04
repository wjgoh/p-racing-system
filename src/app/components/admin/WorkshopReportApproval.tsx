import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
import { Textarea } from "../ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  AlertCircle,
  FileText,
} from "lucide-react";

interface ReportRequest {
  id: string;
  workshopId: string;
  workshopName: string;
  type: "performance" | "statistics" | "revenue" | "maintenance";
  requestedDate: string;
  status: "pending" | "approved" | "rejected";
  description: string;
  priority: "low" | "medium" | "high";
  adminNotes?: string;
}

export function WorkshopReportApproval() {
  const [requests, setRequests] = useState<ReportRequest[]>([
    {
      id: "REQ001",
      workshopId: "WS001",
      workshopName: "Downtown Workshop",
      type: "performance",
      requestedDate: "2026-02-04",
      status: "pending",
      description: "Monthly Performance Metrics",
      priority: "high",
    },
    {
      id: "REQ002",
      workshopId: "WS002",
      workshopName: "Central Mechanics",
      type: "statistics",
      requestedDate: "2026-02-03",
      status: "pending",
      description: "Job Completion Statistics",
      priority: "medium",
    },
    {
      id: "REQ003",
      workshopId: "WS001",
      workshopName: "Downtown Workshop",
      type: "revenue",
      requestedDate: "2026-02-02",
      status: "approved",
      description: "Revenue Analysis Q1",
      priority: "low",
      adminNotes: "Report data compiled and sent",
    },
  ]);

  const [selectedRequest, setSelectedRequest] = useState<ReportRequest | null>(
    null,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const handleApprove = (id: string) => {
    setRequests(
      requests.map((req) =>
        req.id === id ? { ...req, status: "approved", adminNotes } : req,
      ),
    );
    setAdminNotes("");
  };

  const handleReject = (id: string) => {
    setRequests(
      requests.map((req) =>
        req.id === id ? { ...req, status: "rejected", adminNotes } : req,
      ),
    );
    setAdminNotes("");
  };

  const handleSendReport = (id: string) => {
    // This would trigger sending the report to the workshop
    console.log(`Sending report ${id} to workshop`);
    alert(`Report ${id} has been sent to the workshop`);
  };

  const viewDetails = (request: ReportRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setIsDetailsDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
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
      value: requests.length,
      icon: FileText,
      color: "text-blue-600",
    },
    {
      label: "Pending Approval",
      value: requests.filter((r) => r.status === "pending").length,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Approved",
      value: requests.filter((r) => r.status === "approved").length,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Rejected",
      value: requests.filter((r) => r.status === "rejected").length,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Workshop Report Approval
        </h2>
        <p className="text-muted-foreground">
          Review and approve workshop report requests
        </p>
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

      {/* Requests Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Workshop</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">No report requests</p>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">
                      {request.id}
                    </TableCell>
                    <TableCell>{request.workshopName}</TableCell>
                    <TableCell className="capitalize">{request.type}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${
                          request.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : request.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {request.priority}
                      </span>
                    </TableCell>
                    <TableCell>{request.requestedDate}</TableCell>
                    <TableCell>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(
                          request.status,
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewDetails(request)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Report Request Details</DialogTitle>
                              <DialogDescription>
                                Review and manage this report request
                              </DialogDescription>
                            </DialogHeader>

                            {selectedRequest && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Request ID
                                    </Label>
                                    <p className="font-mono text-sm font-semibold">
                                      {selectedRequest.id}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Workshop
                                    </Label>
                                    <p className="font-semibold">
                                      {selectedRequest.workshopName}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Report Type
                                    </Label>
                                    <p className="font-semibold capitalize">
                                      {selectedRequest.type}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Priority
                                    </Label>
                                    <p
                                      className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${
                                        selectedRequest.priority === "high"
                                          ? "bg-red-100 text-red-700"
                                          : selectedRequest.priority ===
                                              "medium"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {selectedRequest.priority}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Description
                                  </Label>
                                  <p className="mt-1">
                                    {selectedRequest.description}
                                  </p>
                                </div>

                                <div>
                                  <Label htmlFor="admin-notes">
                                    Admin Notes
                                  </Label>
                                  <Textarea
                                    id="admin-notes"
                                    placeholder="Add notes for the workshop..."
                                    value={adminNotes}
                                    onChange={(e) =>
                                      setAdminNotes(e.target.value)
                                    }
                                    className="mt-2"
                                  />
                                </div>

                                {selectedRequest.status === "pending" && (
                                  <div className="flex gap-3">
                                    <Button
                                      variant="default"
                                      className="gap-2 flex-1"
                                      onClick={() => {
                                        handleApprove(selectedRequest.id);
                                        setIsDetailsDialogOpen(false);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      className="gap-2 flex-1"
                                      onClick={() => {
                                        handleReject(selectedRequest.id);
                                        setIsDetailsDialogOpen(false);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Reject
                                    </Button>
                                  </div>
                                )}

                                {selectedRequest.status === "approved" && (
                                  <Button
                                    className="w-full gap-2"
                                    onClick={() => {
                                      handleSendReport(selectedRequest.id);
                                      setIsDetailsDialogOpen(false);
                                    }}
                                  >
                                    <Send className="h-4 w-4" />
                                    Send Report to Workshop
                                  </Button>
                                )}

                                {selectedRequest.status === "rejected" && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                    <p className="text-sm text-red-700">
                                      This request has been rejected
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
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
