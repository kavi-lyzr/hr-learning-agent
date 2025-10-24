/**
 * Lyzr Agent Services for L&D Platform
 *
 * This module handles all interactions with the Lyzr Agent API:
 * - Agent creation and updates
 * - Version management
 * - User-agent orchestration
 */

import User, { IUser } from '@/models/user';
import { encrypt, decrypt } from '@/lib/encryption';
import {
    LATEST_TUTOR_AGENT_VERSION,
    LATEST_QUIZ_GENERATOR_AGENT_VERSION,
    LATEST_CONTENT_GENERATOR_AGENT_VERSION,
    TUTOR_AGENT_CONFIG,
    QUIZ_GENERATOR_AGENT_CONFIG,
    CONTENT_GENERATOR_AGENT_CONFIG,
} from './agent-config';

// Lyzr API endpoints
const LYZR_AGENT_BASE_URL = 'https://agent-prod.studio.lyzr.ai';
const AGENT_CREATION_ENDPOINT = `${LYZR_AGENT_BASE_URL}/v3/agents/template/single-task`;
const AGENT_UPDATE_ENDPOINT = (agentId: string) => `${LYZR_AGENT_BASE_URL}/v3/agents/template/single-task/${agentId}`;

// --- Agent Management ---

/**
 * Create a new Lyzr agent
 */
async function createLyzrAgent(apiKey: string, agentConfig: any, organizationName?: string): Promise<string> {
    // Remove agentType from payload (internal use only)
    const { agentType, ...configPayload } = agentConfig;

    // Add organization suffix to agent name if provided
    const agentName = organizationName
        ? `${agentConfig.name} - ${organizationName}`
        : agentConfig.name;

    const payload = {
        ...configPayload,
        name: agentName,
        store_messages: true, // Enable message storage for conversation history
    };

    console.log(`Creating ${agentType} agent: ${agentName}`);

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
async function updateLyzrAgent(apiKey: string, agentId: string, agentConfig: any): Promise<void> {
    // Remove agentType from payload (internal use only)
    const { agentType, ...configPayload } = agentConfig;

    const payload = {
        ...configPayload,
        store_messages: true,
    };

    console.log(`Updating ${agentType} agent: ${agentId}`);

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
        throw new Error(`Failed to update ${agentConfig.name}: ${response.status} ${errorText}`);
    }

    console.log(`Successfully updated ${agentType} agent: ${agentId}`);
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
        return user;
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
        return newUser;
    }
}

// --- Organization Agent Creation ---

/**
 * Create all 3 Lyzr agents for an organization
 * Returns agent IDs to be stored in the Organization document
 */
export async function createAgentsForOrganization(
    ownerApiKey: string,
    organizationName: string
): Promise<{
    tutorAgent: { agentId: string; version: string };
    quizGeneratorAgent: { agentId: string; version: string };
    contentGeneratorAgent: { agentId: string; version: string };
}> {
    console.log(`Creating Lyzr agents for organization: ${organizationName}`);

    // Create all 3 agents in parallel for speed
    const [tutorAgentId, quizGeneratorAgentId, contentGeneratorAgentId] = await Promise.all([
        createLyzrAgent(ownerApiKey, TUTOR_AGENT_CONFIG, organizationName),
        createLyzrAgent(ownerApiKey, QUIZ_GENERATOR_AGENT_CONFIG, organizationName),
        createLyzrAgent(ownerApiKey, CONTENT_GENERATOR_AGENT_CONFIG, organizationName),
    ]);

    console.log(`Successfully created all agents for organization: ${organizationName}`);

    return {
        tutorAgent: {
            agentId: tutorAgentId,
            version: LATEST_TUTOR_AGENT_VERSION,
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
    sessionId?: string
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
