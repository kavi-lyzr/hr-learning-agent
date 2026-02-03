import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Certificate from '@/models/certificate';
import Course from '@/models/course';
import Organization from '@/models/organization';
import User from '@/models/user';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/certificates/[id]
 * Get certificate by public certificateId (for public sharing)
 * This is a PUBLIC endpoint - no auth required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: certificateId } = await params;

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    // Find certificate by public certificateId
    const certificate = await Certificate.findOne({ certificateId }).lean();

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
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

        // Update the certificate in database (async, don't wait)
        Certificate.findByIdAndUpdate(certificate._id, {
          isValid: false,
          invalidatedAt: new Date(),
          invalidationReason,
        }).catch(err => console.error('Failed to update certificate validity:', err));
      }
    } else if (!course) {
      isValid = false;
      invalidationReason = 'Course no longer exists';
    }

    // Get fresh signed URLs for display
    let userAvatarUrl = certificate.userAvatarUrl;
    let organizationIconUrl = certificate.organizationIconUrl;

    // Try to get fresh avatar from user if original was S3
    if (certificate.userId) {
      try {
        const user = await User.findById(certificate.userId).select('avatarUrl').lean();
        if (user?.avatarUrl) {
          userAvatarUrl = isS3Url(user.avatarUrl)
            ? await getSignedImageUrl(user.avatarUrl)
            : user.avatarUrl;
        }
      } catch (e) {
        console.error('Error getting user avatar:', e);
      }
    }

    // Try to get fresh icon from organization if original was S3
    if (certificate.organizationId) {
      try {
        const org = await Organization.findById(certificate.organizationId).select('iconUrl name').lean();
        if (org?.iconUrl) {
          organizationIconUrl = isS3Url(org.iconUrl)
            ? await getSignedImageUrl(org.iconUrl)
            : org.iconUrl;
        }
      } catch (e) {
        console.error('Error getting org icon:', e);
      }
    }

    return NextResponse.json({
      certificate: {
        certificateId: certificate.certificateId,
        userName: certificate.userName,
        userAvatarUrl,
        courseTitle: certificate.courseTitle,
        organizationName: certificate.organizationName,
        organizationIconUrl,
        issuedAt: certificate.issuedAt,
        completedAt: certificate.completedAt,
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
