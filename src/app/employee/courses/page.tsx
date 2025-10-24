"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Clock,
  Search,
  Filter,
  PlayCircle,
} from "lucide-react";

export default function EmployeeCoursesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Fetch from API
  const myCourses = [
    { id: '1', title: "Sales Training Fundamentals", progress: 45, lessons: 12, category: "Sales", enrolled: true, estimatedTime: "8 hours" },
    { id: '2', title: "Product Knowledge 101", progress: 78, lessons: 8, category: "Product", enrolled: true, estimatedTime: "5 hours" },
    { id: '3', title: "Customer Service Excellence", progress: 100, lessons: 10, category: "Service", enrolled: true, estimatedTime: "6 hours" },
  ];

  const allCourses = [
    { id: '4', title: "Advanced Negotiation Skills", progress: 0, lessons: 15, category: "Sales", enrolled: false, estimatedTime: "10 hours" },
    { id: '5', title: "Technical Product Deep Dive", progress: 0, lessons: 20, category: "Product", enrolled: false, estimatedTime: "12 hours" },
    { id: '6', title: "Leadership Essentials", progress: 0, lessons: 18, category: "Leadership", enrolled: false, estimatedTime: "9 hours" },
  ];

  const handleEnrollCourse = (courseId: string) => {
    // TODO: Call API to enroll in course
    console.log('Enrolling in course:', courseId);
  };

  const handleCourseClick = (courseId: string) => {
    router.push(`/employee/courses/${courseId}`);
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-muted/20 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Courses</h1>
          <p className="text-muted-foreground mt-2">
            Browse and continue your learning
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-learning" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-learning">My Learning</TabsTrigger>
            <TabsTrigger value="browse">Browse All</TabsTrigger>
          </TabsList>

          <TabsContent value="my-learning" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCourses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleCourseClick(course.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary">{course.category}</Badge>
                    </div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3" />
                      {course.estimatedTime} • {course.lessons} lessons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>
                      <Button className="w-full" size="sm">
                        {course.progress === 0 ? 'Start Course' : course.progress === 100 ? 'Review' : 'Continue'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="browse" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCourses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <PlayCircle className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary">{course.category}</Badge>
                    </div>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3" />
                      {course.estimatedTime} • {course.lessons} lessons
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleEnrollCourse(course.id)}
                    >
                      Enroll Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
