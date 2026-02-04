import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Certificate from '@/models/certificate';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import User from '@/models/user';
import Organization from '@/models/organization';
import OrganizationMember from '@/models/organizationMember';
import mongoose from 'mongoose';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/certificates?enrollmentId=xxx
 * Get certificate for a specific enrollment (or check if one exists)
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'enrollmentId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return NextResponse.json(
        { error: 'Invalid enrollmentId format' },
        { status: 400 }
      );
    }

    const certificate = await Certificate.findOne({ enrollmentId }).lean();

    if (!certificate) {
      return NextResponse.json(
        { certificate: null },
        { status: 200 }
      );
    }

    // Check validity against current course structure
    const course = await Course.findById(certificate.courseId).lean();
    let isValid = certificate.isValid;
    let invalidationReason = certificate.invalidationReason;

    if (course && certificate.isValid) {
      const totalModules = course.modules?.length || 0;
      const totalLessons = course.modules?.reduce(
        (sum: number, mod: any) => sum + (mod.lessons?.length || 0),
        0
      ) || 0;

      // Check if course structure has changed
      if (totalModules !== certificate.totalModulesAtIssue || totalLessons !== certificate.totalLessonsAtIssue) {
        isValid = false;
        invalidationReason = 'Course content has been updated since certification';

        // Update the certificate in database
        await Certificate.findByIdAndUpdate(certificate._id, {
          isValid: false,
          invalidatedAt: new Date(),
          invalidationReason,
        });
      }
    }

    return NextResponse.json({
      certificate: {
        ...certificate,
        isValid,
        invalidationReason,
      },
    });
  } catch (error: any) {
    console.error('Error fetching certificate:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificates
 * Create a certificate for a completed enrollment
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { enrollmentId } = body;

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'enrollmentId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return NextResponse.json(
        { error: 'Invalid enrollmentId format' },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const existingCert = await Certificate.findOne({ enrollmentId });
    if (existingCert) {
      return NextResponse.json({
        certificate: existingCert,
        created: false,
      });
    }

    // Get enrollment with validation
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    if (enrollment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Certificate can only be issued for completed courses' },
        { status: 400 }
      );
    }

    // Get related data
    const [user, course, organization] = await Promise.all([
      User.findById(enrollment.userId),
      Course.findById(enrollment.courseId),
      Organization.findById(enrollment.organizationId),
    ]);

    if (!user || !course || !organization) {
      return NextResponse.json(
        { error: 'Related data not found' },
        { status: 404 }
      );
    }

    // Get member name if user has a name override in organization
    const member = await OrganizationMember.findOne({
      organizationId: enrollment.organizationId,
      userId: enrollment.userId,
    });

    // Calculate course structure for validity checking
    const totalModules = course.modules?.length || 0;
    const totalLessons = course.modules?.reduce(
      (sum: number, mod: any) => sum + (mod.lessons?.length || 0),
      0
    ) || 0;

    // Get signed URLs for avatars/icons if they're S3 URLs
    let userAvatarUrl = user.avatarUrl;
    let organizationIconUrl = organization.iconUrl;

    if (userAvatarUrl && isS3Url(userAvatarUrl)) {
      try {
        userAvatarUrl = await getSignedImageUrl(userAvatarUrl);
      } catch (e) {
        console.error('Error getting signed URL for user avatar:', e);
      }
    }

    if (organizationIconUrl && isS3Url(organizationIconUrl)) {
      try {
        organizationIconUrl = await getSignedImageUrl(organizationIconUrl);
      } catch (e) {
        console.error('Error getting signed URL for org icon:', e);
      }
    }

    // Create certificate
    const certificate = new Certificate({
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      enrollmentId: enrollment._id,
      organizationId: enrollment.organizationId,
      userName: member?.name || user.name || user.email,
      userAvatarUrl,
      courseTitle: course.title,
      organizationName: organization.name,
      organizationIconUrl,
      totalLessonsAtIssue: totalLessons,
      totalModulesAtIssue: totalModules,
      completedAt: enrollment.completedAt || new Date(),
      issuedAt: new Date(),
      isValid: true,
    });

    await certificate.save();

    return NextResponse.json({
      certificate,
      created: true,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating certificate:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
