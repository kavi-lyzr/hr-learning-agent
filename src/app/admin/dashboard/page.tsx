"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  // TODO: Fetch from API
  const stats = {
    totalCourses: 0,
    totalEmployees: 0,
    activeEnrollments: 0,
    completionRate: 0,
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          role="admin"
          user={{
            name: "Admin User",
            email: "admin@example.com",
          }}
          organization={{
            name: "Demo Organization",
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Overview of your learning & development program
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Courses
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active learning programs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Enrollments
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  In-progress courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completion Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average across all courses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  No recent enrollments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Popular Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  No courses created yet
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
