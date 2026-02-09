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
  Award,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { useAnalytics } from "@/hooks/use-analytics";
import { v4 as uuidv4 } from 'uuid';

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  contentType: 'video' | 'article' | 'video-article' | 'assessment';
  content: {
    videoUrl?: string;
    articleHtml?: string;
    transcript?: any[];
  };
  duration: number; // Duration in minutes
  order: number;
  hasQuiz: boolean;
  quizData?: {
    questions: QuizQuestion[];
  };
  isModuleAssessment?: boolean;
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
  const { trackEvent } = useAnalytics();

  // Generate session ID for this lesson session
  const sessionIdRef = useRef(uuidv4());

  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Quiz state
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

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
    if ((lesson?.contentType === 'article' || lesson?.contentType === 'video-article') && articleRef.current) {
      const element = articleRef.current;

      // Check if content is scrollable
      const isScrollable = element.scrollHeight > element.clientHeight;

      if (!isScrollable) {
        // Content fits without scrolling - auto-complete
        setScrollDepth(100);
        return;
      }

      const handleScroll = () => {
        if (!element) return;

        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const depth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;
        setScrollDepth(Math.max(scrollDepth, depth));
      };

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

  // Track time_spent updates every 30 seconds
  useEffect(() => {
    if (!lesson || !userId || !currentOrganization) return;

    const timeTrackingInterval = setInterval(() => {
      const currentTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      trackEvent({
        organizationId: currentOrganization.id,
        userId,
        eventType: 'time_spent_updated',
        eventName: 'Time Spent Updated',
        properties: {
          courseId,
          lessonId: lesson._id,
          lessonTitle: lesson.title,
          timeSpent: currentTimeSpent,
          contentType: lesson.contentType,
        },
        sessionId: sessionIdRef.current,
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(timeTrackingInterval);
  }, [lesson, userId, currentOrganization]);

  // Track lesson_abandoned on page unload
  useEffect(() => {
    if (!lesson || !userId || !currentOrganization) return;

    const handleBeforeUnload = () => {
      const currentTimeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Only track if lesson was not completed
      if (!isCompleted) {
        trackEvent({
          organizationId: currentOrganization.id,
          userId,
          eventType: 'lesson_abandoned',
          eventName: 'Lesson Abandoned',
          properties: {
            courseId,
            lessonId: lesson._id,
            lessonTitle: lesson.title,
            timeSpent: currentTimeSpent,
            contentType: lesson.contentType,
            scrollDepth,
            watchProgress: videoDuration > 0 ? Math.round((watchTime / videoDuration) * 100) : 0,
          },
          sessionId: sessionIdRef.current,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lesson, userId, currentOrganization, isCompleted, scrollDepth, watchTime, videoDuration]);

  // Check completion criteria
  useEffect(() => {
    if (lesson && !isCompleted) {
      let shouldComplete = false;

      if (lesson.contentType === 'video' && videoDuration > 0) {
        // Complete when 5% watched (relaxed significantly - fake timer can't track actual playback)
        const progress = watchTime / videoDuration;
        if (progress >= 0.05) {
          shouldComplete = true;
        }
      } else if (lesson.contentType === 'article' || lesson.contentType === 'video-article') {
        // For articles or video-article lessons, just check article scroll
        // Complete when 60% scrolled (relaxed from 80%, or 100% if no scrolling needed)
        if (scrollDepth >= 60) {
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

      // Track lesson started event
      if (currentOrganization && userId) {
        trackEvent({
          organizationId: currentOrganization.id,
          userId,
          eventType: 'lesson_started',
          eventName: 'Lesson Started',
          properties: {
            courseId,
            lessonId: foundLesson._id,
            lessonTitle: foundLesson.title,
            courseTitle: courseData.course.title,
            contentType: foundLesson.contentType,
            duration: foundLesson.duration,
          },
          sessionId: sessionIdRef.current,
        });
      }

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

      // Fetch quiz attempts if lesson has quiz
      if (foundLesson.hasQuiz) {
        try {
          const quizResponse = await fetch(
            `/api/quiz-attempts?userId=${userId}&lessonId=${lessonId}`
          );
          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            setQuizAttempts(quizData.attempts || []);
          }
        } catch (error) {
          console.error('Error fetching quiz attempts:', error);
        }
      }

      // For video lessons, extract duration from YouTube
      if (foundLesson.hasQuiz) {
        // Automatically fetch quiz attempts when the lesson is loaded
        try {
          const quizResponse = await fetch(
            `/api/quiz-attempts?userId=${userId}&lessonId=${lessonId}`
          );
          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            setQuizAttempts(quizData.attempts || []);
          }
        } catch (error) {
          console.error('Error fetching quiz attempts:', error);
        }
      }

      // For video lessons, extract duration from YouTube
      if (foundLesson.contentType === 'video' && foundLesson.content.videoUrl) {
        // We'll set a default duration or extract from YouTube API
        // For now, use estimated duration as approximation
        setVideoDuration(foundLesson.duration * 60);
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
      if (isCompleted || !currentOrganization || !userId || !lesson || !course) return;
  
      setIsCompleted(true);
      await saveProgress(true);
      
      // Track lesson completed event
      trackEvent({
        organizationId: currentOrganization.id,
        userId,
        eventType: 'lesson_completed',
        eventName: 'Lesson Completed',
        properties: {
          courseId,
          lessonId: lesson._id,
          lessonTitle: lesson.title,
          courseTitle: course.title,
          timeSpent: Math.round(timeSpent / 60), // Convert seconds to minutes
          progressPercentage: 100,
          contentType: lesson.contentType,
        },
        sessionId: sessionIdRef.current,
      });
      // Note: Toast removed per user request - completion shown via UI badge instead
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

  // Auto-start quiz for module assessments
  useEffect(() => {
    if (lesson?.contentType === 'assessment' && lesson.hasQuiz && lesson.quizData?.questions.length) {
      // Auto-start quiz for assessments (no content to view first)
      // Only auto-start if not already showing results from a previous attempt
      if (!isQuizActive && !showResults && quizAttempts.length === 0) {
        handleStartQuiz();
      }
    }
  }, [lesson, quizAttempts]);

  const handleStartQuiz = () => {
    if (!currentOrganization || !userId || !lesson) return;
    
    setIsQuizActive(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setQuizScore(0);
    
    // Track quiz started event
    trackEvent({
      organizationId: currentOrganization.id,
      userId,
      eventType: lesson.contentType === 'assessment' ? 'assessment_started' : 'quiz_started',
      eventName: lesson.contentType === 'assessment' ? 'Assessment Started' : 'Quiz Started',
      properties: {
        courseId,
        lessonId: lesson._id,
        lessonTitle: lesson.title,
        quizId: `quiz_${lesson._id}`,
        totalQuestions: lesson.quizData?.questions.length || 0,
        isModuleAssessment: lesson.isModuleAssessment || false,
      },
      sessionId: sessionIdRef.current,
    });
  };

  const handleSelectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (lesson?.quizData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!lesson?.quizData || !userId) return;

    setSubmittingQuiz(true);

    try {
      // Calculate score
      let correctCount = 0;
      const answers = lesson.quizData.questions.map((question, index) => {
        const isCorrect = selectedAnswers[index] === question.correctAnswerIndex;
        if (isCorrect) correctCount++;
        return {
          questionIndex: index,
          selectedAnswerIndex: selectedAnswers[index],
          isCorrect,
        };
      });

      const score = Math.round((correctCount / lesson.quizData.questions.length) * 100);
      setQuizScore(score);

      // Submit quiz attempt
      const isAssessment = lesson.contentType === 'assessment';
      const response = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          lessonId: lesson._id,
          courseId,
          organizationId: currentOrganization?.id,
          attemptNumber: quizAttempts.length + 1,
          answers,
          score,
          passed: score >= 70, // 70% passing grade
          timeSpent: Math.floor(timeSpent),
          isModuleAssessment: lesson.isModuleAssessment || false,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit quiz');

      const data = await response.json();
      setQuizAttempts([...quizAttempts, data.attempt]);
      setShowResults(true);
      setIsQuizActive(false);

      // Track quiz/assessment completion/failure event
      const passed = score >= 70;
      const eventTypeBase = isAssessment ? 'assessment' : 'quiz';
      trackEvent({
        organizationId: currentOrganization?.id || '',
        userId,
        eventType: passed ? `${eventTypeBase}_completed` : `${eventTypeBase}_failed`,
        eventName: passed 
          ? (isAssessment ? 'Assessment Completed' : 'Quiz Completed')
          : (isAssessment ? 'Assessment Failed' : 'Quiz Failed'),
        properties: {
          courseId,
          lessonId: lesson._id,
          lessonTitle: lesson.title,
          quizId: `quiz_${lesson._id}`,
          score,
          totalQuestions: lesson.quizData.questions.length,
          correctAnswers: correctCount,
          attemptNumber: quizAttempts.length + 1,
          timeSpent: Math.floor(timeSpent),
          passed,
          isModuleAssessment: lesson.isModuleAssessment || false,
        },
        sessionId: sessionIdRef.current,
      });

      toast.success(score >= 70 
        ? (isAssessment ? 'Assessment passed!' : 'Quiz passed!')
        : (isAssessment ? 'Assessment submitted' : 'Quiz submitted')
      );
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
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
    <>
      {/* Sticky Breadcrumb Navigation */}
      <BreadcrumbNav
        items={[
          { label: 'My Courses', href: '/employee/courses' },
          { label: course?.title || 'Course', href: `/employee/courses/${courseId}` },
          { label: lesson.title },
        ]}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Lesson Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {lesson.contentType === 'assessment' ? (
                    <Award className="h-5 w-5 text-purple-500" />
                  ) : lesson.contentType === 'video-article' ? (
                    <>
                      <VideoIcon className="h-5 w-5 text-muted-foreground" />
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </>
                  ) : lesson.contentType === 'video' ? (
                    <VideoIcon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                  {lesson.contentType === 'assessment' ? (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      Module Assessment
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {lesson.contentType.replace('-', ' + ')}
                    </Badge>
                  )}
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
                  {lesson.duration} min
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Lesson Content */}
        {/* Video Content */}
        {(lesson.contentType === 'video' || lesson.contentType === 'video-article') && lesson.content.videoUrl && (
          <Card>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        )}

        {/* Article Content */}
        {(lesson.contentType === 'article' || lesson.contentType === 'video-article') && lesson.content.articleHtml && (
          <Card>
            <CardContent className="p-0">
              <div
                ref={articleRef}
                className="prose max-w-none p-6 md:p-8 lg:p-12 overflow-y-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: lesson.content.articleHtml }}
              />
            </CardContent>
          </Card>
        )}

        {/* No Content Fallback - Don't show for assessments as they only have quiz */}
        {!lesson.content.videoUrl && !lesson.content.articleHtml && lesson.contentType !== 'assessment' && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No content available for this lesson
            </CardContent>
          </Card>
        )}

        {/* Progress Indicator - Hide for assessments since they're completed by passing quiz */}
        {!isCompleted && lesson.contentType !== 'assessment' && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Progress</span>
                  {lesson.contentType === 'video' ? (
                    <span className="text-muted-foreground">
                      {videoDuration > 0 ? Math.round((watchTime / videoDuration) * 100) : 0}% watched (5% to complete)
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {scrollDepth}% read
                    </span>
                  )}
                </div>
                <Progress
                  value={
                    lesson.contentType === 'video'
                      ? (videoDuration > 0 ? (watchTime / videoDuration) * 100 : 0)
                      : scrollDepth
                  }
                  className="h-2"
                />
                {(lesson.contentType === 'article' || lesson.contentType === 'video-article') && (
                  <p className="text-xs text-muted-foreground">
                    {scrollDepth >= 60 ? 'Ready to complete!' : 'Read to 60% to complete'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Section */}
        {lesson.hasQuiz && lesson.quizData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className={`h-5 w-5 ${lesson.contentType === 'assessment' ? 'text-purple-500' : 'text-primary'}`} />
                  <CardTitle>
                    {lesson.contentType === 'assessment' ? 'Module Assessment' : 'Knowledge Check Quiz'}
                  </CardTitle>
                </div>
                {quizAttempts.length > 0 && (
                  <Badge variant={quizAttempts[0].passed ? 'default' : 'secondary'}>
                    {quizAttempts.length} attempt{quizAttempts.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {quizAttempts.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Best score: {Math.max(...quizAttempts.map((a: any) => a.score))}%
                  {quizAttempts[0].passed ? ' - Passed ✓' : ' - Not passed yet'}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {!isQuizActive && !showResults ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {lesson.contentType === 'assessment' 
                      ? `Complete this assessment with ${lesson.quizData.questions.length} questions. You need 70% or higher to pass.`
                      : `Test your understanding with ${lesson.quizData.questions.length} multiple-choice questions. You need 70% or higher to pass.`
                    }
                  </p>
                  <Button onClick={handleStartQuiz} size="lg" className="w-full sm:w-auto">
                    <Award className="h-4 w-4 mr-2" />
                    {quizAttempts.length > 0 ? (lesson.contentType === 'assessment' ? 'Retake Assessment' : 'Retake Quiz') : (lesson.contentType === 'assessment' ? 'Start Assessment' : 'Start Quiz')}
                  </Button>
                </div>
              ) : isQuizActive ? (
                <div className="space-y-6">
                  {/* Quiz Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Question {currentQuestionIndex + 1} of {lesson.quizData.questions.length}
                      </span>
                      <span className="text-muted-foreground">
                        {selectedAnswers.filter((a) => a !== undefined).length} answered
                      </span>
                    </div>
                    <Progress
                      value={((currentQuestionIndex + 1) / lesson.quizData.questions.length) * 100}
                      className="h-2"
                    />
                  </div>

                  {/* Current Question */}
                  {lesson.quizData.questions[currentQuestionIndex] && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        {lesson.quizData.questions[currentQuestionIndex].questionText}
                      </h3>

                      {/* Answer Options */}
                      <div className="space-y-3">
                        {lesson.quizData.questions[currentQuestionIndex].options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleSelectAnswer(index)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              selectedAnswers[currentQuestionIndex] === index
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                                  selectedAnswers[currentQuestionIndex] === index
                                    ? 'border-primary bg-primary'
                                    : 'border-muted-foreground'
                                }`}
                              >
                                {selectedAnswers[currentQuestionIndex] === index && (
                                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {String.fromCharCode(65 + index)}
                                  </span>
                                </div>
                                <p className="text-sm">{option}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Navigation Buttons */}
                      <div className="flex items-center justify-between gap-4 pt-4">
                        <Button
                          variant="outline"
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestionIndex === 0}
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Previous
                        </Button>

                        {currentQuestionIndex === lesson.quizData.questions.length - 1 ? (
                          <Button
                            onClick={handleSubmitQuiz}
                            disabled={
                              selectedAnswers.length !== lesson.quizData.questions.length ||
                              selectedAnswers.some((a) => a === undefined) ||
                              submittingQuiz
                            }
                            size="lg"
                          >
                            {submittingQuiz ? (
                              'Submitting...'
                            ) : (
                              <>
                                Submit Quiz
                                <CheckCircle className="h-4 w-4 ml-2" />
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button onClick={handleNextQuestion}>
                            Next
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : showResults ? (
                <div className="space-y-6">
                  {/* Results Header */}
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                        quizScore >= 70 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {quizScore >= 70 ? (
                        <CheckCircle2 className="h-8 w-8" />
                      ) : (
                        <AlertCircle className="h-8 w-8" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">
                      {quizScore >= 70 ? 'Congratulations!' : 'Keep Learning!'}
                    </h3>
                    <p className="text-lg font-semibold mb-1">Your Score: {quizScore}%</p>
                    <p className="text-sm text-muted-foreground">
                      {quizScore >= 70
                        ? 'You passed the quiz!'
                        : 'You need 70% to pass. Review the explanations and try again.'}
                    </p>
                  </div>

                  {/* Question Review */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Review Your Answers</h4>
                    {lesson.quizData.questions.map((question, qIndex) => {
                      const userAnswer = selectedAnswers[qIndex];
                      const isCorrect = userAnswer === question.correctAnswerIndex;

                      return (
                        <Card key={qIndex} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Question */}
                              <div className="flex items-start gap-2">
                                {isCorrect ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium">
                                    {qIndex + 1}. {question.questionText}
                                  </p>
                                </div>
                              </div>

                              {/* Options */}
                              <div className="pl-7 space-y-2">
                                {question.options.map((option, oIndex) => (
                                  <div
                                    key={oIndex}
                                    className={`p-2 rounded text-sm ${
                                      oIndex === question.correctAnswerIndex
                                        ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-100'
                                        : oIndex === userAnswer && !isCorrect
                                        ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-100'
                                        : 'bg-muted/30'
                                    }`}
                                  >
                                    <span className="font-medium mr-2">
                                      {String.fromCharCode(65 + oIndex)}.
                                    </span>
                                    {option}
                                    {oIndex === question.correctAnswerIndex && (
                                      <span className="ml-2 text-xs font-semibold">(Correct)</span>
                                    )}
                                    {oIndex === userAnswer && !isCorrect && (
                                      <span className="ml-2 text-xs font-semibold">(Your answer)</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Explanation */}
                              <div className="pl-7 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
                                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Explanation:</p>
                                <p className="text-blue-800 dark:text-blue-200">{question.explanation}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Retake Button */}
                  <div className="flex justify-center">
                    <Button onClick={handleStartQuiz} variant="outline" size="lg">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake Quiz
                    </Button>
                  </div>
                </div>
              ) : null}
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
    </>
  );
}
