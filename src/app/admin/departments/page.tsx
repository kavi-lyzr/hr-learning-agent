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
import { useOrganization } from "@/lib/OrganizationProvider";
import { Plus, Users, BookOpen, MoreVertical, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Fake data
const FAKE_DEPARTMENTS = [
  { id: '1', name: "Sales", employees: 24, defaultCourses: 3, autoEnroll: true },
  { id: '2', name: "Product", employees: 18, defaultCourses: 2, autoEnroll: true },
  { id: '3', name: "Engineering", employees: 32, defaultCourses: 4, autoEnroll: false },
  { id: '4', name: "Customer Success", employees: 15, defaultCourses: 2, autoEnroll: true },
];

export default function AdminDepartmentsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading || !currentOrganization) {
    return null;
  }

  const departments = FAKE_DEPARTMENTS;

  const handleCreateDepartment = () => {
    // TODO: Call API to create department
    console.log('Creating department');
    setCreateDialogOpen(false);
  };

  const handleDeleteDepartment = (deptId: string) => {
    // TODO: Call API to delete department
    console.log('Deleting department:', deptId);
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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Department</DialogTitle>
                      <DialogDescription>
                        Create a department and set default course assignments
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="dept-name">Department Name</Label>
                        <Input id="dept-name" placeholder="e.g., Sales" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto-Enroll New Employees</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically enroll new employees in default courses
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateDepartment}>Create Department</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Departments Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                  <Card key={dept.id} className="hover:shadow-lg transition-shadow">
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Department
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteDepartment(dept.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-xl">{dept.name}</CardTitle>
                      <CardDescription>
                        {dept.employees} employees • {dept.defaultCourses} default courses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Employees</span>
                          <span className="font-medium">{dept.employees}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Default Courses</span>
                          <span className="font-medium">{dept.defaultCourses}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Auto-Enroll</span>
                          <Badge variant={dept.autoEnroll ? 'default' : 'secondary'}>
                            {dept.autoEnroll ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <Button className="w-full" variant="outline" size="sm">
                          <BookOpen className="h-3 w-3 mr-2" />
                          Manage Courses
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
  );
}
