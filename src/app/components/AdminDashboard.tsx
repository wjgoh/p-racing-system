import { useState } from "react";
import { AdminSidebar } from "./admin/AdminSidebar";
import { UserManagement } from "./admin/UserManagement";
import { PerformanceReports } from "./admin/PerformanceReports";
import { CustomerSatisfaction } from "./admin/CustomerSatisfaction";

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<"users" | "performance" | "satisfaction">("users");

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <AdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={onLogout}
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pt-16 lg:pt-6">
        <div className="max-w-7xl mx-auto">
          {currentView === "users" && <UserManagement />}
          {currentView === "performance" && <PerformanceReports />}
          {currentView === "satisfaction" && <CustomerSatisfaction />}
        </div>
      </main>
    </div>
  );
}