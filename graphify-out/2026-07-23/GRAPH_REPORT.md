# Graph Report - CAFE_Booking_Main  (2026-07-23)

## Corpus Check
- 82 files · ~28,644 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 524 nodes · 959 edges · 52 communities (24 shown, 28 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03a6d6ab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Server Runtime
- Public Café APIs
- Owner Application API
- Web Dependencies
- Authorization Documentation
- Admin Owner Review
- Auth and Home Summary
- Server TypeScript Config
- Café Revision Workflow
- Web TypeScript Config
- Café Profile Models
- Google Places API
- Customer Booking Client
- App Routing and Sessions
- Public Navigation
- Booking Lifecycle
- Data-Driven Homepage
- Admin Café Review
- Owner Application UI
- Google Place Search
- Authentication UI
- Workspace Covers
- Database Migrations
- Local PostgreSQL
- Database Connection
- Admin Bootstrap
- Demo Data Reset
- Serverless Web Config
- Web Entry Shell
- Network Utilities
- Reveal Motion
- Supabase Browser Client
- SPA Rewrites
- Web Environment Configuration
- Complete Run Instructions Reference
- Authentication Setup Notes
- Express Data Access Boundary
- Role-Based User Flows
- Run Instructions
- Authenticated Request Flow
- Backend Environment Configuration
- Bootstrap First Administrator
- CafeSurf Setup and Run Instructions
- Database-Authoritative Roles
- Database Migration Workflow
- Frontend Environment Configuration
- Owner Application Workflow
- Production Deployment Checklist
- Resend SMTP Configuration
- Supabase Auth Configuration

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `CafeSurf setup and run instructions` - 15 edges
4. `serializeCafe()` - 14 edges
5. `getSupabaseAdmin()` - 13 edges
6. `sendRevisionError()` - 12 edges
7. `getGooglePlaceDetails()` - 12 edges
8. `Supabase Auth and authorization setup` - 11 edges
9. `db` - 10 edges
10. `withPreview()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `attachCafeCover()` --calls--> `getSupabaseAdmin()`  [EXTRACTED]
  cafe-booking-server/src/controllers/cafeManagementController.ts → cafe-booking-server/src/config/supabase.ts
- `createCafeCoverUploadUrl()` --calls--> `getSupabaseAdmin()`  [EXTRACTED]
  cafe-booking-server/src/controllers/cafeManagementController.ts → cafe-booking-server/src/config/supabase.ts
- `deleteCafeCover()` --calls--> `getSupabaseAdmin()`  [EXTRACTED]
  cafe-booking-server/src/controllers/cafeManagementController.ts → cafe-booking-server/src/config/supabase.ts
- `permanentlyDeleteCafe()` --calls--> `getSupabaseAdmin()`  [EXTRACTED]
  cafe-booking-server/src/controllers/cafeManagementController.ts → cafe-booking-server/src/config/supabase.ts
- `getMyCafes()` --indirect_call--> `serializeCafe()`  [INFERRED]
  cafe-booking-server/src/controllers/cafeManagementController.ts → cafe-booking-server/src/controllers/cafeController.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CafeSurf Authentication and Authorization Boundary** — readme_express_data_access_boundary, run_instructions_authenticated_request_flow, cafe_booking_server_auth_setup_request_authorization, cafe_booking_web_readme_data_authorization_boundary [INFERRED 0.95]
- **CafeSurf Owner Promotion Flow** — readme_role_based_user_flows, run_instructions_owner_application_workflow, cafe_booking_server_auth_setup_owner_applications, cafe_booking_server_auth_setup_transactional_owner_approval [INFERRED 0.95]
- **CafeSurf Runtime Configuration** — run_instructions_backend_environment, run_instructions_frontend_environment, cafe_booking_server_auth_setup_server_environment, cafe_booking_web_readme_frontend_environment [INFERRED 0.85]

## Communities (52 total, 28 thin omitted)

### Community 0 - "Server Runtime"
Cohesion: 0.05
Nodes (38): dependencies, cors, dotenv, express, pg-promise, @supabase/supabase-js, description, devDependencies (+30 more)

### Community 1 - "Public Café APIs"
Cohesion: 0.09
Nodes (42): getCafeCoverPublicUrl(), supabaseAuth, getCafe(), getCafeAvailability(), getCafes(), serializeCafe(), attachCafeCover(), COVER_EXTENSIONS (+34 more)

### Community 2 - "Owner Application API"
Cohesion: 0.11
Nodes (25): calculateBookingTotal(), cancelBooking(), checkinBooking(), createBooking(), getBookingsByUser(), hasSeatCapacity(), normalizeTeamSize(), updateBookingStatus() (+17 more)

### Community 3 - "Web Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @fontsource-variable/bricolage-grotesque, @fontsource-variable/dm-sans, react, react-dom, react-router-dom, @supabase/supabase-js, devDependencies (+27 more)

### Community 4 - "Authorization Documentation"
Cohesion: 0.08
Nodes (22): Administrator permanent-delete veto, Café cover uploads, Café profile approval, Database migration, First administrator, Owner applications, Request authorization, Required server environment (+14 more)

### Community 5 - "Admin Owner Review"
Cohesion: 0.13
Nodes (21): ApiError, createCafeApi(), createCafeRevisionApi(), deleteCafeApi(), deleteCafeCoverApi(), fetchCafeBookings(), fetchMyCafeRevisions(), fetchMyCafes() (+13 more)

### Community 6 - "Auth and Home Summary"
Cohesion: 0.06
Nodes (43): db, pgp, getCurrentUser(), getHomeSummary(), getPublicSummary(), PublicWorkspaceSummary, createOwnerApplication(), decideOwnerApplication() (+35 more)

### Community 7 - "Server TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+16 more)

### Community 8 - "Café Revision Workflow"
Cohesion: 0.28
Nodes (21): getSupabaseAdmin(), attachRevisionCover(), createCafeRevision(), createRevisionCoverUploadUrl(), decideCafeRevision(), deleteRevisionCover(), getAuthorizedRevision(), getCafeRevision() (+13 more)

### Community 9 - "Web TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 10 - "Café Profile Models"
Cohesion: 0.15
Nodes (15): AMENITY_LABELS, DAYS, Booking, BookingStatus, BookingWithCafe, CAFE_AMENITIES, CafeAmenity, CafeBooking (+7 more)

### Community 11 - "Google Places API"
Cohesion: 0.09
Nodes (22): 10. How authentication and roles work, 11. Verify the complete flow, 12. Test and build, 13. Production deployment, 1. Prerequisites, 2. Create local environment files, 3. Configure Supabase Auth, 4. Configure Resend SMTP (+14 more)

### Community 12 - "Customer Booking Client"
Cohesion: 0.28
Nodes (6): cancelBooking(), checkInBooking(), createBooking(), fetchMyBookings(), BookingsPage(), upcoming()

### Community 13 - "App Routing and Sessions"
Cohesion: 0.29
Nodes (5): AdminOwnerApplicationsProps, decideOwnerApplicationApi(), fetchOwnerApplications(), OwnerApplication, OwnerApplicationStatus

### Community 14 - "Public Navigation"
Cohesion: 0.21
Nodes (13): fetchAvailability(), fetchCafe(), fetchCafeGooglePlace(), paletteIndex(), cafe, WorkspaceCover(), todayString(), SpacePage() (+5 more)

### Community 16 - "Data-Driven Homepage"
Cohesion: 0.09
Nodes (24): fetchCafes(), fetchHomeSummary(), getCurrentUser(), App(), readIntent(), AuthMode, AuthProps, Brand() (+16 more)

### Community 17 - "Admin Café Review"
Cohesion: 0.29
Nodes (7): AdminCafeRevisions(), display(), LABELS, decideCafeRevisionApi(), fetchAdminCafeRevisions(), CafeRevision, CafeRevisionStatus

### Community 18 - "Owner Application UI"
Cohesion: 0.29
Nodes (6): createOwnerApplicationApi(), fetchMyOwnerApplication(), EMPTY_FORM, OwnerApplicationViewProps, CreateOwnerApplicationRequest, UserRole

### Community 19 - "Google Place Search"
Cohesion: 0.53
Nodes (5): autocompleteGooglePlaces(), GooglePlaceAutocomplete(), GooglePlaceAutocompleteProps, newSessionToken(), GooglePlaceSuggestion

### Community 22 - "Database Migrations"
Cohesion: 0.40
Nodes (3): AppliedMigration, db, pgp

### Community 23 - "Local PostgreSQL"
Cohesion: 0.67
Nodes (3): PostgreSQL Data Volume, PostgreSQL 16 Alpine Service, PostgreSQL Health Check

### Community 28 - "Web Entry Shell"
Cohesion: 0.67
Nodes (3): CafeSurf HTML Shell, Main TSX Module, React Root Mount Element

## Knowledge Gaps
- **182 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CafeSurf setup and run instructions` connect `Google Places API` to `Authorization Documentation`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `db` connect `Auth and Home Summary` to `Café Revision Workflow`, `Public Café APIs`, `Owner Application API`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `serializeCafe()` (e.g. with `getCafes()` and `getMyCafes()`) actually correct?**
  _`serializeCafe()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Public Café APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.08665269042627533 - nodes in this community are weakly interconnected._
- **Should `Owner Application API` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._