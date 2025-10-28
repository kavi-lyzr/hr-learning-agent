/**
 * POST /api/tools/get_lesson_content
 *
 * Tool endpoint for Lyzr Tutor Agent.
 * Fetches lesson content including article text and video transcript.
 * Requires x-token authentication from Lyzr agent tool calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Lesson from '@/models/lesson';
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

    // Fetch lesson
    const lesson = await Lesson.findById(lessonId).lean();

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Verify lesson belongs to the organization
    if (lesson.organizationId.toString() !== organizationId) {
      return NextResponse.json(
        { error: 'Lesson does not belong to this organization' },
        { status: 403 }
      );
    }

    // Extract article text from HTML (strip tags)
    let articleText = '';
    if (lesson.contentData?.articleHtml) {
      articleText = lesson.contentData.articleHtml
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Build response
    const response: any = {
      lessonId: lesson._id.toString(),
      title: lesson.title,
      description: lesson.description || '',
      contentType: lesson.contentType,
    };

    if (lesson.contentType === 'article') {
      response.articleText = articleText;
      response.wordCount = articleText.split(/\s+/).length;
    }

    if (lesson.contentType === 'video') {
      response.videoUrl = lesson.contentData?.videoUrl || '';
      response.videoDuration = lesson.contentData?.videoDuration || 0;

      if (includeTranscript && lesson.contentData?.transcript) {
        response.transcript = lesson.contentData.transcript;
      }
    }

    // Include quiz information if available
    if (lesson.hasQuiz && lesson.quizData) {
      response.hasQuiz = true;
      response.quizQuestionCount = lesson.quizData.questions?.length || 0;
    }

    console.log(`✅ Tool call: get_lesson_content - Returned lesson: ${lesson.title}`);

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
