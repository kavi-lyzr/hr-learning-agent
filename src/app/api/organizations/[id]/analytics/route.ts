/**
 * GET /api/organizations/[id]/analytics
 * Fetch analytics metrics for the organization
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import LessonProgress from '@/models/lessonProgress';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  
  try {
    const { id: organizationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    const orgObjectId = new mongoose.Types.ObjectId(organizationId);

    // 1. Total Learners (active organization members)
    const totalLearners = await OrganizationMember.countDocuments({
      organizationId: orgObjectId,
      status: 'active',
    });

    // 2. Average Completion Rate (average of all enrollments' progressPercentage)
    const enrollments = await Enrollment.find({
      organizationId: orgObjectId,
    }).lean();

    const avgCompletionRate = enrollments.length > 0
      ? Math.round(
          enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
        )
      : 0;

    // 3. Active Courses (published courses)
    const activeCourses = await Course.countDocuments({
      organizationId: orgObjectId,
      status: 'published',
    });

    // 4. Learning Hours (sum of all timeSpent from lesson progress, converted to hours)
    const lessonProgressRecords = await LessonProgress.find({}).lean();

    // Filter by organization (need to check if lesson belongs to org's courses)
    const orgCourses = await Course.find({
      organizationId: orgObjectId,
    }).select('_id').lean();

    const orgCourseIds = new Set(orgCourses.map(c => c._id.toString()));

    const totalSeconds = lessonProgressRecords
      .filter(lp => orgCourseIds.has(lp.courseId.toString()))
      .reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);

    const learningHours = Math.round(totalSeconds / 3600); // Convert seconds to hours

    return NextResponse.json({
      metrics: {
        totalLearners,
        avgCompletionRate,
        activeCourses,
        learningHours,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
