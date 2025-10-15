# Lyzr L&D Platform - Quick Reference

## Project Overview
AI-powered Learning & Development platform for enterprises. POC/promotional app for sales demos using Lyzr agents.

**Tech Stack:** Next.js 14, TypeScript, Tailwind v4, shadcn/ui, MongoDB, Mongoose, Lyzr SDK

**Reference Code:** See `references/hr_candidate_sourcing/` for patterns

---

## Information Architecture

```
Course (Top-level program)
  └── Module (Thematic section)
      └── Lesson (Learning unit)
          └── Content (Video/Article/Quiz)
```

**Example:** Course: "Sales Training" → Module: "Discovery" → Lesson: "Asking Questions" → Content: YouTube Video

---

## User Roles

| Role | Access | Key Features |
|------|--------|--------------|
| **Admin** | Full admin view + employee preview | Create courses, manage employees, view analytics |
| **Employee** | Employee view only | View courses, consume content, chat with AI Tutor |

---

## Core User Flows

### Admin Flow
1. Login via Lyzr OAuth → Organization dashboard
2. **Manage Employees**: Add single/bulk, assign to departments
3. **Create Content**: Course → Modules → Lessons (YouTube/Article)
4. **Enable Quizzes**: AI generates questions, admin reviews/edits
5. **View Analytics**: Dashboard with metrics, activity feed

### Employee Flow
1. Login → See assigned courses
2. **Browse Courses**: Card grid with progress indicators
3. **Take Lessons**: Watch videos or read articles
4. **Test Knowledge**: Take auto-generated quizzes
5. **Get Help**: Chat with AI Tutor (context-aware)

---

## Key Features

### Phase 1 (MVP)
- ✅ OAuth authentication (Lyzr)
- ✅ Organization management
- ✅ Course/module/lesson creation (YouTube + articles)
- ✅ Employee dashboard & content consumption
- ✅ Progress tracking (watch time, scroll depth)

### Phase 2 (Core Features)
- ✅ AI-generated quizzes (static, admin-editable)
- ✅ AI Tutor (context-aware chat assistant)
- ✅ Departments with default course assignments
- ✅ Bulk employee upload (CSV)
- ✅ Enhanced dashboards with real metrics

### Phase 3 (Polish)
- ✅ Content generation agent (for articles)
- ✅ YouTube transcript integration
- ✅ AI-powered insights (admin dashboard)
- ✅ Loading states, empty states, animations
- ✅ Analytics page (sales tool)
- ✅ Full responsive design

---

## Database Schema (Key Collections)

```typescript
users: lyzrId, email, name, lyzrApiKey, credits, lastAccessedOrganization

organizations: name, slug, iconUrl, ownerId, settings

organizationMembers: organizationId, userId, email, role, status

departments: organizationId, name, defaultCourseIds, autoEnroll

courses: organizationId, title, category, status, estimatedDuration

modules: courseId, organizationId, title, order

lessons: moduleId, courseId, organizationId, title, contentType, 
         contentData {videoUrl, transcript, articleHtml}, hasQuiz, quizData

enrollments: userId, courseId, status, progressPercentage, 
             progress {completedLessonIds, currentLessonId}

lessonProgress: userId, lessonId, status, watchTime, scrollDepth, timeSpent

quizAttempts: userId, lessonId, attemptNumber, answers, score, passed

agentSessions: userId, sessionId, context, messages, isActive
```

---

## AI Agents

### 1. Lyzr Tutor (Employee-facing)
- **Purpose**: Conversational learning assistant
- **Context**: Dynamic based on current page/lesson
- **Tools**: getLessonContent, searchCourses, getUserProgress
- **Features**: Answer questions, explain concepts, quiz users, recommend content

### 2. Content Generator (Admin-facing)
- **Purpose**: Generate course articles
- **Input**: Topic, audience, objectives
- **Output**: Markdown article (400-800 words)

### 3. Quiz Generator (Admin-facing)
- **Purpose**: Generate assessment questions
- **Input**: Lesson content + transcript
- **Output**: JSON with 3-5 MCQs + explanations

---

## Design System (shadcn/ui)

### Layout
```tsx
<div className="flex h-screen">
  <AppSidebar />
  <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
    {/* Content */}
  </main>
  {/* AI Tutor Panel (employee view only) */}
</div>
```

### Typography
- **Page Title**: `text-3xl md:text-4xl font-bold`
- **Section Heading**: `text-xl md:text-2xl font-semibold`
- **Card Title**: `text-lg font-medium`
- **Body**: `text-base font-normal`
- **Muted**: `text-sm text-muted-foreground`

### Spacing
- Form fields: `gap-4`
- Sections: `gap-6` or `gap-8`
- Page padding: `p-4 md:p-6 lg:p-8`
- Card padding: `p-6`

### Components Available
All shadcn components in `@/components/ui/*`:
button, card, dialog, sheet, table, input, select, form, badge, progress, tabs, etc.

---

## Key API Routes

```
Auth:
POST /api/auth/callback
GET  /api/auth/session

Organizations:
GET  /api/organizations
POST /api/organizations
GET  /api/organizations/[id]/members
POST /api/organizations/[id]/members (single)
POST /api/organizations/[id]/members/bulk (CSV)

Courses:
GET  /api/organizations/[id]/courses
POST /api/organizations/[id]/courses
GET  /api/courses/[id]
GET  /api/courses/[id]/modules
POST /api/courses/[id]/modules

Lessons:
GET  /api/modules/[id]/lessons
POST /api/modules/[id]/lessons
GET  /api/lessons/[id]
POST /api/lessons/[id]/generate-quiz
POST /api/lessons/[id]/progress

Quizzes:
GET  /api/lessons/[id]/quiz
POST /api/lessons/[id]/quiz/attempts

AI:
POST /api/ai/chat
GET  /api/ai/sessions

Departments:
GET  /api/organizations/[id]/departments
POST /api/organizations/[id]/departments
```

---

## Implementation Priorities

### Week 1-2: Phase 1 (MVP)
1. Auth + org setup
2. Employee management (single add)
3. Course/module/lesson creation (YouTube + article)
4. Employee course consumption
5. Basic progress tracking

### Week 3-4: Phase 2 (Features)
6. Quiz generation + taking
7. AI Tutor integration
8. Departments + auto-assignment
9. Bulk employee upload
10. Enhanced dashboards

### Week 5: Phase 3 (Polish)
11. Content generator agent
12. YouTube transcripts
13. AI-powered insights
14. UI polish (loading, empty states, animations)
15. Analytics page (sales tool)
16. Performance optimization

---

## Critical Implementation Notes

### Progress Tracking Logic
```typescript
// Video: Mark complete when watched 90%
if (watchTime / videoDuration >= 0.9) markComplete()

// Article: Mark complete when scrolled 80% AND spent 50% of estimated time
if (scrollDepth >= 80 && readingTime >= estimatedTime * 0.5) markComplete()
```

### Quiz Behavior
- Generate once, store statically in `lessons.quizData`
- Admin can edit before publishing
- Employees can retake unlimited times
- Only first attempt counts for reporting
- Immediate feedback after each question

### AI Tutor Context
- Updates dynamically based on page navigation
- Includes: Current lesson content + transcript, user progress, all assigned courses
- Visual indicator shows current context
- Tools fetch additional content on demand

### Department Auto-Assignment
- Set default courses per department
- Pre-populate when adding employee to department
- Admin can override for specific employees
- Auto-enroll toggle (optional)

---

## Common Patterns

### Mongoose Model
```typescript
if (mongoose.models.Course) {
  delete mongoose.models.Course; // Always use latest schema
}
export default mongoose.model<ICourse>('Course', CourseSchema);
```

### Form with shadcn
```tsx
<Card className="p-6">
  <form className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Label htmlFor="name">Name</Label>
      <Input id="name" />
      <p className="text-sm text-muted-foreground">Helper text</p>
    </div>
    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline">Cancel</Button>
      <Button type="submit">Save</Button>
    </div>
  </form>
</Card>
```

### Toast Notifications
```typescript
import { toast } from "sonner"

toast.success("Course created successfully")
toast.error("Failed to save course")
toast.loading("Saving...")
```

---

## Environment Variables

```env
# MongoDB
MONGODB_URI=

# Lyzr
LYZR_CLIENT_ID=
LYZR_CLIENT_SECRET=
LYZR_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## File Structure Reference

```
app/
├── (auth)/
│   ├── login/
│   └── callback/
├── (app)/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── courses/
│   │   └── analytics/
│   └── (employee)/
│       ├── dashboard/
│       ├── courses/
│       └── lessons/
├── api/
│   ├── auth/
│   ├── organizations/
│   ├── courses/
│   ├── lessons/
│   └── ai/
└── layout.tsx

components/
├── ui/ (shadcn components)
├── app-sidebar.tsx
└── [feature-specific components]

lib/
├── auth/
├── db/
├── ai/
└── utils/

models/
├── user.ts
├── organization.ts
├── course.ts
└── [other models]

references/
└── hr_candidate_sourcing/ (reference implementation)
```

---

**Key Success Metrics for Demos:**
1. Admin creates course in < 2 minutes
2. AI generates relevant quiz questions
3. Employee asks AI complex question → gets accurate answer
4. Bulk upload 50 employees → completes in < 5 seconds
5. Progress tracking updates in real-time
6. AI insights card shows actionable recommendations

**Remember:** This is a POC for sales. Prioritize demo-ability over perfection!