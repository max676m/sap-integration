# MenaBev NPL — UI Implementation Plan (Dummy Data)

Build all frontend pages using **React 18 + TypeScript + Vite**. All pages use **hardcoded dummy data** — no backend. Goal: pixel-match the reference mockups, establish routing, layout, and component library.

---

## Tech Stack Decision

| Choice | Technology | Rationale |
|---|---|---|
| **Bundler** | Vite | Fast HMR, native TS support |
| **Language** | **TypeScript** | Provides type safety for SAP data structures (Material Master, BOM, Recipe), better IntelliSense, and safer refactoring as SAP specs change. |
| **Routing** | React Router v6 | Industry standard SPA routing |
| **UI Library** | **Ant Design (antd) v5** | Best fit for this enterprise/data-heavy app — provides premium Table, Form, Select, Stepper, Card, Chart wrappers out-of-the-box. Matches the clean corporate look in the mockups. Avoids re-inventing complex controls (editable tables, searchable dropdowns, file upload) |
| **Charts** | @ant-design/charts (or Recharts) | Lightweight, matches antd styling |
| **Styling** | antd tokens + CSS overrides | Customize antd's design tokens to match MenaBev brand colors |
| **Icons** | @ant-design/icons + lucide-react | Coverage for both standard and custom icons |

> [!NOTE]
> **Why Ant Design over alternatives?**
> - **vs MUI**: antd's Table + Form + Steps components are more mature for enterprise data-entry apps
> - **vs Chakra UI**: antd has more built-in complex components (editable tables, cascaders)
> - **vs vanilla CSS**: Building BOM editor tables, searchable dropdowns, and file uploaders from scratch would take significantly longer with no added benefit

---

## Proposed Changes

### Project Scaffolding

#### [NEW] `frontend/` — React + Vite + TypeScript project

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar
│   │   ├── forms/           # BOMEditor, RoutingEditor, MaterialForm
│   │   └── shared/          # StatusBadge, StepProgress, COGSBreakdown
│   ├── pages/
│   │   ├── AIAssistant.tsx
│   │   ├── ProductLaunch.tsx
│   │   ├── NewMaterial.tsx
│   │   ├── ApprovalWorkflow.tsx
│   │   ├── Analytics.tsx
│   │   ├── BulkUpload.tsx
│   │   └── SAPConfiguration.tsx
│   ├── data/
│   │   └── mockData.ts      # All dummy data
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   ├── theme/
│   │   └── themeConfig.ts   # antd token overrides (brand colors)
│   ├── App.tsx              # Router setup
│   └── main.tsx
├── index.html
├── package.json
└── vite.config.ts
```

---

### Theme & Brand Tokens

#### [NEW] `theme/themeConfig.ts`

Override antd with brand colors extracted from mockups:

| Token | Value | Usage |
|---|---|---|
| `colorPrimary` | `#2563eb` | Buttons, active states, links |
| Sidebar BG | `#0a1628` | Dark navy sidebar |
| Page BG | `#f0f4f8` | Light gray main content area |
| Card BG | `#ffffff` | White cards |
| Success | `#22c55e` | Approved badges, "AI Online" indicator |
| Danger | `#ef4444` | Reject buttons, delete icons |
| KPI Purple | `#7c3aed` | Total Materials card accent |
| KPI Green | `#10b981` | Active card accent |
| KPI Orange | `#f97316` | Avg Std Price card accent |
| Font | `Inter` | Via Google Fonts |

---

### Shared Layout

#### [NEW] `components/layout/AppShell.tsx`

Persistent shell wrapping all pages:
- **Sidebar** (dark navy, fixed left):
  - Logo: "MenaBev" + "SAP Master Console"
  - Nav: AI Assistant ✨, Product Launch 📦, Analytics 📊, SAP Configuration ⚙️
  - Active item: blue pill highlight
  - Bottom: User avatar + "Admin User" / "SAP S/4HANA"
- **Main**: Scrollable content area with light gray BG

---

### Pages

#### Page 1 — AI Assistant (Chat)

##### [NEW] `pages/AIAssistant.tsx`

Matches chat mockup. **Chat is NOT operational** — visual mockup only.

- Header: "AI Product Launch Assistant" + green "AI Online" badge
- Bot welcome bubble: greeting + description of capabilities
- 3 example prompt cards (clickable → shows toast "AI integration coming soon")
- Bottom input bar: text field + send button (interactions show toast only)

---

#### Page 2 — Product Launch (Category Selection + Request List)

##### [NEW] `pages/ProductLaunch.tsx`

**Top section**: Product category selection cards/boxes. Based on the mockups, these are the entry points to start a new request:
- **Finished Product** (FERT) — e.g., bottled beverages
- **Semi-Finished Product** (HALB) — e.g., concentrates
- **Raw Material** (ROH) — e.g., ingredients
- **Trading Goods** (HAWA) — e.g., procured packaging

Clicking a category → navigates to `/product-launch/new?type=FERT` (or HALB, ROH, HAWA).

**Bottom section**: Table listing existing requests with dummy data (Request ID, Description, Type, Plant, Status, Created date). Row click → navigates to `/product-launch/:id`.

---

#### Page 3 — New Material Details (Form)

##### [NEW] `pages/NewMaterial.tsx`

Exact match of "New Material Details" mockup:
- "← Back" + "New Material Details" header + "Pre-filled by AI" badge
- Two-column form:
  - Material Type (dropdown), Base UOM (dropdown)
  - Description (text)
  - Reference Material (searchable dropdown with SAP material numbers, descriptions, SAR prices — dummy data)
  - Plant, Storage Location, Valuation Class, Material Group (text inputs)
  - ZATCA Required (dropdown: Yes/No)
  - Branding Template (file upload)
- **"Submit for Approval"** button → navigates to Approval Workflow page

---

#### Page 4 — Approval Workflow (Manufacturing + Finance Review)

##### [NEW] `pages/ApprovalWorkflow.tsx`

Single page, **3 stages** shown via antd `Steps` component: `Creator → Manufacturing → Finance`.

**Submitted Details card** (always visible, read-only):
- Material Type, Base UOM, Description, Plant, Storage Location, ZATCA Required

**Manufacturing Review** (when stage = Manufacturing):
- **BOM table**: Item # | Description | Qty | UOM dropdown | Delete. Buttons: "Copy from Reference", "+ Add Item"
- **Production Routing table**: Op # | Work Center | Description | Delete. Buttons: "Copy from Reference", "+ Add Op"
- Actions: `Validate & Save` | `Approve & Pass to Finance` | `Reject`

**Finance Review** (when stage = Finance):
- **COGS Breakdown** (read-only cards): Direct Material, Direct Labor, Overhead 25%, Other → Total COGS bar
- Editable: Standard Price (SAR), Moving Avg Price (SAR)
- Actions: `Validate & Save` | `Approve & Create in SAP` | `Reject`

View toggled via `?view=creator|manufacturing|finance` query param.

---

#### Page 5 — Analytics Dashboard

##### [NEW] `pages/Analytics.tsx`

Matches Analytics mockup:
- Header: "Analytics" + subtitle
- 4 KPI cards: Total Materials, Active, Avg Std Price ($), Avg COGS ($)
- 2 charts side-by-side: "Materials by Type" (horizontal bar), "Materials by Plant" (vertical bar)
- "Master Data Records" table: Material #, Description, Type, Plant, Std Price, COGS, BOM Items, Created, Status

All dummy data — 7 records.

---

#### Page 6 — Bulk Upload

##### [NEW] `pages/BulkUpload.tsx`

- Drag-and-drop file upload area
- "Download Template" link
- Preview table after upload
- Submit button

---

#### Page 7 — SAP Configuration

##### [NEW] `pages/SAPConfiguration.tsx`

Settings page with read-only dummy config:
- SAP Connection (API Base URL, Client ID)
- Workflow settings
- Field mapping display

---

### Routing

| Route | Component | Sidebar Active |
|---|---|---|
| `/ai-assistant` | AIAssistant | AI Assistant |
| `/product-launch` | ProductLaunch | Product Launch |
| `/product-launch/new` | NewMaterial | Product Launch |
| `/product-launch/:id` | ApprovalWorkflow | Product Launch |
| `/analytics` | Analytics | Analytics |
| `/bulk-upload` | BulkUpload | Product Launch |
| `/sap-configuration` | SAPConfiguration | SAP Configuration |
| `/` | redirect → `/analytics` | Analytics |

---

## Verification Plan

1. `cd frontend && npm run dev` → verify clean start
2. **Browser walkthrough** of every route — compare against reference mockups
3. Sidebar navigation highlights correct active item
4. AI Assistant page: interactions show toast (NOT operational)
5. Product Launch: category cards navigate to form, request rows navigate to detail
6. New Material: all fields render, "Submit" navigates to Approval page
7. Approval Workflow: stepper toggles between Mfg/Finance views
8. Analytics: KPI cards + charts + table render with dummy data
9. Responsive check at 1024px, 1280px, 1440px widths
