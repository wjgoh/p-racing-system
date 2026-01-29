import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onAdminLogin: () => void;
  onMechanicLogin: () => void;
  onWorkshopLogin: () => void;
  onOwnerLogin: () => void;
}

export function LoginForm({ onSwitchToRegister, onAdminLogin, onMechanicLogin, onWorkshopLogin, onOwnerLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for admin credentials (allow "admin" without @ or "admin@admin.com")
    if ((email === "admin" || email === "admin@admin.com") && password === "admin") {
      onAdminLogin();
      return;
    }
    
    // Check for mechanic credentials
    if (email === "mechanics@mechanics.com" && password === "mechanic") {
      onMechanicLogin();
      return;
    }
    
    // Check for workshop credentials
    if (email === "workshop@workshop.com" && password === "workshop") {
      onWorkshopLogin();
      return;
    }
    
    // Check for vehicle owner credentials
    if (email === "owner@owner.com" && password === "owner") {
      onOwnerLogin();
      return;
    }
    
    // For any other credentials, log in as vehicle owner
    if (email && password) {
      onOwnerLogin();
      return;
    }
    
    // Handle regular login logic here
    console.log("Login submitted:", { email, password, rememberMe });
  };

  return (
    <Card className="w-full max-w-md p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
              required
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <a
            href="#"
            className="text-sm text-primary hover:underline"
            onClick={(e) => {
              e.preventDefault();
              console.log("Forgot password clicked");
            }}
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      {/* Demo credentials removed from UI */}

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <button
          onClick={onSwitchToRegister}
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </button>
      </div>
    </Card>
  );
}