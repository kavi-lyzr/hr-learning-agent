'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Clock,
  TrendingUp,
  Target,
  Users,
  Award,
  BookOpen,
  Calendar,
  BarChart3,
  Eye,
  EyeOff,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsMetrics {
  totalLearners: number;
  avgCompletionRate: number;
  activeCourses: number;
  learningHours: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  useEffect(() => {
    if (currentOrganization) {
      fetchAnalyticsMetrics();
    }
  }, [currentOrganization]);

  const fetchAnalyticsMetrics = async () => {
    if (!currentOrganization) return;

    try {
      setMetricsLoading(true);
      const res = await fetch(`/api/organizations/${currentOrganization.id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  if (isLoading || !currentOrganization) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
      <div className="max-w-7xl mx-auto space-y-3 w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track learning progress and engagement across your organization
            </p>
          </div>
          
          {/* Toggle Button */}
          <div className="flex items-center gap-3">
            <Label htmlFor="show-analytics" className="flex items-center gap-2 cursor-pointer">
              {showAnalytics ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
              </span>
            </Label>
            <Switch
              id="show-analytics"
              checked={showAnalytics}
              onCheckedChange={setShowAnalytics}
            />
          </div>
        </div>

        <div className="relative">
          {!showAnalytics && (
            <div className="absolute inset-0 z-10 backdrop-blur-xs bg-background/30 rounded-lg flex items-center justify-center">
              <Card className="max-w-md mx-4">
                <CardHeader>
                  <CardTitle className="text-center">Premium Analytics</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Get detailed insights into learning patterns, engagement metrics, and ROI tracking with our premium analytics dashboard.
                  </p>
                  <Button size="lg" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule a Demo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    See how top companies are using Lyzr L&D to transform their learning programs
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Learners
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{metrics?.totalLearners || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active employees
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Completion Rate
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{metrics?.avgCompletionRate || 0}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across all enrollments
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Courses
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{metrics?.activeCourses || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Published courses
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Learning Hours
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{metrics?.learningHours.toLocaleString() || 0}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total time spent learning
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Blurred Charts for Demo - Sales Tool */}
          <div className="relative">
            {/* Ghosted Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course Completion Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-42 flex items-center justify-center bg-muted/50 rounded-lg">
                    <BarChart3 className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Engagement by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-42 flex items-center justify-center bg-muted/50 rounded-lg">
                    <Users className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Learning Hours Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-42 flex items-center justify-center bg-muted/50 rounded-lg">
                    <TrendingUp className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Performing Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-42 flex items-center justify-center bg-muted/50 rounded-lg">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/analytics/events')}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">View All Events</h3>
                  <p className="text-sm text-muted-foreground">Track all learning activities</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/analytics/courses')}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Course Analytics</h3>
                  <p className="text-sm text-muted-foreground">Select a course to view analytics</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push('/admin/analytics/users')}
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">User Analytics</h3>
                  <p className="text-sm text-muted-foreground">Select a user to view analytics</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>


      </div>
    </main>
  );
}
