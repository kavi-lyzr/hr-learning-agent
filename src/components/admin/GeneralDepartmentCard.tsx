"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Settings, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";

interface Course {
  _id: string;
  title: string;
  category: string;
}

interface GeneralDepartmentCardProps {
  organizationId: string;
  courseIds: string[];
  autoEnroll: boolean;
  allCourses: Course[];
  onUpdate: () => void;
}

export function GeneralDepartmentCard({
  organizationId,
  courseIds,
  autoEnroll,
  allCourses,
  onUpdate,
}: GeneralDepartmentCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(courseIds);
  const [autoEnrollEnabled, setAutoEnrollEnabled] = useState(autoEnroll);
  const [updating, setUpdating] = useState(false);

  const handleOpenDialog = () => {
    setSelectedCourses(courseIds);
    setAutoEnrollEnabled(autoEnroll);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);

      const payload = {
        'generalDepartment.courseIds': selectedCourses,
        'generalDepartment.autoEnroll': autoEnrollEnabled,
      };

      console.log('Updating general department:', payload);

      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update general department');
      }

      const data = await response.json();
      console.log('Update response:', data);

      toast.success('General department updated successfully');
      setEditDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating general department:', error);
      toast.error(error.message || 'Failed to update general department');
    } finally {
      setUpdating(false);
    }
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <>
      <Card className="border-2 border-primary/20 bg-primary/5 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  General Department
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Default courses for all employees
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Default Courses</span>
            <span className="font-medium">{courseIds.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Auto-enroll</span>
            <Badge variant={autoEnroll ? 'default' : 'secondary'}>
              {autoEnroll ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleOpenDialog}
          >
            <Settings className="h-3 w-3 mr-2" />
            Configure
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure General Department</DialogTitle>
            <DialogDescription>
              Set default courses that all new employees will receive
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Default Courses</Label>
              <p className="text-xs text-muted-foreground mb-3">
                These courses will be assigned to all new employees by default
              </p>
              {allCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                  No published courses available
                </p>
              ) : (
                <ScrollArea className="h-64 border rounded-lg p-4">
                  <div className="space-y-2">
                    {allCourses.map((course) => (
                      <div
                        key={course._id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-muted"
                        onClick={() => handleCourseToggle(course._id)}
                      >
                        <Checkbox
                          id={`general-course-${course._id}`}
                          checked={selectedCourses.includes(course._id)}
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
                {selectedCourses.length} course(s) selected
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Auto-Enroll New Employees</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically enroll all new employees in these courses
                </p>
              </div>
              <Switch
                checked={autoEnrollEnabled}
                onCheckedChange={setAutoEnrollEnabled}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
