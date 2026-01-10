'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  enrollmentCount?: number;
  enrollments?: number;
  completionCount?: number;
  completionRate: number;
  avgTimeSpent: number;
  avgScore: number;
}

interface CourseAnalyticsTableProps {
  courses?: CourseAnalytics[];
  data?: any[];
  isLoading?: boolean;
  onCourseClick?: (courseId: string) => void;
  onRowClick?: (courseId: string) => void;
}

export function CourseAnalyticsTable({
  courses,
  data,
  isLoading = false,
  onCourseClick,
  onRowClick,
}: CourseAnalyticsTableProps) {
  const coursesData = data || courses || [];
  const handleClick = onRowClick || onCourseClick;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Avg Time</TableHead>
                <TableHead>Avg Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (coursesData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No course data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Analytics will appear as courses are accessed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Performance</CardTitle>
        <p className="text-sm text-muted-foreground">
          Engagement and completion metrics by course
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Enrollments</TableHead>
              <TableHead>Completion Rate</TableHead>
              <TableHead>Avg Time</TableHead>
              <TableHead>Avg Score</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coursesData.map((course: any) => {
              const enrollCount = course.enrollmentCount || course.enrollments || 0;
              const completions = course.completionCount || 0;
              
              return (
                <TableRow 
                  key={course.courseId} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleClick && handleClick(course.courseId)}
                >
                  <TableCell className="font-medium max-w-md truncate">
                    {course.courseTitle}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{enrollCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getCompletionRateColor(course.completionRate)}`}>
                        {course.completionRate.toFixed(1)}%
                      </span>
                      <span className={getCompletionRateColor(course.completionRate)}>
                        {getCompletionRateIcon(course.completionRate)}
                      </span>
                    </div>
                    {completions > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {completions} completed
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTime(course.avgTimeSpent)}
                  </TableCell>
                  <TableCell>
                    {course.avgScore > 0 ? (
                      <Badge
                        variant="outline"
                        className={
                          course.avgScore >= 70
                            ? 'border-green-500 text-green-600'
                            : 'border-yellow-500 text-yellow-600'
                        }
                      >
                        {course.avgScore.toFixed(1)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
