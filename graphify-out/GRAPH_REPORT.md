# Graph Report - .  (2026-07-23)

## Corpus Check
- 38 files · ~17,661 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 363 nodes · 580 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.82)
- Token cost: 4,245 input · 6,940 output

## Community Hubs (Navigation)
- API Auth and Bookings
- Frontend API and Admin
- Web Runtime Dependencies
- App Routing and Auth
- Product Architecture Docs
- Cafe Storage Management
- Server Runtime Dependencies
- Server TypeScript Config
- Web TypeScript Config
- Server Development Tooling
- Public Workspace UI
- Database Migration Runner
- Local PostgreSQL Docker
- Database Connection
- Admin Bootstrap
- Demo Data Reset
- Server Vercel Config
- Web Entry Shell
- Browser Supabase Client
- Web SPA Rewrites

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `serializeCafe()` - 10 edges
4. `User` - 10 edges
5. `scripts` - 8 edges
6. `CafeSurf` - 8 edges
7. `CafeSurf Setup and Run Instructions` - 8 edges
8. `hourLabel()` - 7 edges
9. `Cafe` - 7 edges
10. `authenticate()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Express Authorization Boundary` --semantically_similar_to--> `Browser Auth Session Boundary`  [INFERRED] [semantically similar]
  README.md → cafe-booking-web/README.md
- `Team-Size Booking` --semantically_similar_to--> `Seat-Based Booking and Pricing`  [INFERRED] [semantically similar]
  cafe-booking-web/README.md → README.md
- `Signed Café Cover Uploads` --semantically_similar_to--> `Café Cover Upload Security`  [INFERRED] [semantically similar]
  README.md → cafe-booking-server/AUTH_SETUP.md
- `Deterministic Abstract Café Covers` --semantically_similar_to--> `Deterministic Abstract Café Covers`  [INFERRED] [semantically similar]
  README.md → cafe-booking-web/README.md
- `Request Authorization` --semantically_similar_to--> `Express Authorization Boundary`  [INFERRED] [semantically similar]
  RUN_INSTRUCTIONS.md → cafe-booking-server/AUTH_SETUP.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Supabase Identity and Express Authorization Boundary** — readme_express_authorization_boundary, run_instructions_request_authorization, cafe_booking_server_auth_setup_express_authorization_boundary, cafe_booking_web_readme_browser_auth_session_boundary [INFERRED 0.95]
- **Seat-Based Booking Capacity Model** — readme_seat_based_booking_pricing, run_instructions_seat_capacity_enforcement, cafe_booking_server_auth_setup_transactional_booking_capacity, cafe_booking_web_readme_team_size_booking [INFERRED 0.95]
- **Secure Café Cover Strategy** — readme_signed_cover_uploads, readme_deterministic_abstract_covers, cafe_booking_server_auth_setup_cafe_cover_upload_security, cafe_booking_web_readme_deterministic_abstract_covers [INFERRED 0.85]

## Communities (23 total, 6 thin omitted)

### Community 0 - "API Auth and Bookings"
Cohesion: 0.07
Nodes (40): supabaseAuth, getCurrentUser(), calculateBookingTotal(), cancelBooking(), checkinBooking(), createBooking(), getBookingsByUser(), hasSeatCapacity() (+32 more)

### Community 1 - "Frontend API and Admin"
Cohesion: 0.08
Nodes (35): AdminOwnerApplicationsProps, ApiError, cancelBooking(), createBooking(), createCafeApi(), createOwnerApplicationApi(), decideOwnerApplicationApi(), deleteCafeApi() (+27 more)

### Community 2 - "Web Runtime Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @fontsource-variable/bricolage-grotesque, @fontsource-variable/dm-sans, react, react-dom, react-router-dom, @supabase/supabase-js, devDependencies (+27 more)

### Community 3 - "App Routing and Auth"
Cohesion: 0.12
Nodes (23): checkInBooking(), fetchAvailability(), fetchCafe(), getCurrentUser(), App(), readIntent(), AuthMode, AuthProps (+15 more)

### Community 4 - "Product Architecture Docs"
Cohesion: 0.08
Nodes (31): Café Cover Upload Security, Customer-Only Public Signup, Express Authorization Boundary, Migration 002 Supabase Auth and Owner Applications, Migration 003 Team Bookings and Café Covers, Owner Application Approval Flow, Supabase Auth and Authorization Setup, Transactional Booking Capacity (+23 more)

### Community 5 - "Cafe Storage Management"
Cohesion: 0.15
Nodes (24): getCafeCoverPublicUrl(), getSupabaseAdmin(), getCafe(), getCafeAvailability(), getCafes(), serializeCafe(), attachCafeCover(), COVER_EXTENSIONS (+16 more)

### Community 6 - "Server Runtime Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, cors, dotenv, express, pg-promise, @supabase/supabase-js, description, @supabase/supabase-js (+15 more)

### Community 7 - "Server TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+15 more)

### Community 8 - "Web TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 9 - "Server Development Tooling"
Cohesion: 0.13
Nodes (15): devDependencies, nodemon, ts-node, @types/cors, @types/express, @types/node, typescript, vitest (+7 more)

### Community 10 - "Public Workspace UI"
Cohesion: 0.23
Nodes (9): fetchCafes(), MotionObjects(), Reveal(), paletteIndex(), cafe, WorkspaceCover(), areas, HomePage() (+1 more)

### Community 11 - "Database Migration Runner"
Cohesion: 0.40
Nodes (3): AppliedMigration, db, pgp

### Community 12 - "Local PostgreSQL Docker"
Cohesion: 0.67
Nodes (3): PostgreSQL Data Volume, PostgreSQL 16 Alpine Service, PostgreSQL Health Check

### Community 17 - "Web Entry Shell"
Cohesion: 0.67
Nodes (3): CafeSurf HTML Shell, Main TSX Module, React Root Mount Element

## Knowledge Gaps
- **120 isolated node(s):** `pgp`, `db`, `target`, `ES2023`, `module` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Server Development Tooling` to `Server Runtime Dependencies`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `serializeCafe()` (e.g. with `getCafes()` and `getMyCafes()`) actually correct?**
  _`serializeCafe()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pgp`, `db`, `target` to the rest of the system?**
  _123 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Auth and Bookings` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Frontend API and Admin` be split into smaller, more focused modules?**
  _Cohesion score 0.0821256038647343 - nodes in this community are weakly interconnected._
- **Should `Web Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `App Routing and Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._