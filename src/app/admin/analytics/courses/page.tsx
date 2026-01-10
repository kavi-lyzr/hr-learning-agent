'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface Course {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  status: string;
  lessonsCount?: number;
}

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, CourseAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      fetchCoursesAndAnalytics();
    }
  }, [currentOrganization]);

  const fetchCoursesAndAnalytics = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    try {
      // Fetch all courses
      const coursesRes = await fetch(`/api/courses?organizationId=${currentOrganization.id}`);
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData.courses || []);
      }

      // Fetch analytics for all courses
      const analyticsRes = await fetch(`/api/analytics/organization/${currentOrganization.id}`);
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        const analyticsMap: Record<string, CourseAnalytics> = {};
        (analyticsData.courses || []).forEach((course: any) => {
          analyticsMap[course.courseId] = course;
        });
        setAnalytics(analyticsMap);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category?.toLowerCase().includes(searchQuery.toLowerCase())
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
                              <p className={`text-lg font-semibold ${getCompletionRateColor(courseAnalytics.completionRate)}`}>
                                {courseAnalytics.completionRate.toFixed(1)}%
                              </p>
                              <span className={getCompletionRateColor(courseAnalytics.completionRate)}>
                                {getCompletionRateIcon(courseAnalytics.completionRate)}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Time</p>
                            <p className="text-lg font-semibold">
                              {formatTime(courseAnalytics.avgTimeSpent)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                            <p className="text-lg font-semibold">
                              {courseAnalytics.avgScore > 0 
                                ? `${courseAnalytics.avgScore.toFixed(1)}%` 
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      )}

                      {!courseAnalytics && (
                        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                          No analytics data available yet
                        </p>
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
