"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import {
  BookOpen,
  Clock,
  Search,
  PlayCircle,
  Eye,
} from "lucide-react";
import { generateCourseGradient } from "@/lib/gradient-utils";
import { useCourses, useEnrollments } from "@/hooks/use-queries";

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
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  thumbnailUrl?: string;
  estimatedDuration: number;
  status: string;
}

export default function EmployeeCoursesPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'my-learning' | 'browse'>('my-learning');
  const [viewAllCourses, setViewAllCourses] = useState(false);

  const isAdmin = currentOrganization?.role === 'admin';

  // Use React Query for data fetching with caching
  const {
    data: enrollments = [],
    isLoading: enrollmentsLoading
  } = useEnrollments(userId, currentOrganization?.id || null) as {
    data: Enrollment[];
    isLoading: boolean;
  };

  // Fetch all courses for admins viewing all courses
  const {
    data: allCoursesData = [],
    isLoading: coursesLoading
  } = useCourses((isAdmin && viewAllCourses) ? currentOrganization?.id || null : null);

  const allCourses = allCoursesData.filter((c: Course) => c.status === 'published');
  const loading = enrollmentsLoading || (isAdmin && viewAllCourses && coursesLoading);

  const handleCourseClick = (courseId: string) => {
    router.push(`/employee/courses/${courseId}`);
  };

  // Filter enrollments based on search
  const filteredEnrollments = enrollments.filter(enrollment =>
    enrollment.course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    enrollment.course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get courses to show: either enrolled courses or all courses (for admins with view all enabled)
  const coursesToShow = (isAdmin && viewAllCourses) ? allCourses : [];
  const filteredBrowseCourses = coursesToShow.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate enrollments by status
  const inProgressCourses = filteredEnrollments.filter(e => e.status === 'in-progress');
  const notStartedCourses = filteredEnrollments.filter(e => e.status === 'not-started');
  const completedCourses = filteredEnrollments.filter(e => e.status === 'completed');

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full @container">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Courses</h1>
            <p className="text-muted-foreground mt-2">
              {isAdmin && viewAllCourses
                ? 'Browsing all available courses'
                : 'Your assigned courses and learning progress'}
            </p>
          </div>

          {/* View All Toggle (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-md border bg-card">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={viewAllCourses}
                onCheckedChange={setViewAllCourses}
                className="data-[state=checked]:bg-primary"
              />
              <Label className="text-sm font-medium cursor-pointer" onClick={() => setViewAllCourses(!viewAllCourses)}>
                View All Courses
              </Label>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-2 w-full mb-3" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (isAdmin && viewAllCourses) ? (
          /* Admin viewing all courses */
          <div>
            {filteredBrowseCourses.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try adjusting your search' : 'No published courses available yet'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
                {filteredBrowseCourses.map((course) => (
                  <Card
                    key={course._id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden pt-0"
                    onClick={() => handleCourseClick(course._id)}
                  >
                    <div className="w-full h-36 overflow-hidden">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: generateCourseGradient(course._id) }}
                        >
                          <BookOpen className="h-12 w-12 text-white/60" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="capitalize">
                          {course.category.replace('-', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mb-2">{course.title}</CardTitle>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {course.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <Clock className="h-3 w-3" />
                        {course.estimatedDuration} min
                      </div>
                      <Button className="w-full" size="sm" variant="outline">
                        View Course
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Employee view or admin viewing assigned courses */
          <div className="space-y-8">
            {/* In Progress */}
            {inProgressCourses.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
                <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
                  {inProgressCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden pt-0"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      <div className="w-full h-36 overflow-hidden">
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
                          <Badge variant="secondary" className="capitalize">
                            {enrollment.course.category.replace('-', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mb-3">{enrollment.course.title}</CardTitle>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            {enrollment.course.totalLessons} lessons • {enrollment.course.estimatedDuration} min
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{enrollment.progressPercentage}%</span>
                            </div>
                            <Progress value={enrollment.progressPercentage} className="h-2" />
                          </div>
                          <Button className="w-full" size="sm">
                            Continue
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Not Started */}
            {notStartedCourses.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Not Started</h2>
                <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
                  {notStartedCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden pt-0"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      <div className="w-full h-36 overflow-hidden">
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
                            <PlayCircle className="h-12 w-12 text-white/60" />
                          </div>
                        )}
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary" className="capitalize">
                            {enrollment.course.category.replace('-', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-base mb-3">{enrollment.course.title}</CardTitle>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            {enrollment.course.totalLessons} lessons • {enrollment.course.estimatedDuration} min
                          </div>
                          <Button className="w-full" size="sm">
                            Start Course
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedCourses.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Completed</h2>
                <div className="grid grid-cols-1 @lg:grid-cols-2 @2xl:grid-cols-3 gap-6">
                  {completedCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden pt-0"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      <div className="w-full h-36 overflow-hidden">
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
                          <Badge variant="default">Completed</Badge>
                        </div>
                        <CardTitle className="text-base mb-3">{enrollment.course.title}</CardTitle>
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            {enrollment.course.totalLessons} lessons • {enrollment.course.estimatedDuration} min
                          </div>
                          <Button className="w-full" size="sm" variant="outline">
                            Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {enrollments.length === 0 && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No courses assigned yet</h3>
                    <p className="text-muted-foreground">
                      Contact your administrator to get enrolled in courses
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
