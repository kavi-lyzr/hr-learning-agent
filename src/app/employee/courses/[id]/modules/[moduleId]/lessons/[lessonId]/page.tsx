"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  FileText,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'employee';
}

export default function EmployeeLessonViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const moduleId = params.moduleId as string;
  const lessonId = params.lessonId as string;
  const orgId = searchParams.get('org');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  // TODO: Fetch from API
  const lesson = {
    id: lessonId,
    title: "Types of Discovery Questions",
    type: "video",
    contentType: "video/youtube",
    contentUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    articleContent: `
      <h2>Introduction to Discovery Questions</h2>
      <p>Discovery questions are essential tools in the sales process...</p>
    `,
    duration: "15 min",
    hasQuiz: true,
  };

  const course = {
    id: courseId,
    title: "Sales Training Fundamentals",
  };

  const module = {
    id: moduleId,
    title: "Discovery Questions",
  };

  const navigation = {
    hasPrevious: true,
    hasNext: true,
    previousLesson: { moduleId: '1', lessonId: '3' },
    nextLesson: { moduleId: '2', lessonId: '5' },
  };

  useEffect(() => {
    // TODO: Fetch organization and lesson details from API
    if (orgId) {
      setTimeout(() => {
        setOrganization({
          id: orgId,
          name: "Acme Corporation",
          role: "employee",
        });
        setIsLoading(false);
      }, 500);
    }
  }, [orgId]);

  const handleMarkComplete = () => {
    // TODO: Call API to mark lesson as complete
    setLessonCompleted(true);
  };

  const handleNavigate = (direction: 'previous' | 'next') => {
    const target = direction === 'previous' ? navigation.previousLesson : navigation.nextLesson;
    if (target) {
      router.push(`/employee/courses/${courseId}/modules/${target.moduleId}/lessons/${target.lessonId}?org=${orgId}`);
    }
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex h-screen">
          <AppSidebar />
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col">
              <SiteHeader />
              <main className="flex-1 overflow-y-auto p-8">
                <Skeleton className="h-12 w-96 mb-4" />
                <Skeleton className="h-[600px] w-full" />
              </main>
            </div>
            <div className="w-96 border-l hidden xl:block">
              <Skeleton className="h-full" />
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <AppSidebar />
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <SiteHeader
              organization={organization || undefined}
              breadcrumbs={[
                { label: organization?.name || 'Courses', href: `/employee/dashboard?org=${orgId}` },
                { label: course.title, href: `/employee/courses/${courseId}?org=${orgId}` },
                { label: module.title },
                { label: lesson.title }
              ]}
            />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20">
              <div className="max-w-5xl mx-auto space-y-6">
                {/* Lesson Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {lesson.type === 'video' && <PlayCircle className="h-5 w-5 text-primary" />}
                          {lesson.type === 'article' && <FileText className="h-5 w-5 text-primary" />}
                          <Badge variant="secondary" className="capitalize">{lesson.type}</Badge>
                          <span className="text-sm text-muted-foreground">{lesson.duration}</span>
                        </div>
                        <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                      </div>
                      {lessonCompleted && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>

                {/* Lesson Content */}
                <Card>
                  <CardContent className="p-0">
                    {lesson.type === 'video' && lesson.contentType === 'video/youtube' && (
                      <div className="aspect-video w-full">
                        <iframe
                          className="w-full h-full rounded-lg"
                          src={lesson.contentUrl}
                          title={lesson.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {lesson.type === 'article' && (
                      <div className="p-8 prose prose-slate dark:prose-invert max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: lesson.articleContent }} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={() => handleNavigate('previous')}
                        disabled={!navigation.hasPrevious}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous Lesson
                      </Button>

                      <div className="flex items-center gap-4">
                        {!lessonCompleted && (
                          <Button onClick={handleMarkComplete}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Complete
                          </Button>
                        )}
                        {lesson.hasQuiz && (
                          <Button variant="secondary">
                            Take Quiz
                          </Button>
                        )}
                      </div>

                      <Button
                        onClick={() => handleNavigate('next')}
                        disabled={!navigation.hasNext}
                      >
                        Next Lesson
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Course Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall completion</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        4 of 12 lessons completed
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>

          {/* AI Tutor Panel */}
          <div className="w-96 hidden xl:block">
            <AiTutorPanel />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
