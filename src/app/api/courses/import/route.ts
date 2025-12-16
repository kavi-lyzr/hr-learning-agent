import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Course from '@/models/course';
import OrganizationMember from '@/models/organizationMember';
import User from '@/models/user';
import { uploadImageToS3Server, getSignedImageUrl, cleanS3Url } from '@/lib/s3-utils';
import mongoose from 'mongoose';

/**
 * POST /api/courses/import
 * Import courses from one organization to another
 */
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const { sourceOrgId, targetOrgId, courseIds, userId } = await request.json();

    // Validation
    if (!sourceOrgId || !targetOrgId || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

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

    // Verify user is admin in both organizations
    const [sourceMember, targetMember] = await Promise.all([
      OrganizationMember.findOne({
        organizationId: sourceOrgId,
        userId: user._id,
        role: 'admin',
        status: 'active'
      }),
      OrganizationMember.findOne({
        organizationId: targetOrgId,
        userId: user._id,
        role: 'admin',
        status: 'active'
      }),
    ]);

    if (!sourceMember || !targetMember) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be admin in both organizations' },
        { status: 403 }
      );
    }

    // Fetch courses to import
    const sourceCourses = await Course.find({
      _id: { $in: courseIds.map(id => new mongoose.Types.ObjectId(id)) },
      organizationId: sourceOrgId,
    }).lean();

    if (sourceCourses.length === 0) {
      return NextResponse.json(
        { error: 'No courses found' },
        { status: 404 }
      );
    }

    console.log(`📦 Importing ${sourceCourses.length} course(s) from org ${sourceOrgId} to ${targetOrgId}`);

    const importedCourses = [];

    for (const sourceCourse of sourceCourses) {
      try {
        // Copy thumbnail to target org's S3 bucket
        let newThumbnailUrl = sourceCourse.thumbnailUrl;

        if (sourceCourse.thumbnailUrl) {
          try {
            console.log(`📸 Copying thumbnail for course: ${sourceCourse.title}`);
            // Fetch signed URL to download image
            const signedUrl = await getSignedImageUrl(sourceCourse.thumbnailUrl);
            const imageResponse = await fetch(signedUrl);

            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer();
              const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;

              // Upload to target org's S3 path
              const fileName = `org-${targetOrgId}/course-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
              newThumbnailUrl = await uploadImageToS3Server(base64Image, fileName);
              console.log(`✅ Thumbnail copied successfully`);
            }
          } catch (error) {
            console.error('Failed to copy thumbnail:', error);
            // Continue without thumbnail
            newThumbnailUrl = undefined;
          }
        }

        // Deep copy course structure (remove _id, createdAt, updatedAt - MongoDB will generate new ones)
        const newCourse = {
          organizationId: targetOrgId,
          title: `${sourceCourse.title} (Imported)`,
          description: sourceCourse.description,
          category: sourceCourse.category,
          status: 'draft', // Import as draft by default
          thumbnailUrl: newThumbnailUrl ? cleanS3Url(newThumbnailUrl) : undefined,
          estimatedDuration: sourceCourse.estimatedDuration,
          modules: sourceCourse.modules?.map((module: any) => ({
            // Remove _id to let MongoDB generate new ones
            title: module.title,
            description: module.description,
            order: module.order,
            lessons: module.lessons?.map((lesson: any) => ({
              title: lesson.title,
              description: lesson.description,
              contentType: lesson.contentType,
              content: lesson.content,
              duration: lesson.duration,
              order: lesson.order,
              hasQuiz: lesson.hasQuiz,
              quizData: lesson.quizData,
            })) || [],
          })) || [],
          createdBy: user._id,
        };

        const importedCourse = await Course.create(newCourse);
        importedCourses.push(importedCourse);

        console.log(`✅ Imported course: ${sourceCourse.title} → ${importedCourse._id}`);
      } catch (error) {
        console.error(`Failed to import course ${sourceCourse.title}:`, error);
        // Continue with other courses
      }
    }

    console.log(`🎉 Successfully imported ${importedCourses.length} course(s)`);

    return NextResponse.json({
      success: true,
      importedCourses: importedCourses.map(c => ({ _id: c._id, title: c.title })),
      count: importedCourses.length,
    });

  } catch (error: any) {
    console.error('Error importing courses:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
