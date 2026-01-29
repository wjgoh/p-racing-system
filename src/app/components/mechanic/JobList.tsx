import { useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
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
  Search,
  Calendar,
  Clock,
  Car,
  AlertCircle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Filter,
} from "lucide-react";
import type { Job } from "../MechanicDashboard";

interface JobListProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
}

export function JobList({ jobs, onSelectJob }: JobListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.vehicleOwner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || job.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort jobs: in-progress first, then by priority (high -> medium -> low), then by status
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    // First priority: in-progress jobs at the top
    if (a.status === "in-progress" && b.status !== "in-progress") return -1;
    if (a.status !== "in-progress" && b.status === "in-progress") return 1;

    // Second priority: by priority level
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Third priority: by status (pending, on-hold, completed)
    const statusOrder = { pending: 0, "on-hold": 1, completed: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const getStatusIcon = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      case "in-progress":
        return <PlayCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "on-hold":
        return <PauseCircle className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "in-progress":
        return "default";
      case "completed":
        return "outline";
      case "on-hold":
        return "destructive";
    }
  };

  const getPriorityBadgeVariant = (priority: Job["priority"]) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
    }
  };

  // Count jobs by status
  const statusCounts = {
    pending: jobs.filter((j) => j.status === "pending").length,
    inProgress: jobs.filter((j) => j.status === "in-progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    onHold: jobs.filter((j) => j.status === "on-hold").length,
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 px-3"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="filter-status" className="text-xs">
                  Status
                </Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filter-priority" className="text-xs">
                  Priority
                </Label>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger id="filter-priority" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {sortedJobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No jobs found</p>
          </Card>
        ) : (
          sortedJobs.map((job) => (
            <Card
              key={job.id}
              className="p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectJob(job)}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{job.id}</h3>
                      <Badge variant={getStatusBadgeVariant(job.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(job.priority)}>
                        {job.priority} priority
                      </Badge>
                    </div>
                    <p className="font-medium">{job.serviceType}</p>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    View Details
                  </Button>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.vehicleYear} {job.vehicleMake} {job.vehicleModel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Plate:</span>
                    <span>{job.licensePlate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Owner:</span>
                    <span>{job.vehicleOwner}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{job.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{job.estimatedTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Parts:</span>
                    <span>{job.parts.length} items</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {job.description}
                </p>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}