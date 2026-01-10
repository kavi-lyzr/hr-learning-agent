import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/models/analyticsEvent';
import User from '@/models/user';
import Enrollment from '@/models/enrollment';
import Course from '@/models/course';
import LessonProgress from '@/models/lessonProgress';
import QuizAttempt from '@/models/quizAttempt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const { id: userId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user details
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all enrollments for this user
    const enrollments = await Enrollment.find({
      userId,
      organizationId,
    }).populate('courseId').lean();

    const totalEnrollments = enrollments.length;
    const completedCourses = enrollments.filter((e) => e.completedAt).length;
    const inProgressCourses = enrollments.filter((e) => !e.completedAt).length;

    // Get all lesson progress
    const lessonProgress = await LessonProgress.find({
      userId,
      organizationId,
    }).lean();

    const totalLessonsCompleted = lessonProgress.filter((lp) => lp.completedAt).length;

    // Get quiz attempts
    const quizAttempts = await QuizAttempt.find({
      userId,
      organizationId,
    }).lean();

    const totalQuizzesPassed = quizAttempts.filter((qa) => qa.passed).length;
    const avgQuizScore = quizAttempts.length > 0
      ? quizAttempts.reduce((sum, qa) => sum + qa.score, 0) / quizAttempts.length
      : 0;

    // Calculate overall completion rate
    const totalLessons = enrollments.reduce((sum, e: any) => {
      if (e.courseId && e.courseId.lessonsCount) {
        return sum + e.courseId.lessonsCount;
      }
      return sum;
    }, 0);

    const overallCompletionRate = totalLessons > 0
      ? (totalLessonsCompleted / totalLessons) * 100
      : 0;

    // Calculate total time spent
    const totalTimeSpent = enrollments.reduce((sum, e: any) => sum + (e.timeSpent || 0), 0);

    // Get analytics events for this user
    const userEvents = await AnalyticsEvent.find({
      userId: user.lyzrId || userId,
      organizationId,
    }).lean();

    // Activity heatmap (last 12 weeks)
    const activityHeatmap = [];
    for (let i = 83; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEvents = userEvents.filter(
        (e) => new Date(e.timestamp) >= date && new Date(e.timestamp) < nextDate
      );

      const minutesSpent = dayEvents
        .filter((e) => e.eventType === 'time_spent_updated')
        .reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);

      activityHeatmap.push({
        date: date.toISOString().split('T')[0],
        minutes: minutesSpent,
      });
    }

    // Enrollment details with progress
    const enrollmentDetails = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const courseId = enrollment.courseId._id || enrollment.courseId;
        const course = enrollment.courseId.title ? enrollment.courseId : await Course.findById(courseId).lean();
        
        const courseLessons = await LessonProgress.find({
          userId,
          courseId,
        }).lean();

        const completedLessons = courseLessons.filter((lp) => lp.completedAt).length;
        const totalLessons = course?.lessonsCount || courseLessons.length;
        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        // Get last activity
        const lastEvent = userEvents
          .filter((e) => e.properties.courseId === courseId.toString())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

        return {
          courseId: courseId.toString(),
          courseTitle: course?.title || 'Unknown Course',
          enrolledAt: enrollment.createdAt,
          progress,
          completedLessons,
          totalLessons,
          timeSpent: enrollment.timeSpent || 0,
          lastActivity: lastEvent ? lastEvent.timestamp : enrollment.updatedAt,
          status: enrollment.completedAt ? 'completed' : progress > 0 ? 'in-progress' : 'not-started',
        };
      })
    );

    // Knowledge gaps (from quiz attempts)
    const knowledgeGaps = quizAttempts
      .filter((qa) => qa.score < 70)
      .reduce((gaps: any[], attempt: any) => {
        const existing = gaps.find((g) => g.lessonId === attempt.lessonId?.toString());
        if (existing) {
          existing.score = (existing.score + attempt.score) / 2;
          existing.attempts += 1;
        } else {
          gaps.push({
            moduleId: attempt.lessonId?.toString() || 'unknown',
            moduleName: attempt.lessonId?.toString() || 'Unknown Module',
            courseTitle: 'Course',
            score: attempt.score,
            attempts: 1,
          });
        }
        return gaps;
      }, [])
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);

    // Time breakdown
    const learningEvents = userEvents.filter(
      (e) => e.eventType === 'lesson_started' || e.eventType === 'lesson_completed'
    );
    const quizEvents = userEvents.filter(
      (e) => e.eventType === 'quiz_started' || e.eventType === 'quiz_completed'
    );
    const timeSpentEvents = userEvents.filter((e) => e.eventType === 'time_spent_updated');

    const learningTime = timeSpentEvents
      .filter((e) => !e.properties.quizId)
      .reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);
    
    const quizTime = timeSpentEvents
      .filter((e) => e.properties.quizId)
      .reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);
    
    const reviewTime = totalTimeSpent - learningTime - quizTime;

    // Engagement level
    const recentActivity = userEvents.filter(
      (e) => new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    let engagementLevel: 'high' | 'medium' | 'low' = 'low';
    if (recentActivity.length > 20) engagementLevel = 'high';
    else if (recentActivity.length > 5) engagementLevel = 'medium';

    return NextResponse.json({
      userId: user._id.toString(),
      userName: user.name || 'Unknown User',
      userEmail: user.email || '',
      totalEnrollments,
      completedCourses,
      inProgressCourses,
      overallCompletionRate,
      totalTimeSpent,
      totalLessonsCompleted,
      totalQuizzesPassed,
      avgQuizScore,
      engagementLevel,
      activityHeatmap,
      enrollments: enrollmentDetails,
      knowledgeGaps,
      timeBreakdown: {
        learning: learningTime,
        quizzes: quizTime,
        reviews: Math.max(0, reviewTime),
      },
    });
  } catch (error) {
    console.error('Error fetching user analytics details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user analytics' },
      { status: 500 }
    );
  }
}
