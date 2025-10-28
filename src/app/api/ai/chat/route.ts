/**
 * POST /api/ai/chat
 *
 * Chat with the Lyzr Tutor Agent.
 * Builds dynamic context-aware prompts and maintains conversation history.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import AgentSession from '@/models/agentSession';
import { chatWithLyzrAgent } from '@/lib/lyzr-services';
import { buildTutorSystemPrompt, TutorContextOptions } from '@/lib/tutor-context';
import { decrypt } from '@/lib/encryption';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const {
      message,
      organizationId,
      userId, // Lyzr ID
      sessionId, // Optional: reuse existing session
      context, // { currentPage, courseId, lessonId }
    } = body;

    // Validate required fields
    if (!message || !organizationId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'message, organizationId, and userId are required',
        },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message too long', details: 'Maximum 5000 characters' },
        { status: 400 }
      );
    }

    // Get organization with tutor agent
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.tutorAgent?.agentId) {
      return NextResponse.json(
        {
          error: 'Tutor agent not configured',
          details: 'Please contact support to set up AI agents for your organization',
        },
        { status: 503 }
      );
    }

    // Get user
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    // Build tutor context options
    const contextOptions: TutorContextOptions = {
      userId,
      organizationId: organizationId.toString(),
      currentPage: context?.currentPage || 'dashboard',
      courseId: context?.courseId,
      lessonId: context?.lessonId,
    };

    // Build dynamic system prompt
    console.log('🧠 Building tutor context...');
    const tutorPrompt = await buildTutorSystemPrompt(contextOptions);
    console.log('✅ Tutor prompt built, length:', tutorPrompt.length);

    // Call tutor agent with dynamic prompt
    console.log('💬 Sending message to Tutor Agent...');
    const response = await chatWithLyzrAgent(
      ownerApiKey,
      organization.tutorAgent.agentId,
      message,
      userId, // Lyzr user ID
      {
        prompt: tutorPrompt, // Dynamic prompt passed as system_prompt_variable
      },
      sessionId // Reuse session if provided
    );

    console.log('✅ Received response from Tutor Agent');

    const finalSessionId = response.session_id;
    const assistantResponse = response.response;

    // Store or update session in database
    let agentSession = await AgentSession.findOne({ sessionId: finalSessionId });

    if (agentSession) {
      // Update existing session
      agentSession.messages.push(
        {
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date(),
        }
      );
      agentSession.lastMessageAt = new Date();
      agentSession.context = {
        organizationId: mongoose.Types.ObjectId.createFromHexString(organizationId),
        courseId: context?.courseId ? mongoose.Types.ObjectId.createFromHexString(context.courseId) : undefined,
        lessonId: context?.lessonId ? mongoose.Types.ObjectId.createFromHexString(context.lessonId) : undefined,
        currentPage: context?.currentPage,
      };
      await agentSession.save();
    } else {
      // Create new session
      agentSession = new AgentSession({
        userId: user._id,
        sessionId: finalSessionId,
        agentType: 'tutor',
        context: {
          organizationId: mongoose.Types.ObjectId.createFromHexString(organizationId),
          courseId: context?.courseId ? mongoose.Types.ObjectId.createFromHexString(context.courseId) : undefined,
          lessonId: context?.lessonId ? mongoose.Types.ObjectId.createFromHexString(context.lessonId) : undefined,
          currentPage: context?.currentPage,
        },
        messages: [
          {
            role: 'user',
            content: message,
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: assistantResponse,
            timestamp: new Date(),
          },
        ],
        isActive: true,
        lastMessageAt: new Date(),
      });
      await agentSession.save();
    }

    console.log('✅ Session saved to database');

    return NextResponse.json({
      success: true,
      response: assistantResponse,
      sessionId: finalSessionId,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to process chat message',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/chat?userId=xxx&organizationId=xxx&sessionId=xxx
 *
 * Get chat history for a session or list recent sessions
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Lyzr ID
    const organizationId = searchParams.get('organizationId');
    const sessionId = searchParams.get('sessionId');

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: 'userId and organizationId are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If sessionId provided, return specific session
    if (sessionId) {
      const session = await AgentSession.findOne({
        sessionId,
        userId: user._id,
      }).lean();

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ session });
    }

    // Otherwise, return list of recent sessions
    const sessions = await AgentSession.find({
      userId: user._id,
      agentType: 'tutor',
      'context.organizationId': organizationId,
    })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({ sessions });

  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to fetch chat history',
      },
      { status: 500 }
    );
  }
}
