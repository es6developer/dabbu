# Phase 4 — Spaces + Circles Merge → Family Hub

## 1. Migration Strategy

### Current State
- **Spaces**: Shared groups for any purpose (couple, family, friends, trips, roommates)
- **Circles**: Smaller shared groups focused on split expenses (friends, roommates, trips)
- Both concepts overlap in functionality: expense sharing, group wallets, settlements, chats
- Users are confused by the distinction (confirmed by UX research)

### Target State
- Single concept: **Family Hub**
- 4 categories: **Couple** · **Family** · **Friends** · **Trip**
- Filterable by type
- Unified creation flow (no more "Create Space" vs "Create Circle")

---

## 2. Database Migration Plan

### No Schema Changes Needed
The `SharedGroup` model already has:
- `type` field (supports: couple, family, friends, trip)
- All existing Space and Circle records can remain with their type

### Migration Queries

```sql
-- No DDL changes needed
-- All existing spaces/circles are already in shared_groups table
-- Migration: just update type where it's ambiguous
UPDATE shared_groups SET type = 'friends' WHERE type IS NULL OR type = 'other';
UPDATE shared_groups SET type = 'couple' WHERE type = 'partner' OR type = 'spouse';
```

### Migration Steps
1. Verify all group records have a valid `type`
2. Add index on `(userId, type)` for filter queries (already exists)
3. Backfill any null types to `'friends'`

---

## 3. API Migration Plan

### Current Endpoints

| Endpoint | Purpose |
|:---------|:--------|
| `GET /shared-finance/groups` | List all groups |
| `POST /shared-finance/groups` | Create group |
| `GET /shared-finance/groups/:id` | Get group detail |
| `GET /circles/list` | List circles (duplicate) |
| `POST /circles/create` | Create circle (duplicate) |

### After Migration

| Endpoint | Purpose | Status |
|:---------|:--------|:-------|
| `GET /shared-finance/groups?type=couple|family|friends|trip` | List groups with optional type filter | ✅ Done |
| `POST /shared-finance/groups` | Create group (single unified flow) | Existing |
| `GET /shared-finance/groups/:id` | Get group detail | Existing |
| `GET /family-hub/stats` | Family Hub dashboard stats | New |

### Deprecated Endpoints (remove after migration)

```
DELETE /circles/list
DELETE /circles/create
DELETE /circles/:id/invite
```

### Frontend API Migration

```typescript
// Before (old)
const spaces = await api.get('/shared-finance/groups');
const circles = await api.get('/circles/list');

// After (new)
const allGroups = await api.get('/shared-finance/groups');
const coupleGroups = await api.get('/shared-finance/groups?type=couple');
```

---

## 4. UI Migration Plan

### What Changed

| Old Name | New Name | File |
|:---------|:---------|:-----|
| Spaces Tab | Family Tab | `MainTabNavigator.tsx` |
| SpacesDashboardScreen | FamilyHubScreen | `FamilyHubScreen.tsx` |
| SpacesDashboardHome | FamilyHubHome | `FamilyHubNavigator.tsx` |
| CirclesListScreen | — (removed) | — |
| CreateCircleScreen | CreateSharedGroupScreen | unified |
| SplitExpenseScreen | — (merged into SharedExpenseFormScreen) | — |

### Navigation Changes

```
Before:
  BottomTab:
    ├── Spaces → SpacesNavigator → SpacesDashboard → SharedGroupDetail
    │                                         → CreateSharedGroup
    │                                         → CoupleFinance
    └── (hidden) → CirclesNavigator → CirclesList → SharedGroupDetail
                                                    → SplitExpense
                                                    → CoupleFinance

After:
  BottomTab:
    └── Family → FamilyHubStack → FamilyHubHome (with type filter chips)
                                  → SharedGroupDetail
                                  → CreateSharedGroup (unified)
                                  → CoupleFinance
                                  → FamilyDashboard
                                  → TripDashboard
                                  → Settlement
                                  → InviteMember
```

### Removed UI Elements
- "Create Circle" button → replaced by "Create Group" in Family Hub
- Circles badge/tab → removed
- All old space-specific icons → replaced by Family Hub icons (people-outline)
