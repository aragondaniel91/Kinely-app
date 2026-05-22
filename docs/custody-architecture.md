# Custody Architecture Refactor Notes

## Purpose

This document defines how the Custody module should be cleaned up without changing current UI, behavior, Firestore data shape, permissions, or user flows.

The goal is architecture cleanup only.

No visual redesign.  
No new features.  
No CSS patches.  
No workarounds.

---

## Refactor rules

1. Keep the existing UI visually identical unless a specific visual change is explicitly requested.
2. Keep existing Firestore collection names, document ids, and document fields unchanged.
3. Keep existing permissions behavior unchanged.
4. Keep existing custody, travel, special event, and bulk schedule logic unchanged.
5. Prefer moving code over rewriting code.
6. Use small commits that are easy to review and revert.
7. Do not add page-specific global CSS patches.
8. Layout fixes should happen in the component that owns the layout.
9. Do not mix refactor commits with feature commits.
10. After each refactor step, the app should still build and behave the same.

---

## Current files and responsibilities

### `src/pages/Custody.jsx`

Current role:

- Owns the main Custody module shell.
- Tracks the active Custody submodule:
  - dashboard
  - schedule
  - exchange
  - packing
  - notifications
  - budget
  - chat
- Renders the module hub/cards.
- Renders the sticky Custody header.
- Routes each submodule into `CustodyCalendarView`.
- Handles temporary management actions such as reset custody data.
- Listens to `familyActivity` for custody-related recent activity.
- Triggers calendar refresh based on latest activity.

Current concern:

- It mixes module navigation, activity listening, refresh behavior, and management tools.
- Activity log code is not yet separated into a dedicated hook/service.
- This page should eventually become a thinner module shell.

Target role:

- Custody route shell only.
- Module navigation only.
- Delegate activity loading to a hook.
- Delegate submodule rendering to feature-level components.

---

### `src/components/calendar/CustodyCalendarView.jsx`

Current role:

- Loads custody groups from Firestore.
- Resolves custody group access.
- Builds a scoped `FamilyContext` override for custody-only family/group data.
- Renders the custody group selector.
- Decides which custody view to render:
  - dashboard
  - calendar/schedule
  - exchange
  - packing
  - notifications
  - budget
- Wraps the calendar inside a styled card/container.
- Provides `CustodyScopeMetadataBackfill` around scoped custody tools.

Current concern:

- It mixes group selection, access resolution, context transformation, routing, and visual wrappers.
- The calendar wrapper/card lives here, so layout issues around the calendar should be reviewed here together with the calendar page itself.

Target role:

- Custody scope provider and view router.
- Group selector may move to its own component.
- Access/context logic may move to hooks/utilities.
- Calendar wrapper should be minimal and clearly documented.

---

### `src/pages/CustodyCalendar.jsx`

Current role:

- Loads custody days from Firestore.
- Loads custody special events from Firestore.
- Loads custody travel plans from Firestore.
- Saves individual custody days.
- Deletes individual custody days.
- Creates bulk custody schedules.
- Supports undo for latest bulk schedule.
- Calculates custody maps by date.
- Calculates travel overrides.
- Calculates period ranges for day/week/month.
- Calculates parent counts for the selected period.
- Calculates next change and upcoming days.
- Renders:
  - sidebar
  - toolbar
  - day/week/month calendar grid
  - custody day cards
  - day detail view
  - bulk dialog
  - custody day dialog

Current concern:

- This file has too many responsibilities.
- Data loading, Firestore actions, calculations, and rendering are all mixed together.
- Layout classes such as `h-full`, `min-h-screen`, `overflow-hidden`, and `overflow-auto` live here and can conflict with the wrapper/card and AppShell.

Target role:

- Become a smaller `CustodyCalendarPage` component.
- Delegate data loading to hooks.
- Delegate actions to hooks.
- Delegate calculations to utilities.
- Delegate visual pieces to presentational components.

---

### `src/components/calendar/CustodyDayDialog.jsx`

Current role:

- Edits a single custody day.
- Creates/updates/deletes special events for a day.
- Creates/updates/deletes travel plans.
- Deletes individual custody days or entire bulk schedules.
- Writes audit log entries to `familyActivity`.
- Builds before/after audit metadata.
- Normalizes special event and travel plan data.
- Renders a multi-section dialog:
  - custody
  - travel/vacation
  - special events
  - notes
  - delete choices

Current concern:

- It mixes dialog UI, Firestore writes, audit metadata building, and delete/bulk schedule behavior.
- The audit metadata helpers may belong in an audit utility file.
- Firestore writes may belong in action hooks/services.

Target role:

- Dialog UI and local form state.
- Delegate Firestore/audit actions to helpers/hooks where possible.

---

### `src/components/calendar/BulkCustodyDialog.jsx`

Current role:

- Builds custody schedule ranges/templates.
- Supports smarter patterns and generated day maps.
- Sends bulk payload back to `CustodyCalendar.jsx` for writing.

Current concern:

- Bulk generation logic should eventually be isolated from UI.
- However, this file is less urgent than `CustodyCalendar.jsx`.

Target role:

- Dialog UI and user input.
- Move reusable schedule-generation logic to utilities later.

---

## Target folder structure

Proposed future structure:

```txt
src/features/custody/
  calendar/
    CustodyCalendarPage.jsx
    CustodyCalendarSidebar.jsx
    CustodyCalendarToolbar.jsx
    CustodyCalendarGrid.jsx
    CustodyDayCard.jsx
    DayDetailView.jsx
    hooks/
      useCustodyData.js
      useCustodyActions.js
    utils/
      custodyDateUtils.js
      custodyMappers.js
      custodyCalculations.js
      custodyBulkUtils.js
  dashboard/
  exchange/
  packing/
  notifications/
  budget/
  audit/
```

---

## Refactor order

### Phase 1: Documentation and inventory

- Document current files and responsibilities.
- Identify layout ownership.
- Identify pure functions that can be moved safely.

### Phase 2: Extract pure utilities

Move pure functions from `CustodyCalendar.jsx` without changing behavior:

- `normalizeDate`
- `normalizeCustodyDay`
- `normalizeSpecialEvent`
- `normalizeTravelPlan`
- `getParentLabel`
- `getParentEmoji`
- `getCustodyParent`
- `travelPlanAffectsCustody`
- `buildTravelOverrideCustody`
- `getOtherParent`
- `advanceDateByUnit`
- `generateBlockStarts`
- `buildBulkDayPayload`

Rules:

- No JSX changes.
- No styling changes.
- No logic changes.
- Update imports only.

### Phase 3: Extract presentational components

Move JSX components without changing their markup/classes:

- `CustodyDayCard`
- `DayDetailView`
- later: sidebar, toolbar, grid

Rules:

- Copy JSX exactly.
- Keep props explicit.
- No visual changes.

### Phase 4: Extract hooks

Move Firestore read/write logic into hooks:

- `useCustodyData`
- `useCustodyActions`

Rules:

- Preserve existing queries.
- Preserve existing fallback logic.
- Preserve existing state transitions.

### Phase 5: Layout review

Only after the calendar is separated:

- Review the calendar wrapper in `CustodyCalendarView.jsx`.
- Review height/scroll ownership in `CustodyCalendarPage.jsx`.
- Remove internal conflicts only from the owning component.
- No global CSS patches.

---

## Known layout concern

The current Custody Calendar can feel visually trapped or cut off because layout responsibility is split between:

- `AppShell.jsx`
- `CustodyCalendarView.jsx`
- `CustodyCalendar.jsx`

Specific classes to review later:

```txt
h-full
min-h-screen
overflow-hidden
overflow-auto
lg:overflow-y-auto
pb-28
md:pb-32
```

Important: do not change these during utility/component extraction. Layout should be fixed only after the code is easier to reason about.

---

## Definition of done for architecture cleanup

- Existing UI looks the same.
- Existing behavior works the same.
- Custody files are smaller and easier to understand.
- No CSS workaround files are added.
- Data logic, calculations, actions, and presentation are separated.
- Future layout fixes can be made in the correct owner component.
