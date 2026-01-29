import { useState } from "react";
import { MechanicHeader } from "./mechanic/MechanicHeader";
import { JobList } from "./mechanic/JobList";
import { JobDetails } from "./mechanic/JobDetails";

interface MechanicDashboardProps {
  onLogout: () => void;
}

export interface Job {
  id: string;
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

export function MechanicDashboard({ onLogout }: MechanicDashboardProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: "JOB-001",
      vehicleOwner: "Sarah Johnson",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: "2020",
      licensePlate: "ABC-1234",
      serviceType: "Oil Change & Inspection",
      description: "Regular oil change and general vehicle inspection",
      priority: "medium",
      status: "pending",
      scheduledDate: "2026-01-22",
      estimatedTime: "1.5 hours",
      assignedMechanic: "Mike Smith",
      parts: [],
      repairs: [],
      notes: "",
    },
    {
      id: "JOB-002",
      vehicleOwner: "John Davis",
      vehicleMake: "Honda",
      vehicleModel: "Accord",
      vehicleYear: "2019",
      licensePlate: "XYZ-5678",
      serviceType: "Brake Replacement",
      description: "Front brake pads and rotors replacement",
      priority: "high",
      status: "in-progress",
      scheduledDate: "2026-01-21",
      estimatedTime: "2 hours",
      assignedMechanic: "Mike Smith",
      parts: [
        { id: "1", name: "Brake Pads (Front)", quantity: 1, cost: 85 },
        { id: "2", name: "Brake Rotors (Front)", quantity: 2, cost: 120 },
      ],
      repairs: [
        {
          id: "1",
          description: "Removed old brake pads and rotors",
          timestamp: "2026-01-21 09:30",
        },
      ],
      notes: "Customer reported squeaking noise when braking",
    },
    {
      id: "JOB-003",
      vehicleOwner: "Emily Wilson",
      vehicleMake: "Ford",
      vehicleModel: "F-150",
      vehicleYear: "2021",
      licensePlate: "DEF-9012",
      serviceType: "Engine Diagnostic",
      description: "Check engine light diagnostic and repair",
      priority: "high",
      status: "pending",
      scheduledDate: "2026-01-22",
      estimatedTime: "2.5 hours",
      assignedMechanic: "Mike Smith",
      parts: [],
      repairs: [],
      notes: "Check engine light on, customer reports rough idle",
    },
    {
      id: "JOB-004",
      vehicleOwner: "Michael Brown",
      vehicleMake: "Chevrolet",
      vehicleModel: "Silverado",
      vehicleYear: "2018",
      licensePlate: "GHI-3456",
      serviceType: "Tire Rotation",
      description: "Rotate all four tires",
      priority: "low",
      status: "completed",
      scheduledDate: "2026-01-20",
      estimatedTime: "0.5 hours",
      assignedMechanic: "Mike Smith",
      parts: [],
      repairs: [
        {
          id: "1",
          description: "Rotated all four tires",
          timestamp: "2026-01-20 14:00",
        },
        {
          id: "2",
          description: "Checked tire pressure and adjusted",
          timestamp: "2026-01-20 14:15",
        },
      ],
      notes: "",
    },
  ]);

  const handleUpdateJob = (updatedJob: Job) => {
    setJobs(jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
    setSelectedJob(updatedJob);
  };

  const handleBackToList = () => {
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <MechanicHeader onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {selectedJob ? (
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
