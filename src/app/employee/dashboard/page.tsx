"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboard() {
  // TODO: Fetch from API
  const stats = {
    coursesInProgress: 0,
    coursesCompleted: 0,
    totalHoursLearned: 0,
    averageProgress: 0,
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          role="employee"
          user={{
            name: "Employee User",
            email: "employee@example.com",
          }}
          organization={{
            name: "Demo Organization",
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">My Learning</h1>
            <p className="text-muted-foreground mt-2">
              Continue your learning journey
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.coursesInProgress}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active courses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.coursesCompleted}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Courses finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Hours Learned
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalHoursLearned}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total learning time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Progress
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageProgress}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all courses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Continue Learning Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Continue Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No courses in progress yet
                  </p>
                  <Button>Browse Courses</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                No recommendations available yet
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
}
