# PostingTube - Multi-Platform Social Media Management SaaS

A professional Social Media Management SaaS platform engineered for **PostingTube**, featuring an enterprise publishing pipeline, multi-channel composer, platform-specific overrides, content calendar, team approvals, and modular official API adapters.

---

## 📸 Design Inspiration & Reference Screenshots Implemented

This codebase directly implements every layout, interaction, and visual workflow identified across your reference images:

1. **New Post Launchpad (Screenshot 2)**:
   - Three distinct card choices: **Text Post**, **Image Post**, and **Video Post** with supported social icons (Bluesky, Facebook, Instagram, LinkedIn, Pinterest, Threads, TikTok, Twitter, YouTube).
   - "Connect more accounts" integration banner.

2. **Connected Accounts Management (Screenshot 3)**:
   - Grouped platform rows: Bluesky, Facebook, Instagram, LinkedIn, Pinterest, Threads, TikTok, Twitter, YouTube.
   - Distinct "Connect [Platform]" button per row.
   - Connected account badge pills with circular avatars, account handles, and one-click disconnect (`×`).
   - Token refresh action buttons: *Refresh Instagram*, *Refresh Twitter*, *Refresh TikTok*, *Refresh Facebook*.

3. **Multi-Channel Post Composer (Screenshots 1, 4 & 5)**:
   - **Horizontal Avatar Channel Selector**: Avatars with platform badge in the bottom-right corner, checkmark indicator, search filter, and "Select All".
   - **Media Drag-and-Drop Area**: Multi-asset support, thumbnails, aspect ratio validation, "Replace Media", and cover image support.
   - **Main Caption**: Character limits, hashtag inserter, emoji quick picker, and AI rewrite tools.
   - **Platform Captions Accordion**: Independent overrides per platform (e.g. 280-char limit for X, 300 for Bluesky, rich text for LinkedIn, 2200 for Instagram).
   - **YouTube Title & TikTok Config**: Custom video title fields and audio settings.
   - **Advanced Post Options**: First comment automation, collaborators tags, and AI-generated content disclosure toggle.
   - **Live Previews**: Interactive preview cards for Instagram (with like/comment/share/bookmark counters), X, LinkedIn, Facebook, YouTube Shorts, and TikTok.
   - **Scheduling Panel**: Date picker, time picker in local timezone, "Schedule Post", "Publish Now", and "Save as Draft".

4. **Content Calendar**:
   - Monthly and Weekly views.
   - Platform color badges, scheduled timestamps, and post snippets.
   - Click on any date cell to create a post for that specific day.

5. **Background Worker & Publishing Pipeline (Requirement 4)**:
   - Durable server-side background processing.
   - Idempotency hashing prevents duplicate posts.
   - Partial success handling: when posting to 5 platforms and 1 fails, the 4 succeed, while the failed channel logs the error with one-click manual retry.
   - Live daemon output in the **Worker Engine** tab.

---

## 🛠️ Tech Stack & Directory Structure

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **State & Storage**: Durable schema-ready models for Supabase / PostgreSQL
- **Adapters**: Modular official platform adapters in `src/lib/adapters/`

```text
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx              # Main orchestrator linking all tabs & modals
├── components/
│   ├── AiAssistantModal.tsx   # AI caption generation, tones & hashtags
│   ├── AnalyticsView.tsx      # Audience reach, impressions & engagement charts
│   ├── BackgroundWorkerSimulator.tsx # Live cron engine & daemon execution logs
│   ├── BulkTools.tsx          # CSV spreadsheet bulk post importer
│   ├── CalendarView.tsx       # Interactive monthly & weekly content calendar
│   ├── ConnectedAccounts.tsx  # OAuth connections & account pills
│   ├── MediaStudio.tsx        # Asset library for images and videos
│   ├── NewPostLaunchpad.tsx   # Text / Image / Video post launcher
│   ├── PostComposer.tsx       # Full multi-channel composer with live overrides
│   ├── PostPreview.tsx        # High-fidelity mockups for IG, X, LI, FB, YT, TikTok
│   ├── PostsManager.tsx       # All, Scheduled, Posted, Drafts, Failed tabs
│   ├── SettingsView.tsx       # Workspace settings & API key credentials
│   ├── Sidebar.tsx            # PostBridge green brand sidebar & workspace switcher
│   └── SocialIcons.tsx        # Official brand SVG vectors for all 9 networks
├── lib/
│   ├── adapters/              # Meta, X, LinkedIn, YouTube, TikTok, Bluesky, Pinterest
│   ├── ai.ts                  # Social copy generator
│   ├── constants.ts           # Character limits & media specifications
│   ├── publisher.ts           # Dispatch engine, partial failures & retry logic
│   └── storage.ts             # Initial realistic seed data & storage layer
└── types/
    └── social.ts              # TypeScript interfaces for posts, accounts, and jobs
```

---

## 🚀 Running the Project

```bash
# Navigate to the project directory
cd "C:\Users\nagar\.gemini\antigravity\scratch\postbridge-saas"

# Install dependencies (already installed)
npm install

# Start development server
npm run dev
# The application will be live at http://localhost:3000
```

---

## 🔐 Setting Up Official Social Media API Credentials

To connect production accounts with official APIs:

1. **Meta (Facebook Pages & Instagram Professional)**:
   - Create an app on `developers.facebook.com` with use case **Facebook Login for Business**.
   - Request scopes: `pages_show_list`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
   - Store `META_APP_ID` and `META_APP_SECRET`.

2. **X (Twitter)**:
   - Create a project on `developer.x.com`.
   - Setup OAuth 2.0 with PKCE and requested scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`.

3. **LinkedIn**:
   - Create an app on `developer.linkedin.com` and enable the **Share on LinkedIn** product.
   - Request scopes: `w_member_social`, `w_organization_social`.

4. **YouTube**:
   - Enable YouTube Data API v3 on `console.cloud.google.com`.
   - Use Google OAuth 2.0 with scope `https://www.googleapis.com/auth/youtube.upload`.
