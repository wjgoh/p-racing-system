import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Car, Plus, Calendar, Gauge } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  vin: string;
  mileage: number;
  lastService?: Date;
  nextService?: Date;
}

const mockVehicles: Vehicle[] = [
  {
    id: "V001",
    make: "Toyota",
    model: "Camry",
    year: 2020,
    color: "Silver",
    licensePlate: "ABC-1234",
    vin: "1HGBH41JXMN109186",
    mileage: 45000,
    lastService: new Date("2025-12-15"),
    nextService: new Date("2026-06-15"),
  },
  {
    id: "V002",
    make: "Honda",
    model: "Civic",
    year: 2019,
    color: "Blue",
    licensePlate: "XYZ-5678",
    vin: "2HGFC2F59KH123456",
    mileage: 62000,
    lastService: new Date("2025-11-20"),
    nextService: new Date("2026-05-20"),
  },
];

export function MyVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    licensePlate: "",
    vin: "",
    mileage: "",
  });

  const handleAddVehicle = () => {
    const vehicle: Vehicle = {
      id: `V${(vehicles.length + 1).toString().padStart(3, "0")}`,
      make: newVehicle.make,
      model: newVehicle.model,
      year: parseInt(newVehicle.year),
      color: newVehicle.color,
      licensePlate: newVehicle.licensePlate,
      vin: newVehicle.vin,
      mileage: parseInt(newVehicle.mileage),
    };
    setVehicles([...vehicles, vehicle]);
    setAddDialogOpen(false);
    setNewVehicle({
      make: "",
      model: "",
      year: "",
      color: "",
      licensePlate: "",
      vin: "",
      mileage: "",
    });
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-slate-500">{vehicle.color}</p>
                  </div>
                </div>
                <Badge variant="outline">{vehicle.licensePlate}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">VIN</p>
                  <p className="font-medium">{vehicle.vin}</p>
                </div>
                <div>
                  <p className="text-slate-500">Mileage</p>
                  <div className="flex items-center gap-1">
                    <Gauge className="h-4 w-4 text-slate-400" />
                    <p className="font-medium">
                      {vehicle.mileage.toLocaleString()} mi
                    </p>
                  </div>
                </div>
                {vehicle.lastService && (
                  <div>
                    <p className="text-slate-500">Last Service</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <p className="font-medium">
                        {vehicle.lastService.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {vehicle.nextService && (
                  <div>
                    <p className="text-slate-500">Next Service</p>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <p className="font-medium">
                        {vehicle.nextService.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
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
              <Label htmlFor="licensePlate">License Plate</Label>
              <Input
                id="licensePlate"
                placeholder="e.g., ABC-1234"
                value={newVehicle.licensePlate}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, licensePlate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                placeholder="17-character VIN"
                value={newVehicle.vin}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, vin: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mileage">Current Mileage</Label>
              <Input
                id="mileage"
                type="number"
                placeholder="e.g., 45000"
                value={newVehicle.mileage}
                onChange={(e) =>
                  setNewVehicle({ ...newVehicle, mileage: e.target.value })
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
                !newVehicle.make ||
                !newVehicle.model ||
                !newVehicle.year ||
                !newVehicle.licensePlate
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
