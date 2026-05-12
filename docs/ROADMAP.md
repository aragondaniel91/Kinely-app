# Family Wall Product Roadmap

## Block order

1. **Stabilization / technical cleanup**
   - Keep Profile, Families, Custody, Children, and permissions stable.
   - Avoid touching large legacy files unless the change is surgical.
   - Prevent child care profile data from being overwritten by family edits.

2. **Event Visibility / Audience Model**
   - Decide who can see each item before deciding who gets notified.
   - Support visibility levels: private, household/family, custody shared, and selected people.
   - Store explicit audience fields such as `visibility`, `visibleTo`, `notify.enabled`, and `notify.recipients`.
   - Critical use case: a primary custody parent can keep private child events hidden from a limited-access parent while sharing selected visitation/custody items.

3. **Notification Preferences**
   - User-level notification preferences.
   - Decide when to notify parents/members/viewers.
   - Support categories such as custody, family events, tasks, child care, meals, groceries, and invitations.
   - Prepare channels for in-app, email, push, and future SMS.

4. **Real Invitation System**
   - Invite by email.
   - Assign role and permissions.
   - Track invitation status.
   - Allow users to accept invitations and join the correct family or custody group.

5. **Child Care Profile v2**
   - Improve child profile UI.
   - Add child photo, emergency card, allergy alert banner, medication checklist, doctor/insurance information.
   - Add permission control for child health/care profile access.

6. **Family Calendar / Events**
   - Family events separate from custody schedule.
   - Day/week/month views.
   - Filters by child/person.
   - Event creation modal with optional notifications.

7. **Home Dashboard**
   - Today's custody status.
   - Next custody switch.
   - Today's events.
   - Pending tasks.
   - Meal plan.
   - Child care alerts.

8. **Tasks / Meals / Groceries polish**
   - Assign tasks to people.
   - Recurring tasks.
   - Weekly meal plan.
   - Allergy-aware meals.
   - Shared grocery list with purchased status.
