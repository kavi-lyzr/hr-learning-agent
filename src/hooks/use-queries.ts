"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ============================================
// Query Keys - Centralized for cache management
// ============================================
export const queryKeys = {
    // Organizations
    organizations: (userId: string) => ["organizations", userId] as const,
    organizationMembers: (orgId: string) => ["organization-members", orgId] as const,
    organizationActivity: (orgId: string) => ["organization-activity", orgId] as const,

    // Courses
    courses: (orgId: string) => ["courses", orgId] as const,
    course: (courseId: string) => ["course", courseId] as const,
    courseCategories: (orgId: string) => ["course-categories", orgId] as const,

    // Enrollments
    enrollments: (userId: string, orgId: string) => ["enrollments", userId, orgId] as const,
    enrollment: (enrollmentId: string) => ["enrollment", enrollmentId] as const,

    // Lessons & Progress
    lessonProgress: (userId: string, lessonId: string) => ["lesson-progress", userId, lessonId] as const,
    courseProgress: (userId: string, courseId: string) => ["course-progress", userId, courseId] as const,

    // Quiz
    quizAttempts: (userId: string, lessonId: string) => ["quiz-attempts", userId, lessonId] as const,

    // Dashboard
    dashboardStats: (orgId: string) => ["dashboard-stats", orgId] as const,
    employeeDashboard: (userId: string, orgId: string) => ["employee-dashboard", userId, orgId] as const,

    // Departments
    departments: (orgId: string) => ["departments", orgId] as const,

    // Employees
    employees: (orgId: string) => ["employees", orgId] as const,

    // User Profile
    userProfile: (email: string) => ["user-profile", email] as const,
} as const;

// ============================================
// Generic fetch helper with error handling
// ============================================
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// ============================================
// Organizations Hooks
// ============================================
export function useOrganizations(userId: string | null) {
    return useQuery({
        queryKey: queryKeys.organizations(userId || ""),
        queryFn: () => fetchAPI<{ organizations: Organization[] }>(`/api/organizations?userId=${userId}`),
        enabled: !!userId,
        staleTime: 1000 * 60 * 10, // Organizations rarely change - 10 min
        select: (data) => data.organizations,
    });
}

export function useOrganizationMembers(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.organizationMembers(orgId || ""),
        queryFn: () => fetchAPI<{ members: OrganizationMember[] }>(`/api/organizations/${orgId}/members`),
        enabled: !!orgId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: (data) => data.members,
    });
}

export function useOrganizationActivity(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.organizationActivity(orgId || ""),
        queryFn: () => fetchAPI<{ activities: ActivityEvent[] }>(`/api/organizations/${orgId}/activity`),
        enabled: !!orgId,
        staleTime: 1000 * 60 * 2, // 2 minutes - activity changes more often
        select: (data) => data.activities || [],
    });
}

// ============================================
// User Profile Hooks
// ============================================
export function useUserProfile(email: string | null) {
    return useQuery({
        queryKey: queryKeys.userProfile(email || ""),
        queryFn: () => fetchAPI<{ user: UserProfile }>(`/api/user/profile?email=${encodeURIComponent(email || "")}`),
        enabled: !!email,
        staleTime: 1000 * 60 * 30, // 30 minutes - avatar URL is signed and cached
        gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
        select: (data) => data.user,
    });
}

export function useUpdateUserProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { email: string; userId?: string; name?: string; avatarBase64?: string }) => {
            return fetchAPI<{ success: boolean; user: UserProfile }>('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        onSuccess: (data, variables) => {
            // Invalidate and refetch user profile
            queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(variables.email) });
            toast.success('Profile updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update profile');
        },
    });
}

// ============================================
// Courses Hooks
// ============================================
export function useCourses(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.courses(orgId || ""),
        queryFn: () => fetchAPI<{ courses: Course[] }>(`/api/courses?organizationId=${orgId}`),
        enabled: !!orgId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: (data) => data.courses || [],
    });
}

export function useCourse(courseId: string | null) {
    return useQuery({
        queryKey: queryKeys.course(courseId || ""),
        queryFn: () => fetchAPI<{ course: CourseWithModules }>(`/api/courses/${courseId}`),
        enabled: !!courseId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: (data) => data.course,
    });
}

export function useCreateCourse(orgId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCourseData) =>
            fetchAPI<{ course: Course }>("/api/courses", {
                method: "POST",
                body: JSON.stringify({ ...data, organizationId: orgId }),
            }),
        onSuccess: (data) => {
            // Invalidate courses list to refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.courses(orgId) });
            toast.success("Course created successfully");
            return data.course;
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to create course");
        },
    });
}

export function useUpdateCourse(courseId: string, orgId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Course>) =>
            fetchAPI<{ course: Course }>(`/api/courses/${courseId}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            }),
        onMutate: async (newData) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: queryKeys.course(courseId) });

            // Snapshot the previous value
            const previousCourse = queryClient.getQueryData(queryKeys.course(courseId));

            // Optimistically update to the new value
            queryClient.setQueryData(queryKeys.course(courseId), (old: { course: Course } | undefined) => {
                if (!old) return old;
                return { course: { ...old.course, ...newData } };
            });

            return { previousCourse };
        },
        onError: (err, _newData, context) => {
            // Roll back on error
            if (context?.previousCourse) {
                queryClient.setQueryData(queryKeys.course(courseId), context.previousCourse);
            }
            toast.error("Failed to update course");
        },
        onSettled: () => {
            // Refetch after error or success
            queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.courses(orgId) });
        },
    });
}

export function useDeleteCourse(orgId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (courseId: string) =>
            fetchAPI(`/api/courses/${courseId}`, { method: "DELETE" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.courses(orgId) });
            toast.success("Course deleted successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to delete course");
        },
    });
}

// ============================================
// Enrollments Hooks
// ============================================
export function useEnrollments(userId: string | null, orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.enrollments(userId || "", orgId || ""),
        queryFn: () =>
            fetchAPI<{ enrollments: Enrollment[] }>(
                `/api/enrollments?userId=${userId}&organizationId=${orgId}`
            ),
        enabled: !!userId && !!orgId,
        staleTime: 1000 * 60 * 3, // 3 minutes - enrollments may update more frequently
        select: (data) => data.enrollments || [],
    });
}

export function useCreateEnrollment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateEnrollmentData) =>
            fetchAPI<{ enrollment: Enrollment }>("/api/enrollments", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: (_data, variables) => {
            // Invalidate enrollments for the user
            queryClient.invalidateQueries({
                queryKey: queryKeys.enrollments(variables.userId, variables.organizationId),
            });
            toast.success("Enrolled successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to enroll");
        },
    });
}

// ============================================
// Lesson Progress Hooks
// ============================================
export function useLessonProgress(userId: string | null, lessonId: string | null) {
    return useQuery({
        queryKey: queryKeys.lessonProgress(userId || "", lessonId || ""),
        queryFn: () =>
            fetchAPI<{ progress: LessonProgress[] }>(
                `/api/lesson-progress?userId=${userId}&lessonId=${lessonId}`
            ),
        enabled: !!userId && !!lessonId,
        staleTime: 1000 * 60 * 1, // 1 minute - progress updates frequently
        select: (data) => (data.progress && data.progress.length > 0 ? data.progress[0] : null),
    });
}

export function useSaveLessonProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SaveProgressData) =>
            fetchAPI<{ progress: LessonProgress }>("/api/lesson-progress", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: (_data, variables) => {
            // Invalidate lesson progress
            queryClient.invalidateQueries({
                queryKey: queryKeys.lessonProgress(variables.userId, variables.lessonId),
            });
            // Also invalidate enrollments as progress affects enrollment percentage
            if (variables.courseId) {
                queryClient.invalidateQueries({
                    predicate: (query) =>
                        query.queryKey[0] === "enrollments" && query.queryKey[1] === variables.userId,
                });
            }
        },
    });
}

// ============================================
// Quiz Hooks
// ============================================
export function useQuizAttempts(userId: string | null, lessonId: string | null) {
    return useQuery({
        queryKey: queryKeys.quizAttempts(userId || "", lessonId || ""),
        queryFn: () =>
            fetchAPI<{ attempts: QuizAttempt[] }>(
                `/api/quiz-attempts?userId=${userId}&lessonId=${lessonId}`
            ),
        enabled: !!userId && !!lessonId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: (data) => data.attempts || [],
    });
}

export function useSubmitQuiz() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SubmitQuizData) =>
            fetchAPI<{ attempt: QuizAttempt }>("/api/quiz-attempts", {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.quizAttempts(variables.userId, variables.lessonId),
            });
            toast.success("Quiz submitted");
        },
        onError: () => {
            toast.error("Failed to submit quiz");
        },
    });
}

// ============================================
// Dashboard Hooks
// ============================================
export function useDashboardStats(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.dashboardStats(orgId || ""),
        queryFn: async () => {
            if (!orgId) throw new Error("No organization ID");

            // Fetch courses
            const coursesRes = await fetchAPI<{ courses: Course[] }>(
                `/api/courses?organizationId=${orgId}`
            );
            const courses = coursesRes.courses || [];

            // Fetch members
            const membersRes = await fetchAPI<{ members: OrganizationMember[] }>(
                `/api/organizations/${orgId}/members`
            );
            const members = membersRes.members || [];

            // Calculate stats
            const stats: DashboardStats = {
                totalCourses: courses.length,
                publishedCourses: courses.filter((c) => c.status === "published").length,
                totalModules: courses.reduce((sum, c) => sum + (c.totalModules || 0), 0),
                totalLessons: courses.reduce((sum, c) => sum + (c.totalLessons || 0), 0),
                totalMembers: members.length,
                activeMembers: members.filter((m) => m.status === "active").length,
            };

            return stats;
        },
        enabled: !!orgId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useEmployeeDashboard(userId: string | null, orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.employeeDashboard(userId || "", orgId || ""),
        queryFn: async () => {
            if (!userId || !orgId) throw new Error("Missing user or org ID");

            const enrollmentsRes = await fetchAPI<{ enrollments: Enrollment[] }>(
                `/api/enrollments?userId=${userId}&organizationId=${orgId}`
            );

            return enrollmentsRes.enrollments || [];
        },
        enabled: !!userId && !!orgId,
        staleTime: 1000 * 60 * 3, // 3 minutes
    });
}

// ============================================
// Departments Hooks
// ============================================
export function useDepartments(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.departments(orgId || ""),
        queryFn: () => fetchAPI<{ departments: Department[] }>(`/api/departments?organizationId=${orgId}`),
        enabled: !!orgId,
        staleTime: 1000 * 60 * 10, // 10 minutes - departments rarely change
        select: (data) => data.departments || [],
    });
}

// ============================================
// Employees Hooks
// ============================================
export function useEmployees(orgId: string | null) {
    return useQuery({
        queryKey: queryKeys.employees(orgId || ""),
        queryFn: () => fetchAPI<{ employees: Employee[] }>(`/api/organizations/${orgId}/employees`),
        enabled: !!orgId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        select: (data) => data.employees || [],
    });
}

// ============================================
// Cache Utilities
// ============================================
export function useInvalidateQueries() {
    const queryClient = useQueryClient();

    return {
        invalidateCourses: (orgId: string) =>
            queryClient.invalidateQueries({ queryKey: queryKeys.courses(orgId) }),
        invalidateCourse: (courseId: string) =>
            queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) }),
        invalidateEnrollments: (userId: string, orgId: string) =>
            queryClient.invalidateQueries({ queryKey: queryKeys.enrollments(userId, orgId) }),
        invalidateDashboard: (orgId: string) =>
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(orgId) }),
        invalidateAll: () => queryClient.invalidateQueries(),
        clearAll: () => queryClient.clear(),
    };
}

// ============================================
// Types
// ============================================
export interface UserProfile {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    lyzrId?: string;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    iconUrl?: string;
    role: "admin" | "employee";
}

export interface OrganizationMember {
    _id: string;
    userId: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl?: string;
}

export interface Course {
    _id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    thumbnailUrl?: string;
    totalModules: number;
    totalLessons: number;
    estimatedDuration: number;
    createdAt: string;
    updatedAt?: string;
}

export interface CourseWithModules extends Course {
    modules: Module[];
}

export interface Module {
    _id: string;
    title: string;
    description?: string;
    order: number;
    lessons: Lesson[];
}

export interface Lesson {
    _id: string;
    title: string;
    description?: string;
    contentType: "video" | "article" | "video-article";
    content: {
        videoUrl?: string;
        articleHtml?: string;
        transcript?: TranscriptSegment[];
    };
    duration: number;
    order: number;
    hasQuiz: boolean;
    quizData?: {
        questions: QuizQuestion[];
    };
}

export interface TranscriptSegment {
    text: string;
    start?: number;
    duration?: number;
}

export interface QuizQuestion {
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

export interface Enrollment {
    _id: string;
    status: string;
    progressPercentage: number;
    course: {
        _id: string;
        title: string;
        description?: string;
        category: string;
        thumbnailUrl?: string;
        estimatedDuration: number;
        totalLessons: number;
    };
    progress?: {
        completedLessonIds: string[];
        currentLessonId?: string;
    };
}

export interface LessonProgress {
    _id?: string;
    status: string;
    watchTime?: number;
    scrollDepth?: number;
    timeSpent?: number;
}

export interface QuizAttempt {
    _id: string;
    attemptNumber: number;
    score: number;
    passed: boolean;
    answers: {
        questionIndex: number;
        selectedAnswerIndex: number;
        isCorrect: boolean;
    }[];
    createdAt: string;
}

export interface DashboardStats {
    totalCourses: number;
    publishedCourses: number;
    totalModules: number;
    totalLessons: number;
    totalMembers: number;
    activeMembers: number;
}

export interface Department {
    _id: string;
    name: string;
    description?: string;
}

export interface Employee {
    _id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatarUrl?: string;
    departmentId?: string;
}

export interface ActivityEvent {
    id: string;
    type: "enrollment" | "lesson_completed" | "quiz_attempted" | "course_completed";
    userId: string;
    userName: string;
    courseId?: string;
    courseName?: string;
    lessonId?: string;
    lessonName?: string;
    metadata?: {
        score?: number;
        passed?: boolean;
        progressPercentage?: number;
    };
    timestamp: Date;
}

export interface CreateCourseData {
    title: string;
    description?: string;
    category: string;
    thumbnailUrl?: string;
}

export interface CreateEnrollmentData {
    userId: string;
    courseId: string;
    organizationId: string;
}

export interface SaveProgressData {
    userId: string;
    lessonId: string;
    courseId?: string;
    watchTime?: number;
    scrollDepth?: number;
    timeSpent?: number;
    status: "in-progress" | "completed";
}

export interface SubmitQuizData {
    userId: string;
    lessonId: string;
    courseId: string;
    organizationId: string;
    attemptNumber: number;
    answers: {
        questionIndex: number;
        selectedAnswerIndex: number;
        isCorrect: boolean;
    }[];
    score: number;
    passed: boolean;
    timeSpent: number;
}
