# Graph Report - /Users/knightnm/CAFE_Booking_Main  (2026-07-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 252 nodes · 373 edges · 10 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11c9d5c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- types.ts
- authController.ts
- package.json
- dependencies
- compilerOptions
- compilerOptions
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `scripts` - 7 edges
4. `db` - 7 edges
5. `authenticate()` - 5 edges
6. `hashPassword()` - 5 edges
7. `AuthResponse` - 5 edges
8. `Booking` - 5 edges
9. `register()` - 4 edges
10. `login()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `seed()` --calls--> `hashPassword()`  [EXTRACTED]
  cafe-booking-server/src/db/seed.ts → cafe-booking-server/src/utils/auth.ts
- `AuthProps` --references--> `AuthResponse`  [EXTRACTED]
  cafe-booking-web/src/Auth.tsx → cafe-booking-web/src/types.ts
- `register()` --calls--> `generateToken()`  [EXTRACTED]
  cafe-booking-server/src/controllers/authController.ts → cafe-booking-server/src/utils/auth.ts
- `register()` --calls--> `hashPassword()`  [EXTRACTED]
  cafe-booking-server/src/controllers/authController.ts → cafe-booking-server/src/utils/auth.ts
- `login()` --calls--> `generateToken()`  [EXTRACTED]
  cafe-booking-server/src/controllers/authController.ts → cafe-booking-server/src/utils/auth.ts

## Import Cycles
- None detected.

## Communities (10 total, 0 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.07
Nodes (47): AmbientScene(), AmbientSceneProps, ApiError, cancelBooking(), checkInBooking(), createBooking(), createCafeApi(), deleteCafeApi() (+39 more)

### Community 1 - "types.ts"
Cohesion: 0.10
Nodes (26): db, pgp, cancelBooking(), checkinBooking(), createBooking(), getBookingsByUser(), updateBookingStatus(), getCafeAvailability() (+18 more)

### Community 2 - "authController.ts"
Cohesion: 0.09
Nodes (27): getCurrentUser(), login(), register(), CafeSeed, seed(), users, UserSeed, app (+19 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (28): dependencies, react, react-dom, three, @types/three, devDependencies, @types/react, @types/react-dom (+20 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (26): bcrypt, dependencies, bcrypt, cors, dotenv, express, jsonwebtoken, pg-promise (+18 more)

### Community 5 - "compilerOptions"
Cohesion: 0.08
Nodes (23): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+15 more)

### Community 6 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 7 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, nodemon, ts-node, @types/bcrypt, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+11 more)

## Knowledge Gaps
- **100 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `dependencies`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _100 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07017543859649122 - nodes in this community are weakly interconnected._
- **Should `types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10158730158730159 - nodes in this community are weakly interconnected._
- **Should `authController.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0944741532976827 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._