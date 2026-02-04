import {
  Users,
  BarChart3,
  MessageSquareHeart,
  FileCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";

interface AdminSidebarProps {
  currentView: "users" | "performance" | "satisfaction" | "reports";
  onViewChange: (
    view: "users" | "performance" | "satisfaction" | "reports",
  ) => void;
  onLogout: () => void;
}

export function AdminSidebar({
  currentView,
  onViewChange,
  onLogout,
}: AdminSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      id: "users" as const,
      label: "User Management",
      icon: Users,
    },
    {
      id: "performance" as const,
      label: "Performance Reports",
      icon: BarChart3,
    },
    {
      id: "satisfaction" as const,
      label: "Customer Reviews",
      icon: MessageSquareHeart,
    },
    {
      id: "reports" as const,
      label: "Workshop Approvals",
      icon: FileCheck,
    },
  ];

  const handleViewChange = (
    view: "users" | "performance" | "satisfaction" | "reports",
  ) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-card border-r border-border h-screen flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Admin Portal</h2>
          <p className="text-sm text-muted-foreground">
            Governance & Monitoring
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start gap-3"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}
