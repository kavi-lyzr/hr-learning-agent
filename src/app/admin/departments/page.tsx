"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useOrganization } from "@/lib/OrganizationProvider";
import { toast } from "sonner";
import { Plus, Users, BookOpen, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Department {
  _id: string;
  name: string;
  organizationId: string;
  defaultCourseIds: string[];
  autoEnroll: boolean;
  memberCount: number;
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  status: string;
}

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    autoEnroll: false,
    selectedCourses: [] as string[],
  });

  // Fetch departments
  useEffect(() => {
    if (currentOrganization) {
      fetchDepartments();
      fetchCourses();
    }
  }, [currentOrganization]);

  const fetchDepartments = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/departments?organizationId=${currentOrganization.id}`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!currentOrganization) return;

    try {
      setCoursesLoading(true);
      const response = await fetch(`/api/courses?organizationId=${currentOrganization.id}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      // Only show published courses for assignment
      setCourses((data.courses || []).filter((c: Course) => c.status === 'published'));
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a department name');
      return;
    }

    if (!currentOrganization) return;

    try {
      setCreating(true);
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          name: formData.name,
          defaultCourseIds: formData.selectedCourses,
          autoEnroll: formData.autoEnroll,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create department');
      }

      toast.success('Department created successfully!');
      setCreateDialogOpen(false);
      setFormData({ name: '', autoEnroll: false, selectedCourses: [] });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error creating department:', error);
      toast.error(error.message || 'Failed to create department');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (dept: Department) => {
    setEditingDepartment(dept);
    setFormData({
      name: dept.name,
      autoEnroll: dept.autoEnroll,
      selectedCourses: dept.defaultCourseIds || [],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateDepartment = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a department name');
      return;
    }

    if (!editingDepartment) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/departments/${editingDepartment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          defaultCourseIds: formData.selectedCourses,
          autoEnroll: formData.autoEnroll,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update department');
      }

      toast.success('Department updated successfully!');
      setEditDialogOpen(false);
      setEditingDepartment(null);
      setFormData({ name: '', autoEnroll: false, selectedCourses: [] });
      fetchDepartments();
    } catch (error: any) {
      console.error('Error updating department:', error);
      toast.error(error.message || 'Failed to update department');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDepartment = async (dept: Department) => {
    if (dept.memberCount > 0) {
      toast.error(`Cannot delete department with ${dept.memberCount} active members. Reassign them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete "${dept.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/departments/${dept._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete department');
      }

      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Failed to delete department');
    }
  };

  const handleCourseToggle = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCourses: prev.selectedCourses.includes(courseId)
        ? prev.selectedCourses.filter(id => id !== courseId)
        : [...prev.selectedCourses, courseId]
    }));
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Departments</h1>
            <p className="text-muted-foreground mt-2">
              Organize employees and assign default courses
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Department</DialogTitle>
                <DialogDescription>
                  Create a department and set default course assignments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="dept-name">Department Name</Label>
                  <Input
                    id="dept-name"
                    placeholder="e.g., Sales"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Default Courses (Optional)</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    New employees in this department will be auto-enrolled in these courses
                  </p>
                  {coursesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No published courses available. Create and publish courses first.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                      {courses.map((course) => (
                        <div key={course._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`course-${course._id}`}
                            checked={formData.selectedCourses.includes(course._id)}
                            onCheckedChange={() => handleCourseToggle(course._id)}
                          />
                          <label
                            htmlFor={`course-${course._id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {course.title}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Auto-Enroll New Employees</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically enroll new employees in default courses
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoEnroll}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoEnroll: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setFormData({ name: '', autoEnroll: false, selectedCourses: [] });
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateDepartment} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Department'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                Update department settings and course assignments
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dept-name">Department Name</Label>
                <Input
                  id="edit-dept-name"
                  placeholder="e.g., Sales"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Courses (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  New employees in this department will be auto-enrolled in these courses
                </p>
                {coursesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published courses available. Create and publish courses first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {courses.map((course) => (
                      <div key={course._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-course-${course._id}`}
                          checked={formData.selectedCourses.includes(course._id)}
                          onCheckedChange={() => handleCourseToggle(course._id)}
                        />
                        <label
                          htmlFor={`edit-course-${course._id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {course.title}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Auto-Enroll New Employees</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically enroll new employees in default courses
                  </p>
                </div>
                <Switch
                  checked={formData.autoEnroll}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoEnroll: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingDepartment(null);
                  setFormData({ name: '', autoEnroll: false, selectedCourses: [] });
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateDepartment} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Departments Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : departments.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first department
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
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
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(dept)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Department
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteDepartment(dept)}
                          className="text-destructive"
                          disabled={dept.memberCount > 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardTitle className="text-xl">{dept.name}</CardTitle>
                  <CardDescription>
                    {dept.memberCount} employee{dept.memberCount !== 1 ? 's' : ''} • {dept.defaultCourseIds?.length || 0} default course{dept.defaultCourseIds?.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Employees</span>
                      <span className="font-medium">{dept.memberCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Default Courses</span>
                      <span className="font-medium">{dept.defaultCourseIds?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Auto-Enroll</span>
                      <Badge variant={dept.autoEnroll ? 'default' : 'secondary'}>
                        {dept.autoEnroll ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(dept)}
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit Department
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
