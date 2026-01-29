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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Reservation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicle: string;
  serviceType: string;
  requestedDate: Date;
  requestedTime: string;
  status: "pending" | "confirmed" | "rejected" | "completed";
  notes?: string;
  createdAt: Date;
}

const mockReservations: Reservation[] = [
  {
    id: "R001",
    customerName: "Alice Cooper",
    customerEmail: "alice@example.com",
    customerPhone: "+1 (555) 123-4567",
    vehicle: "BMW X5 2021",
    serviceType: "Annual Service",
    requestedDate: new Date("2026-01-24"),
    requestedTime: "10:00 AM",
    status: "pending",
    notes: "Customer prefers morning slot",
    createdAt: new Date("2026-01-22T08:00:00"),
  },
  {
    id: "R002",
    customerName: "Bob Williams",
    customerEmail: "bob@example.com",
    customerPhone: "+1 (555) 234-5678",
    vehicle: "Mercedes C-Class 2020",
    serviceType: "Engine Diagnostic",
    requestedDate: new Date("2026-01-23"),
    requestedTime: "2:00 PM",
    status: "confirmed",
    createdAt: new Date("2026-01-21T15:30:00"),
  },
  {
    id: "R003",
    customerName: "Carol Martinez",
    customerEmail: "carol@example.com",
    customerPhone: "+1 (555) 345-6789",
    vehicle: "Audi A4 2019",
    serviceType: "Brake Replacement",
    requestedDate: new Date("2026-01-25"),
    requestedTime: "9:00 AM",
    status: "pending",
    notes: "Urgent - brake warning light on",
    createdAt: new Date("2026-01-22T11:20:00"),
  },
  {
    id: "R004",
    customerName: "David Chen",
    customerEmail: "david@example.com",
    customerPhone: "+1 (555) 456-7890",
    vehicle: "Lexus RX 2022",
    serviceType: "Oil Change",
    requestedDate: new Date("2026-01-23"),
    requestedTime: "11:00 AM",
    status: "rejected",
    notes: "Slot unavailable - offered alternative",
    createdAt: new Date("2026-01-20T09:15:00"),
  },
];

export function ReservationQueue() {
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(
    null
  );

  const filteredReservations = reservations
    .filter((res) => filterStatus === "all" || res.status === filterStatus)
    .sort((a, b) => {
      // Sort by status priority: pending > confirmed > rejected > completed
      const statusOrder = { pending: 0, confirmed: 1, rejected: 2, completed: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  const handleUpdateStatus = (
    reservationId: string,
    newStatus: "confirmed" | "rejected"
  ) => {
    setReservations(
      reservations.map((res) =>
        res.id === reservationId ? { ...res, status: newStatus } : res
      )
    );
    setDetailsDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "confirmed":
        return "bg-green-100 text-green-700 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
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
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const pendingCount = reservations.filter((r) => r.status === "pending").length;
  const confirmedCount = reservations.filter((r) => r.status === "confirmed").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Reservation Queue</h2>
        <p className="text-slate-600 mt-1">
          Manage customer service reservations and appointments
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Pending</p>
            <p className="text-2xl font-semibold text-yellow-600">{pendingCount}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Confirmed</p>
            <p className="text-2xl font-semibold text-green-600">{confirmedCount}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">This Week</p>
            <p className="text-2xl font-semibold text-blue-600">
              {reservations.filter((r) => r.status === "confirmed").length}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-semibold text-slate-900">
              {reservations.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reservations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {/* Reservations List */}
      <div className="space-y-4">
        {filteredReservations.map((reservation) => (
          <Card key={reservation.id} className="p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">#{reservation.id}</h3>
                    <Badge className={getStatusColor(reservation.status)}>
                      {getStatusIcon(reservation.status)}
                      <span className="ml-1">{reservation.status}</span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Customer: </span>
                      <span className="font-medium">{reservation.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Phone: </span>
                      <span className="font-medium">{reservation.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Vehicle: </span>
                      <span className="font-medium">{reservation.vehicle}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Service: </span>
                      <span className="font-medium">{reservation.serviceType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">
                        {format(reservation.requestedDate, "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="font-medium">{reservation.requestedTime}</span>
                    </div>
                  </div>

                  {reservation.notes && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Notes: </span>
                        {reservation.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedReservation(reservation);
                      setDetailsDialogOpen(true);
                    }}
                    className="flex-1 md:flex-none"
                  >
                    View Details
                  </Button>
                  {reservation.status === "pending" && (
                    <>
                      <Button
                        onClick={() => handleUpdateStatus(reservation.id, "confirmed")}
                        className="flex-1 md:flex-none gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Confirm
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleUpdateStatus(reservation.id, "rejected")}
                        className="flex-1 md:flex-none gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredReservations.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-slate-500">No reservations found</p>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reservation Details - #{selectedReservation?.id}</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Customer Name</Label>
                  <p className="font-medium mt-1">
                    {selectedReservation.customerName}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="font-medium mt-1">
                    {selectedReservation.customerEmail}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Phone</Label>
                  <p className="font-medium mt-1">
                    {selectedReservation.customerPhone}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Vehicle</Label>
                  <p className="font-medium mt-1">{selectedReservation.vehicle}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Service Type</Label>
                  <p className="font-medium mt-1">
                    {selectedReservation.serviceType}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedReservation.status)}>
                      {selectedReservation.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Requested Date</Label>
                  <p className="font-medium mt-1">
                    {format(selectedReservation.requestedDate, "MMMM dd, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">Requested Time</Label>
                  <p className="font-medium mt-1">
                    {selectedReservation.requestedTime}
                  </p>
                </div>
              </div>
              {selectedReservation.notes && (
                <div>
                  <Label className="text-slate-500">Notes</Label>
                  <p className="font-medium mt-1 p-3 bg-slate-50 rounded-lg">
                    {selectedReservation.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedReservation?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedReservation &&
                    handleUpdateStatus(selectedReservation.id, "rejected")
                  }
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() =>
                    selectedReservation &&
                    handleUpdateStatus(selectedReservation.id, "confirmed")
                  }
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </Button>
              </>
            )}
            {selectedReservation?.status !== "pending" && (
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
