"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  BookOpen,
  Clock,
  PlayCircle,
  CheckCircle,
  Circle,
  FileText,
  HelpCircle,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'employee';
}

export default function EmployeeCourseViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const orgId = searchParams.get('org');

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Fetch from API
  const course = {
    id: courseId,
    title: "Sales Training Fundamentals",
    description: "Master the fundamentals of modern sales techniques and methodologies",
    category: "Sales",
    progress: 45,
    estimatedTime: "8 hours",
    instructor: "John Doe",
  };

  const modules = [
    {
      id: '1',
      title: "Introduction to Sales",
      lessons: [
        { id: '1', title: "What is Sales?", type: "video", duration: "10 min", completed: true },
        { id: '2', title: "Sales Process Overview", type: "article", duration: "5 min", completed: true },
        { id: '3', title: "Quiz: Sales Basics", type: "quiz", duration: "10 min", completed: false },
      ]
    },
    {
      id: '2',
      title: "Discovery Questions",
      lessons: [
        { id: '4', title: "Types of Questions", type: "video", duration: "15 min", completed: true },
        { id: '5', title: "Asking Effective Questions", type: "video", duration: "12 min", completed: false },
        { id: '6', title: "Practice Exercise", type: "article", duration: "8 min", completed: false },
      ]
    },
    {
      id: '3',
      title: "Objection Handling",
      lessons: [
        { id: '7', title: "Common Objections", type: "video", duration: "20 min", completed: false },
        { id: '8', title: "Handling Price Objections", type: "article", duration: "10 min", completed: false },
        { id: '9', title: "Role Play Scenarios", type: "video", duration: "15 min", completed: false },
        { id: '10', title: "Quiz: Objection Handling", type: "quiz", duration: "15 min", completed: false },
      ]
    },
  ];

  const totalLessons = modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
  const completedLessons = modules.reduce((acc, mod) =>
    acc + mod.lessons.filter(l => l.completed).length, 0
  );

  useEffect(() => {
    // TODO: Fetch organization and course details from API
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

  const getLessonIcon = (type: string, completed: boolean) => {
    if (completed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    switch (type) {
      case 'video':
        return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
      case 'article':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleLessonClick = (lessonId: string, moduleId: string) => {
    router.push(`/employee/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}?org=${orgId}`);
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-8">
        <Skeleton className="h-12 w-96 mb-4" />
        <Skeleton className="h-24 w-full mb-8" />
        <Skeleton className="h-96 w-full" />
      </main>
         
    );
  }

  return (
   
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Course Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <Badge variant="secondary">{course.category}</Badge>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {course.estimatedTime}
              </div>
            </div>
            <CardTitle className="text-3xl">{course.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {course.description}
            </CardDescription>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedLessons} of {totalLessons} lessons completed
                </span>
                <span className="font-medium">{course.progress}%</span>
              </div>
              <Progress value={course.progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>

        {/* Course Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {modules.map((module, moduleIndex) => {
                const moduleCompleted = module.lessons.filter(l => l.completed).length;
                const moduleTotal = module.lessons.length;

                return (
                  <AccordionItem key={module.id} value={module.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {moduleIndex + 1}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">{module.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {moduleCompleted}/{moduleTotal} lessons
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-11 pr-4 pt-2">
                        {module.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => handleLessonClick(lesson.id, module.id)}
                          >
                            <div className="flex items-center gap-3">
                              {getLessonIcon(lesson.type, lesson.completed)}
                              <div>
                                <div className="text-sm font-medium">{lesson.title}</div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {lesson.type} • {lesson.duration}
                                </div>
                              </div>
                            </div>
                            {lesson.completed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Completed
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </main>
    // ai panel should be here?? or layout?
  );
}
