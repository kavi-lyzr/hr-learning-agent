/**
 * POST /api/ai/chat/stream
 *
 * Stream chat with the Lyzr Tutor Agent.
 * Builds dynamic context-aware prompts and streams the response.
 */

import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import AgentSession from '@/models/agentSession';
import { streamChatWithAgent } from '@/lib/lyzr-services';
import { buildTutorSystemPrompt, TutorContextOptions } from '@/lib/tutor-context';
import { decrypt } from '@/lib/encryption';
import mongoose from 'mongoose';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
            assetIds, // Optional: file attachments
            attachments, // Optional: file metadata
        } = body;

        // Validate required fields
        if (!message || !organizationId || !userId) {
            return new Response(
                JSON.stringify({
                    error: 'Missing required fields',
                    details: 'message, organizationId, and userId are required',
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Validate message length
        if (message.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Message cannot be empty' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // if (message.length > 5000) {
        //     return new Response(
        //         JSON.stringify({ error: 'Message too long', details: 'Maximum 5000 characters' }),
        //         { status: 400, headers: { 'Content-Type': 'application/json' } }
        //     );
        // }

        // Get organization with tutor agent
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return new Response(
                JSON.stringify({ error: 'Organization not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        if (!organization.tutorAgent?.agentId) {
            return new Response(
                JSON.stringify({
                    error: 'Tutor agent not configured',
                    details: 'Please contact support to set up AI agents for your organization',
                }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get user
        const user = await User.findOne({ lyzrId: userId });
        if (!user) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Get owner's API key
        const owner = await User.findById(organization.ownerId);
        if (!owner) {
            return new Response(
                JSON.stringify({ error: 'Organization owner not found' }),
                { status: 404, headers: { 'Content-Type': 'application/json' } }
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

        console.log('📥 Stream chat request context:', JSON.stringify({
            currentPage: contextOptions.currentPage,
            courseId: contextOptions.courseId,
            lessonId: contextOptions.lessonId,
            assetIds: assetIds || [],
            attachmentCount: attachments?.length || 0,
        }, null, 2));

        // Build dynamic system prompt
        console.log('🧠 Building tutor context...');
        const tutorPrompt = await buildTutorSystemPrompt(contextOptions);
        console.log('✅ Tutor prompt built, length:', tutorPrompt.length);

        // Generate session ID if not provided
        const finalSessionId = sessionId || `${organization.tutorAgent.agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Call tutor agent with streaming
        console.log('💬 Streaming message to Tutor Agent...');
        const lyzrStream = await streamChatWithAgent(
            ownerApiKey,
            organization.tutorAgent.agentId,
            message,
            userId, // Lyzr user ID
            {
                prompt: tutorPrompt,
                user_id: userId,
            },
            finalSessionId,
            assetIds // Pass asset IDs for file attachments
        );

        // Create a TransformStream to process the Lyzr stream and collect the full response
        let fullResponse = '';
        const userRef = user;
        const orgId = organizationId;
        const contextRef = context;
        const attachmentsRef = attachments;

        const transformStream = new TransformStream({
            async transform(chunk, controller) {
                const text = new TextDecoder().decode(chunk);

                // Parse incoming SSE from Lyzr - it comes as "data: <content>\n\n"
                const lines = text.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        // Extract the actual content after "data: "
                        const content = line.slice(6);
                        if (content.trim() && content !== '[DONE]' && !content.includes('[DONE]')) {
                            fullResponse += content;
                            // Re-emit as clean SSE: data: <content>
                            controller.enqueue(new TextEncoder().encode(`data: ${content}\n\n`));
                        }
                    } else if (line.trim() && !line.startsWith(':') && line !== '[DONE]' && !line.includes('[DONE]')) {
                        // Handle raw content (not SSE formatted)
                        fullResponse += line;
                        controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
                    }
                }
            },
            async flush(controller) {
                // Send completion event
                controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));

                // Save session to database after stream completes
                try {
                    await dbConnect();

                    let agentSession = await AgentSession.findOne({ sessionId: finalSessionId });

                    if (agentSession) {
                        agentSession.messages.push(
                            {
                                role: 'user',
                                content: message,
                                timestamp: new Date(),
                                attachments: attachmentsRef,
                            },
                            {
                                role: 'assistant',
                                content: fullResponse,
                                timestamp: new Date(),
                            }
                        );
                        agentSession.lastMessageAt = new Date();
                        agentSession.context = {
                            organizationId: mongoose.Types.ObjectId.createFromHexString(orgId),
                            courseId: contextRef?.courseId ? mongoose.Types.ObjectId.createFromHexString(contextRef.courseId) : undefined,
                            lessonId: contextRef?.lessonId ? mongoose.Types.ObjectId.createFromHexString(contextRef.lessonId) : undefined,
                            currentPage: contextRef?.currentPage,
                        };
                        await agentSession.save();
                    } else {
                        agentSession = new AgentSession({
                            userId: userRef._id,
                            sessionId: finalSessionId,
                            agentType: 'tutor',
                            context: {
                                organizationId: mongoose.Types.ObjectId.createFromHexString(orgId),
                                courseId: contextRef?.courseId ? mongoose.Types.ObjectId.createFromHexString(contextRef.courseId) : undefined,
                                lessonId: contextRef?.lessonId ? mongoose.Types.ObjectId.createFromHexString(contextRef.lessonId) : undefined,
                                currentPage: contextRef?.currentPage,
                            },
                            messages: [
                                {
                                    role: 'user',
                                    content: message,
                                    timestamp: new Date(),
                                    attachments: attachmentsRef,
                                },
                                {
                                    role: 'assistant',
                                    content: fullResponse,
                                    timestamp: new Date(),
                                },
                            ],
                            isActive: true,
                            lastMessageAt: new Date(),
                        });
                        await agentSession.save();
                    }
                    console.log('✅ Session saved to database after stream complete');
                } catch (error) {
                    console.error('Error saving session after stream:', error);
                }
            }
        });

        // Pipe the Lyzr stream through the transform
        const responseStream = lyzrStream.pipeThrough(transformStream);

        return new Response(responseStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Session-Id': finalSessionId,
            },
        });

    } catch (error: unknown) {
        console.error('Error in stream chat endpoint:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process chat message';
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                details: errorMessage,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}