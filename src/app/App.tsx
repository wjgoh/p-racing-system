import { useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { AdminDashboard } from "./components/AdminDashboard";
import { MechanicDashboard } from "./components/MechanicDashboard";
import { WorkshopDashboard } from "./components/WorkshopDashboard";
import { VehicleOwnerDashboard } from "./components/VehicleOwnerDashboard";

type View = "login" | "register" | "admin" | "mechanic" | "workshop" | "owner";

export default function App() {
  const [currentView, setCurrentView] = useState<View>("login");

  const handleLogout = () => {
    setCurrentView("login");
  };

  if (currentView === "admin") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (currentView === "mechanic") {
    return <MechanicDashboard onLogout={handleLogout} />;
  }

  if (currentView === "workshop") {
    return <WorkshopDashboard onLogout={handleLogout} />;
  }

  if (currentView === "owner") {
    return <VehicleOwnerDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {currentView === "login" ? (
        <LoginForm 
          onSwitchToRegister={() => setCurrentView("register")} 
          onAdminLogin={() => setCurrentView("admin")}
          onMechanicLogin={() => setCurrentView("mechanic")}
          onWorkshopLogin={() => setCurrentView("workshop")}
          onOwnerLogin={() => setCurrentView("owner")}
        />
      ) : (
        <RegisterForm onSwitchToLogin={() => setCurrentView("login")} />
      )}
    </div>
  );
}