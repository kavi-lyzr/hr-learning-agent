"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useDashboardStats, useOrganizationActivity } from "@/hooks/use-queries";
import {
  BookOpen,
  Users,
  BarChart3,
  Layers,
  FileText,
} from "lucide-react";

interface ActivityEvent {
  id: string;
  type: 'enrollment' | 'lesson_completed' | 'quiz_attempted' | 'course_completed';
  userId: string;
  userName: string;
  courseId?: string;
  courseName?: string;
  lessonId?: string;
  lessonName?: string;
  metadata?: {
    score?: number;
    passed?: boolean;
    progressPercentage?: number;
  };
  timestamp: Date;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  
  // Use React Query hooks for data fetching with caching
  const { 
    data: stats, 
    isLoading: statsLoading,
    isError: statsError 
  } = useDashboardStats(currentOrganization?.id || null);
  
  const { 
    data: activities = [], 
    isLoading: activitiesLoading 
  } = useOrganizationActivity(currentOrganization?.id || null);

  // Transform activities to have proper Date objects
  const formattedActivities = activities.map((activity: ActivityEvent) => ({
    ...activity,
    timestamp: new Date(activity.timestamp),
  }));

  const getActivityDescription = (activity: ActivityEvent) => {
    switch (activity.type) {
      case 'enrollment':
        return {
          title: 'New enrollment',
          description: `${activity.userName} enrolled in "${activity.courseName}"`,
          color: 'bg-blue-500',
        };
      case 'lesson_completed':
        return {
          title: 'Lesson completed',
          description: `${activity.userName} completed "${activity.lessonName}"`,
          color: 'bg-green-500',
        };
      case 'quiz_attempted':
        const passed = activity.metadata?.passed ? 'passed' : 'attempted';
        const score = activity.metadata?.score ? ` (${activity.metadata.score}%)` : '';
        return {
          title: `Quiz ${passed}`,
          description: `${activity.userName} ${passed} quiz in "${activity.lessonName}"${score}`,
          color: activity.metadata?.passed ? 'bg-green-500' : 'bg-yellow-500',
        };
      case 'course_completed':
        return {
          title: 'Course completed',
          description: `${activity.userName} completed "${activity.courseName}"`,
          color: 'bg-primary',
        };
      default:
        return {
          title: 'Activity',
          description: activity.userName,
          color: 'bg-muted',
        };
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
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
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
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
              {activitiesLoading ? (
                <>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </>
              ) : formattedActivities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Activity will appear here as employees engage with courses
                  </p>
                </div>
              ) : (
                formattedActivities.slice(0, 5).map((activity) => {
                  const { title, description, color } = getActivityDescription(activity);
                  return (
                    <div key={activity.id} className="flex items-center gap-4">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">
                          {description} - {getRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
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
