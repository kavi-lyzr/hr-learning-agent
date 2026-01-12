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
import { formatDistanceToNow } from 'date-fns';
import { KnowledgeGapsChart } from '@/components/admin/analytics/KnowledgeGapsChart';
import { toast } from 'sonner';

export default function UserAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganization();

  const userId = params.id as string;

  const [analytics, setAnalytics] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user analytics and details
  useEffect(() => {
    if (!userId || !currentOrganization?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch analytics
        const analyticsResponse = await fetch(`/api/analytics/users/${userId}`);
        
        if (!analyticsResponse.ok) throw new Error('Failed to fetch user analytics');
        
        const analyticsData = await analyticsResponse.json();
        const analytics = analyticsData.analytics?.[0] || null;
        setAnalytics(analytics);

        // Fetch user info from members
        const membersResponse = await fetch(
          `/api/organizations/${currentOrganization.id}/members`
        );
        
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          const member = membersData.members?.find((m: any) => {
            const memberUserId = typeof m.userId === 'object' ? m.userId._id : m.userId;
            return memberUserId.toString() === userId;
          });
          setUserInfo(member);
        }

        // Fetch enrollments
        const enrollmentsResponse = await fetch(
          `/api/enrollments?userId=${userId}`
        );
        
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          setEnrollments(enrollmentsData.enrollments || []);
        }
      } catch (error) {
        console.error('Error fetching user analytics:', error);
        toast.error('Failed to load user analytics');
        setAnalytics(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, currentOrganization?.id]);

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
            onClick={() => router.push('/admin/analytics/users')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {userInfo?.userId?.name || userInfo?.email || 'User Analytics'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {userInfo?.email || userInfo?.userId?.email || ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userInfo?.role && (
              <Badge variant="outline">{userInfo.role}</Badge>
            )}
            <Badge className={getEngagementColor(analytics?.engagementLevel || 'low')}>
              {getEngagementLabel(analytics?.engagementLevel || 'low')}
            </Badge>
          </div>
        </div>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Courses Enrolled
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.coursesEnrolled || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics?.coursesCompleted || 0} completed
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
                {analytics?.coursesEnrolled > 0 
                  ? ((analytics.coursesCompleted / analytics.coursesEnrolled) * 100).toFixed(1)
                  : '0'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {enrollments.length} total enrollments
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
                {formatTime(analytics?.totalTimeSpent || 0)}
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
                {(analytics?.avgQuizScore || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics?.period || 'weekly'} period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Heatmap */}
        {analytics?.activityHeatmap && analytics.activityHeatmap.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Learning Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap data={(analytics.activityHeatmap || []).map((item: any) => ({
                date: item.date,
                minutesSpent: item.minutes || item.minutesSpent || 0
              }))} />
            </CardContent>
          </Card>
        )}

        {/* Last Accessed Courses */}
        {analytics?.lastAccessedCourses && analytics.lastAccessedCourses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recently Accessed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.lastAccessedCourses.map((course: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{course.courseTitle || 'Course'}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.lastAccessed ? formatDistanceToNow(new Date(course.lastAccessed), { addSuffix: true }) : 'N/A'}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(course.timeSpent || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Enrollments */}
        {enrollments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollments.map((enrollment: any) => {
                  const progress = enrollment.progress || 0;
                  const status = enrollment.status || 'not-started';
                  
                  return (
                    <div key={enrollment._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {enrollment.courseId?.title || 'Course'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            Last activity:{' '}
                            {enrollment.lastAccessedAt 
                              ? formatDistanceToNow(new Date(enrollment.lastAccessedAt), { addSuffix: true })
                              : 'Never'}
                          </p>
                        </div>
                        <Badge className={getStatusColor(status)}>
                          {status.replace('-', ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold">
                            {enrollment.completedLessons || 0} / {enrollment.totalLessons || 0} lessons ({progress.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Time Spent</p>
                          <p className="font-semibold">{formatTime(enrollment.timeSpent || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Enrolled</p>
                          <p className="font-semibold">
                            {enrollment.enrolledAt 
                              ? formatDistanceToNow(new Date(enrollment.enrolledAt), { addSuffix: true })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Knowledge Gaps */}
        {analytics?.knowledgeGaps && analytics.knowledgeGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.knowledgeGaps.map((gap: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{gap.moduleName || gap.lessonTitle || 'Module'}</h4>
                        <p className="text-xs text-muted-foreground">{gap.courseTitle || 'Course'}</p>
                      </div>
                      <Badge variant="destructive">{(gap.score || gap.avgScore || 0).toFixed(1)}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {gap.attempts || gap.attemptCount || 0} attempts
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
