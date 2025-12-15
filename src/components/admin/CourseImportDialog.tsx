"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, CheckCircle, BookOpen, Download } from "lucide-react";
import { useCourses } from "@/hooks/use-queries";

interface Organization {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  role: string;
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  thumbnailUrl?: string;
  totalModules?: number;
  totalLessons?: number;
  estimatedDuration?: number;
}

interface CourseImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrgId: string;
  userId: string;
  availableOrgs: Organization[];
  onImportComplete: () => void;
}

export function CourseImportDialog({
  open,
  onOpenChange,
  currentOrgId,
  userId,
  availableOrgs,
  onImportComplete,
}: CourseImportDialogProps) {
  const [step, setStep] = useState<'select-org' | 'select-courses'>('select-org');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Filter out current org and only show orgs where user is admin
  const eligibleOrgs = availableOrgs.filter(
    org => org.id !== currentOrgId && org.role === 'admin'
  );

  // Fetch courses from selected org
  const { data: coursesData, isLoading: loadingCourses } = useCourses(selectedOrgId || null);
  const courses = (coursesData as Course[]) || [];

  const handleOrgSelect = (orgId: string) => {
    setSelectedOrgId(orgId);
  };

  const handleNextStep = () => {
    if (!selectedOrgId) {
      toast.error('Please select an organization');
      return;
    }
    setStep('select-courses');
  };

  const handleCourseToggle = (courseId: string) => {
    const newSet = new Set(selectedCourseIds);
    if (newSet.has(courseId)) {
      newSet.delete(courseId);
    } else {
      newSet.add(courseId);
    }
    setSelectedCourseIds(newSet);
  };

  const handleImport = async () => {
    if (selectedCourseIds.size === 0) {
      toast.error('Please select at least one course');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/courses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceOrgId: selectedOrgId,
          targetOrgId: currentOrgId,
          courseIds: Array.from(selectedCourseIds),
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const { importedCourses } = await response.json();
      toast.success(`Successfully imported ${importedCourses.length} course(s)!`);

      // Reset state
      setSelectedCourseIds(new Set());
      setSelectedOrgId('');
      setStep('select-org');

      onImportComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import courses');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    setStep('select-org');
    setSelectedCourseIds(new Set());
  };

  const handleClose = () => {
    if (!importing) {
      setStep('select-org');
      setSelectedOrgId('');
      setSelectedCourseIds(new Set());
      onOpenChange(false);
    }
  };

  const selectedOrg = eligibleOrgs.find(org => org.id === selectedOrgId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Courses from Another Organization
          </DialogTitle>
          <DialogDescription>
            {step === 'select-org'
              ? 'Choose the organization to import courses from'
              : `Select courses to import from ${selectedOrg?.name || 'organization'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === 'select-org' ? (
            <div className="space-y-4">
              {eligibleOrgs.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    You don't have admin access to other organizations.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {eligibleOrgs.map(org => (
                    <Card
                      key={org.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedOrgId === org.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleOrgSelect(org.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        {org.iconUrl && (
                          <img
                            src={org.iconUrl}
                            alt={org.name}
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{org.name}</h3>
                          <p className="text-sm text-muted-foreground">Admin access</p>
                        </div>
                        {selectedOrgId === org.id && (
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {loadingCourses ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No courses available to import from this organization.
                  </p>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b">
                    <p className="text-sm text-muted-foreground">
                      {courses.length} course(s) available
                    </p>
                    {selectedCourseIds.size > 0 && (
                      <Badge variant="secondary">
                        {selectedCourseIds.size} selected
                      </Badge>
                    )}
                  </div>
                  {courses.map(course => (
                    <Card
                      key={course._id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedCourseIds.has(course._id)
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => handleCourseToggle(course._id)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.has(course._id)}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <h3 className="font-semibold line-clamp-1 flex-1">{course.title}</h3>
                          </div>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 ml-6">
                              {course.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 ml-6 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {course.category}
                            </Badge>
                            {course.status !== 'published' && (
                              <Badge variant="secondary" className="text-xs">
                                {course.status}
                              </Badge>
                            )}
                            {course.totalModules !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {course.totalModules} module{course.totalModules !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            {course.totalLessons !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {course.totalLessons} lesson{course.totalLessons !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'select-courses' && (
            <Button variant="outline" onClick={handleBack} disabled={importing}>
              Back
            </Button>
          )}
          <Button
            onClick={step === 'select-org' ? handleNextStep : handleImport}
            disabled={
              step === 'select-org'
                ? !selectedOrgId
                : selectedCourseIds.size === 0 || importing
            }
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : step === 'select-org' ? (
              'Next'
            ) : (
              `Import ${selectedCourseIds.size} Course${selectedCourseIds.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
