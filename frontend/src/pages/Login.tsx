import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Lock, Globe, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.isFirstLogin) {
        navigate('/first-login', { replace: true });
        return;
      }
      
      const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        DIRECTOR: '/admin',
      };
      const route = roleRoutes[user.role] || '/employee';
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login({ email, password });
      // Navigation is handled by the auth context
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-gov relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1 shadow-md">
                <img src="/Logo_RNP_Burundi.png" alt="RNP Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Régie Nationale des Postes</h2>
                <p className="text-sm text-white/70">Republic of Burundi</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Mission Appointment<br />System
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Digital platform for automated appointment of missions, 
              approvals and reports for RNP.
            </p>
            
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div>
                <p className="text-3xl font-bold">250+</p>
                <p className="text-sm text-white/70">Active Employees</p>
              </div>
              <div>
                <p className="text-3xl font-bold">48</p>
                <p className="text-sm text-white/70">Post Offices</p>
              </div>
              <div>
                <p className="text-3xl font-bold">1,200+</p>
                <p className="text-sm text-white/70">Missions/Year</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/50">
            © 2025 Régie Nationale des Postes - All rights reserved
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 bg-background">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white border flex items-center justify-center overflow-hidden p-1 shadow-sm">
              <img src="/Logo_RNP_Burundi.png" alt="RNP Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">RNP</h2>
              <p className="text-xs text-muted-foreground">Mission System</p>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex justify-end mb-8">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-32">
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="rn">Kirundi</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Login
            </h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@rnp.bi"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 input-gov"
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 input-gov"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
              <div className="flex items-center gap-2">
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
              <Link 
                to="/forgot-password" 
                className="text-sm text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-gov-primary h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Demo Credentials Info */}
          {import.meta.env.VITE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                DEMO: Test Credentials
              </p>
              <p className="text-xs text-muted-foreground">
                Use the backend seeded users to test different roles
              </p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            By logging in, you agree to the{" "}
            <a href="#" className="text-primary hover:underline">terms of service</a>
            {" "}and{" "}
            <a href="#" className="text-primary hover:underline">privacy policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
