"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import RTE from "@/components/RTE";
import { convertToSignedUrls, convertToDirectUrls } from "@/lib/s3-utils";
import {
  ChevronLeft,
  Loader2,
  Save,
  Video,
  FileText,
  Youtube,
  AlertCircle,
  Eye,
  Edit3,
} from "lucide-react";

interface LessonFormData {
  title: string;
  description: string;
  contentType: 'video' | 'article' | 'video-article';
  videoUrl: string;
  transcript: any[];
  articleContent: any;
  articleHtml: string;
  duration: number;
  hasQuiz: boolean;
}

export default function LessonEditorPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get('moduleId');
  const isNew = lessonId === 'new';

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [transcriptDialogOpen, setTranscriptDialogOpen] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');

  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    contentType: 'article',
    videoUrl: '',
    transcript: [],
    articleContent: null,
    articleHtml: '',
    duration: 0,
    hasQuiz: false,
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

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

      // If editing existing lesson, load its data
      if (!isNew && lessonId) {
        await loadLessonData(data.course, lessonId);
      }
    } catch (error: any) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      router.push(`/admin/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonData = async (course: any, lessonId: string) => {
    for (const module of course.modules) {
      const lesson = module.lessons.find((l: any) => String(l._id) === String(lessonId));
      if (lesson) {
        // Convert S3 URLs to presigned URLs for editing
        let articleContent = lesson.content.articleContent || null;
        if (articleContent) {
          try {
            articleContent = await convertToSignedUrls(articleContent);
          } catch (error) {
            console.error('Error converting S3 URLs to presigned URLs:', error);
            // Continue with original content if conversion fails
          }
        }

        setFormData({
          title: lesson.title,
          description: lesson.description || '',
          contentType: lesson.contentType,
          videoUrl: lesson.content.videoUrl || '',
          transcript: lesson.content.transcript || [],
          articleContent,
          articleHtml: lesson.content.articleHtml || '',
          duration: lesson.duration,
          hasQuiz: lesson.hasQuiz,
        });
        break;
      }
    }
  };

  const handleFetchTranscript = async () => {
    if (!formData.videoUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    try {
      setFetchingTranscript(true);
      const response = await fetch('/api/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: formData.videoUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch transcript');
      }

      const data = await response.json();
      setFormData({ ...formData, transcript: data.transcript });
      setHasChanges(true);
      toast.success('Transcript fetched successfully!');
      // Open the transcript editor automatically
      handleOpenTranscriptEditor(data.transcript);
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast.error(error.message || 'Failed to fetch transcript');
    } finally {
      setFetchingTranscript(false);
    }
  };

  const handleOpenTranscriptEditor = (transcript?: any[]) => {
    const transcriptToEdit = transcript || formData.transcript;
    const fullText = transcriptToEdit.map((t: any) => t.text).join(' ');
    setEditableTranscript(fullText);
    setTranscriptDialogOpen(true);
  };

  const handleSaveTranscript = () => {
    // Convert edited text back to transcript format
    // For simplicity, we'll keep the original timestamps but update the text
    const words = editableTranscript.trim().split(/\s+/);
    const avgWordsPerSegment = Math.ceil(words.length / Math.max(formData.transcript.length, 1));
    
    const newTranscript = [];
    for (let i = 0; i < words.length; i += avgWordsPerSegment) {
      const segmentWords = words.slice(i, i + avgWordsPerSegment);
      const segmentIndex = Math.floor(i / avgWordsPerSegment);
      const originalSegment = formData.transcript[segmentIndex] || { start: segmentIndex * 5, duration: 5 };
      
      newTranscript.push({
        text: segmentWords.join(' '),
        start: originalSegment.start,
        duration: originalSegment.duration,
      });
    }

    setFormData({ ...formData, transcript: newTranscript });
    setHasChanges(true);
    setTranscriptDialogOpen(false);
    toast.success('Transcript updated!');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    if (!moduleId) {
      toast.error('Module ID is required');
      return;
    }

    // Validate content based on type
    if (formData.contentType === 'video' || formData.contentType === 'video-article') {
      if (!formData.videoUrl.trim()) {
        toast.error('Please enter a YouTube URL for video content');
        return;
      }
    }

    if (formData.contentType === 'article' || formData.contentType === 'video-article') {
      if (!formData.articleHtml.trim()) {
        toast.error('Please add article content');
        return;
      }
    }

    try {
      setSaving(true);

      // Get the current module
      const module = course.modules.find((m: any) => String(m._id) === String(moduleId));
      if (!module) {
        console.error('Module not found. moduleId:', moduleId, 'Available modules:', course.modules.map((m: any) => ({ id: m._id, title: m.title })));
        toast.error(`Module not found. Please go back and try again.`);
        return;
      }

      // Find the existing lesson to preserve its order
      let existingLessonOrder: number | undefined;
      if (!isNew) {
        const existingLesson = module.lessons.find((l: any) => String(l._id) === String(lessonId));
        existingLessonOrder = existingLesson?.order;
      }

      // Convert presigned URLs back to direct URLs for storage
      const articleContentForStorage = formData.articleContent
        ? convertToDirectUrls(formData.articleContent)
        : undefined;

      const lessonData = {
        title: formData.title,
        description: formData.description,
        contentType: formData.contentType,
        content: {
          videoUrl: formData.videoUrl || undefined,
          transcript: formData.transcript.length > 0 ? formData.transcript : undefined,
          articleContent: articleContentForStorage,
          articleHtml: formData.articleHtml || undefined,
        },
        duration: formData.duration,
        hasQuiz: formData.hasQuiz,
        order: isNew ? module.lessons.length : existingLessonOrder,
      };

      // Update the course with the new/updated lesson
      const updatedModules = course.modules.map((m: any) => {
        if (String(m._id) === String(moduleId)) {
          if (isNew) {
            return {
              ...m,
              lessons: [
                ...m.lessons,
                { ...lessonData, _id: `temp-${Date.now()}` },
              ],
            };
          } else {
            return {
              ...m,
              lessons: m.lessons.map((l: any) =>
                l._id === lessonId ? { ...l, ...lessonData } : l
              ),
            };
          }
        }
        return m;
      });

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: updatedModules }),
      });

      if (!response.ok) throw new Error('Failed to save lesson');

      setHasChanges(false);
      toast.success('Lesson saved successfully!');
      router.push(`/admin/courses/${courseId}`);
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(`/admin/courses/${courseId}`);
      }
    } else {
      router.push(`/admin/courses/${courseId}`);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <Button variant="ghost" onClick={handleCancel} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Course
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {isNew ? 'Create New Lesson' : 'Edit Lesson'}
              </h1>
              <p className="text-muted-foreground">{course.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Unsaved changes
                </Badge>
              )}
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Lesson
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lesson Title</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Sales Techniques"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief overview of what this lesson covers..."
                rows={3}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                placeholder="e.g., 15"
                value={formData.duration}
                onChange={(e) => {
                  setFormData({ ...formData, duration: parseInt(e.target.value) || 0 });
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Type */}
        <Card>
          <CardHeader>
            <CardTitle>Content Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.contentType}
              onValueChange={(value: any) => {
                setFormData({ ...formData, contentType: value });
                setHasChanges(true);
              }}
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                <RadioGroupItem value="video" id="video" />
                <Label htmlFor="video" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Video className="h-4 w-4" />
                  Video Only
                  <span className="text-sm text-muted-foreground ml-auto">
                    YouTube video with transcript
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                <RadioGroupItem value="article" id="article" />
                <Label htmlFor="article" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4" />
                  Article Only
                  <span className="text-sm text-muted-foreground ml-auto">
                    Rich text content
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-accent">
                <RadioGroupItem value="video-article" id="video-article" />
                <Label htmlFor="video-article" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Video className="h-4 w-4" />
                  <FileText className="h-4 w-4" />
                  Video + Article
                  <span className="text-sm text-muted-foreground ml-auto">
                    Both video and article content
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="quiz">Knowledge Check</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            {/* Video Content */}
            {(formData.contentType === 'video' || formData.contentType === 'video-article') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-red-500" />
                    YouTube Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">YouTube URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="videoUrl"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={formData.videoUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, videoUrl: e.target.value });
                          setHasChanges(true);
                        }}
                      />
                      <Button
                        onClick={handleFetchTranscript}
                        disabled={fetchingTranscript || !formData.videoUrl.trim()}
                      >
                        {fetchingTranscript ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          'Fetch Transcript'
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter a YouTube video URL. We'll automatically fetch the transcript.
                    </p>
                  </div>

                  {formData.transcript.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Transcript Preview</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTranscriptEditor()}
                        >
                          <Edit3 className="h-3 w-3 mr-2" />
                          View & Edit Full Transcript
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg bg-muted/50 max-h-64 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap">
                          {formData.transcript.map((t: any) => t.text).join(' ').substring(0, 500)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {formData.transcript.length} transcript segments
                        </Badge>
                        <Badge variant="outline">
                          {formData.transcript.map((t: any) => t.text).join(' ').split(/\s+/).length} words
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Article Content */}
            {(formData.contentType === 'article' || formData.contentType === 'video-article') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Article Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RTE
                    initialContent={formData.articleContent}
                    showSubmitButton={false}
                    onChange={(data) => {
                      setFormData({
                        ...formData,
                        articleContent: data.json,
                        articleHtml: data.html,
                      });
                      setHasChanges(true);
                    }}
                  />
                  <p className="text-sm text-muted-foreground mt-4">
                    Drag and drop images, paste from clipboard, or use the image toolbar button to add images.
                    All images are automatically uploaded to S3.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quiz" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Generation (Coming Soon)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 border-2 border-dashed rounded-lg text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">AI-Powered Quiz Generation</h3>
                  <p className="text-muted-foreground mb-4">
                    Quiz generation will be integrated with Lyzr AI agents to automatically create
                    assessment questions based on your lesson content.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transcript Editor Dialog */}
        <Dialog open={transcriptDialogOpen} onOpenChange={setTranscriptDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Transcript</DialogTitle>
              <DialogDescription>
                Review and edit the transcript. Changes will update the stored transcript for this lesson.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-4">
              <Textarea
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                rows={20}
                className="w-full font-mono text-sm"
                placeholder="Transcript content..."
              />
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>{editableTranscript.split(/\s+/).filter(w => w.length > 0).length} words</span>
                <span>{editableTranscript.length} characters</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTranscriptDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTranscript}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}

