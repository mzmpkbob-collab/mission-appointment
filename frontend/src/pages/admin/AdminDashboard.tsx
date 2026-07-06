import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Building2,
  Briefcase,
  FileText, 
  Activity,
  UserCog,
  Wrench,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { userService, User } from "@/services/user.service";
import { missionService, Mission } from "@/services/mission.service";
import { departmentService, Department } from "@/services/department.service";
import { useNotifications } from "@/hooks/use-notifications";
import { formatNotificationTime } from "@/lib/notifications";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { notifications } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const [usersData, missionsData, departmentsData] = await Promise.all([
          userService.getAllUsers(),
          missionService.getAllMissions(),
          departmentService.getAllDepartments(),
        ]);

        setUsers(usersData);
        setMissions(missionsData);
        setDepartments(departmentsData);
      } catch (error) {
        console.error('Failed to load admin dashboard data:', error);
        toast.error('Unable to load dashboard metrics.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const activeUsers = users.filter((u) => u.accountStatus === 'ACTIVE').length;
  const inactiveUsers = users.length - activeUsers;
  const todayMissionCount = useMemo(
    () => missions.filter((m) => new Date(m.createdAt).toDateString() === new Date().toDateString()).length,
    [missions]
  );
  const recentNotifications = notifications.slice(0, 5);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mission':
        return <Briefcase className="h-4 w-4 text-primary" />;
      case 'approval':
        return <Users className="h-4 w-4 text-secondary" />;
      case 'system':
        return <Activity className="h-4 w-4 text-accent" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            System Administration
          </h1>
          <p className="text-muted-foreground">
            User, role, and configuration management
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            <>
              <StatsCard
                title="Number of Users"
                value={users.length}
                icon={Users}
                subtitle={`${activeUsers} active, ${inactiveUsers} inactive`}
              />
              <StatsCard
                title="Number of Missions"
                value={missions.length}
                icon={Briefcase}
                subtitle={`${todayMissionCount} created today`}
              />
              <StatsCard
                title="Number of Departments"
                value={departments.length}
                icon={Building2}
              />
              <StatsCard
                title="Unread Notifications"
                value={notifications.filter((n) => !n.isRead).length}
                icon={FileText}
              />
            </>
          )}
        </div>

        {/* Quick Action Buttons */}
        <Card className="card-gov">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button asChild className="justify-start gap-2">
                <Link to="/admin/users">
                  <UserCog className="h-4 w-4" />
                  Manage Users
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-start gap-2">
                <Link to="/admin/departments">
                  <Building2 className="h-4 w-4" />
                  Manage Departments
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/admin/missions">
                  <Plus className="h-4 w-4" />
                  View Missions
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link to="/admin/maintenance">
                  <Wrench className="h-4 w-4" />
                  Maintenance
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="card-gov">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link to="/notifications">
              <Button variant="outline" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNotifications.length === 0 && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  No activity yet.
                </div>
              )}

              {recentNotifications.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatNotificationTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-gov">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Users Active Rate</p>
              <p className="text-2xl font-bold text-primary">
                {users.length ? `${Math.round((activeUsers / users.length) * 100)}%` : '0%'}
              </p>
            </CardContent>
          </Card>
          <Card className="card-gov">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Missions In Progress</p>
              <p className="text-2xl font-bold text-primary">
                {missions.filter((m) => m.status === 'IN_PROGRESS').length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-gov">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Departments Without Head</p>
              <p className="text-2xl font-bold text-primary">
                {departments.filter((d) => !d.headId).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
