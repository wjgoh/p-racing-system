import { useState } from "react";
import { WorkshopSidebar } from "./workshop/WorkshopSidebar";
import { WorkshopHeader } from "./workshop/WorkshopHeader";
import { JobAssignment } from "./workshop/JobAssignment";
import { ReservationQueue } from "./workshop/ReservationQueue";
import { InvoiceManagement } from "./workshop/InvoiceManagement";

interface WorkshopDashboardProps {
  onLogout: () => void;
}

type WorkshopView = "assignments" | "queue" | "invoices";

export function WorkshopDashboard({ onLogout }: WorkshopDashboardProps) {
  const [currentView, setCurrentView] = useState<WorkshopView>("assignments");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case "assignments":
        return <JobAssignment />;
      case "queue":
        return <ReservationQueue />;
      case "invoices":
        return <InvoiceManagement />;
      default:
        return <JobAssignment />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <WorkshopSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <WorkshopHeader
          onLogout={onLogout}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
