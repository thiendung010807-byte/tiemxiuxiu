# V9 - Vercel TypeScript fix (second pass)

- Fix `src/app/api/admin/orders/route.ts` by introducing an explicit `AdminOrder` record type and `toAdminOrder` mapper for both Firestore queries.
- This addresses the failed inference for `order_status` in the Vercel deployment at commit a45af29.
- UI, delivery filtering, ordering, and delete APIs are unchanged.
- Production build is not verified: dependencies cannot be installed from the offline package cache in this environment.
