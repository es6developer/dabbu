# Phase 16 — Performance Audit & Improvement Plan

## 1. Bundle Size

| Metric | Current | Target | Status |
|:-------|:-------:|:------:|:------|
| Node modules | 24 MB | — | ✅ Acceptable |
| Metro bundle (dev) | ~4-6 MB | — | — |
| Expo export (prod) | ~2-3 MB | < 2 MB | ⚠️ Need measurement |
| Largest screen | 2,011 lines | < 500 lines | ❌ SharedGroupDetailScreen |
| Total screen code | 68K lines | < 40K lines | ❌ 40% dead code |

## 2. Navigation & Rendering

### Current Worst-Case Re-render Chain

```
App.tsx re-renders
→ RootNavigator (theme context)
  → MainTabNavigator (AuthContext, ThemeContext, CoupleMode)
    → HomeScreen (loaded: 7 API calls → 7 state updates → 7 re-renders)
    → WalletHomeScreen
    → FamilyHubScreen
    → SettingsScreen
```

### Optimization Targets

| Issue | Fix | Effort | Impact |
|:------|:----|:------:|:------:|
| HomeScreen makes 7 API calls | ✅ Consolidated `/dashboard` endpoint | Done | High — 1 call vs 7 |
| 65 dead screens (~20K lines) loaded | Delete them | 2 days | Medium — less code to parse |
| 2,011-line SharedGroupDetailScreen | Split into 3 sub-components | 2 days | High — biggest perf bottleneck |
| Context re-renders (theme + auth) | Memoize selectors, use `useMemo` | 1 day | Medium |
| No lazy loading for deep screens | `React.lazy()` + `Suspense` | 1 day | Medium — faster initial load |
| 14 navigator files | Reduce to 6 | Planned (Sprint 2) | Medium — less nesting |

### Screen Load Time Estimates

| Screen | Current (est) | Target | Strategy |
|:-------|:------------:|:------:|:---------|
| HomeScreen | ~800ms (7 calls waterfall) | < 300ms | ✅ `/dashboard` consolidated |
| GoalsListScreen | ~400ms | < 300ms | Single API call |
| FinancialCenter | ~600ms (4 parallel calls) | < 400ms | Already parallel |
| SharedGroupDetailScreen | ~1.2s (largest component) | < 500ms | Split into sub-components |

## 3. API Call Optimization

### Before HomeScreen (7 calls on mount):

```
GET /net-worth
GET /ai/health-score
GET /ai/insights?section=dashboard
GET /bills?isPaid=false&limit=5
GET /transactions?limit=5
GET /goals
GET /transactions/stats
```

### After (1 call):

```
GET /dashboard → returns all home screen data
```

### Other Optimizations

- **FinancialCenterScreen**: 4 calls in parallel ✅
- **GoalDetailScreen**: 2 calls in parallel ✅
- **EmergencyFundScreen**: 1 call ✅ (was 2)
- **Debounce search**: Not needed (no live search screens)

## 4. Memory & FPS

| Concern | Check | Status |
|:--------|:------|:-------|
| Image memory | Avatar URLs, no heavy images | ✅ |
| Chart rendering | Only 3 files use react-native-chart-kit | ✅ |
| FlatList vs ScrollView | Only BillsListScreen uses FlatList (virtualized) | ⚠️ Consider FlatList for transactions |
| Animation performance | All use `useNativeDriver: true` | ✅ |
| Reanimated usage | Only in ai/components/AiShared.tsx | ✅ |

## 5. Performance Improvement Plan

### Sprint 1 (Critical)

| Task | Estimate |
|:-----|:--------:|
| Replace HomeScreen 7 calls with 1 `/dashboard` | ✅ Done |
| Delete 65 dead screens (~20K lines) | 2 days |
| Split SharedGroupDetailScreen (2011 → 3× ~700 lines) | 2 days |
| Add `React.lazy` to all deep screens | 1 day |
| Run `npx expo export --dump-sourcemap` to measure bundle | 4 hours |
| Remove unused npm packages | 1 day |

### Sprint 8 (Polish)

| Task | Estimate |
|:-----|:--------:|
| FlatList all transaction/screen lists with windowSize=5 | 1 day |
| Memoize all heavy render functions | 1 day |
| Add `InteractionManager.runAfterInteractions` for chart loading | 4 hours |
| Profile with `react-native-metrics` | 1 day |
| Cold start benchmark | 4 hours |

## 6. Cold Start Target

```
Current (estimated):
  JS bundle load:       ~600ms
  Navigation mount:     ~400ms
  Data fetching:        ~800ms (waterfall)
  First meaningful paint: ~1.8s

Target:
  JS bundle load:       ~400ms (after deleting dead code)
  Navigation mount:     ~200ms (after navigator reduction)
  Data fetching:        ~300ms (single /dashboard call)
  First meaningful paint: < 900ms
  Full interactive:     < 2s
```

## 7. Monitoring

```typescript
// Add performance tracking in development
if (__DEV__) {
  const renderTimers = new Map<string, number>();
  // Wrap screen components to log mount times
  function withPerfTracking<T>(name: string, Component: React.ComponentType<T>) {
    return (props: T) => {
      const start = performance.now();
      const result = <Component {...props} />;
      const elapsed = performance.now() - start;
      if (elapsed > 100) console.warn(`[PERF] ${name} rendered in ${elapsed.toFixed(0)}ms`);
      return result;
    };
  }
}
```
