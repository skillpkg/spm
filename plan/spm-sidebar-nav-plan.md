# Sidebar Navigation Redesign — Plan

## Option: 3 (shared sidebar component, two separate deployments)

### Architecture

- Shared `Sidebar`, `SidebarLayout`, `TopBar`, `Breadcrumb` components in `@spm/ui`
- Both apps import from `@spm/ui` and pass their own nav config
- Two deployments: `skillpkg.dev` (web) + `admin.skillpkg.dev` (admin)
- Auth guards unchanged

### Web Sidebar Sections

- DISCOVER: Home, Search, Categories
- DOCS: Getting Started, CLI Reference, Publishing Guide, MCP Setup
- MY ACCOUNT: Dashboard, My Skills, Analytics, Settings
- Separator + "Admin Panel →" (only if isAdmin)
- Footer: @username + Sign out

### Admin Sidebar Sections

- MODERATION: Review Queue, Skills, Reports, Errors
- ANALYTICS: Scan Analytics, User Management
- Separator + "skillpkg.dev →" (external link)
- Footer: @username + Sign out

### Web URL Structure

| Route           | Page            | Sub-tabs                                    |
| --------------- | --------------- | ------------------------------------------- |
| `/`             | Home            | `?trending=featured\|popular\|new\|rising`  |
| `/search`       | Search          | `?q=&category=&trust=&sort=`                |
| `/categories`   | Categories grid | —                                           |
| `/skills/:name` | Skill Detail    | `?tab=readme\|versions\|security`           |
| `/dashboard`    | Dashboard       | `?tab=overview\|skills\|history\|analytics` |

### Admin URL Structure

| Route           | Page            | Sub-tabs                          |
| --------------- | --------------- | --------------------------------- |
| `/`             | Review Queue    | —                                 |
| `/skills`       | Skills list     | `?search=&page=`                  |
| `/skills/:name` | Skill Detail    | `?tab=readme\|versions\|security` |
| `/reports`      | Reports         | —                                 |
| `/errors`       | Errors          | —                                 |
| `/analytics`    | Scan Analytics  | —                                 |
| `/users`        | User Management | `?search=&role=&trust=`           |

### Sub-tab Persistence Fix

Create `useTabParam(key, default)` hook wrapping `useSearchParams`.
Convert: Home trending tabs, SkillDetail tabs, Dashboard tabs, admin SkillDetailPane tabs.

### Implementation Phases

- Phase A: Sub-tab persistence (1 day) — can parallelize with B
- Phase B: Shared UI components in @spm/ui (2-3 days) — can parallelize with A
- Phase C: Web app integration (2 days) — needs B
- Phase D: Admin app integration (1-2 days) — needs B, can parallelize with C
- Phase E: Polish & test (1 day)
- Total: 5-6 days (with parallelism)

### TopBar Search

- Web: searches skills (global)
- Admin: contextual search within current section

### What Does NOT Change

- Two separate deployments and subdomains
- Auth guards (admin requires is_admin)
- API client code
- All existing functionality
- CSS custom property design system (inline styles)

## Future: shadcn/ui Migration (deferred)

- 16-23 days estimated
- Must include typography system (headings, body, code/mono, labels)
- Map var(--font-sans)/var(--font-mono)/inline font sizes to Tailwind typography scale
- Do AFTER sidebar is stable
