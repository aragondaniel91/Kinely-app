<<'EOF'
# Family Wall App Product & Technical Audit

## Purpose

This document tracks the current state of the Family Wall app, what already exists, what needs improvement, and what should be prioritized next.

The app direction is commercial-quality: every screen should feel calm, premium, trustworthy, family-friendly, and consistent from login to the deepest module.

---

## Product DNA

The app should feel:

- Premium
- Calm
- Trustworthy
- Warm
- Organized
- Family-first
- Clear for separated/co-parenting families
- Safe with data boundaries
- Easy enough for non-technical parents/caregivers

Visual direction:

- Soft cards
- Calm neutral backgrounds
- Rounded corners
- Subtle shadows
- Clear hierarchy
- No clutter
- Consistent spacing
- Responsive for desktop, tablet, phone, and wall display

Core principle:

> A family management app should feel peaceful, not stressful.

---

## Current Architecture Status

### Completed cleanup

- Custody feature moved to `src/features/custody`
- Custody Calendar moved to `src/features/custody/calendar`
- Family Calendar moved to `src/features/family-calendar`
- Legacy FamilyCalendarViewV* files removed
- Legacy ProfileV* files removed
- Preview/orphan files removed
- Unused utility modules removed
- `src/components/calendar` reduced to shared calendar controls
- Build passes successfully

### Current important folders

```txt
src/features/custody/
src/features/custody/calendar/
src/features/family-calendar/
src/components/layout/
src/components/profile/
src/components/ui/
src/lib/
src/core/
src/pages/