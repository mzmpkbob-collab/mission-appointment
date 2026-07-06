import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus,
  Pencil,
  Trash2,
  Users,
  Building,
  Search,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { departmentService } from "@/services/department.service";
import { userService } from "@/services/user.service";
import { toast } from "sonner";

interface Department {
  id: string;
  name: string;
  code: string;
  headId: string;
  headName: string;
  employeeCount: number;
  budget: number;
  description: string;
  location: string;
  status: 'active' | 'inactive';
}

interface UserType {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId?: string;
}

export default function AdminDepartments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false);
  const [isEditingDepartment, setIsEditingDepartment] = useState(false);
  const [isDeletingDepartment, setIsDeletingDepartment] = useState<string | null>(null);
  const [availableDepartmentHeads, setAvailableDepartmentHeads] = useState<UserType[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [isLoadingHeads, setIsLoadingHeads] = useState(false);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    code: '',
    headId: '',
    budgetAllocation: '',
    description: '',
  });

  const [departmentList, setDepartmentList] = useState<Department[]>([]);

  // Fetch available department heads on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingHeads(true);
        const allUsersList = await userService.getAllUsers();
        
        // Store all users for head name resolution
        setAllUsers(allUsersList);
        
        // Filter users with HEAD_OF_DEPARTMENT role
        const availableHeads = allUsersList.filter(
          (user) => user.role === 'HEAD_OF_DEPARTMENT'
        );
        
        setAvailableDepartmentHeads(availableHeads);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast.error('Failed to load users');
      } finally {
        setIsLoadingHeads(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch all departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        const fetchedDepartments = await departmentService.getAllDepartments();
        
        // Map API response to Department interface
        const mappedDepartments: Department[] = fetchedDepartments.map((dept: Record<string, any>) => {
          let headUser = dept.headId ? allUsers.find(u => u.id === dept.headId) : null;
          
          // Fallback: If no headId on department, check if any HEAD_OF_DEPARTMENT user is in this department
          if (!headUser) {
            headUser = allUsers.find(u => u.departmentId === dept.id && u.role === 'HEAD_OF_DEPARTMENT') || null;
          }

          return {
            id: dept.id,
            name: dept.name,
            code: dept.code,
            headId: headUser?.id || dept.headId || '',
            headName: headUser ? `${headUser.firstName} ${headUser.lastName}` : 'Unassigned',
            employeeCount: dept.users?.length || 0,
            budget: 0,
            description: dept.description || '',
            location: '—',
            status: 'active' as const,
          };
        });
        
        setDepartmentList(mappedDepartments);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Failed to load departments');
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    // Only fetch departments if we have users loaded
    if (allUsers.length > 0) {
      fetchDepartments();
    }
  }, [allUsers]);

  const filteredDepartments = departmentList.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddDepartment = async () => {
    if (!newDepartment.name) {
      toast.error("Please fill in required fields");
      return;
    }
    try {
      setIsCreatingDepartment(true);

      const budgetAllocation = newDepartment.budgetAllocation
        ? Number(newDepartment.budgetAllocation)
        : undefined;

      const created = await departmentService.createDepartment({
        name: newDepartment.name.trim(),
        description: newDepartment.description?.trim() || undefined,
        headId: newDepartment.headId && newDepartment.headId !== 'none' ? newDepartment.headId : undefined,
        budgetAllocation,
      });

      const headUser = newDepartment.headId
        ? availableDepartmentHeads.find(user => user.id === newDepartment.headId)
        : undefined;

      const createdDepartment: Department = {
        id: created.id,
        name: created.name,
        code: created.code,
        headId: created.headId || newDepartment.headId || '',
        headName: headUser ? `${headUser.firstName} ${headUser.lastName}` : 'Unassigned',
        employeeCount: 0,
        budget: budgetAllocation ?? 0,
        description: created.description || newDepartment.description,
        location: '—',
        status: 'active',
      };

      setDepartmentList((prev) => [createdDepartment, ...prev]);
      toast.success("Department created successfully");
      setIsAddDialogOpen(false);
      setNewDepartment({ name: '', code: '', headId: '', budgetAllocation: '', description: '' });
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || "Failed to create department");
    } finally {
      setIsCreatingDepartment(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!editingDepartment || !editingDepartment.name) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setIsEditingDepartment(true);

      const updatedData = await departmentService.updateDepartment(
        editingDepartment.id,
        {
          name: editingDepartment.name.trim(),
          description: editingDepartment.description?.trim() || undefined,
          headId: editingDepartment.headId && editingDepartment.headId !== 'none' ? editingDepartment.headId : undefined,
          budgetAllocation: editingDepartment.budget > 0 ? editingDepartment.budget : undefined,
        }
      );

      const headUser = editingDepartment.headId
        ? allUsers.find(u => u.id === editingDepartment.headId)
        : null;

      const updatedDepartment: Department = {
        id: updatedData.id,
        name: updatedData.name,
        code: updatedData.code,
        headId: updatedData.headId || editingDepartment.headId || '',
        headName: headUser ? `${headUser.firstName} ${headUser.lastName}` : editingDepartment.headName,
        employeeCount: editingDepartment.employeeCount,
        budget: editingDepartment.budget,
        description: updatedData.description || editingDepartment.description,
        location: editingDepartment.location,
        status: editingDepartment.status,
      };

      setDepartmentList(prev =>
        prev.map(dept => (dept.id === updatedDepartment.id ? updatedDepartment : dept))
      );
      toast.success("Department updated successfully");
      setEditingDepartment(null);
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || "Failed to update department");
    } finally {
      setIsEditingDepartment(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) {
      return;
    }

    try {
      setIsDeletingDepartment(id);
      await departmentService.deleteDepartment(id);
      
      setDepartmentList(prev => prev.filter(dept => dept.id !== id));
      toast.success("Department deleted successfully");
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast.error(message || "Failed to delete department");
    } finally {
      setIsDeletingDepartment(null);
    }
  };

  interface OrgNodeType {
    name: string;
    children?: OrgNodeType[];
  }

  const orgChartData: OrgNodeType[] = [
    {
      name: 'General Management',
      children: [
        { name: 'Finance', children: [{ name: 'Accounting' }, { name: 'Treasury' }] },
        { name: 'Operations', children: [{ name: 'Logistics' }, { name: 'Distribution' }] },
        { name: 'HR', children: [{ name: 'Recruitment' }, { name: 'Training' }] },
      ],
    },
  ];

  const OrgNode = ({ node, level = 0 }: { node: OrgNodeType; level?: number }) => (
    <div className="flex flex-col items-center">
      <div className={`
        px-4 py-2 rounded-lg border-2 
        ${level === 0 ? 'bg-primary text-primary-foreground border-primary' : 
          level === 1 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}
      `}>
        <span className="font-medium text-sm">{node.name}</span>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex gap-4 mt-4 relative">
          <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-300 -translate-x-1/2 -translate-y-full" />
          {node.children.map((child, index) => (
            <div key={index} className="relative">
              <div className="absolute top-0 left-1/2 w-px h-4 bg-gray-300 -translate-x-1/2 -translate-y-full" />
              <OrgNode node={child} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout userRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Department Management
            </h1>
            <p className="text-muted-foreground">
              Manage RNP organizational structure
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Department
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
                <DialogDescription>
                  Fill in the information for the new department
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Department Name *</Label>
                    <Input
                      placeholder="Ex: Marketing"
                      value={newDepartment.name}
                      onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department Head</Label>
                  <Select 
                    value={newDepartment.headId}
                    onValueChange={(value) => setNewDepartment({ ...newDepartment, headId: value })}
                    disabled={isLoadingHeads}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingHeads ? "Loading..." : "Select a head"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartmentHeads.filter(h => !h.departmentId).length > 0 ? (
                        availableDepartmentHeads.filter(h => !h.departmentId).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No available heads
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* <div className="space-y-2">
                  <Label>Location</Label>
                  <Select 
                    value={newDepartment.location}
                    onValueChange={(value) => setNewDepartment({ ...newDepartment, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bujumbura">Bujumbura</SelectItem>
                      <SelectItem value="Gitega">Gitega</SelectItem>
                      <SelectItem value="Ngozi">Ngozi</SelectItem>
                      <SelectItem value="Kayanza">Kayanza</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}
                <div className="space-y-2">
                  <Label>Budget Allocation/Month</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 20000000"
                    value={newDepartment.budgetAllocation}
                    onChange={(e) => setNewDepartment({ ...newDepartment, budgetAllocation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description of department responsibilities..."
                    value={newDepartment.description}
                    onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddDepartment} disabled={isCreatingDepartment}>
                  Create Department
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Departments</p>
                  <p className="text-2xl font-bold">{departmentList.length}</p>
                </div>
                <Building className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Departments</p>
                  <p className="text-2xl font-bold">
                    {departmentList.filter(d => d.status === 'active').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold">
                    {departmentList.reduce((sum, d) => sum + d.employeeCount, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. per Department</p>
                  <p className="text-2xl font-bold">
                    {Math.round(departmentList.reduce((sum, d) => sum + d.employeeCount, 0) / departmentList.length)}
                  </p>
                </div>
                <ChevronRight className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Departments List</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono text-sm">{dept.code}</TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.headName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{dept.employeeCount}</Badge>
                    </TableCell>
                    <TableCell>{dept.location}</TableCell>
                    <TableCell>
                      <Badge variant={dept.status === 'active' ? 'default' : 'secondary'}>
                        {dept.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setEditingDepartment(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDepartment(dept.id)}
                          disabled={isDeletingDepartment === dept.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Org Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Chart</CardTitle>
            <CardDescription>Organizational hierarchy structure</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="flex justify-center py-8 min-w-[600px]">
              <OrgNode node={orgChartData[0]} />
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                Modify department information
              </DialogDescription>
            </DialogHeader>
            {editingDepartment && (
              <div className="space-y-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Department Name *</Label>
                    <Input
                      value={editingDepartment.name}
                      onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department Head</Label>
                  <Select
                    value={editingDepartment.headId || 'none'}
                    onValueChange={(value) => {
                      const headUser = value !== 'none' ? availableDepartmentHeads.find(u => u.id === value) : null;
                      setEditingDepartment({
                        ...editingDepartment,
                        headId: value === 'none' ? '' : value,
                        headName: headUser ? `${headUser.firstName} ${headUser.lastName}` : 'Unassigned',
                      });
                    }}
                    disabled={isLoadingHeads}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a head" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableDepartmentHeads.filter(h => !h.departmentId || h.id === editingDepartment.headId).length > 0 ? (
                        availableDepartmentHeads.filter(h => !h.departmentId || h.id === editingDepartment.headId).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No available heads
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget Allocation/Month</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 20000000"
                    value={editingDepartment.budget || ''}
                    onChange={(e) => setEditingDepartment({ ...editingDepartment, budget: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingDepartment.status}
                    onValueChange={(value) => setEditingDepartment({ ...editingDepartment, status: value as 'active' | 'inactive' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description of department responsibilities..."
                    value={editingDepartment.description}
                    onChange={(e) => setEditingDepartment({ ...editingDepartment, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDepartment(null)} disabled={isEditingDepartment}>
                Cancel
              </Button>
              <Button onClick={handleEditDepartment} disabled={isEditingDepartment}>
                {isEditingDepartment ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
