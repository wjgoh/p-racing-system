import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  apiCreateBooking,
  apiListBookings,
  apiListVehicles,
  apiListWorkshops,
  type Booking,
  type Vehicle,
  type Workshop,
} from "../api/bookings";
import { getStoredUser } from "../api/session";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "in-progress"
  | "completed";

const serviceTypes = [
  "Oil Change",
  "Brake Service",
  "Tire Rotation",
  "Engine Diagnostic",
  "Transmission Service",
  "Battery Check",
  "AC Service",
  "General Inspection",
  "Other",
];

const timeSlots = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

export function ServiceRequest() {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    Promise.all([
      apiListVehicles(user.owner_id),
      apiListWorkshops(),
      apiListBookings({ ownerId: user.owner_id }),
    ])
      .then(([vehicleList, workshopList, bookingList]) => {
        setVehicles(vehicleList);
        setWorkshops(workshopList);
        setRequests(bookingList);
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to load data");
      })
      .finally(() => setLoading(false));
  }, []);

  const getVehicleLabel = (booking: Booking) => {
    const found = vehicles.find((v) => v.vehicle_id === booking.vehicle_id);
    if (found) {
      const year = found.year ? `${found.year} ` : "";
      const make = found.make ?? "";
      const model = found.model ?? "";
      const plate = found.plate_number ? ` (${found.plate_number})` : "";
      return `${year}${make} ${model}`.trim() + plate;
    }

    if (booking.make || booking.model || booking.plate_number) {
      const year = booking.year ? `${booking.year} ` : "";
      const make = booking.make ?? "";
      const model = booking.model ?? "";
      const plate = booking.plate_number ? ` (${booking.plate_number})` : "";
      return `${year}${make} ${model}`.trim() + plate;
    }

    return "Vehicle";
  };

  const handleSubmit = () => {
    if (
      !selectedWorkshop ||
      !selectedVehicle ||
      !serviceType ||
      !preferredDate ||
      !preferredTime
    ) {
      return;
    }

    const user = getStoredUser();
    if (!user) {
      setError("Please log in again.");
      return;
    }
    if (!user.owner_id) {
      setError("Owner profile not found. Please log in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    apiCreateBooking({
      ownerId: user.owner_id,
      workshopId: Number(selectedWorkshop),
      vehicleId: Number(selectedVehicle),
      customerName: user.name,
      customerEmail: user.email,
      serviceType,
      preferredDate,
      preferredTime,
      description: description || null,
    })
      .then(() => apiListBookings({ ownerId: user.owner_id }))
      .then((bookingList) => {
        setRequests(bookingList);
        setShowForm(false);
        setSelectedVehicle("");
        setSelectedWorkshop("");
        setServiceType("");
        setPreferredDate(undefined);
        setPreferredTime("");
        setDescription("");
      })
      .catch((err: any) => {
        setError(err?.message ?? "Failed to create request");
      })
      .finally(() => setSubmitting(false));
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      case "confirmed":
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Service Requests
          </h2>
          <p className="text-slate-600 mt-1">
            Request service for your vehicles
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? "Cancel" : "New Request"}
        </Button>
      </div>

      {/* Request Form */}
      {showForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">New Service Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="workshop">Select Workshop</Label>
              <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
                <SelectTrigger id="workshop">
                  <SelectValue placeholder="Choose a workshop" />
                </SelectTrigger>
                <SelectContent>
                  {workshops.map((workshop) => (
                    <SelectItem
                      key={workshop.workshop_id}
                      value={String(workshop.workshop_id)}
                    >
                      {workshop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vehicle">Select Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => {
                    const year = vehicle.year ? `${vehicle.year} ` : "";
                    const make = vehicle.make ?? "";
                    const model = vehicle.model ?? "";
                    const plate = vehicle.plate_number
                      ? ` (${vehicle.plate_number})`
                      : "";
                    const label = `${year}${make} ${model}`.trim() + plate;
                    return (
                      <SelectItem
                        key={vehicle.vehicle_id}
                        value={String(vehicle.vehicle_id)}
                      >
                        {label || `Vehicle ${vehicle.vehicle_id}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="serviceType">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredDate">Preferred Date</Label>
              <Input
                id="preferredDate"
                type="date"
                value={preferredDate}
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Preferred Time</Label>
              <Select value={preferredTime} onValueChange={setPreferredTime}>
                <SelectTrigger id="time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe any issues or special requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedWorkshop ||
                !selectedVehicle ||
                !serviceType ||
                !preferredDate ||
                !preferredTime ||
                submitting
              }
              className="flex-1"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Requests List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Your Requests</h3>
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {requests.map((request) => (
          <Card key={request.booking_id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-lg">#{request.booking_id}</h4>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{getVehicleLabel(request)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{request.service_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Preferred Date: </span>
                      <span className="font-medium">
                        {request.preferred_date
                          ? format(new Date(request.preferred_date), "MMM dd, yyyy")
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Preferred Time: </span>
                      <span className="font-medium">{request.preferred_time}</span>
                    </div>
                    {request.description && (
                      <div className="md:col-span-2">
                        <span className="text-slate-500">Description: </span>
                        <span className="font-medium">{request.description}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
                  {request.status === "pending" && (
                    <Button variant="outline" className="flex-1 md:flex-none">
                      Cancel Request
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 md:flex-none">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && requests.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-slate-500 mb-4">No service requests yet</p>
            <Button onClick={() => setShowForm(true)}>
              Create Your First Request
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
