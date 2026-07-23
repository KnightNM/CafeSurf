# Graph Report - .  (2026-07-23)

## Corpus Check
- 2 files · ~27,930 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 478 nodes · 830 edges · 35 communities (29 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

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
- Supabase Browser Client
- SPA Rewrites

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `serializeCafe()` - 14 edges
4. `getSupabaseAdmin()` - 12 edges
5. `sendRevisionError()` - 12 edges
6. `getGooglePlaceDetails()` - 12 edges
7. `withPreview()` - 10 edges
8. `decideCafeRevision()` - 10 edges
9. `authenticate()` - 10 edges
10. `normalizeCafeProfile()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Express Data Access Boundary` --semantically_similar_to--> `Web Data and Authorization Boundary`  [INFERRED] [semantically similar]
  README.md → cafe-booking-web/README.md
- `Backend Environment Configuration` --semantically_similar_to--> `Required Server Environment`  [INFERRED] [semantically similar]
  RUN_INSTRUCTIONS.md → cafe-booking-server/AUTH_SETUP.md
- `Frontend Environment Configuration` --semantically_similar_to--> `Web Environment Configuration`  [INFERRED] [semantically similar]
  RUN_INSTRUCTIONS.md → cafe-booking-web/README.md
- `Database Migration Workflow` --semantically_similar_to--> `Migration 002 Supabase Auth and Owner Applications`  [INFERRED] [semantically similar]
  RUN_INSTRUCTIONS.md → cafe-booking-server/AUTH_SETUP.md
- `Database-Authoritative Roles` --semantically_similar_to--> `Request Authorization Rules`  [INFERRED] [semantically similar]
  RUN_INSTRUCTIONS.md → cafe-booking-server/AUTH_SETUP.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CafeSurf Authentication and Authorization Boundary** — readme_express_data_access_boundary, run_instructions_authenticated_request_flow, cafe_booking_server_auth_setup_request_authorization, cafe_booking_web_readme_data_authorization_boundary [INFERRED 0.95]
- **CafeSurf Owner Promotion Flow** — readme_role_based_user_flows, run_instructions_owner_application_workflow, cafe_booking_server_auth_setup_owner_applications, cafe_booking_server_auth_setup_transactional_owner_approval [INFERRED 0.95]
- **CafeSurf Runtime Configuration** — run_instructions_backend_environment, run_instructions_frontend_environment, cafe_booking_server_auth_setup_server_environment, cafe_booking_web_readme_frontend_environment [INFERRED 0.85]

## Communities (35 total, 6 thin omitted)

### Community 0 - "Server Runtime"
Cohesion: 0.05
Nodes (38): dependencies, cors, dotenv, express, pg-promise, @supabase/supabase-js, description, devDependencies (+30 more)

### Community 1 - "Public Café APIs"
Cohesion: 0.12
Nodes (30): getCafeCoverPublicUrl(), supabaseAuth, getCafe(), getCafeAvailability(), getCafes(), serializeCafe(), attachCafeCover(), COVER_EXTENSIONS (+22 more)

### Community 2 - "Owner Application API"
Cohesion: 0.08
Nodes (32): createOwnerApplication(), decideOwnerApplication(), getMyOwnerApplication(), listOwnerApplications(), optionalText(), requiredText(), sendError(), ApiError (+24 more)

### Community 3 - "Web Dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @fontsource-variable/bricolage-grotesque, @fontsource-variable/dm-sans, react, react-dom, react-router-dom, @supabase/supabase-js, devDependencies (+27 more)

### Community 4 - "Authorization Documentation"
Cohesion: 0.09
Nodes (29): Migration 002 Supabase Auth and Owner Applications, Owner Application Endpoints, Request Authorization Rules, Required Server Environment, Service-Role Key Isolation, Supabase Auth and Authorization Setup, Transactional Owner Approval, Web Authentication Features (+21 more)

### Community 5 - "Admin Owner Review"
Cohesion: 0.08
Nodes (8): AdminOwnerApplicationsProps, ApiError, decideOwnerApplicationApi(), fetchOwnerApplications(), uploadCafeCoverApi(), mocks, OwnerApplication, OwnerApplicationStatus

### Community 6 - "Auth and Home Summary"
Cohesion: 0.10
Nodes (19): getCurrentUser(), getHomeSummary(), getPublicSummary(), PublicWorkspaceSummary, app, PORT, authenticate(), Express (+11 more)

### Community 7 - "Server TypeScript Config"
Cohesion: 0.08
Nodes (24): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noFallthroughCasesInSwitch (+16 more)

### Community 8 - "Café Revision Workflow"
Cohesion: 0.26
Nodes (21): getSupabaseAdmin(), attachRevisionCover(), createCafeRevision(), createRevisionCoverUploadUrl(), decideCafeRevision(), deleteRevisionCover(), getAuthorizedRevision(), getCafeRevision() (+13 more)

### Community 9 - "Web TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+14 more)

### Community 10 - "Café Profile Models"
Cohesion: 0.14
Nodes (15): AMENITY_LABELS, DAYS, Booking, BookingStatus, BookingWithCafe, CAFE_AMENITIES, CafeAmenity, CafeBooking (+7 more)

### Community 11 - "Google Places API"
Cohesion: 0.20
Nodes (15): autocompletePlaces(), cafePlaceDetails(), sendGooglePlacesError(), GooglePlaceDetails, GooglePlaceSuggestion, AUTOCOMPLETE_FIELD_MASK, autocompleteGooglePlaces(), AutocompleteResponse (+7 more)

### Community 12 - "Customer Booking Client"
Cohesion: 0.20
Nodes (9): cancelBooking(), checkInBooking(), createBooking(), fetchMyBookings(), hourLabel(), largestContiguousBlock(), todayString(), BookingsPage() (+1 more)

### Community 13 - "App Routing and Sessions"
Cohesion: 0.18
Nodes (7): getCurrentUser(), App(), readIntent(), CafeOwnerDashboard(), CafeOwnerDashboardProps, profileFromCafe(), HashScrollManager()

### Community 14 - "Public Navigation"
Cohesion: 0.24
Nodes (10): fetchAvailability(), fetchCafe(), fetchCafeGooglePlace(), PublicHeaderProps, SpacePage(), SpacePageProps, AvailabilitySlot, BookingIntent (+2 more)

### Community 15 - "Booking Lifecycle"
Cohesion: 0.33
Nodes (9): calculateBookingTotal(), cancelBooking(), checkinBooking(), createBooking(), getBookingsByUser(), hasSeatCapacity(), normalizeTeamSize(), updateBookingStatus() (+1 more)

### Community 16 - "Data-Driven Homepage"
Cohesion: 0.29
Nodes (8): fetchCafes(), fetchHomeSummary(), content(), MotionObjects(), ScrollChapter(), areas, HomePage(), HomeSummary

### Community 17 - "Admin Café Review"
Cohesion: 0.29
Nodes (7): AdminCafeRevisions(), display(), LABELS, decideCafeRevisionApi(), fetchAdminCafeRevisions(), CafeRevision, CafeRevisionStatus

### Community 18 - "Owner Application UI"
Cohesion: 0.29
Nodes (6): createOwnerApplicationApi(), fetchMyOwnerApplication(), EMPTY_FORM, OwnerApplicationViewProps, CreateOwnerApplicationRequest, UserRole

### Community 19 - "Google Place Search"
Cohesion: 0.53
Nodes (5): autocompleteGooglePlaces(), GooglePlaceAutocomplete(), GooglePlaceAutocompleteProps, newSessionToken(), GooglePlaceSuggestion

### Community 20 - "Authentication UI"
Cohesion: 0.40
Nodes (3): AuthMode, AuthProps, Brand()

### Community 21 - "Workspace Covers"
Cohesion: 0.40
Nodes (4): paletteIndex(), cafe, WorkspaceCover(), Cafe

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
- **137 isolated node(s):** `pgp`, `db`, `target`, `useDefineForClassFields`, `DOM` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `authenticate()` connect `Auth and Home Summary` to `Public Café APIs`, `Owner Application API`, `Café Revision Workflow`, `Google Places API`, `Booking Lifecycle`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `authorize()` connect `Café Revision Workflow` to `Public Café APIs`, `Owner Application API`, `Auth and Home Summary`, `Google Places API`, `Booking Lifecycle`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `serializeCafe()` (e.g. with `getCafes()` and `getMyCafes()`) actually correct?**
  _`serializeCafe()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `pgp`, `db`, `target` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Server Runtime` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Public Café APIs` be split into smaller, more focused modules?**
  _Cohesion score 0.1214574898785425 - nodes in this community are weakly interconnected._
- **Should `Owner Application API` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._