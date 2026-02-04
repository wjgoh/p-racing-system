import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Star, Search, MessageSquare, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import {
  apiListWorkshopRatingRequests,
  apiListWorkshopRatings,
  apiRequestWorkshopRatingDelete,
  apiUpdateWorkshopRatingResponse,
  type WorkshopRatingRecord,
  type WorkshopRatingRequestRecord,
} from "../api/workshopFeedback";
import { getStoredUser } from "../api/session";

type ReviewStatus = "new" | "reviewed" | "resolved";
type RequestStatus = "pending" | "approved" | "rejected" | "deleted";

interface Review {
  ratingId: number;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  response: string | null;
  date: Date;
  status: ReviewStatus;
  mechanicName: string;
  vehicle: string;
  workshopName: string | null;
}

interface RatingRequest {
  requestId: number;
  ratingId: number | null;
  reason: string;
  status: RequestStatus;
  adminNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

const formatVehicleLabel = (record: Pick<
  WorkshopRatingRecord,
  "year" | "make" | "model" | "plate_number"
>) => {
  const year = record.year ? `${record.year} ` : "";
  const make = record.make ?? "";
  const model = record.model ?? "";
  const plate = record.plate_number ? ` (${record.plate_number})` : "";
  const label = `${year}${make} ${model}`.trim();
  return `${label || "Vehicle"}${plate}`;
};

const resolveStatus = (record: WorkshopRatingRecord): ReviewStatus => {
  if (record.response && record.response.trim()) return "resolved";
  if (record.responded_at) return "reviewed";
  return "new";
};

const mapReview = (record: WorkshopRatingRecord): Review => ({
  ratingId: record.rating_id,
  customerName: record.customer_name ?? "Customer",
  serviceName: record.service_type ?? "Service",
  rating: Number(record.rating ?? 0),
  comment: record.comment ?? "",
  response: record.response ?? null,
  date: record.created_at ? new Date(record.created_at) : new Date(),
  status: resolveStatus(record),
  mechanicName: record.mechanic_name ?? "-",
  vehicle: formatVehicleLabel(record),
  workshopName: record.workshop_name ?? null,
});

const mapRequest = (record: WorkshopRatingRequestRecord): RatingRequest => ({
  requestId: record.request_id,
  ratingId: record.rating_id ?? null,
  reason: record.reason ?? "",
  status: record.status,
  adminNotes: record.admin_notes ?? null,
  createdAt: record.created_at ? new Date(record.created_at) : new Date(),
  resolvedAt: record.resolved_at ? new Date(record.resolved_at) : null,
});

export function WorkshopReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<RatingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  const loadData = async () => {
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setLoading(true);
    setRequestLoading(true);
    setError(null);
    try {
      const [ratingRows, requestRows] = await Promise.all([
        apiListWorkshopRatings(user.workshop_id),
        apiListWorkshopRatingRequests(user.workshop_id),
      ]);
      setReviews(ratingRows.map(mapReview));
      setRequests(requestRows.map(mapRequest));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load reviews");
    } finally {
      setLoading(false);
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const requestsByRating = useMemo(() => {
    const map = new Map<number, RatingRequest>();
    const sorted = [...requests].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    sorted.forEach((req) => {
      if (req.ratingId !== null && !map.has(req.ratingId)) {
        map.set(req.ratingId, req);
      }
    });
    return map;
  }, [requests]);

  const pendingRequests = requests.filter((r) => r.status === "pending").length;

  const filteredReviews = reviews.filter((review) => {
    const search = searchQuery.toLowerCase();
    const matchesSearch =
      review.customerName.toLowerCase().includes(search) ||
      review.serviceName.toLowerCase().includes(search) ||
      review.mechanicName.toLowerCase().includes(search) ||
      review.comment.toLowerCase().includes(search);
    const matchesRating =
      filterRating === "all" || review.rating === parseInt(filterRating, 10);
    const matchesStatus =
      filterStatus === "all" || review.status === filterStatus;
    return matchesSearch && matchesRating && matchesStatus;
  });

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : "0.0";

  const handleViewReview = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.response ?? "");
    setRequestReason("");
    setDialogOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedReview || saving) return;
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiUpdateWorkshopRatingResponse({
        ratingId: selectedReview.ratingId,
        workshopId: user.workshop_id,
        response: responseText,
        status: selectedReview.status,
      });
      await loadData();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update response");
    } finally {
      setSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!selectedReview || requesting) return;
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setRequesting(true);
    setError(null);
    try {
      await apiRequestWorkshopRatingDelete({
        ratingId: selectedReview.ratingId,
        workshopId: user.workshop_id,
        requestedBy: user.user_id,
        reason: requestReason,
      });
      await loadData();
      setRequestReason("");
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit request");
    } finally {
      setRequesting(false);
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));

  const getStatusBadge = (status: ReviewStatus) => {
    switch (status) {
      case "new":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "reviewed":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getRequestStatusBadge = (status: RequestStatus) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Customer Reviews</h2>
        <p className="text-slate-600 mt-1">
          Respond to customer feedback and manage review disputes
        </p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Average Rating</p>
              <p className="text-2xl font-semibold text-slate-900">
                {averageRating}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Reviews</p>
              <p className="text-2xl font-semibold text-slate-900">
                {reviews.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending Requests</p>
              <p className="text-2xl font-semibold text-slate-900">
                {pendingRequests}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by customer, service, or mechanic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Rating" />
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
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading && (
          <Card className="p-8 text-center">
            <p className="text-slate-500">Loading reviews...</p>
          </Card>
        )}
        {!loading && filteredReviews.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-slate-500">No reviews found</p>
          </Card>
        )}
        {!loading &&
          filteredReviews.map((review) => {
            const request = requestsByRating.get(review.ratingId);
            return (
              <Card key={review.ratingId} className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{review.customerName}</h3>
                      <Badge className={getStatusBadge(review.status)}>
                        {review.status}
                      </Badge>
                      {request && (
                        <Badge className={getRequestStatusBadge(request.status)}>
                          Request: {request.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-xs text-slate-500">
                        - {format(review.date, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      <strong>Service:</strong> {review.serviceName} -{" "}
                      <strong>Mechanic:</strong> {review.mechanicName}
                    </p>
                    <p className="text-sm">{review.comment || "-"}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReview(review)}
                    className="w-full md:w-auto"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Requests Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Deletion Requests</h3>
        {requestLoading && (
          <Card className="p-6 text-center">
            <p className="text-slate-500">Loading requests...</p>
          </Card>
        )}
        {!requestLoading && requests.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-slate-500">No deletion requests submitted</p>
          </Card>
        )}
        {!requestLoading &&
          requests.map((request) => (
            <Card key={request.requestId} className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getRequestStatusBadge(request.status)}>
                      {request.status}
                    </Badge>
                    {request.resolvedAt && (
                      <span className="text-xs text-slate-500">
                        Resolved {format(request.resolvedAt, "MMM dd, yyyy")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    <strong>Reason:</strong> {request.reason || "-"}
                  </p>
                  {request.adminNotes && (
                    <p className="text-sm text-slate-600">
                      <strong>Admin response:</strong> {request.adminNotes}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  Requested {format(request.createdAt, "MMM dd, yyyy")}
                </span>
              </div>
            </Card>
          ))}
      </div>

      {/* Review Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer</Label>
                  <p className="font-medium">{selectedReview.customerName}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">
                    {format(selectedReview.date, "MMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="font-medium">{selectedReview.serviceName}</p>
                </div>
                <div>
                  <Label>Mechanic</Label>
                  <p className="font-medium">{selectedReview.mechanicName}</p>
                </div>
                <div>
                  <Label>Vehicle</Label>
                  <p className="font-medium">{selectedReview.vehicle}</p>
                </div>
                {selectedReview.workshopName && (
                  <div>
                    <Label>Workshop</Label>
                    <p className="font-medium">{selectedReview.workshopName}</p>
                  </div>
                )}
              </div>

              <div>
                <Label>Rating</Label>
                <div className="flex gap-1 mt-1">
                  {renderStars(selectedReview.rating)}
                </div>
              </div>

              <div>
                <Label>Comment</Label>
                <p className="mt-1 p-3 bg-slate-50 rounded-md">
                  {selectedReview.comment || "-"}
                </p>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  <Badge className={getStatusBadge(selectedReview.status)}>
                    {selectedReview.status}
                  </Badge>
                </div>
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

              {selectedReview && (
                <div className="space-y-2">
                  <Label>Deletion Request</Label>
                  {(() => {
                    const request = requestsByRating.get(selectedReview.ratingId);
                    if (request) {
                      return (
                        <div className="p-3 bg-slate-50 rounded-md space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getRequestStatusBadge(request.status)}>
                              {request.status}
                            </Badge>
                            {request.resolvedAt && (
                              <span className="text-xs text-slate-500">
                                {format(request.resolvedAt, "MMM dd, yyyy")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">
                            <strong>Reason:</strong> {request.reason || "-"}
                          </p>
                          {request.adminNotes && (
                            <p className="text-sm text-slate-600">
                              <strong>Admin response:</strong> {request.adminNotes}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Explain why this review should be removed..."
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                          rows={3}
                        />
                        <Button
                          variant="outline"
                          onClick={handleRequestDeletion}
                          disabled={!requestReason.trim() || requesting}
                        >
                          {requesting ? "Submitting..." : "Request Deletion"}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSaveResponse} disabled={saving}>
              {saving ? "Saving..." : "Save Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
