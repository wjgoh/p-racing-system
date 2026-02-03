import { Button } from "../ui/button";
import { LogOut, Wrench } from "lucide-react";

interface MechanicHeaderProps {
  onLogout: () => void;
  mechanicName?: string;
}

export function MechanicHeader({ onLogout, mechanicName }: MechanicHeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Mechanic Portal</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {mechanicName ?? "Mechanic"}
              </p>
            </div>
          </div>
          
          <Button onClick={onLogout} variant="outline" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
