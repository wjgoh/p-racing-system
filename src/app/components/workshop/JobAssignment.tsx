import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Search, UserPlus, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface Job {
  id: string;
  vehicleOwner: string;
  vehicle: string;
  serviceType: string;
  priority: "high" | "medium" | "low";
  status: "unassigned" | "assigned" | "in-progress" | "completed";
  assignedMechanic?: string;
  estimatedHours: number;
  createdAt: string;
}

const mockJobs: Job[] = [
  {
    id: "J001",
    vehicleOwner: "John Smith",
    vehicle: "Toyota Camry 2020",
    serviceType: "Oil Change & Brake Inspection",
    priority: "high",
    status: "unassigned",
    estimatedHours: 2,
    createdAt: "2026-01-22T09:00:00",
  },
  {
    id: "J002",
    vehicleOwner: "Sarah Johnson",
    vehicle: "Honda Civic 2019",
    serviceType: "Transmission Repair",
    priority: "high",
    status: "unassigned",
    estimatedHours: 8,
    createdAt: "2026-01-22T08:30:00",
  },
  {
    id: "J003",
    vehicleOwner: "Mike Davis",
    vehicle: "Ford F-150 2021",
    serviceType: "Tire Rotation",
    priority: "low",
    status: "assigned",
    assignedMechanic: "Tom Wilson",
    estimatedHours: 1,
    createdAt: "2026-01-22T07:15:00",
  },
  {
    id: "J004",
    vehicleOwner: "Emily Brown",
    vehicle: "Tesla Model 3 2022",
    serviceType: "Battery Diagnostic",
    priority: "medium",
    status: "in-progress",
    assignedMechanic: "Alex Martinez",
    estimatedHours: 3,
    createdAt: "2026-01-21T14:20:00",
  },
];

const mockMechanics = [
  { id: "M001", name: "Tom Wilson", status: "available", currentJobs: 1 },
  { id: "M002", name: "Alex Martinez", status: "busy", currentJobs: 2 },
  { id: "M003", name: "Sarah Lee", status: "available", currentJobs: 0 },
  { id: "M004", name: "John Carter", status: "available", currentJobs: 1 },
];

export function JobAssignment() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState("");

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.vehicleOwner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAssignMechanic = () => {
    if (selectedJob && selectedMechanic) {
      setJobs(
        jobs.map((job) =>
          job.id === selectedJob.id
            ? {
                ...job,
                assignedMechanic: mockMechanics.find((m) => m.id === selectedMechanic)?.name,
                status: "assigned" as const,
              }
            : job
        )
      );
      setAssignDialogOpen(false);
      setSelectedJob(null);
      setSelectedMechanic("");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "unassigned":
        return <AlertCircle className="h-4 w-4" />;
      case "assigned":
        return <Clock className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Job Assignment</h2>
        <p className="text-slate-600 mt-1">
          Assign mechanics to jobs and manage workload
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by job ID, customer, or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Available Mechanics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {mockMechanics.map((mechanic) => (
          <Card
            key={mechanic.id}
            className={`p-4 ${
              mechanic.status === "available" ? "border-green-200 bg-green-50" : ""
            }`}
          >
            <div className="space-y-1">
              <p className="font-medium text-sm">{mechanic.name}</p>
              <div className="flex items-center justify-between">
                <Badge
                  variant={mechanic.status === "available" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {mechanic.status}
                </Badge>
                <span className="text-xs text-slate-500">
                  {mechanic.currentJobs} jobs
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <Card key={job.id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">Job #{job.id}</h3>
                    <Badge className={getPriorityColor(job.priority)}>
                      {job.priority} priority
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {getStatusIcon(job.status)}
                      {job.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Customer: </span>
                      <span className="font-medium">{job.vehicleOwner}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{job.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{job.serviceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Est. Time: </span>
                      <span className="font-medium">{job.estimatedHours}h</span>
                    </div>
                    {job.assignedMechanic && (
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Assigned to: </span>
                        <span className="font-medium text-blue-600">
                          {job.assignedMechanic}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex md:flex-col gap-2">
                  <Button
                    onClick={() => {
                      setSelectedJob(job);
                      setAssignDialogOpen(true);
                    }}
                    className="gap-2 flex-1 md:flex-none"
                    variant={job.status === "unassigned" ? "default" : "outline"}
                  >
                    <UserPlus className="h-4 w-4" />
                    {job.status === "unassigned" ? "Assign" : "Reassign"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredJobs.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-slate-500">No jobs found matching your criteria</p>
          </Card>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Mechanic to Job #{selectedJob?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Details</Label>
              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
                <p>
                  <span className="text-slate-600">Customer:</span>{" "}
                  {selectedJob?.vehicleOwner}
                </p>
                <p>
                  <span className="text-slate-600">Vehicle:</span>{" "}
                  {selectedJob?.vehicle}
                </p>
                <p>
                  <span className="text-slate-600">Service:</span>{" "}
                  {selectedJob?.serviceType}
                </p>
                <p>
                  <span className="text-slate-600">Est. Duration:</span>{" "}
                  {selectedJob?.estimatedHours} hours
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Mechanic</Label>
              <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mechanic" />
                </SelectTrigger>
                <SelectContent>
                  {mockMechanics.map((mechanic) => (
                    <SelectItem key={mechanic.id} value={mechanic.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{mechanic.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              mechanic.status === "available" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {mechanic.status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {mechanic.currentJobs} jobs
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setSelectedJob(null);
                setSelectedMechanic("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignMechanic} disabled={!selectedMechanic}>
              Assign Mechanic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
