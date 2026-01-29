import { useState } from "react";
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
} from "lucide-react";

interface Feedback {
  id: string;
  customerName: string;
  serviceName: string;
  rating: number;
  comment: string;
  date: string;
  status: "new" | "reviewed" | "resolved";
  mechanicName: string;
}

export function CustomerSatisfaction() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([
    {
      id: "1",
      customerName: "John Smith",
      serviceName: "Oil Change",
      rating: 5,
      comment: "Excellent service! Very professional and quick.",
      date: "2026-01-18",
      status: "new",
      mechanicName: "Mike Smith",
    },
    {
      id: "2",
      customerName: "Emily Davis",
      serviceName: "Brake Repair",
      rating: 4,
      comment: "Good work, but took a bit longer than expected.",
      date: "2026-01-17",
      status: "reviewed",
      mechanicName: "John Doe",
    },
    {
      id: "3",
      customerName: "Michael Brown",
      serviceName: "Engine Diagnostic",
      rating: 5,
      comment: "Found the issue quickly and fixed it perfectly!",
      date: "2026-01-16",
      status: "resolved",
      mechanicName: "Sarah Wilson",
    },
    {
      id: "4",
      customerName: "Sarah Connor",
      serviceName: "Tire Rotation",
      rating: 3,
      comment: "Service was okay, but the waiting area could be cleaner.",
      date: "2026-01-15",
      status: "new",
      mechanicName: "Tom Brown",
    },
    {
      id: "5",
      customerName: "David Lee",
      serviceName: "AC Repair",
      rating: 5,
      comment: "Outstanding! AC works better than ever.",
      date: "2026-01-14",
      status: "reviewed",
      mechanicName: "Mike Smith",
    },
    {
      id: "6",
      customerName: "Lisa Wong",
      serviceName: "Battery Replacement",
      rating: 2,
      comment: "Had to come back twice. Not satisfied with the initial work.",
      date: "2026-01-13",
      status: "new",
      mechanicName: "Lisa Johnson",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");

  // Calculate statistics
  const totalFeedback = feedbackList.length;
  const averageRating = (
    feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
  ).toFixed(1);
  const positiveRatings = feedbackList.filter((f) => f.rating >= 4).length;
  const negativeRatings = feedbackList.filter((f) => f.rating <= 2).length;
  const satisfactionRate = ((positiveRatings / totalFeedback) * 100).toFixed(1);

  // Rating distribution data
  const ratingDistribution = [
    { rating: "5 ⭐", count: feedbackList.filter((f) => f.rating === 5).length },
    { rating: "4 ⭐", count: feedbackList.filter((f) => f.rating === 4).length },
    { rating: "3 ⭐", count: feedbackList.filter((f) => f.rating === 3).length },
    { rating: "2 ⭐", count: feedbackList.filter((f) => f.rating === 2).length },
    { rating: "1 ⭐", count: feedbackList.filter((f) => f.rating === 1).length },
  ];

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setResponseText("");
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = (status: Feedback["status"]) => {
    if (selectedFeedback) {
      setFeedbackList(
        feedbackList.map((f) =>
          f.id === selectedFeedback.id ? { ...f, status } : f
        )
      );
      setSelectedFeedback({ ...selectedFeedback, status });
    }
  };

  const handleSendResponse = () => {
    if (responseText.trim()) {
      alert(`Response sent to ${selectedFeedback?.customerName}`);
      setResponseText("");
      setIsDialogOpen(false);
    }
  };

  const filteredFeedback = feedbackList.filter((feedback) => {
    const matchesSearch =
      feedback.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.mechanicName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating =
      filterRating === "all" || feedback.rating === parseInt(filterRating);
    const matchesStatus =
      filterStatus === "all" || feedback.status === filterStatus;
    return matchesSearch && matchesRating && matchesStatus;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < rating
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        }`}
      />
    ));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Customer Satisfaction</h1>
        <p className="text-muted-foreground">
          Monitor feedback and ratings from customers
        </p>
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
                +3.2% from last month
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
                Low ratings (≤2 stars)
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

      {/* Filters */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="search-feedback">Search Feedback</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-feedback"
                placeholder="Search by customer, service, or mechanic..."
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
        {filteredFeedback.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No feedback found</p>
          </Card>
        ) : (
          filteredFeedback.map((feedback) => (
            <Card key={feedback.id} className="p-4 md:p-6">
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
                      • {feedback.date}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-2">
                    <strong>Service:</strong> {feedback.serviceName} •{" "}
                    <strong>Mechanic:</strong> {feedback.mechanicName}
                  </p>
                  <p className="text-sm">{feedback.comment}</p>
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
          ))
        )}
      </div>

      {/* Feedback Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
            <DialogDescription>
              View and respond to customer feedback
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
                  <p className="font-medium">{selectedFeedback.date}</p>
                </div>
                <div>
                  <Label>Service</Label>
                  <p className="font-medium">{selectedFeedback.serviceName}</p>
                </div>
                <div>
                  <Label>Mechanic</Label>
                  <p className="font-medium">{selectedFeedback.mechanicName}</p>
                </div>
              </div>

              <div>
                <Label>Rating</Label>
                <div className="flex gap-1 mt-1">
                  {renderStars(selectedFeedback.rating)}
                </div>
              </div>

              <div>
                <Label>Comment</Label>
                <p className="mt-1 p-3 bg-accent rounded-md">
                  {selectedFeedback.comment}
                </p>
              </div>

              <div>
                <Label htmlFor="status-select">Status</Label>
                <Select
                  value={selectedFeedback.status}
                  onValueChange={(value) =>
                    handleUpdateStatus(value as Feedback["status"])
                  }
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={handleSendResponse}>
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}