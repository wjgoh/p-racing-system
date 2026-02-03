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
import { apiCreateVehicle, apiListVehicles, type Vehicle } from "../api/bookings";
import { getStoredUser } from "../api/session";

export function MyVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
  });

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
        });
      })
      .catch((err: any) => setError(err?.message ?? "Failed to add vehicle"));
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
                <Button variant="outline" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" className="flex-1">
                  Service History
                </Button>
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
    </div>
  );
}
