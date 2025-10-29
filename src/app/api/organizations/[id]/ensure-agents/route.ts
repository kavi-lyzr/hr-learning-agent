/**
 * POST /api/organizations/[id]/ensure-agents
 *
 * Called when accessing an organization to ensure agents are up to date.
 * This is an internal endpoint called by the frontend when switching organizations.
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
    const { id: organizationId } = await params;

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

    // Ensure all agents and tools are up to date
    await ensureOrganizationAgentsUpToDate(ownerApiKey, organizationId);

    return NextResponse.json({
      success: true,
      message: 'Agents are up to date',
    });
  } catch (error: any) {
    console.error('Error ensuring agents are up to date:', error);
    // Don't fail the organization access if agent update fails
    // Just log the error and continue
    return NextResponse.json({
      success: false,
      message: 'Agent update failed but you can continue',
      error: error.message,
    });
  }
}
