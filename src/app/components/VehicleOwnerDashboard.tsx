import { useState } from "react";
import { VehicleOwnerSidebar } from "./owner/VehicleOwnerSidebar";
import { VehicleOwnerHeader } from "./owner/VehicleOwnerHeader";
import { ServiceRequest } from "./owner/ServiceRequest";
import { BillingHistory } from "./owner/BillingHistory";
import { ServiceFeedback } from "./owner/ServiceFeedback";
import { MyVehicles } from "./owner/MyVehicles";

interface VehicleOwnerDashboardProps {
  onLogout: () => void;
}

type OwnerView = "vehicles" | "service-request" | "billing" | "feedback";

export function VehicleOwnerDashboard({ onLogout }: VehicleOwnerDashboardProps) {
  const [currentView, setCurrentView] = useState<OwnerView>("vehicles");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case "vehicles":
        return <MyVehicles />;
      case "service-request":
        return <ServiceRequest />;
      case "billing":
        return <BillingHistory />;
      case "feedback":
        return <ServiceFeedback />;
      default:
        return <MyVehicles />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <VehicleOwnerSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <VehicleOwnerHeader
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
