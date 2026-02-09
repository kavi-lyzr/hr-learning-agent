"use client";

import { useEffect, useState } from "react";
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
import { useCourses, useDeleteCourse, useInvalidateQueries } from "@/hooks/use-queries";
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
  Download,
  BarChart3,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CourseImportDialog } from "@/components/admin/CourseImportDialog";
import { generateCourseGradient } from "@/lib/gradient-utils";
import Image from "next/image";

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

  // React Query hooks
  const {
    data: courses = [],
    isLoading: loading,
    refetch: refetchCourses
  } = useCourses(currentOrganization?.id || null);

  const deleteCourse = useDeleteCourse(currentOrganization?.id || "");
  const { invalidateCourses } = useInvalidateQueries();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'technical', label: 'Technical' },
    { value: 'sales', label: 'Sales' },
    { value: 'soft-skills', label: 'Soft Skills' },
    { value: 'compliance', label: 'Compliance' },
    { value: 'other', label: 'Other' },
  ]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    thumbnailPreview: '',
    thumbnailUrl: '',
  });

  // Fetch organization categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization) return;
      try {
        const res = await fetch(`/api/organizations/${currentOrganization.id}/categories`);
        if (res.ok) {
          const data = await res.json();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories.map((c: string) => ({
              value: c,
              label: c.charAt(0).toUpperCase() + c.slice(1).replace(/-/g, ' ')
            })));
          }
        }
      } catch (error) {
        console.log('Using default categories');
      }
    };
    fetchCategories();
  }, [currentOrganization]);

  // Fetch user's organizations for import dialog
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/organizations?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUserOrganizations(data.organizations || []);
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
      }
    };
    fetchOrganizations();
  }, [userId]);

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

      // Invalidate the courses cache
      if (currentOrganization) {
        invalidateCourses(currentOrganization.id);
      }

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
      await deleteCourse.mutateAsync(courseId);
    } catch (error: unknown) {
      // Error handled by mutation
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
      if (currentOrganization) {
        invalidateCourses(currentOrganization.id);
      }
    } catch (error: unknown) {
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
      if (currentOrganization) {
        invalidateCourses(currentOrganization.id);
      }
      router.push(`/admin/courses/${newCourse._id}`);
    } catch (error: unknown) {
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
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
              <Download className="h-4 w-4" />
              Import from Org
            </Button>
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
                      {/* <Image
                        src={formData.thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                        fill 
                      /> */}
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
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
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
        </div>

        {/* Course Import Dialog */}
        <CourseImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          currentOrgId={currentOrganization?.id || ''}
          userId={userId || ''}
          availableOrgs={userOrganizations}
          onImportComplete={() => {
            if (currentOrganization) {
              invalidateCourses(currentOrganization.id);
            }
          }}
        />

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
              .map((course, index) => (
                <Card
                  key={course._id}
                  className={`group cursor-pointer hover:shadow-lg hover:bg-muted/50 rounded-sm pt-0 transition-all duration-300 overflow-hidden animate-card-enter stagger-${Math.min(index + 1, 9)}`}
                  onClick={() => handleEditCourse(course._id)}
                >
                  {/* Thumbnail or Gradient Placeholder */}
                  <div className="relative w-full h-36 overflow-hidden">
                    {(course as any).thumbnailUrl ? (
                      <img
                        src={(course as any).thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-300"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: generateCourseGradient(course._id) }}
                      >
                        <BookOpen className="h-12 w-12 text-white/60" />
                      </div>
                    )}
                    {/* Status badge overlay */}
                    <div className="absolute top-3 left-3">
                      <Badge
                        variant={course.status === 'published' ? 'default' : 'secondary'}
                        className="shadow-sm"
                      >
                        {course.status === 'published' ? (
                          <><Eye className="h-3 w-3 mr-1" /> Published</>
                        ) : (
                          course.status
                        )}
                      </Badge>
                    </div>
                    {/* Three-dots menu overlay */}
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm bg-background/80 backdrop-blur-sm hover:bg-background">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCourse(course._id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/analytics/courses/${course._id}`)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
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
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {course.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[40px]">
                      {course.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {course.totalModules} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {course.estimatedDuration} min
                        </span>
                      </div>
                      <Users className="h-4 w-4" />
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
