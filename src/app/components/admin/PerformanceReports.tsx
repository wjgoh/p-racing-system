import { useState } from "react";
import { Card } from "../ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Wrench, Clock, DollarSign } from "lucide-react";

export function PerformanceReports() {
  const [timeRange, setTimeRange] = useState("month");

  // Mock data for charts
  const serviceData = [
    { month: "Jan", services: 45, revenue: 12500 },
    { month: "Feb", services: 52, revenue: 14800 },
    { month: "Mar", services: 48, revenue: 13200 },
    { month: "Apr", services: 61, revenue: 16500 },
    { month: "May", services: 58, revenue: 15800 },
    { month: "Jun", services: 65, revenue: 18200 },
  ];

  const mechanicPerformance = [
    { name: "Mike Smith", completed: 85, rating: 4.8 },
    { name: "John Doe", completed: 72, rating: 4.6 },
    { name: "Sarah Wilson", completed: 68, rating: 4.9 },
    { name: "Tom Brown", completed: 55, rating: 4.5 },
    { name: "Lisa Johnson", completed: 48, rating: 4.7 },
  ];

  const serviceTypes = [
    { name: "Oil Change", value: 30, color: "#3b82f6" },
    { name: "Brake Service", value: 25, color: "#8b5cf6" },
    { name: "Tire Rotation", value: 20, color: "#ec4899" },
    { name: "Engine Repair", value: 15, color: "#f59e0b" },
    { name: "Other", value: 10, color: "#10b981" },
  ];

  const weeklyActivity = [
    { day: "Mon", appointments: 12, completed: 10 },
    { day: "Tue", appointments: 15, completed: 14 },
    { day: "Wed", appointments: 18, completed: 16 },
    { day: "Thu", appointments: 14, completed: 13 },
    { day: "Fri", appointments: 20, completed: 18 },
    { day: "Sat", appointments: 16, completed: 15 },
    { day: "Sun", appointments: 8, completed: 7 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Performance Reports</h1>
          <p className="text-muted-foreground">
            Monitor business performance and analytics
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Label htmlFor="time-range">Time Range</Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger id="time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl md:text-3xl font-bold">$91,000</p>
              <p className="text-xs md:text-sm text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                +12.5% from last period
              </p>
            </div>
            <DollarSign className="h-10 w-10 md:h-12 md:w-12 text-green-600" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Services Completed</p>
              <p className="text-2xl md:text-3xl font-bold">329</p>
              <p className="text-xs md:text-sm text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                +8.3% from last period
              </p>
            </div>
            <Wrench className="h-10 w-10 md:h-12 md:w-12 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl md:text-3xl font-bold">1,243</p>
              <p className="text-xs md:text-sm text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                +15.2% from last period
              </p>
            </div>
            <Users className="h-10 w-10 md:h-12 md:w-12 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Service Time</p>
              <p className="text-2xl md:text-3xl font-bold">2.4h</p>
              <p className="text-xs md:text-sm text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-4 w-4" />
                -5.1% from last period
              </p>
            </div>
            <Clock className="h-10 w-10 md:h-12 md:w-12 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">
            Services & Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={serviceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="services"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Services"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                name="Revenue ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">
            Service Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={serviceTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">
            Top Mechanic Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mechanicPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="completed" fill="#3b82f6" name="Completed Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold mb-4">Weekly Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="appointments" fill="#8b5cf6" name="Appointments" />
              <Bar dataKey="completed" fill="#10b981" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card className="p-4 md:p-6 overflow-hidden">
        <h3 className="text-base md:text-lg font-semibold mb-4">Mechanic Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 md:px-4 text-sm">Mechanic</th>
                <th className="text-center py-3 px-2 md:px-4 text-sm">Completed</th>
                <th className="text-center py-3 px-2 md:px-4 text-sm hidden sm:table-cell">Avg Rating</th>
                <th className="text-center py-3 px-2 md:px-4 text-sm hidden md:table-cell">Rate</th>
                <th className="text-center py-3 px-2 md:px-4 text-sm">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {mechanicPerformance.map((mechanic, index) => (
                <tr key={index} className="border-b hover:bg-accent">
                  <td className="py-3 px-2 md:px-4 font-medium text-sm">{mechanic.name}</td>
                  <td className="text-center py-3 px-2 md:px-4 text-sm">{mechanic.completed}</td>
                  <td className="text-center py-3 px-2 md:px-4 text-sm hidden sm:table-cell">
                    ⭐ {mechanic.rating}
                  </td>
                  <td className="text-center py-3 px-2 md:px-4 text-sm hidden md:table-cell">
                    {Math.floor(Math.random() * 10 + 90)}%
                  </td>
                  <td className="text-center py-3 px-2 md:px-4 text-sm">
                    ${(mechanic.completed * 250).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}