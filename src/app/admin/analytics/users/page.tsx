'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, BarChart3, User } from 'lucide-react';

interface OrganizationMember {
  _id: string;
  userId: string;
  role: string;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface UserAnalytics {
  totalEnrollments: number;
  completionRate: number;
  totalTimeSpent: number;
  avgQuizScore: number;
}

export default function UsersAnalyticsPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, UserAnalytics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      fetchMembersAndAnalytics();
    }
  }, [currentOrganization]);

  const fetchMembersAndAnalytics = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    try {
      // Fetch organization members
      const membersRes = await fetch(`/api/organizations/${currentOrganization.id}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData.members || []);

        // Fetch analytics for each user
        const analyticsPromises = (membersData.members || []).map(async (member: OrganizationMember) => {
          try {
            const userIdString = typeof member.userId === 'object' 
              ? (member.userId as any)._id?.toString() || (member.userId as any).toString()
              : member.userId.toString();
            
            const analyticsRes = await fetch(`/api/analytics/users/${userIdString}`);
            if (analyticsRes.ok) {
              const analyticsData = await analyticsRes.json();
              return { userId: userIdString, analytics: analyticsData };
            }
          } catch (error) {
            console.error('Error fetching user analytics:', error);
          }
          return null;
        });

        const analyticsResults = await Promise.all(analyticsPromises);
        const analyticsMap: Record<string, UserAnalytics> = {};
        analyticsResults.forEach((result) => {
          if (result) {
            analyticsMap[result.userId] = result.analytics;
          }
        });
        setAnalytics(analyticsMap);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserId = (member: OrganizationMember) => {
    if (typeof member.userId === 'object') {
      return (member.userId as any)._id?.toString() || (member.userId as any).toString();
    }
    return member.userId.toString();
  };

  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.user?.name?.toLowerCase().includes(searchLower) ||
      member.user?.email?.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower)
    );
  });

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/analytics')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">User Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Select a user to view detailed analytics
            </p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredMembers.length > 0 ? (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const userId = getUserId(member);
                  const userAnalytics = analytics[userId];
                  
                  return (
                    <div
                      key={member._id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/admin/analytics/users/${userId}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg">
                                {member.user?.name || 'Unknown User'}
                              </h3>
                              <Badge variant="outline">{member.role}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {member.user?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </Button>
                      </div>

                      {userAnalytics && (
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Enrollments</p>
                            <p className="text-lg font-semibold">
                              {userAnalytics.totalEnrollments}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Completion Rate</p>
                            <p className={`text-lg font-semibold ${getCompletionRateColor(userAnalytics.completionRate)}`}>
                              {userAnalytics.completionRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Time Spent</p>
                            <p className="text-lg font-semibold">
                              {formatTime(userAnalytics.totalTimeSpent)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Quiz Score</p>
                            <p className="text-lg font-semibold">
                              {userAnalytics.avgQuizScore}%
                            </p>
                          </div>
                        </div>
                      )}

                      {!userAnalytics && (
                        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                          No analytics data available yet
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
