/**
 * POST /api/organizations/[id]/sync-agents
 *
 * Ensures organization's agents and tools are up to date.
 * Recreates tools if version mismatch (e.g., when app URL changes).
 * Updates agents if configuration versions change.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import User from '@/models/user';
import { decrypt } from '@/lib/encryption';
import { ensureOrganizationAgentsUpToDate } from '@/lib/lyzr-services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const organizationId = id;

    // Get organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
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

    console.log(`🔄 Syncing agents and tools for organization: ${organization.name}`);

    // Ensure all agents and tools are up to date
    await ensureOrganizationAgentsUpToDate(ownerApiKey, organizationId);

    console.log(`✅ Successfully synced agents and tools for ${organization.name}`);

    return NextResponse.json({
      success: true,
      message: 'Agents and tools are now up to date',
      organization: {
        id: organization._id,
        name: organization.name,
        tutorAgent: {
          version: organization.tutorAgent?.version,
          toolVersion: organization.tutorAgent?.toolVersion,
        },
        quizGeneratorAgent: {
          version: organization.quizGeneratorAgent?.version,
        },
        contentGeneratorAgent: {
          version: organization.contentGeneratorAgent?.version,
        },
      },
    });
  } catch (error: any) {
    console.error('Error syncing agents:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message || 'Failed to sync agents',
      },
      { status: 500 }
    );
  }
}
