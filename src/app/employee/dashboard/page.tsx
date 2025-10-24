"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  PlayCircle,
  ArrowRight,
} from "lucide-react";

export default function EmployeeDashboard() {
  const router = useRouter();

  // TODO: Fetch from API
  const stats = {
    coursesEnrolled: 8,
    coursesCompleted: 5,
    totalHoursLearned: 24.5,
    averageProgress: 67,
  };

  return (
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Page Header */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Welcome back!</h1>
                  <p className="text-muted-foreground mt-2">
                    Continue your learning journey
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Courses Enrolled
                      </CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.coursesEnrolled}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        3 in progress
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Completed
                      </CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.coursesCompleted}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        +2 this month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Learning Hours
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalHoursLearned}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg. Progress
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.averageProgress}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across all courses
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Continue Learning */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Continue Where You Left Off</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <PlayCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">Sales Training Fundamentals</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Module 2: Discovery Questions
                        </p>
                        <div className="space-y-2">
                          <Progress value={45} className="h-2" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>45% complete</span>
                            <span>3 of 8 lessons</span>
                          </div>
                        </div>
                      </div>
                      <Button>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* My Courses Grid */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold">My Courses</h2>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/employee/courses')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { title: "Sales Training", progress: 45, lessons: 12, category: "Sales" },
                      { title: "Product Knowledge", progress: 78, lessons: 8, category: "Product" },
                      { title: "Customer Service", progress: 100, lessons: 10, category: "Service" },
                    ].map((course, idx) => (
                      <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-xs px-2 py-1 bg-muted rounded-full">
                              {course.category}
                            </span>
                          </div>
                          <CardTitle className="text-base">{course.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                              {course.lessons} lessons
                            </div>
                            <div className="space-y-2">
                              <Progress value={course.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground">
                                {course.progress}% complete
                              </p>
                            </div>
                            <Button className="w-full" variant="outline" size="sm">
                              {course.progress === 100 ? 'Review' : 'Continue'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </main>
  );
}
