"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { GeneralDepartmentCard } from "./GeneralDepartmentCard";
import { DepartmentCard } from "./DepartmentCard";
import { DepartmentFormDialog } from "./DepartmentFormDialog";

interface Department {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
  defaultCourseIds: (string | { _id: string; title?: string })[];
  autoEnroll: boolean;
  memberCount: number;
  createdAt: string;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  status: string;
}

interface Organization {
  id: string;
  generalDepartment?: {
    courseIds: string[];
    autoEnroll: boolean;
  };
}

interface DepartmentsTabProps {
  organizationId: string;
}

export function DepartmentsTab({ organizationId }: DepartmentsTabProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDepartments(),
      fetchOrganization(),
      fetchCourses(),
    ]);
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`/api/departments?organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to load departments');
    }
  };

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch organization');
      const data = await response.json();
      setOrganization(data.organization);
    } catch (error: any) {
      console.error('Error fetching organization:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`/api/courses?organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses((data.courses || []).filter((c: Course) => c.status === 'published'));
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleEditClick = (dept: Department) => {
    setEditingDepartment(dept);
    setEditDialogOpen(true);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Departments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize employees and manage course assignments
          </p>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Department
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* General Department Card (Always visible) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <GeneralDepartmentCard
              organizationId={organizationId}
              courseIds={organization?.generalDepartment?.courseIds || []}
              autoEnroll={organization?.generalDepartment?.autoEnroll || true}
              allCourses={courses}
              onUpdate={fetchOrganization}
            />

            {/* Regular Departments */}
            {departments.map((dept) => (
              <DepartmentCard
                key={dept._id}
                department={dept}
                onEdit={handleEditClick}
                onDelete={handleDeleteDepartment}
              />
            ))}
          </div>

          {/* Empty State (only if no regular departments) */}
          {departments.length === 0 && (
            <Card className="p-12 text-center mt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No departments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create departments to organize your team by function or role
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Department
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Create Department Dialog */}
      <DepartmentFormDialog
        open={createDialogOpen}
        mode="create"
        organizationId={organizationId}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchDepartments}
      />

      {/* Edit Department Dialog */}
      <DepartmentFormDialog
        open={editDialogOpen}
        mode="edit"
        department={editingDepartment}
        organizationId={organizationId}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingDepartment(null);
        }}
        onSuccess={fetchDepartments}
      />
    </div>
  );
}
