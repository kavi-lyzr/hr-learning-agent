import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import OrganizationMember from '@/models/organizationMember';

/**
 * GET /api/organizations/[id]
 * Get organization details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get member count
    const memberCount = await OrganizationMember.countDocuments({
      organizationId: id,
      status: 'active',
    });

    return NextResponse.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        iconUrl: organization.iconUrl,
        ownerId: organization.ownerId,
        settings: organization.settings,
        memberCount,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/organizations/[id]
 * Update organization
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    const updates = await request.json();

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete organization (soft delete by archiving)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;
    // For now, we'll actually delete. In production, you might want to soft-delete
    const organization = await Organization.findByIdAndDelete(id);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Also delete all memberships
    await OrganizationMember.deleteMany({ organizationId: id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
