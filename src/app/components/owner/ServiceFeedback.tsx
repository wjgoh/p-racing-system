import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Star, MessageSquare, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  apiListPendingRatings,
  apiListRatings,
  apiSubmitRating,
  type PendingRatingRecord,
  type ServiceRatingRecord,
} from "../api/feedback";
import { getStoredUser } from "../api/session";

interface Feedback {
  id: string;
  bookingId: number;
  serviceId: string;
  vehicle: string;
  serviceType: string;
  serviceDate: Date | null;
  rating: number;
  comment: string;
  submittedAt: Date;
  response?: string;
}

interface PendingService {
  bookingId: number;
  serviceId: string;
  vehicle: string;
  serviceType: string;
  completedDate: Date | null;
}

const parseDate = (value?: string | null) =>
  value ? new Date(value) : null;

const formatServiceId = (bookingId: number, date?: Date | null) => {
  const year = (date ?? new Date()).getFullYear();
  return `SVC-${year}-${String(bookingId).padStart(3, "0")}`;
};

const formatVehicleLabel = (record: {
  year?: string | null;
  make?: string | null;
  model?: string | null;
  plate_number?: string | null;
}) => {
  const year = record.year ? `${record.year} ` : "";
  const make = record.make ?? "";
  const model = record.model ?? "";
  const plate = record.plate_number ? ` (${record.plate_number})` : "";
  const label = `${year}${make} ${model}`.trim();
  return `${label || "Vehicle"}${plate}`;
};

const resolveDate = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (value) return new Date(value);
  }
  return null;
};

export function ServiceFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [pendingServices, setPendingServices] = useState<PendingService[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PendingService | null>(
    null
  );
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mapRating = (record: ServiceRatingRecord): Feedback => {
    const serviceDate = resolveDate(
      record.scheduled_date,
      record.preferred_date,
      record.completed_at,
      record.created_at
    );
    const submittedAt = parseDate(record.created_at) ?? new Date();
    return {
      id: String(record.rating_id),
      bookingId: record.booking_id,
      serviceId: formatServiceId(record.booking_id, serviceDate),
      vehicle: formatVehicleLabel(record),
      serviceType: record.service_type ?? "Service",
      serviceDate,
      rating: Number(record.rating ?? 0),
      comment: record.comment ?? "",
      submittedAt,
      response: record.response ?? undefined,
    };
  };

  const mapPending = (record: PendingRatingRecord): PendingService => {
    const completedDate = resolveDate(
      record.completed_at,
      record.scheduled_date,
      record.preferred_date
    );
    return {
      bookingId: record.booking_id,
      serviceId: formatServiceId(record.booking_id, completedDate),
      vehicle: formatVehicleLabel(record),
      serviceType: record.service_type ?? "Service",
      completedDate,
    };
  };

  const loadFeedback = async () => {
    const user = getStoredUser();
    if (!user) {
      setError("No active session. Please sign in again.");
      return;
    }
    if (!user.owner_id) {
      setError("Owner profile not found. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [ratings, pending] = await Promise.all([
        apiListRatings(user.owner_id),
        apiListPendingRatings(user.owner_id),
      ]);
      setFeedbacks(ratings.map(mapRating));
      setPendingServices(pending.map(mapPending));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, []);

  const resetReviewForm = () => {
    setReviewDialogOpen(false);
    setSelectedService(null);
    setRating(0);
    setHoverRating(0);
    setComment("");
  };

  const handleSubmitReview = async () => {
    if (!selectedService || rating === 0 || submitting) return;

    const user = getStoredUser();
    if (!user) {
      setError("No active session. Please sign in again.");
      return;
    }
    if (!user.owner_id) {
      setError("Owner profile not found. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiSubmitRating({
        bookingId: selectedService.bookingId,
        ownerId: user.owner_id,
        rating,
        comment: comment.trim() ? comment.trim() : null,
      });
      await loadFeedback();
      resetReviewForm();
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    readonly = false,
  }: {
    value: number;
    onChange?: (rating: number) => void;
    readonly?: boolean;
  }) => {
    const displayRating = readonly ? value : hoverRating || value;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !readonly && setHoverRating(star)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={`transition-colors ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= displayRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Service Feedback
        </h2>
        <p className="text-slate-600 mt-1">
          Rate your service experience and help us improve
        </p>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        {loading && (
          <p className="text-sm text-muted-foreground mt-2">
            Loading reviews...
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                {feedbacks.length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 md:col-span-1 col-span-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Pending Reviews</p>
              <p className="text-2xl font-semibold text-slate-900">
                {pendingServices.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Reviews */}
      {pendingServices.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Pending Reviews</h3>
          {pendingServices.map((service) => (
            <Card
              key={service.serviceId}
              className="p-4 md:p-6 bg-yellow-50 border-yellow-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white">
                      {service.serviceId}
                    </Badge>
                    <Badge className="bg-yellow-600">Awaiting Review</Badge>
                  </div>
                  <div className="text-sm">
                    <p>
                      <span className="text-slate-600">Vehicle: </span>
                      <span className="font-medium">{service.vehicle}</span>
                    </p>
                    <p>
                      <span className="text-slate-600">Service: </span>
                      <span className="font-medium">{service.serviceType}</span>
                    </p>
                    <p>
                      <span className="text-slate-600">Completed: </span>
                      <span className="font-medium">
                        {service.completedDate
                          ? format(service.completedDate, "MMM dd, yyyy")
                          : "-"}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setSelectedService(service);
                    setReviewDialogOpen(true);
                  }}
                  className="gap-2"
                >
                  <Star className="h-4 w-4" />
                  Write Review
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Your Reviews */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Your Reviews</h3>
        {feedbacks.map((feedback) => (
          <Card key={feedback.id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{feedback.serviceId}</Badge>
                    <div className="flex items-center gap-1">
                      <StarRating value={feedback.rating} readonly />
                      <span className="ml-2 font-semibold text-slate-900">
                        {feedback.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{feedback.vehicle}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{feedback.serviceType}</span>
                    </p>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {feedback.serviceDate
                          ? format(feedback.serviceDate, "MMM dd, yyyy")
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {feedback.comment && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">{feedback.comment}</p>
                    </div>
                  )}

                  {feedback.response && (
                    <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-xs font-semibold text-blue-900 mb-1">
                        Shop Response
                      </p>
                      <p className="text-sm text-blue-800">
                        {feedback.response}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-400">
                    Submitted on {format(feedback.submittedAt, "MMM dd, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && feedbacks.length === 0 && (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No reviews submitted yet</p>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetReviewForm();
          } else {
            setReviewDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-6 py-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="text-slate-600">Vehicle: </span>
                  <span className="font-medium">{selectedService.vehicle}</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-600">Service: </span>
                  <span className="font-medium">
                    {selectedService.serviceType}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-600">Completed: </span>
                  <span className="font-medium">
                    {selectedService.completedDate
                      ? format(selectedService.completedDate, "MMM dd, yyyy")
                      : "-"}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <p className="text-sm text-slate-600">
                    {rating === 5 && "Excellent!"}
                    {rating === 4 && "Very Good"}
                    {rating === 3 && "Good"}
                    {rating === 2 && "Fair"}
                    {rating === 1 && "Poor"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Your Review (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your experience with this service..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetReviewForm}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={rating === 0 || submitting}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
