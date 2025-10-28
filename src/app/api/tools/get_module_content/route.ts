/**
 * POST /api/tools/get_module_content
 *
 * Tool endpoint for Lyzr Tutor Agent.
 * Fetches complete module content with all lessons including article text and video transcripts.
 * Requires x-token authentication from Lyzr agent tool calls.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Module from '@/models/module';
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

    // Fetch module
    const module = await Module.findById(moduleId).lean();

    if (!module) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      );
    }

    // Verify module belongs to the organization
    if (module.organizationId.toString() !== organizationId) {
      return NextResponse.json(
        { error: 'Module does not belong to this organization' },
        { status: 403 }
      );
    }

    // Fetch all lessons in this module
    const lessons = await Lesson.find({ moduleId: module._id })
      .sort({ order: 1 })
      .lean();

    // Process each lesson
    const processedLessons = lessons.map((lesson) => {
      const lessonData: any = {
        lessonId: lesson._id.toString(),
        title: lesson.title,
        description: lesson.description || '',
        contentType: lesson.contentType,
        order: lesson.order,
      };

      // Extract article text from HTML (strip tags)
      if (lesson.contentType === 'article' && lesson.contentData?.articleHtml) {
        const articleText = lesson.contentData.articleHtml
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        lessonData.articleText = articleText;
        lessonData.wordCount = articleText.split(/\s+/).length;
      }

      // Always include video transcript if available
      if (lesson.contentType === 'video') {
        lessonData.videoUrl = lesson.contentData?.videoUrl || '';
        lessonData.videoDuration = lesson.contentData?.videoDuration || 0;

        if (lesson.contentData?.transcript) {
          lessonData.transcript = lesson.contentData.transcript;
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
      moduleId: module._id.toString(),
      moduleTitle: module.title,
      moduleDescription: module.description || '',
      lessonCount: processedLessons.length,
      lessons: processedLessons,
    };

    console.log(`✅ Tool call: get_module_content - Returned module: ${module.title} with ${processedLessons.length} lessons`);

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
