import { useEffect, useState } from "react";
import { MechanicHeader } from "./mechanic/MechanicHeader";
import { JobList } from "./mechanic/JobList";
import { JobDetails } from "./mechanic/JobDetails";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { apiListMechanicJobs, type MechanicJob } from "./api/mechanic";
import { getStoredUser } from "./api/session";

interface MechanicDashboardProps {
  onLogout: () => void;
}

export interface Job {
  jobId: number;
  id: string;
  ownerId: number;
  vehicleId: number | null;
  vehicleOwner: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  licensePlate: string;
  serviceType: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "on-hold";
  scheduledDate: string;
  estimatedTime: string;
  assignedMechanic: string;
  parts: Array<{
    id: string;
    name: string;
    quantity: number;
    cost: number;
  }>;
  repairs: Array<{
    id: string;
    description: string;
    timestamp: string;
  }>;
  notes: string;
}

const formatJobId = (jobId: number) => `JOB-${String(jobId).padStart(3, "0")}`;

const mapJobStatus = (status: MechanicJob["status"]): Job["status"] => {
  if (status === "assigned" || status === "unassigned") return "pending";
  return status;
};

const mapMechanicJob = (job: MechanicJob): Job => {
  return {
    jobId: job.job_id,
    id: formatJobId(job.job_id),
    ownerId: job.owner_id,
    vehicleId: job.vehicle_id ?? null,
    vehicleOwner: job.owner_name ?? "Unknown Owner",
    vehicleMake: job.make ?? "-",
    vehicleModel: job.model ?? "-",
    vehicleYear: job.year ?? "-",
    licensePlate: job.plate_number ?? "-",
    serviceType: job.service_type ?? "Service",
    description: job.description ?? "",
    priority: job.priority,
    status: mapJobStatus(job.status),
    scheduledDate: job.scheduled_date ?? "Not scheduled",
    estimatedTime: job.estimated_time ?? "Not set",
    assignedMechanic: job.assigned_mechanic_name ?? "",
    parts: (job.parts ?? []).map((part) => ({
      id: String(part.part_id),
      name: part.name,
      quantity: part.quantity,
      cost: Number(part.unit_cost ?? 0),
    })),
    repairs: (job.repairs ?? []).map((repair) => ({
      id: String(repair.repair_id),
      description: repair.description,
      timestamp: repair.logged_at
        ? new Date(repair.logged_at).toLocaleString()
        : "",
    })),
    notes: job.notes ?? "",
  };
};

export function MechanicDashboard({ onLogout }: MechanicDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mechanicName, setMechanicName] = useState("Mechanic");

  const loadJobs = async () => {
    const user = getStoredUser();
    if (!user) {
      setError("No active session. Please sign in again.");
      setLoading(false);
      return;
    }
    setMechanicName(user.name ?? "Mechanic");
    setLoading(true);
    setError(null);
    try {
      const data = await apiListMechanicJobs(user.user_id);
      setJobs(data.map(mapMechanicJob));
    } catch (err: any) {
      setError(err?.message ?? "Failed to load mechanic jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs((prev) =>
      prev.map((job) => (job.jobId === updatedJob.jobId ? updatedJob : job))
    );
    setSelectedJob(updatedJob);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <MechanicHeader onLogout={onLogout} mechanicName={mechanicName} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {loading ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          </Card>
        ) : error ? (
          <Card className="p-6 text-center space-y-3">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" size="sm" onClick={loadJobs}>
              Retry
            </Button>
          </Card>
        ) : selectedJob ? (
          <JobDetails
            job={selectedJob}
            onUpdateJob={handleUpdateJob}
            onBack={handleBackToList}
          />
        ) : (
          <JobList jobs={jobs} onSelectJob={setSelectedJob} />
        )}
      </main>
    </div>
  );
}
