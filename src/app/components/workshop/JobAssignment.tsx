import { useEffect, useState } from "react";
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
import {
  apiAssignJob,
  apiListJobs,
  apiListMechanics,
  apiUpdateJobStatus,
  type Job,
  type MechanicSummary,
} from "../api/jobs";
import { getStoredUser } from "../api/session";

type JobStatus = "unassigned" | "assigned" | "in-progress" | "completed" | "on-hold";

export function JobAssignment() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mechanics, setMechanics] = useState<MechanicSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  const loadData = (workshopId: number) => {
    setLoading(true);
    setError(null);
    Promise.all([apiListJobs({ workshopId }), apiListMechanics(workshopId)])
      .then(([jobList, mechanicList]) => {
        setJobs(jobList);
        setMechanics(mechanicList);
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to load jobs");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }
    loadData(user.workshop_id);
  }, []);

  const getVehicleLabel = (job: Job) => {
    const year = job.year ? `${job.year} ` : "";
    const make = job.make ?? "";
    const model = job.model ?? "";
    const plate = job.plate_number ? ` (${job.plate_number})` : "";
    const label = `${year}${make} ${model}`.trim() + plate;
    return label || "Vehicle";
  };

  const filteredJobs = jobs.filter((job) => {
    const search = searchTerm.toLowerCase();
    const ownerName = (job.owner_name ?? "").toLowerCase();
    const vehicleLabel = getVehicleLabel(job).toLowerCase();
    const jobId = String(job.job_id);
    const matchesSearch =
      ownerName.includes(search) || vehicleLabel.includes(search) || jobId.includes(search);
    const matchesStatus = filterStatus === "all" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAssignMechanic = () => {
    if (!selectedJob || !selectedMechanic) return;
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setAssigning(true);
    setError(null);
    apiAssignJob({
      jobId: selectedJob.job_id,
      mechanicId: Number(selectedMechanic),
    })
      .then(() => {
        loadData(user.workshop_id as number);
        setAssignDialogOpen(false);
        setSelectedJob(null);
        setSelectedMechanic("");
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to assign mechanic");
      })
      .finally(() => setAssigning(false));
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

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case "unassigned":
        return <AlertCircle className="h-4 w-4" />;
      case "assigned":
        return <Clock className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "on-hold":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleStatusChange = (jobId: number, status: JobStatus) => {
    const user = getStoredUser();
    if (!user || !user.workshop_id) {
      setError("Workshop account not linked to a workshop.");
      return;
    }

    setStatusUpdating(jobId);
    setError(null);
    apiUpdateJobStatus({ jobId, status })
      .then(() => loadData(user.workshop_id as number))
      .catch((err: any) => {
        setError(err?.message ?? "Failed to update status");
      })
      .finally(() => setStatusUpdating(null));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Job Assignment</h2>
        <p className="text-slate-600 mt-1">
          Assign mechanics to jobs and manage workload
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

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
        {mechanics.map((mechanic) => {
          const status = mechanic.current_jobs >= 2 ? "busy" : "available";
          return (
            <Card
              key={mechanic.user_id}
              className={`p-4 ${
                status === "available" ? "border-green-200 bg-green-50" : ""
              }`}
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">{mechanic.name}</p>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={status === "available" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {status}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {mechanic.current_jobs} jobs
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <Card key={job.job_id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">Job #{job.job_id}</h3>
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
                      <span className="font-medium">{job.owner_name ?? "Customer"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{getVehicleLabel(job)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{job.service_type ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Est. Time: </span>
                      <span className="font-medium">{job.estimated_time ?? "-"}</span>
                    </div>
                    {job.assigned_mechanic_name && (
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Assigned to: </span>
                        <span className="font-medium text-blue-600">
                          {job.assigned_mechanic_name}
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
                    disabled={job.status === "completed"}
                  >
                    <UserPlus className="h-4 w-4" />
                    {job.status === "unassigned" ? "Assign" : "Reassign"}
                  </Button>
                  <Select
                    value={job.status}
                    onValueChange={(value) => handleStatusChange(job.job_id, value as JobStatus)}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  {statusUpdating === job.job_id && (
                    <span className="text-xs text-muted-foreground">Updating...</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && filteredJobs.length === 0 && (
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
              Assign Mechanic to Job #{selectedJob?.job_id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Job Details</Label>
              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
                <p>
                  <span className="text-slate-600">Customer:</span>{" "}
                  {selectedJob?.owner_name ?? "Customer"}
                </p>
                <p>
                  <span className="text-slate-600">Vehicle:</span>{" "}
                  {selectedJob ? getVehicleLabel(selectedJob) : "Vehicle"}
                </p>
                <p>
                  <span className="text-slate-600">Service:</span>{" "}
                  {selectedJob?.service_type ?? "-"}
                </p>
                <p>
                  <span className="text-slate-600">Est. Duration:</span>{" "}
                  {selectedJob?.estimated_time ?? "-"}
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
                  {mechanics.map((mechanic) => {
                    const status = mechanic.current_jobs >= 2 ? "busy" : "available";
                    return (
                    <SelectItem
                      key={mechanic.user_id}
                      value={String(mechanic.user_id)}
                      disabled={status === "busy"}
                    >
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>{mechanic.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={status === "available" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {status}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {mechanic.current_jobs} jobs
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                  })}
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
            <Button
              onClick={handleAssignMechanic}
              disabled={!selectedMechanic || assigning}
            >
              {assigning ? "Assigning..." : "Assign Mechanic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
