'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingDown } from 'lucide-react';

interface KnowledgeGap {
  moduleId: string;
  moduleName: string;
  courseTitle: string;
  score: number;
  attempts: number;
}

interface KnowledgeGapsChartProps {
  data: KnowledgeGap[];
}

export function KnowledgeGapsChart({ data }: KnowledgeGapsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          No knowledge gaps identified. Great job!
        </p>
      </div>
    );
  }

  // Sort by score (lowest first - biggest gaps)
  const sortedData = [...data].sort((a, b) => a.score - b.score);

  const getScoreColor = (score: number) => {
    if (score < 50) return 'text-red-600';
    if (score < 70) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score < 50) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (score < 70) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  };

  const getSeverityLabel = (score: number) => {
    if (score < 50) return 'Critical';
    if (score < 70) return 'Moderate';
    return 'Minor';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <TrendingDown className="h-4 w-4" />
        <span>
          {sortedData.length} {sortedData.length === 1 ? 'area' : 'areas'} need attention
        </span>
      </div>

      {sortedData.map((gap, index) => (
        <div
          key={gap.moduleId}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  #{index + 1}
                </span>
                <h4 className="font-semibold">{gap.moduleName}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{gap.courseTitle}</p>
            </div>
            <Badge className={getScoreBgColor(gap.score)}>
              {getSeverityLabel(gap.score)}
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Score Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Average Score
                </span>
                <span className={`text-sm font-bold ${getScoreColor(gap.score)}`}>
                  {gap.score.toFixed(1)}%
                </span>
              </div>
              <div className="relative">
                <Progress value={gap.score} className="h-2" />
                {gap.score < 70 && (
                  <div
                    className="absolute top-0 h-2 border-l-2 border-dashed border-gray-400"
                    style={{ left: '70%' }}
                    title="Passing threshold (70%)"
                  />
                )}
              </div>
            </div>

            {/* Attempts and Recommendations */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Attempts:</span>
                  <span className="font-semibold ml-1">{gap.attempts}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gap:</span>
                  <span className="font-semibold ml-1">
                    {(70 - gap.score).toFixed(0)} points
                  </span>
                </div>
              </div>

              {gap.score < 50 ? (
                <Badge variant="destructive" className="text-xs">
                  Needs Review
                </Badge>
              ) : gap.score < 70 ? (
                <Badge variant="secondary" className="text-xs">
                  Practice Recommended
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Minor Improvement
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-red-600">
              {sortedData.filter((g) => g.score < 50).length}
            </p>
            <p className="text-xs text-muted-foreground">Critical Gaps</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {sortedData.filter((g) => g.score >= 50 && g.score < 70).length}
            </p>
            <p className="text-xs text-muted-foreground">Moderate Gaps</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">
              {sortedData.filter((g) => g.score >= 70).length}
            </p>
            <p className="text-xs text-muted-foreground">Minor Gaps</p>
          </div>
        </div>
      </div>
    </div>
  );
}
