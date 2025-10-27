"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOrganization } from "@/lib/OrganizationProvider";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Upload,
  UserPlus,
  MoreVertical,
  Mail,
  Trash2,
  Edit,
  Loader2,
  Download,
  FileText,
  Users,
  BookOpen,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Member {
  _id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  departmentId?: {
    _id: string;
    name: string;
  };
  userId?: {
    _id: string;
    name?: string;
    email: string;
    lyzrId: string;
  };
  coursesEnrolled: number;
  coursesCompleted: number;
  avgProgress: number;
  createdAt: string;
}

interface Department {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  defaultCourseIds: any[];
  autoEnroll: boolean;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  thumbnailUrl?: string;
  status: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  
  const [activeTab, setActiveTab] = useState<'employees' | 'departments'>('employees');
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Add employee dialog
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    name: '',
    departmentId: '',
  });

  // Bulk upload dialog
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [bulkResults, setBulkResults] = useState<any>(null);

  // Edit employee dialog
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Member | null>(null);
  const [updating, setUpdating] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [currentEnrollments, setCurrentEnrollments] = useState<string[]>([]);
  const [originalDepartmentId, setOriginalDepartmentId] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchData();
    }
  }, [currentOrganization, activeTab]);

  const fetchData = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      
      if (activeTab === 'employees') {
        await fetchMembers();
        await fetchDepartments(); // Need for department dropdown
      } else {
        await fetchDepartments();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    if (!currentOrganization) return;
    
    const response = await fetch(`/api/organizations/${currentOrganization.id}/members`);
    if (!response.ok) throw new Error('Failed to fetch members');
    const data = await response.json();
    setMembers(data.members || []);
  };

  const fetchDepartments = async () => {
    if (!currentOrganization) return;

    const response = await fetch(`/api/departments?organizationId=${currentOrganization.id}`);
    if (!response.ok) throw new Error('Failed to fetch departments');
    const data = await response.json();
    setDepartments(data.departments || []);
  };

  const fetchCourses = async () => {
    if (!currentOrganization) return;

    const response = await fetch(`/api/organizations/${currentOrganization.id}/courses`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    const data = await response.json();
    setCourses(data.courses?.filter((c: Course) => c.status === 'published') || []);
  };

  const handleAddEmployee = async () => {
    if (!employeeForm.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!currentOrganization) return;

    try {
      setAddingEmployee(true);
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: employeeForm.email,
          name: employeeForm.name,
          role: 'employee',
          departmentId: employeeForm.departmentId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add employee');
      }

      toast.success('Employee added successfully!');
      setAddEmployeeOpen(false);
      setEmployeeForm({ email: '', name: '', departmentId: '' });
      fetchMembers();
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!csvData.trim()) {
      toast.error('Please paste CSV data');
      return;
    }

    if (!currentOrganization) return;

    try {
      setBulkUploading(true);
      
      // Parse CSV data
      const lines = csvData.trim().split('\n');
      const members = lines.slice(1).map(line => {
        const [email, name, department] = line.split(',').map(s => s.trim());
        return { email, name, department };
      }).filter(m => m.email); // Filter out empty lines

      if (members.length === 0) {
        toast.error('No valid data found in CSV');
        return;
      }

      const response = await fetch(`/api/organizations/${currentOrganization.id}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      });

      const data = await response.json();
      setBulkResults(data);

      if (data.summary.success > 0) {
        toast.success(`Successfully added ${data.summary.success} employee(s)!`);
        fetchMembers();
      }

      if (data.summary.errors > 0 || data.summary.skipped > 0) {
        toast.warning(`${data.summary.errors} errors, ${data.summary.skipped} skipped`);
      }
    } catch (error: any) {
      console.error('Error bulk uploading:', error);
      toast.error('Failed to upload employees');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleEditEmployee = async (member: Member) => {
    setEditingEmployee(member);
    setOriginalDepartmentId(member.departmentId?._id || null);
    setEditEmployeeOpen(true);

    // Fetch courses if not already loaded
    if (courses.length === 0) {
      try {
        await fetchCourses();
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    }

    // Fetch current enrollments for this employee
    if (member.userId?.lyzrId && currentOrganization) {
      try {
        const response = await fetch(
          `/api/enrollments?userId=${member.userId.lyzrId}&organizationId=${currentOrganization.id}`
        );
        if (response.ok) {
          const data = await response.json();
          const enrolledCourseIds = data.enrollments.map((e: any) => e.courseId || e.course?._id);
          setCurrentEnrollments(enrolledCourseIds);
          setSelectedCourseIds(enrolledCourseIds);
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      }
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !currentOrganization) return;

    try {
      setUpdating(true);

      // Update employee basic info
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/members/${editingEmployee._id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editingEmployee.name,
            departmentId: editingEmployee.departmentId?._id || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update employee');
      }

      // Handle auto-enrollment if department changed
      const departmentChanged = originalDepartmentId !== (editingEmployee.departmentId?._id || null);
      let finalSelectedCourses = [...selectedCourseIds];

      if (departmentChanged && editingEmployee.departmentId) {
        const newDepartment = departments.find(d => d._id === editingEmployee.departmentId?._id);
        if (newDepartment && newDepartment.autoEnroll && newDepartment.defaultCourseIds.length > 0) {
          // Add department default courses to selection
          const deptCourseIds = newDepartment.defaultCourseIds.map((c: any) => c._id || c);
          finalSelectedCourses = [...new Set([...finalSelectedCourses, ...deptCourseIds])];
        }
      }

      // Handle enrollment changes if userId exists
      if (editingEmployee.userId?.lyzrId) {
        await handleEnrollmentChanges(editingEmployee.userId.lyzrId, finalSelectedCourses);
      }

      toast.success('Employee updated successfully!');
      setEditEmployeeOpen(false);
      setEditingEmployee(null);
      setSelectedCourseIds([]);
      setCurrentEnrollments([]);
      setOriginalDepartmentId(null);
      fetchMembers();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    } finally {
      setUpdating(false);
    }
  };

  const handleEnrollmentChanges = async (userId: string, newSelectedCourses: string[]) => {
    if (!currentOrganization) return;

    // Find courses to add (in newSelectedCourses but not in currentEnrollments)
    const coursesToAdd = newSelectedCourses.filter(id => !currentEnrollments.includes(id));

    // Find courses to remove (in currentEnrollments but not in newSelectedCourses)
    const coursesToRemove = currentEnrollments.filter(id => !newSelectedCourses.includes(id));

    // Create enrollments for new courses
    for (const courseId of coursesToAdd) {
      try {
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            courseId,
            organizationId: currentOrganization.id,
          }),
        });

        // 409 means already enrolled - that's fine, skip it
        if (!response.ok && response.status !== 409) {
          throw new Error('Failed to create enrollment');
        }
      } catch (error) {
        console.error(`Error enrolling in course ${courseId}:`, error);
      }
    }

    // Remove enrollments for removed courses
    if (coursesToRemove.length > 0) {
      try {
        const response = await fetch(
          `/api/enrollments?userId=${userId}&organizationId=${currentOrganization.id}`
        );
        if (response.ok) {
          const data = await response.json();
          for (const courseId of coursesToRemove) {
            const enrollment = data.enrollments.find(
              (e: any) => (e.courseId || e.course?._id) === courseId
            );
            if (enrollment && enrollment._id) {
              await fetch(`/api/enrollments/${enrollment._id}`, {
                method: 'DELETE',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error removing enrollments:', error);
      }
    }
  };

  const handleDeleteEmployee = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this employee? This will also delete their progress data.')) {
      return;
    }

    if (!currentOrganization) return;

    try {
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/members/${memberId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      toast.success('Employee removed successfully');
      fetchMembers();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to remove employee');
    }
  };

  const downloadTemplate = () => {
    const template = 'email,name,department\njohn@example.com,John Doe,Engineering\njane@example.com,Jane Smith,Sales';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMembers = members.filter(member => 
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">People Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage employees and departments
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList>
            <TabsTrigger value="employees" className="gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <FileText className="h-4 w-4" />
              Departments
            </TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Bulk Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Import Employees</DialogTitle>
                      <DialogDescription>
                        Upload multiple employees at once using CSV format
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>CSV Format: email, name, department</Label>
                          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                            <Download className="h-3 w-3 mr-2" />
                            Download Template
                          </Button>
                        </div>
                        <Textarea
                          placeholder="email,name,department&#10;john@example.com,John Doe,Engineering&#10;jane@example.com,Jane Smith,Sales"
                          rows={10}
                          value={csvData}
                          onChange={(e) => setCsvData(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          First line should be headers. Department names must match existing departments.
                        </p>
                      </div>
                      {bulkResults && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Import Results</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-medium">{bulkResults.summary.total}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                              <span>Success:</span>
                              <span className="font-medium">{bulkResults.summary.success}</span>
                            </div>
                            <div className="flex justify-between text-orange-600">
                              <span>Skipped:</span>
                              <span className="font-medium">{bulkResults.summary.skipped}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Errors:</span>
                              <span className="font-medium">{bulkResults.summary.errors}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setBulkUploadOpen(false);
                        setCsvData('');
                        setBulkResults(null);
                      }}>
                        Close
                      </Button>
                      <Button onClick={handleBulkUpload} disabled={bulkUploading}>
                        {bulkUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Import
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>
                        Invite a new employee to your organization
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={employeeForm.email}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Name (optional)</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={employeeForm.name}
                          onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department (optional)</Label>
                        <Select
                          value={employeeForm.departmentId}
                          onValueChange={(value) => setEmployeeForm({ ...employeeForm, departmentId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">No Department</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept._id} value={dept._id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddEmployeeOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddEmployee} disabled={addingEmployee}>
                        {addingEmployee ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Employee'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Employees Table */}
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : filteredMembers.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No employees yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by adding your first employee
                    </p>
                    <Button onClick={() => setAddEmployeeOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.name || 'Not set'}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.departmentId ? (
                            <Badge variant="outline">{member.departmentId.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No department</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              member.status === 'active' ? 'default' :
                              member.status === 'invited' ? 'secondary' :
                              'outline'
                            }
                          >
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {member.coursesCompleted} / {member.coursesEnrolled}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{member.avgProgress}%</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditEmployee(member)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteEmployee(member._id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => router.push('/admin/departments')}>
                <Plus className="h-4 w-4" />
                Create Department
              </Button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : departments.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create departments to organize your team
                    </p>
                    <Button onClick={() => router.push('/admin/departments')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Department
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                  <Card key={dept._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{dept.name}</CardTitle>
                          {dept.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {dept.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">{dept.memberCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Default Courses</span>
                        <span className="font-medium">{dept.defaultCourseIds.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Auto-enroll</span>
                        <Badge variant={dept.autoEnroll ? 'default' : 'secondary'}>
                          {dept.autoEnroll ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => router.push('/admin/departments')}
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        Manage
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Employee Dialog */}
        {editingEmployee && (
          <Dialog open={editEmployeeOpen} onOpenChange={setEditEmployeeOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Employee</DialogTitle>
                <DialogDescription>
                  Update employee information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editingEmployee.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingEmployee.name || ''}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Department</Label>
                  <Select
                    value={editingEmployee.departmentId?._id || ''}
                    onValueChange={(value) => {
                      const dept = departments.find(d => d._id === value);
                      setEditingEmployee({
                        ...editingEmployee,
                        departmentId: dept ? { _id: dept._id, name: dept.name } : undefined
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingEmployee.departmentId && departments.find(d => d._id === editingEmployee.departmentId?._id)?.autoEnroll && (
                    <p className="text-xs text-muted-foreground">
                      This department has auto-enroll enabled. Department courses will be added automatically.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assigned Courses</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select courses to assign to this employee
                  </p>
                  {courses.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No published courses available
                    </div>
                  ) : (
                    <ScrollArea className="h-64 border rounded-lg p-4">
                      <div className="space-y-3">
                        {courses.map((course) => {
                          const isFromDepartment = editingEmployee.departmentId &&
                            departments
                              .find(d => d._id === editingEmployee.departmentId?._id)
                              ?.defaultCourseIds.some((c: any) => (c._id || c) === course._id);

                          return (
                            <div key={course._id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                              <Checkbox
                                id={`course-${course._id}`}
                                checked={selectedCourseIds.includes(course._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCourseIds([...selectedCourseIds, course._id]);
                                  } else {
                                    setSelectedCourseIds(selectedCourseIds.filter(id => id !== course._id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={`course-${course._id}`}
                                  className="text-sm font-medium cursor-pointer flex items-center gap-2"
                                >
                                  <BookOpen className="h-4 w-4 flex-shrink-0" />
                                  <span className="flex-1">{course.title}</span>
                                  {isFromDepartment && (
                                    <Badge variant="secondary" className="text-xs">
                                      From Dept
                                    </Badge>
                                  )}
                                </label>
                                <p className="text-xs text-muted-foreground capitalize mt-1">
                                  {course.category.replace('-', ' ')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {selectedCourseIds.length} course(s) selected
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditEmployeeOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateEmployee} disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Employee'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </main>
  );
}
