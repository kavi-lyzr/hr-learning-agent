import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import { decrypt } from '@/lib/encryption';
import {
    LATEST_TUTOR_AGENT_VERSION,
    LATEST_QUIZ_GENERATOR_AGENT_VERSION,
    LATEST_CONTENT_GENERATOR_AGENT_VERSION,
    LATEST_TOOL_VERSION,
} from '@/lib/agent-config';

const LYZR_AGENT_BASE_URL = 'https://agent-prod.studio.lyzr.ai';

interface AgentStatus {
    name: string;
    type: 'tutor' | 'quiz_generator' | 'content_generator';
    status: 'healthy' | 'needs_update' | 'missing' | 'error';
    agentId: string | null;
    currentVersion: string | null;
    latestVersion: string;
    toolsStatus?: 'healthy' | 'needs_update' | 'missing';
    currentToolVersion?: string | null;
    latestToolVersion?: string;
    error?: string;
}

/**
 * Verify an agent exists and is accessible via Lyzr API
 */
async function verifyAgent(apiKey: string, agentId: string): Promise<{ exists: boolean; error?: string }> {
    try {
        const response = await fetch(`${LYZR_AGENT_BASE_URL}/v3/agents/${agentId}`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
            },
        });

        if (response.ok) {
            return { exists: true };
        } else if (response.status === 404) {
            return { exists: false, error: 'Agent not found in Lyzr' };
        } else {
            const errorText = await response.text();
            return { exists: false, error: `API error: ${response.status}` };
        }
    } catch (error: any) {
        return { exists: false, error: error.message };
    }
}

/**
 * GET /api/settings/agents/health
 * Get health status of all organization agents
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();

        // Get organization ID from query
        const organizationId = request.nextUrl.searchParams.get('organizationId');
        const userId = request.headers.get('x-user-id');

        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }

        // Fetch organization
        const organization = await Organization.findById(organizationId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Get owner's API key for verification
        const owner = await User.findById(organization.ownerId);
        if (!owner) {
            return NextResponse.json({ error: 'Organization owner not found' }, { status: 404 });
        }

        const apiKey = decrypt(owner.lyzrApiKey);

        const agents: AgentStatus[] = [];

        // Check Tutor Agent
        const tutorAgent = organization.tutorAgent;
        if (tutorAgent?.agentId) {
            const verification = await verifyAgent(apiKey, tutorAgent.agentId);

            let status: AgentStatus['status'] = 'healthy';
            if (!verification.exists) {
                status = 'error';
            } else if (tutorAgent.version !== LATEST_TUTOR_AGENT_VERSION) {
                status = 'needs_update';
            }

            let toolsStatus: AgentStatus['toolsStatus'] = 'healthy';
            if (!tutorAgent.toolIds || tutorAgent.toolIds.length === 0) {
                toolsStatus = 'missing';
            } else if (tutorAgent.toolVersion !== LATEST_TOOL_VERSION) {
                toolsStatus = 'needs_update';
            }

            agents.push({
                name: 'Learning Tutor',
                type: 'tutor',
                status,
                agentId: tutorAgent.agentId,
                currentVersion: tutorAgent.version || null,
                latestVersion: LATEST_TUTOR_AGENT_VERSION,
                toolsStatus,
                currentToolVersion: tutorAgent.toolVersion || null,
                latestToolVersion: LATEST_TOOL_VERSION,
                error: verification.error,
            });
        } else {
            agents.push({
                name: 'Learning Tutor',
                type: 'tutor',
                status: 'missing',
                agentId: null,
                currentVersion: null,
                latestVersion: LATEST_TUTOR_AGENT_VERSION,
                toolsStatus: 'missing',
                currentToolVersion: null,
                latestToolVersion: LATEST_TOOL_VERSION,
            });
        }

        // Check Quiz Generator Agent
        const quizAgent = organization.quizGeneratorAgent;
        if (quizAgent?.agentId) {
            const verification = await verifyAgent(apiKey, quizAgent.agentId);

            let status: AgentStatus['status'] = 'healthy';
            if (!verification.exists) {
                status = 'error';
            } else if (quizAgent.version !== LATEST_QUIZ_GENERATOR_AGENT_VERSION) {
                status = 'needs_update';
            }

            agents.push({
                name: 'Quiz Generator',
                type: 'quiz_generator',
                status,
                agentId: quizAgent.agentId,
                currentVersion: quizAgent.version || null,
                latestVersion: LATEST_QUIZ_GENERATOR_AGENT_VERSION,
                error: verification.error,
            });
        } else {
            agents.push({
                name: 'Quiz Generator',
                type: 'quiz_generator',
                status: 'missing',
                agentId: null,
                currentVersion: null,
                latestVersion: LATEST_QUIZ_GENERATOR_AGENT_VERSION,
            });
        }

        // Check Content Generator Agent
        const contentAgent = organization.contentGeneratorAgent;
        if (contentAgent?.agentId) {
            const verification = await verifyAgent(apiKey, contentAgent.agentId);

            let status: AgentStatus['status'] = 'healthy';
            if (!verification.exists) {
                status = 'error';
            } else if (contentAgent.version !== LATEST_CONTENT_GENERATOR_AGENT_VERSION) {
                status = 'needs_update';
            }

            agents.push({
                name: 'Content Generator',
                type: 'content_generator',
                status,
                agentId: contentAgent.agentId,
                currentVersion: contentAgent.version || null,
                latestVersion: LATEST_CONTENT_GENERATOR_AGENT_VERSION,
                error: verification.error,
            });
        } else {
            agents.push({
                name: 'Content Generator',
                type: 'content_generator',
                status: 'missing',
                agentId: null,
                currentVersion: null,
                latestVersion: LATEST_CONTENT_GENERATOR_AGENT_VERSION,
            });
        }

        // Calculate overall health
        const healthyCount = agents.filter(a => a.status === 'healthy' && (!a.toolsStatus || a.toolsStatus === 'healthy')).length;
        const overallHealth = healthyCount === agents.length ? 'healthy' :
            agents.some(a => a.status === 'missing' || a.status === 'error') ? 'critical' : 'needs_attention';

        return NextResponse.json({
            overallHealth,
            agents,
            summary: {
                total: agents.length,
                healthy: healthyCount,
                needsUpdate: agents.filter(a => a.status === 'needs_update' || a.toolsStatus === 'needs_update').length,
                missing: agents.filter(a => a.status === 'missing').length,
                errors: agents.filter(a => a.status === 'error').length,
            },
        });
    } catch (error: any) {
        console.error('Error checking agent health:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
