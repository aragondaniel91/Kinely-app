# Family Wall Stabilization Architecture

## Decision

Feature work is paused until the app is stable.

The app is not in production, so the data model can be improved even if old test data needs to be recreated.

## Problems to fix

The same concepts currently exist in multiple forms:

- parent1 / parent2
- dad / mom
- owner / member / co-parent
- members / memberEmails / parent2Email
- separate color maps in different files
- mixed English and Spanish UI text

This makes the app hard to maintain because different screens read different fields.

## Official People model

A Person is anyone used by the app:

- father
- mother
- child
- co-parent
- grandmother
- grandfather
- babysitter
- caregiver
- family member

### Role vs relationship

These must be separate.

Role controls access:

```text
owner, admin, editor, viewer, child
```

Relationship describes the person:

```text
father, mother, co_parent, grandmother, babysitter, caregiver, child, family_member
```

Correct example:

```js
{
  role: "admin",
  relationship: "father"
}
```

Avoid using `dad` or `mom` as technical roles.

## parent1 / parent2

`parent1` and `parent2` are legacy fields.

They should not be the long-term model because parent1 is not always dad and parent2 is not always mom.

Long-term, the app should use `people` records instead.

## Recommended Firestore structure

```text
users/{uid}
families/{familyId}
families/{familyId}/people/{personId}
families/{familyId}/events/{eventId}
custodyGroups/{custodyGroupId}
custodyGroups/{custodyGroupId}/people/{personId}
custodyGroups/{custodyGroupId}/events/{eventId}
```

## families/{familyId}/people/{personId}

Recommended person shape:

```js
{
  uid: "optional-user-uid",
  email: "person@example.com",
  firstName: "Daniel",
  lastName: "Aragon",
  displayName: "Daniel Aragon",
  type: "adult", // adult | child | group
  role: "owner", // owner | admin | editor | viewer | child
  relationship: "father",
  colorId: "blue",
  permissions: {
    calendar: { read: true, write: true },
    tasks: { read: true, write: true },
    meals: { read: true, write: true },
    groceries: { read: true, write: true },
    notes: { read: true, write: true }
  },
  status: "active"
}
```

## Colors

There must be one global color source.

Target file:

```text
src/lib/appColorUtils.js
```

All screens should use it:

- ParentColorPicker
- child color picker
- profile members
- family calendar legend
- custody calendar legend
- event cards

No component should keep its own unrelated color map.

## Language

Internal code and database fields should be English.

UI should support English and Spanish through a translation layer.

Target files:

```text
src/lib/i18n/en.js
src/lib/i18n/es.js
src/lib/i18n/index.js
```

Example:

```js
t("profile.members.title")
```

Settings should store:

```js
settings: {
  language: "en" // or "es"
}
```

## Stabilization phases

### Phase 1: Freeze features

Only work on architecture, cleanup, bugs, schema, colors, people, and language.

### Phase 2: Centralize colors

Create `src/lib/appColorUtils.js` and update all color consumers.

### Phase 3: Centralize people

Finish `src/lib/familyPeopleUtils.js` and make all screens use it.

### Phase 4: Modular Profile cleanup

Final structure:

```text
src/pages/Profile.jsx
src/components/profile/ProfileOverview.jsx
src/components/profile/ProfileFamiliesSection.jsx
src/components/profile/ProfileChildrenSection.jsx
src/components/profile/ProfileMembersSection.jsx
src/components/profile/ProfileMemberEditorDialog.jsx
src/components/profile/ProfileCustodySection.jsx
src/components/profile/ProfileNotificationsSection.jsx
src/components/profile/ProfileSettingsSection.jsx
```

### Phase 5: Firestore migration

Because the app is not production, we can rebuild the Firestore model around `people` subcollections.

### Phase 6: i18n

Add English/Spanish support and a language selector in Settings.

## Immediate next steps

1. Create `src/lib/appColorUtils.js`.
2. Update `ParentColorPicker.jsx` to use it.
3. Update `personColorUtils.js` to use it.
4. Update `familyPeopleUtils.js` to use `colorId` consistently.
5. Stop adding new parent1/parent2/dad/mom logic except for temporary legacy compatibility.
