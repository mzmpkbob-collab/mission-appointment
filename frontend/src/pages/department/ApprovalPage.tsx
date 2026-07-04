import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Building,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/mockData";
import { toast } from "sonner";
import { missionService, Mission } from "@/services/mission.service";

export default function ApprovalPage() {
  const navigate = useNavigate();
  const { id: missionId } = useParams(); // Fix: route param is 'id', not 'missionId'
  const [comments, setComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [missionDetails, setMissionDetails] = useState<Mission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const budgetBreakdown = missionDetails ? [
    { label: 'Transport', amount: Number(missionDetails.estimatedBudget) * 0.35 },
    { label: 'Accommodation', amount: Number(missionDetails.estimatedBudget) * 0.30 },
    { label: 'Per Diem', amount: Number(missionDetails.estimatedBudget) * 0.25 },
    { label: 'Other', amount: Number(missionDetails.estimatedBudget) * 0.10 },
  ] : [];

  useEffect(() => {
    const fetchMissionDetails = async () => {
      if (!missionId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await missionService.getMissionById(missionId);
        setMissionDetails(response);
      } catch (error) {
        console.error("Error fetching mission details:", error);
        
        // Enhanced error handling
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            toast.error("Request timed out. Please check your connection and try again.");
          } else if (error.message.includes('401')) {
            toast.error("Authentication failed. Please log in again.");
          } else if (error.message.includes('404')) {
            toast.error("Mission not found.");
          } else {
            toast.error(`Failed to fetch mission details: ${error.message}`);
          }
        } else {
          toast.error("Failed to fetch mission details");
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchMissionDetails();
  }, [missionId]);

  const handleApprove = async () => {
    if (!missionId) {
      toast.error("Mission ID not found");
      return;
    }
    
    setIsProcessing(true);
    try {
      await missionService.approveMission(missionId, comments);
      toast.success("Mission approved successfully");
      navigate('/department');
    } catch (error: any) {
      console.error("Error approving mission:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to approve mission");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!missionId) {
      toast.error("Mission ID not found");
      return;
    }
    
    setIsProcessing(true);
    try {
      await missionService.rejectMission(missionId, comments, "Rejected by Department Head");
      toast.success("Mission rejected");
      navigate('/department');
    } catch (error: any) {
      console.error("Error rejecting mission:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to reject mission");
    } finally {
      setIsProcessing(false);
    }
  };

  // Budget impact analysis
  const departmentBudget = missionDetails ? Number(missionDetails.department.budgetAllocation) : 0;
  const usedBudget = departmentBudget * 0.6; // Mock - would be calculated from other missions
  const remainingBudget = departmentBudget - usedBudget;
  const missionBudget = missionDetails ? Number(missionDetails.estimatedBudget) : 0;
  const afterApproval = remainingBudget - missionBudget;
  const budgetImpactPercent = departmentBudget > 0 ? ((missionBudget / departmentBudget) * 100).toFixed(1) : '0';
  const isBudgetWarning = afterApproval < departmentBudget * 0.2;

  return (
    <DashboardLayout userRole="department_head">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading mission details...</p>
          </div>
        </div>
      ) : !missionDetails ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <p className="text-muted-foreground">Mission not found</p>
            <Button onClick={() => navigate('/department')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      ) : (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/department')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              Mission Approval
            </h1>
            <p className="text-muted-foreground">
              Review and approve the mission request
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {missionDetails?.missionNumber || 'Loading...'}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mission Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Mission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {missionDetails ? (
                  <>
                    <h3 className="text-xl font-semibold">{missionDetails.title}</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{missionDetails.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(missionDetails.startDate)} - {formatDate(missionDetails.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building className="h-4 w-4" />
                        <span>{missionDetails.department.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(missionDetails.estimatedBudget))}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {missionDetails && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-muted-foreground">
                        {missionDetails.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Mission Number</h4>
                      <Badge>{missionDetails.missionNumber}</Badge>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Required Qualifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {missionDetails.requiredQualifications.map((qualification, index) => (
                          <Badge key={index} variant="outline">{qualification}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Urgency Level</h4>
                      <Badge variant={missionDetails.urgencyLevel === 'HIGH' ? 'destructive' : missionDetails.urgencyLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                        {missionDetails.urgencyLevel}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Budget Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missionDetails && budgetBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {budgetBreakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(Number(missionDetails.estimatedBudget))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Impact */}
            <Card className={isBudgetWarning ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isBudgetWarning && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                  Budget Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Department Budget</p>
                      <p className="text-lg font-semibold">{formatCurrency(departmentBudget)}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Already Used</p>
                      <p className="text-lg font-semibold">{formatCurrency(usedBudget)}</p>
                    </div>
                    <div className={`text-center p-3 rounded-lg ${afterApproval < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      <p className="text-sm text-muted-foreground">After Approval</p>
                      <p className={`text-lg font-semibold ${afterApproval < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(afterApproval)}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    This mission represents <span className="font-semibold">{budgetImpactPercent}%</span> of the total department budget.
                  </p>
                  
                  {isBudgetWarning && (
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warning: Remaining budget will be less than 20% after this approval.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>
                  Add your observations or justifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your comments regarding this mission request..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card> */}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Employee Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Assigned Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {missionDetails && missionDetails.assignments.length > 0 ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-semibold text-primary">
                          {missionDetails.assignments[0].employee.firstName[0]}{missionDetails.assignments[0].employee.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold">
                          {missionDetails.assignments[0].employee.firstName} {missionDetails.assignments[0].employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {missionDetails.assignments[0].employee.role}
                        </p>
                        <Badge variant={missionDetails.assignments[0].employee.availabilityStatus === 'AVAILABLE' ? "default" : "secondary"}>
                          {missionDetails.assignments[0].employee.availabilityStatus}
                        </Badge>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department</span>
                        <span>{missionDetails.department.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assignment Status</span>
                        <Badge variant="outline">{missionDetails.assignments[0].assignmentStatus}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fairness Score</span>
                        <span className="font-semibold text-primary">
                          {missionDetails.assignments[0].fairnessScoreAtAssignment}%
                        </span>
                      </div>
                    </div>
                    
                    {missionDetails.assignments[0].assignmentReason && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-1">Assignment Reason</p>
                          <p className="text-xs text-muted-foreground">
                            {missionDetails.assignments[0].assignmentReason}
                          </p>
                        </div>
                      </>
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

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Status</span>
                    <Badge variant="outline">{missionDetails?.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Urgency</span>
                    <Badge variant={missionDetails?.urgencyLevel === 'HIGH' ? 'destructive' : missionDetails?.urgencyLevel === 'MEDIUM' ? 'default' : 'secondary'}>
                      {missionDetails?.urgencyLevel}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Approve'}
                </Button>
                
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      )}
    </DashboardLayout>
  );
}
