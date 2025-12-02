/**
 * POST /api/ai/generate-quiz
 *
 * Generates quiz questions from lesson content using Lyzr Quiz Generator Agent.
 * Uses structured output to ensure consistent format.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import { chatWithLyzrAgent } from '@/lib/lyzr-services';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      organizationId,
      userId, // Lyzr ID
      lessonTitle,
      lessonContent, // HTML or plain text
      transcript, // Optional video transcript
      numQuestions = 3,
    } = body;

    // Validate required fields
    if (!organizationId || !userId || !lessonTitle || !lessonContent) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'organizationId, userId, lessonTitle, and lessonContent are required',
        },
        { status: 400 }
      );
    }

    // Validate numQuestions
    if (numQuestions < 2 || numQuestions > 20) {
      return NextResponse.json(
        {
          error: 'Invalid numQuestions',
          details: 'numQuestions must be between 2 and 20',
        },
        { status: 400 }
      );
    }

    // Get organization with quiz generator agent
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.quizGeneratorAgent?.agentId) {
      return NextResponse.json(
        {
          error: 'Quiz generator agent not configured',
          details: 'Please contact support to set up AI agents for your organization',
        },
        { status: 503 }
      );
    }

    // Get owner's API key
    const owner = await User.findById(organization.ownerId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Organization owner not found' },
        { status: 404 }
      );
    }

    const ownerApiKey = decrypt(owner.lyzrApiKey);

    // Strip HTML tags from content if present
    const cleanContent = lessonContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Build the prompt for quiz generation
    const prompt = `Generate ${numQuestions} multiple-choice quiz questions to assess understanding of the following lesson.

**Lesson Title:** ${lessonTitle}

**Lesson Content:**
${cleanContent}

${transcript ? `\n**Video Transcript:**\n${transcript}\n` : ''}

**Requirements:**
- Create exactly ${numQuestions} questions
- Each question must have exactly 4 answer options
- Questions should test understanding, not just memorization
- Cover different aspects of the lesson content
- Include clear explanations for correct answers
- Make distractors (incorrect options) plausible but clearly wrong
- Vary question difficulty (mix of easier and more challenging questions)

Generate the quiz questions in the required JSON format.`;

    console.log('🎯 Generating quiz with prompt length:', prompt.length);

    // Call quiz generator agent with structured output
    const response = await chatWithLyzrAgent(
      ownerApiKey,
      organization.quizGeneratorAgent.agentId,
      prompt,
      userId, // User who requested generation
      {}, // No additional system prompt variables needed
      undefined // No session ID needed (one-shot generation)
    );

    console.log('✅ Quiz generation response received');

    // Parse the structured output
    let quizData;
    try {
      // The response should be JSON due to structured output
      quizData = JSON.parse(response.response);
    } catch (parseError) {
      console.error('Failed to parse quiz response:', response.response);
      return NextResponse.json(
        {
          error: 'Failed to parse quiz response',
          details: 'The AI returned invalid JSON. Please try again.',
        },
        { status: 500 }
      );
    }

    // Validate the quiz structure
    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      console.error('Invalid quiz structure:', quizData);
      return NextResponse.json(
        {
          error: 'Invalid quiz structure',
          details: 'The AI returned an invalid quiz format. Please try again.',
        },
        { status: 500 }
      );
    }

    // Normalize and validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];

      // Handle both correctAnswer and correctAnswerIndex (AI sometimes uses wrong field name)
      if (q.correctAnswer !== undefined && q.correctAnswerIndex === undefined) {
        console.log(`⚠️  Normalizing question ${i}: correcting 'correctAnswer' to 'correctAnswerIndex'`);
        q.correctAnswerIndex = q.correctAnswer;
        delete q.correctAnswer;
      }

      // Handle both question and questionText (AI sometimes uses 'question' instead of 'questionText')
      if (q.question !== undefined && q.questionText === undefined) {
        console.log(`⚠️  Normalizing question ${i}: correcting 'question' to 'questionText'`);
        q.questionText = q.question;
        delete q.question;
      }

      if (
        !q.questionText ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.correctAnswerIndex !== 'number' ||
        q.correctAnswerIndex < 0 ||
        q.correctAnswerIndex > 3 ||
        !q.explanation
      ) {
        console.error('Invalid question structure at index', i, q);
        return NextResponse.json(
          {
            error: 'Invalid question structure',
            details: `Question ${i + 1} has an invalid structure. Please try again.`,
          },
          { status: 500 }
        );
      }
    }

    console.log(`✅ Generated ${quizData.questions.length} valid quiz questions`);

    return NextResponse.json({
      success: true,
      quiz: quizData.questions,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to generate quiz',
      },
      { status: 500 }
    );
  }
}
