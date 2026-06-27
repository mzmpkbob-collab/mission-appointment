import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { missionService, Mission } from "@/services/mission.service";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  User,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
} from "lucide-react";
import { formatCurrency } from "@/lib/mockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminMissionDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [mission, setMission] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [substitutionComments, setSubstitutionComments] = useState("");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [suggestedEmployees, setSuggestedEmployees] = useState<any[]>([]);
  const [pendingMissionId, setPendingMissionId] = useState<string>('');

  useEffect(() => {
    const loadMission = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await missionService.getMissionById(id);
        setMission(data);
      } catch (error) {
        console.error("Failed to load mission details:", error);
        toast.error("Failed to load mission details");
        navigate("/admin/missions");
      } finally {
        setIsLoading(false);
      }
    };

    loadMission();
  }, [id, navigate]);

  const handleApprove = async () => {
    if (!mission) return;

    try {
      setIsSubmitting(true);
      await missionService.approveMission(mission.id, "Approved by Admin from mission details");
      toast.success("Mission approved");
      const updated = await missionService.getMissionById(mission.id);
      setMission(updated);
    } catch (error) {
      console.error("Failed to approve mission:", error);
      toast.error("Failed to approve mission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!mission) return;

    try {
      setIsSubmitting(true);
      await missionService.rejectMission(
        mission.id,
        "Rejected by Admin from mission details",
        "Admin rejected mission"
      );
      toast.success("Mission rejected");
      const updated = await missionService.getMissionById(mission.id);
      setMission(updated);
    } catch (error) {
      console.error("Failed to reject mission:", error);
      toast.error("Failed to reject mission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBudgetPayment = async () => {
    if(!mission) return;
  }
  const handleApproveSubstitution = async (requestId: string) => {
    try {
      setIsSubmitting(true);
      const response = await missionService.processSubstitutionRequest(requestId, 'APPROVED', substitutionComments);
      const autoAssignResult = response.autoAssignResult;
      
      if (autoAssignResult && autoAssignResult.needsConfirmation) {
          setSuggestedEmployees(autoAssignResult.suggestedEmployees || []);
          setPendingMissionId(mission!.id);
          setIsConfirmationOpen(true);
          return;
      } else if (autoAssignResult && autoAssignResult.assigned && autoAssignResult.assignments.length > 0) {
          const emp = autoAssignResult.assignments[0].employee;
          toast.success(`Substitution approved & auto-assigned to ${emp.firstName} ${emp.lastName}`);
      } else {
          toast.success("Substitution approved successfully");
      }
      
      const updated = await missionService.getMissionById(id!);
      setMission(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve substitution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubstitution = async (requestId: string) => {
    if (!substitutionComments.trim()) {
      toast.error("Please provide comments for rejection");
      return;
    }
    try {
      setIsSubmitting(true);
      await missionService.processSubstitutionRequest(requestId, 'REJECTED', substitutionComments);
      toast.success("Substitution rejected");
      const updated = await missionService.getMissionById(id!);
      setMission(updated);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject substitution");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="admin">
        <div className="text-sm text-muted-foreground">Loading mission details...</div>
      </DashboardLayout>
    );
  }

  if (!mission) {
    return (
      <DashboardLayout userRole="admin">
        <div className="text-sm text-muted-foreground">Mission not found.</div>
      </DashboardLayout>
    );
  }

  const pendingSubstitution = mission.assignments.find(a => a.substitutionRequest?.status === 'PENDING')?.substitutionRequest;

//   const canApprove = !["APPROVED", "REJECTED", "CANCELLED", "COMPLETED"].includes(mission.status);
  const budgetBreakdown = [
    { label: "Transport", amount: Number(mission.estimatedBudget) * 0.35 },
    { label: "Accommodation", amount: Number(mission.estimatedBudget) * 0.3 },
    { label: "Per Diem", amount: Number(mission.estimatedBudget) * 0.25 },
    { label: "Other", amount: Number(mission.estimatedBudget) * 0.1 },
  ];

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/missions")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Mission Details</h1>
              <p className="text-muted-foreground">{mission.missionNumber}</p>
            </div>
          </div>
          <Badge variant="outline">{mission.status}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-gov">
              <CardHeader>
                <CardTitle>{mission.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{mission.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {mission.destination}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {mission.department?.name || "N/A"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(mission.startDate).toLocaleDateString()} - {new Date(mission.endDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {formatCurrency(Number(mission.estimatedBudget))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Required Qualifications</p>
                  <div className="flex flex-wrap gap-2">
                    {mission.requiredQualifications.length > 0 ? (
                      mission.requiredQualifications.map((item, index) => (
                        <Badge key={index} variant="secondary">{item}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No specific qualifications</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gov">
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {budgetBreakdown.map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(Number(mission.estimatedBudget))}
                    </span>
                  </div>
                  {/* <div>
                    <Button className="w-full" onClick={handleBudgetPayment} disabled={isSubmitting}>
                      Create Budget Payment
                    </Button>
                  </div> */}
                </div>
              </CardContent>
            </Card>

            {pendingSubstitution && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Pending Substitution Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reason</p>
                      <p className="font-medium">{pendingSubstitution.reasonCategory}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date Submitted</p>
                      <p className="font-medium">{new Date(pendingSubstitution.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Detailed Reason</p>
                    <p className="text-sm text-muted-foreground bg-white dark:bg-gray-800 p-3 rounded-lg border">
                      {pendingSubstitution.detailedReason}
                    </p>
                  </div>

                  <Separator />
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Review Comments</p>
                    <Textarea 
                      placeholder="Add comments for approval or rejection..."
                      value={substitutionComments}
                      onChange={(e) => setSubstitutionComments(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700" 
                      onClick={() => handleApproveSubstitution(pendingSubstitution.id)}
                      disabled={isSubmitting}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve Substitution
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1" 
                      onClick={() => handleRejectSubstitution(pendingSubstitution.id)}
                      disabled={isSubmitting}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject Substitution
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          <div>
            <Card className="card-gov mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mission.assignments.length > 0 ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {mission.assignments[0].employee.firstName[0]}
                          {mission.assignments[0].employee.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold leading-tight">
                          {mission.assignments[0].employee.firstName} {mission.assignments[0].employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mission.assignments[0].employee.role}
                        </p>
                        <Badge
                          variant={
                            mission.assignments[0].employee.availabilityStatus === "AVAILABLE"
                              ? "default"
                              : "secondary"
                          }
                          className="mt-1"
                        >
                          {mission.assignments[0].employee.availabilityStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department</span>
                        <span>{mission.department?.name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assignment Status</span>
                        <Badge variant="outline">{mission.assignments[0].assignmentStatus}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fairness Score</span>
                        <span className="font-semibold text-primary">
                          {mission.assignments[0].fairnessScoreAtAssignment}%
                        </span>
                      </div>
                    </div>

                    {mission.assignments[0].assignmentReason && (
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-1">Assignment Reason</p>
                        <p className="text-xs text-muted-foreground">
                          {mission.assignments[0].assignmentReason}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No employee assigned yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="card-gov">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!pendingSubstitution ? (
                  <>
                    <Button className="w-full" onClick={handleApprove} disabled={isSubmitting}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve Mission
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleReject} disabled={isSubmitting}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject Mission
                    </Button>
                  </>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-md text-xs text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4 mb-1" />
                    Handle the pending substitution request first.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Cross-Department Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="max-w-xl bg-background border-border text-foreground shadow-2xl rounded-2xl p-6">
          <DialogHeader className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/30">
              <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl font-bold text-center">
              Confirm Cross-Department Assignment
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm leading-relaxed">
              No eligible employees were found in your department. However, we found qualified candidates in other departments who match the required skills.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Suggested Candidates
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {suggestedEmployees.map((candidate, idx) => (
                <div 
                  key={candidate.id} 
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors duration-200 gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span className="text-foreground">{candidate.firstName} {candidate.lastName}</span>
                      {idx === 0 && (
                        <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                          Best Fit
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {candidate.departmentName} &bull; {candidate.email}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {candidate.skills.slice(0, 3).map((skill: string, sIdx: number) => (
                        <Badge key={sIdx} variant="outline" className="text-[10px] py-0 px-1.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Match Score</div>
                    <div className="font-bold text-primary text-sm">
                      {Math.round(candidate.score || 85)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={async () => {
                setIsConfirmationOpen(false);
                toast.info("Substitution approved; mission requires manual assignment");
                const updated = await missionService.getMissionById(id!);
                setMission(updated);
              }}
            >
              Assign Manually
            </Button>
            <Button
              className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md"
              onClick={async () => {
                setIsConfirmationOpen(false);
                setIsSubmitting(true);
                try {
                  const result = await missionService.autoAssignMission(pendingMissionId, 1, true);
                  if (result && result.assigned && result.assignments.length > 0) {
                    const emp = result.assignments[0].employee;
                    toast.success(`Successfully assigned to ${emp.firstName} ${emp.lastName}!`);
                  } else {
                    toast.success("Substitution approved, manual assignment required");
                  }
                } catch (err) {
                  console.error(err);
                  toast.error("Cross-department auto-assignment failed");
                } finally {
                  setIsSubmitting(false);
                  const updated = await missionService.getMissionById(id!);
                  setMission(updated);
                }
              }}
            >
              Auto-Assign Best Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
