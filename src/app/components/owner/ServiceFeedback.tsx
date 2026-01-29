import { useState } from "react";
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

interface Feedback {
  id: string;
  serviceId: string;
  vehicle: string;
  serviceType: string;
  serviceDate: Date;
  rating: number;
  comment: string;
  submittedAt: Date;
  response?: string;
}

interface PendingService {
  id: string;
  vehicle: string;
  serviceType: string;
  completedDate: Date;
  hasReview: boolean;
}

const mockFeedbacks: Feedback[] = [
  {
    id: "FB001",
    serviceId: "SVC-2026-001",
    vehicle: "2020 Toyota Camry (ABC-1234)",
    serviceType: "Oil Change & Tire Rotation",
    serviceDate: new Date("2026-01-15"),
    rating: 5,
    comment:
      "Excellent service! The team was professional and completed the work quickly. Very satisfied with the quality.",
    submittedAt: new Date("2026-01-16"),
    response:
      "Thank you for your positive feedback! We're thrilled to hear you had a great experience.",
  },
  {
    id: "FB002",
    serviceId: "SVC-2025-287",
    vehicle: "2019 Honda Civic (XYZ-5678)",
    serviceType: "Brake Service",
    serviceDate: new Date("2025-12-10"),
    rating: 4,
    comment:
      "Good service overall. The brakes feel much better now. Wait time was a bit longer than expected, but the work quality was great.",
    submittedAt: new Date("2025-12-13"),
  },
];

const mockPendingServices: PendingService[] = [
  {
    id: "SVC-2026-045",
    vehicle: "2020 Toyota Camry (ABC-1234)",
    serviceType: "Annual Inspection",
    completedDate: new Date("2026-01-20"),
    hasReview: false,
  },
];

export function ServiceFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedbacks);
  const [pendingServices, setPendingServices] =
    useState<PendingService[]>(mockPendingServices);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PendingService | null>(
    null
  );
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmitReview = () => {
    if (!selectedService || rating === 0) return;

    const newFeedback: Feedback = {
      id: `FB${(feedbacks.length + 1).toString().padStart(3, "0")}`,
      serviceId: selectedService.id,
      vehicle: selectedService.vehicle,
      serviceType: selectedService.serviceType,
      serviceDate: selectedService.completedDate,
      rating,
      comment,
      submittedAt: new Date(),
    };

    setFeedbacks([newFeedback, ...feedbacks]);
    setPendingServices(
      pendingServices.map((svc) =>
        svc.id === selectedService.id ? { ...svc, hasReview: true } : svc
      )
    );

    setReviewDialogOpen(false);
    setSelectedService(null);
    setRating(0);
    setComment("");
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
                star <= (hoverRating || value)
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
      ? (feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length).toFixed(
          1
        )
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
                {pendingServices.filter((s) => !s.hasReview).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending Reviews */}
      {pendingServices.filter((s) => !s.hasReview).length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Pending Reviews</h3>
          {pendingServices
            .filter((s) => !s.hasReview)
            .map((service) => (
              <Card key={service.id} className="p-4 md:p-6 bg-yellow-50 border-yellow-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white">
                        {service.id}
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
                          {format(service.completedDate, "MMM dd, yyyy")}
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
                        {feedback.rating}.0
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
                      <span>{format(feedback.serviceDate, "MMM dd, yyyy")}</span>
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
                      <p className="text-sm text-blue-800">{feedback.response}</p>
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

        {feedbacks.length === 0 && (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No reviews submitted yet</p>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
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
                  <span className="font-medium">{selectedService.serviceType}</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-600">Completed: </span>
                  <span className="font-medium">
                    {format(selectedService.completedDate, "MMM dd, yyyy")}
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
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setSelectedService(null);
                setRating(0);
                setComment("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={rating === 0}>
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
