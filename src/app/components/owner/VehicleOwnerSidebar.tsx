import { Car, Plus, Receipt, Star, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface VehicleOwnerSidebarProps {
  currentView: string;
  onViewChange: (view: "vehicles" | "service-request" | "billing" | "feedback") => void;
  isOpen: boolean;
  onClose: () => void;
}

export function VehicleOwnerSidebar({
  currentView,
  onViewChange,
  isOpen,
  onClose,
}: VehicleOwnerSidebarProps) {
  const menuItems = [
    { id: "vehicles", label: "My Vehicles", icon: Car },
    { id: "service-request", label: "Request Service", icon: Plus },
    { id: "billing", label: "Billing History", icon: Receipt },
    { id: "feedback", label: "Service Feedback", icon: Star },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">My Portal</h2>
              <p className="text-sm text-slate-500">Vehicle Owner</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id as "vehicles" | "service-request" | "billing" | "feedback");
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  currentView === item.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
