import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UserRole, roleLabels } from "@/lib/mockData";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  Users,
  DollarSign,
  CheckSquare,
  Settings,
  HelpCircle,
  Bell,
  BarChart3,
  Building2,
  Shield,
  ClipboardList,
  Calendar,
  UserCog,
  Wrench,
  FileBarChart,
  Map,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: Record<UserRole, NavItem[]> = {
  employee: [
    { label: "Dashboard", href: "/employee", icon: LayoutDashboard },
    { label: "My Missions", href: "/employee/missions", icon: Briefcase },
    // { label: "Reports", href: "/employee/reports", icon: FileText },
    { label: "My Profile", href: "/employee/profile", icon: User },
  ],
  department_head: [
    { label: "Dashboard", href: "/department", icon: LayoutDashboard },
    { label: "Create Mission", href: "/department/create-mission", icon: ClipboardList },
    { label: "Missions", href: "/department/missions", icon: CheckSquare },
    { label: "Team", href: "/department/team", icon: Users },
    { label: "Reports", href: "/department/reports", icon: BarChart3 },
  ],
  finance: [
    { label: "Dashboard", href: "/finance", icon: LayoutDashboard },
    { label: "Pending Approvals", href: "/finance/pending", icon: DollarSign },
    { label: "Reimbursements", href: "/finance/expenses", icon: FileText },
    { label: "Reports", href: "/finance/reports", icon: BarChart3 },
  ],
  hr: [
    { label: "Dashboard", href: "/hr", icon: LayoutDashboard },
    { label: "Pending Confirmations", href: "/hr/pending", icon: CheckSquare },
    { label: "Employees", href: "/hr/employees", icon: Users },
    { label: "Fairness Analytics", href: "/hr/analytics", icon: BarChart3 },
  ],
  director: [
    { label: "Dashboard", href: "/director", icon: LayoutDashboard },
    { label: "Final Approvals", href: "/director/approvals", icon: CheckSquare },
    { label: "Mission Map", href: "/director/map", icon: Map },
    { label: "Analytics", href: "/director/analytics", icon: Activity },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Create Mission", href: "/admin/create-mission", icon: ClipboardList },
    { label: "Missions", href: "/admin/missions", icon: Briefcase },
    { label: "Users", href: "/admin/users", icon: UserCog },
    // { label: "Roles", href: "/admin/roles", icon: Shield },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    // { label: "Configuration", href: "/admin/config", icon: Settings },
    // { label: "Audit", href: "/admin/audit", icon: FileBarChart },
    { label: "Maintenance", href: "/admin/maintenance", icon: Wrench },
  ],
};

const sharedItems: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Help", href: "/help", icon: HelpCircle },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  userEmail: string;
}

export function AppSidebar({ userRole, userName, userEmail }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const {user, logout } = useAuth();
  const roleNav = navItems[userRole] || [];

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (href: string) => {
    if (href === `/${userRole.replace('_', '-')}` || href === '/employee' || href === '/department' || href === '/finance' || href === '/hr' || href === '/director' || href === '/admin') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className={cn(
      "h-screen bg-sidebar flex flex-col transition-all duration-300 sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white overflow-hidden p-0.5 shadow-sm border border-sidebar-border">
              <img src="/Logo_RNP_Burundi.png" alt="RNP Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-sidebar-foreground text-sm">MAS</span>
              <p className="text-[10px] text-sidebar-muted leading-none">Mission System</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto bg-white overflow-hidden p-0.5 shadow-sm border border-sidebar-border">
            <img src="/Logo_RNP_Burundi.png" alt="RNP Logo" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <span className="text-xs font-medium text-sidebar-primary bg-sidebar-primary/10 px-2 py-1 rounded-full">
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {roleNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "nav-link-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", active && "text-sidebar-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-sidebar-border px-3 space-y-1">
          {sharedItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "nav-link-active"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.firstName + user.lastName}
              </p>
              <p className="text-xs text-sidebar-muted truncate">
                {user.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="shrink-0 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-card border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
