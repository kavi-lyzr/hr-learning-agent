# Lyzr L&D Platform - Complete Specification

## Project Overview

### Purpose
An AI-powered Learning & Development (L&D) platform for enterprise HR/product managers and their employees. This is a **feature-complete POC/promotional application** designed for sales demonstrations and to showcase Lyzr's agent capabilities. Users authenticate via Lyzr Studio and utilize their own Lyzr agents (created dynamically) with credit-based usage.

### Business Context
- **Primary Use**: Sales demonstrations and closing enterprise deals
- **Distribution**: Lyzr app store + direct sales calls
- **Monetization**: Credit-based (users purchase credits on Lyzr Studio)
- **Scope**: Standalone promotional POC; enterprise custom versions are out of scope

### Design Philosophy
> "Powerful yet effortless. Every decision reduces cognitive load."

- **User-Centric & Intuitive**: Minimize clicks, maximize clarity
- **Hierarchy-First Design**: Use spacing, contrast, typography over decoration
- **Recognition Over Recall**: Show context, don't make users remember
- **Premium Aesthetics**: Polished, professional, enterprise-ready

---

## Tech Stack

### Core Technologies
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: MongoDB
- **ODM**: Mongoose
- **AI Backend**: Lyzr Agents (via Lyzr SDK)

### Key Libraries
- **Auth**: Lyzr Studio OAuth SDK
- **Rich Text**: Tiptap or similar
- **Markdown Rendering**: `marked` or Vercel's `streamdown`
- **Icons**: lucide-react
- **Toast Notifications**: sonner (shadcn)
- **YouTube API**: For transcript fetching

### Project Structure Reference
Refer to `references/hr_candidate_sourcing/` for:
- Authentication patterns with Lyzr SDK
- Agent creation and management
- Database patterns with Mongoose
- Component structure and design system implementation
- Error handling and loading states

---

## Information Architecture

### Naming Convention (Industry Standard)
```
Course (Top-level learning program)
  └── Module (Thematic section within course)
      └── Lesson (Individual learning unit)
          └── Content Items (Video, Article, Quiz)
```

**Example:**
- **Course**: "New Employee Onboarding"
  - **Module**: "Week 1: Company Culture"
    - **Lesson**: "Our Mission & Values"
      - Content: Video (5 min) + Article (3 min read)
    - **Lesson**: "Understanding Our Products"
      - Content: Article + Quiz
  - **Module**: "Week 2: Your Role"
    - ...

---

## User Roles & Permissions

| Role | Access | Capabilities |
|------|--------|-------------|
| **Admin** | Full access to Admin View + Employee Preview | Create/manage courses, employees, departments; view analytics; configure settings |
| **Employee** | Employee View only | View assigned courses, consume content, take assessments, interact with AI Tutor |

---

## Part 1: Authentication & Organization Management

### Auth Flow

#### 1. Login Process
```
User clicks "Login with Lyzr" 
  → Lyzr Studio OAuth screen
  → User authorizes app
  → App receives: lyzrId, email, name, avatarUrl, lyzrApiKey
  → Check user status
```

#### 2. User Status Check

**Existing User (has `lastAccessedOrganization`):**
```
→ Redirect directly to that organization's dashboard
→ Role-based view (Admin or Employee)
```

**New User:**
```
→ Show "Welcome, [Name]!" screen with:
   ├─ "Organizations You Can Join" section
   │  └─ Query organizationInvites collection by email
   │  └─ Display as cards with: Org name, icon, "Join" button
   └─ "Create New Organization" CTA (primary button)
      └─ Opens modal: Organization Name, Icon Upload (optional)
```

#### 3. Post-Login Navigation

**Header Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Org Icon + Name ▼]        App Title    [Admin/Employee ▼] [🌙] [Avatar ▼] │
└─────────────────────────────────────────────────────────────┘
     └─ Org Switcher                        └─ View Switcher (Admin only)
```

**Organization Switcher (Left):**
- Current org icon + name
- Dropdown shows:
  - All user's organizations
  - Organization Settings (admins only)
  - "+ Create New Organization"

**View Switcher (Right, Admin Only):**
- Segmented control: `[Admin View] [Employee Preview]`
- Clear visual indicator of current mode
- Provides "Visibility of System Status" (Nielsen's heuristic)

---

## Part 2: Admin View - Command Center

### Design Principles for Admin UI
- **Task-Oriented**: Every page answers "What do I need to do now?"
- **Fitts's Law**: Common actions have large, easily clickable targets
- **Consistency**: Same patterns across all management pages

---

### 1. Dashboard Page

**Purpose:** At-a-glance insights + quick actions

**Layout Structure:**
```
┌─ Key Metrics (Top Row - 4 Cards) ─────────────────────────┐
│ Active Employees    Completion Rate    Learning Hours    Active Courses │
│     125 (+3)           78% (↑5%)         525h (↑45h)         12        │
└────────────────────────────────────────────────────────────┘

┌─ AI-Powered Insights Card (Prominent) ────────────────────┐
│ 💡 3 employees in Sales are falling behind on            │
│    "Q4 Product Updates"                                   │
│ [Send Reminder] [View Employees]                          │
└────────────────────────────────────────────────────────────┘

┌─ Recent Activity Feed (Left 2/3) ─┬─ Quick Actions (Right 1/3) ─┐
│ • John completed "Onboarding"     │ [+ Add Employees]            │
│ • Sarah started "Sales Training"  │ [+ Create Course]            │
│ • 5 employees passed assessments  │ [📊 View Reports]           │
│   (2 hours ago)                   │ [⚙️ Manage Departments]     │
└────────────────────────────────────┴──────────────────────────────┘
```

**Metrics Calculations:**
```typescript
// Active Employees
OrganizationMember.countDocuments({ 
  organizationId, 
  role: 'employee', 
  status: 'active' 
})

// Avg Completion Rate
Enrollment.aggregate([
  { $match: { organizationId } },
  { $group: { _id: null, avgProgress: { $avg: '$progressPercentage' } }}
])

// Learning Hours (This Month)
QuizAttempt.aggregate([
  { $match: { organizationId, createdAt: { $gte: startOfMonth } }},
  { $group: { _id: null, totalSeconds: { $sum: '$timeSpent' } }}
])
```

---

### 2. Employees Page (People Management)

**Layout:** Two tabs using `@/components/ui/tabs.tsx`

#### Tab 1: All Employees

**Top Bar:**
```
[Search by name/email...] [Filter: All Departments ▼] [+ Add Employee] [📥 Bulk Import]
```

**Add Employee Modal:**
```typescript
// Two options in modal
[Single Employee] [Bulk Upload] (tabs)

Single Employee Fields:
- Name (optional)
- Email (required, validated)
- Department (dropdown with "+ Create New")
- Assigned Courses (multi-select, pre-populated from department defaults)
  └─ Override option: Manually add/remove courses

Bulk Upload:
- Download Template (CSV: name,email,department)
- Drag & Drop or Browse
- Preview table before import
- Validation errors shown inline
- Courses auto-assigned based on department defaults
```

**Employee Table:**
```
┌──────────────────────────────────────────────────────────────┐
│ Name/Email        Department    Courses    Progress  Last Active  Actions │
├──────────────────────────────────────────────────────────────┤
│ 👤 John Doe       Sales         5/8       ▓▓▓▓▓░░░  2h ago    [✏️] [🗑️] │
│    john@co.com                            62%                           │
├──────────────────────────────────────────────────────────────┤
│ 👤 Sarah Smith    Engineering   3/5       ▓▓▓▓▓▓░░  1d ago    [✏️] [🗑️] │
│    sarah@co.com                           85%                           │
└──────────────────────────────────────────────────────────────┘
```

**Table Features:**
- Sortable columns (name, department, progress, last active)
- Filterable by department and progress range
- Batch actions (assign courses to multiple employees)
- Click row to expand details (assigned courses list, detailed progress)

#### Tab 2: Departments

**Purpose:** Manage departments + configure default learning paths

**Layout:**
```
[+ Create Department]

┌─ Sales Department ─────────────────────────────────────────┐
│ 12 employees • 3 default courses                           │
│                                                              │
│ Default Learning Path:                                      │
│ • Sales Fundamentals 101                                   │
│ • Product Knowledge Deep Dive                              │
│ • Customer Success Strategies                              │
│                                                              │
│ ☑️ Auto-enroll new employees in default courses            │
│ [Edit Department] [Delete]                                  │
└──────────────────────────────────────────────────────────────┘
```

**Department Creation Modal:**
```
Fields:
- Department Name
- Default Courses (multi-select from all published courses)
- Auto-enroll toggle (default: ON)
```

**Assignment Flow (Hybrid Approach):**
1. When adding employee to "Sales" department
2. System pre-selects: Sales Fundamentals, Product Knowledge, Customer Success
3. Admin can override: Add "Advanced Sales Techniques" or remove "Customer Success"
4. On save, employee gets final course list
5. If auto-enroll is ON, future employees automatically get defaults

---

### 3. Courses & Content Management

**Page Structure:** Course Overview → Course Detail → Module Detail → Lesson Edit

#### 3.1 Course Overview Page

**Top Section:**
```
Page Title: "Courses"                    [+ Create Course]
```

**Course Table/Cards:**
```
┌───────────────────────────────────────────────────────────────┐
│ Title               Category      Modules  Enrolled  Completion  Status   │
├───────────────────────────────────────────────────────────────┤
│ New Hire Onboarding Onboarding    4        45        78%        Published│
│ Sales Fundamentals  Sales         6        23        45%        Published│
│ Product Training    Technical     3        12        92%        Draft    │
└───────────────────────────────────────────────────────────────┘
```

**Create Course Modal:**
```
Fields:
- Course Title (required)
- Category (dropdown: Onboarding, Technical, Sales, Soft Skills, Compliance, Other)
- Description (rich text, optional)
- Thumbnail Upload (optional)
- Status (Draft by default)

[Cancel] [Create Course]
```

#### 3.2 Course Detail Page

**Header:**
```
← Back to Courses

[Course Title - Editable inline]
[Course Description - Editable inline]
Status: [Draft ▼]  |  [👁️ Preview as Employee] [⚙️ Course Settings]
```

**Tabs:**
```
[Overview] [Modules] [Enrollments] [Settings]
```

**Overview Tab:**
- Course metadata card (created date, last updated, author)
- Quick stats: Total modules, Total lessons, Avg completion time, Enrolled employees
- Module list (read-only, links to Modules tab)

**Modules Tab:**
```
[+ Add Module]

Modules (Drag to reorder):
┌─ Module 1: Company Culture ───────────────────────────────┐
│ 3 lessons • 45 min • Status: Published                    │
│ [📝 Edit] [🗑️ Delete] [⋮ Move]                            │
└────────────────────────────────────────────────────────────┘

┌─ Module 2: Your Role & Responsibilities ──────────────────┐
│ 5 lessons • 1h 20min • Status: Draft                      │
│ [📝 Edit] [🗑️ Delete] [⋮ Move]                            │
└────────────────────────────────────────────────────────────┘
```

**Add/Edit Module Modal:**
```
Fields:
- Module Title
- Description
- Order (auto-assigned, editable)
- Status (Draft/Published/Archived)

[Save Module]
```

**Enrollments Tab:**
- Table of enrolled employees with individual progress
- Filters: By department, by status
- Bulk actions: Unenroll, Send reminder

**Settings Tab:**
- Auto-enroll departments selector
- Completion requirements (e.g., "Must pass all quizzes")
- Certificate settings (Phase 3)
- Danger zone: Archive/Delete course

#### 3.3 Module Detail Page (Lesson Management)

**Accessed by:** Clicking "Edit" on a module

**Header:**
```
← Back to Course

Module: [Title - Editable]
Course: [Course Name - Link]
Status: [Published ▼]
```

**Lesson List:**
```
[+ Add Lesson]

Lessons (Drag to reorder):
┌─────────────────────────────────────────────────────────────┐
│ 📹 1. Welcome to the Company (5 min)                [✏️] [🗑️]│
│    Status: Published • Has Quiz: Yes                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 📄 2. Our Mission & Values (8 min read)            [✏️] [🗑️]│
│    Status: Published • Has Quiz: No                         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 📹 3. Meeting Your Team (12 min)                   [✏️] [🗑️]│
│    Status: Draft • Has Quiz: Yes                            │
└─────────────────────────────────────────────────────────────┘
```

#### 3.4 Lesson Creation/Edit (Side Panel)

**Opens:** `@/components/ui/sheet.tsx` (side panel, not modal - more space)

**Structure:**
```
┌─ Create/Edit Lesson ──────────────────────────────────────┐
│                                                     [✕ Close]│
│ Basic Information                                          │
│ ─────────────────                                          │
│ Lesson Title                                               │
│ [                                               ]          │
│                                                            │
│ Description (optional)                                     │
│ [                                               ]          │
│                                                            │
│ Content Type                                               │
│ ○ YouTube Video  ○ Article                                │
│                                                            │
│ ┌─ YouTube Video Setup ─────────────────────────────────┐ │
│ │ YouTube URL                                            │ │
│ │ [https://youtube.com/watch?v=...]                     │ │
│ │ [Fetch Transcript]                                     │ │
│ │                                                        │ │
│ │ Transcript Preview (Editable)                          │ │
│ │ ┌────────────────────────────────────────────────┐    │ │
│ │ │ Welcome to the company! Today we'll cover...   │    │ │
│ │ │                                                 │    │ │
│ │ └────────────────────────────────────────────────┘    │ │
│ │ ✓ Transcript fetched and saved                        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌─ OR Article Content ──────────────────────────────────┐ │
│ │ [Rich Text Editor - Tiptap]                           │ │
│ │                                                        │ │
│ │ Toolbar: [B] [I] [H1] [H2] [•] [1.] [Link] [Image]  │ │
│ │                                                        │ │
│ │ Content area...                                       │ │
│ │                                                        │ │
│ │ Word count: 450 words • Est. reading time: 3 min     │ │
│ │                                                        │ │
│ │ [✨ Generate with AI] ← Triggers Content Gen Agent   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Knowledge Check                                            │
│ ─────────────────                                          │
│ ☑️ Enable Knowledge Check (Quiz)                          │
│                                                            │
│ ┌─ Quiz Questions ───────────────────────────────────────┐ │
│ │ [🔄 Regenerate Questions]                             │ │
│ │                                                        │ │
│ │ Question 1                                            │ │
│ │ What is our company's primary mission?                │ │
│ │ ○ To maximize profits                                 │ │
│ │ ● To empower customers through technology ✓           │ │
│ │ ○ To expand globally                                  │ │
│ │ ○ To innovate continuously                            │ │
│ │                                                        │ │
│ │ Explanation: Our mission statement clearly...         │ │
│ │ [Edit Question]                                        │ │
│ │                                                        │ │
│ │ [+ Add Question Manually]                             │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Settings                                                   │
│ ────────                                                   │
│ Estimated Duration: [15] minutes (auto-calculated)        │
│ Status: [Published ▼]                                     │
│ Order: [3] (in module)                                    │
│                                                            │
│ ───────────────────────────────────────────────────────    │
│                     [Cancel] [👁️ Preview] [Save Lesson]  │
└────────────────────────────────────────────────────────────┘
```

**Duration Auto-Calculation:**
```typescript
// Video: Use actual video duration from YouTube API
// Article: Word count ÷ 250 words/min
// Quiz: 1 minute per question
// Total = Video/Article time + Quiz time
```

**Quiz Generation Flow:**
1. Admin creates lesson content (video with transcript OR article)
2. Toggle "Enable Knowledge Check"
3. Click "Generate Questions" (or auto-trigger on save)
4. **Quiz Generation Agent** (structured output) analyzes content
5. Returns JSON with 3-5 MCQs + explanations
6. Questions appear in editable interface
7. Admin reviews/edits before publishing
8. Questions stored statically in `lessons.quizData`

**Why Static Questions:**
- ✅ Consistent experience for all employees
- ✅ Admin quality control
- ✅ Cost-effective (generate once)
- ✅ Easier tracking and analytics
- ✅ Allows meaningful retakes (reinforces learning)

---

### 4. Analytics Page (Sales Tool)

**Purpose:** Show potential, not functionality (for POC)

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│         [Ghosted/Blurred Dashboard Charts]                  │
│                                                              │
│              ┌──────────────────────────┐                   │
│              │  Unlock Deeper Insights   │                   │
│              │                           │                   │
│              │  See how Lyzr's advanced  │                   │
│              │  analytics can transform  │                   │
│              │  your L&D strategy.       │                   │
│              │                           │                   │
│              │  • Learning path analytics│                   │
│              │  • Predictive insights    │                   │
│              │  • Custom reports         │                   │
│              │  • ROI tracking          │                   │
│              │                           │                   │
│              │  [Schedule a Demo]        │                   │
│              └──────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 3: Employee View - Learning Experience

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Header (Org Name, Theme Toggle, User Menu)                 │
├────────┬─────────────────────────────┬─────────────────────┤
│ Sidebar│   Main Content Area         │  Lyzr Tutor Panel  │
│ (240px)│   (flex-1)                  │  (320px, resizable) │
│        │                             │                     │
│ [Home] │ Dashboard / Course Content  │ 🤖 Lyzr Tutor      │
│ [Learn]│                             │                     │
│        │                             │ Context: Dashboard  │
│ [📚]   │                             │                     │
│ Course │                             │ Suggestions:        │
│ Tree   │                             │ • What should I... │
│        │                             │ • Summarize my...  │
│ [⚙️]   │                             │                     │
│        │                             │ [Type message...]   │
└────────┴─────────────────────────────┴─────────────────────┘
```

**Key Features:**
- Sidebar is collapsible on mobile (hamburger menu)
- Lyzr Tutor panel is:
  - Always visible on desktop
  - Collapsible (slide-out on mobile)
  - Resizable via drag handle
  - Persistent across page navigation (layout component)

---

### 1. Employee Dashboard

**Hero Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ Welcome back, John! 👋                                      │
│                                                              │
│ ┌─ Continue Where You Left Off ──────────────────────────┐ │
│ │ 📹 Discovery Techniques (Module 2, Lesson 3)           │ │
│ │ Sales Fundamentals                                     │ │
│ │ ▓▓▓▓▓▓▓░░░ 65% complete                               │ │
│ │                                    [Continue Learning →]│ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Stats Section:**
```
┌──────────────┬──────────────┬──────────────┐
│ Courses      │ Learning     │ Current      │
│ Completed    │ Hours        │ Streak       │
│    3/8       │   12.5h      │   5 days 🔥  │
└──────────────┴──────────────┴──────────────┘
```

**My Learning Path (Course Cards Grid):**
```
┌─────────────────────────┐ ┌─────────────────────────┐
│ [Course Thumbnail]      │ │ [Course Thumbnail]      │
│                         │ │                         │
│ Sales Fundamentals      │ │ Product Deep Dive       │
│ Master discovery calls, │ │ Comprehensive overview  │
│ objection handling...   │ │ of our product suite... │
│                         │ │                         │
│ ⏱ 2h 30m • 6 modules   │ │ ⏱ 4h 15m • 8 modules   │
│ ▓▓▓▓▓▓▓░░░ 65%         │ │ ▓▓▓░░░░░░░ 30%         │
│ [Continue Learning →]   │ │ [Continue Learning →]   │
└─────────────────────────┘ └─────────────────────────┘

┌─────────────────────────┐ ┌─────────────────────────┐
│ [Course Thumbnail]      │ │ [Course Thumbnail]      │
│ ✅ Completed            │ │ 🔒 Not Started          │
│ New Hire Onboarding     │ │ Advanced Sales          │
│ ...                     │ │ ...                     │
│ [Review Course]         │ │ [Start Course →]        │
└─────────────────────────┘ └─────────────────────────┘
```

**Status Indicators:**
- 🟢 In Progress (green badge)
- 🔵 Not Started (blue badge)
- ✅ Completed (green checkmark)
- 🔒 Locked (if prerequisites exist - Phase 3)

---

### 2. Course Library Page

**View Toggle:**
```
[Grid View 🔲] [List View ☰]  [Filter: All ▼] [Sort: Recently Accessed ▼]
```

**Grid View (Default):**
- 3 columns on desktop, 2 on tablet, 1 on mobile
- Each card shows: Thumbnail, title, description, stats, progress, CTA

**List View:**
- Compact table format
- More courses visible at once
- Better for employees with many assignments

---

### 3. Course Overview Page (Module List)

**Breadcrumb:**
```
Home > My Courses > Sales Fundamentals
```

**Header:**
```
Sales Fundamentals
Master the art of selling in 6 comprehensive modules

⏱ 2h 30min total • 6 modules • 18 lessons
Progress: ▓▓▓▓▓▓▓░░░ 65% complete
```

**Module Accordion/List:**
```
┌─ Module 1: Introduction to Sales ✅ Completed ────────────┐
│ ├─ 📹 Welcome Video (5 min) ✅                            │
│ ├─ 📄 Sales Methodology (8 min read) ✅                   │
│ └─ 📝 Module 1 Assessment ✅ 90%                          │
└────────────────────────────────────────────────────────────┘

┌─ Module 2: Discovery & Qualification ⏸️ In Progress ──────┐
│ ├─ 📹 Discovery Techniques (12 min) ✅                    │
│ ├─ 📹 Asking the Right Questions (10 min) 🔵 Current     │
│ ├─ 📄 Discovery Framework (6 min read) 🔒                │
│ └─ 📝 Module 2 Assessment 🔒                              │
└────────────────────────────────────────────────────────────┘

┌─ Module 3: Objection Handling 🔒 Locked ──────────────────┐
│ Complete Module 2 to unlock                               │
└────────────────────────────────────────────────────────────┘
```

**Action Button:**
```
[Continue: Discovery Techniques →] (context-aware)
```

---

### 4. Lesson Content View (Core Learning Experience)

**Layout:**
```
┌─ Main Content (Left 70%) ─────────────┬─ Lyzr Tutor (Right 30%) ─┐
│ ← Module 2: Discovery                 │ 🤖 Lyzr Tutor            │
│                                        │ Context: Discovery       │
│ Lesson 2: Asking the Right Questions  │ Techniques               │
│ ─────────────────────────────────────  │                          │
│                                        │ I'm here to help you     │
│ [▶ Play Video - 10:24]                │ master this lesson!      │
│ [YouTube Video Player]                 │                          │
│                                        │ Suggestions:             │
│ ──────────────────────────────────────  │ • Summarize this lesson  │
│ [◄◄ Previous Lesson] [Next Lesson ►►] │ • Quiz me on key points │
│                                        │ • Show me examples       │
│                                        │                          │
│                                        │ [Type your question...]  │
└────────────────────────────────────────┴──────────────────────────┘
```

**For Video Content:**
- Native YouTube embed (using react-youtube or iframe)
- Track watch time via YouTube API events
- Mark as complete when watched 90%+ OR user clicks "Mark Complete"

**For Article Content:**
```
┌─ Article Content ───────────────────────────────────────────┐
│ # Asking the Right Questions                                │
│                                                              │
│ Great discovery conversations start with...                 │
│                                                              │
│ ## The SPIN Framework                                       │
│                                                              │
│ - **Situation** questions...                                │
│ - **Problem** questions...                                  │
│ - **Implication** questions...                              │
│ - **Need-payoff** questions...                              │
│                                                              │
│ [Rich text rendered from stored HTML]                       │
│                                                              │
│ ────────────────────────────────────────                    │
│ Reading time: 6 minutes                                     │
│ Progress: Auto-tracked via scroll depth + dwell time        │
└─────────────────────────────────────────────────────────────┘
```

**Progress Tracking:**
```typescript
// Video: Watch time percentage
onTimeUpdate(event) {
  const progress = (event.target.currentTime / event.target.duration) * 100
  if (progress >= 90) markAsComplete()
}

// Article: Scroll depth + dwell time
- Track scroll percentage (via IntersectionObserver)
- Track time on page (via useEffect timer)
- Mark complete when scrolled 80% AND spent 50% of estimated reading time
```

**Bottom Navigation:**
```
┌─────────────────────────────────────────────────────────────┐
│ [◄ Previous: Discovery Techniques]  [Test Your Knowledge] │
│                                      [Next: Discovery Framework ►] │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. Knowledge Check (Quiz/Assessment)

**Trigger:** Click "Test Your Knowledge" button

**Display:** Modal (`@/components/ui/dialog.tsx`) or new page (recommended for focus)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Knowledge Check: Asking the Right Questions                 │
│ Question 1 of 5                                ⏱️ No time limit│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ What is the primary purpose of SPIN's "Situation" questions?│
│                                                              │
│ ○ A) To uncover customer pain points                        │
│ ○ B) To understand the customer's current state            │
│ ○ C) To present your solution                               │
│ ○ D) To close the deal                                      │
│                                                              │
│                                    [Submit Answer]           │
└─────────────────────────────────────────────────────────────┘
```

**After Submission (Immediate Feedback):**
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Correct!                                                  │
│                                                              │
│ Your Answer: B) To understand the customer's current state  │
│                                                              │
│ Explanation: Situation questions are designed to gather     │
│ background information about the customer's current context.│
│ They set the foundation for deeper problem exploration.     │
│                                                              │
│                                    [Next Question →]         │
└─────────────────────────────────────────────────────────────┘
```

**Final Results:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎉 Knowledge Check Complete!                                │
│                                                              │
│ Your Score: 4 / 5 (80%)                                     │
│ Passing Score: 70%    ✅ You passed!                        │
│                                                              │
│ Question Breakdown:                                         │
│ ✅ Question 1: Correct                                      │
│ ✅ Question 2: Correct                                      │
│ ❌ Question 3: Incorrect (Review explanation)               │
│ ✅ Question 4: Correct                                      │
│ ✅ Question 5: Correct                                      │
│                                                              │
│ [Review Incorrect Answers] [Retake Quiz] [Continue to Next Lesson]│
└─────────────────────────────────────────────────────────────┘
```

**Quiz Behavior:**
- **Attempts:** Unlimited retakes allowed
- **Scoring:** Only first attempt counts for admin reporting
- **Storage:** All attempts stored for analytics
- **Requirement:** Must pass (≥70%) to unlock next lesson (optional setting)

---

### 6. Lyzr Tutor Panel (AI Assistant)

**Persistent Right Panel Design:**

**Header:**
```
┌─ Lyzr Tutor ────────────────────────────── [🔄] [📜] [⚙️] [↔] [✕]│
│                                                                  │
│ Context: 📖 Discovery Techniques • Module 2                     │
└──────────────────────────────────────────────────────────────────┘
```

**Icons:**
- 🔄 Refresh (start new conversation with current context)
- 📜 History (sidebar with past conversations)
- ⚙️ Settings (adjust AI temperature, verbosity)
- ↔ Resize handle
- ✕ Collapse panel

**Chat Interface:**
```
┌──────────────────────────────────────────────────────────────┐
│ 🤖 Lyzr Tutor                                                │
│ Hi John! I'm here to help you learn. I have access to this  │
│ lesson's content and can answer questions about other topics.│
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Suggested Actions:                                           │
│ [Summarize this lesson]                                      │
│ [Quiz me on key concepts]                                    │
│ [How does this relate to other modules?]                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 👤 What are the 4 types of SPIN questions?                  │
│                                                              │
│ 🤖 The SPIN framework consists of four types of questions:  │
│    1. Situation questions - understand current state        │
│    2. Problem questions - uncover pain points               │
│    3. Implication questions - explore consequences          │
│    4. Need-payoff questions - highlight solution benefits   │
│                                                              │
│    Would you like me to provide examples for each type?     │
│                                                              │
│ 👤 Yes, give me examples                                     │
│                                                              │
│ 🤖 Here are practical examples of each...                   │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ [Type your question...]                               [Send]│
└──────────────────────────────────────────────────────────────┘
```

**Context Updates:**
The AI Tutor's system prompt dynamically changes based on:
1. **Page/Location**: Dashboard, Course Overview, Lesson View
2. **Current Content**: Active lesson content + transcript
3. **User Progress**: Completed courses, current position
4. **Available Courses**: List of all assigned courses (for cross-referencing)

**Example Context Indicator:**
- Dashboard: "🏠 General Assistant"
- Course List: "📚 Course Navigator"
- Lesson View: "📖 [Lesson Name] • [Module Name]"

**Link Resolution:**
When AI references other content:
```markdown
AI Output: "You might also want to review [Module 3: Objection Handling](/courses/crs_123/modules/mod_456)"

Frontend Parsing:
<Link href="/courses/crs_123/modules/mod_456">
  Module 3: Objection Handling
</Link>
```

---

## Part 4: Agent Architecture & Tools

### Agent Overview

Three specialized agents power the platform:

| Agent | Purpose | Trigger | Output |
|-------|---------|---------|--------|
| **Lyzr Tutor** | Employee learning assistant | Real-time chat | Conversational text + tool calls |
| **Content Generator** | Create course articles | Admin clicks "Generate with AI" | Markdown/HTML article |
| **Quiz Generator** | Create assessments | Lesson saved with "Enable Quiz" | Structured JSON (MCQs) |

---

### 1. Lyzr Tutor Agent (Employee-Facing)

**Configuration:**
```typescript
{
  name: "Lyzr Tutor",
  model: "gpt-4o", // or claude-sonnet-4
  temperature: 0.7,
  systemPrompt: DYNAMIC_SYSTEM_PROMPT, // Changes based on context
  tools: [
    "getLessonContent",
    "searchCourses", 
    "getUserProgress"
  ],
  memory: {
    type: "conversation",
    window: 10 // Last 10 messages
  }
}
```

**Dynamic System Prompt Template:**
```
You are Lyzr Tutor, a helpful and encouraging learning assistant.

CURRENT USER:
- Name: {{userName}}
- Role: {{userRole}}

CURRENT CONTEXT:
- Page: {{currentPage}} (e.g., "Lesson View" | "Dashboard" | "Course Overview")
- Course: {{courseTitle}}
- Module: {{moduleTitle}}
- Lesson: {{lessonTitle}}
- Content Type: {{contentType}} (video | article)

CURRENT LESSON CONTENT:
{{lessonContent}}
{{transcriptIfVideo}}

USER'S PROGRESS:
- Courses Completed: {{completedCount}}/{{totalCount}}
- Current Course Progress: {{courseProgress}}%
- Learning Hours: {{learningHours}}

ALL ASSIGNED COURSES:
{{coursesJson}}
[
  {
    "id": "crs_123",
    "title": "Sales Fundamentals",
    "modules": [
      { "id": "mod_456", "title": "Discovery Techniques" },
      ...
    ]
  },
  ...
]

CAPABILITIES:
- Answer questions about the current lesson content
- Explain difficult concepts in simpler terms
- Provide examples and analogies
- Quiz users to test understanding
- Recommend related content from other courses
- Summarize user's progress
- Guide users on what to learn next

TOOLS AVAILABLE:
- getLessonContent(courseId, moduleId, lessonId): Fetch content from any lesson
- searchCourses(query): Find relevant courses/modules by keyword
- getUserProgress(userId): Get detailed progress breakdown

RESPONSE GUIDELINES:
- Be encouraging and supportive
- Keep responses concise (2-3 paragraphs max unless asked for detail)
- Use examples from the current lesson content when relevant
- When referencing other content, use format: [Title](/courses/{courseId}/modules/{moduleId})
- If you need to fetch content from another lesson, use getLessonContent tool
- Always acknowledge the user's progress and effort

CURRENT DATE: {{currentDate}}
```

**Tool Implementations:**

```typescript
// Tool 1: Get Lesson Content
async function getLessonContent(params: {
  courseId: string;
  moduleId?: string;
  lessonId?: string;
}): Promise<LessonData> {
  // Fetch from MongoDB
  const lesson = await Lesson.findById(params.lessonId)
    .populate('moduleId')
    .populate('courseId');
  
  return {
    title: lesson.title,
    content: lesson.contentData,
    transcript: lesson.contentData.transcript, // if video
    estimatedTime: lesson.estimatedTime,
    module: lesson.moduleId.title,
    course: lesson.courseId.title
  };
}

// Tool 2: Search Courses
async function searchCourses(params: {
  query: string;
  userId: string;
}): Promise<SearchResult[]> {
  // Text search on titles and descriptions
  const results = await Course.aggregate([
    {
      $search: {
        index: "courses_text_index",
        text: {
          query: params.query,
          path: ["title", "description"]
        }
      }
    },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "courseId",
        as: "enrollment"
      }
    },
    { $match: { "enrollment.userId": params.userId }},
    { $limit: 5 }
  ]);
  
  return results.map(r => ({
    courseId: r._id,
    title: r.title,
    relevance: r.searchScore
  }));
}

// Tool 3: Get User Progress
async function getUserProgress(params: {
  userId: string;
}): Promise<ProgressSummary> {
  const enrollments = await Enrollment.find({ userId: params.userId })
    .populate('courseId');
  
  return {
    totalCourses: enrollments.length,
    completedCourses: enrollments.filter(e => e.status === 'completed').length,
    inProgressCourses: enrollments.filter(e => e.status === 'in-progress').length,
    totalLearningHours: calculateTotalHours(enrollments),
    recentActivity: await getRecentActivity(params.userId)
  };
}
```

---

### 2. Content Generator Agent (Admin-Facing)

**Configuration:**
```typescript
{
  name: "Content Creator",
  model: "gpt-4o",
  temperature: 0.8,
  systemPrompt: CONTENT_GENERATION_PROMPT
}
```

**System Prompt:**
```
You are an expert instructional designer specializing in corporate learning and development.

Your task is to create clear, engaging, and practical articles for employee training.

GUIDELINES:
- Use a professional but conversational tone
- Focus on actionable insights and real-world applications
- Structure content with clear headings and sections
- Include examples where relevant
- Aim for 400-800 words (readable in 3-6 minutes)
- Use bullet points and numbered lists for clarity
- Avoid jargon unless necessary (and define it if used)

FORMAT:
Return the content in markdown format with proper headings (##, ###).
Include a brief introduction, 2-4 main sections, and a conclusion.

TOPIC: {{userPrompt}}
TARGET AUDIENCE: {{targetAudience}}
LEARNING OBJECTIVES: {{objectives}}

Generate the article now.
```

**Usage Flow:**
1. Admin opens Lesson creation panel
2. Selects "Article" content type
3. Clicks "✨ Generate with AI"
4. Modal appears with:
   - Topic/Title input
   - Target audience selector (All Employees, Sales, Engineering, etc.)
   - Learning objectives (bullet points)
5. Clicks "Generate"
6. AI generates markdown content
7. Content appears in rich text editor
8. Admin can edit before saving

---

### 3. Quiz Generator Agent (Admin-Facing)

**Configuration:**
```typescript
{
  name: "Quiz Generator",
  model: "gpt-4o",
  temperature: 0.5, // Lower for more consistent questions
  responseFormat: {
    type: "json_schema",
    schema: QuizSchema
  }
}
```

**Structured Output Schema:**
```typescript
const QuizSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          questionText: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4
          },
          correctAnswerIndex: { 
            type: "number",
            minimum: 0,
            maximum: 3
          },
          explanation: { type: "string" }
        },
        required: ["questionText", "options", "correctAnswerIndex", "explanation"]
      },
      minItems: 3,
      maxItems: 5
    }
  },
  required: ["questions"]
};
```

**System Prompt:**
```
You are an assessment design expert for corporate training.

Analyze the following learning content and generate 3-5 multiple-choice questions to test understanding.

GUIDELINES FOR GREAT QUESTIONS:
- Test understanding, not memorization
- Each question should have 4 options (A, B, C, D)
- Options should be plausible distractors (avoid obviously wrong answers)
- Correct answer should be clearly defensible
- Provide a brief explanation (2-3 sentences) for why the correct answer is right
- Vary difficulty: Include 1-2 easy questions, 2-3 medium, 0-1 challenging
- Focus on key concepts and practical application

CONTENT TO ANALYZE:
Title: {{lessonTitle}}
Type: {{contentType}}
Content: {{fullContent}}
{{transcriptIfVideo}}

Generate exactly {{numQuestions}} questions (default: 5) in the required JSON format.
```

**Response Example:**
```json
{
  "questions": [
    {
      "questionText": "What is the primary purpose of SPIN's Situation questions?",
      "options": [
        "To uncover customer pain points",
        "To understand the customer's current state",
        "To present your solution",
        "To close the deal"
      ],
      "correctAnswerIndex": 1,
      "explanation": "Situation questions are designed to gather background information about the customer's current context and environment. They set the foundation for deeper problem exploration in later stages of the SPIN framework."
    },
    {
      "questionText": "Which SPIN question type focuses on the consequences of a problem?",
      "options": [
        "Situation questions",
        "Problem questions",
        "Implication questions",
        "Need-payoff questions"
      ],
      "correctAnswerIndex": 2,
      "explanation": "Implication questions help customers recognize the full impact and consequences of their problems. This creates urgency and motivation to find solutions."
    }
  ]
}
```

**Usage Flow:**
1. Admin creates lesson with video/article content
2. Toggles "Enable Knowledge Check"
3. System automatically triggers Quiz Generator Agent
4. Agent analyzes content + transcript
5. Returns structured JSON with questions
6. Questions appear in editable interface in lesson panel
7. Admin can:
   - Edit any question/option/explanation
   - Delete questions
   - Add new questions manually
   - Regenerate all questions
8. On save, questions stored in `lessons.quizData` field

---

## Part 5: Database Schema (MongoDB + Mongoose)

### Schema Design Principles
- **Denormalization**: Store organizationId in nested documents for efficient querying
- **Indexing**: Strategic indexes for common query patterns
- **Flexibility**: `schemaVersion` field for schema evolution
- **Atomicity**: Store complete data structures (e.g., quiz questions in lesson document)

---

### Collection: `users`

```typescript
interface IUser extends Document {
  _id: ObjectId;
  lyzrId: string; // From Lyzr OAuth
  email: string;
  name?: string;
  avatarUrl?: string;
  lyzrApiKey: string; // Encrypted
  credits: number;
  lastAccessedOrganization?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  schemaVersion: number;
}

// Indexes
UserSchema.index({ lyzrId: 1 }, { unique: true });
UserSchema.index({ email: 1 });
```

---

### Collection: `organizations`

```typescript
interface IOrganization extends Document {
  _id: ObjectId;