"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Plus } from "lucide-react";

interface Course {
  _id: string;
  title: string;
  category: string;
}

interface CourseSelectorProps {
  courses: Course[];
  selectedCourseIds: string[];
  onSelectionChange: (courseIds: string[]) => void;
  departmentCourseIds?: string[]; // Courses from selected department
  generalDepartmentCourseIds?: string[]; // Courses from general department
  showSearch?: boolean;
}

export function CourseSelector({
  courses,
  selectedCourseIds,
  onSelectionChange,
  departmentCourseIds = [],
  generalDepartmentCourseIds = [],
  showSearch = true,
}: CourseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleCourseToggle = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      onSelectionChange(selectedCourseIds.filter(id => id !== courseId));
    } else {
      onSelectionChange([...selectedCourseIds, courseId]);
    }
  };

  const handleApplyDepartmentCourses = () => {
    const allDeptCourses = [...departmentCourseIds, ...generalDepartmentCourseIds];
    const uniqueCourses = Array.from(new Set([...selectedCourseIds, ...allDeptCourses]));
    onSelectionChange(uniqueCourses);
  };

  const filteredCourses = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query)
    );
  });

  const hasDepartmentCourses = departmentCourseIds.length > 0 || generalDepartmentCourseIds.length > 0;
  const allDepartmentCoursesSelected = hasDepartmentCourses &&
    [...departmentCourseIds, ...generalDepartmentCourseIds].every(id => selectedCourseIds.includes(id));

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {hasDepartmentCourses && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
          <div className="text-sm">
            <span className="font-medium">Department Courses: </span>
            <span className="text-muted-foreground">
              {departmentCourseIds.length + generalDepartmentCourseIds.length} available
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant={allDepartmentCoursesSelected ? "outline" : "default"}
            onClick={handleApplyDepartmentCourses}
            disabled={allDepartmentCoursesSelected}
            title={allDepartmentCoursesSelected ? "All department courses already selected" : "Add all department courses to selection"}
          >
            <Plus className="h-3 w-3 mr-1" />
            {allDepartmentCoursesSelected ? "All Added" : "Add All"}
          </Button>
        </div>
      )}

      <ScrollArea className="h-64 border rounded-lg p-4">
        <div className="space-y-2">
          {filteredCourses.map((course) => {
            const isFromDepartment = departmentCourseIds.includes(course._id);
            const isFromGeneral = generalDepartmentCourseIds.includes(course._id);

            return (
              <div
                key={course._id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-muted"
                onClick={() => handleCourseToggle(course._id)}
              >
                <Checkbox
                  id={`course-${course._id}`}
                  checked={selectedCourseIds.includes(course._id)}
                  onCheckedChange={() => handleCourseToggle(course._id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="flex-1">{course.title}</span>
                    {isFromDepartment && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        From Dept
                      </Badge>
                    )}
                    {isFromGeneral && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        From General
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground capitalize mt-1 ml-6">
                    {course.category.replace('-', ' ')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        {selectedCourseIds.length} course(s) selected
      </p>
    </div>
  );
}
