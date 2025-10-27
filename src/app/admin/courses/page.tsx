"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { toast } from "sonner";
import { uploadImageToS3 } from "@/lib/s3-utils";
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Clock,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Course {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  totalModules: number;
  totalLessons: number;
  estimatedDuration: number;
  createdAt: string;
}

export default function AdminCoursesPage() {
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  const { userId } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    thumbnailPreview: '',
    thumbnailUrl: '',
  });

  // Fetch courses
  useEffect(() => {
    if (currentOrganization) {
      fetchCourses();
    }
  }, [currentOrganization]);

  const fetchCourses = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/courses?organizationId=${currentOrganization.id}`);
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingThumbnail(true);

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;

      // Set preview immediately
      setFormData({ ...formData, thumbnailPreview: base64Image });

      // Upload to S3
      const s3Url = await uploadImageToS3(base64Image, `course-${Date.now()}.${file.name.split('.').pop()}`);

      setFormData({
        ...formData,
        thumbnailPreview: base64Image,
        thumbnailUrl: s3Url
      });
      toast.success('Thumbnail uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setFormData({ ...formData, thumbnailPreview: '', thumbnailUrl: '' });
  };

  const handleCreateCourse = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a course title');
      return;
    }

    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          thumbnailUrl: formData.thumbnailUrl || undefined,
          createdBy: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create course');
      }

      const data = await response.json();
      toast.success('Course created successfully!');
      setCreateDialogOpen(false);
      setFormData({ title: '', description: '', category: 'other', thumbnailPreview: '', thumbnailUrl: '' });

      // Navigate to course detail page to add modules
      router.push(`/admin/courses/${data.course._id}`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(error.message || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleEditCourse = (courseId: string) => {
    router.push(`/admin/courses/${courseId}`);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete course');
      }

      toast.success('Course deleted successfully');
      fetchCourses(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleTogglePublish = async (courseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const action = newStatus === 'published' ? 'publish' : 'unpublish';

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} course`);

      toast.success(`Course ${action}ed successfully!`);
      fetchCourses();
    } catch (error: any) {
      console.error(`Error ${action}ing course:`, error);
      toast.error(`Failed to ${action} course`);
    }
  };

  const handleDuplicateCourse = async (courseId: string) => {
    if (!currentOrganization || !userId) return;

    try {
      // Fetch the course to duplicate
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      
      const { course } = await response.json();

      // Create a new course with copied data
      const duplicateResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          title: `${course.title} (Copy)`,
          description: course.description,
          category: course.category,
          createdBy: userId,
        }),
      });

      if (!duplicateResponse.ok) throw new Error('Failed to duplicate course');

      const { course: newCourse } = await duplicateResponse.json();

      // Copy modules and lessons
      if (course.modules && course.modules.length > 0) {
        const updateResponse = await fetch(`/api/courses/${newCourse._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modules: course.modules }),
        });

        if (!updateResponse.ok) throw new Error('Failed to copy course content');
      }

      toast.success('Course duplicated successfully!');
      fetchCourses();
      router.push(`/admin/courses/${newCourse._id}`);
    } catch (error: any) {
      console.error('Error duplicating course:', error);
      toast.error('Failed to duplicate course');
    }
  };

  return (
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
            <div className="max-w-7xl mx-auto space-y-8 w-full">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Courses</h1>
                  <p className="text-muted-foreground mt-2">
                    Create and manage learning courses
                  </p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>
                        Create a new learning course for your organization
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Course Title</Label>
                        <Input 
                          id="title" 
                          placeholder="e.g., Sales Training 101"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Brief description of what this course covers..."
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Course Thumbnail (optional)</Label>
                        {formData.thumbnailPreview ? (
                          <div className="relative w-full h-48 border rounded-lg overflow-hidden group">
                            <img
                              src={formData.thumbnailPreview}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveThumbnail}
                              className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            {uploadingThumbnail && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {uploadingThumbnail ? (
                                <Loader2 className="h-10 w-10 mb-3 text-muted-foreground animate-spin" />
                              ) : (
                                <ImageIcon className="h-10 w-10 mb-3 text-muted-foreground" />
                              )}
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleThumbnailChange}
                              disabled={uploadingThumbnail}
                            />
                          </label>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select 
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="onboarding">Onboarding</SelectItem>
                            <SelectItem value="technical">Technical</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="soft-skills">Soft Skills</SelectItem>
                            <SelectItem value="compliance">Compliance</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => setCreateDialogOpen(false)}
                        disabled={creating}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCourse} disabled={creating}>
                        {creating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Course'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search and Filter */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="published">Published</TabsTrigger>
                    <TabsTrigger value="archived">Archived</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Courses Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : courses.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Get started by creating your first learning course
                      </p>
                      <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Course
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses
                    .filter((course) => {
                      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((course) => (
                      <Card key={course._id} className="hover:shadow-lg transition-shadow overflow-hidden">
                        {(course as any).thumbnailUrl && (
                          <div className="w-full h-48 bg-muted overflow-hidden">
                            <img
                              src={(course as any).thumbnailUrl}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            {!(course as any).thumbnailUrl && (
                              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                <BookOpen className="h-6 w-6 text-primary" />
                              </div>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                              <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                {course.status}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditCourse(course._id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Course
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTogglePublish(course._id, course.status)}>
                                    {course.status === 'published' ? (
                                      <>
                                        <EyeOff className="h-4 w-4 mr-2" />
                                        Unpublish
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="h-4 w-4 mr-2" />
                                        Publish
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateCourse(course._id)}>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteCourse(course._id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <CardDescription className="line-clamp-2 min-h-[40px]">
                            {course.description || 'No description'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Modules</span>
                              <span className="font-medium">{course.totalModules}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Lessons</span>
                              <span className="font-medium">{course.totalLessons}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Duration</span>
                              <span className="font-medium">{course.estimatedDuration} min</span>
                            </div>
                            <Badge variant="outline" className="w-full justify-center capitalize">
                              {course.category.replace('-', ' ')}
                            </Badge>
                            <Button
                              className="w-full"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCourse(course._id)}
                            >
                              <Edit className="h-3 w-3 mr-2" />
                              Manage Course
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </main>
  );
}
