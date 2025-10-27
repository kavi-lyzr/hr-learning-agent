import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import User from '@/models/user';
import mongoose from 'mongoose';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/enrollments?userId=xxx&organizationId=xxx
 * Get user's enrollments with course details
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Lyzr ID
    const organizationId = searchParams.get('organizationId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find user by lyzrId
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build query
    const query: any = { userId: user._id };
    if (organizationId) {
      query.organizationId = organizationId;
    }

    // Get enrollments with course details
    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseId',
        select: 'title description category thumbnailUrl estimatedDuration modules status',
      })
      .sort({ enrolledAt: -1 })
      .lean();

    // Calculate total lessons for each course and convert thumbnails to presigned URLs
    const enrollmentsWithStats = await Promise.all(enrollments.map(async (enrollment: any) => {
      const course = enrollment.courseId;
      const totalLessons = course?.modules?.reduce(
        (sum: number, module: any) => sum + (module.lessons?.length || 0),
        0
      ) || 0;

      // Convert thumbnail to presigned URL if it's an S3 URL
      let thumbnailUrl = course?.thumbnailUrl;
      if (thumbnailUrl && isS3Url(thumbnailUrl)) {
        try {
          thumbnailUrl = await getSignedImageUrl(thumbnailUrl);
        } catch (error) {
          console.error('Error getting signed URL for thumbnail:', error);
        }
      }

      return {
        ...enrollment,
        course: {
          _id: course?._id,
          title: course?.title,
          description: course?.description,
          category: course?.category,
          thumbnailUrl,
          estimatedDuration: course?.estimatedDuration,
          totalLessons,
          status: course?.status,
        },
      };
    }));

    return NextResponse.json({ enrollments: enrollmentsWithStats });
  } catch (error: any) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/enrollments
 * Enroll user in a course
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { userId, courseId, organizationId } = body; // userId is lyzrId

    // Validate required fields
    if (!userId || !courseId || !organizationId) {
      return NextResponse.json(
        { error: 'userId, courseId, and organizationId are required' },
        { status: 400 }
      );
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid courseId or organizationId' },
        { status: 400 }
      );
    }

    // Find user by lyzrId
    const user = await User.findOne({ lyzrId: userId });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existing = await Enrollment.findOne({
      userId: user._id,
      courseId,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already enrolled in this course', enrollment: existing },
        { status: 409 }
      );
    }

    // Create enrollment
    const enrollment = new Enrollment({
      userId: user._id,
      courseId,
      organizationId,
      status: 'not-started',
      progressPercentage: 0,
      progress: {
        completedLessonIds: [],
      },
      enrolledAt: new Date(),
    });

    await enrollment.save();

    // Populate course details
    await enrollment.populate('courseId', 'title description category thumbnailUrl estimatedDuration');

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
