"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useOrganization } from "@/lib/OrganizationProvider";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Calendar,
  Target,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading || !currentOrganization) {
    return null;
  }

  return (
    // <SidebarProvider>
    //   <div className="flex h-screen w-full">
    //     <AppSidebar />
    //     <div className="flex-1 flex flex-col w-full">
    //       <SiteHeader
    //         organization={currentOrganization}
    //         breadcrumbs={[
    //           { label: currentOrganization.name, href: `/admin/dashboard` },
    //           { label: 'Analytics' }
    //         ]}
    //       />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
            <div className="max-w-7xl mx-auto space-y-8 w-full">
              {/* Page Header */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-2">
                  Track learning progress and engagement across your organization
                </p>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Learners
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">124</div>
                    <p className="text-xs text-green-600 mt-1">
                      +12% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg. Completion Rate
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">78%</div>
                    <p className="text-xs text-green-600 mt-1">
                      +5% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Courses
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      2 added this month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Learning Hours
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,247</div>
                    <p className="text-xs text-green-600 mt-1">
                      +18% from last month
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Blurred Charts for Demo - Sales Tool */}
              <div className="relative">
                {/* Blur Overlay */}
                <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/30 rounded-lg flex items-center justify-center">
                  <Card className="max-w-md mx-4">
                    <CardHeader>
                      <CardTitle className="text-center">Premium Analytics</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <p className="text-muted-foreground">
                        Get detailed insights into learning patterns, engagement metrics, and ROI tracking with our premium analytics dashboard.
                      </p>
                      <Button size="lg" className="w-full">
                        <Calendar className="mr-2 h-4 w-4" />
                        Schedule a Demo
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        See how top companies are using Lyzr L&D to transform their learning programs
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Ghosted Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Course Completion Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                        <BarChart3 className="h-16 w-16 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Engagement by Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                        <Users className="h-16 w-16 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Learning Hours Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                        <TrendingUp className="h-16 w-16 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Top Performing Courses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                        <BookOpen className="h-16 w-16 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
    //     </div>
    //   </div>
    // </SidebarProvider>
  );
}
