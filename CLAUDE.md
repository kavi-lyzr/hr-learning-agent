# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered Learning & Development (L&D) platform for enterprises. It's a POC/promotional application designed for Lyzr to showcase agent capabilities in sales demonstrations. Users authenticate via Lyzr Studio OAuth and use Lyzr agents (dynamically created) with credit-based usage.

**Key Goal**: Demo-ability over perfection. This is for sales calls and closing deals.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (all components already installed in `src/components/ui/`)
- **Database**: MongoDB with Mongoose ODM
- **AI Backend**: Lyzr Agents (via `lyzr-agent` SDK from GitHub)
- **Auth**: Lyzr Studio OAuth
- **Notifications**: Sonner (toast library)

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack

# Build
npm run build            # Build for production with Turbopack

# Production
npm start                # Start production server

# Linting
npm run lint             # Run ESLint
```

## Information Architecture

```
Course (Top-level program)
  └── Module (Thematic section)
      └── Lesson (Learning unit)
          └── Content (Video/Article/Quiz)
```

**Example**: Course: "Sales Training" → Module: "Discovery" → Lesson: "Asking Questions" → Content: YouTube Video + Quiz

## User Roles

| Role | Access | Key Features |
|------|--------|--------------|
| **Admin** | Full admin view + employee preview | Create courses, manage employees, view analytics |
| **Employee** | Employee view only | View courses, consume content, chat with AI Tutor |

## Core Features (3 Phases)

### Phase 1 (MVP)
- OAuth authentication (Lyzr)
- Organization management
- Course/module/lesson creation (YouTube + articles)
- Employee dashboard & content consumption
- Progress tracking (watch time, scroll depth)

### Phase 2 (Core Features)
- AI-generated quizzes (static, admin-editable)
- AI Tutor (context-aware chat assistant)
- Departments with default course assignments
- Bulk employee upload (CSV)
- Enhanced dashboards with real metrics

### Phase 3 (Polish)
- Content generation agent (for articles)
- YouTube transcript integration
- AI-powered insights (admin dashboard)
- Loading states, empty states, animations
- Analytics page (sales tool)
- Full responsive design

## Database Schema (MongoDB Collections)

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

## AI Agents (Lyzr)

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

## Lyzr Integration Patterns

### Authentication Flow
See `references/hr_candidate_sourcing/src/app/api/auth/route.ts` for pattern:
1. User logs in with Lyzr OAuth
2. Backend receives: `lyzrId`, `email`, `name`, `lyzrApiKey`
3. Call `createOrUpdateUserAndAgents()` to ensure user + agents exist
4. Store encrypted API key in MongoDB

### Agent Creation Pattern
See `references/hr_candidate_sourcing/src/lib/lyzr-services.ts`:
```typescript
// 1. Create/update tools (OpenAPI spec with user-specific auth token)
const toolIds = await createToolsForUser(lyzrApiKey, userId);

// 2. Create agents with tools
const agentId = await createLyzrAgent(lyzrApiKey, agentConfig, toolIds);

// 3. Store agent version in user document
user.tutorAgent = { agentId, version: LATEST_VERSION };
```

### Agent Version Management
See `references/hr_candidate_sourcing/src/lib/agent-config.ts`:
- Define `LATEST_AGENT_VERSION` constants (e.g., "1.7.2")
- On login, check if user's agent version matches current
- If mismatch, call `updateLyzrAgent()` to update configuration
- This allows changing prompts/tools without recreating agents

### Tool Creation (OpenAPI)
Tools are defined as OpenAPI specs that point to Next.js API routes:
```typescript
const toolConfig = {
  openapi: "3.0.0",
  paths: {
    "/api/tools/my_tool": {
      post: {
        summary: "Tool description",
        operationId: "my_tool",
        // ... parameters
      }
    }
  }
};
```

### Chat with Agents
```typescript
import { chatWithLyzrAgent } from '@/lib/lyzr-services';

const result = await chatWithLyzrAgent(
  apiKey,
  agentId,
  message,
  userId,
  { datetime: new Date().toISOString(), user_name: "John" }, // system prompt variables
  sessionId // optional, for conversation continuity
);
```

## Key API Routes (To Be Created)

```
Auth:
POST /api/auth/callback          # Lyzr OAuth callback

Organizations:
GET  /api/organizations          # List user's orgs
POST /api/organizations          # Create org
GET  /api/organizations/[id]/members
POST /api/organizations/[id]/members      # Add single employee
POST /api/organizations/[id]/members/bulk # CSV upload

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
POST /api/ai/chat                # Chat with Lyzr Tutor
GET  /api/ai/sessions            # Get chat history

Departments:
GET  /api/organizations/[id]/departments
POST /api/organizations/[id]/departments
```

## Common Patterns

### Mongoose Model Definition
Always delete cached models to ensure latest schema:
```typescript
import mongoose, { Document, Schema } from 'mongoose';

interface ICourse extends Document {
  // ... fields
}

const CourseSchema = new Schema<ICourse>({
  // ... schema
});

// IMPORTANT: Clear cache to use latest schema
if (mongoose.models.Course) {
  delete mongoose.models.Course;
}

export default mongoose.model<ICourse>('Course', CourseSchema);
```

### Form with shadcn/ui
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
import { toast } from "sonner";

toast.success("Course created successfully");
toast.error("Failed to save course");
toast.loading("Saving...");
```

### API Route with Auth
```typescript
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    // ... logic
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
```

## Progress Tracking Logic

```typescript
// Video: Mark complete when watched 90%
if (watchTime / videoDuration >= 0.9) markComplete()

// Article: Mark complete when scrolled 80% AND spent 50% of estimated time
if (scrollDepth >= 80 && readingTime >= estimatedTime * 0.5) markComplete()
```

## Quiz Behavior
- Generate once, store statically in `lessons.quizData`
- Admin can edit before publishing
- Employees can retake unlimited times
- Only first attempt counts for reporting
- Immediate feedback after each question

## Design System

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

### Layout Pattern
```tsx
<div className="flex h-screen">
  <AppSidebar />
  <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
    {/* Content */}
  </main>
  {/* AI Tutor Panel (employee view only) */}
</div>
```

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

# Encryption (for storing API keys)
ENCRYPTION_KEY=
```

## Reference Implementation

The `references/hr_candidate_sourcing/` directory contains a complete working Lyzr application:
- **Use for**: Auth patterns, agent creation, tool definition, chat streaming
- **Key files**:
  - `src/lib/lyzr-services.ts`: Core Lyzr integration
  - `src/lib/agent-config.ts`: Agent configuration patterns
  - `src/app/api/auth/route.ts`: OAuth callback
  - `src/models/user.ts`: User schema with agent storage

## Current State

**IMPORTANT**: The current codebase is a BOILERPLATE from the candidate sourcing app. Feel free to:
- Delete any files not needed for the L&D platform
- Overwrite existing code
- Keep only the reference implementation in `references/` folder
- Reuse UI components from `src/components/ui/` (already set up)

## Development Approach

For step-by-step development:
1. Start with authentication + organization setup
2. Build admin views (courses, employees, departments)
3. Build employee views (dashboard, course consumption)
4. Add AI agents (tutor, quiz generator, content generator)
5. Add polish (loading states, animations, analytics)

For spec details, see:
- `lyzr_ld_short_spec.md` - Quick reference
- `lyzr_ld_platform_spec.md` - Complete detailed spec

# Lyzr AI Frontend Design & Vibe Coding Guide

This document outlines the design system, principles, and component usage guidelines for building premium, intuitive, and polished user interfaces for Lyzr AI. This guide should serve as the primary instruction set for developing frontend features. The core philosophy is **intentional design**: every choice, from component selection to spacing, must be deliberate and user-centric.

Our tech stack is **Next.js**, **TypeScript**, **Tailwind CSS v4**, and **shadcn/ui**. All file paths should reference the project structure, using the `@` alias defined in `components.json`.

## Core Design Principles

Before writing any code, adhere to these foundational principles:

1.  **User-Centric & Intuitive**: The primary goal is to minimize cognitive load. Interfaces should be self-explanatory. User flows must be optimized for the fewest clicks and least amount of thought. Always ask: "What is the user trying to achieve, and how can we make it effortless?"
2.  **Clarity & Consistency**: A consistent visual language builds trust and makes the application predictable. Spacing, typography, and component behavior must be uniform across the entire platform. Refer to the specific guidelines below for typography and spacing scales.
3.  **Mobile-First Responsiveness**: All designs must begin with the mobile viewport and scale up gracefully. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`) to adapt layouts. Functionality should never be compromised on smaller screens; instead, adapt components to fit the context (e.g., using a `Select` instead of `Tabs`).
4.  **Premium Aesthetics**: We are not just building a functional tool; we are crafting a premium experience. This is achieved through meticulous attention to detail: ample whitespace, a balanced typographic hierarchy, subtle animations, and a polished finish on every component.

-----

## Layout & Structure

Structure is the backbone of the UI. Use `flexbox` for most layouts and `grid` for more complex, two-dimensional arrangements.

  * **Overall Page Layout**: A standard page should consist of a primary sidebar (`@/components/app-sidebar.tsx`) and a main content area. The main content area should have consistent horizontal padding to ensure content doesn't touch the screen edges.
    ```css
    /* Example structure */
    <div class="flex h-screen">
      <AppSidebar />
      <main class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {/* Page content goes here */}
      </main>
    </div>
    ```
  * **Flexbox**: Use `flex` for most component compositions.
      * Use `flex flex-col` for vertically stacked items like form fields, card content, or sections.
      * Use `flex flex-row` for horizontally aligned items like buttons in a form footer, items in a header, or icon-label pairs.
      * Use `gap-*` utilities extensively for consistent spacing between elements within a flex container. Avoid using margins for this purpose.
  * **Grid**: Use `grid` when you need to align items in a two-dimensional structure, such as a dashboard with multiple cards of varying sizes or a complex settings page.
  * **Sidebar Navigation**: The order of items in `@/components/app-sidebar.tsx` must be logical and prioritized based on user workflow. The most frequent and critical tasks (e.g., "Dashboard," "Chatbots") should be at the top. Secondary or settings-related items ("API Keys," "Settings," "Logout") should be grouped and placed at the bottom.

-----

## Spacing & Typography

Consistency here is non-negotiable. These are not suggestions but rules. The base font is **Switzer**, as defined in `@/app/globals.css`.

### Spacing

We use Tailwind's default spacing scale (multiples of 0.25rem).

| Use Case | Tailwind Class | Notes |
| :--- | :--- | :--- |
| **Page Padding** | `p-4 md:p-6 lg:p-8` | Creates breathing room around the main content. |
| **Card Padding** | `p-6` | Consistent internal padding for all `Card` components. |
| **Inter-Element (Vertical)** | `gap-4` or `gap-6` | Use in `flex-col` containers for spacing between form fields, text blocks, etc. |
| **Inter-Element (Horizontal)**| `gap-2` or `gap-4` | Use in `flex-row` containers for icons and text, or adjacent buttons. |
| **Section Spacing** | `py-8` or `py-12` | Larger vertical spacing to separate distinct sections on a page. |

### Typography

Establish a clear visual hierarchy using this scale.

| Use Case | Tailwind Class | Font Weight | Notes |
| :--- | :--- | :--- | :--- |
| **Page Title** | `text-3xl` or `text-4xl` | `font-bold` | Use once per page for the main `H1`. |
| **Section Heading** | `text-xl` or `text-2xl` | `font-semibold` | For major sections within a page (`H2`). |
| **Card Title** | `text-lg` | `font-medium` | For titles inside `@/components/ui/card.tsx`. |
| **Body Text** | `text-base` | `font-normal` | The default for all paragraphs and general text. |
| **Subtle/Muted Text** | `text-sm text-muted-foreground`| `font-normal` | For helper text, captions, or secondary information. |
| **Button/Label Text** | `text-sm` | `font-medium` | For all buttons and form labels. |

-----

## Component Patterns & Best Practices

This section details how to combine components to solve common UI problems.

### Forms & Inputs

  * **Structure**: Always wrap forms or groups of related inputs in a `@/components/ui/card.tsx` for clear visual grouping.
  * **Layout**: Use `flex flex-col gap-4` for the main form structure. Each form element should consist of a `@/components/ui/label.tsx`, the `@/components/ui/input.tsx` (or `select`, `textarea`, etc.), and optionally, a muted helper text below the input.
  * **Actions**: Form action buttons (`@/components/ui/button.tsx`) should be placed at the bottom, typically right-aligned. The primary action (e.g., "Save") should be solid, while secondary actions (e.g., "Cancel") should have the `variant="outline"` or `variant="ghost"`.

### Responsive Navigation

  * **Problem**: A navigation bar with many items (e.g., 5+ tabs) looks cluttered on mobile.
  * **Solution**:
    1.  On **desktop and tablet** (`md:` breakpoint and up), use the `@/components/ui/tabs.tsx` component for clear, one-click access.
    2.  On **mobile** (screens smaller than `md:`), hide the `Tabs` component and show a `@/components/ui/select.tsx` component instead. Populate the `Select` with the same navigation items. This provides a familiar, space-efficient, and native-feeling mobile experience.

### Data Display

  * **Tables**: For dense, structured data (e.g., logs, user lists, billing history), use the `@/components/ui/table.tsx`. Ensure it's wrapped in a responsive container to allow horizontal scrolling on small screens if needed.
  * **Cards**: For less dense, more visual information (e.g., a list of projects, chatbot previews), use a `grid` of `@/components/ui/card.tsx` components. This allows for more flexible and visually engaging layouts.

### Icons

  * Use icons from `lucide-react` as specified in `components.json`.
  * Icons inside buttons or next to labels should be small (`size={16}` or `className="h-4 w-4"`).
  * Maintain a `gap-2` between an icon and its corresponding text.

-----

## Available Component Library

The following components are available for use. Prioritize using these existing components over creating new ones to maintain consistency.

### UI Components (from shadcn)

  * `@/components/ui/accordion.tsx`
  * `@/components/ui/alert-dialog.tsx`
  * `@/components/ui/alert.tsx`
  * `@/components/ui/aspect-ratio.tsx`
  * `@/components/ui/avatar.tsx`
  * `@/components/ui/badge.tsx`
  * `@/components/ui/breadcrumb.tsx`
  * `@/components/ui/button.tsx`
  * `@/components/ui/calendar.tsx`
  * `@/components/ui/card.tsx`
  * `@/components/ui/carousel.tsx`
  * `@/components/ui/chart.tsx`
  * `@/components/ui/checkbox.tsx`
  * `@/components/ui/collapsible.tsx`
  * `@/components/ui/command.tsx`
  * `@/components/ui/context-menu.tsx`
  * `@/components/ui/dialog.tsx`
  * `@/components/ui/drawer.tsx`
  * `@/components/ui/dropdown-menu.tsx`
  * `@/components/ui/form.tsx`
  * `@/components/ui/hover-card.tsx`
  * `@/components/ui/input-otp.tsx`
  * `@/components/ui/input.tsx`
  * `@/components/ui/label.tsx`
  * `@/components/ui/menubar.tsx`
  * `@/components/ui/navigation-menu.tsx`
  * `@/components/ui/pagination.tsx`
  * `@/components/ui/popover.tsx`
  * `@/components/ui/progress.tsx`
  * `@/components/ui/radio-group.tsx`
  * `@/components/ui/resizable.tsx`
  * `@/components/ui/scroll-area.tsx`
  * `@/components/ui/select.tsx`
  * `@/components/ui/separator.tsx`
  * `@/components/ui/sheet.tsx`
  * `@/components/ui/skeleton.tsx`
  * `@/components/ui/slider.tsx`
  * `@/components/ui/sonner.tsx`
  * `@/components/ui/switch.tsx`
  * `@/components/ui/table.tsx`
  * `@/components/ui/tabs.tsx`
  * `@/components/ui/textarea.tsx`
  * `@/components/ui/toggle-group.tsx`
  * `@/components/ui/toggle.tsx`
  * `@/components/ui/tooltip.tsx`

### Custom Application Components

  * `@/components/app-sidebar.tsx`
  * `@/components/chart-area-interactive.tsx`
  * `@/components/data-table.tsx`
  * `@/components/nav-documents.tsx`
  * `@/components/nav-main.tsx`
  * `@/components/nav-secondary.tsx`
  * `@/components/nav-user.tsx`
  * `@/components/section-cards.tsx`
  * `@/components/site-header.tsx`
