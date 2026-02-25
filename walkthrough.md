# Walkthrough: Service Rating & Privacy Package (Commit `cd72e5f`)

I've consolidated the service rating system, offline queue improvements, and `/api/events/mine` privacy enhancements into a surgical commit.

## 📦 Files in this Commit (12)

1.  `supabase/migrations/0052_event_service_ratings.sql` - Database schema & RLS.
2.  `app/api/events/service-rating/route.ts` - Backend endpoint for ratings.
3.  `app/api/events/mine/route.ts` - Privacy-focused event history (cookie/header based).
4.  `components/ServiceRatingCard.tsx` - UI component with offline support.
5.  `app/no-ponto/page.tsx` - Integration in boarding flow.
6.  `app/registrar/page.tsx` - Integration in registration flow.
7.  `app/meu/page.tsx` - Event history display with ratings.
8.  `lib/offlineQueue.ts` - IndexedDB queue for offline sync.
9.  `hooks/useOfflineSync.ts` - Sync logic for pending events.
10. `hooks/useOneTap.ts` - Refined device identification.
11. `hooks/useDeviceId.ts` - Privacy-compliant device retrieval.
12. `lib/device.ts` - Device detection utilities.

## 🛠️ Key Changes

### 1. Service Rating System
- **Database**: Created `event_service_ratings` table with idempotency via `UNIQUE(device_id, client_event_id)`.
- **Backend**: New POST endpoint that strictly validates UUIDs and rating values (`GOOD`, `REGULAR`, `BAD`).
- **UI**: Responsive rating card integrated into the boarding flow, persistent across the session.

### 2. Privacy & Security (`/api/events/mine`)
- **Identification**: Removed `deviceId` from query strings. Now uses `vrnp_device_id` cookie or `x-device-id` header.
- **Cache Policy**: Forced `Cache-Control: no-store` to prevent leakage of private trip history in shared proxies or browser caches.

### 3. Offline Resilience
- Events and ratings are queued in IndexedDB if the user is offline.
- Automatic sync occurs when connectivity is restored, with deduplication/idempotency handled by the server.

---

## ⚡ Supabase Sync (No Secrets)

To apply the database changes without manually inputting passwords:

1.  Run `npx supabase login` to authenticate via browser.
2.  Ensure your project is linked: `npx supabase link --project-ref rrbpirfqslybhfguxhmp`.
3.  Run the push: `npx supabase db push`.

---

## 🧪 Quick QA Plan (8 Minutes)

1.  **Service Rating (3 min)**:
    *   Register a boarding at any stop.
    *   Select a rating in the `ServiceRatingCard`.
    *   Check `/meu` to see the rating reflected in your history.
2.  **Privacy (2 min)**:
    *   Open DevTools > Network.
    *   Inspect `/api/events/mine`.
    *   Verify `deviceId` is NOT in the URL.
    *   Verify `Cache-Control: no-store` in response headers.
3.  **Offline Queue (3 min)**:
    *   Set browser to **Offline** mode in DevTools.
    *   Submit a rating. Verify "Salvo no celular" notification.
    *   Go **Online**. Verify the event is sent and confirmed (check Network or history).

---

## ✅ Verification
- `npm run lint`: Passed.
- `npm run build`: Success.
