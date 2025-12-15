"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Users, BookOpen } from "lucide-react";

interface Department {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  defaultCourseIds: any[];
  autoEnroll: boolean;
}

interface DepartmentCardProps {
  department: Department;
  onEdit: (dept: Department) => void;
  onDelete: (dept: Department) => void;
}

export function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{department.name}</CardTitle>
            {department.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {department.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onEdit(department)} className="cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(department)}
                className="text-destructive cursor-pointer focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm py-2 border-b">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Members</span>
          </div>
          <span className="font-medium tabular-nums">{department.memberCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2 border-b">
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>Default Courses</span>
          </div>
          <span className="font-medium tabular-nums">{department.defaultCourseIds.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2">
          <span className="text-muted-foreground">Auto-enroll</span>
          <Badge variant={department.autoEnroll ? 'default' : 'secondary'} className="font-medium">
            {department.autoEnroll ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
