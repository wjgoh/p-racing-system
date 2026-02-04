import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Car, Plus } from "lucide-react";
import {
  apiCreateVehicle,
  apiListVehicleHistory,
  apiListVehicles,
  apiUpdateVehicleService,
  type Vehicle,
  type VehicleServiceRecord,
} from "../api/bookings";
import { getStoredUser } from "../api/session";
import { addMonths, format } from "date-fns";

export function MyVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [historyRecords, setHistoryRecords] = useState<VehicleServiceRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceUpdating, setServiceUpdating] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
    lastServiceDate: "",
    nextServiceDate: "",
    lastServiceMileage: "",
    nextServiceMileage: "",
  });
  const [serviceForm, setServiceForm] = useState({
    lastServiceDate: "",
    lastServiceMileage: "",
  });

  const SERVICE_INTERVAL_MONTHS = 6;
  const SERVICE_INTERVAL_MILES = 5000;

  const formatDateValue = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return format(date, "MMM dd, yyyy");
  };

  const formatMileageValue = (value?: number | null) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toLocaleString();
  };

  const computeNextDatePreview = (dateValue: string) => {
    if (!dateValue) return "-";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "-";
    return format(addMonths(parsed, SERVICE_INTERVAL_MONTHS), "MMM dd, yyyy");
  };

  const computeNextMileagePreview = (mileageValue: string) => {
    if (!mileageValue) return "-";
    const parsed = Number(mileageValue);
    if (Number.isNaN(parsed)) return "-";
    return Number(parsed + SERVICE_INTERVAL_MILES).toLocaleString();
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      setError("Please log in again.");
      return;
    }
    if (!user.owner_id) {
      setError("Owner profile not found. Please log in again.");
      return;
    }

    setLoading(true);
    setError(null);
    apiListVehicles(user.owner_id)
      .then((list) => setVehicles(list))
      .catch((err: any) => setError(err?.message ?? "Failed to load vehicles"))
      .finally(() => setLoading(false));
  }, []);

  const handleAddVehicle = () => {
    const user = getStoredUser();
    if (!user || !user.owner_id) {
      setError("Please log in again.");
      return;
    }

    setError(null);
    apiCreateVehicle({
      ownerId: user.owner_id,
      plateNumber: newVehicle.plateNumber,
      make: newVehicle.make || null,
      model: newVehicle.model || null,
      year: newVehicle.year || null,
      color: newVehicle.color || null,
      lastServiceDate: newVehicle.lastServiceDate || null,
      nextServiceDate: newVehicle.nextServiceDate || null,
      lastServiceMileage: newVehicle.lastServiceMileage
        ? Number(newVehicle.lastServiceMileage)
        : null,
      nextServiceMileage: newVehicle.nextServiceMileage
        ? Number(newVehicle.nextServiceMileage)
        : null,
    })
      .then(() => apiListVehicles(user.owner_id))
      .then((list) => {
        setVehicles(list);
        setAddDialogOpen(false);
        setNewVehicle({
          make: "",
          model: "",
          year: "",
          color: "",
          plateNumber: "",
          lastServiceDate: "",
          nextServiceDate: "",
          lastServiceMileage: "",
          nextServiceMileage: "",
        });
      })
      .catch((err: any) => setError(err?.message ?? "Failed to add vehicle"));
  };

  const handleOpenDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setServiceForm({
      lastServiceDate: vehicle.last_service_date ?? "",
      lastServiceMileage:
        vehicle.last_service_mileage !== null &&
        vehicle.last_service_mileage !== undefined
          ? String(vehicle.last_service_mileage)
          : "",
    });
    setDetailsDialogOpen(true);
  };

  const handleUpdateService = () => {
    if (!selectedVehicle) return;
    const user = getStoredUser();
    if (!user || !user.owner_id) {
      setError("Please log in again.");
      return;
    }

    setServiceUpdating(true);
    setError(null);
    apiUpdateVehicleService({
      vehicleId: selectedVehicle.vehicle_id,
      ownerId: user.owner_id,
      lastServiceDate: serviceForm.lastServiceDate || null,
      lastServiceMileage: serviceForm.lastServiceMileage
        ? Number(serviceForm.lastServiceMileage)
        : null,
    })
      .then(() => apiListVehicles(user.owner_id))
      .then((list) => {
        setVehicles(list);
        setDetailsDialogOpen(false);
        setSelectedVehicle(null);
      })
      .catch((err: any) =>
        setError(err?.message ?? "Failed to update service record")
      )
      .finally(() => setServiceUpdating(false));
  };

  const loadHistory = async (vehicle: Vehicle) => {
    const user = getStoredUser();
    if (!user || !user.owner_id) {
      setHistoryError("Please log in again.");
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await apiListVehicleHistory({
        vehicleId: vehicle.vehicle_id,
        ownerId: user.owner_id,
      });
      setHistoryRecords(history);
    } catch (err: any) {
      setHistoryError(err?.message ?? "Failed to load service history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenHistory = (vehicle: Vehicle) => {
    setHistoryVehicle(vehicle);
    setHistoryDialogOpen(true);
    setHistoryRecords([]);
    void loadHistory(vehicle);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">My Vehicles</h2>
          <p className="text-slate-600 mt-1">Manage your registered vehicles</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Vehicles Grid */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.vehicle_id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {vehicle.year ?? ""} {vehicle.make ?? ""} {vehicle.model ?? ""}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {vehicle.color ?? "-"}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">{vehicle.plate_number}</Badge>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenDetails(vehicle)}
                >
                  View Details
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpenHistory(vehicle)}
                >
                  Service History
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Last Service Date
                  </p>
                  <p className="font-medium text-slate-700">
                    {formatDateValue(vehicle.last_service_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Next Service Date
                  </p>
                  <p className="font-medium text-slate-700">
                    {vehicle.next_service_date
                      ? formatDateValue(vehicle.next_service_date)
                      : vehicle.last_service_date
                      ? computeNextDatePreview(vehicle.last_service_date)
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Last Service Mileage
                  </p>
                  <p className="font-medium text-slate-700">
                    {formatMileageValue(vehicle.last_service_mileage)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Next Service Mileage
                  </p>
                  <p className="font-medium text-slate-700">
                    {vehicle.next_service_mileage !== null &&
                    vehicle.next_service_mileage !== undefined
                      ? formatMileageValue(vehicle.next_service_mileage)
                      : vehicle.last_service_mileage !== null &&
                        vehicle.last_service_mileage !== undefined
                      ? formatMileageValue(
                          vehicle.last_service_mileage + SERVICE_INTERVAL_MILES
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {vehicles.length === 0 && (
        <Card className="p-12 text-center">
          <Car className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No vehicles registered yet</p>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Vehicle
          </Button>
        </Card>
      )}

      {/* Add Vehicle Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                placeholder="e.g., 2020"
                value={newVehicle.year}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, year: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                placeholder="e.g., Silver"
                value={newVehicle.color}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, color: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                placeholder="e.g., Toyota"
                value={newVehicle.make}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, make: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                placeholder="e.g., Camry"
                value={newVehicle.model}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, model: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="plateNumber">License Plate</Label>
              <Input
                id="plateNumber"
                placeholder="e.g., ABC-1234"
                value={newVehicle.plateNumber}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, plateNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastServiceDate">Last Service Date</Label>
              <Input
                id="lastServiceDate"
                type="date"
                value={newVehicle.lastServiceDate}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, lastServiceDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextServiceDate">Next Service Date</Label>
              <Input
                id="nextServiceDate"
                type="date"
                value={newVehicle.nextServiceDate}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, nextServiceDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastServiceMileage">Last Service Mileage</Label>
              <Input
                id="lastServiceMileage"
                type="number"
                min="0"
                placeholder="e.g., 45000"
                value={newVehicle.lastServiceMileage}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    lastServiceMileage: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextServiceMileage">Next Service Mileage</Label>
              <Input
                id="nextServiceMileage"
                type="number"
                min="0"
                placeholder="e.g., 50000"
                value={newVehicle.nextServiceMileage}
                onChange={(e) =>
                  setNewVehicle({
                    ...newVehicle,
                    nextServiceMileage: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddVehicle}
              disabled={
                !newVehicle.plateNumber
              }
            >
              Add Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Vehicle Service Details</DialogTitle>
          </DialogHeader>
          {selectedVehicle && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <p>
                  <span className="text-slate-500">Vehicle:</span>{" "}
                  {selectedVehicle.year ?? ""} {selectedVehicle.make ?? ""}{" "}
                  {selectedVehicle.model ?? ""}
                </p>
                <p>
                  <span className="text-slate-500">Plate:</span>{" "}
                  {selectedVehicle.plate_number}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="detailLastServiceDate">Last Service Date</Label>
                  <Input
                    id="detailLastServiceDate"
                    type="date"
                    value={serviceForm.lastServiceDate}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        lastServiceDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detailLastServiceMileage">
                    Last Service Mileage
                  </Label>
                  <Input
                    id="detailLastServiceMileage"
                    type="number"
                    min="0"
                    value={serviceForm.lastServiceMileage}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        lastServiceMileage: e.target.value,
                      })
                    }
                    placeholder="e.g., 45000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Next Service Date (Auto)
                  </p>
                  <p className="font-medium text-slate-700">
                    {computeNextDatePreview(serviceForm.lastServiceDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Next Service Mileage (Auto)
                  </p>
                  <p className="font-medium text-slate-700">
                    {computeNextMileagePreview(serviceForm.lastServiceMileage)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleUpdateService}
              disabled={
                serviceUpdating ||
                (!serviceForm.lastServiceDate && !serviceForm.lastServiceMileage)
              }
            >
              {serviceUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Service History</DialogTitle>
          </DialogHeader>
          {historyVehicle && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm space-y-1">
                <p>
                  <span className="text-slate-500">Vehicle:</span>{" "}
                  {historyVehicle.year ?? ""} {historyVehicle.make ?? ""}{" "}
                  {historyVehicle.model ?? ""}
                </p>
                <p>
                  <span className="text-slate-500">Plate:</span>{" "}
                  {historyVehicle.plate_number}
                </p>
              </div>

              {historyLoading && (
                <p className="text-sm text-slate-500">Loading history...</p>
              )}
              {historyError && (
                <p className="text-sm text-red-500">{historyError}</p>
              )}

              {!historyLoading && historyRecords.length === 0 && (
                <Card className="p-6 text-center">
                  <p className="text-slate-500">No service history yet</p>
                </Card>
              )}

              <div className="space-y-3">
                {historyRecords.map((record) => {
                  const serviceDate =
                    record.performed_at ||
                    record.completed_at ||
                    record.scheduled_date;
                  return (
                    <Card key={record.job_id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">Job #{record.job_id}</Badge>
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Completed
                            </Badge>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {record.service_type ?? "Service"}
                          </p>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>
                              <span className="text-slate-500">Date: </span>
                              {serviceDate ? formatDateValue(serviceDate) : "-"}
                            </p>
                            <p>
                              <span className="text-slate-500">Mechanic: </span>
                              {record.mechanic_name ?? "-"}
                            </p>
                            {record.total_cost !== null && (
                              <p>
                                <span className="text-slate-500">Cost: </span>$
                                {Number(record.total_cost).toFixed(2)}
                              </p>
                            )}
                          </div>
                          {record.description && (
                            <div className="text-sm text-slate-600 bg-slate-50 rounded-md p-3">
                              {record.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
