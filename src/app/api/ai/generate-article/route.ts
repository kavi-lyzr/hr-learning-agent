/**
 * POST /api/ai/generate-article
 *
 * Generates or refines lesson article content using Lyzr Content Generator Agent.
 * Returns Markdown format that can be converted to HTML/TipTap JSON.
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
      userQuery, // User's instructions/requirements
      existingContent, // Optional: existing content to refine
      wordCount = 600,
      tone = 'professional, engaging',
    } = body;

    // Validate required fields
    if (!organizationId || !userId || !lessonTitle || !userQuery) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'organizationId, userId, lessonTitle, and userQuery are required',
        },
        { status: 400 }
      );
    }

    // Get organization with content generator agent
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.contentGeneratorAgent?.agentId) {
      return NextResponse.json(
        {
          error: 'Content generator agent not configured',
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

    // Determine if this is a refinement or new content generation
    const isRefinement = existingContent && existingContent.trim().length > 0;

    // Build the prompt
    let prompt: string;

    if (isRefinement) {
      // Refine existing content
      const cleanExisting = existingContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      prompt = `You are refining existing lesson content based on the user's instructions.

**Lesson Title:** ${lessonTitle}

**User's Instructions:**
${userQuery}

**Existing Content:**
${cleanExisting}

**Requirements:**
- Follow the user's instructions carefully
- Maintain the core message and key concepts
- Target word count: approximately ${wordCount} words
- Tone: ${tone}
- Format the output in clean, well-structured Markdown
- Use headers (##, ###), lists, and **bold** for emphasis
- Keep paragraphs concise and readable
- Do not include a title (it will be added separately)

Provide the refined content in Markdown format.`;
    } else {
      // Generate new content from scratch
      prompt = `You are creating educational lesson content for a corporate learning platform.

**Lesson Title:** ${lessonTitle}

**User's Requirements:**
${userQuery}

**Specifications:**
- Target word count: approximately ${wordCount} words
- Tone: ${tone}
- Content should be educational, accurate, and actionable
- Include practical examples or scenarios where relevant
- Use clear, accessible language suitable for professional learners
- Format the output in clean, well-structured Markdown
- Use headers (##, ###), lists, and **bold** for emphasis
- Keep paragraphs concise and readable (3-4 sentences max)
- Do not include a title (it will be added separately)

Generate the lesson content in Markdown format.`;
    }

    console.log(`📝 Generating ${isRefinement ? 'refined' : 'new'} content with prompt length:`, prompt.length);

    // Call content generator agent
    const response = await chatWithLyzrAgent(
      ownerApiKey,
      organization.contentGeneratorAgent.agentId,
      prompt,
      userId, // User who requested generation
      {}, // No additional system prompt variables needed
      undefined // No session ID needed (one-shot generation)
    );

    console.log('✅ Content generation response received, length:', response.response.length);

    // The response should be Markdown text
    const markdownContent = response.response.trim();

    if (!markdownContent || markdownContent.length < 50) {
      console.error('Generated content too short:', markdownContent);
      return NextResponse.json(
        {
          error: 'Generated content is too short',
          details: 'The AI returned insufficient content. Please try again with more detailed requirements.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      content: markdownContent,
      format: 'markdown',
      wordCount: markdownContent.split(/\s+/).length,
      generatedAt: new Date().toISOString(),
      isRefinement,
    });

  } catch (error: any) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to generate article content',
      },
      { status: 500 }
    );
  }
}
