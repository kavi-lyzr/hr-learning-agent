import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import AnalyticsEvent from '@/models/analyticsEvent';
import Course from '@/models/course';
import Enrollment from '@/models/enrollment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const { id: courseId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get course details
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get all enrollments for this course
    const enrollments = await Enrollment.find({
      courseId,
      organizationId,
    }).lean();

    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter((e) => e.completedAt).length;
    const activeEnrollments = enrollments.filter((e) => !e.completedAt).length;
    const completionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0;

    // Get all analytics events for this course
    const courseEvents = await AnalyticsEvent.find({
      organizationId,
      'properties.courseId': courseId,
    }).lean();

    // Calculate average completion time
    const completedEnrollmentsWithTime = enrollments.filter(
      (e: any) => e.completedAt && e.timeSpent
    );
    const avgCompletionTime = completedEnrollmentsWithTime.length > 0
      ? completedEnrollmentsWithTime.reduce((sum, e: any) => sum + (e.timeSpent || 0), 0) /
        completedEnrollmentsWithTime.length
      : 0;

    // Calculate quiz metrics
    const passedQuizzes = courseEvents.filter((e) => e.eventType === 'quiz_completed');
    const avgQuizScore = passedQuizzes.length > 0
      ? passedQuizzes.reduce((sum, e) => sum + (e.properties.score || 0), 0) / passedQuizzes.length
      : 0;

    // Calculate total time spent
    const totalTimeSpent = enrollments.reduce((sum, e: any) => sum + (e.timeSpent || 0), 0);

    // Extract all lessons from embedded modules in the course
    const lessons: Array<{ _id: any; title: string; hasQuiz: boolean; moduleTitle: string; isModuleAssessment?: boolean }> = [];
    if (course.modules) {
      for (const module of course.modules as any[]) {
        if (module.lessons) {
          for (const lesson of module.lessons) {
            lessons.push({
              _id: lesson._id,
              title: lesson.title,
              hasQuiz: lesson.hasQuiz || false,
              moduleTitle: module.title,
              isModuleAssessment: lesson.isModuleAssessment || false,
            });
          }
        }
      }
    }

    // Calculate lesson-level metrics
    const lessonMetrics = lessons.map((lesson) => {
      const lessonIdStr = lesson._id?.toString();
      const lessonStartEvents = courseEvents.filter(
        (e) => e.eventType === 'lesson_started' && e.properties.lessonId === lessonIdStr
      );
      const lessonCompletedEvents = courseEvents.filter(
        (e) => e.eventType === 'lesson_completed' && e.properties.lessonId === lessonIdStr
      );

      const starts = lessonStartEvents.length;
      const completions = lessonCompletedEvents.length;
      const completionRate = starts > 0 ? (completions / starts) * 100 : 0;
      const dropoffRate = starts > 0 ? ((starts - completions) / starts) * 100 : 0;

      // Calculate average time spent on this lesson
      const timeSpentEvents = courseEvents.filter(
        (e) => e.eventType === 'time_spent_updated' && e.properties.lessonId === lessonIdStr
      );
      const avgTimeSpent = timeSpentEvents.length > 0
        ? timeSpentEvents.reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0) / timeSpentEvents.length
        : 0;

      return {
        lessonId: lessonIdStr,
        lessonTitle: lesson.title,
        moduleTitle: lesson.moduleTitle,
        starts,
        completions,
        completionRate,
        avgTimeSpent,
        dropoffRate,
        isModuleAssessment: lesson.isModuleAssessment,
      };
    });

    // Calculate quiz-level metrics (group by lesson)
    const quizMetrics = lessons
      .filter((lesson) => lesson.hasQuiz)
      .map((lesson) => {
        const lessonIdStr = lesson._id?.toString();
        const quizAttempts = courseEvents.filter(
          (e) =>
            (e.eventType === 'quiz_completed' || e.eventType === 'quiz_failed') &&
            e.properties.lessonId === lessonIdStr
        );
        const quizPasses = courseEvents.filter(
          (e) =>
            e.eventType === 'quiz_completed' && e.properties.lessonId === lessonIdStr
        );
        const quizFailures = courseEvents.filter(
          (e) =>
            e.eventType === 'quiz_failed' && e.properties.lessonId === lessonIdStr
        );

        const attempts = quizAttempts.length;
        const passes = quizPasses.length;
        const failures = quizFailures.length;
        const passRate = attempts > 0 ? (passes / attempts) * 100 : 0;
        const avgScore = quizPasses.length > 0
          ? quizPasses.reduce((sum, e) => sum + (e.properties.score || 0), 0) / quizPasses.length
          : 0;

        return {
          lessonId: lessonIdStr,
          lessonTitle: lesson.title,
          moduleTitle: lesson.moduleTitle,
          attempts,
          passes,
          failures,
          passRate,
          avgScore,
          isModuleAssessment: lesson.isModuleAssessment,
        };
      });

    // Engagement trend (last 30 days)
    const engagementTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayEnrollments = enrollments.filter(
        (e) => new Date(e.createdAt) >= date && new Date(e.createdAt) < nextDate
      ).length;

      const dayCompletions = courseEvents.filter(
        (e) =>
          e.eventType === 'course_completed' &&
          new Date(e.timestamp) >= date &&
          new Date(e.timestamp) < nextDate
      ).length;

      const dayTimeSpent = courseEvents
        .filter(
          (e) =>
            e.eventType === 'time_spent_updated' &&
            new Date(e.timestamp) >= date &&
            new Date(e.timestamp) < nextDate
        )
        .reduce((sum, e) => sum + (e.properties.timeSpent || 0), 0);

      engagementTrend.push({
        date: date.toISOString().split('T')[0],
        enrollments: dayEnrollments,
        completions: dayCompletions,
        timeSpent: dayTimeSpent,
      });
    }

    return NextResponse.json({
      courseId: course._id.toString(),
      courseTitle: course.title,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      completionRate,
      avgCompletionTime,
      avgQuizScore,
      totalTimeSpent,
      lessonMetrics: lessonMetrics.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle)),
      quizMetrics,
      engagementTrend,
    });
  } catch (error) {
    console.error('Error fetching course analytics details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course analytics' },
      { status: 500 }
    );
  }
}
