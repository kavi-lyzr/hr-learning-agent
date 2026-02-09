'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface CourseAnalytics {
  courseId: string;
  enrollmentCount: number;
  completionRate: number;
  avgTimeSpent: number;
  avgScore: number;
}

export default function CoursesAnalyticsPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [coursesData, setCoursesData] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Fetch courses
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const response = await fetch(
          `/api/courses?organizationId=${currentOrganization.id}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch courses');
        
        const data = await response.json();
        setCoursesData(data.courses || []);
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast.error('Failed to load courses');
        setCoursesData([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [currentOrganization?.id]);

  // Fetch analytics
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const response = await fetch(
          `/api/analytics/organization/${currentOrganization.id}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Don't show error toast as analytics might not be available yet
        setAnalyticsData(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [currentOrganization?.id]);

  const isLoading = coursesLoading || analyticsLoading;

  // Map analytics by courseId for easy lookup
  const analytics = useMemo(() => {
    const analyticsMap: Record<string, CourseAnalytics> = {};
    (analyticsData?.courseAnalytics || []).forEach((course: any) => {
      analyticsMap[course.courseId] = course;
    });
    return analyticsMap;
  }, [analyticsData]);

  const filteredCourses = useMemo(() => 
    coursesData.filter((course: any) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [coursesData, searchQuery]
  );

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 75) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionRateIcon = (rate: number) => {
    if (rate >= 75) return <TrendingUp className="h-4 w-4" />;
    if (rate >= 50) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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
            <h1 className="text-3xl font-bold">Course Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Select a course to view detailed analytics
            </p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        <Card>
          <CardHeader>
            <CardTitle>All Courses ({filteredCourses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="space-y-3">
                {filteredCourses.map((course) => {
                  const courseAnalytics = analytics[course._id];
                  
                  return (
                    <div
                      key={course._id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/admin/analytics/courses/${course._id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{course.title}</h3>
                            {course.category && (
                              <Badge variant="outline">{course.category}</Badge>
                            )}
                            <Badge
                              variant={course.status === 'published' ? 'default' : 'secondary'}
                            >
                              {course.status}
                            </Badge>
                          </div>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {course.description}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      </div>

                      {courseAnalytics && (
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Enrollments</p>
                            <p className="text-lg font-semibold">
                              {courseAnalytics.enrollmentCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Completion Rate</p>
                            <div className="flex items-center gap-2">
                              <p className={`text-lg font-semibold ${getCompletionRateColor(courseAnalytics.completionRate || 0)}`}>
                                {(courseAnalytics.completionRate || 0).toFixed(1)}%
                              </p>
                              <span className={getCompletionRateColor(courseAnalytics.completionRate || 0)}>
                                {getCompletionRateIcon(courseAnalytics.completionRate || 0)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Time</p>
                            <p className="text-lg font-semibold">
                              {formatTime(courseAnalytics.avgTimeSpent || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                            <p className="text-lg font-semibold">
                              {(courseAnalytics.avgScore || 0) > 0 
                                ? `${(courseAnalytics.avgScore || 0).toFixed(1)}%` 
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No courses found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
