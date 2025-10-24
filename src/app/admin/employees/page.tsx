"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/lib/OrganizationProvider";
import { Plus, Search, Upload, UserPlus, MoreVertical, Mail, Shield, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Fake data
const FAKE_EMPLOYEES = [
  { id: '1', name: "John Doe", email: "john@acme.com", department: "Sales", coursesEnrolled: 5, coursesCompleted: 3, status: "active", role: "employee" },
  { id: '2', name: "Jane Smith", email: "jane@acme.com", department: "Product", coursesEnrolled: 4, coursesCompleted: 4, status: "active", role: "employee" },
  { id: '3', name: "Bob Johnson", email: "bob@acme.com", department: "Engineering", coursesEnrolled: 6, coursesCompleted: 2, status: "active", role: "employee" },
  { id: '4', name: "Alice Williams", email: "alice@acme.com", department: "Sales", coursesEnrolled: 3, coursesCompleted: 1, status: "invited", role: "employee" },
];

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading || !currentOrganization) {
    return null;
  }

  const employees = FAKE_EMPLOYEES;

  const handleAddEmployee = () => {
    // TODO: Call API to add employee
    console.log('Adding employee');
    setAddDialogOpen(false);
  };

  const handleBulkUpload = () => {
    // TODO: Handle CSV upload
    console.log('Bulk uploading employees');
    setBulkUploadDialogOpen(false);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    // TODO: Call API to delete employee
    console.log('Deleting employee:', employeeId);
  };

  return (
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
            <div className="max-w-7xl mx-auto space-y-8 w-full">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Employees</h1>
                  <p className="text-muted-foreground mt-2">
                    Manage employee access and enrollments
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={bulkUploadDialogOpen} onOpenChange={setBulkUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Bulk Upload
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Bulk Upload Employees</DialogTitle>
                        <DialogDescription>
                          Upload a CSV file with employee details
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Drop CSV file here or click to browse
                          </p>
                          <Input type="file" accept=".csv" className="max-w-xs mx-auto" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p className="mb-1">CSV should include: name, email, department (optional)</p>
                          <a href="#" className="text-primary hover:underline">Download sample CSV</a>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkUploadDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleBulkUpload}>Upload</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <UserPlus className="h-4 w-4" />
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
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="john@acme.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department (Optional)</Label>
                          <Input id="department" placeholder="e.g., Sales" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddEmployee}>Send Invite</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Employees Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Employees ({employees.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Courses Enrolled</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {employee.email}
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.coursesEnrolled}</TableCell>
                          <TableCell>{employee.coursesCompleted}</TableCell>
                          <TableCell>
                            <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Shield className="h-4 w-4 mr-2" />
                                  View Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteEmployee(employee.id)}
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
                </CardContent>
              </Card>
            </div>
          </main>
  );
}
