import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatsCard } from "@/components/stats-card";
import { MissionCard } from "@/components/mission-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Target,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  currentUser,
  formatCurrency,
  formatDate,
  missionTypes,
} from "@/lib/mockData";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { missionService, MissionAssignment } from "@/services/mission.service";
import { useNotifications } from "@/hooks/use-notifications";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { addAppNotification } = useNotifications();
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user assignments on component mount
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const data = await missionService.getUserAssignments();
        setAssignments(data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        toast.error('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Filter assignments by status
  const pendingAssignments = assignments.filter(
    a => a.assignmentStatus === 'PENDING'
  );
  const activeAssignments = assignments.filter(
    a => a.assignmentStatus === 'ACCEPTED'
  );
  const completedAssignments = assignments.filter(
    a => a.assignmentStatus === 'ACCEPTED' && a.mission?.status === 'COMPLETED'
  );

  const handleAccept = async (assignment: MissionAssignment) => {
    try {
      await missionService.respondToAssignment(assignment.id, 'ACCEPTED');
      addAppNotification({
        type: 'approval',
        title: 'Mission Accepted',
        message: `An employee accepted mission "${assignment.mission?.title || 'N/A'}".`,
        actionUrl: assignment.mission?.id ? `/employee/mission/${assignment.mission.id}` : undefined,
        priority: 'medium',
      });
      // Refresh assignments
      const data = await missionService.getUserAssignments();
      setAssignments(data);
      toast.success("Assignment accepted successfully");
    } catch (error) {
      console.error('Error accepting assignment:', error);
      toast.error("Failed to accept assignment");
    }
  };

  // const handleDecline = async (assignmentId: string) => {
  //   try {
  //     await missionService.respondToAssignment(assignmentId, 'DECLINED');
  //     // Refresh assignments
  //     const data = await missionService.getUserAssignments();
  //     setAssignments(data);
  //     toast.success("Assignment declined successfully");
  //   } catch (error) {
  //     console.error('Error declining assignment:', error);
  //     toast.error("Failed to decline assignment");
  //   }
  // };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome"
      userRole="employee"
      userName={`${currentUser.firstName} ${currentUser.lastName}`}
      userEmail={currentUser.email}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Missions"
          value={currentUser.totalMissions}
          subtitle="This year"
          icon={Briefcase}
          trend={{ value: 15, isPositive: true }}
        />
        <StatsCard
          title="Fairness Score"
          value={`${currentUser.fairnessScore}%`}
          subtitle="Fair distribution"
          icon={Target}
          variant="primary"
        />
        <StatsCard
          title="Pending"
          value={pendingAssignments.length}
          subtitle="Response required"
          icon={Clock}
        />
        <StatsCard
          title="Completed"
          value={completedAssignments.length}
          subtitle="Reports submitted"
          icon={CheckCircle2}
          variant="secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* New Assignments */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Assignments</h2>
            <StatusBadge
              status="pending"
              label={`${pendingAssignments.length} pending`}
            />
          </div>

          {loading ? (
            <Card className="card-gov">
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : pendingAssignments.length > 0 ? (
            <div className="grid gap-4">
              {pendingAssignments.map((assignment) => (
                <Card key={assignment.id} className="card-gov hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{assignment.mission?.title || 'N/A'}</h3>
                      <span className="text-sm text-muted-foreground">
                        {assignment.mission?.startDate ? formatDate(assignment.mission.startDate) : 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.mission?.destination || 'N/A'}
                    </p>
                    {assignment.assignmentReason && (
                      <p className="text-sm">
                        <strong>Reason:</strong> {assignment.assignmentReason}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(assignment)}
                        className="flex-1"
                      >
                        Accept
                      </Button>
                      {/* <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDecline(assignment.id)}
                        className="flex-1"
                      >
                        Decline
                      </Button> */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-gov">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  No new missions
                </h3>
                <p className="text-sm text-muted-foreground">
                  You have no missions awaiting response.
                </p>
              </CardContent>
            </Card>
          )}
          {/* Recent History */}
          <Card className="card-gov mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  Mission History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/employee/missions')}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mission</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Assignment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.slice(0, 5).map((assignment) => (
                    <TableRow
                      key={assignment.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => assignment.mission?.id && navigate(`/employee/mission/${assignment.mission.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium">{assignment.mission?.title || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{assignment.id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.mission?.status || 'N/A'}</TableCell>
                      <TableCell>{assignment.mission?.destination || 'N/A'}</TableCell>
                      <TableCell>{assignment.mission?.startDate ? formatDate(assignment.mission.startDate) : 'N/A'}</TableCell>
                      <TableCell>{assignment.mission?.estimatedBudget ? formatCurrency(Number(assignment.mission.estimatedBudget)) : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.assignmentStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Active Missions & Quick Stats */}
        <div className="space-y-6">
          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <Card className="card-gov">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>Active Assignment</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {activeAssignments.length} active
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeAssignments.slice(0, 2).map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">{assignment.mission?.title || 'N/A'}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {assignment.mission?.destination || 'N/A'}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-7"
                      onClick={() => assignment.mission?.id && navigate(`/employee/mission/${assignment.mission.id}`)}
                    >
                      View Details <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Assignments */}
          {activeAssignments.length > 0 && (
            <Card className="card-gov">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
                  Active Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeAssignments[0] && (
                  <div className="space-y-3">
                    <p className="font-medium">{activeAssignments[0].mission?.title || 'N/A'}</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📍 {activeAssignments[0].mission?.destination || 'N/A'}</p>
                      <p>📅 {activeAssignments[0].mission?.startDate && activeAssignments[0].mission?.endDate ?
                        `${formatDate(activeAssignments[0].mission.startDate)} - ${formatDate(activeAssignments[0].mission.endDate)}` : 'N/A'
                      }</p>
                      <p>💰 {activeAssignments[0].mission?.estimatedBudget ? formatCurrency(Number(activeAssignments[0].mission.estimatedBudget)) : 'N/A'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => activeAssignments[0].mission?.id && navigate(`/employee/mission/${activeAssignments[0].mission.id}`)}
                    >
                      View Details
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fairness Score */}
          <Card className="card-gov">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Fairness Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${currentUser.fairnessScore * 2.26} 226`}
                      className="text-secondary"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                    {currentUser.fairnessScore}%
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Your score indicates fair distribution of missions.
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-secondary text-sm font-medium">
                    <TrendingUp className="h-4 w-4" />
                    <span>+5% this month</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {/* <Card className="card-gov">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/employee/reports')}
              >
                📝 Submit a report
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/employee/profile')}
              >
                👤 Update my profile
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/employee/missions')}
              >
                📋 View history
              </Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </DashboardLayout>
  );
}
