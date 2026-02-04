import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  ArrowLeft,
  Car,
  Calendar,
  Clock,
  User,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import type { Job } from "../MechanicDashboard";
import {
  apiAddJobPart,
  apiAddJobRepair,
  apiRemoveJobPart,
  apiUpdateJobNotes,
  apiUpdateMechanicJobStatus,
} from "../api/mechanic";
import { apiUpdateVehicleService } from "../api/bookings";
import { addMonths, format } from "date-fns";

interface JobDetailsProps {
  job: Job;
  onUpdateJob: (job: Job) => void;
  onBack: () => void;
}

export function JobDetails({ job, onUpdateJob, onBack }: JobDetailsProps) {
  const [currentJob, setCurrentJob] = useState<Job>(job);
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isAddRepairDialogOpen, setIsAddRepairDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [partSaving, setPartSaving] = useState(false);
  const [repairSaving, setRepairSaving] = useState(false);
  const [removingPartId, setRemovingPartId] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState("");
  const [serviceMileage, setServiceMileage] = useState("");
  const [serviceSaving, setServiceSaving] = useState(false);
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);
  const [newPart, setNewPart] = useState({
    name: "",
    quantity: 1,
    cost: 0,
  });
  const [newRepair, setNewRepair] = useState("");

  useEffect(() => {
    setCurrentJob(job);
    const parsed = job.scheduledDate ? new Date(job.scheduledDate) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) {
      setServiceDate(format(parsed, "yyyy-MM-dd"));
    } else {
      setServiceDate(format(new Date(), "yyyy-MM-dd"));
    }
    setServiceMileage("");
    setServiceMessage(null);
  }, [job]);

  const handleStatusChange = async (status: Job["status"]) => {
    if (statusSaving) return;
    setError(null);
    setStatusSaving(true);
    const previousStatus = currentJob.status;
    const updatedJob = { ...currentJob, status };
    setCurrentJob(updatedJob);
    try {
      await apiUpdateMechanicJobStatus({
        jobId: currentJob.jobId,
        status,
      });
      onUpdateJob(updatedJob);
    } catch (err: any) {
      setCurrentJob({ ...currentJob, status: previousStatus });
      setError(err?.message ?? "Failed to update job status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleAddPart = async () => {
    if (!newPart.name.trim() || partSaving) return;
    setError(null);
    setPartSaving(true);
    try {
      const created = await apiAddJobPart({
        jobId: currentJob.jobId,
        name: newPart.name.trim(),
        quantity: newPart.quantity,
        cost: newPart.cost,
      });
      const part = {
        id: String(created.part_id),
        name: created.name,
        quantity: created.quantity,
        cost: Number(created.unit_cost ?? 0),
      };
      const updatedJob = {
        ...currentJob,
        parts: [...currentJob.parts, part],
      };
      setCurrentJob(updatedJob);
      onUpdateJob(updatedJob);
      setNewPart({ name: "", quantity: 1, cost: 0 });
      setIsAddPartDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to add part");
    } finally {
      setPartSaving(false);
    }
  };

  const handleRemovePart = async (partId: string) => {
    if (removingPartId) return;
    setError(null);
    setRemovingPartId(partId);
    try {
      await apiRemoveJobPart(Number(partId));
      const updatedJob = {
        ...currentJob,
        parts: currentJob.parts.filter((p) => p.id !== partId),
      };
      setCurrentJob(updatedJob);
      onUpdateJob(updatedJob);
    } catch (err: any) {
      setError(err?.message ?? "Failed to remove part");
    } finally {
      setRemovingPartId(null);
    }
  };

  const handleAddRepair = async () => {
    if (!newRepair.trim() || repairSaving) return;
    setError(null);
    setRepairSaving(true);
    try {
      const created = await apiAddJobRepair({
        jobId: currentJob.jobId,
        description: newRepair.trim(),
      });
      const repair = {
        id: String(created.repair_id),
        description: created.description,
        timestamp: created.logged_at
          ? new Date(created.logged_at).toLocaleString()
          : new Date().toLocaleString(),
      };
      const updatedJob = {
        ...currentJob,
        repairs: [...currentJob.repairs, repair],
      };
      setCurrentJob(updatedJob);
      onUpdateJob(updatedJob);
      setNewRepair("");
      setIsAddRepairDialogOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to add repair log");
    } finally {
      setRepairSaving(false);
    }
  };

  const handleNotesChange = (notes: string) => {
    const updatedJob = { ...currentJob, notes };
    setCurrentJob(updatedJob);
  };

  const handleSaveNotes = async () => {
    if (notesSaving) return;
    setError(null);
    setNotesSaving(true);
    try {
      await apiUpdateJobNotes({
        jobId: currentJob.jobId,
        notes: currentJob.notes,
      });
      onUpdateJob(currentJob);
    } catch (err: any) {
      setError(err?.message ?? "Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const totalPartsCost = currentJob.parts.reduce(
    (sum, part) => sum + part.cost * part.quantity,
    0
  );

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

  const SERVICE_INTERVAL_MONTHS = 6;
  const SERVICE_INTERVAL_MILES = 5000;

  const nextServiceDate =
    serviceDate && !Number.isNaN(new Date(serviceDate).getTime())
      ? format(addMonths(new Date(serviceDate), SERVICE_INTERVAL_MONTHS), "MMM dd, yyyy")
      : "-";

  const nextServiceMileage =
    serviceMileage && !Number.isNaN(Number(serviceMileage))
      ? (Number(serviceMileage) + SERVICE_INTERVAL_MILES).toLocaleString()
      : "-";

  const handleServiceUpdate = async () => {
    if (serviceSaving) return;
    if (!currentJob.vehicleId) {
      setServiceMessage("No vehicle linked to this job.");
      return;
    }
    if (!serviceDate && !serviceMileage) {
      setServiceMessage("Provide service date or mileage.");
      return;
    }

    setServiceSaving(true);
    setServiceMessage(null);
    try {
      await apiUpdateVehicleService({
        vehicleId: currentJob.vehicleId,
        lastServiceDate: serviceDate || null,
        lastServiceMileage: serviceMileage ? Number(serviceMileage) : null,
      });
      setServiceMessage("Service record updated. Share next service info with the owner.");
    } catch (err: any) {
      setServiceMessage(err?.message ?? "Failed to update service record");
    } finally {
      setServiceSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button onClick={onBack} variant="ghost" className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Job Header */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="text-2xl font-bold">{currentJob.id}</h2>
              <Badge variant={getStatusBadgeVariant(currentJob.status)}>
                {currentJob.status}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(currentJob.priority)}>
                {currentJob.priority} priority
              </Badge>
            </div>
            <h3 className="text-xl font-semibold">{currentJob.serviceType}</h3>
          </div>

          <div className="w-full sm:w-48">
            <Label htmlFor="job-status">Update Status</Label>
            <Select
              value={currentJob.status}
              onValueChange={(value) =>
                handleStatusChange(value as Job["status"])
              }
              disabled={statusSaving}
            >
              <SelectTrigger id="job-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="on-hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Vehicle & Customer Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium">
                {currentJob.vehicleYear} {currentJob.vehicleMake}{" "}
                {currentJob.vehicleModel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5" />
            <div>
              <p className="text-sm text-muted-foreground">License Plate</p>
              <p className="font-medium">{currentJob.licensePlate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Owner</p>
              <p className="font-medium">{currentJob.vehicleOwner}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Scheduled Date</p>
              <p className="font-medium">{currentJob.scheduledDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Estimated Time</p>
              <p className="font-medium">{currentJob.estimatedTime}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="pt-4 border-t mt-4">
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p>{currentJob.description}</p>
        </div>
      </Card>

      {/* Parts Used */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Parts Used</h3>
          <Button
            onClick={() => setIsAddPartDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </Button>
        </div>

        {currentJob.parts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No parts added yet
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {currentJob.parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-3 bg-accent rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{part.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {part.quantity} x ${part.cost.toFixed(2)} = $
                      {(part.quantity * part.cost).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemovePart(part.id)}
                    className="text-destructive"
                    disabled={removingPartId === part.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Parts Cost</p>
                <p className="text-xl font-bold">${totalPartsCost.toFixed(2)}</p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Repair Log */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Repair Log</h3>
          <Button
            onClick={() => setIsAddRepairDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Log Repair
          </Button>
        </div>

        {currentJob.repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No repairs logged yet
          </p>
        ) : (
          <div className="space-y-3">
            {currentJob.repairs.map((repair) => (
              <div key={repair.id} className="p-3 bg-accent rounded-lg">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-medium flex-1">{repair.description}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {repair.timestamp}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Service Record */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Service Record</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="service-date">Last Service Date</Label>
            <Input
              id="service-date"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-mileage">Last Service Mileage</Label>
            <Input
              id="service-mileage"
              type="number"
              min="0"
              placeholder="e.g., 45000"
              value={serviceMileage}
              onChange={(e) => setServiceMileage(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm text-slate-600">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Next Service Date (Auto)
            </p>
            <p className="font-medium text-slate-700">{nextServiceDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Next Service Mileage (Auto)
            </p>
            <p className="font-medium text-slate-700">{nextServiceMileage}</p>
          </div>
        </div>

        {serviceMessage && (
          <p className="text-sm text-slate-600 mt-3">{serviceMessage}</p>
        )}

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleServiceUpdate}
            disabled={serviceSaving || (!serviceDate && !serviceMileage)}
            className="gap-2"
          >
            {serviceSaving ? "Updating..." : "Update Service Record"}
          </Button>
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <Textarea
          placeholder="Add notes about this job..."
          value={currentJob.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={4}
          className="mb-4"
        />
        <Button onClick={handleSaveNotes} className="gap-2" disabled={notesSaving}>
          <Save className="h-4 w-4" />
          {notesSaving ? "Saving..." : "Save Notes"}
        </Button>
      </Card>

      {/* Add Part Dialog */}
      <Dialog open={isAddPartDialogOpen} onOpenChange={setIsAddPartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>
              Add a new part used for this repair job.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="part-name">Part Name</Label>
              <Input
                id="part-name"
                placeholder="e.g., Brake Pads"
                value={newPart.name}
                onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-quantity">Quantity</Label>
              <Input
                id="part-quantity"
                type="number"
                min="1"
                value={newPart.quantity}
                onChange={(e) =>
                  setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="part-cost">Cost (per unit)</Label>
              <Input
                id="part-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={newPart.cost}
                onChange={(e) =>
                  setNewPart({ ...newPart, cost: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPartDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPart} disabled={partSaving}>
              {partSaving ? "Adding..." : "Add Part"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Repair Dialog */}
      <Dialog
        open={isAddRepairDialogOpen}
        onOpenChange={setIsAddRepairDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Repair</DialogTitle>
            <DialogDescription>
              Record the repair work completed on this vehicle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repair-description">Repair Description</Label>
              <Textarea
                id="repair-description"
                placeholder="Describe the repair work performed..."
                value={newRepair}
                onChange={(e) => setNewRepair(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddRepairDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddRepair} disabled={repairSaving}>
              {repairSaving ? "Logging..." : "Log Repair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
