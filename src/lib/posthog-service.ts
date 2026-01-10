import posthog from 'posthog-js';
import { EventType } from '@/models/analyticsEvent';

// Types for event tracking
export interface LessonStartedData {
  userId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  moduleId?: string;
  lessonTitle?: string;
  courseTitle?: string;
}

export interface LessonCompletedData {
  userId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  timeSpent: number; // in minutes
  progressPercentage: number;
  moduleId?: string;
  lessonTitle?: string;
}

export interface LessonAbandonedData {
  userId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  timeSpentBeforeAbandon: number; // in minutes
  moduleId?: string;
  completionPercentage?: number;
}

export interface QuizStartedData {
  userId: string;
  quizId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  moduleId?: string;
}

export interface QuizCompletedData {
  userId: string;
  quizId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  timeSpent?: number; // in minutes
  moduleId?: string;
}

export interface QuizFailedData {
  userId: string;
  quizId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  score: number;
  attemptNumber: number;
  timeSpent?: number;
  moduleId?: string;
}

export interface CourseEnrolledData {
  userId: string;
  courseId: string;
  organizationId: string;
  departmentId?: string;
  courseTitle?: string;
}

export interface CourseCompletedData {
  userId: string;
  courseId: string;
  organizationId: string;
  totalTime: number; // in minutes
  finalProgress: number; // percentage
  courseTitle?: string;
  completionDate?: Date;
}

export interface TimeSpentData {
  userId: string;
  lessonId: string;
  courseId: string;
  organizationId: string;
  timeSpent: number; // in minutes
  sessionId: string;
  moduleId?: string;
}

export interface PageViewData {
  userId: string;
  page: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

/**
 * PostHog Tracking Service
 * Provides functions to track various learning events to PostHog
 */

export const trackLessonStarted = (data: LessonStartedData) => {
  try {
    posthog.capture('lesson_started', {
      distinct_id: data.userId,
      user_id: data.userId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      module_id: data.moduleId,
      lesson_title: data.lessonTitle,
      course_title: data.courseTitle,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking lesson started:', error);
  }
};

export const trackLessonCompleted = (data: LessonCompletedData) => {
  try {
    posthog.capture('lesson_completed', {
      distinct_id: data.userId,
      user_id: data.userId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      time_spent: data.timeSpent,
      progress_percentage: data.progressPercentage,
      module_id: data.moduleId,
      lesson_title: data.lessonTitle,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking lesson completed:', error);
  }
};

export const trackLessonAbandoned = (data: LessonAbandonedData) => {
  try {
    posthog.capture('lesson_abandoned', {
      distinct_id: data.userId,
      user_id: data.userId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      time_spent_before_abandon: data.timeSpentBeforeAbandon,
      module_id: data.moduleId,
      completion_percentage: data.completionPercentage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking lesson abandoned:', error);
  }
};

export const trackQuizStarted = (data: QuizStartedData) => {
  try {
    posthog.capture('quiz_started', {
      distinct_id: data.userId,
      user_id: data.userId,
      quiz_id: data.quizId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      module_id: data.moduleId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking quiz started:', error);
  }
};

export const trackQuizCompleted = (data: QuizCompletedData) => {
  try {
    posthog.capture('quiz_completed', {
      distinct_id: data.userId,
      user_id: data.userId,
      quiz_id: data.quizId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      score: data.score,
      passed: data.passed,
      attempt_number: data.attemptNumber,
      time_spent: data.timeSpent,
      module_id: data.moduleId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking quiz completed:', error);
  }
};

export const trackQuizFailed = (data: QuizFailedData) => {
  try {
    posthog.capture('quiz_failed', {
      distinct_id: data.userId,
      user_id: data.userId,
      quiz_id: data.quizId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      score: data.score,
      attempt_number: data.attemptNumber,
      time_spent: data.timeSpent,
      module_id: data.moduleId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking quiz failed:', error);
  }
};

export const trackCourseEnrolled = (data: CourseEnrolledData) => {
  try {
    posthog.capture('course_enrolled', {
      distinct_id: data.userId,
      user_id: data.userId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      department_id: data.departmentId,
      course_title: data.courseTitle,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking course enrolled:', error);
  }
};

export const trackCourseCompleted = (data: CourseCompletedData) => {
  try {
    posthog.capture('course_completed', {
      distinct_id: data.userId,
      user_id: data.userId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      total_time: data.totalTime,
      final_progress: data.finalProgress,
      course_title: data.courseTitle,
      completion_date: data.completionDate?.toISOString() || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking course completed:', error);
  }
};

export const trackTimeSpent = (data: TimeSpentData) => {
  try {
    posthog.capture('time_spent_updated', {
      distinct_id: data.userId,
      user_id: data.userId,
      lesson_id: data.lessonId,
      course_id: data.courseId,
      organization_id: data.organizationId,
      time_spent: data.timeSpent,
      session_id: data.sessionId,
      module_id: data.moduleId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking time spent:', error);
  }
};

export const trackPageView = (data: PageViewData) => {
  try {
    posthog.capture('$pageview', {
      distinct_id: data.userId,
      user_id: data.userId,
      $current_url: data.page,
      organization_id: data.organizationId,
      ...data.metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * Identify user in PostHog
 * Should be called when user logs in or when user data is available
 */
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};

/**
 * Reset PostHog session
 * Should be called when user logs out
 */
export const resetPostHog = () => {
  try {
    posthog.reset();
  } catch (error) {
    console.error('Error resetting PostHog:', error);
  }
};
