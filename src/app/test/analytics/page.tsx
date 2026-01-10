'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  trackLessonStarted,
  trackLessonCompleted,
  trackQuizStarted,
  trackQuizCompleted,
  trackCourseEnrolled,
  identifyUser,
} from '@/lib/posthog-service';

export default function AnalyticsTestPage() {
  const [userId, setUserId] = useState('user-test-123');
  const [organizationId, setOrganizationId] = useState('org-test-456');
  const [courseId, setCourseId] = useState('course-test-789');
  const [lessonId, setLessonId] = useState('lesson-test-001');
  const [eventType, setEventType] = useState('lesson_started');
  const [isLoading, setIsLoading] = useState(false);
  const [dbEvents, setDbEvents] = useState<any[]>([]);

  const handleIdentifyUser = () => {
    identifyUser(userId, {
      email: 'test@example.com',
      name: 'Test User',
      organization_id: organizationId,
    });
    toast.success('User identified in PostHog');
  };

  const handleTrackEvent = async () => {
    setIsLoading(true);
    try {
      // Track to PostHog
      switch (eventType) {
        case 'lesson_started':
          trackLessonStarted({
            userId,
            lessonId,
            courseId,
            organizationId,
            lessonTitle: 'Test Lesson',
            courseTitle: 'Test Course',
          });
          break;
        case 'lesson_completed':
          trackLessonCompleted({
            userId,
            lessonId,
            courseId,
            organizationId,
            timeSpent: 15,
            progressPercentage: 100,
            lessonTitle: 'Test Lesson',
          });
          break;
        case 'quiz_started':
          trackQuizStarted({
            userId,
            quizId: 'quiz-test-001',
            lessonId,
            courseId,
            organizationId,
          });
          break;
        case 'quiz_completed':
          trackQuizCompleted({
            userId,
            quizId: 'quiz-test-001',
            lessonId,
            courseId,
            organizationId,
            score: 85,
            passed: true,
            attemptNumber: 1,
            timeSpent: 10,
          });
          break;
        case 'course_enrolled':
          trackCourseEnrolled({
            userId,
            courseId,
            organizationId,
            courseTitle: 'Test Course',
          });
          break;
      }

      toast.success('Event tracked in PostHog');

      // Store to MongoDB via API
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          userId,
          eventType,
          eventName: eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          properties: {
            courseId,
            lessonId,
            testEvent: true,
          },
          sessionId: 'test-session-' + Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Event stored in MongoDB');
        console.log('Stored event:', data);
      } else {
        toast.error('Failed to store event in MongoDB');
      }
    } catch (error) {
      console.error('Error tracking event:', error);
      toast.error('Error tracking event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchEvents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId,
        limit: '10',
      });

      const response = await fetch(`/api/analytics/events?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setDbEvents(data.events);
        toast.success(`Fetched ${data.total} events from MongoDB`);
      } else {
        toast.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error fetching events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Testing Dashboard</h1>
        <p className="text-muted-foreground">
          Test PostHog event tracking and MongoDB storage
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Identify User</CardTitle>
            <CardDescription>
              First, identify the user in PostHog
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-test-123"
              />
            </div>
            <Button onClick={handleIdentifyUser} className="w-full">
              Identify User
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Track Event</CardTitle>
            <CardDescription>
              Send event to PostHog and store in MongoDB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="organizationId">Organization ID</Label>
              <Input
                id="organizationId"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="org-test-456"
              />
            </div>
            <div>
              <Label htmlFor="courseId">Course ID</Label>
              <Input
                id="courseId"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="course-test-789"
              />
            </div>
            <div>
              <Label htmlFor="lessonId">Lesson ID</Label>
              <Input
                id="lessonId"
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                placeholder="lesson-test-001"
              />
            </div>
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson_started">Lesson Started</SelectItem>
                  <SelectItem value="lesson_completed">Lesson Completed</SelectItem>
                  <SelectItem value="quiz_started">Quiz Started</SelectItem>
                  <SelectItem value="quiz_completed">Quiz Completed</SelectItem>
                  <SelectItem value="course_enrolled">Course Enrolled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleTrackEvent} disabled={isLoading} className="w-full">
              {isLoading ? 'Tracking...' : 'Track Event'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>3. Verify Events</CardTitle>
          <CardDescription>
            Fetch events from MongoDB to verify they were stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleFetchEvents} disabled={isLoading} className="w-full">
            {isLoading ? 'Fetching...' : 'Fetch Events from MongoDB'}
          </Button>

          {dbEvents.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Stored Events ({dbEvents.length})</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {dbEvents.map((event: any) => (
                  <div
                    key={event.eventId}
                    className="p-3 border rounded-lg text-sm space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{event.eventType}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Event ID: {event.eventId}
                    </div>
                    <div className="text-xs">
                      Properties: {JSON.stringify(event.properties)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Check PostHog</CardTitle>
          <CardDescription>
            Verify events in your PostHog dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Go to your PostHog dashboard and check:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
            <li>Events &gt; Live Events to see events in real-time</li>
            <li>Persons &gt; Search for your test user ID: <code className="bg-muted px-1 rounded">{userId}</code></li>
            <li>Verify the event properties match what you sent</li>
          </ul>
          <div className="pt-4">
            <a
              href={process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              Open PostHog Dashboard →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
