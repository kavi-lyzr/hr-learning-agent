'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrganization } from '@/lib/OrganizationProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, BarChart3, User } from 'lucide-react';
import { toast } from 'sonner';

interface OrganizationMember {
  _id: string;
  userId: any;
  role: string;
  email: string;
  status: string;
  coursesEnrolled?: number;
  coursesCompleted?: number;
  coursesInProgress?: number;
  avgProgress?: number;
  user?: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function UsersAnalyticsPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [membersData, setMembersData] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch organization members
  useEffect(() => {
    if (!currentOrganization?.id) return;

    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/organizations/${currentOrganization.id}/members`
        );
        
        if (!response.ok) throw new Error('Failed to fetch members');
        
        const data = await response.json();
        setMembersData(data.members || []);
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to load members');
        setMembersData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [currentOrganization?.id]);

  const getUserId = (member: OrganizationMember): string | null => {
    // Handle case where user hasn't logged in yet (invited members)
    if (!member.userId) return null;
    if (typeof member.userId === 'object') {
      return (member.userId as any)._id?.toString() || (member.userId as any).toString();
    }
    return member.userId.toString();
  };

  const filteredMembers = useMemo(() => 
    membersData.filter((member: OrganizationMember) => {
      const searchLower = searchQuery.toLowerCase();
      const userName = typeof member.userId === 'object' ? member.userId.name : '';
      const userEmail = member.email || (typeof member.userId === 'object' ? member.userId.email : '');
      return (
        userName?.toLowerCase().includes(searchLower) ||
        userEmail?.toLowerCase().includes(searchLower) ||
        member.role.toLowerCase().includes(searchLower)
      );
    }),
    [membersData, searchQuery]
  );

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
                  const userName = typeof member.userId === 'object' ? member.userId.name : 'Unknown User';
                  const userEmail = member.email || (typeof member.userId === 'object' ? member.userId.email : 'No email');
                  const hasUserAccount = userId !== null;

                  return (
                    <div
                      key={member._id}
                      className={`border rounded-lg p-4 transition-shadow ${hasUserAccount ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}
                      onClick={() => hasUserAccount && router.push(`/admin/analytics/users/${userId}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-semibold text-lg">
                                {userName}
                              </h3>
                              <Badge variant="outline">{member.role}</Badge>
                              {member.status && (
                                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                  {member.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {userEmail}
                            </p>
                          </div>
                        </div>
                        {hasUserAccount ? (
                          <Button variant="outline" size="sm">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </Button>
                        ) : (
                          <Badge variant="secondary">Pending Login</Badge>
                        )}
                      </div>

                      {/* Analytics Preview */}
                      {(member.coursesEnrolled !== undefined || member.coursesCompleted !== undefined) && (
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Enrolled</p>
                            <p className="text-lg font-semibold">{member.coursesEnrolled || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Completed</p>
                            <p className={`text-lg font-semibold ${member.coursesCompleted ? 'text-green-600' : ''}`}>
                              {member.coursesCompleted || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">In Progress</p>
                            <p className="text-lg font-semibold">{member.coursesInProgress || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Progress</p>
                            <p className={`text-lg font-semibold ${getCompletionRateColor(member.avgProgress || 0)}`}>
                              {(member.avgProgress || 0).toFixed(0)}%
                            </p>
                          </div>
                        </div>
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
