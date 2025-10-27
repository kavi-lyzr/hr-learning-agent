"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Video,
  FileText,
  Loader2,
  Save,
} from "lucide-react";

interface Lesson {
  _id?: string;
  title: string;
  description?: string;
  contentType: 'video' | 'article' | 'video-article';
  content: {
    videoUrl?: string;
    transcript?: any[];
    articleContent?: any;
    articleHtml?: string;
  };
  duration: number;
  order: number;
  hasQuiz: boolean;
  quizData?: any;
}

interface Module {
  _id?: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  order: number;
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  modules: Module[];
  estimatedDuration: number;
  createdAt: string;
  updatedAt: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  // Module dialog state
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleFormData, setModuleFormData] = useState({
    title: '',
    description: '',
  });

  // Lesson dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: '',
    description: '',
    contentType: 'article' as 'video' | 'article' | 'video-article',
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourse(data.course);
      // Open first module by default
      if (data.course.modules?.length > 0) {
        setOpenModules(new Set([data.course.modules[0]._id]));
      }
    } catch (error: any) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      router.push('/admin/courses');
    } finally {
      setLoading(false);
    }
  };

  const saveCourse = async () => {
    if (!course) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          category: course.category,
          status: course.status,
          modules: course.modules,
        }),
      });

      if (!response.ok) throw new Error('Failed to save course');

      const data = await response.json();
      setCourse(data.course);
      setHasChanges(false);
      toast.success('Course saved successfully!');
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = () => {
    setEditingModule(null);
    setModuleFormData({ title: '', description: '' });
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleFormData({
      title: module.title,
      description: module.description || '',
    });
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleFormData.title.trim()) {
      toast.error('Please enter a module title');
      return;
    }

    if (!course) return;

    const updatedModules = [...course.modules];

    if (editingModule && editingModule._id) {
      // Update existing module
      const index = updatedModules.findIndex(m => m._id === editingModule._id);
      if (index !== -1) {
        updatedModules[index] = {
          ...updatedModules[index],
          title: moduleFormData.title,
          description: moduleFormData.description,
        };
      }
    } else {
      // Add new module
      const newModule: Module = {
        _id: `temp-${Date.now()}`,
        title: moduleFormData.title,
        description: moduleFormData.description,
        lessons: [],
        order: updatedModules.length,
      };
      updatedModules.push(newModule);
      setOpenModules(prev => new Set([...prev, newModule._id!]));
    }

    // Auto-save to database immediately to prevent temp module errors
    try {
      setSaving(true);
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          category: course.category,
          status: course.status,
          modules: updatedModules,
        }),
      });

      if (!response.ok) throw new Error('Failed to save module');

      const data = await response.json();
      setCourse(data.course);
      setHasChanges(false);
      setModuleDialogOpen(false);
      toast.success(editingModule ? 'Module updated' : 'Module added and saved');
    } catch (error: any) {
      console.error('Error saving module:', error);
      toast.error('Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = (moduleId: string) => {
    if (!course) return;
    if (!confirm('Are you sure you want to delete this module? All lessons will be deleted.')) return;

    const updatedModules = course.modules
      .filter(m => m._id !== moduleId)
      .map((m, idx) => ({ ...m, order: idx }));

    setCourse({ ...course, modules: updatedModules });
    setHasChanges(true);
    toast.success('Module deleted');
  };

  const handleAddLesson = (moduleId: string) => {
    setEditingLesson(null);
    setLessonFormData({
      title: '',
      description: '',
      contentType: 'article',
    });
    // Store which module we're adding to
    setEditingLesson({ moduleId, lesson: null as any });
    router.push(`/admin/courses/${courseId}/lessons/new?moduleId=${moduleId}`);
  };

  const handleEditLesson = (moduleId: string, lesson: Lesson) => {
    router.push(`/admin/courses/${courseId}/lessons/${lesson._id}?moduleId=${moduleId}`);
  };

  const handleDeleteLesson = (moduleId: string, lessonId: string) => {
    if (!course) return;
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    const updatedModules = course.modules.map(module => {
      if (module._id === moduleId) {
        return {
          ...module,
          lessons: module.lessons
            .filter(l => l._id !== lessonId)
            .map((l, idx) => ({ ...l, order: idx })),
        };
      }
      return module;
    });

    setCourse({ ...course, modules: updatedModules });
    setHasChanges(true);
    toast.success('Lesson deleted');
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/admin/courses">
              <ChevronLeft className="h-4 w-4" />
              Back to Courses
            </Link>
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground">{course.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-4">
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {course.modules.length} modules • {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons • {course.estimatedDuration} min
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Unsaved changes
                </Badge>
              )}
              <Button onClick={saveCourse} disabled={!hasChanges || saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Course
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Course Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Category</Label>
                <p className="font-medium capitalize">{course.category.replace('-', ' ')}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select
                  value={course.status}
                  onValueChange={(value) => {
                    setCourse({ ...course, status: value });
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Modules & Lessons</h2>
            <Button onClick={handleAddModule} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          </div>

          {course.modules.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No modules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Get started by adding your first module
                  </p>
                  <Button onClick={handleAddModule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Module
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {course.modules.map((module, moduleIndex) => (
                <Card key={module._id}>
                  <Collapsible
                    open={openModules.has(module._id!)}
                    onOpenChange={() => toggleModule(module._id!)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-grab" />
                        <div className="flex-1">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-start justify-between cursor-pointer w-full">
                              <div className="flex items-center gap-2">
                                {openModules.has(module._id!) ? (
                                  <ChevronDown className="h-5 w-5" />
                                ) : (
                                  <ChevronRight className="h-5 w-5" />
                                )}
                                <div>
                                  <CardTitle className="text-lg">
                                    Module {moduleIndex + 1}: {module.title}
                                  </CardTitle>
                                  {module.description && (
                                    <CardDescription className="mt-1">
                                      {module.description}
                                    </CardDescription>
                                  )}
                                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span>{module.lessons.length} lessons</span>
                                    <span>
                                      {module.lessons.reduce((sum, l) => sum + l.duration, 0)} min
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditModule(module);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteModule(module._id!);
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="pt-0 pl-14">
                        {module.lessons.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <p className="text-sm text-muted-foreground mb-3">No lessons yet</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddLesson(module._id!)}
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Add Lesson
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {module.lessons.map((lesson, lessonIndex) => (
                              <div
                                key={lesson._id}
                                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                                <div className="flex items-center gap-2">
                                  {lesson.contentType === 'video' || lesson.contentType === 'video-article' ? (
                                    <Video className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {lessonIndex + 1}. {lesson.title}
                                  </div>
                                  {lesson.description && (
                                    <div className="text-sm text-muted-foreground line-clamp-1">
                                      {lesson.description}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>{lesson.duration} min</span>
                                  {lesson.hasQuiz && <Badge variant="secondary">Quiz</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditLesson(module._id!, lesson)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteLesson(module._id!, lesson._id!)}
                                    className="text-destructive hover:text-destructive h-8 w-8"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddLesson(module._id!)}
                              className="w-full mt-2"
                            >
                              <Plus className="h-3 w-3 mr-2" />
                              Add Lesson
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Module Dialog */}
        <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModule ? 'Edit Module' : 'Add New Module'}</DialogTitle>
              <DialogDescription>
                {editingModule ? 'Update module details' : 'Create a new learning module'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="module-title">Module Title</Label>
                <Input
                  id="module-title"
                  placeholder="e.g., Introduction to Sales"
                  value={moduleFormData.title}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module-description">Description (optional)</Label>
                <Textarea
                  id="module-description"
                  placeholder="Brief overview of what this module covers..."
                  rows={3}
                  value={moduleFormData.description}
                  onChange={(e) => setModuleFormData({ ...moduleFormData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveModule}>
                {editingModule ? 'Update Module' : 'Add Module'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

