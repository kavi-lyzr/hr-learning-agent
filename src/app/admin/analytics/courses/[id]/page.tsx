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
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  avgCompletionTime: number;
  avgQuizScore: number;
  totalTimeSpent: number;
  lessonMetrics: Array<{
    lessonId: string;
    lessonTitle: string;
    starts: number;
    completions: number;
    completionRate: number;
    avgTimeSpent: number;
    dropoffRate: number;
  }>;
  quizMetrics: Array<{
    lessonId: string;
    lessonTitle: string;
    attempts: number;
    passes: number;
    failures: number;
    passRate: number;
    avgScore: number;
  }>;
  engagementTrend: Array<{
    date: string;
    enrollments: number;
    completions: number;
    timeSpent: number;
  }>;
}

export default function CourseAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const courseId = params.id as string;

  useEffect(() => {
    if (currentOrganization && courseId) {
      fetchCourseAnalytics();
    }
  }, [currentOrganization, courseId]);

  const fetchCourseAnalytics = async () => {
    if (!currentOrganization || !courseId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/courses/${courseId}/details?organizationId=${currentOrganization.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch course analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      toast.error('Failed to load course analytics');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold">{analytics.courseTitle}</h1>
            <p className="text-muted-foreground mt-1">Course Analytics</p>
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
              <div className="text-2xl font-bold">{analytics.totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.activeEnrollments} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getCompletionColor(analytics.completionRate)}`}>
                {analytics.completionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.completedEnrollments} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Completion Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(analytics.avgCompletionTime)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(analytics.totalTimeSpent)} total
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
                {analytics.avgQuizScore.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all quizzes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lesson Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Lesson Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.lessonMetrics.map((lesson, index) => (
                <div key={lesson.lessonId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Lesson {index + 1}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <h3 className="font-semibold">{lesson.lessonTitle}</h3>
                      </div>
                    </div>
                    <Badge variant={lesson.dropoffRate > 20 ? 'destructive' : 'secondary'}>
                      {lesson.dropoffRate.toFixed(1)}% dropoff
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Starts</p>
                      <p className="text-lg font-semibold">{lesson.starts}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completions</p>
                      <p className="text-lg font-semibold">{lesson.completions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completion Rate</p>
                      <p className={`text-lg font-semibold ${getCompletionColor(lesson.completionRate)}`}>
                        {lesson.completionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg. Time</p>
                      <p className="text-lg font-semibold">{formatTime(lesson.avgTimeSpent)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          lesson.completionRate >= 80
                            ? 'bg-green-500'
                            : lesson.completionRate >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${lesson.completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Metrics */}
        {analytics.quizMetrics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.quizMetrics.map((quiz, index) => (
                  <div key={quiz.lessonId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold">{quiz.lessonTitle}</h3>
                      <Badge
                        variant={quiz.passRate >= 70 ? 'default' : 'destructive'}
                      >
                        {quiz.passRate.toFixed(1)}% pass rate
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Attempts</p>
                        <p className="text-lg font-semibold">{quiz.attempts}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Passes</p>
                        <p className="text-lg font-semibold text-green-600">
                          {quiz.passes}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failures</p>
                        <p className="text-lg font-semibold text-red-600">
                          {quiz.failures}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg. Score</p>
                        <p className="text-lg font-semibold">
                          {quiz.avgScore.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Enrolled</span>
                  <span className="text-sm font-semibold">
                    {analytics.totalEnrollments}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-blue-500"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Active Learners</span>
                  <span className="text-sm font-semibold">
                    {analytics.activeEnrollments} (
                    {((analytics.activeEnrollments / analytics.totalEnrollments) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-yellow-500"
                    style={{
                      width: `${(analytics.activeEnrollments / analytics.totalEnrollments) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="text-sm font-semibold">
                    {analytics.completedEnrollments} ({analytics.completionRate.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${analytics.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
