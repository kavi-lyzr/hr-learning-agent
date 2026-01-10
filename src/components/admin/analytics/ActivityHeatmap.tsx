'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityData {
  date: string;
  minutesSpent: number;
}

interface ActivityHeatmapProps {
  data: ActivityData[];
  isLoading?: boolean;
}

export function ActivityHeatmap({ data, isLoading = false }: ActivityHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const dataMap = new Map<string, number>();
    data.forEach((item) => {
      dataMap.set(item.date, item.minutesSpent);
    });
    setHeatmapData(dataMap);
  }, [data]);

  const getIntensity = (minutes: number): string => {
    if (minutes === 0) return 'bg-muted';
    if (minutes < 30) return 'bg-green-200 dark:bg-green-900';
    if (minutes < 60) return 'bg-green-300 dark:bg-green-800';
    if (minutes < 120) return 'bg-green-400 dark:bg-green-700';
    return 'bg-green-500 dark:bg-green-600';
  };

  // Generate last 12 weeks of dates
  const generateWeeks = () => {
    const weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7 + today.getDay()));
      
      const days = [];
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + j);
        days.push(date.toISOString().split('T')[0]);
      }
      weeks.push(days);
    }
    
    return weeks;
  };

  const weeks = generateWeeks();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Learning activity over the past 12 weeks
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week labels */}
          <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
              <div key={day} className="text-center">
                {i === 0 ? 'M' : i === 2 ? 'W' : i === 4 ? 'F' : ''}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const minutes = heatmapData.get(date) || 0;
                  return (
                    <div
                      key={date}
                      className={`h-3 w-3 rounded-sm ${getIntensity(minutes)} transition-colors cursor-pointer hover:ring-2 hover:ring-primary`}
                      title={`${date}: ${minutes} minutes`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-muted" />
              <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
              <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800" />
              <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
              <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
