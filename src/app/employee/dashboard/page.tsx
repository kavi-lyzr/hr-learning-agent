"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useEnrollments } from "@/hooks/use-queries";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  PlayCircle,
  ArrowRight,
} from "lucide-react";
import { generateCourseGradient } from "@/lib/gradient-utils";

interface Enrollment {
  _id: string;
  status: string;
  progressPercentage: number;
  course: {
    _id: string;
    title: string;
    description?: string;
    category: string;
    thumbnailUrl?: string;
    estimatedDuration: number;
    totalLessons: number;
  };
  progress: {
    completedLessonIds: string[];
    currentLessonId?: string;
  };
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();

  // Use React Query for data fetching with caching
  const {
    data: enrollmentsData = [],
    isLoading: loading
  } = useEnrollments(userId, currentOrganization?.id || null);
  
  // Cast to local Enrollment type that includes progress field
  const enrollments = enrollmentsData as unknown as Enrollment[];

  // Filter out enrollments with deleted/null courses to prevent crashes
  const validEnrollments = enrollments.filter(e => e.course != null);

  // Calculate stats from valid enrollments only
  const stats = {
    coursesEnrolled: validEnrollments.length,
    coursesCompleted: validEnrollments.filter(e => e.status === 'completed').length,
    coursesInProgress: validEnrollments.filter(e => e.status === 'in-progress').length,
    totalHoursLearned: validEnrollments.reduce((sum, e) =>
      sum + ((e.course.estimatedDuration || 0) * (e.progressPercentage / 100)), 0
    ) / 60, // Convert minutes to hours
    averageProgress: validEnrollments.length > 0
      ? Math.round(validEnrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / validEnrollments.length)
      : 0,
  };

  // Get the most recently accessed in-progress course
  const continueLearning = validEnrollments
    .filter(e => e.status === 'in-progress')
    .sort((a, b) => b.progressPercentage - a.progressPercentage)[0];

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground mt-2">
            Continue your learning journey
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Courses Enrolled
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.coursesEnrolled}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.coursesInProgress} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.coursesCompleted}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.coursesEnrolled > 0 ? `${Math.round((stats.coursesCompleted / stats.coursesEnrolled) * 100)}% completion rate` : 'No courses yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Learning Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursLearned.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Hours completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Progress
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

        {/* Continue Learning */}
        {continueLearning && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Continue Where You Left Off</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/employee/courses/${continueLearning.course._id}`)}
              >
                <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0">
                  {continueLearning.course.thumbnailUrl ? (
                    <img
                      src={continueLearning.course.thumbnailUrl}
                      alt={continueLearning.course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div 
                      className="h-full w-full flex items-center justify-center"
                      style={{ background: generateCourseGradient(continueLearning.course._id) }}
                    >
                      <PlayCircle className="h-6 w-6 text-white/70" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{continueLearning.course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2 capitalize">
                    {continueLearning.course.category.replace('-', ' ')}
                  </p>
                  <div className="space-y-2">
                    <Progress value={continueLearning.progressPercentage} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{continueLearning.progressPercentage}% complete</span>
                      <span>
                        {continueLearning.progress.completedLessonIds.length} of {continueLearning.course.totalLessons} lessons
                      </span>
                    </div>
                  </div>
                </div>
                <Button>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Courses Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">My Courses</h2>
            <Button
              variant="outline"
              onClick={() => router.push('/employee/courses')}
            >
              View All
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-10 w-10 rounded-lg mb-4" />
                    <Skeleton className="h-5 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : validEnrollments.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't been enrolled in any courses. Check with your admin.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {validEnrollments.slice(0, 6).map((enrollment) => (
                <Card
                  key={enrollment._id}
                  className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/employee/courses/${enrollment.course._id}`)}
                >
                  <div className="w-full h-40 overflow-hidden">
                    {enrollment.course.thumbnailUrl ? (
                      <img
                        src={enrollment.course.thumbnailUrl}
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: generateCourseGradient(enrollment.course._id) }}
                      >
                        <BookOpen className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2 py-1 bg-muted rounded-full capitalize">
                        {enrollment.course.category.replace('-', ' ')}
                      </span>
                    </div>
                    <CardTitle className="text-base mb-3">{enrollment.course.title}</CardTitle>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        {enrollment.course.totalLessons} lessons • {enrollment.course.estimatedDuration} min
                      </div>
                      <div className="space-y-2">
                        <Progress value={enrollment.progressPercentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {enrollment.progressPercentage}% complete
                        </p>
                      </div>
                      <Button className="w-full" variant="outline" size="sm">
                        {enrollment.status === 'completed' ? 'Review' : enrollment.status === 'in-progress' ? 'Continue' : 'Start'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
