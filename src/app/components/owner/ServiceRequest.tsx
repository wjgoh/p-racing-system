import { useState } from "react";
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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ServiceRequest {
  id: string;
  vehicle: string;
  serviceType: string;
  preferredDate: Date;
  preferredTime: string;
  description: string;
  status: "pending" | "confirmed" | "in-progress" | "completed";
  createdAt: Date;
}

const mockRequests: ServiceRequest[] = [
  {
    id: "SR001",
    vehicle: "2020 Toyota Camry (ABC-1234)",
    serviceType: "Oil Change",
    preferredDate: new Date("2026-01-25"),
    preferredTime: "10:00 AM",
    description: "Regular oil change service",
    status: "confirmed",
    createdAt: new Date("2026-01-20"),
  },
  {
    id: "SR002",
    vehicle: "2019 Honda Civic (XYZ-5678)",
    serviceType: "Brake Inspection",
    preferredDate: new Date("2026-01-28"),
    preferredTime: "2:00 PM",
    description: "Brake warning light is on",
    status: "pending",
    createdAt: new Date("2026-01-22"),
  },
];

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
  const [requests, setRequests] = useState<ServiceRequest[]>(mockRequests);
  const [showForm, setShowForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState<Date>();
  const [preferredTime, setPreferredTime] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!selectedVehicle || !serviceType || !preferredDate || !preferredTime) {
      return;
    }

    const newRequest: ServiceRequest = {
      id: `SR${(requests.length + 1).toString().padStart(3, "0")}`,
      vehicle: selectedVehicle,
      serviceType,
      preferredDate,
      preferredTime,
      description,
      status: "pending",
      createdAt: new Date(),
    };

    setRequests([newRequest, ...requests]);
    setShowForm(false);
    setSelectedVehicle("");
    setServiceType("");
    setPreferredDate(undefined);
    setPreferredTime("");
    setDescription("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "completed":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4" />;
      case "confirmed":
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
              <Label htmlFor="vehicle">Select Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Choose a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2020 Toyota Camry (ABC-1234)">
                    2020 Toyota Camry (ABC-1234)
                  </SelectItem>
                  <SelectItem value="2019 Honda Civic (XYZ-5678)">
                    2019 Honda Civic (XYZ-5678)
                  </SelectItem>
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
              <Label>Preferred Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {preferredDate ? (
                      format(preferredDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={preferredDate}
                    onSelect={setPreferredDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                !selectedVehicle || !serviceType || !preferredDate || !preferredTime
              }
              className="flex-1"
            >
              Submit Request
            </Button>
          </div>
        </Card>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Your Requests</h3>
        {requests.map((request) => (
          <Card key={request.id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-lg">#{request.id}</h4>
                    <Badge className={getStatusColor(request.status)}>
                      {getStatusIcon(request.status)}
                      <span className="ml-1">{request.status}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{request.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{request.serviceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Preferred Date: </span>
                      <span className="font-medium">
                        {format(request.preferredDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Preferred Time: </span>
                      <span className="font-medium">{request.preferredTime}</span>
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

        {requests.length === 0 && (
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
