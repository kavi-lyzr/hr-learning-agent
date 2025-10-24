"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/OrganizationProvider";
import {
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Plus,
  BarChart3,
  Layers,
  FileText,
} from "lucide-react";

interface DashboardStats {
  totalCourses: number;
  publishedCourses: number;
  totalModules: number;
  totalLessons: number;
  totalMembers: number;
  activeMembers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization) {
      fetchDashboardStats();
    }
  }, [currentOrganization]);

  const fetchDashboardStats = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      
      // Fetch courses
      const coursesRes = await fetch(`/api/courses?organizationId=${currentOrganization.id}`);
      const coursesData = await coursesRes.json();
      const courses = coursesData.courses || [];

      // Calculate stats from courses
      const totalCourses = courses.length;
      const publishedCourses = courses.filter((c: any) => c.status === 'published').length;
      const totalModules = courses.reduce((sum: number, c: any) => sum + (c.totalModules || 0), 0);
      const totalLessons = courses.reduce((sum: number, c: any) => sum + (c.totalLessons || 0), 0);

      // Fetch organization members
      const membersRes = await fetch(`/api/organizations/${currentOrganization.id}/members`);
      const membersData = await membersRes.json();
      const members = membersData.members || [];

      const totalMembers = members.length;
      const activeMembers = members.filter((m: any) => m.status === 'active').length;

      setStats({
        totalCourses,
        publishedCourses,
        totalModules,
        totalLessons,
        totalMembers,
        activeMembers,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default stats on error
      setStats({
        totalCourses: 0,
        publishedCourses: 0,
        totalModules: 0,
        totalLessons: 0,
        totalMembers: 0,
        activeMembers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
            <div className="max-w-7xl mx-auto space-y-8 w-full">
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
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Courses
                      </CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.publishedCourses || 0} published
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Team Members
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalMembers || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.activeMembers || 0} active
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Modules
                      </CardTitle>
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalModules || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across all courses
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Lessons
                      </CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalLessons || 0}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Content items
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

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
                      onClick={() => router.push(`/admin/courses`)}
                    >
                      <BookOpen className="h-4 w-4" />
                      Create New Course
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => router.push(`/admin/employees`)}
                    >
                      <Users className="h-4 w-4" />
                      Add Employees
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => router.push(`/admin/analytics`)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      View Analytics
                    </Button>
                  </CardContent>
                </Card>
              </div>
      </div>
    </main>
  );
}
