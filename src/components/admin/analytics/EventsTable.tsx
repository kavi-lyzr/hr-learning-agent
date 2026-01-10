'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AnalyticsEvent {
  _id: string;
  eventId: string;
  eventType: string;
  eventName: string;
  userId: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

interface EventsTableProps {
  events: AnalyticsEvent[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

const eventTypeColors: Record<string, string> = {
  lesson_started: 'bg-blue-500',
  lesson_completed: 'bg-green-500',
  lesson_abandoned: 'bg-red-500',
  quiz_started: 'bg-purple-500',
  quiz_completed: 'bg-green-600',
  quiz_failed: 'bg-orange-500',
  course_enrolled: 'bg-blue-600',
  course_completed: 'bg-emerald-500',
  time_spent_updated: 'bg-gray-500',
};

export function EventsTable({
  events,
  total,
  page,
  pageSize,
  onPageChange,
  isLoading = false,
}: EventsTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  const getEventBadgeColor = (eventType: string) => {
    return eventTypeColors[eventType] || 'bg-gray-500';
  };

  const formatEventDetails = (event: AnalyticsEvent) => {
    const props = event.properties;
    switch (event.eventType) {
      case 'lesson_started':
      case 'lesson_completed':
        return `${props.lessonTitle || 'Lesson'} in ${props.courseTitle || 'Course'}`;
      case 'quiz_completed':
      case 'quiz_failed':
        return `Quiz (Score: ${props.score || 0}%)`;
      case 'course_enrolled':
      case 'course_completed':
        return props.courseTitle || 'Course';
      case 'time_spent_updated':
        return `${Math.round((props.timeSpent || 0) / 60)} mins`;
      default:
        return 'Activity';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">No events found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Events will appear here as users interact with courses
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event._id}>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`${getEventBadgeColor(event.eventType)} text-white`}
                  >
                    {event.eventName}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {formatEventDetails(event)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {event.userId}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(event.timestamp), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, total)} of {total} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
