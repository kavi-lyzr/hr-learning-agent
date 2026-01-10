'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { ActivityHeatmap } from '@/components/admin/analytics/ActivityHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Target,
  Award,
  TrendingUp,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { KnowledgeGapsChart } from '@/components/admin/analytics/KnowledgeGapsChart';

interface UserAnalytics {
  userId: string;
  userName: string;
  userEmail: string;
  totalEnrollments: number;
  completedCourses: number;
  inProgressCourses: number;
  overallCompletionRate: number;
  totalTimeSpent: number;
  totalLessonsCompleted: number;
  totalQuizzesPassed: number;
  avgQuizScore: number;
  engagementLevel: 'high' | 'medium' | 'low';
  activityHeatmap: Array<{
    date: string;
    minutes: number;
  }>;
  enrollments: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: Date;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    timeSpent: number;
    lastActivity: Date;
    status: 'completed' | 'in-progress' | 'not-started';
  }>;
  knowledgeGaps: Array<{
    moduleId: string;
    moduleName: string;
    courseTitle: string;
    score: number;
    attempts: number;
  }>;
  timeBreakdown: {
    learning: number;
    quizzes: number;
    reviews: number;
  };
}

export default function UserAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = params.id as string;

  useEffect(() => {
    if (currentOrganization && userId) {
      fetchUserAnalytics();
    }
  }, [currentOrganization, userId]);

  const fetchUserAnalytics = async () => {
    if (!currentOrganization || !userId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/analytics/users/${userId}/details?organizationId=${currentOrganization.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      toast.error('Failed to load user analytics');
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

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEngagementLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'High Engagement';
      case 'medium':
        return 'Medium Engagement';
      case 'low':
        return 'Low Engagement';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'not-started':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{analytics.userName}</h1>
            <p className="text-muted-foreground mt-1">{analytics.userEmail}</p>
          </div>
          <Badge className={getEngagementColor(analytics.engagementLevel)}>
            {getEngagementLabel(analytics.engagementLevel)}
          </Badge>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Enrollments
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.completedCourses} completed
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
              <div className="text-2xl font-bold">
                {analytics.overallCompletionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.totalLessonsCompleted} lessons completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Time Spent Learning
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(analytics.totalTimeSpent)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total learning time
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
                {analytics.totalQuizzesPassed} quizzes passed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Learning Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap data={analytics.activityHeatmap.map(item => ({
              date: item.date,
              minutesSpent: item.minutes
            }))} />
          </CardContent>
        </Card>

        {/* Time Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Time Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Learning Content</span>
                  <span className="text-sm font-semibold">
                    {formatTime(analytics.timeBreakdown.learning)} (
                    {((analytics.timeBreakdown.learning / analytics.totalTimeSpent) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Progress
                  value={(analytics.timeBreakdown.learning / analytics.totalTimeSpent) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Quizzes</span>
                  <span className="text-sm font-semibold">
                    {formatTime(analytics.timeBreakdown.quizzes)} (
                    {((analytics.timeBreakdown.quizzes / analytics.totalTimeSpent) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Progress
                  value={(analytics.timeBreakdown.quizzes / analytics.totalTimeSpent) * 100}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Reviews & Revisions</span>
                  <span className="text-sm font-semibold">
                    {formatTime(analytics.timeBreakdown.reviews)} (
                    {((analytics.timeBreakdown.reviews / analytics.totalTimeSpent) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Progress
                  value={(analytics.timeBreakdown.reviews / analytics.totalTimeSpent) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle>Course Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.enrollments.map((enrollment) => (
                <div key={enrollment.courseId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold">{enrollment.courseTitle}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last activity:{' '}
                        {formatDistanceToNow(new Date(enrollment.lastActivity), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge className={getStatusColor(enrollment.status)}>
                      {enrollment.status.replace('-', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {enrollment.completedLessons} / {enrollment.totalLessons} lessons (
                        {enrollment.progress.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Time Spent</p>
                      <p className="font-semibold">{formatTime(enrollment.timeSpent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Enrolled</p>
                      <p className="font-semibold">
                        {formatDistanceToNow(new Date(enrollment.enrolledAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Gaps */}
        {analytics.knowledgeGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <KnowledgeGapsChart data={analytics.knowledgeGaps} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
