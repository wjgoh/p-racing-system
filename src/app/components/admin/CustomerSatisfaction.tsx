import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Search,
  TrendingUp,
  Trash2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import {
  apiDeleteAdminRating,
  apiListAdminRatings,
  apiListAdminRatingRequests,
  apiResolveAdminRatingRequest,
  apiUpdateAdminRating,
  type AdminRatingRecord,
  type AdminRatingRequestRecord,
} from "../api/adminFeedback";

type FeedbackStatus = "new" | "reviewed" | "resolved";

interface Feedback {
  ratingId: number;
  bookingId: number | null;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  date: Date;
  status: FeedbackStatus;
  mechanicName: string;
  response: string | null;
  vehicle: string;
  workshopName: string | null;
}

interface RatingRequest {
  requestId: number;
  ratingId: number | null;
  workshopName: string;
  customerName: string;
  serviceName: string;
  rating: number | null;
  comment: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  adminNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

const formatVehicleLabel = (record: Pick<
  AdminRatingRecord,
  "year" | "make" | "model" | "plate_number"
>) => {
  const year = record.year ? `${record.year} ` : "";
  const make = record.make ?? "";
  const model = record.model ?? "";
  const plate = record.plate_number ? ` (${record.plate_number})` : "";
  const label = `${year}${make} ${model}`.trim();
  return `${label || "Vehicle"}${plate}`;
};

const mapRatingRecord = (record: AdminRatingRecord): Feedback => ({
  ratingId: record.rating_id,
  bookingId: record.booking_id ?? null,
  customerName: record.customer_name ?? "Customer",
  serviceName: record.service_type ?? "Service",
  rating: Number(record.rating ?? 0),
  comment: record.comment ?? "",
  date: record.created_at ? new Date(record.created_at) : new Date(),
  status: record.status ?? "new",
  mechanicName: record.mechanic_name ?? "-",
  response: record.response ?? null,
  vehicle: formatVehicleLabel(record),
  workshopName: record.workshop_name ?? null,
});

const mapRequestRecord = (record: AdminRatingRequestRecord): RatingRequest => ({
  requestId: record.request_id,
  ratingId: record.rating_id ?? null,
  workshopName: record.workshop_name ?? "Workshop",
  customerName: record.customer_name ?? "Customer",
  serviceName: record.service_type ?? "Service",
  rating: record.rating ?? null,
  comment: record.comment ?? "",
  reason: record.reason ?? "",
  status: record.status ?? "pending",
  adminNotes: record.admin_notes ?? null,
  createdAt: record.created_at ? new Date(record.created_at) : new Date(),
  resolvedAt: record.resolved_at ? new Date(record.resolved_at) : null,
});

export function CustomerSatisfaction() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [requestList, setRequestList] = useState<RatingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<FeedbackStatus>("new");
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RatingRequest | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setRequestLoading(true);
    setError(null);
    try {
      const [ratingRows, requestRows] = await Promise.all([
        apiListAdminRatings(),
        apiListAdminRatingRequests(),
      ]);
      setFeedbackList(ratingRows.map(mapRatingRecord));
      setRequestList(requestRows.map(mapRequestRecord));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load feedback");
    } finally {
      setLoading(false);
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Calculate statistics
  const totalFeedback = feedbackList.length;
  const averageRating = totalFeedback
    ? (
        feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      ).toFixed(1)
    : "0.0";
  const positiveRatings = feedbackList.filter((f) => f.rating >= 4).length;
  const negativeRatings = feedbackList.filter((f) => f.rating <= 2).length;
  const satisfactionRate = totalFeedback
    ? ((positiveRatings / totalFeedback) * 100).toFixed(1)
    : "0.0";

  // Rating distribution data
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating: `${rating} stars`,
    count: feedbackList.filter((f) => f.rating === rating).length,
  }));

  const pendingRequests = requestList.filter((r) => r.status === "pending").length;

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setEditStatus(feedback.status);
    setEditRating(feedback.rating);
    setEditComment(feedback.comment);
    setResponseText(feedback.response ?? "");
    setIsDialogOpen(true);
  };

  const handleSaveFeedback = async () => {
    if (!selectedFeedback || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiUpdateAdminRating({
        ratingId: selectedFeedback.ratingId,
        rating: editRating,
        comment: editComment,
        response: responseText,
        status: editStatus,
      });
      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update feedback");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!selectedFeedback || deleting) return;
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      await apiDeleteAdminRating(selectedFeedback.ratingId);
      await loadData();
      setIsDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to delete feedback");
    } finally {
      setDeleting(false);
    }
  };

  const filteredFeedback = feedbackList.filter((feedback) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      feedback.customerName.toLowerCase().includes(searchLower) ||
      feedback.serviceName.toLowerCase().includes(searchLower) ||
      feedback.mechanicName.toLowerCase().includes(searchLower) ||
      feedback.comment.toLowerCase().includes(searchLower);
    const matchesRating =
      filterRating === "all" || feedback.rating === parseInt(filterRating, 10);
    const matchesStatus =
      filterStatus === "all" || feedback.status === filterStatus;
    return matchesSearch && matchesRating && matchesStatus;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const renderEditableStars = (rating: number, onChange: (value: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
            aria-label={`${star} star`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getStatusBadgeVariant = (status: Feedback["status"]) => {
    switch (status) {
      case "new":
        return "default";
      case "reviewed":
        return "secondary";
      case "resolved":
        return "outline";
      default:
        return "default";
    }
  };

  const getRequestStatusBadge = (status: RatingRequest["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "deleted":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleViewRequest = (request: RatingRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes ?? "");
    setRequestDialogOpen(true);
  };

  const handleResolveRequest = async (
    action: "approved" | "rejected" | "deleted"
  ) => {
    if (!selectedRequest || resolving) return;
    setResolving(true);
    setError(null);
    try {
      await apiResolveAdminRatingRequest({
        requestId: selectedRequest.requestId,
        action,
        adminNotes: adminNotes.trim() ? adminNotes.trim() : null,
      });
      await loadData();
      setRequestDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to resolve request");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Customer Satisfaction</h1>
        <p className="text-muted-foreground">
          Monitor feedback and ratings from customers
        </p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-2xl md:text-3xl font-bold">{averageRating}</p>
              <div className="flex gap-1 mt-2">
                {renderStars(Math.round(parseFloat(averageRating)))}
              </div>
            </div>
            <Star className="h-10 w-10 md:h-12 md:w-12 text-yellow-400 fill-yellow-400" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Satisfaction Rate</p>
              <p className="text-2xl md:text-3xl font-bold">{satisfactionRate}%</p>
              <p className="text-xs md:text-sm text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                Trending positive
              </p>
            </div>
            <ThumbsUp className="h-10 w-10 md:h-12 md:w-12 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Positive Reviews</p>
              <p className="text-2xl md:text-3xl font-bold">{positiveRatings}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-2">
                4+ star ratings
              </p>
            </div>
            <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Needs Attention</p>
              <p className="text-2xl md:text-3xl font-bold">{negativeRatings}</p>
              <p className="text-xs md:text-sm text-red-600 mt-2">
                {"Low ratings (<= 2 stars)"}
              </p>
            </div>
            <ThumbsDown className="h-10 w-10 md:h-12 md:w-12 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Rating Distribution Chart */}
      <Card className="p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-4">Rating Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={ratingDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" name="Number of Reviews" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Deletion Requests */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h3 className="text-base md:text-lg font-semibold">Deletion Requests</h3>
            <p className="text-sm text-muted-foreground">
              Workshops can request review removals when disputes arise
            </p>
          </div>
          <Badge className="w-fit bg-yellow-100 text-yellow-700 border border-yellow-200">
            Pending: {pendingRequests}
          </Badge>
        </div>

        {requestLoading && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Loading requests...</p>
          </Card>
        )}

        {!requestLoading && requestList.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No deletion requests yet</p>
          </Card>
        )}

        {!requestLoading &&
          requestList.map((request) => (
            <Card key={request.requestId} className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-base">
                      {request.customerName}
                    </h4>
                    <Badge className={getRequestStatusBadge(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Workshop:</strong> {request.workshopName}
                    </p>
                    <p>
                      <strong>Service:</strong> {request.serviceName}
                    </p>
                    {request.rating !== null && (
                      <p>
                        <strong>Rating:</strong> {request.rating} star
                        {request.rating === 1 ? "" : "s"}
                      </p>
                    )}
                    <p>
                      <strong>Reason:</strong> {request.reason || "-"}
                    </p>
                    <p>
                      <strong>Requested:</strong>{" "}
                      {format(request.createdAt, "MMM dd, yyyy")}
                    </p>
                    {request.resolvedAt && (
                      <p>
                        <strong>Resolved:</strong>{" "}
                        {format(request.resolvedAt, "MMM dd, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewRequest(request)}
                  className="w-full md:w-auto"
                >
                  Review Request
                </Button>
              </div>
            </Card>
          ))}
      </div>

      {/* Filters */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search-feedback">Search Feedback</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-feedback"
                placeholder="Search by customer, service, mechanic, or comment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-40">
            <Label htmlFor="filter-rating">Rating</Label>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger id="filter-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-40">
            <Label htmlFor="filter-status">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filter-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Feedback List */}
      <div className="space-y-4">
        {loading && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading feedback...</p>
          </Card>
        )}
        {!loading && filteredFeedback.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No feedback found</p>
          </Card>
        )}
        {!loading &&
          filteredFeedback.map((feedback) => (
            <Card key={feedback.ratingId} className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-base md:text-lg">
                      {feedback.customerName}
                    </h3>
                    <Badge variant={getStatusBadgeVariant(feedback.status)}>
                      {feedback.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {renderStars(feedback.rating)}
                    <span className="text-xs md:text-sm text-muted-foreground">
                      - {format(feedback.date, "MMM dd, yyyy")}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-2">
                    <strong>Service:</strong> {feedback.serviceName} -{" "}
                    <strong>Mechanic:</strong> {feedback.mechanicName}
                  </p>
                  <p className="text-sm">{feedback.comment || "-"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewFeedback(feedback)}
                  className="w-full sm:w-auto"
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
          } else {
            setIsDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              Review, update, or respond to customer feedback
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{selectedFeedback.customerName}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">
                    {format(selectedFeedback.date, "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="font-medium">{selectedFeedback.serviceName}</p>
                </div>
                <div>
                  <Label>Mechanic</Label>
                  <p className="font-medium">{selectedFeedback.mechanicName}</p>
                </div>
                <div>
                  <Label>Vehicle</Label>
                  <p className="font-medium">{selectedFeedback.vehicle}</p>
                </div>
                {selectedFeedback.workshopName && (
                  <div>
                    <Label>Workshop</Label>
                    <p className="font-medium">{selectedFeedback.workshopName}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Rating</Label>
                <div className="mt-1">
                  {renderEditableStars(editRating, setEditRating)}
                </div>
              </div>

              <div>
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="status-select">Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => setEditStatus(value as FeedbackStatus)}
                >
                  <SelectTrigger id="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="response">Send Response (Optional)</Label>
                <Textarea
                  id="response"
                  placeholder="Type your response to the customer..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteFeedback}
              disabled={deleting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={handleSaveFeedback}
                disabled={saving || editRating < 1}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      <Dialog
        open={requestDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRequestDialogOpen(false);
          } else {
            setRequestDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deletion Request</DialogTitle>
            <DialogDescription>
              Approve, reject, or remove a workshop review deletion request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Workshop</Label>
                  <p className="font-medium">{selectedRequest.workshopName}</p>
                </div>
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{selectedRequest.customerName}</p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="font-medium">{selectedRequest.serviceName}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getRequestStatusBadge(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label>Requested</Label>
                  <p className="font-medium">
                    {format(selectedRequest.createdAt, "MMM dd, yyyy")}
                  </p>
                </div>
                {selectedRequest.resolvedAt && (
                  <div>
                    <Label>Resolved</Label>
                    <p className="font-medium">
                      {format(selectedRequest.resolvedAt, "MMM dd, yyyy")}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Reason</Label>
                <p className="mt-1 p-3 bg-accent rounded-md">
                  {selectedRequest.reason || "-"}
                </p>
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Close
            </Button>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="destructive"
                onClick={() => handleResolveRequest("deleted")}
                disabled={resolving || selectedRequest?.status !== "pending"}
              >
                {resolving ? "Updating..." : "Delete Request"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolveRequest("rejected")}
                disabled={resolving || selectedRequest?.status !== "pending"}
              >
                {resolving ? "Updating..." : "Reject"}
              </Button>
              <Button
                onClick={() => handleResolveRequest("approved")}
                disabled={resolving || selectedRequest?.status !== "pending"}
              >
                {resolving ? "Updating..." : "Approve Delete"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
