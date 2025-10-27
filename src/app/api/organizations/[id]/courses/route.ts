import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import { getSignedImageUrl, isS3Url } from '@/lib/s3-utils';

/**
 * GET /api/organizations/[id]/courses
 * Get all courses for an organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const courses = await Course.find({ organizationId: id })
      .select('title description category thumbnailUrl estimatedDuration status modules')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total lessons for each course and convert thumbnails to presigned URLs
    const coursesWithStats = await Promise.all(courses.map(async (course: any) => {
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
          console.error('Error getting signed URL for thumbnail:', error);
        }
      }

      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        thumbnailUrl,
        estimatedDuration: course.estimatedDuration,
        status: course.status,
        totalLessons,
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
