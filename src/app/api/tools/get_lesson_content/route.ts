/**
 * POST /api/tools/get_lesson_content
 *
 * Tool endpoint for Lyzr Tutor Agent.
 * Fetches lesson content including article text and video transcript.
 * Requires x-token authentication from Lyzr agent tool calls.
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
    const { lessonId, includeTranscript = true } = body;

    // Validate lessonId
    if (!lessonId) {
      return NextResponse.json(
        { error: 'lessonId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return NextResponse.json(
        { error: 'Invalid lessonId format' },
        { status: 400 }
      );
    }

    // Find the lesson by searching through courses in this organization
    // Lessons are embedded in Course.modules[].lessons[]
    const courses = await Course.find({ organizationId }).lean();

    let foundLesson: any = null;
    let foundCourse: any = null;
    let foundModule: any = null;

    for (const course of courses) {
      if (!course.modules) continue;
      for (const module of course.modules as any[]) {
        if (!module.lessons) continue;
        const lesson = module.lessons.find(
          (l: any) => l._id?.toString() === lessonId
        );
        if (lesson) {
          foundLesson = lesson;
          foundCourse = course;
          foundModule = module;
          break;
        }
      }
      if (foundLesson) break;
    }

    if (!foundLesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Extract article text from HTML (strip tags)
    let articleText = '';
    if (foundLesson.content?.articleHtml) {
      articleText = foundLesson.content.articleHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Build response
    const response: any = {
      lessonId: foundLesson._id.toString(),
      title: foundLesson.title,
      description: foundLesson.description || '',
      contentType: foundLesson.contentType,
      courseId: foundCourse._id.toString(),
      courseTitle: foundCourse.title,
      moduleId: foundModule._id?.toString(),
      moduleTitle: foundModule.title,
    };

    if (foundLesson.contentType === 'article' || foundLesson.contentType === 'video-article') {
      response.articleText = articleText;
      response.wordCount = articleText.split(/\s+/).filter(Boolean).length;
    }

    if (foundLesson.contentType === 'video' || foundLesson.contentType === 'video-article') {
      response.videoUrl = foundLesson.content?.videoUrl || '';
      response.videoDuration = foundLesson.duration || 0;

      if (includeTranscript && foundLesson.content?.transcript) {
        response.transcript = foundLesson.content.transcript;
      }
    }

    // Include quiz information if available
    if (foundLesson.hasQuiz && foundLesson.quizData) {
      response.hasQuiz = true;
      response.quizQuestionCount = foundLesson.quizData.questions?.length || 0;
    }

    // Include assessment flag
    if (foundLesson.isModuleAssessment) {
      response.isModuleAssessment = true;
    }

    console.log(`✅ Tool call: get_lesson_content - Returned lesson: ${foundLesson.title}`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in get_lesson_content tool:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to fetch lesson content',
      },
      { status: 500 }
    );
  }
}
