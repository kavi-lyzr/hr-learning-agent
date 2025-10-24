"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Plus,
  BarChart3
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'employee';
}

export default function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch organization details
    // For now, using placeholder data
    if (orgId) {
      setTimeout(() => {
        setOrganization({
          id: orgId,
          name: "Acme Corporation",
          role: "admin",
        });
        setIsLoading(false);
      }, 500);
    }
  }, [orgId]);

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <SiteHeader />
            <main className="flex-1 overflow-y-auto p-8">
              <Skeleton className="h-8 w-64 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
        <SiteHeader
          organization={organization || undefined}
          breadcrumbs={[
            { label: organization?.name || 'Dashboard', href: `/admin/dashboard?org=${orgId}` },
            { label: 'Dashboard' }
          ]}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                  Overview of your L&D platform
                </p>
              </div>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Quick Actions
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Courses
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +2 from last month
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
                  <div className="text-2xl font-bold">124</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +8 from last month
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
                  <div className="text-2xl font-bold">342</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +45 from last month
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
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +5% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New course created</p>
                      <p className="text-xs text-muted-foreground">
                        "Advanced React Patterns" - 2 hours ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">15 new employees added</p>
                      <p className="text-xs text-muted-foreground">
                        Engineering department - 5 hours ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-muted" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Course completed</p>
                      <p className="text-xs text-muted-foreground">
                        "Sales Training 101" by John Doe - 1 day ago
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => router.push(`/admin/courses?org=${orgId}`)}
                  >
                    <BookOpen className="h-4 w-4" />
                    Create New Course
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => router.push(`/admin/employees?org=${orgId}`)}
                  >
                    <Users className="h-4 w-4" />
                    Add Employees
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3"
                    onClick={() => router.push(`/admin/analytics?org=${orgId}`)}
                  >
                    <BarChart3 className="h-4 w-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
    </SidebarProvider>
  );
}
