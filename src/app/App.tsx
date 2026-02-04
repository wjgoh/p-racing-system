import { useState } from "react";
import { Toaster } from "sonner";
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

  let content: JSX.Element;

  if (currentView === "admin") {
    content = <AdminDashboard onLogout={handleLogout} />;
  } else if (currentView === "mechanic") {
    content = <MechanicDashboard onLogout={handleLogout} />;
  } else if (currentView === "workshop") {
    content = <WorkshopDashboard onLogout={handleLogout} />;
  } else if (currentView === "owner") {
    content = <VehicleOwnerDashboard onLogout={handleLogout} />;
  } else {
    content = (
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

  return (
    <>
      <Toaster position="top-right" richColors />
      {content}
    </>
  );
}
