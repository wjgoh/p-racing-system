import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Clock, Wrench, Eye, CheckCircle, AlertCircle } from "lucide-react";
import { apiGetServiceHistory } from "../api/owner";
import { getStoredUser } from "../api/session";

interface ServiceRecord {
  record_id?: string;
  id?: string;
  vehicleId?: string;
  vehicle_id?: string;
  vehicleName?: string;
  make?: string;
  model?: string;
  year?: string;
  plate_number?: string;
  serviceType?: string;
  service_type?: string;
  description: string;
  serviceDate?: string;
  performed_at?: string;
  completionDate?: string;
  mileage?: number;
  cost: number;
  status?: "completed" | "pending" | "in-progress" | "cancelled";
  workshopName?: string;
  workshop_name?: string;
  notes?: string;
  partReplaced?: string[];
}

export function ServiceHistory() {
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const loadServiceHistory = async () => {
      try {
        const user = getStoredUser();
        if (!user || !user.owner_id) {
          setError("Please log in to view service history");
          return;
        }

        const records = await apiGetServiceHistory(user.owner_id);
        setServiceRecords(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load service history");
      } finally {
        setLoading(false);
      }
    };

    loadServiceHistory();
  }, []);

  const uniqueVehicles = Array.from(
    new Set(serviceRecords.map((r) => r.vehicleName || r.make)),
  );

  const filteredRecords = serviceRecords.filter((record) => {
    if (vehicleFilter !== "all" && record.vehicleName !== vehicleFilter)
      return false;
    if (statusFilter !== "all" && record.status !== statusFilter) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "in-progress":
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "in-progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getServiceTypeColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-blue-100 text-blue-800";
      case "repair":
        return "bg-red-100 text-red-800";
      case "inspection":
        return "bg-purple-100 text-purple-800";
      case "oil-change":
        return "bg-orange-100 text-orange-800";
      case "tire-service":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = [
    {
      label: "Total Services",
      value: serviceRecords.length,
      icon: Wrench,
    },
    {
      label: "Completed",
      value: serviceRecords.filter((r) => r.status === "completed").length,
      icon: CheckCircle,
    },
    {
      label: "In Progress",
      value: serviceRecords.filter((r) => r.status === "in-progress").length,
      icon: Clock,
    },
    {
      label: "Total Spent",
      value: `$${serviceRecords.reduce((sum, r) => sum + r.cost, 0).toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Service History</h2>
        <p className="text-muted-foreground">
          Track all maintenance and service records for your vehicles
        </p>
      </div>

      {/* Loading/Error States */}
      {loading && <p className="text-muted-foreground">Loading service history...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                {Icon && <Icon className="h-8 w-8 text-slate-300" />}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Vehicle</label>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {uniqueVehicles.map((vehicle) => (
                  <SelectItem key={vehicle} value={vehicle}>
                    {vehicle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Service Records Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No service records found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">
                      {record.id}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.vehicleName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getServiceTypeColor(record.serviceType)}
                      >
                        {record.serviceType.replace("-", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.description}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.serviceDate}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.mileage} mi
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${record.cost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(
                          record.status,
                        )}`}
                      >
                        {getStatusIcon(record.status)}
                        <span className="capitalize">{record.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Service Record Details</DialogTitle>
                            <DialogDescription>
                              Complete information about this service visit
                            </DialogDescription>
                          </DialogHeader>

                          {selectedRecord && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Service ID
                                  </label>
                                  <p className="font-mono text-sm font-semibold">
                                    {selectedRecord.id}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Vehicle
                                  </label>
                                  <p className="font-semibold">
                                    {selectedRecord.vehicleName}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Service Type
                                  </label>
                                  <Badge
                                    className={getServiceTypeColor(
                                      selectedRecord.serviceType,
                                    )}
                                  >
                                    {selectedRecord.serviceType.replace(
                                      "-",
                                      " ",
                                    )}
                                  </Badge>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Status
                                  </label>
                                  <div
                                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${getStatusColor(
                                      selectedRecord.status,
                                    )}`}
                                  >
                                    {getStatusIcon(selectedRecord.status)}
                                    <span className="capitalize">
                                      {selectedRecord.status}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Description
                                </label>
                                <p className="text-sm text-muted-foreground">
                                  {selectedRecord.description}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Service Date
                                  </label>
                                  <p className="font-semibold">
                                    {selectedRecord.serviceDate}
                                  </p>
                                </div>
                                {selectedRecord.completionDate && (
                                  <div>
                                    <label className="text-xs text-muted-foreground">
                                      Completion Date
                                    </label>
                                    <p className="font-semibold">
                                      {selectedRecord.completionDate}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Mileage
                                  </label>
                                  <p className="font-semibold">
                                    {selectedRecord.mileage} miles
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    Cost
                                  </label>
                                  <p className="font-semibold text-lg text-green-600">
                                    ${selectedRecord.cost.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Workshop
                                </label>
                                <p className="font-semibold">
                                  {selectedRecord.workshopName}
                                </p>
                              </div>

                              {selectedRecord.partReplaced &&
                                selectedRecord.partReplaced.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium">
                                      Parts Replaced
                                    </label>
                                    <ul className="mt-2 space-y-1">
                                      {selectedRecord.partReplaced.map(
                                        (part, idx) => (
                                          <li
                                            key={idx}
                                            className="text-sm text-muted-foreground"
                                          >
                                            • {part}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                              {selectedRecord.notes && (
                                <div>
                                  <label className="text-sm font-medium">
                                    Technician Notes
                                  </label>
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {selectedRecord.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
