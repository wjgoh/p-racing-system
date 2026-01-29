import { Menu, LogOut, Bell } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

interface WorkshopHeaderProps {
  onLogout: () => void;
  onMenuToggle: () => void;
}

export function WorkshopHeader({ onLogout, onMenuToggle }: WorkshopHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-semibold text-slate-900">
              Workshop Manager
            </h1>
            <p className="text-sm text-slate-500 hidden md:block">
              Manage jobs, mechanics, and invoices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
              3
            </Badge>
          </Button>
          <Button variant="ghost" onClick={onLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
