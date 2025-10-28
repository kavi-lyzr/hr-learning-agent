"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  Award,
  PlayCircle,
  FileText,
  CheckCircle,
  ArrowLeft,
  Video,
} from "lucide-react";

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  contentType: 'video' | 'article';
  content: {
    videoUrl?: string;
    articleHtml?: string;
  };
  order: number;
  estimatedDuration: number;
}

interface Module {
  _id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  thumbnailUrl?: string;
  estimatedDuration: number;
  modules: Module[];
  totalLessons: number;
}

interface Enrollment {
  _id: string;
  status: string;
  progressPercentage: number;
  progress: {
    completedLessonIds: string[];
    currentLessonId?: string;
  };
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization && userId && courseId) {
      fetchCourseData();
    }
  }, [currentOrganization, userId, courseId]);

  const fetchCourseData = async () => {
    if (!currentOrganization || !userId || !courseId) return;

    try {
      setLoading(true);

      // Fetch course details
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      const courseData = await courseResponse.json();

      // Calculate total lessons
      const totalLessons = courseData.course.modules.reduce(
        (sum: number, module: Module) => sum + (module.lessons?.length || 0),
        0
      );
      setCourse({ ...courseData.course, totalLessons });

      // Fetch enrollment if exists
      try {
        const enrollmentsResponse = await fetch(
          `/api/enrollments?userId=${userId}&organizationId=${currentOrganization.id}`
        );
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json();
          const currentEnrollment = enrollmentsData.enrollments.find(
            (e: any) => (e.courseId || e.course?._id) === courseId
          );
          if (currentEnrollment) {
            setEnrollment(currentEnrollment);
          }
        }
      } catch (error) {
        console.error('Error fetching enrollment:', error);
      }
    } catch (error: any) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async () => {
    if (!userId || !currentOrganization || !course) return;

    try {
      // Create enrollment if doesn't exist
      if (!enrollment) {
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            courseId: course._id,
            organizationId: currentOrganization.id,
          }),
        });

        // Handle response
        const data = await response.json();

        if (response.status === 409) {
          // Already enrolled - that's fine, use the existing enrollment
          if (data.enrollment) {
            setEnrollment(data.enrollment);
          }
        } else if (!response.ok) {
          throw new Error(data.error || 'Failed to enroll');
        } else {
          // Successfully created
          setEnrollment(data.enrollment);
        }
      }

      // Navigate to first lesson
      if (course.modules.length > 0 && course.modules[0].lessons.length > 0) {
        const firstLesson = course.modules[0].lessons[0];
        router.push(`/employee/courses/${course._id}/lessons/${firstLesson._id}`);
      }
    } catch (error: any) {
      console.error('Error starting course:', error);
      toast.error('Failed to start course');
    }
  };

  const handleLessonClick = (lessonId: string) => {
    router.push(`/employee/courses/${courseId}/lessons/${lessonId}`);
  };

  const isLessonCompleted = (lessonId: string) => {
    return enrollment?.progress.completedLessonIds.includes(lessonId) || false;
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Course not found</h3>
                <p className="text-muted-foreground mb-4">
                  This course may have been removed or you don't have access to it
                </p>
                <Button onClick={() => router.push('/employee/courses')}>
                  Back to Courses
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => router.push('/employee/courses')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Button>

        {/* Course Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-12 w-12 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {course.category.replace('-', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {course.totalLessons} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.estimatedDuration} min
                  </span>
                  {enrollment && (
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      {enrollment.progressPercentage}% complete
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {course.description && (
              <p className="text-muted-foreground">{course.description}</p>
            )}

            {enrollment && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Your Progress</span>
                  <span className="text-muted-foreground">
                    {enrollment.progress.completedLessonIds.length} / {course.totalLessons} lessons completed
                  </span>
                </div>
                <Progress value={enrollment.progressPercentage} className="h-2" />
              </div>
            )}

            {!enrollment && (
              <Button size="lg" className="w-full" onClick={handleStartCourse}>
                <PlayCircle className="h-5 w-5 mr-2" />
                Start Course
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Course Content */}
        <Card>
          <CardHeader>
            <CardTitle>Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            {course.modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No modules or lessons available yet
              </div>
            ) : (
              <Accordion type="multiple" className="w-full" defaultValue={course.modules.map(m => m._id)}>
                {course.modules
                  .sort((a, b) => a.order - b.order)
                  .map((module) => {
                    const moduleLessons = module.lessons || [];
                    const completedInModule = moduleLessons.filter(l => isLessonCompleted(l._id)).length;

                    return (
                      <AccordionItem key={module._id} value={module._id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-start gap-3 text-left">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                <BookOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{module.title}</h3>
                                {module.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {module.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {moduleLessons.length} lessons
                                  {enrollment && ` " ${completedInModule} completed`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="ml-14 space-y-2 mt-2">
                            {moduleLessons.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-4">
                                No lessons in this module yet
                              </p>
                            ) : (
                              moduleLessons
                                .sort((a, b) => a.order - b.order)
                                .map((lesson) => {
                                  const completed = isLessonCompleted(lesson._id);
                                  const isCurrent = enrollment?.progress.currentLessonId === lesson._id;

                                  return (
                                    <div
                                      key={lesson._id}
                                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                                        isCurrent ? 'bg-primary/5 border-primary' : ''
                                      }`}
                                      onClick={() => handleLessonClick(lesson._id)}
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        {completed ? (
                                          <CheckCircle className="h-5 w-5 text-primary" />
                                        ) : lesson.contentType === 'video' ? (
                                          <Video className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                          <FileText className="h-5 w-5 text-muted-foreground" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm">{lesson.title}</h4>
                                        {lesson.description && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {lesson.description}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                          <Badge variant="outline" className="text-xs capitalize">
                                            {lesson.contentType}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {lesson.estimatedDuration} min
                                          </span>
                                          {isCurrent && (
                                            <Badge variant="default" className="text-xs">
                                              Current
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
