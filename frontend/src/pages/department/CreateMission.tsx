import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  FileText,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/mockData";
import { missionService, CreateMissionDto } from "@/services/mission.service";
import { departmentService, Department } from "@/services/department.service";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Step = 1 | 2 | 3 | 4;

interface MissionForm {
  // Step 1: Details
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  description: string;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  // Step 2: Requirements
  departmentId: string;
  requiredSkills: string[];
  // Step 3: Budget
  estimatedBudget: number;
  budgetCode: string;
  // Additional budget breakdown
  transport?: number;
  accommodation?: number;
  perDiem?: number;
  other?: number;
  // Step 4: Review (uses all above)
}

export default function CreateMission() {
  const navigate = useNavigate();
  const { addAppNotification } = useNotifications();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [suggestedEmployees, setSuggestedEmployees] = useState<any[]>([]);
  const [pendingMissionId, setPendingMissionId] = useState<string>('');
  
  const [form, setForm] = useState<MissionForm>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    urgencyLevel: 'MEDIUM',
    departmentId: '',
    requiredSkills: [],
    estimatedBudget: 0,
    budgetCode: '',
    transport: 0,
    accommodation: 0,
    perDiem: 0,
    other: 0,
  });

  const [newSkill, setNewSkill] = useState('');

  // Calculate total budget from all components
  const totalBudget = (form.transport || 0) + (form.accommodation || 0) + (form.perDiem || 0) + (form.other || 0);
  form.estimatedBudget = totalBudget;
  // Fetch mission types and departments on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [departmentsData] = await Promise.all([
          departmentService.getAllDepartments(),
        ]);
        setDepartments(departmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableSkills = [
    'Audit', 'Training', 'Inspection', 'Logistics', 
    'Communication', 'Accounting', 'Project Management',
    'Leadership', 'Negotiation', 'Analysis', 'Writing',
    'Presentation', 'Organization', 'Planning'
  ];

  const addSkill = (skill: string) => {
    if (!form.requiredSkills.includes(skill)) {
      setForm({ ...form, requiredSkills: [...form.requiredSkills, skill] });
    }
  };

  const removeSkill = (skill: string) => {
    setForm({ ...form, requiredSkills: form.requiredSkills.filter(s => s !== skill) });
  };

  const validateStep = (currentStep: Step): boolean => {
    switch (currentStep) {
      case 1:
        if (!form.title || !form.destination || !form.startDate || !form.endDate) {
          toast.error("Please fill in all required fields");
          return false;
        }
        if (new Date(form.endDate) < new Date(form.startDate)) {
          toast.error("End date must be after start date");
          return false;
        }
        return true;
      case 2:
        if (!form.departmentId) {
          toast.error("Please select a department");
          return false;
        }
        return true;
      case 3:
        if (form.estimatedBudget <= 0) {
          toast.error("Budget must be greater than 0");
          return false;
        }
        // if (!form.budgetCode) {
        //   toast.error("Please enter a budget code");
        //   return false;
        // }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((step + 1) as Step);
    }
  };

  const prevStep = () => {
    setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Use calculated total budget if budget breakdown is provided
      const finalEstimatedBudget = totalBudget > 0 ? totalBudget : form.estimatedBudget;
      
      // Create mission
      const missionData: CreateMissionDto = {
        title: form.title,
        description: form.description,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        departmentId: form.departmentId,
        urgencyLevel: form.urgencyLevel,
        estimatedBudget: finalEstimatedBudget,
        budgetCode: form.budgetCode || undefined,
        requiredQualifications: form.requiredSkills,
      };

      const mission = await missionService.createMission(missionData);
      toast.success("Mission created successfully");
      addAppNotification({
        type: 'mission',
        title: 'New Mission Created',
        message: `Mission "${mission.title}" has been created and is ready for assignment.`,
        actionUrl: `/department/approval/${mission.id}`,
        priority: 'high',
      });

      // Auto-assign mission
      setAutoAssigning(true);
      try {
        const autoAssignResult = await missionService.autoAssignMission(mission.id, 1);
        if (autoAssignResult && autoAssignResult.needsConfirmation) {
          setSuggestedEmployees(autoAssignResult.suggestedEmployees || []);
          setPendingMissionId(mission.id);
          setIsConfirmationOpen(true);
          return; // Modal will handle redirection
        } else if (autoAssignResult && autoAssignResult.assigned && autoAssignResult.assignments.length > 0) {
          const emp = autoAssignResult.assignments[0].employee;
          toast.success(`Mission auto-assigned to ${emp.firstName} ${emp.lastName}`);
        } else {
          toast.info("Mission created but no eligible employees found for auto-assignment");
        }
      } catch (assignError) {
        console.error('Auto-assignment failed:', assignError);
        toast.warning("Mission created but auto-assignment failed. Please assign manually.");
      } finally {
        setAutoAssigning(false);
      }

      navigate('/admin/missions');
    } catch (error: any) {
      console.error('Error creating mission:', error);
      toast.error(error.response?.data?.message || error.message || "Failed to create mission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Details', icon: FileText },
    { number: 2, title: 'Requirements', icon: Users },
    { number: 3, title: 'Budget', icon: DollarSign },
    { number: 4, title: 'Review', icon: Check },
  ];

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Create Mission
            </h1>
            <p className="text-muted-foreground">
              Step {step} of 4
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 
                ${step >= s.number 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-muted-foreground text-muted-foreground'
                }
              `}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${step >= s.number ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.number ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Mission Details</CardTitle>
              <CardDescription>
                General information about the mission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Mission Title *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Post office inspection"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">              
                <div className="space-y-2">
                  <Label>Destination *</Label>
                  <Input
                    placeholder="Enter destination city"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the objectives and activities of the mission..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Mission Requirements</CardTitle>
              <CardDescription>
                Department and required skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select 
                  value={form.departmentId} 
                  onValueChange={(value) => setForm({ ...form, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.requiredSkills.map((skill, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSkills
                    .filter(s => !form.requiredSkills.includes(s))
                    .map((skill, index) => (
                      <Badge 
                        key={index} 
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addSkill(skill)}
                      >
                        + {skill}
                      </Badge>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Budget */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Mission Budget</CardTitle>
              <CardDescription>
                Detailed budget breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Transport (BIF)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.transport || ''}
                    onChange={(e) => setForm({ ...form, transport: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accommodation (BIF)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.accommodation || ''}
                    onChange={(e) => setForm({ ...form, accommodation: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Per Diem (BIF)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.perDiem || ''}
                    onChange={(e) => setForm({ ...form, perDiem: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Expenses (BIF)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.other || ''}
                    onChange={(e) => setForm({ ...form, other: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Budget</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalBudget)}
                  </span>
                </div>
              </div>
{/* 
              <div className="space-y-2">
                <Label>Budget Code *</Label>
                <Input
                  placeholder="Ex: BUD-2026-001"
                  value={form.budgetCode}
                  onChange={(e) => setForm({ ...form, budgetCode: e.target.value })}
                />
              </div> */}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mission Review</CardTitle>
                <CardDescription>
                  Verify information before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Title</span>
                        <span className="font-medium">{form.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destination</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {form.destination}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dates</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {form.startDate} - {form.endDate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Department</span>
                        <span>{departments.find(d => d.id === form.departmentId)?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Budget</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transport</span>
                        <span>{formatCurrency(form.transport)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Accommodation</span>
                        <span>{formatCurrency(form.accommodation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per Diem</span>
                        <span>{formatCurrency(form.perDiem)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other</span>
                        <span>{formatCurrency(form.other)}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(totalBudget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Code</span>
                        <span>{form.budgetCode}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {form.requiredSkills.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {form.requiredSkills.map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {form.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground">{form.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-assignment will show suggested employees after mission creation */}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
              onClick={step === 1 ? () => navigate('/admin/missions') : prevStep}
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </Button>
          {step < 4 ? (
            <Button onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Mission'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
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
                No eligible employees were found in the selected department. However, we found qualified candidates in other departments who match the required skills.
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
                onClick={() => {
                  setIsConfirmationOpen(false);
                  toast.info("Mission created with manual assignment status");
                  navigate('/admin/missions');
                }}
              >
                Assign Manually
              </Button>
              <Button
                className="w-full sm:w-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md"
                onClick={async () => {
                  setIsConfirmationOpen(false);
                  setAutoAssigning(true);
                  try {
                    const result = await missionService.autoAssignMission(pendingMissionId, 1, true);
                    if (result && result.assigned && result.assignments.length > 0) {
                      const emp = result.assignments[0].employee;
                      toast.success(`Successfully assigned to ${emp.firstName} ${emp.lastName}!`);
                    } else {
                      toast.success("Mission created, manual assignment required");
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error("Cross-department auto-assignment failed");
                  } finally {
                    setAutoAssigning(false);
                    navigate('/admin/missions');
                  }
                }}
              >
                Auto-Assign Best Match
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
