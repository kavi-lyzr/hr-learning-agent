"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  category: string;
}

interface Department {
  _id: string;
  name: string;
  description?: string;
  defaultCourseIds: (string | { _id: string; title?: string })[];
  autoEnroll: boolean;
  memberCount: number;
}

interface DepartmentFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  department?: Department | null;
  organizationId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DepartmentFormDialog({
  open,
  mode,
  department,
  organizationId,
  onOpenChange,
  onSuccess,
}: DepartmentFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    autoEnroll: false,
    selectedCourses: [] as string[],
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirmation dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [affectedEmployees, setAffectedEmployees] = useState<{ name: string; email: string }[]>([]);
  const [newCoursesToEnroll, setNewCoursesToEnroll] = useState<string[]>([]);

  // Load form data when dialog opens or department changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && department) {
        const courseIds = (department.defaultCourseIds || []).map((course: any) =>
          typeof course === 'string' ? course : course._id
        );
        setFormData({
          name: department.name,
          description: department.description || '',
          autoEnroll: department.autoEnroll,
          selectedCourses: courseIds,
        });
      } else {
        setFormData({
          name: '',
          description: '',
          autoEnroll: false,
          selectedCourses: [],
        });
      }
      fetchCourses();
    }
  }, [open, mode, department]);

  const fetchCourses = async () => {
    try {
      setCoursesLoading(true);
      const response = await fetch(`/api/courses?organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses((data.courses || []).filter((c: Course) => c.status === 'published'));
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    } finally {
      setCoursesLoading(false);
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

  const handleSubmit = async (skipConfirmation = false) => {
    if (!formData.name.trim()) {
      toast.error('Please enter a department name');
      return;
    }

    // Check for auto-enrollment confirmation in edit mode
    if (mode === 'edit' && department && !skipConfirmation && formData.autoEnroll) {
      const originalCourseIds = (department.defaultCourseIds || []).map((course: any) =>
        typeof course === 'string' ? course : course._id
      );
      const newCourses = formData.selectedCourses.filter(id => !originalCourseIds.includes(id));

      if (newCourses.length > 0) {
        // Fetch affected employees
        try {
          const response = await fetch(`/api/departments/${department._id}/members`);
          if (response.ok) {
            const data = await response.json();
            const activeEmployees = data.members?.filter((m: any) => m.status === 'active') || [];

            if (activeEmployees.length > 0) {
              setAffectedEmployees(activeEmployees.map((m: any) => ({
                name: m.userId?.name || m.name || m.email,
                email: m.email,
              })));
              setNewCoursesToEnroll(newCourses);
              setConfirmDialogOpen(true);
              return; // Don't proceed with update yet
            }
          }
        } catch (error) {
          console.error('Error fetching department members:', error);
          // Continue with update if we can't fetch members
        }
      }
    }

    try {
      setSubmitting(true);

      const url = mode === 'create'
        ? '/api/departments'
        : `/api/departments/${department?._id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const body = mode === 'create'
        ? {
            organizationId,
            name: formData.name,
            description: formData.description,
            defaultCourseIds: formData.selectedCourses,
            autoEnroll: formData.autoEnroll,
          }
        : {
            name: formData.name,
            description: formData.description,
            defaultCourseIds: formData.selectedCourses,
            autoEnroll: formData.autoEnroll,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} department`);
      }

      toast.success(`Department ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      setConfirmDialogOpen(false);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error(`Error ${mode}ing department:`, error);
      toast.error(error.message || `Failed to ${mode} department`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Create New Department' : 'Edit Department'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Create a department and set default course assignments'
                : 'Update department information and course assignments'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Department Name *</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Sales, Engineering, HR"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-description">Description (optional)</Label>
              <Textarea
                id="dept-description"
                placeholder="Brief description of this department"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Courses (optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">
                New employees in this department will be auto-enrolled in these courses
              </p>
              {coursesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : courses.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                  No published courses available. Create and publish courses first.
                </p>
              ) : (
                <ScrollArea className="h-64 border rounded-lg p-4">
                  <div className="space-y-2">
                    {courses.map((course) => (
                      <div
                        key={course._id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-muted"
                        onClick={() => handleCourseToggle(course._id)}
                      >
                        <Checkbox
                          id={`course-${course._id}`}
                          checked={formData.selectedCourses.includes(course._id)}
                          onCheckedChange={() => handleCourseToggle(course._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="flex-1">{course.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize mt-1 ml-6">
                            {course.category.replace('-', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.selectedCourses.length} course(s) selected
              </p>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Saving...'}
                </>
              ) : (
                mode === 'create' ? 'Create Department' : 'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Enrollment Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirm Auto-Enrollment</DialogTitle>
            <DialogDescription>
              The following employees will be automatically enrolled in the new courses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">
                {newCoursesToEnroll.length} new course(s) will be added
              </p>
              <p className="text-sm text-muted-foreground">
                {affectedEmployees.length} active employee(s) will be enrolled
              </p>
            </div>
            <div className="space-y-2">
              <Label>Affected Employees:</Label>
              <ScrollArea className="h-48 border rounded-lg p-3">
                {affectedEmployees.map((emp, idx) => (
                  <div key={idx} className="text-sm py-2 border-b last:border-0">
                    <div className="font-medium">{emp.name}</div>
                    <div className="text-muted-foreground">{emp.email}</div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Confirm & Enroll'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
