import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import User from '@/models/user';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/courses?organizationId=xxx
 * Get all courses for an organization
 */
export async function GET(request: NextRequest) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const courses = await Course.find({ organizationId })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total lessons and convert thumbnails to presigned URLs
    const coursesWithStats = await Promise.all(courses.map(async (course: any) => {
      // Convert thumbnail to presigned URL if it's an S3 URL
      let thumbnailUrl = course.thumbnailUrl;
      if (thumbnailUrl && isS3Url(thumbnailUrl)) {
        try {
          thumbnailUrl = await getSignedImageUrl(thumbnailUrl);
        } catch (error) {
          console.error('Error getting signed URL for thumbnail:', error);
        }
      }

      return {
        ...course,
        thumbnailUrl,
        totalModules: course.modules?.length || 0,
        totalLessons: course.modules?.reduce((sum: number, module: any) =>
          sum + (module.lessons?.length || 0), 0) || 0,
      };
    }));

    return NextResponse.json({ courses: coursesWithStats });
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses
 * Create a new course
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const { organizationId, title, description, category, thumbnailUrl, createdBy } = body;

    // Validate required fields
    if (!organizationId || !title || !createdBy) {
      return NextResponse.json(
        { error: 'organizationId, title, and createdBy are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.findOne({ lyzrId: createdBy });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create course with empty modules array
    const course = new Course({
      organizationId,
      title,
      description: description || '',
      category: category || 'other',
      thumbnailUrl: thumbnailUrl || undefined,
      status: 'draft',
      modules: [],
      estimatedDuration: 0,
      createdBy: user._id,
    });

    await course.save();

    return NextResponse.json({
      course: {
        _id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        status: course.status,
        modules: course.modules,
        estimatedDuration: course.estimatedDuration,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
