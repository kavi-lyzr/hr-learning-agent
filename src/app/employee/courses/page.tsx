"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  Search,
  PlayCircle,
  Eye,
} from "lucide-react";

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

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'my-learning' | 'browse'>('my-learning');
  const [viewAllCourses, setViewAllCourses] = useState(false);

  const isAdmin = currentOrganization?.role === 'admin';

  useEffect(() => {
    if (currentOrganization && userId) {
      fetchData();
    }
  }, [currentOrganization, userId, viewAllCourses]);

  const fetchData = async () => {
    if (!currentOrganization || !userId) return;

    try {
      setLoading(true);

      // Fetch enrollments
      const enrollmentsResponse = await fetch(
        `/api/enrollments?userId=${userId}&organizationId=${currentOrganization.id}`
      );
      if (!enrollmentsResponse.ok) throw new Error('Failed to fetch enrollments');
      const enrollmentsData = await enrollmentsResponse.json();
      setEnrollments(enrollmentsData.enrollments || []);

      // Fetch all courses if admin is viewing all or if on browse tab
      if (isAdmin && viewAllCourses) {
        const coursesResponse = await fetch(
          `/api/organizations/${currentOrganization.id}/courses`
        );
        if (!coursesResponse.ok) throw new Error('Failed to fetch courses');
        const coursesData = await coursesResponse.json();
        setAllCourses(coursesData.courses?.filter((c: Course) => c.status === 'published') || []);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

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
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBrowseCourses.map((course) => (
                  <Card
                    key={course._id}
                    className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                    onClick={() => handleCourseClick(course._id)}
                  >
                    {course.thumbnailUrl ? (
                      <div className="w-full h-40 bg-muted overflow-hidden">
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            {course.category.replace('-', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                    )}
                    <CardContent className={course.thumbnailUrl ? "pt-4" : ""}>
                      {course.thumbnailUrl && (
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary" className="capitalize">
                            {course.category.replace('-', ' ')}
                          </Badge>
                        </div>
                      )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      {enrollment.course.thumbnailUrl ? (
                        <div className="w-full h-40 bg-muted overflow-hidden">
                          <img
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {enrollment.course.category.replace('-', ' ')}
                            </Badge>
                          </div>
                        </CardHeader>
                      )}
                      <CardContent className={enrollment.course.thumbnailUrl ? "pt-4" : ""}>
                        {enrollment.course.thumbnailUrl && (
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="secondary" className="capitalize">
                              {enrollment.course.category.replace('-', ' ')}
                            </Badge>
                          </div>
                        )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notStartedCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      {enrollment.course.thumbnailUrl ? (
                        <div className="w-full h-40 bg-muted overflow-hidden">
                          <img
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <PlayCircle className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {enrollment.course.category.replace('-', ' ')}
                            </Badge>
                          </div>
                        </CardHeader>
                      )}
                      <CardContent className={enrollment.course.thumbnailUrl ? "pt-4" : ""}>
                        {enrollment.course.thumbnailUrl && (
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="secondary" className="capitalize">
                              {enrollment.course.category.replace('-', ' ')}
                            </Badge>
                          </div>
                        )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map((enrollment) => (
                    <Card
                      key={enrollment._id}
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
                      onClick={() => handleCourseClick(enrollment.course._id)}
                    >
                      {enrollment.course.thumbnailUrl ? (
                        <div className="w-full h-40 bg-muted overflow-hidden">
                          <img
                            src={enrollment.course.thumbnailUrl}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <Badge variant="default" className="capitalize">
                              Completed
                            </Badge>
                          </div>
                        </CardHeader>
                      )}
                      <CardContent className={enrollment.course.thumbnailUrl ? "pt-4" : ""}>
                        {enrollment.course.thumbnailUrl && (
                          <div className="flex items-center justify-between mb-3">
                            <Badge variant="default">Completed</Badge>
                          </div>
                        )}
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
