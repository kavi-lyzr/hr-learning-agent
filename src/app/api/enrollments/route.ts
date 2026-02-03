import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import User from '@/models/user';
import Organization from '@/models/organization';
import LessonProgress from '@/models/lessonProgress';
import mongoose from 'mongoose';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';
import { sendCourseAssignmentEmail } from '@/lib/email-service';
import { storeAnalyticsEvent } from '@/lib/analytics-storage';

/**
 * GET /api/enrollments?userId=xxx&organizationId=xxx
 * Get user's enrollments with course details
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId'); // Can be Lyzr ID or MongoDB ObjectId
    const organizationId = searchParams.get('organizationId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    let userMongoId: mongoose.Types.ObjectId;

    // Check if userId is a MongoDB ObjectId or lyzrId
    if (mongoose.Types.ObjectId.isValid(userId) && userId.length === 24) {
      // It's a MongoDB ObjectId - use it directly
      userMongoId = new mongoose.Types.ObjectId(userId);
      console.log('🔍 Using MongoDB ObjectId:', userId);
    } else {
      // It's a lyzrId - find the user first
      const user = await User.findOne({ lyzrId: userId });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      userMongoId = user._id as mongoose.Types.ObjectId;
      console.log('🔍 Found user by lyzrId:', userId, '-> MongoDB ID:', userMongoId);
    }

    // Build query - CRITICAL: Convert string IDs to ObjectIds for MongoDB
    const query: any = { userId: userMongoId };
    if (organizationId) {
      // Validate organizationId format
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return NextResponse.json(
          { error: 'Invalid organizationId format' },
          { status: 400 }
        );
      }
      // Convert to ObjectId to avoid BSON errors
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    console.log('🔍 Querying enrollments:', { userId: userMongoId.toString(), organizationId });

    // Get enrollments with course details
    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'courseId',
        select: 'title description category thumbnailUrl estimatedDuration modules status',
      })
      .sort({ enrolledAt: -1 })
      .lean();

    console.log(`✅ Found ${enrollments.length} enrollment(s)`);

    // Check if we should include draft courses (for admin views)
    const includeDraft = searchParams.get('includeDraft') === 'true';

    // Calculate total lessons for each course and convert thumbnails to presigned URLs
    // Filter out enrollments for draft courses (only show published courses to employees)
    const enrollmentsWithStats = await Promise.all(enrollments.map(async (enrollment: any) => {
      const course = enrollment.courseId;

      // Handle case where course was deleted or populate failed
      if (!course) {
        console.warn(`⚠️  Enrollment ${enrollment._id} has no course (courseId: ${enrollment.courseId})`);
        return null; // Exclude from results
      }

      // Skip draft courses - they shouldn't be visible to employees
      // But include them for admin views (when includeDraft=true)
      if (course.status !== 'published' && !includeDraft) {
        console.log(`⏭️  Skipping draft course: ${course.title}`);
        return null; // Exclude from results
      }

      const totalLessons = course.modules?.reduce(
        (sum: number, module: any) => sum + (module.lessons?.length || 0),
        0
      ) || 0;

      // Convert thumbnail to presigned URL if it's an S3 URL
      let thumbnailUrl = course.thumbnailUrl;
      if (thumbnailUrl && isS3Url(thumbnailUrl)) {
        try {
          thumbnailUrl = await getSignedImageUrl(thumbnailUrl);
        } catch (error) {
          console.error('❌ Error getting signed URL for thumbnail:', error);
        }
      }

      return {
        ...enrollment,
        course: {
          _id: course._id,
          title: course.title,
          description: course.description,
          category: course.category,
          thumbnailUrl,
          estimatedDuration: course.estimatedDuration,
          totalLessons,
          status: course.status,
        },
      };
    }));

    // Filter out null entries (deleted or draft courses)
    const validEnrollments = enrollmentsWithStats.filter(e => e !== null);

    return NextResponse.json({ enrollments: validEnrollments });
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

    // Track course enrollment event
    try {
      await storeAnalyticsEvent({
        organizationId: organizationId,
        userId: userId, // Lyzr ID
        eventType: 'course_enrolled',
        eventName: 'Course Enrolled',
        properties: {
          courseId: courseId,
          courseTitle: course.title,
          courseCategory: course.category,
          estimatedDuration: course.estimatedDuration,
          totalModules: course.modules?.length || 0,
          totalLessons: course.modules?.reduce((sum: number, mod: any) => sum + (mod.lessons?.length || 0), 0) || 0,
          enrollmentId: (enrollment._id as any).toString(),
        },
        sessionId: '', // Server-side event, no session ID
      });
    } catch (trackError) {
      console.error('Failed to track course enrollment:', trackError instanceof Error ? trackError.message : 'Unknown error');
      // Don't fail the enrollment if tracking fails
    }

    // Get organization details for email
    const organization = await Organization.findById(organizationId);
    
    // Send course assignment email notification
    try {
      const courseLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/employee/courses/${courseId}`;
      await sendCourseAssignmentEmail(
        user,
        course,
        courseLink,
        organization?.name
      );
      console.log(`📧 Course assignment email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send course assignment email:', emailError instanceof Error ? emailError.message : 'Unknown error');
      // Don't fail the enrollment if email fails
    }

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/enrollments?action=recalculate&userId=xxx&courseId=xxx
 * Recalculate enrollment progress from LessonProgress data
 * This fixes inconsistencies where LessonProgress shows completed
 * but Enrollment.completedLessonIds is out of sync
 */
export async function PATCH(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId'); // Lyzr ID
    const courseId = searchParams.get('courseId');

    if (action !== 'recalculate') {
      return NextResponse.json(
        { error: 'Invalid action. Use action=recalculate' },
        { status: 400 }
      );
    }

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: 'userId and courseId are required' },
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

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      userId: user._id,
      courseId,
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Get all completed LessonProgress entries for this user+course
    const completedLessonProgress = await LessonProgress.find({
      userId: user._id,
      courseId,
      status: 'completed',
    }).lean();

    console.log(`🔄 Recalculating progress for user ${userId}, course ${courseId}`);
    console.log(`   Found ${completedLessonProgress.length} completed LessonProgress entries`);

    // Get the course to calculate total lessons
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get all lessons in order
    const sortedModules = [...(course.modules || [])].sort((a, b) => a.order - b.order);
    const allCourseLessons = sortedModules.flatMap((mod) =>
      [...(mod.lessons || [])].sort((a, b) => a.order - b.order)
    );
    const totalLessons = allCourseLessons.length;

    // Build new completedLessonIds from LessonProgress data
    const newCompletedLessonIds = completedLessonProgress.map(
      (lp) => new mongoose.Types.ObjectId(String(lp.lessonId))
    );

    const oldCompletedCount = enrollment.progress.completedLessonIds.length;
    const oldPercentage = enrollment.progressPercentage;

    // Update enrollment
    enrollment.progress.completedLessonIds = newCompletedLessonIds;
    enrollment.progressPercentage = totalLessons > 0
      ? Math.round((newCompletedLessonIds.length / totalLessons) * 100)
      : 0;

    // Find next uncompleted lesson
    const nextUncompletedLesson = allCourseLessons.find((l) =>
      l._id && !newCompletedLessonIds.some((id) => id.equals(l._id!))
    );
    enrollment.progress.currentLessonId = nextUncompletedLesson?._id;

    // Update status based on progress
    if (enrollment.progressPercentage === 100 && enrollment.status !== 'completed') {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      console.log(`   🎉 Course marked as completed!`);
    } else if (enrollment.progressPercentage > 0 && enrollment.status === 'not-started') {
      enrollment.status = 'in-progress';
      enrollment.startedAt = enrollment.startedAt || new Date();
    }

    await enrollment.save();

    console.log(`   📊 Progress updated: ${oldCompletedCount}/${totalLessons} (${oldPercentage}%) → ${newCompletedLessonIds.length}/${totalLessons} (${enrollment.progressPercentage}%)`);

    return NextResponse.json({
      success: true,
      enrollment: {
        _id: enrollment._id,
        status: enrollment.status,
        progressPercentage: enrollment.progressPercentage,
        completedLessons: newCompletedLessonIds.length,
        totalLessons,
        currentLessonId: enrollment.progress.currentLessonId,
      },
      changes: {
        completedLessonsBefore: oldCompletedCount,
        completedLessonsAfter: newCompletedLessonIds.length,
        percentageBefore: oldPercentage,
        percentageAfter: enrollment.progressPercentage,
      },
    });
  } catch (error: any) {
    console.error('Error recalculating enrollment progress:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
