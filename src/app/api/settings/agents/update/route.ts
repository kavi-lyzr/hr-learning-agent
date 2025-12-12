import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import { decrypt } from '@/lib/encryption';
import {
  ensureOrganizationAgentsUpToDate,
  createAgentsForOrganization,
} from '@/lib/lyzr-services';

/**
 * POST /api/settings/agents/update
 * Update all agents to latest version
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { organizationId, action } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    if (!action || !['update', 'recreate'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "update" or "recreate"' }, { status: 400 });
    }

    // Fetch organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get owner's API key
    const owner = await User.findById(organization.ownerId);
    if (!owner) {
      return NextResponse.json({ error: 'Organization owner not found' }, { status: 404 });
    }

    const apiKey = decrypt(owner.lyzrApiKey);

    if (action === 'update') {
      // Update existing agents to latest versions
      console.log(`Updating agents for organization: ${organization.name}`);
      await ensureOrganizationAgentsUpToDate(apiKey, organizationId);

      return NextResponse.json({
        success: true,
        message: 'All agents updated to latest versions',
      });
    } else if (action === 'recreate') {
      // Recreate all agents from scratch
      console.log(`Recreating all agents for organization: ${organization.name}`);

      const agents = await createAgentsForOrganization(
        apiKey,
        organizationId,
        organization.name
      );

      // Update organization with new agent IDs
      organization.tutorAgent = agents.tutorAgent;
      organization.quizGeneratorAgent = agents.quizGeneratorAgent;
      organization.contentGeneratorAgent = agents.contentGeneratorAgent;
      await organization.save();

      return NextResponse.json({
        success: true,
        message: 'All agents recreated successfully',
        agents: {
          tutor: agents.tutorAgent.agentId,
          quizGenerator: agents.quizGeneratorAgent.agentId,
          contentGenerator: agents.contentGeneratorAgent.agentId,
        },
      });
    }

    // This should never happen but TypeScript needs it
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating agents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
