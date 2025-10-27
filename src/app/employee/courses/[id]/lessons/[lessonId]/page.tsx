"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Video as VideoIcon,
  FileText,
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
  estimatedDuration: number;
}

interface Module {
  _id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  title: string;
  modules: Module[];
}

interface LessonProgress {
  _id?: string;
  status: string;
  watchTime?: number;
  scrollDepth?: number;
  timeSpent?: number;
}

export default function LessonViewerPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Video tracking
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [watchTime, setWatchTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Article tracking
  const articleRef = useRef<HTMLDivElement>(null);
  const [scrollDepth, setScrollDepth] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentOrganization && userId && courseId && lessonId) {
      fetchLessonData();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentOrganization, userId, courseId, lessonId]);

  // Track scroll depth for articles
  useEffect(() => {
    if (lesson?.contentType === 'article' && articleRef.current) {
      const handleScroll = () => {
        const element = articleRef.current;
        if (!element) return;

        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const depth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
        setScrollDepth(Math.max(scrollDepth, depth));
      };

      const element = articleRef.current;
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [lesson, scrollDepth]);

  // Track time spent
  useEffect(() => {
    if (lesson) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeSpent(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lesson]);

  // Auto-save progress
  useEffect(() => {
    if (lesson && userId && !isCompleted) {
      progressIntervalRef.current = setInterval(() => {
        saveProgress(false);
      }, 10000); // Save every 10 seconds

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [lesson, userId, watchTime, scrollDepth, timeSpent, isCompleted]);

  // Check completion criteria
  useEffect(() => {
    if (lesson && !isCompleted) {
      let shouldComplete = false;

      if (lesson.contentType === 'video' && videoDuration > 0) {
        // Complete when 90% watched
        const progress = watchTime / videoDuration;
        if (progress >= 0.9) {
          shouldComplete = true;
        }
      } else if (lesson.contentType === 'article') {
        // Complete when 80% scrolled AND 50% of estimated time spent
        const estimatedSeconds = lesson.estimatedDuration * 60;
        if (scrollDepth >= 80 && timeSpent >= estimatedSeconds * 0.5) {
          shouldComplete = true;
        }
      }

      if (shouldComplete) {
        markAsComplete();
      }
    }
  }, [lesson, watchTime, videoDuration, scrollDepth, timeSpent, isCompleted]);

  const fetchLessonData = async () => {
    if (!currentOrganization || !userId || !courseId || !lessonId) return;

    try {
      setLoading(true);

      // Fetch course to get lesson details
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      const courseData = await courseResponse.json();
      setCourse(courseData.course);

      // Find the specific lesson
      let foundLesson: Lesson | null = null;
      for (const module of courseData.course.modules) {
        const lessonInModule = module.lessons.find((l: Lesson) => l._id === lessonId);
        if (lessonInModule) {
          foundLesson = lessonInModule;
          break;
        }
      }

      if (!foundLesson) {
        throw new Error('Lesson not found');
      }

      setLesson(foundLesson);

      // Fetch lesson progress
      try {
        const progressResponse = await fetch(
          `/api/lesson-progress?userId=${userId}&lessonId=${lessonId}`
        );
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          if (progressData.progress && progressData.progress.length > 0) {
            const progress = progressData.progress[0];
            setLessonProgress(progress);
            setWatchTime(progress.watchTime || 0);
            setScrollDepth(progress.scrollDepth || 0);
            setTimeSpent(progress.timeSpent || 0);
            setIsCompleted(progress.status === 'completed');
          }
        }
      } catch (error) {
        console.error('Error fetching lesson progress:', error);
      }

      // For video lessons, extract duration from YouTube
      if (foundLesson.contentType === 'video' && foundLesson.content.videoUrl) {
        // We'll set a default duration or extract from YouTube API
        // For now, use estimated duration as approximation
        setVideoDuration(foundLesson.estimatedDuration * 60);
      }
    } catch (error: any) {
      console.error('Error fetching lesson:', error);
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (isComplete: boolean = false) => {
    if (!userId || !lesson || !courseId) return;

    try {
      await fetch('/api/lesson-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId: lesson._id,
          courseId,
          watchTime: lesson.contentType === 'video' ? watchTime : undefined,
          scrollDepth: lesson.contentType === 'article' ? scrollDepth : undefined,
          timeSpent,
          status: isComplete ? 'completed' : 'in-progress',
        }),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const markAsComplete = async () => {
    if (isCompleted) return;

    setIsCompleted(true);
    await saveProgress(true);
    toast.success('Lesson completed!');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    // Convert various YouTube URL formats to embed format
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1` : url;
  };

  const findNavigationLessons = () => {
    if (!course || !lesson) return { prev: null, next: null };

    const allLessons: Array<{ moduleId: string; lesson: Lesson }> = [];
    course.modules
      .sort((a, b) => a.order - b.order)
      .forEach((module) => {
        module.lessons
          .sort((a, b) => a.order - b.order)
          .forEach((l) => {
            allLessons.push({ moduleId: module._id, lesson: l });
          });
      });

    const currentIndex = allLessons.findIndex((item) => item.lesson._id === lesson._id);
    return {
      prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
      next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
    };
  };

  const navigation = findNavigationLessons();

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!lesson || !course) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-5xl mx-auto">
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Lesson not found</h3>
                <Button onClick={() => router.push(`/employee/courses/${courseId}`)}>
                  Back to Course
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
          onClick={() => router.push(`/employee/courses/${courseId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Button>

        {/* Lesson Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {lesson.contentType === 'video' ? (
                    <VideoIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className="capitalize">
                    {lesson.contentType}
                  </Badge>
                  {isCompleted && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                {lesson.description && (
                  <p className="text-muted-foreground mt-2">{lesson.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {lesson.estimatedDuration} min
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lesson Content */}
        <Card>
          <CardContent className="p-0">
            {lesson.contentType === 'video' && lesson.content.videoUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  ref={videoRef}
                  src={getYouTubeEmbedUrl(lesson.content.videoUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => {
                    // Start tracking watch time
                    const interval = setInterval(() => {
                      setWatchTime((prev) => prev + 1);
                    }, 1000);
                    return () => clearInterval(interval);
                  }}
                />
              </div>
            ) : lesson.contentType === 'article' && lesson.content.articleHtml ? (
              <div
                ref={articleRef}
                className="prose prose-sm md:prose-base lg:prose-lg max-w-none p-6 md:p-8 lg:p-12 overflow-y-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: lesson.content.articleHtml }}
              />
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No content available for this lesson
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        {!isCompleted && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  {lesson.contentType === 'video' ? (
                    <span className="text-muted-foreground">
                      {Math.round((watchTime / videoDuration) * 100)}% watched (90% to complete)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {scrollDepth}% scrolled, {Math.floor(timeSpent / 60)}m spent
                    </span>
                  )}
                </div>
                <Progress
                  value={
                    lesson.contentType === 'video'
                      ? (watchTime / videoDuration) * 100
                      : scrollDepth
                  }
                  className="h-2"
                />
                {lesson.contentType === 'article' && (
                  <p className="text-xs text-muted-foreground">
                    Scroll to 80% and spend at least {Math.floor(lesson.estimatedDuration / 2)} minutes to complete
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          {navigation.prev ? (
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/employee/courses/${courseId}/lessons/${navigation.prev?.lesson._id}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous Lesson
            </Button>
          ) : (
            <div />
          )}

          {navigation.next && (
            <Button
              onClick={() =>
                router.push(`/employee/courses/${courseId}/lessons/${navigation.next?.lesson._id}`)
              }
            >
              Next Lesson
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
