import {
  ClipboardList,
  Calendar,
  FileText,
  BarChart3,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface WorkshopSidebarProps {
  currentView: string;
  onViewChange: (
    view: "assignments" | "queue" | "invoices" | "reports" | "reviews"
  ) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkshopSidebar({
  currentView,
  onViewChange,
  isOpen,
  onClose,
}: WorkshopSidebarProps) {
  const menuItems = [
    { id: "assignments", label: "Job Assignment", icon: ClipboardList },
    { id: "queue", label: "Reservation Queue", icon: Calendar },
    { id: "invoices", label: "Invoice Management", icon: FileText },
    { id: "reports", label: "Sales Reports", icon: BarChart3 },
    { id: "reviews", label: "Customer Reviews", icon: MessageSquare },
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
              <h2 className="text-xl font-semibold text-slate-900">Workshop</h2>
              <p className="text-sm text-slate-500">Manager Portal</p>
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
                  onViewChange(
                    item.id as
                      | "assignments"
                      | "queue"
                      | "invoices"
                      | "reports"
                      | "reviews"
                  );
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
