# Performance Backlog

## Route-level lazy loading

Status: Pending

Reason:
The production build currently warns that some chunks are larger than 500 kB. This is not blocking, but it can affect initial load performance as the app grows.

Planned improvement:
Use React.lazy and Suspense in App.jsx so heavy routes are loaded only when users navigate to them.

Candidate routes:
- Dashboard
- Calendar
- Custody
- Profile
- Tasks
- Meals
- Groceries
- Children

Validation:
- npm run build
- Manually test each route
- Confirm no auth/protected route regressions

Priority:
Medium. Do after architecture cleanup and core UX improvements.
