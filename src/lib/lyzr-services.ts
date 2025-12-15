/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lyzr Agent Services for L&D Platform
 *
 * This module handles all interactions with the Lyzr Agent API:
 * - Agent creation and updates
 * - Version management
 * - User-agent orchestration
 */

import mongoose from 'mongoose';
import User, { IUser } from '@/models/user';
import Organization from '@/models/organization';
import { encrypt, decrypt } from '@/lib/encryption';
import {
    LATEST_TUTOR_AGENT_VERSION,
    LATEST_QUIZ_GENERATOR_AGENT_VERSION,
    LATEST_CONTENT_GENERATOR_AGENT_VERSION,
    LATEST_TOOL_VERSION,
    TUTOR_AGENT_CONFIG,
    QUIZ_GENERATOR_AGENT_CONFIG,
    CONTENT_GENERATOR_AGENT_CONFIG,
} from './agent-config';

// Lyzr API endpoints
const LYZR_AGENT_BASE_URL = 'https://agent-prod.studio.lyzr.ai';
const AGENT_CREATION_ENDPOINT = `${LYZR_AGENT_BASE_URL}/v3/agents/`;
const AGENT_UPDATE_ENDPOINT = (agentId: string) => `${LYZR_AGENT_BASE_URL}/v3/agents/${agentId}`;

// --- Tool Descriptions ---

/**
 * Descriptions for Tutor agent tools (used in tool_configs action_names)
 */
const TOOL_DESCRIPTIONS = {
    get_module_content: "Use this tool when the user asks about specific lesson content, module materials, or wants to know what topics are covered in a module. This tool fetches all lessons in a module including article text and video transcripts. Always call this tool when you need to reference or explain specific lesson materials.",
    get_user_progress: "Use this tool when the user asks about their learning progress, completion status, quiz scores, or time spent on courses. This tool retrieves enrollment information, completed lessons, and quiz attempt data. Call this tool to check what courses they're enrolled in, which lessons they've completed, or how they performed on quizzes."
};

/**
 * Get the appropriate tool description based on tool ID
 */
function getToolDescription(toolId: string): string {
    if (toolId.includes('get_module_content')) {
        return TOOL_DESCRIPTIONS.get_module_content;
    } else if (toolId.includes('get_user_progress')) {
        return TOOL_DESCRIPTIONS.get_user_progress;
    }
    return "Use this tool as needed";
}

// --- Agent Management ---

/**
 * Create a new Lyzr agent
 */
async function createLyzrAgent(apiKey: string, agentConfig: any, organizationName?: string, toolIds?: string[]): Promise<string> {
    // Remove agentType and tools from payload (internal use only)
    const { agentType, tools, ...configPayload } = agentConfig;

    // Add organization suffix to agent name if provided
    const agentName = organizationName
        ? `${agentConfig.name} - ${organizationName}`
        : agentConfig.name;

    // Create tool_configs array with action descriptions for each tool
    const toolConfigs = toolIds ? toolIds.map(toolId => ({
        tool_name: toolId,
        tool_source: "openapi",
        action_names: [getToolDescription(toolId)],
        persist_auth: false
    })) : [];

    const payload: any = {
        ...configPayload,
        name: agentName,
        store_messages: true, // Enable message storage for conversation history
    };

    // Only add tool_configs if tools are actually provided (don't send empty array or field at all)
    if (toolConfigs.length > 0) {
        payload.tool_configs = toolConfigs;
    }

    console.log(`Creating ${agentType} agent: ${agentName}`);
    if (toolIds && toolIds.length > 0) {
        console.log(`Attaching ${toolIds.length} tools:`, toolIds);
        console.log(`Tool configs:`, toolConfigs);
    }

    const response = await fetch(AGENT_CREATION_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to create ${agentType} agent:`, response.status, errorText);
        throw new Error(`Failed to create ${agentName}: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`Successfully created ${agentType} agent with ID: ${data.agent_id}`);
    return data.agent_id;
}

/**
 * Update an existing Lyzr agent
 */
async function updateLyzrAgent(apiKey: string, agentId: string, agentConfig: any, organizationName?: string, toolIds?: string[]): Promise<void> {
    // Remove agentType and tools from payload (internal use only)
    const { agentType, tools, ...configPayload } = agentConfig;

    // Add organization suffix to agent name if provided
    const agentName = organizationName
        ? `${agentConfig.name} - ${organizationName}`
        : agentConfig.name;

    // Create tool_configs array with action descriptions for each tool (if tools provided)
    const toolConfigs = toolIds ? toolIds.map(toolId => ({
        tool_name: toolId,
        tool_source: "openapi",
        action_names: [getToolDescription(toolId)],
        persist_auth: false
    })) : undefined;

    const payload: any = {
        ...configPayload,
        name: agentName,
        store_messages: true,
    };

    // Only add tool_configs if tools are provided
    if (toolConfigs && toolConfigs.length > 0) {
        payload.tool_configs = toolConfigs;
    }

    console.log(`Updating ${agentType} agent: ${agentId} with name: ${agentName}`);

    const response = await fetch(AGENT_UPDATE_ENDPOINT(agentId), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to update ${agentType} agent:`, response.status, errorText);
        throw new Error(`Failed to update ${agentName}: ${response.status} ${errorText}`);
    }

    console.log(`Successfully updated ${agentType} agent: ${agentId} with name: ${agentName}`);
}

// --- User Management (Simple - No Agents) ---

/**
 * Create or update user WITHOUT creating agents
 * Agents are created when the user creates an organization
 */
export async function createOrUpdateUser(
    lyzrUser: { id: string; email: string; name?: string },
    lyzrApiKey: string
): Promise<IUser> {
    const encryptedApiKey = encrypt(lyzrApiKey);

    // Check if user exists
    let user = await User.findOne({ lyzrId: lyzrUser.id });

    if (user) {
        // Update existing user's API key
        console.log(`Updating existing user: ${user.email}`);
        user.lyzrApiKey = encryptedApiKey;

        // Update name if provided
        if (lyzrUser.name) {
            user.name = lyzrUser.name;
        }

        await user.save();
    } else {
        // Create new user
        console.log(`Creating new user: ${lyzrUser.email}`);
        const newUser = new User({
            lyzrId: lyzrUser.id,
            email: lyzrUser.email,
            name: lyzrUser.name || lyzrUser.email.split('@')[0],
            lyzrApiKey: encryptedApiKey,
        });

        await newUser.save();
        console.log(`Successfully created user: ${newUser.email}`);
        user = newUser;
    }

    // CRITICAL: Link user to any pending organization invitations
    // When an admin invites an employee, an OrganizationMember record is created with email but no userId
    // When that employee logs in, we need to link them to that invitation
    const OrganizationMember = (await import('@/models/organizationMember')).default;
    const Department = (await import('@/models/department')).default;
    const Enrollment = (await import('@/models/enrollment')).default;
    const Course = (await import('@/models/course')).default;
    const Organization = (await import('@/models/organization')).default;
    const { sendCourseAssignmentEmail } = await import('@/lib/email-service');

    const pendingInvitations = await OrganizationMember.find({
        email: lyzrUser.email.toLowerCase(),
        userId: { $exists: false } // Find invitations without userId
    });

    if (pendingInvitations.length > 0) {
        console.log(`🔗 Found ${pendingInvitations.length} pending invitation(s) for ${lyzrUser.email}`);

        // Link all invitations to this user and handle auto-enrollment
        for (const invitation of pendingInvitations) {
            invitation.userId = user._id as mongoose.Types.ObjectId;
            invitation.status = 'active'; // Change from 'invited' to 'active'
            await invitation.save();
            console.log(`✅ Linked user to organization: ${invitation.organizationId}`);

            // Auto-enroll in department courses if applicable
            if (invitation.departmentId && invitation.role === 'employee') {
                try {
                    const department = await Department.findById(invitation.departmentId);
                    
                    if (department && department.autoEnroll && department.defaultCourseIds?.length > 0) {
                        console.log(`📚 Auto-enrolling ${lyzrUser.email} in ${department.defaultCourseIds.length} department courses`);
                        
                        const organization = await Organization.findById(invitation.organizationId);
                        
                        for (const courseId of department.defaultCourseIds) {
                            // Check if already enrolled
                            const existingEnrollment = await Enrollment.findOne({
                                userId: user._id,
                                courseId: courseId,
                            });

                            if (existingEnrollment) {
                                console.log(`⏭️  Already enrolled in course ${courseId}`);
                                continue;
                            }

                            // Get course details
                            const course = await Course.findById(courseId);
                            if (!course) {
                                console.warn(`⚠️  Course ${courseId} not found, skipping`);
                                continue;
                            }

                            // Create enrollment
                            const enrollment = new Enrollment({
                                userId: user._id,
                                courseId: courseId,
                                organizationId: invitation.organizationId,
                                status: 'not-started',
                                progressPercentage: 0,
                                progress: {
                                    completedLessonIds: [],
                                },
                                enrolledAt: new Date(),
                            });

                            await enrollment.save();
                            console.log(`✅ Auto-enrolled in course: ${course.title}`);

                            // Send course assignment email
                            try {
                                const courseLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/employee/courses/${courseId}`;
                                await sendCourseAssignmentEmail(
                                    user,
                                    course,
                                    courseLink,
                                    organization?.name
                                );
                                console.log(`📧 Course assignment email sent for: ${course.title}`);
                            } catch (emailError) {
                                console.error('Failed to send course assignment email:', emailError instanceof Error ? emailError.message : 'Unknown error');
                                // Don't fail the enrollment if email fails
                            }
                        }
                    }
                } catch (enrollError) {
                    console.error('Error during auto-enrollment:', enrollError);
                    // Don't fail the user activation if enrollment fails
                }
            }
        }
    }

    return user;
}

// --- Tool Management ---

/**
 * Create tools for Tutor agent
 * Returns array of tool IDs
 */
export async function createTutorTools(
    ownerApiKey: string,
    organizationId: string,
    organizationName: string
): Promise<string[]> {
    const toolSetName = `tutor_tools_${organizationId}`;

    // Create encrypted context token for tool authentication
    const contextToken = encrypt(JSON.stringify({
        organizationId,
        organizationName,
    }));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const toolsSpec = {
        openapi: "3.0.0",
        info: {
            title: "Lyzr Tutor Tools API",
            version: "1.0.0",
            description: "Tools for the Lyzr Learning Tutor Agent"
        },
        servers: [
            {
                url: appUrl,
                description: "Main application server"
            }
        ],
        paths: {
            "/api/tools/get_module_content": {
                post: {
                    summary: "Get complete module content with all lessons",
                    operationId: "get_module_content",
                    description: "Fetches all lessons in a module including article text and video transcripts",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["moduleId"],
                                    properties: {
                                        moduleId: {
                                            type: "string",
                                            description: "The MongoDB ObjectId of the module"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Module content retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            moduleId: { type: "string" },
                                            moduleTitle: { type: "string" },
                                            moduleDescription: { type: "string" },
                                            lessons: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        lessonId: { type: "string" },
                                                        title: { type: "string" },
                                                        description: { type: "string" },
                                                        contentType: { type: "string" },
                                                        articleText: { type: "string" },
                                                        transcript: { type: "string" },
                                                        hasQuiz: { type: "boolean" }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/tools/get_user_progress": {
                post: {
                    summary: "Get user's learning progress",
                    operationId: "get_user_progress",
                    description: "Fetches user's progress for courses, lessons, and quiz attempts",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    required: ["userId"],
                                    properties: {
                                        userId: {
                                            type: "string",
                                            description: "The user's Lyzr ID"
                                        },
                                        courseId: {
                                            type: "string",
                                            description: "Optional: Filter by specific course"
                                        },
                                        moduleId: {
                                            type: "string",
                                            description: "Optional: Get progress for specific module"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        "200": {
                            description: "Progress data retrieved successfully",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            enrollments: { type: "array" },
                                            lessonProgress: { type: "object" },
                                            quizAttempts: { type: "array" }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    const requestData = {
        tool_set_name: toolSetName,
        openapi_schema: toolsSpec,
        default_headers: {
            'x-token': contextToken,
        },
        default_query_params: {},
        default_body_params: {},
        endpoint_defaults: {},
        enhance_descriptions: false,
        openai_api_key: null,
    };

    console.log(`Creating tools for Tutor agent: ${toolSetName}`);

    const response = await fetch(`${LYZR_AGENT_BASE_URL}/v3/tools/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ownerApiKey,
        },
        body: JSON.stringify(requestData),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create tools:', response.status, errorText);
        throw new Error(`Failed to create tutor tools: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Tool creation response:', data);

    // Extract tool names from the response (tool_ids contains tool objects with 'name' field)
    const toolNames = data.tool_ids ? data.tool_ids.map((tool: any) => tool.name) : [];
    console.log('Extracted tool names:', toolNames);

    return toolNames;
}

// --- Organization Agent Creation ---

/**
 * Create all 3 Lyzr agents for an organization
 * Returns agent IDs to be stored in the Organization document
 */
export async function createAgentsForOrganization(
    ownerApiKey: string,
    organizationId: string,
    organizationName: string
): Promise<{
    tutorAgent: { agentId: string; version: string; toolIds: string[]; toolVersion: string };
    quizGeneratorAgent: { agentId: string; version: string };
    contentGeneratorAgent: { agentId: string; version: string };
}> {
    console.log(`Creating Lyzr agents for organization: ${organizationName}`);

    // Create tools for Tutor agent
    console.log('Creating tools for Tutor agent...');
    const toolIds = await createTutorTools(ownerApiKey, organizationId, organizationName);
    console.log(`✅ Successfully created ${toolIds.length} tools:`, toolIds);

    // Create all 3 agents in parallel for speed
    const [tutorAgentId, quizGeneratorAgentId, contentGeneratorAgentId] = await Promise.all([
        createLyzrAgent(ownerApiKey, TUTOR_AGENT_CONFIG, organizationName, toolIds),
        createLyzrAgent(ownerApiKey, QUIZ_GENERATOR_AGENT_CONFIG, organizationName),
        createLyzrAgent(ownerApiKey, CONTENT_GENERATOR_AGENT_CONFIG, organizationName),
    ]);

    console.log(`✅ Successfully created all agents for organization: ${organizationName}`);

    return {
        tutorAgent: {
            agentId: tutorAgentId,
            version: LATEST_TUTOR_AGENT_VERSION,
            toolIds,
            toolVersion: LATEST_TOOL_VERSION,
        },
        quizGeneratorAgent: {
            agentId: quizGeneratorAgentId,
            version: LATEST_QUIZ_GENERATOR_AGENT_VERSION,
        },
        contentGeneratorAgent: {
            agentId: contentGeneratorAgentId,
            version: LATEST_CONTENT_GENERATOR_AGENT_VERSION,
        },
    };
}

// --- Chat Functions (for future implementation) ---

/**
 * Chat with a Lyzr Agent (streaming)
 * Instructions are passed via system_prompt_variables at inference time
 */
export async function streamChatWithAgent(
    apiKey: string,
    agentId: string,
    message: string,
    userId: string,
    systemPromptVariables: Record<string, any> = {},
    sessionId?: string,
    assetIds: string[] = []
): Promise<ReadableStream> {
    const finalSessionId = sessionId || `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const requestBody = {
        user_id: userId,
        agent_id: agentId,
        session_id: finalSessionId,
        message: message,
        system_prompt_variables: systemPromptVariables,
        filter_variables: {},
        features: [],
        assets: assetIds,
    };

    console.log('Streaming chat request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${LYZR_AGENT_BASE_URL}/v3/inference/stream/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Streaming chat failed:', response.status, errorText);
        throw new Error(`Failed to stream chat with agent: ${response.status} ${errorText}`);
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }

    return response.body;
}

/**
 * Chat with a Lyzr Agent (non-streaming)
 * Instructions are passed via system_prompt_variables at inference time
 */
export async function chatWithLyzrAgent(
    apiKey: string,
    agentId: string,
    message: string,
    userId: string,
    systemPromptVariables: Record<string, any> = {},
    sessionId?: string
): Promise<{ response: string; session_id: string }> {
    const finalSessionId = sessionId || `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const requestBody = {
        user_id: userId,
        agent_id: agentId,
        session_id: finalSessionId,
        message: message,
        system_prompt_variables: systemPromptVariables,
        filter_variables: {},
        features: [],
        assets: [],
    };

    console.log('Chat request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${LYZR_AGENT_BASE_URL}/v3/inference/chat/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Chat failed:', response.status, errorText);
        throw new Error(`Failed to chat with agent: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Chat response:', data);

    return {
        response: data.response,
        session_id: data.session_id || finalSessionId,
    };
}

// --- Agent & Tool Versioning ---

/**
 * Ensure organization's tools and agents are up to date
 * Recreates tools if version mismatch and updates agents
 * Call this on login or when accessing organization
 */
export async function ensureOrganizationAgentsUpToDate(
    ownerApiKey: string,
    organizationId: string
): Promise<void> {
    const organization = await Organization.findById(organizationId);
    if (!organization) {
        throw new Error('Organization not found');
    }

    let toolsNeedUpdate = false;
    let newToolIds: string[] = [];

    // Check if tools need to be recreated
    if (
        !organization.tutorAgent?.toolIds ||
        organization.tutorAgent.toolIds.length === 0 ||
        !organization.tutorAgent.toolVersion ||
        organization.tutorAgent.toolVersion !== LATEST_TOOL_VERSION
    ) {
        console.log(`Tool version mismatch for organization ${organization.name}. Expected v${LATEST_TOOL_VERSION}, found v${organization.tutorAgent?.toolVersion || 'none'}. Recreating tools...`);
        toolsNeedUpdate = true;

        // Create new tools with updated URL
        newToolIds = await createTutorTools(ownerApiKey, organizationId, organization.name);
        console.log(`✅ Successfully recreated ${newToolIds.length} tools for ${organization.name}`);

        // Update organization with new tool IDs and version
        organization.tutorAgent = organization.tutorAgent || { agentId: '', version: '' };
        organization.tutorAgent.toolIds = newToolIds;
        organization.tutorAgent.toolVersion = LATEST_TOOL_VERSION;
    } else {
        console.log(`Tools are up to date for organization ${organization.name} (v${organization.tutorAgent.toolVersion})`);
        newToolIds = organization.tutorAgent.toolIds;
    }

    // Check and update tutor agent if needed
    if (
        toolsNeedUpdate ||
        !organization.tutorAgent?.version ||
        organization.tutorAgent.version !== LATEST_TUTOR_AGENT_VERSION
    ) {
        if (organization.tutorAgent?.agentId) {
            console.log(`Updating tutor agent for ${organization.name}...`);
            await updateLyzrAgent(
                ownerApiKey,
                organization.tutorAgent.agentId,
                TUTOR_AGENT_CONFIG,
                organization.name,
                newToolIds
            );
            organization.tutorAgent.version = LATEST_TUTOR_AGENT_VERSION;
            console.log(`✅ Updated tutor agent for ${organization.name}`);
        }
    }

    // Check and update quiz generator agent if needed
    if (
        organization.quizGeneratorAgent?.agentId &&
        (!organization.quizGeneratorAgent.version ||
            organization.quizGeneratorAgent.version !== LATEST_QUIZ_GENERATOR_AGENT_VERSION)
    ) {
        console.log(`Updating quiz generator agent for ${organization.name}...`);
        await updateLyzrAgent(
            ownerApiKey,
            organization.quizGeneratorAgent.agentId,
            QUIZ_GENERATOR_AGENT_CONFIG,
            organization.name
        );
        organization.quizGeneratorAgent.version = LATEST_QUIZ_GENERATOR_AGENT_VERSION;
        console.log(`✅ Updated quiz generator agent for ${organization.name}`);
    }

    // Check and update content generator agent if needed
    if (
        organization.contentGeneratorAgent?.agentId &&
        (!organization.contentGeneratorAgent.version ||
            organization.contentGeneratorAgent.version !== LATEST_CONTENT_GENERATOR_AGENT_VERSION)
    ) {
        console.log(`Updating content generator agent for ${organization.name}...`);
        await updateLyzrAgent(
            ownerApiKey,
            organization.contentGeneratorAgent.agentId,
            CONTENT_GENERATOR_AGENT_CONFIG,
            organization.name
        );
        organization.contentGeneratorAgent.version = LATEST_CONTENT_GENERATOR_AGENT_VERSION;
        console.log(`✅ Updated content generator agent for ${organization.name}`);
    }

    // Save organization if any changes were made
    await organization.save();
    console.log(`✅ All agents and tools are up to date for ${organization.name}`);
}
