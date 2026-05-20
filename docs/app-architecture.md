# Family Wall App Architecture Cleanup Plan

## Goal

Organize the app codebase without changing current UI, behavior, Firestore structure, permissions, or routes.

This is an architecture cleanup only.

## Rules

- No visual redesign.
- No business logic changes.
- No Firestore schema changes.
- No permission changes.
- No new features during cleanup.
- No global CSS patches for page-specific issues.
- Keep commits small and reversible.
- Prefer moving code over rewriting code.

## Target pattern

`src/pages` should become mostly route-level wrappers.

Feature logic should move into feature folders:

```txt
src/features/dashboard
src/features/family-calendar
src/features/custody
src/features/tasks
src/features/meals
src/features/groceries
src/features/profile
src/features/auth
src/features/shared
```

## Layout ownership

`AppShell` owns:

- global header
- bottom navigation
- main outlet area
- global safe-area spacing

Page shells own:

- page background
- page max width
- page-level padding

Feature components own:

- internal feature layout
- cards inside the feature
- responsive behavior specific to that feature

Individual components own:

- local spacing
- local visual structure

Important: a child calendar/grid should not force full-screen height when it already lives inside an app shell. This creates layout conflicts.

## Custody target structure

```txt
src/features/custody/
  CustodyShell.jsx
  scope/
    CustodyScopeProvider.jsx
    CustodyGroupSelector.jsx
    hooks/
      useCustodyGroups.js
      useCustodyScope.js
  calendar/
    CustodyCalendarPage.jsx
    components/
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

## Other page targets

Dashboard:

```txt
src/features/dashboard/
  DashboardPage.jsx
  components/
  hooks/
  utils/
```

Family Calendar:

```txt
src/features/family-calendar/
  FamilyCalendarPage.jsx
  components/
  hooks/
  utils/
```

Tasks:

```txt
src/features/tasks/
  TasksPage.jsx
  components/
  hooks/
  utils/
```

Meals:

```txt
src/features/meals/
  MealsPage.jsx
  components/
  hooks/
  utils/
```

Groceries:

```txt
src/features/groceries/
  GroceriesPage.jsx
  components/
  hooks/
  utils/
```

Profile:

```txt
src/features/profile/
  ProfilePage.jsx
  components/
  hooks/
  utils/
```

Auth:

```txt
src/features/auth/
  LoginPage.jsx
  RegisterPage.jsx
  components/
  hooks/
```

## Refactor workflow per module

1. Document current responsibilities.
2. Move pure helpers first.
3. Move presentational components next.
4. Move data/actions into hooks after that.
5. Review layout ownership last.
6. Fix layout only after ownership is clear.

## Definition of done

- Existing screens look the same.
- Existing behavior works the same.
- Pages are smaller and easier to read.
- Feature folders clearly own their modules.
- No workaround CSS files are added.
- Layout fixes happen in the owning component.
