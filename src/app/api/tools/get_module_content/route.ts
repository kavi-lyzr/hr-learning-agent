/**
 * POST /api/tools/get_module_content
 *
 * Tool endpoint for Lyzr Tutor Agent.
 * Fetches complete module content with all lessons including article text and video transcripts.
 * Requires x-token authentication from Lyzr agent tool calls.
 *
 * NOTE: Modules and lessons are EMBEDDED in the Course document, not separate collections.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import { validateToolToken } from '@/lib/middleware/tool-auth';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    // Validate tool authentication
    const authResult = validateToolToken(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { organizationId } = authResult.context!;

    // Parse request body
    const body = await request.json();
    const { moduleId } = body;

    // Validate moduleId
    if (!moduleId) {
      return NextResponse.json(
        { error: 'moduleId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return NextResponse.json(
        { error: 'Invalid moduleId format' },
        { status: 400 }
      );
    }

    // Find the course that contains this module (modules are embedded)
    const course = await Course.findOne({
      organizationId,
      'modules._id': moduleId
    }).lean();

    if (!course) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Extract the specific module from the modules array
    const module = course.modules.find((m: any) => m._id.toString() === moduleId);

    if (!module) {
      return NextResponse.json(
        { error: 'Module not found in course' },
        { status: 404 }
      );
    }

    // Helper function to sanitize HTML to plain text
    function sanitizeHtml(html: string): string {
      if (!html) return '';
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Process each lesson (lessons are embedded in the module)
    const processedLessons = (module.lessons || []).map((lesson: any) => {
      const lessonData: any = {
        lessonId: lesson._id.toString(),
        title: lesson.title,
        description: lesson.description || '',
        contentType: lesson.contentType,
        order: lesson.order,
      };

      // Extract article text from HTML (strip tags)
      if ((lesson.contentType === 'article' || lesson.contentType === 'video-article') && lesson.content?.articleHtml) {
        const articleText = sanitizeHtml(lesson.content.articleHtml);
        lessonData.articleText = articleText;
        lessonData.wordCount = articleText.split(/\s+/).length;
      }

      // Include video information and transcript if available
      if ((lesson.contentType === 'video' || lesson.contentType === 'video-article')) {
        lessonData.videoUrl = lesson.content?.videoUrl || '';
        lessonData.videoDuration = lesson.duration || 0;

        // Transcript is an array of {text, start, duration} objects
        if (lesson.content?.transcript && Array.isArray(lesson.content.transcript)) {
          // Join all transcript text segments
          const transcriptText = lesson.content.transcript
            .map((t: any) => t.text)
            .join(' ');
          lessonData.transcript = transcriptText;
        }
      }

      // Include quiz information if available
      if (lesson.hasQuiz && lesson.quizData) {
        lessonData.hasQuiz = true;
        lessonData.quizQuestionCount = lesson.quizData.questions?.length || 0;
      } else {
        lessonData.hasQuiz = false;
      }

      return lessonData;
    });

    // Build response
    const response = {
      courseId: course._id.toString(),
      courseTitle: course.title,
      moduleId: (module._id as mongoose.Types.ObjectId)?.toString() || '',
      moduleTitle: module.title,
      moduleDescription: module.description || '',
      lessonCount: processedLessons.length,
      lessons: processedLessons,
    };

    console.log(`✅ Tool call: get_module_content - Returned module: "${module.title}" from course: "${course.title}" with ${processedLessons.length} lessons`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in get_module_content tool:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to fetch module content',
      },
      { status: 500 }
    );
  }
}
