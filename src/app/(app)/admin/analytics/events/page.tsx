'use client';

import { useState, useEffect } from 'react';
import { useOrganization } from '@/lib/OrganizationProvider';
import { EventsTable } from '@/components/admin/analytics/EventsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';

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

export default function AnalyticsEventsPage() {
  const { currentOrganization } = useOrganization();
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const pageSize = 20;

  useEffect(() => {
    if (currentOrganization) {
      fetchEvents();
    }
  }, [currentOrganization, page, eventTypeFilter]);

  const fetchEvents = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        organizationId: currentOrganization.id,
        skip: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString(),
      });

      if (eventTypeFilter && eventTypeFilter !== 'all') {
        params.append('eventType', eventTypeFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/analytics/organization/${currentOrganization.id}/events?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load analytics events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }

    // Create CSV content
    const headers = ['Event Type', 'Event Name', 'User ID', 'Timestamp', 'Details'];
    const rows = events.map(event => [
      event.eventType,
      event.eventName,
      event.userId,
      new Date(event.timestamp).toISOString(),
      JSON.stringify(event.properties),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Events exported successfully');
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Events</h1>
            <p className="text-muted-foreground mt-2">
              View and filter all learning activity events
            </p>
          </div>
          <Button onClick={handleExportCSV} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Event Type
                </label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="lesson_started">Lesson Started</SelectItem>
                    <SelectItem value="lesson_completed">Lesson Completed</SelectItem>
                    <SelectItem value="lesson_abandoned">Lesson Abandoned</SelectItem>
                    <SelectItem value="quiz_started">Quiz Started</SelectItem>
                    <SelectItem value="quiz_completed">Quiz Completed</SelectItem>
                    <SelectItem value="quiz_failed">Quiz Failed</SelectItem>
                    <SelectItem value="course_enrolled">Course Enrolled</SelectItem>
                    <SelectItem value="course_completed">Course Completed</SelectItem>
                    <SelectItem value="time_spent_updated">Time Spent Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user ID, course, lesson..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPage(1);
                        fetchEvents();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <Button onClick={() => {
              setPage(1);
              fetchEvents();
            }}>
              Apply Filters
            </Button>
          </CardContent>
        </Card>

        {/* Events Table */}
        <EventsTable
          events={events}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
