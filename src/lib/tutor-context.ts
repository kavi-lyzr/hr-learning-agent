/**
 * Tutor Context Builder
 *
 * Builds dynamic system prompts for the Lyzr Tutor Agent.
 * The entire prompt is passed as a single system_prompt_variable to allow full flexibility.
 */

import User from '@/models/user';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import Lesson from '@/models/lesson';
import mongoose from 'mongoose';

/**
 * Context options for building the tutor prompt
 */
export interface TutorContextOptions {
  userId: string; // Lyzr ID
  organizationId: string;
  currentPage?: 'dashboard' | 'course-view' | 'lesson-view' | 'ai-assistant';
  courseId?: string; // MongoDB ObjectId string
  lessonId?: string; // MongoDB ObjectId string
}

/**
 * Base prompt template for the Tutor Agent
 */
const BASE_PROMPT = `You are an Expert Learning & Development Tutor at a corporate training organization. Your mission is to help employees understand course content, answer their questions, and guide them through their learning journey.

## Your Capabilities

1. **Content Expertise**: You have access to all course materials, lesson content, video transcripts, and quiz information through your tools.
2. **Progress Tracking**: You can check the learner's progress, completed lessons, quiz scores, and time spent on courses.
3. **Personalized Guidance**: You provide tailored advice based on the learner's current progress and learning goals.

## Your Guidelines

- Be friendly, encouraging, and patient
- Use clear, accessible language
- Provide specific examples when explaining concepts
- Break down complex topics into digestible pieces
- Encourage active learning through questions and practice
- Celebrate progress and achievements
- If you don't know something, be honest and guide them to resources
- Use your tools proactively to fetch relevant lesson content when needed
- Reference specific lessons, modules, or courses when giving guidance

## Important Notes

- When asked about a specific module or its lessons, use the get_module_content tool to fetch all materials in that module
- When asked about progress or completion status, use the get_user_progress tool
- Always provide context-aware responses based on where the learner is in their journey
- If content is not in the current context, use your tools to retrieve it before answering`;

/**
 * Sanitize HTML content to plain text
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build the complete system prompt for the Tutor Agent
 */
export async function buildTutorSystemPrompt(
  options: TutorContextOptions
): Promise<string> {
  const { userId, organizationId, currentPage, courseId, lessonId } = options;

  // Get user information
  const user = await User.findOne({ lyzrId: userId });
  if (!user) {
    throw new Error('User not found');
  }

  const userName = user.name || user.email.split('@')[0];
  const currentDateTime = new Date().toISOString();

  // Start building the prompt
  let prompt = BASE_PROMPT;

  // Add user context
  prompt += `\n\n## Current Learner\n\n- **Name**: ${userName}\n- **Date & Time**: ${currentDateTime}`;

  // Fetch enrolled courses with structure
  const enrollments = await Enrollment.find({
    userId: user._id,
    organizationId,
  })
    .populate({
      path: 'courseId',
      select: 'title description modules',
    })
    .lean();

  if (enrollments.length > 0) {
    prompt += `\n\n## Enrolled Courses\n\n`;
    prompt += `${userName} is currently enrolled in ${enrollments.length} course(s):\n\n`;

    for (const enrollment of enrollments) {
      const course = enrollment.courseId as any;
      if (!course) continue;

      prompt += `### ${course.title}\n`;
      prompt += `- **Course ID**: ${course._id}\n`;
      prompt += `- **Status**: ${enrollment.status}\n`;
      prompt += `- **Progress**: ${enrollment.progressPercentage}%\n`;
      prompt += `- **Completed Lessons**: ${enrollment.progress.completedLessonIds.length}\n`;

      // Add module structure for tool calling
      if (course.modules && course.modules.length > 0) {
        prompt += `- **Modules**:\n`;
        for (const module of course.modules) {
          // Module IDs are needed for get_module_content tool calls
          prompt += `  - [Module ID: ${module._id}] ${module.title} (${module.lessons?.length || 0} lessons)\n`;
          if (module.lessons && module.lessons.length > 0) {
            for (const lesson of module.lessons) {
              prompt += `    - ${lesson.title}\n`;
            }
          }
        }
      }
      prompt += '\n';
    }
  } else {
    prompt += `\n\n## Enrolled Courses\n\n${userName} is not currently enrolled in any courses.\n`;
  }

  // Add current page context
  prompt += `\n## Current Context\n\n`;

  switch (currentPage) {
    case 'dashboard':
      prompt += `${userName} is currently on their dashboard, viewing an overview of their learning progress.\n`;
      break;

    case 'course-view':
      if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
        const course = await Course.findById(courseId).lean();
        if (course) {
          prompt += `${userName} is currently viewing the course: **${course.title}**\n\n`;
          if (course.description) {
            prompt += `**Course Description**: ${course.description}\n\n`;
          }

          // Add detailed module and lesson structure
          if (course.modules && course.modules.length > 0) {
            prompt += `**Course Structure**:\n\n`;
            for (let i = 0; i < course.modules.length; i++) {
              const module = course.modules[i];
              prompt += `${i + 1}. **[Module ID: ${module._id}] ${module.title}**\n`;
              if (module.description) {
                prompt += `   ${module.description}\n`;
              }
              if (module.lessons && module.lessons.length > 0) {
                for (const lesson of module.lessons) {
                  prompt += `   - ${lesson.title}`;
                  if (lesson.contentType === 'video') {
                    const duration = (lesson as any).duration || 0;
                    prompt += ` (Video, ${duration} min)`;
                  } else {
                    prompt += ` (Article)`;
                  }
                  if (lesson.hasQuiz) {
                    prompt += ` ✓ Quiz`;
                  }
                  prompt += '\n';
                }
              }
              prompt += '\n';
            }
          }
        }
      }
      break;

    case 'lesson-view':
      if (lessonId && mongoose.Types.ObjectId.isValid(lessonId)) {
        const lesson = await Lesson.findById(lessonId)
          .populate('courseId', 'title')
          .populate('moduleId', 'title')
          .lean();

        if (lesson) {
          prompt += `${userName} is currently viewing a lesson:\n\n`;
          prompt += `- **Course**: ${(lesson.courseId as any)?.title || 'Unknown'}\n`;
          prompt += `- **Module**: ${(lesson.moduleId as any)?.title || 'Unknown'}\n`;
          prompt += `- **Lesson**: ${lesson.title}\n`;
          prompt += `- **Type**: ${lesson.contentType === 'video' ? 'Video' : 'Article'}\n`;

          if (lesson.description) {
            prompt += `- **Description**: ${lesson.description}\n`;
          }

          // Include lesson content for immediate context
          prompt += `\n**Current Lesson Content**:\n\n`;

          if (lesson.contentType === 'article' && lesson.contentData?.articleHtml) {
            const articleText = sanitizeHtml(lesson.contentData.articleHtml);
            // Limit to 5000 characters to avoid context overflow
            const truncatedText = articleText.length > 5000
              ? articleText.substring(0, 5000) + '...\n\n[Content truncated. Use get_module_content tool with Module ID: ' + (lesson.moduleId as any)?._id + ' for full content]'
              : articleText;
            prompt += truncatedText + '\n\n';
          }

          if (lesson.contentType === 'video') {
            prompt += `Video URL: ${lesson.contentData?.videoUrl || 'N/A'}\n`;
            prompt += `Duration: ${Math.round((lesson.contentData?.videoDuration || 0) / 60)} minutes\n\n`;

            if (lesson.contentData?.transcript) {
              const transcript = lesson.contentData.transcript;
              // Limit transcript to 5000 characters
              const truncatedTranscript = transcript.length > 5000
                ? transcript.substring(0, 5000) + '...\n\n[Transcript truncated. Use get_module_content tool with Module ID: ' + (lesson.moduleId as any)?._id + ' for full transcript]'
                : transcript;
              prompt += `**Video Transcript**:\n${truncatedTranscript}\n\n`;
            }
          }

          if (lesson.hasQuiz) {
            const numQuestions = lesson.quizData?.questions?.length || 0;
            prompt += `\n**Assessment**: This lesson includes a quiz with ${numQuestions} question(s).\n`;
          }
        }
      }
      break;

    case 'ai-assistant':
      prompt += `${userName} is on the AI Assistant page for general learning support and questions.\n`;
      break;

    default:
      prompt += `${userName} is accessing the learning platform.\n`;
  }

  // Add reminder about tool usage
  prompt += `\n\n## Tool Usage Reminder\n\n`;
  prompt += `- Use **get_module_content** when you need to fetch complete module materials (all lessons, articles, and transcripts)\n`;
  prompt += `- Use **get_user_progress** when asked about completion status, quiz scores, or learning progress\n`;
  prompt += `- Always include the Module ID when calling get_module_content (shown in brackets above as [Module ID: ...])\n`;

  return prompt;
}
