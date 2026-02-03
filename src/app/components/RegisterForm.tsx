import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Eye, EyeOff, Lock, Mail, User, Car, Trash2, Plus } from "lucide-react";
import { apiRegister } from "./api/auth"; // <-- adjust path if needed

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  color: string;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [role, setRole] = useState<"" | "OWNER" | "MECHANIC" | "WORKSHOP">("");
  
  // Car details - now an array
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: "1", plateNumber: "", make: "", model: "", year: "", color: "" }
  ]);

  const addVehicle = () => {
    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      plateNumber: "",
      make: "",
      model: "",
      year: "",
      color: ""
    };
    setVehicles([...vehicles, newVehicle]);
  };

  const removeVehicle = (id: string) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const updateVehicle = (id: string, field: keyof Vehicle, value: string) => {
    setVehicles(vehicles.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!role) {
    console.error("Role is required");
    return;
  }

  if (password !== confirmPassword) {
    console.error("Passwords don't match");
    return;
  }

  if (!agreeToTerms) {
    console.error("Must agree to terms");
    return;
  }

  try {
    await apiRegister({
      name,
      email,
      password,
      role,
      vehicles: role === "OWNER" ? vehicles : [],
    });

    // After successful register, go to login page
    onSwitchToLogin();
  } catch (err: any) {
    console.error(err?.message ?? "Register failed");
  }
};

  return (
    <Card className="w-full max-w-5xl p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Personal Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Personal Information</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Vehicle Owner</SelectItem>
                  <SelectItem value="MECHANIC">Mechanic</SelectItem>
                  <SelectItem value="WORKSHOP">Workshop</SelectItem>
                </SelectContent>
              </Select>
              {!role && (
                <p className="text-xs text-red-500">Please choose a role.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Vehicle Information (Owners only) */}
          {role === "OWNER" && (
            <div className="space-y-4 lg:border-l lg:pl-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">Vehicle Information</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVehicle}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </Button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {vehicles.map((vehicle, index) => (
                  <div key={vehicle.id} className="p-4 border rounded-lg space-y-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">Vehicle {index + 1}</h3>
                      {vehicles.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVehicle(vehicle.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`plate-number-${vehicle.id}`}>License Plate Number</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id={`plate-number-${vehicle.id}`}
                          type="text"
                          placeholder="ABC-1234"
                          value={vehicle.plateNumber}
                          onChange={(e) => updateVehicle(vehicle.id, "plateNumber", e.target.value.toUpperCase())}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`car-make-${vehicle.id}`}>Make</Label>
                        <Input
                          id={`car-make-${vehicle.id}`}
                          type="text"
                          placeholder="Toyota"
                          value={vehicle.make}
                          onChange={(e) => updateVehicle(vehicle.id, "make", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`car-model-${vehicle.id}`}>Model</Label>
                        <Input
                          id={`car-model-${vehicle.id}`}
                          type="text"
                          placeholder="Camry"
                          value={vehicle.model}
                          onChange={(e) => updateVehicle(vehicle.id, "model", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`car-year-${vehicle.id}`}>Year</Label>
                        <Input
                          id={`car-year-${vehicle.id}`}
                          type="number"
                          placeholder="2024"
                          value={vehicle.year}
                          onChange={(e) => updateVehicle(vehicle.id, "year", e.target.value)}
                          min="1900"
                          max="2026"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`car-color-${vehicle.id}`}>Color</Label>
                        <Input
                          id={`car-color-${vehicle.id}`}
                          type="text"
                          placeholder="Silver"
                          value={vehicle.color}
                          onChange={(e) => updateVehicle(vehicle.id, "color", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start space-x-2 pt-4 border-t">
          <Checkbox
            id="terms"
            checked={agreeToTerms}
            onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
            className="mt-1"
          />
          <Label
            htmlFor="terms"
            className="text-sm font-normal cursor-pointer leading-normal"
          >
            I agree to the{" "}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log("Terms clicked");
              }}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.preventDefault();
                console.log("Privacy Policy clicked");
              }}
            >
              Privacy Policy
            </a>
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={!role}>
          Create account
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <button
          onClick={onSwitchToLogin}
          className="text-primary hover:underline font-medium"
        >
          Sign in
        </button>
      </div>
    </Card>
  );
}
