# Family Wall Audit Report

Scanned files: 181
Generated: 2026-05-27T21:13:39.870Z

## Browser dialogs still in use

Severity: P1
Reason: Breaks app visual DNA. Should use app dialog.

No matches found.

## Raw modal/dialog overlays

Severity: P1
Reason: Likely custom overlay outside the app dialog system.

- src/pages/Groceries.jsx: 7 match(es), sample lines: 3123, 3167, 3211, 3268, 3393, 3434, 3519
- src/pages/Meals.jsx: 3 match(es), sample lines: 718, 1454, 2507

## Raw inputs/selects/textareas

Severity: P2
Reason: Likely inconsistent form fields.

No matches found.

## Hardcoded person/parent color risks

Severity: P1
Reason: Could bypass parent/person color system.

No matches found.

## Hardcoded color classes

Severity: P2
Reason: Mostly visual/status colors; review only when tied to people, parents, or children.

- src/pages/Groceries.jsx: 86 match(es), sample lines: 69, 69, 73, 73, 85, 85, 90, 90, 95, 95, 105, 105
- src/features/custody/CustodyDashboardPro.jsx: 72 match(es), sample lines: 204, 214, 214, 214, 215, 215, 215, 216, 216, 216, 217, 217
- src/features/tasks/components/ManageTaskTemplatesDialog.jsx: 61 match(es), sample lines: 81, 81, 82, 82, 83, 83, 84, 84, 85, 85, 90, 90
- src/features/custody/PackingHub.jsx: 46 match(es), sample lines: 48, 48, 48, 49, 49, 49, 50, 50, 50, 51, 51, 51
- src/features/custody/ExchangeHub.jsx: 44 match(es), sample lines: 161, 161, 161, 168, 168, 168, 174, 174, 174, 215, 232, 232
- src/pages/Meals.jsx: 42 match(es), sample lines: 61, 61, 69, 69, 77, 77, 85, 85, 170, 193, 281, 281
- src/features/custody/SmartNotificationsHub.jsx: 33 match(es), sample lines: 37, 37, 37, 47, 47, 47, 57, 57, 57, 67, 67, 67
- src/features/family-calendar/components/FamilyEventDetailsPopover.jsx: 33 match(es), sample lines: 415, 415, 415, 425, 425, 425, 425, 435, 435, 435, 435, 445
- src/features/tasks/components/TasksFocusPanel.jsx: 31 match(es), sample lines: 38, 38, 38, 39, 39, 39, 50, 50, 54, 54, 66, 66
- src/components/home/FamilyHomeDashboard.jsx: 29 match(es), sample lines: 153, 153, 153, 154, 154, 154, 155, 155, 155, 156, 156, 156
- src/components/tasks/AddTaskDialog.jsx: 29 match(es), sample lines: 217, 217, 218, 218, 219, 223, 223, 224, 224, 225, 241, 241
- src/features/custody/components/budget/BudgetExpenseCard.jsx: 27 match(es), sample lines: 9, 9, 9, 10, 10, 10, 12, 12, 12, 68, 71, 71
- src/features/custody/BudgetHub.jsx: 26 match(es), sample lines: 83, 99, 99, 99, 102, 102, 102, 115, 115, 116, 116, 117
- src/pages/Custody.jsx: 26 match(es), sample lines: 40, 40, 40, 55, 55, 55, 63, 63, 63, 70, 70, 70
- src/pages/Register.jsx: 24 match(es), sample lines: 53, 54, 72, 72, 73, 73, 77, 83, 113, 113, 113, 225
- src/features/custody/components/budget/BudgetExpenseDetail.jsx: 20 match(es), sample lines: 9, 9, 9, 10, 10, 10, 12, 12, 12, 82, 97, 113
- src/features/tasks/data/taskPeople.js: 20 match(es), sample lines: 17, 18, 19, 20, 29, 30, 31, 32, 41, 42, 43, 44
- src/features/custody/calendar/components/CustodyDayDialog.jsx: 19 match(es), sample lines: 859, 859, 864, 864, 882, 882, 883, 886, 891, 895, 983, 1016
- src/features/tasks/components/ApplyTaskTemplateDialog.jsx: 18 match(es), sample lines: 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 90, 90
- src/components/profile/ProfileMembersSection.jsx: 17 match(es), sample lines: 99, 99, 99, 105, 105, 105, 111, 111, 111, 324, 324, 324
- src/features/family-calendar/components/FamilyCalendarPlannerHeader.jsx: 17 match(es), sample lines: 28, 29, 29, 42, 42, 42, 45, 45, 45, 48, 48, 48
- src/pages/ChildProfiles.jsx: 17 match(es), sample lines: 84, 84, 88, 267, 280, 283, 288, 288, 288, 299, 299, 299
- src/components/profile/ProfileFamiliesSection.jsx: 15 match(es), sample lines: 78, 78, 79, 79, 90, 293, 293, 293, 295, 295, 295, 334
- src/components/meals/AddMealDialog.jsx: 14 match(es), sample lines: 46, 46, 54, 54, 62, 62, 70, 70, 258, 258, 258, 925
- src/pages/NotificationPreferences.jsx: 14 match(es), sample lines: 127, 142, 142, 146, 149, 255, 258, 274, 274, 274, 282, 282
- src/features/family-calendar/components/AddFamilyEventDialog.jsx: 13 match(es), sample lines: 217, 608, 608, 608, 615, 616, 683, 683, 683, 690, 690, 709
- src/data/custodyBudget.js: 12 match(es), sample lines: 205, 205, 205, 240, 240, 240, 249, 249, 249, 257, 257, 257
- src/features/custody/components/budget/BudgetAppDialog.jsx: 12 match(es), sample lines: 9, 9, 10, 10, 14, 14, 15, 15, 19, 19, 20, 20
- src/features/tasks/components/KidsChoresPreview.jsx: 12 match(es), sample lines: 49, 71, 71, 71, 86, 86, 88, 89, 107, 107, 108, 109
- src/features/custody/CustodyGroupsManager.jsx: 11 match(es), sample lines: 143, 143, 143, 152, 152, 152, 157, 157, 157, 168, 168
- src/features/custody/components/budget/BudgetExpenseWizard.jsx: 11 match(es), sample lines: 203, 212, 387, 387, 395, 395, 402, 402, 402, 417, 417
- src/pages/Login.jsx: 11 match(es), sample lines: 40, 53, 54, 61, 62, 75, 128, 128, 141, 141, 143
- src/components/profile/CustodyInviteHelper.jsx: 9 match(es), sample lines: 69, 72, 83, 83, 83, 102, 102, 102, 163
- src/features/custody/calendar/components/CustodyDayCard.jsx: 9 match(es), sample lines: 92, 92, 92, 112, 112, 112, 122, 122, 122
- src/pages/Tasks.jsx: 9 match(es), sample lines: 464, 464, 467, 470, 473, 486, 486, 497, 497
- src/components/shared/VisibilityAudienceSelector.jsx: 8 match(es), sample lines: 31, 31, 50, 50, 51, 51, 51, 193
- src/features/custody/calendar/components/BulkCustodyDialog.jsx: 8 match(es), sample lines: 512, 512, 512, 513, 513, 802, 802, 802
- src/features/tasks/components/ChildRewardCard.jsx: 8 match(es), sample lines: 80, 80, 82, 88, 93, 110, 144, 144
- src/components/profile/ProfileOverview.jsx: 7 match(es), sample lines: 35, 71, 71, 79, 79, 87, 87
- src/features/custody/calendar/components/CustodyBulkUndoBanner.jsx: 7 match(es), sample lines: 13, 13, 16, 17, 21, 21, 21
- src/features/family-calendar/components/FamilyCalendarMonthGrid.jsx: 7 match(es), sample lines: 53, 53, 62, 67, 89, 89, 89
- src/components/profile/ProfileSettingsSection.jsx: 6 match(es), sample lines: 82, 82, 83, 90, 90, 91
- src/features/family-calendar/components/FamilyCalendarFilterDropdown.jsx: 6 match(es), sample lines: 55, 55, 56, 67, 96, 96
- src/features/family-calendar/components/FamilyCalendarMonthPicker.jsx: 5 match(es), sample lines: 19, 41, 58, 58, 58
- src/features/custody/CustodyCalendarView.jsx: 4 match(es), sample lines: 157, 202, 202, 202
- src/features/custody/calendar/CustodyCalendarPage.jsx: 4 match(es), sample lines: 781, 781, 815, 815
- src/features/custody/calendar/components/CustodyCalendarSidebar.jsx: 4 match(es), sample lines: 70, 112, 122, 138
- src/features/custody/calendar/components/DayDetailView.jsx: 4 match(es), sample lines: 55, 55, 55, 58
- src/features/tasks/components/TaskTile.jsx: 4 match(es), sample lines: 13, 13, 14, 14
- src/components/profile/ProfileCustodySection.jsx: 3 match(es), sample lines: 11, 13, 18
- src/features/family-calendar/components/FamilyCalendarTimelineGrid.jsx: 3 match(es), sample lines: 61, 105, 136
- src/features/tasks/components/RewardCelebrationOverlay.jsx: 3 match(es), sample lines: 43, 62, 64
- src/components/layout/AppShell.jsx: 2 match(es), sample lines: 84, 84
- src/components/layout/FamilySelector.jsx: 2 match(es), sample lines: 199, 220
- src/components/profile/ProfileMemberEditorDialog.jsx: 2 match(es), sample lines: 312, 312
- src/features/custody/calendar/components/CustodySpecialEventDialog.jsx: 2 match(es), sample lines: 111, 111
- src/features/custody/calendar/components/CustodyTravelPlanDialog.jsx: 2 match(es), sample lines: 102, 102
- src/features/family-calendar/FamilyCalendarView.jsx: 2 match(es), sample lines: 384, 384
- src/features/family-calendar/components/FamilyEventOverflowPopover.jsx: 2 match(es), sample lines: 53, 53
- src/features/tasks/components/FamilyRewardCard.jsx: 2 match(es), sample lines: 80, 80
- src/features/tasks/components/PersonCard.jsx: 2 match(es), sample lines: 177, 177
- src/pages/ProfileModular.jsx: 2 match(es), sample lines: 48, 74

## Old COLOR_MAP or ParentColorPicker dependency

Severity: P0
Reason: May bypass appColorUtils normalization.

- src/components/profile/ParentColorPicker.jsx: 2 match(es), sample lines: 5, 18

## Custody legacy/scope fields

Severity: P0
Reason: Important for multi-child/multi-family custody scope.

- src/features/custody/calendar/components/CustodyDayDialog.jsx: 51 match(es), sample lines: 106, 167, 167, 167, 168, 168, 168, 176, 177, 177, 178, 178
- src/features/custody/calendar/CustodyCalendarPage.jsx: 39 match(es), sample lines: 73, 73, 80, 80, 129, 130, 145, 146, 204, 207, 226, 228
- src/features/custody/CustodyCalendarView.jsx: 26 match(es), sample lines: 41, 42, 44, 45, 55, 56, 58, 59, 61, 62, 65, 66
- src/core/events/eventCore.js: 25 match(es), sample lines: 40, 40, 49, 49, 49, 54, 55, 55, 55, 74, 74, 74
- src/features/custody/calendar/utils/custodyBulkUtils.js: 23 match(es), sample lines: 99, 100, 106, 107, 108, 112, 113, 126, 127, 131, 132, 140
- src/lib/personColorUtils.js: 20 match(es), sample lines: 62, 63, 66, 67, 70, 71, 125, 140, 172, 185, 197, 201
- src/components/profile/ProfileFamiliesSection.jsx: 18 match(es), sample lines: 99, 99, 181, 182, 212, 212, 213, 213, 213, 214, 214, 214
- src/core/people/peopleCore.js: 17 match(es), sample lines: 86, 106, 106, 106, 106, 127, 128, 182, 199, 202, 217, 220
- src/pages/Dashboard.jsx: 16 match(es), sample lines: 31, 31, 35, 35, 143, 147, 172, 175, 191, 194, 210, 213
- src/core/family/familyCore.js: 15 match(es), sample lines: 13, 89, 90, 102, 103, 116, 116, 117, 117, 118, 132, 132
- src/features/tasks/hooks/useTaskBoardPeople.js: 15 match(es), sample lines: 67, 67, 68, 72, 73, 90, 107, 108, 134, 147, 148, 159
- src/lib/FamilyContext.jsx: 15 match(es), sample lines: 28, 66, 66, 81, 81, 81, 82, 82, 82, 100, 101, 312
- src/features/family-calendar/components/FamilyEventCard.jsx: 14 match(es), sample lines: 31, 32, 33, 38, 38, 38, 39, 40, 60, 60, 84, 84
- src/lib/appColorUtils.js: 14 match(es), sample lines: 199, 200, 205, 206, 211, 212, 216, 217, 220, 221, 224, 225
- src/features/custody/CustodyDashboardPro.jsx: 13 match(es), sample lines: 38, 38, 38, 39, 39, 39, 101, 102, 108, 115, 166, 170
- src/features/custody/CustodyScopeMetadataBackfill.jsx: 9 match(es), sample lines: 20, 20, 33, 34, 43, 49, 50, 84, 85
- src/features/family-calendar/components/FamilyEventDetailsPopover.jsx: 9 match(es), sample lines: 120, 121, 240, 241, 242, 247, 311, 369, 369
- src/pages/Meals.jsx: 9 match(es), sample lines: 1585, 1589, 1742, 1773, 1936, 2040, 2075, 2120, 2202
- src/features/custody/ExchangeHub.jsx: 8 match(es), sample lines: 57, 57, 57, 58, 58, 58, 67, 74
- src/features/custody/SmartNotificationsHub.jsx: 8 match(es), sample lines: 87, 87, 87, 88, 88, 88, 142, 149
- src/features/tasks/hooks/useRoutineRuns.js: 8 match(es), sample lines: 101, 147, 151, 187, 244, 338, 369, 439
- src/lib/familyPeopleUtils.js: 8 match(es), sample lines: 32, 44, 94, 105, 106, 254, 310, 328
- src/core/events/familyEventAdapter.js: 7 match(es), sample lines: 21, 24, 35, 36, 36, 37, 38
- src/features/family-calendar/components/AddFamilyEventDialog.jsx: 7 match(es), sample lines: 456, 457, 468, 468, 478, 478, 514
- src/features/family-calendar/components/FamilyCalendarLegend.jsx: 7 match(es), sample lines: 22, 23, 27, 50, 56, 77, 77
- src/pages/Groceries.jsx: 7 match(es), sample lines: 1362, 1418, 1806, 1927, 2152, 2216, 2259
- src/features/custody/CustodyGroupsManager.jsx: 6 match(es), sample lines: 181, 328, 331, 373, 472, 472
- src/features/custody/calendar/components/CustodyCalendarSidebar.jsx: 6 match(es), sample lines: 92, 93, 132, 135, 136, 136
- src/features/custody/calendar/utils/custodyCalculations.js: 6 match(es), sample lines: 15, 16, 35, 36, 37, 38
- src/features/custody/calendar/utils/custodyMappers.js: 6 match(es), sample lines: 10, 10, 10, 11, 11, 11
- src/features/family-calendar/utils/familyCalendarColorStyles.js: 6 match(es), sample lines: 6, 7, 13, 13, 14, 14
- src/lib/custodyGroupUtils.js: 5 match(es), sample lines: 75, 75, 76, 172, 181
- src/components/home/FamilyHomeDashboard.jsx: 4 match(es), sample lines: 124, 124, 127, 128
- src/components/meals/AddMealDialog.jsx: 4 match(es), sample lines: 420, 466, 521, 612
- src/features/custody/calendar/components/DayDetailView.jsx: 4 match(es), sample lines: 14, 16, 16, 17
- src/features/family-calendar/components/FamilyEventOverflowPopover.jsx: 4 match(es), sample lines: 44, 44, 44, 45
- src/features/tasks/hooks/useTaskRewards.js: 4 match(es), sample lines: 27, 80, 84, 153
- src/features/tasks/components/ManageTaskRewardsDialog.jsx: 2 match(es), sample lines: 201, 222
- src/features/tasks/hooks/useFamilyTasks.js: 2 match(es), sample lines: 41, 43
- src/features/tasks/hooks/useRecurringTaskGenerator.js: 2 match(es), sample lines: 202, 226
- src/components/tasks/AddTaskDialog.jsx: 1 match(es), sample lines: 548
- src/features/custody/calendar/components/BulkCustodyDialog.jsx: 1 match(es), sample lines: 199
- src/features/family-calendar/hooks/useFamilyCalendarEvents.js: 1 match(es), sample lines: 6
- src/features/family-calendar/utils/familyCalendarFilterOptions.js: 1 match(es), sample lines: 13
- src/features/tasks/components/ApplyTaskTemplateDialog.jsx: 1 match(es), sample lines: 356
- src/features/tasks/components/ManageTaskTemplatesDialog.jsx: 1 match(es), sample lines: 724
- src/features/tasks/utils/taskDialogOptions.js: 1 match(es), sample lines: 211
- src/lib/resetCustodyData.js: 1 match(es), sample lines: 38
- src/pages/Custody.jsx: 1 match(es), sample lines: 312

## Heavy visual effects

Severity: P2
Reason: Can make tablet/kiosk feel heavy.

- src/pages/Meals.jsx: 28 match(es), sample lines: 169, 170, 217, 335, 335, 417, 417, 456, 456, 498, 718, 1081
- src/pages/Groceries.jsx: 21 match(es), sample lines: 618, 755, 786, 916, 979, 2485, 2485, 2515, 2515, 2572, 2596, 2689
- src/components/home/FamilyHomeDashboard.jsx: 17 match(es), sample lines: 172, 172, 201, 253, 284, 284, 308, 327, 330, 347, 362, 403
- src/features/custody/PackingHub.jsx: 14 match(es), sample lines: 98, 114, 114, 143, 143, 143, 159, 212, 307, 556, 560, 564
- src/features/custody/CustodyDashboardPro.jsx: 12 match(es), sample lines: 225, 225, 254, 318, 629, 644, 647, 652, 685, 699, 721, 756
- src/features/custody/ExchangeHub.jsx: 9 match(es), sample lines: 211, 227, 227, 259, 284, 303, 347, 713, 749
- src/pages/Custody.jsx: 8 match(es), sample lines: 134, 153, 153, 178, 208, 397, 431, 438
- src/components/layout/AppShell.jsx: 7 match(es), sample lines: 34, 34, 58, 58, 71, 71, 84
- src/features/custody/SmartNotificationsHub.jsx: 7 match(es), sample lines: 375, 391, 391, 423, 659, 687, 704
- src/features/family-calendar/FamilyCalendarView.jsx: 7 match(es), sample lines: 324, 324, 351, 351, 355, 355, 384
- src/features/tasks/components/ManageTaskTemplatesDialog.jsx: 6 match(es), sample lines: 225, 225, 225, 882, 929, 939
- src/features/custody/CustodyCalendarView.jsx: 5 match(es), sample lines: 154, 154, 444, 444, 520
- src/features/tasks/components/RewardCelebrationOverlay.jsx: 5 match(es), sample lines: 33, 55, 55, 56, 57
- src/components/meals/AddMealDialog.jsx: 4 match(es), sample lines: 135, 169, 684, 700
- src/features/tasks/components/TasksRewardsPanel.jsx: 4 match(es), sample lines: 37, 37, 92, 119
- src/components/tasks/AddTaskDialog.jsx: 3 match(es), sample lines: 281, 299, 783
- src/features/tasks/components/ApplyTaskTemplateDialog.jsx: 3 match(es), sample lines: 118, 136, 175
- src/features/tasks/components/PersonCard.jsx: 3 match(es), sample lines: 91, 91, 91
- src/components/calendar/CalendarViewControls.jsx: 2 match(es), sample lines: 35, 74
- src/features/family-calendar/components/FamilyCalendarPlannerHeader.jsx: 2 match(es), sample lines: 19, 117
- src/features/family-calendar/components/FamilyEventCard.jsx: 2 match(es), sample lines: 72, 100
- src/features/tasks/components/BottomFocusBar.jsx: 2 match(es), sample lines: 23, 23
- src/features/tasks/components/FamilyHeader.jsx: 2 match(es), sample lines: 37, 37
- src/features/tasks/components/KidsChoresPreview.jsx: 2 match(es), sample lines: 104, 104
- src/features/tasks/components/TaskCategoryFilter.jsx: 2 match(es), sample lines: 8, 8
- src/features/tasks/components/TasksFocusPanel.jsx: 2 match(es), sample lines: 329, 329
- src/components/app/AppDialog.jsx: 1 match(es), sample lines: 54
- src/components/profile/ProfileMemberEditorDialog.jsx: 1 match(es), sample lines: 218
- src/features/custody/calendar/components/CustodyDayCard.jsx: 1 match(es), sample lines: 39
- src/features/family-calendar/components/FamilyEventDetailsPopover.jsx: 1 match(es), sample lines: 490
- src/features/tasks/components/ChildRewardCard.jsx: 1 match(es), sample lines: 80
- src/features/tasks/components/FamilyRewardCard.jsx: 1 match(es), sample lines: 80
- src/features/tasks/components/ManageTaskRewardsDialog.jsx: 1 match(es), sample lines: 296
- src/features/tasks/components/TaskTile.jsx: 1 match(es), sample lines: 30
- src/pages/Login.jsx: 1 match(es), sample lines: 39
- src/pages/Register.jsx: 1 match(es), sample lines: 224
- src/pages/Tasks.jsx: 1 match(es), sample lines: 464

## Direct Firestore queries in UI components

Severity: P2
Reason: Data logic may be mixed with UI rendering.

- src/pages/Groceries.jsx: 22 match(es), sample lines: 1124, 1125, 1126, 1127, 1350, 1402, 1451, 1519, 1570, 1604, 1759, 1798
- src/pages/Meals.jsx: 18 match(es), sample lines: 1583, 1592, 1618, 1633, 1663, 1734, 1771, 1833, 1877, 1921, 1957, 1997
- src/features/custody/calendar/CustodyCalendarPage.jsx: 13 match(es), sample lines: 201, 208, 213, 223, 229, 239, 245, 294, 384, 433, 441, 481
- src/features/custody/calendar/components/CustodyDayDialog.jsx: 12 match(es), sample lines: 219, 358, 368, 394, 400, 490, 547, 620, 679, 761, 764, 781
- src/pages/Dashboard.jsx: 11 match(es), sample lines: 140, 149, 157, 169, 177, 188, 196, 207, 215, 225, 234
- src/features/custody/BudgetHub.jsx: 8 match(es), sample lines: 291, 313, 417, 428, 521, 583, 619, 647
- src/features/custody/CustodyGroupsManager.jsx: 8 match(es), sample lines: 269, 270, 351, 380, 457, 461, 469, 518
- src/lib/FamilyContext.jsx: 7 match(es), sample lines: 327, 329, 411, 514, 598, 599, 654
- src/components/meals/AddMealDialog.jsx: 6 match(es), sample lines: 307, 380, 413, 450, 506, 600
- src/features/custody/ExchangeHub.jsx: 6 match(es), sample lines: 487, 519, 616, 629, 660, 686
- src/features/custody/PackingHub.jsx: 6 match(es), sample lines: 375, 380, 456, 489, 505, 538
- src/features/custody/CustodyDashboardPro.jsx: 5 match(es), sample lines: 413, 414, 449, 478, 507
- src/features/custody/SmartNotificationsHub.jsx: 5 match(es), sample lines: 553, 554, 555, 556, 620
- src/features/family-calendar/FamilyCalendarView.jsx: 5 match(es), sample lines: 151, 243, 250, 261, 273
- src/features/tasks/hooks/useRoutineRuns.js: 5 match(es), sample lines: 145, 155, 182, 234, 248
- src/features/family-calendar/components/AddFamilyEventDialog.jsx: 4 match(es), sample lines: 485, 487, 495, 507
- src/features/tasks/hooks/useFamilyTasks.js: 4 match(es), sample lines: 39, 44, 73, 105
- src/features/tasks/hooks/useTaskRewards.js: 4 match(es), sample lines: 78, 88, 145, 151
- src/lib/AuthContext.jsx: 4 match(es), sample lines: 97, 146, 197, 237
- src/features/family-calendar/components/FamilyEventDetailsPopover.jsx: 3 match(es), sample lines: 192, 206, 304
- src/features/tasks/components/ManageTaskTemplatesDialog.jsx: 3 match(es), sample lines: 761, 763, 788
- src/components/layout/FamilySelector.jsx: 2 match(es), sample lines: 69, 70
- src/components/tasks/AddTaskDialog.jsx: 2 match(es), sample lines: 555, 557
- src/features/custody/CustodyCalendarView.jsx: 2 match(es), sample lines: 263, 264
- src/features/custody/CustodyScopeMetadataBackfill.jsx: 2 match(es), sample lines: 57, 66
- src/features/tasks/components/ManageTaskRewardsDialog.jsx: 2 match(es), sample lines: 157, 166
- src/lib/resetCustodyData.js: 2 match(es), sample lines: 47, 64
- src/pages/Custody.jsx: 2 match(es), sample lines: 289, 290
- src/services/familyEventsService.js: 2 match(es), sample lines: 11, 20
- src/features/tasks/hooks/useTaskTemplates.js: 1 match(es), sample lines: 53
- src/pages/NotificationPreferences.jsx: 1 match(es), sample lines: 226
