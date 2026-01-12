'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Users,
  Target,
  Clock,
  Award,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function CourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  const courseId = params.id as string;

  const [analytics, setAnalytics] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch course analytics and course details
  useEffect(() => {
    if (!courseId || !currentOrganization?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch analytics
        const analyticsResponse = await fetch(
          `/api/analytics/courses/${courseId}?organizationId=${currentOrganization.id}`
        );
        
        if (!analyticsResponse.ok) throw new Error('Failed to fetch course analytics');
        
        const analyticsData = await analyticsResponse.json();
        
        // Extract the first analytics object from the array
        const analytics = analyticsData.analytics?.[0] || null;
        setAnalytics(analytics);

        // Fetch course details
        const coursesResponse = await fetch(
          `/api/courses?organizationId=${currentOrganization.id}`
        );
        
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          const foundCourse = coursesData.courses?.find((c: any) => c._id === courseId);
          setCourse(foundCourse);
        }
      } catch (error) {
        console.error('Error fetching course analytics:', error);
        toast.error('Failed to load course analytics');
        setAnalytics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, currentOrganization?.id]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-muted-foreground">No analytics data available</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/analytics')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course?.title || 'Course Analytics'}</h1>
            <p className="text-muted-foreground mt-1">
              {course?.description || 'Detailed performance metrics'}
            </p>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Enrollments
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.enrollmentCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.period || 'weekly'} period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completions
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCompletionColor(analytics.completionRate || 0)}`}>
                {analytics.completionCount || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(analytics.completionRate || 0).toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Time Spent
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(analytics.avgTimeSpent || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per learner
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Quiz Score
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analytics.avgScore || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.avgAttemptsToPass || 0} avg attempts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Course Details */}
        {course && (
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{course.category || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Modules</p>
                  <p className="font-medium">{course.totalModules || course.modules?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Lessons</p>
                  <p className="font-medium">{course.totalLessons || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Duration</p>
                  <p className="font-medium">{formatTime(course.estimatedDuration || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{course.createdBy?.name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lesson Metrics */}
        {course?.modules && course.modules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Course Modules & Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {course.modules.map((module: any, moduleIndex: number) => (
                  <div key={module._id} className="border rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg">
                        Module {moduleIndex + 1}: {module.title}
                      </h3>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {module.description}
                        </p>
                      )}
                    </div>

                    {module.lessons && module.lessons.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {module.lessons.map((lesson: any, lessonIndex: number) => (
                          <div
                            key={lesson._id}
                            className="border rounded p-3 bg-muted/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Lesson {lessonIndex + 1}
                                  </span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  <h4 className="font-medium">{lesson.title}</h4>
                                </div>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{lesson.contentType}</span>
                                <span>•</span>
                                <span>{formatTime(lesson.duration || 0)}</span>
                                {lesson.hasQuiz && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">
                                      Quiz ({lesson.quizData?.questions?.length || 0} questions)
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analytics Summary */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Enrollment to Completion</span>
                    <span className="text-sm font-semibold">
                      {analytics.completionCount} / {analytics.enrollmentCount} enrolled
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        analytics.completionRate >= 75
                          ? 'bg-green-500'
                          : analytics.completionRate >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${analytics.completionRate || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(analytics.completionRate || 0).toFixed(1)}% completion rate
                  </p>
                </div>

                {analytics.avgScore > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Quiz Performance</span>
                      <span className="text-sm font-semibold">
                        {(analytics.avgScore || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          analytics.avgScore >= 75
                            ? 'bg-green-500'
                            : analytics.avgScore >= 50
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${analytics.avgScore || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average {analytics.avgAttemptsToPass || 0} attempts to pass
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
