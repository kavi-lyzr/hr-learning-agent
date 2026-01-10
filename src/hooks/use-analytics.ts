'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  trackLessonStarted,
  trackLessonCompleted,
  trackLessonAbandoned,
  trackQuizStarted,
  trackQuizCompleted,
  trackQuizFailed,
  trackCourseEnrolled,
  trackCourseCompleted,
  trackTimeSpent,
  trackPageView,
} from '@/lib/posthog-service';
import { storeAnalyticsEvent } from '@/lib/analytics-storage';
import type { EventType } from '@/models/analyticsEvent';

interface TrackEventParams {
  organizationId: string;
  userId: string;
  eventType: EventType;
  eventName: string;
  properties?: Record<string, any>;
  sessionId?: string;
  skipPostHog?: boolean;
  skipMongoDB?: boolean;
}

export function useAnalytics() {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const trackEvent = useCallback(async (params: TrackEventParams) => {
    setIsTracking(true);
    setError(null);

    try {
      // Track to PostHog (client-side)
      if (!params.skipPostHog) {
        switch (params.eventType) {
          case 'lesson_started':
            trackLessonStarted({
              userId: params.userId,
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              moduleId: params.properties?.moduleId,
              lessonTitle: params.properties?.lessonTitle,
              courseTitle: params.properties?.courseTitle,
            });
            break;
          case 'lesson_completed':
            trackLessonCompleted({
              userId: params.userId,
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              timeSpent: params.properties?.timeSpent || 0,
              progressPercentage: params.properties?.progressPercentage || 0,
              moduleId: params.properties?.moduleId,
              lessonTitle: params.properties?.lessonTitle,
            });
            break;
          case 'lesson_abandoned':
            trackLessonAbandoned({
              userId: params.userId,
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              timeSpentBeforeAbandon: params.properties?.timeSpentBeforeAbandon || 0,
              moduleId: params.properties?.moduleId,
            });
            break;
          case 'quiz_started':
            trackQuizStarted({
              userId: params.userId,
              quizId: params.properties?.quizId || '',
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              moduleId: params.properties?.moduleId,
            });
            break;
          case 'quiz_completed':
            trackQuizCompleted({
              userId: params.userId,
              quizId: params.properties?.quizId || '',
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              score: params.properties?.score || 0,
              passed: params.properties?.passed || false,
              attemptNumber: params.properties?.attemptNumber || 1,
              timeSpent: params.properties?.timeSpent,
              moduleId: params.properties?.moduleId,
            });
            break;
          case 'quiz_failed':
            trackQuizFailed({
              userId: params.userId,
              quizId: params.properties?.quizId || '',
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              score: params.properties?.score || 0,
              attemptNumber: params.properties?.attemptNumber || 1,
              timeSpent: params.properties?.timeSpent,
              moduleId: params.properties?.moduleId,
            });
            break;
          case 'course_enrolled':
            trackCourseEnrolled({
              userId: params.userId,
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              departmentId: params.properties?.departmentId,
              courseTitle: params.properties?.courseTitle,
            });
            break;
          case 'course_completed':
            trackCourseCompleted({
              userId: params.userId,
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              totalTime: params.properties?.totalTime || 0,
              finalProgress: params.properties?.finalProgress || 100,
              courseTitle: params.properties?.courseTitle,
            });
            break;
          case 'time_spent_updated':
            trackTimeSpent({
              userId: params.userId,
              lessonId: params.properties?.lessonId || '',
              courseId: params.properties?.courseId || '',
              organizationId: params.organizationId,
              timeSpent: params.properties?.timeSpent || 0,
              sessionId: params.sessionId || '',
              moduleId: params.properties?.moduleId,
            });
            break;
        }
      }

      // Store to MongoDB (via API)
      if (!params.skipMongoDB) {
        await fetch('/api/analytics/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: params.organizationId,
            userId: params.userId,
            eventType: params.eventType,
            eventName: params.eventName,
            properties: params.properties || {},
            sessionId: params.sessionId,
          }),
        });
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to track event');
      setError(error);
      console.error('Error tracking event:', error);
      return false;
    } finally {
      setIsTracking(false);
    }
  }, []);

  return {
    trackEvent,
    isTracking,
    error,
  };
}
