import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Organization from '@/models/organization';
import OrganizationMember from '@/models/organizationMember';
import Department from '@/models/department';
import User from '@/models/user';
import { createAgentsForOrganization } from '@/lib/lyzr-services';
import { decrypt } from '@/lib/encryption';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/organizations
 * Get all organizations the user belongs to
 */
export async function GET(request: Request) {
  await dbConnect();

  try {
    // Get lyzrId from query params
    const { searchParams } = new URL(request.url);
    const lyzrId = searchParams.get('userId'); // Frontend sends lyzrId as userId

    if (!lyzrId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find the user by lyzrId to get MongoDB _id
    const user = await User.findOne({ lyzrId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find all memberships for this user using MongoDB _id
    const memberships = await OrganizationMember.find({ userId: user._id })
      .populate('organizationId')
      .exec();

    // Map organizations with signed icon URLs
    const organizations = await Promise.all(memberships.map(async (m: any) => {
      let signedIconUrl = m.organizationId.iconUrl;

      // Sign S3 URLs for organization icons
      if (signedIconUrl && isS3Url(signedIconUrl)) {
        try {
          signedIconUrl = await getSignedImageUrl(signedIconUrl);
        } catch (error) {
          console.error('Failed to sign org icon URL:', error);
          signedIconUrl = null;
        }
      }

      return {
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        iconUrl: signedIconUrl,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      };
    }));

    return NextResponse.json({ organizations });
  } catch (error: any) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(request: Request) {
  await dbConnect();

  try {
    const { name, ownerId } = await request.json(); // ownerId here is actually lyzrId from frontend

    // Validate input
    if (!name || !ownerId) {
      return NextResponse.json(
        { error: 'name and ownerId are required' },
        { status: 400 }
      );
    }

    // Find the user by lyzrId to get MongoDB _id
    const user = await User.findOne({ lyzrId: ownerId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 409 }
      );
    }

    // Decrypt the user's API key to create agents
    const ownerApiKey = decrypt(user.lyzrApiKey);

    // Create organization first to get its ID
    const organization = new Organization({
      name,
      slug,
      ownerId: user._id, // Use MongoDB _id, not lyzrId
      generalDepartment: {
        courseIds: [],
        autoEnroll: true,
      },
    });
    await organization.save();

    // Create Lyzr agents for this organization (uses owner's API key)
    console.log(`Creating Lyzr agents for organization: ${name}`);
    const agents = await createAgentsForOrganization(ownerApiKey, (organization._id as any).toString(), name);

    // Update organization with agents
    organization.tutorAgent = agents.tutorAgent;
    organization.quizGeneratorAgent = agents.quizGeneratorAgent;
    organization.contentGeneratorAgent = agents.contentGeneratorAgent;
    await organization.save();
    console.log(`Organization created with agents: ${organization._id}`);

    // Add owner as admin member
    const membership = new OrganizationMember({
      organizationId: organization._id,
      userId: user._id, // Use MongoDB _id, not lyzrId
      email: user.email,
      role: 'admin',
      status: 'active',
      joinedAt: new Date(),
    });
    await membership.save();

    // Create standard departments
    const standardDepartments = [
      'Sales',
      'Engineering',
      'Product',
      'Customer Success',
      'HR',
    ];

    console.log(`Creating ${standardDepartments.length} standard departments for organization: ${organization._id}`);

    const departmentPromises = standardDepartments.map((deptName) =>
      new Department({
        organizationId: organization._id,
        name: deptName,
        description: '',
        defaultCourseIds: [],
        autoEnroll: false,
        isDefault: false,
      }).save()
    );

    await Promise.all(departmentPromises);
    console.log(`All departments created successfully`);

    // Update user's lastAccessedOrganization
    await User.findByIdAndUpdate(user._id, {
      lastAccessedOrganization: organization._id,
    });

    return NextResponse.json({
      organization: {
        id: organization._id,
        name: organization.name,
        slug: organization.slug,
        iconUrl: organization.iconUrl,
        ownerId: organization.ownerId,
      },
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
