# Antigravity AI Design & Frontend Engineering Environment

This environment transforms Google Antigravity IDE into a world-class AI-powered product design and frontend engineering workspace.
It equips the AI agent with senior art direction, anti-slop aesthetic constraints, production frontend architecture, WCAG 2.1 accessibility guidelines, and automated in-browser visual quality assurance.

---

## 1. Installed Skills & Locations

The design skills are installed in **both** Global and Project-level locations:
- **Global Path (Applies across all projects on this machine):** `C:\Users\ka\.gemini\config\skills\`
- **Project Path (Version-controlled with this workspace):** `d:\AI Reel Generator\.agents\skills\`
- **Global Master Rules:** `C:\Users\ka\.gemini\GEMINI.md`
- **Project Rules:** `d:\AI Reel Generator\.agents\rules\master-design.md` & `d:\AI Reel Generator\AGENTS.md`

### Complete Inventory of Installed Skills (16 Skills):

| Skill Name | Source / Lineage | Category | Core Purpose |
|---|---|---|---|
| `frontend-design` | Anthropic Official | Art Direction | Distinctive visual identities, intentional typography, 4-6 named hex tokens, avoiding AI template defaults |
| `design-taste-frontend` | `leonxlnx/taste-skill` v2 | Art Direction & App Rules | Distilled from 247 Awwwards/One Page Love sites; complete references for app-screens, copy, type, colour, layout, motion |
| `emil-design-eng` | `emilkowalski/skills` | Craft & Engineering | Emil Kowalski's design engineering philosophy, UI polish, micro-interaction decision gates, before/after review tables |
| `ui-ux-design` | Antigravity Design Suite | HCI & UX Architecture | Visual hierarchy, cognitive load, Hick's & Fitts's laws, 8 mandatory UI states, form ergonomics |
| `design-systems` | Antigravity Design Suite | Token Architecture | 3-tier token taxonomy, 4px/8px spatial rhythm, nested border-radius mathematics, CVA variant contracts |
| `typography` | Antigravity Design Suite | Typography | Font pairing matrix, modular scales (Minor vs Major Third), measure capping (`max-w-[65ch]`), tabular numbers, text-balance |
| `responsive-design` | Antigravity Design Suite | Multi-Device Layouts | Mobile-first architecture, 3 standard test viewports (1440px, 768px, 375px), safe area insets, touch ergonomics |
| `dashboard-design` | Antigravity Design Suite | Enterprise & SaaS | 8 laws of professional dashboards, flat surfaces, dense data tables, minimal chart chrome, URL filter sync |
| `saas-design` | Antigravity Design Suite | Product Strategy | High-converting pricing tables, asymmetric bento grids, interactive product preview heroes, settings & billing UX |
| `landing-page-design` | Antigravity Design Suite | Marketing & Conversion | Hero section anatomy, section pacing, active voice copywriting formulas, high-contrast conversion footers |
| `accessibility` | Antigravity Design Suite | A11y & WCAG 2.1 | Semantic HTML first, visible keyboard focus rings, form label associations, dialog focus traps, reduced motion |
| `animation-design` | Antigravity Design Suite | Motion Engineering | Animation decision gate, custom cubic-bezier curves, snappy spring physics, compositor-only GPU transforms |
| `visual-qa` | Antigravity Design Suite | Quality Assurance | 10-step in-browser inspection routine, multi-viewport screenshot capture, senior juror critique rubric |
| `frontend-performance` | Antigravity Design Suite | Performance & CWV | Core Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms), list virtualization, layout thrashing prevention |
| `react-best-practices` | `vercel-labs/agent-skills` | React Architecture | Complete React 19 rules, Server Components, hydration safety, composition patterns, hook hygiene |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Web Standards | Vercel web interface guidelines, touch ergonomics, focus management, paste blocking prevention |

---

## 2. GitHub Design Resources Reference Index

Rather than installing bloated monolithic UI packages globally, modern frontend engineering relies on copy-paste registries, headless primitives, and specialized utilities.

### Core Foundation Libraries:

| Resource | Repository | Type | Installation Method | When to Use | When NOT to Use |
|---|---|---|---|---|---|
| **Radix UI** | `radix-ui/primitives` | Headless Accessible Primitives | `npm i @radix-ui/react-*` | Dropdowns, dialogs, tooltips, popovers, tabs requiring full WCAG compliance | Simple styled native HTML elements (buttons, inputs) |
| **Tailwind CSS** | `tailwindlabs/tailwindcss` | Utility-First CSS Engine | `npm i tailwindcss @tailwindcss/postcss` | Core styling, responsive modifiers, dark mode tokens, fluid spacing | Heavy legacy CSS-in-JS codebases |
| **Motion** | `motiondivision/motion` | Production Animation Engine | `npm i motion` or `framer-motion` | Complex layout transitions, spring physics, drag gestures, exit animations | Basic hover/focus transitions (use pure CSS transitions) |
| **Lucide Icons** | `lucide-icons/lucide` | Clean Geometric Iconography | `npm i lucide-react` | Universal UI iconography across applications | Multi-colored illustrations or brand logos |
| **shadcn/ui** | `shadcn-ui/ui` | Copy-Paste Component Registry | `npx shadcn@latest add <component>` | Full control over component code, customized styling on top of Radix UI | Locked npm-packaged monolithic component libraries |
| **Microsoft Fluent UI** | `microsoft/fluentui` | Enterprise Design System | Reference / selective package | Complex Microsoft-ecosystem enterprise web apps, Office add-ins | Consumer SaaS, marketing landing pages, modern creative tools |
| **Ant Design** | `ant-design/ant-design` | Dense Enterprise UI Suite | Reference / selective package | Internal corporate portals, data-heavy Chinese/international enterprise apps | Modern western SaaS, consumer apps with bespoke branding |

---

### Modern Component Registries & Creative Blocks:

| Resource | Type | Purpose & Architecture | Best For | Installation |
|---|---|---|---|---|
| **21st.dev** | Component Registry & MCP | The "npm for design engineers" - community registry of modern components | Discovering creative UI patterns, buttons, cards, and animations | Copy-paste code or AI agent MCP integration |
| **Aceternity UI** | High-Impact Creative Library | Awwwards-tier animated components, glowing cards, parallax scrolls, 3D cards | Landing page hero sections, portfolio showcases, product launch marketing | Copy-paste with Tailwind & Motion |
| **Magic UI** | Marketing Component Library | Interactive animated blocks, bento grids, border beams, text reveals | Design-engineered SaaS marketing pages and feature showcases | `npx shadcn add "https://magicui.design/r/..."` |
| **Origin UI** | Application UI Registry | Extensive library of pragmatic, highly accessible inputs, forms, and dialogs | Dense app screens, complex form controls, multi-selects, sliders | Copy-paste snippets built on Radix UI & Tailwind |
| **Tremor** | Data Visualization Library | Specialized components for dashboards, charts, metrics, and KPI cards | Analytical dashboards, internal admin tools, metrics visualization | `npm i @tremor/react` or copy-paste Tremor raw blocks |
| **Cult UI** | Experimental Micro-interactions | Unique, playful components tailored for AI agent interfaces and modern web | Interactive AI chat bubbles, retro-futuristic controls, dynamic docks | Copy-paste snippets |
| **React Bits** | Lightweight Creative Bits | Curated animated text effects, cursor followers, background grids, noise | Subtle background flair and text reveals without bundle bloat | Copy-paste isolated React components |

---

## 3. How Antigravity Uses These Skills

Antigravity uses **Progressive Disclosure** for maximum efficiency and context conservation:
1. **Always-On Rules:** The rules in `C:\Users\ka\.gemini\GEMINI.md` and `d:\AI Reel Generator\AGENTS.md` are continuously injected into the agent's context. They establish the senior art director persona, enforce the anti-slop charter, and mandate browser testing.
2. **On-Demand Skills:** All 16 skills are registered with their names and descriptions. When a user requests a task (e.g., "Build an analytics dashboard", "Animate this modal", "Review my UI accessibility"), Antigravity activates the specific skill, reads its detailed instructions, checklists, and references, and applies the exact procedures.

---

## 4. How to Add and Update Skills

### Adding a New Skill:
1. Create a directory under `C:\Users\ka\.gemini\config\skills\<skill-name>\` (for global availability) or `.agents/skills/<skill-name>/` (for project-specific availability).
2. Create `SKILL.md` inside that directory.
3. Start `SKILL.md` with YAML frontmatter:
   ```markdown
   ---
   name: <skill-name>
   description: >-
     Clear explanation of what the skill does and when the agent should activate it.
   ---
   ```
4. Add step-by-step procedures, code examples, and optional `references/` or `scripts/` directories.

### Updating Existing Skills:
- Edit the corresponding `SKILL.md` or reference files directly. Antigravity dynamically resolves skills from disk on every invocation.

---

## 5. Visual Quality Assurance Workflow

The Visual QA workflow is the core safeguard against "AI slop":
1. **Execute:** Implement the component or page using the project's design system tokens.
2. **Spin Up:** Ensure the local dev server is running (`npm run dev` at `http://localhost:3000`).
3. **Inspect via Browser Automation:** Use Antigravity's `chrome-devtools-plugin` MCP tools:
   - `mcp_chrome-devtools-plugin_navigate_page` to open the local route.
   - Resize viewport to 1440x900 (Desktop), 768x1024 (Tablet), and 375x812 (Mobile).
   - `mcp_chrome-devtools-plugin_take_screenshot` to capture full-page screenshots.
4. **Juror Critique:** Analyze screenshots for visual hierarchy, line length (max 65-75ch), tabular figures, hit target sizing (44x44px), and mobile wrapping.
5. **Iterate:** Fix identified defects and re-verify before reporting completion.

---

## 6. Security, Constraints & Non-Destructive Operation

- **No Global Package Bloat:** Packages are installed per-project only; no unnecessary global npm packages were installed.
- **VCS Protection:** No git commits or branches were modified destructively.
- **Preserved Existing Rules:** All existing Next.js rules in `AGENTS.md` and configuration files in `.gemini/` were preserved intact.
