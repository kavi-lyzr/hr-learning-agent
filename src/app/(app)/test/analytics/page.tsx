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
  const [orgEngagement, setOrgEngagement] = useState<any>(null);
  const [courseAnalytics, setCourseAnalytics] = useState<any>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [userHeatmap, setUserHeatmap] = useState<any>(null);
  const [dropoffData, setDropoffData] = useState<any>(null);
  const [aggregationResult, setAggregationResult] = useState<any>(null);

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

  const handleBatchEvents = async () => {
    setIsLoading(true);
    try {
      const events = [
        {
          organizationId,
          userId,
          eventType: 'lesson_started',
          eventName: 'Lesson Started',
          properties: { courseId, lessonId, lessonTitle: 'Batch Test Lesson' },
        },
        {
          organizationId,
          userId,
          eventType: 'lesson_completed',
          eventName: 'Lesson Completed',
          properties: { courseId, lessonId, timeSpent: 20, lessonTitle: 'Batch Test Lesson' },
        },
        {
          organizationId,
          userId,
          eventType: 'quiz_completed',
          eventName: 'Quiz Completed',
          properties: { courseId, lessonId, score: 90, quizId: 'quiz-batch-1' },
        },
      ];

      const response = await fetch('/api/analytics/events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Batch stored ${data.count} events`);
        console.log('Batch result:', data);
      } else {
        toast.error('Failed to batch store events');
      }
    } catch (error) {
      console.error('Error batch storing events:', error);
      toast.error('Error batch storing events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchOrgEngagement = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/organization/${organizationId}/engagement`);
      
      if (response.ok) {
        const data = await response.json();
        setOrgEngagement(data.engagement);
        toast.success('Fetched organization engagement metrics');
      } else {
        toast.error('Failed to fetch engagement');
      }
    } catch (error) {
      console.error('Error fetching engagement:', error);
      toast.error('Error fetching engagement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchCourseAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/courses/${courseId}`);
      
      if (response.ok) {
        const data = await response.json();
        setCourseAnalytics(data.analytics[0] || null);
        toast.success('Fetched course analytics');
      } else {
        toast.error('Failed to fetch course analytics');
      }
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      toast.error('Error fetching course analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchDropoff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/courses/${courseId}/dropoff`);
      
      if (response.ok) {
        const data = await response.json();
        setDropoffData(data);
        toast.success('Fetched dropoff analysis');
      } else {
        toast.error('Failed to fetch dropoff data');
      }
    } catch (error) {
      console.error('Error fetching dropoff:', error);
      toast.error('Error fetching dropoff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchUserAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/users/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setUserAnalytics(data.analytics[0] || null);
        toast.success('Fetched user analytics');
      } else {
        toast.error('Failed to fetch user analytics');
      }
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      toast.error('Error fetching user analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchHeatmap = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/users/${userId}/heatmap`);
      
      if (response.ok) {
        const data = await response.json();
        setUserHeatmap(data);
        toast.success('Fetched activity heatmap');
      } else {
        toast.error('Failed to fetch heatmap');
      }
    } catch (error) {
      console.error('Error fetching heatmap:', error);
      toast.error('Error fetching heatmap');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerAggregation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/aggregate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          period: 'daily',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAggregationResult(data.aggregation);
        toast.success('Aggregation completed successfully');
      } else {
        toast.error('Failed to trigger aggregation');
      }
    } catch (error) {
      console.error('Error triggering aggregation:', error);
      toast.error('Error triggering aggregation');
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
          <CardTitle>4. Batch Events</CardTitle>
          <CardDescription>
            Test batch event storage (Phase 3)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBatchEvents} disabled={isLoading} className="w-full">
            {isLoading ? 'Storing...' : 'Store 3 Events in Batch'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>5. Organization Analytics</CardTitle>
            <CardDescription>
              Test organization-level metrics (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchOrgEngagement} disabled={isLoading} className="w-full">
              {isLoading ? 'Fetching...' : 'Fetch Organization Engagement'}
            </Button>
            {orgEngagement && (
              <div className="text-xs space-y-1 p-3 bg-muted rounded">
                <div>Avg Time Spent: {orgEngagement.avgTimeSpent} min</div>
                <div>Active Users: {orgEngagement.activeUsers}</div>
                <div>Avg Quiz Score: {orgEngagement.avgQuizScore}</div>
                <div>Total Engagements: {orgEngagement.totalEngagements}</div>
                <div>Courses Completed: {orgEngagement.coursesCompleted}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Course Analytics</CardTitle>
            <CardDescription>
              Test course-specific metrics (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchCourseAnalytics} disabled={isLoading} className="w-full">
              {isLoading ? 'Fetching...' : 'Fetch Course Analytics'}
            </Button>
            {courseAnalytics && (
              <div className="text-xs space-y-1 p-3 bg-muted rounded">
                <div>Enrollments: {courseAnalytics.enrollmentCount}</div>
                <div>Completions: {courseAnalytics.completionCount}</div>
                <div>Completion Rate: {courseAnalytics.completionRate}%</div>
                <div>Avg Time: {courseAnalytics.avgTimeSpent} min</div>
                <div>Avg Score: {courseAnalytics.avgScore}</div>
                {courseAnalytics.realTime && <div className="text-yellow-600">⚡ Real-time data</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Course Dropoff Analysis</CardTitle>
            <CardDescription>
              Test dropoff detection (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchDropoff} disabled={isLoading} className="w-full">
              {isLoading ? 'Fetching...' : 'Fetch Dropoff Analysis'}
            </Button>
            {dropoffData && (
              <div className="text-xs space-y-2 p-3 bg-muted rounded max-h-48 overflow-auto">
                <div className="font-medium">Total Users: {dropoffData.totalUsers}</div>
                <div className="font-medium">Total Dropoffs: {dropoffData.summary.totalDropoffs}</div>
                {dropoffData.dropoffPoints.length > 0 ? (
                  dropoffData.dropoffPoints.map((point: any, idx: number) => (
                    <div key={idx} className="border-t pt-1">
                      <div>{point.lessonTitle || point.lessonId}</div>
                      <div>Dropoffs: {point.dropoffCount} ({point.dropoffRate}%)</div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">No dropoffs detected</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. User Analytics</CardTitle>
            <CardDescription>
              Test user-specific metrics (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchUserAnalytics} disabled={isLoading} className="w-full">
              {isLoading ? 'Fetching...' : 'Fetch User Analytics'}
            </Button>
            {userAnalytics && (
              <div className="text-xs space-y-1 p-3 bg-muted rounded">
                <div>Total Time: {userAnalytics.totalTimeSpent} min</div>
                <div>Courses Enrolled: {userAnalytics.coursesEnrolled}</div>
                <div>Courses Completed: {userAnalytics.coursesCompleted}</div>
                <div>Avg Quiz Score: {userAnalytics.avgQuizScore}</div>
                <div>Engagement: {userAnalytics.engagementLevel}</div>
                {userAnalytics.realTime && <div className="text-yellow-600">⚡ Real-time data</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>9. Activity Heatmap</CardTitle>
            <CardDescription>
              Test user activity heatmap (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleFetchHeatmap} disabled={isLoading} className="w-full">
              {isLoading ? 'Fetching...' : 'Fetch Activity Heatmap'}
            </Button>
            {userHeatmap && (
              <div className="text-xs space-y-2 p-3 bg-muted rounded max-h-48 overflow-auto">
                <div className="font-medium">Statistics:</div>
                <div>Total Minutes: {userHeatmap.statistics.totalMinutes}</div>
                <div>Avg/Day: {userHeatmap.statistics.avgMinutesPerDay} min</div>
                <div>Active Days: {userHeatmap.statistics.activeDays}</div>
                {userHeatmap.heatmap.length > 0 && (
                  <>
                    <div className="font-medium mt-2">Recent Activity:</div>
                    {userHeatmap.heatmap.slice(0, 5).map((day: any, idx: number) => (
                      <div key={idx} className="border-t pt-1">
                        <div>{day.date}: {day.minutesSpent} min</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Trigger Aggregation</CardTitle>
            <CardDescription>
              Test manual aggregation (Phase 3)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleTriggerAggregation} disabled={isLoading} className="w-full">
              {isLoading ? 'Aggregating...' : 'Run Aggregation Job'}
            </Button>
            {aggregationResult && (
              <div className="text-xs space-y-1 p-3 bg-muted rounded">
                <div className="font-medium">Aggregation Result:</div>
                <div>Period: {aggregationResult.period}</div>
                <div>Metrics:</div>
                <div className="ml-2">
                  <div>Total Time: {aggregationResult.metrics.totalTimeSpent} min</div>
                  <div>Active Users: {aggregationResult.metrics.activeUsers}</div>
                  <div>Avg Progress: {aggregationResult.metrics.avgLearningProgress}%</div>
                  <div>Total Events: {aggregationResult.metrics.totalEngagements}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>11. Check PostHog</CardTitle>
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
