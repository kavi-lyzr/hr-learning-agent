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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import RTE from "@/components/RTE";
import { convertToSignedUrls, convertToDirectUrls } from "@/lib/s3-utils";
import { estimateLessonDuration, calculateCourseDuration } from "@/lib/duration-utils";
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
  Wand2,
  RefreshCw,
  Trash2,
  Plus,
  Check,
  X,
} from "lucide-react";

interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

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
  quizData: {
    questions: QuizQuestion[];
  } | null;
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
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentPromptOpen, setContentPromptOpen] = useState(false);
  const [contentPrompt, setContentPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [rteKey, setRteKey] = useState(0); // Key to force RTE re-render
  const [quizConfigOpen, setQuizConfigOpen] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

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
    quizData: null,
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

        // Handle different article content formats
        if (articleContent) {
          // If articleContent is a string (HTML), use the HTML instead
          if (typeof articleContent === 'string') {
            console.log('⚠️  articleContent is a string, will use HTML fallback');
            articleContent = null; // TipTap will use HTML if JSON is null
          }
          // If it's an object with numeric keys (corrupted), use HTML fallback
          else if (typeof articleContent === 'object' && articleContent !== null) {
            // Check if it's a valid TipTap JSON structure
            if (!articleContent.type || !articleContent.content) {
              console.error('⚠️  Invalid articleContent structure, will use HTML fallback');
              articleContent = null;
            } else {
              // Valid JSON, convert S3 URLs
              try {
                articleContent = await convertToSignedUrls(articleContent);
              } catch (error) {
                console.error('Error converting S3 URLs to presigned URLs:', error);
                // Continue with original content if conversion fails
              }
            }
          }
        }

        // If articleContent is null but we have HTML, use HTML as initial content
        if (!articleContent && lesson.content.articleHtml) {
          console.log('📝 Using articleHtml as initial content');
          articleContent = lesson.content.articleHtml;
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
          quizData: lesson.quizData || null,
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

      // Normalize transcript format (new API returns string, old library returns array)
      let normalizedTranscript = data.transcript;
      if (typeof data.transcript === 'string') {
        // Convert string to array format for backward compatibility
        normalizedTranscript = [{ text: data.transcript, start: 0, duration: 0 }];
      }

      setFormData({ ...formData, transcript: normalizedTranscript });
      setHasChanges(true);
      toast.success('Transcript fetched successfully!');
      // Open the transcript editor automatically
      handleOpenTranscriptEditor(normalizedTranscript);
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

  const handleGenerateContent = async () => {
    if (!contentPrompt.trim()) {
      toast.error('Please enter a description or prompt');
      return;
    }

    try {
      setGeneratingContent(true);
      const organizationId = course.organizationId;
      const userId = 'admin'; // Admin user generating content

      const response = await fetch('/api/ai/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          userId,
          lessonTitle: formData.title || 'Untitled Lesson',
          userQuery: contentPrompt,
          existingContent: isRefining ? formData.articleHtml : '',
          wordCount: 600,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate content');
      }

      const data = await response.json();

      // Convert markdown to HTML using markdown-utils
      const { markdownToHtml } = await import('@/lib/markdown-utils');
      const htmlContent = markdownToHtml(data.content);

      // Set HTML content and wait for RTE to convert it to JSON
      // We pass HTML as initialContent, RTE will call onChange with JSON
      setFormData(prev => ({
        ...prev,
        articleHtml: htmlContent,
        articleContent: null, // Clear articleContent, force RTE to use HTML
      }));

      setHasChanges(true);
      setContentPromptOpen(false);
      setContentPrompt('');

      // Force RTE to re-render with new HTML content
      setRteKey(prev => prev + 1);

      toast.success(isRefining ? 'Content refined successfully!' : 'Content generated successfully!');
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || 'Failed to generate content');
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleGenerateQuiz = async (numQuestions = 3) => {
    // Validation
    const hasContent = formData.articleHtml.trim() || formData.transcript.length > 0;
    if (!hasContent) {
      toast.error('Please add lesson content (article or video) before generating a quiz');
      return;
    }

    try {
      setGeneratingQuiz(true);

      const organizationId = course.organizationId;
      const userId = 'admin'; // Admin user generating quiz

      const transcriptText = formData.transcript.map((t: any) => t.text).join(' ');

      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          userId,
          lessonTitle: formData.title || 'Untitled Lesson',
          lessonContent: formData.articleHtml,
          transcript: transcriptText,
          numQuestions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const data = await response.json();

      setFormData({
        ...formData,
        hasQuiz: true,
        quizData: { questions: data.quiz },
      });
      setHasChanges(true);
      toast.success(`Generated ${data.quiz.length} quiz questions!`);
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    if (!formData.quizData) return;

    const updatedQuestions = formData.quizData.questions.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      quizData: { questions: updatedQuestions },
      hasQuiz: updatedQuestions.length > 0,
    });
    setHasChanges(true);
    toast.success('Question deleted');
  };

  const handleUpdateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    if (!formData.quizData) return;

    const updatedQuestions = formData.quizData.questions.map((q, i) =>
      i === index ? { ...q, ...updates } : q
    );

    setFormData({
      ...formData,
      quizData: { questions: updatedQuestions },
    });
    setHasChanges(true);
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

      // Auto-estimate duration if not provided (0 or undefined)
      let finalDuration = formData.duration;
      if (!finalDuration || finalDuration === 0) {
        finalDuration = estimateLessonDuration({
          contentType: formData.contentType,
          duration: formData.duration,
          content: {
            articleHtml: formData.articleHtml,
            transcript: formData.transcript.length > 0 ? formData.transcript : undefined,
            videoUrl: formData.videoUrl,
          },
        });
        console.log(`📊 Auto-estimated lesson duration: ${finalDuration} minutes`);
      }

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
        duration: finalDuration,
        hasQuiz: formData.hasQuiz,
        quizData: formData.quizData || undefined,
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

      // Calculate total course duration from all lessons
      const totalCourseDuration = calculateCourseDuration(updatedModules);
      console.log(`📊 Total course duration: ${totalCourseDuration} minutes`);

      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modules: updatedModules,
          estimatedDuration: totalCourseDuration,
        }),
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

                    {/* YouTube Preview */}
                    {formData.videoUrl && getYouTubeVideoId(formData.videoUrl) && (
                      <div className="mt-4 rounded-lg overflow-hidden border bg-black/5">
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeVideoId(formData.videoUrl)}`}
                            title="YouTube video preview"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
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
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Article Content
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {formData.articleHtml.trim() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsRefining(true);
                            setContentPrompt('');
                            setContentPromptOpen(true);
                          }}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Refine with AI
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setIsRefining(false);
                          setContentPrompt('');
                          setContentPromptOpen(true);
                        }}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RTE
                    key={rteKey}
                    initialContent={formData.articleContent || formData.articleHtml}
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
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle>Knowledge Check Quiz</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add an assessment to test learner comprehension
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label htmlFor="enable-quiz" className="text-sm font-medium">
                      Enable Quiz
                    </Label>
                    <Switch
                      id="enable-quiz"
                      checked={formData.hasQuiz}
                      onCheckedChange={(checked) => {
                        if (!checked && formData.quizData?.questions && formData.quizData.questions.length > 0) {
                          if (!confirm('This will remove the quiz. Are you sure?')) {
                            return;
                          }
                        }
                        setFormData({
                          ...formData,
                          hasQuiz: checked,
                          quizData: checked ? formData.quizData : null,
                        });
                        setHasChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!formData.hasQuiz ? (
                  <div className="p-8 border-2 border-dashed rounded-lg text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Quiz Disabled</h3>
                    <p className="text-muted-foreground mb-4">
                      Enable the quiz toggle above to add a knowledge check to this lesson
                    </p>
                  </div>
                ) : !formData.quizData?.questions.length ? (
                  <div className="space-y-6">
                    <div className="p-8 border-2 border-dashed rounded-lg text-center">
                      <Wand2 className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Generate Quiz with AI</h3>
                      <p className="text-muted-foreground mb-6">
                        Our AI will analyze your lesson content and video transcript to create
                        relevant assessment questions automatically.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => setQuizConfigOpen(true)}
                          disabled={generatingQuiz || (!formData.articleHtml && !formData.transcript.length)}
                          size="lg"
                        >
                          {generatingQuiz ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Questions...
                            </>
                          ) : (
                            <>
                              <Wand2 className="h-4 w-4 mr-2" />
                              Generate Quiz Questions
                            </>
                          )}
                        </Button>
                      </div>
                      {(!formData.articleHtml && !formData.transcript.length) && (
                        <p className="text-sm text-amber-600 mt-4 flex items-center justify-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Add lesson content first (article or video with transcript)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Quiz Header Actions */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="font-medium">
                          {formData.quizData.questions.length} Question(s) Generated
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setQuizConfigOpen(true)}
                          disabled={generatingQuiz}
                          variant="outline"
                          size="sm"
                        >
                          {generatingQuiz ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Questions List */}
                    <div className="space-y-4">
                      {formData.quizData.questions.map((question, qIndex) => (
                        <Card key={qIndex}>
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline">Question {qIndex + 1}</Badge>
                                </div>
                                {editingQuestionIndex === qIndex ? (
                                  <Textarea
                                    value={question.questionText}
                                    onChange={(e) =>
                                      handleUpdateQuestion(qIndex, { questionText: e.target.value })
                                    }
                                    rows={2}
                                    className="font-medium"
                                  />
                                ) : (
                                  <p className="font-medium text-base">{question.questionText}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setEditingQuestionIndex(
                                      editingQuestionIndex === qIndex ? null : qIndex
                                    )
                                  }
                                >
                                  {editingQuestionIndex === qIndex ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Edit3 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteQuestion(qIndex)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Options */}
                            <div className="space-y-2">
                              {question.options.map((option, oIndex) => (
                                <div
                                  key={oIndex}
                                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                                    question.correctAnswerIndex === oIndex
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                      : 'border-border'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 pt-1">
                                    {question.correctAnswerIndex === oIndex ? (
                                      <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                        <Check className="h-3 w-3 text-white" />
                                      </div>
                                    ) : (
                                      <div
                                        className="h-5 w-5 rounded-full border-2 border-muted-foreground cursor-pointer hover:border-green-500"
                                        onClick={() =>
                                          handleUpdateQuestion(qIndex, { correctAnswerIndex: oIndex })
                                        }
                                      />
                                    )}
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {String.fromCharCode(65 + oIndex)}
                                    </span>
                                  </div>
                                  {editingQuestionIndex === qIndex ? (
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...question.options];
                                        newOptions[oIndex] = e.target.value;
                                        handleUpdateQuestion(qIndex, { options: newOptions });
                                      }}
                                      className="flex-1"
                                    />
                                  ) : (
                                    <span className="flex-1">{option}</span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Explanation */}
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                                Explanation
                              </Label>
                              {editingQuestionIndex === qIndex ? (
                                <Textarea
                                  value={question.explanation}
                                  onChange={(e) =>
                                    handleUpdateQuestion(qIndex, { explanation: e.target.value })
                                  }
                                  rows={2}
                                  className="bg-background"
                                />
                              ) : (
                                <p className="text-sm">{question.explanation}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Content Generation Dialog */}
        <Dialog open={contentPromptOpen} onOpenChange={setContentPromptOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isRefining ? 'Refine Article Content' : 'Generate Article Content'}
              </DialogTitle>
              <DialogDescription>
                {isRefining
                  ? 'Describe how you want to improve or modify the existing content.'
                  : 'Describe what you want the article to cover. Be specific about topics, key points, and target audience.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="content-prompt">
                  {isRefining ? 'Refinement Instructions' : 'Content Description'}
                </Label>
                <Textarea
                  id="content-prompt"
                  value={contentPrompt}
                  onChange={(e) => setContentPrompt(e.target.value)}
                  rows={6}
                  placeholder={
                    isRefining
                      ? 'e.g., Make it more concise, add examples about customer objections, improve the introduction...'
                      : 'e.g., Explain the key principles of active listening in sales conversations, include practical examples and common mistakes to avoid...'
                  }
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  The AI will use your lesson title "{formData.title || 'Untitled Lesson'}" as context.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContentPromptOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateContent} disabled={generatingContent || !contentPrompt.trim()}>
                {generatingContent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isRefining ? 'Refining...' : 'Generating...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {isRefining ? 'Refine Content' : 'Generate Content'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Quiz Configuration Dialog */}
        <Dialog open={quizConfigOpen} onOpenChange={setQuizConfigOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Quiz Generation</DialogTitle>
              <DialogDescription>
                Choose how many questions you want the AI to generate (2-20 questions).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions: {numQuestions}</Label>
                <Input
                  id="numQuestions"
                  type="range"
                  min={2}
                  max={20}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2</span>
                  <span>20</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose between 2 and 20 questions. More questions = better assessment but longer quiz.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setQuizConfigOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setQuizConfigOpen(false);
                  handleGenerateQuiz(numQuestions);
                }}
                disabled={generatingQuiz}
              >
                {generatingQuiz ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate {numQuestions} Questions
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Spacer for sticky bar */}
        <div className="h-20" />
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Unsaved changes
              </Badge>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {formData.title || 'Untitled Lesson'}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
    </main>
  );
}

