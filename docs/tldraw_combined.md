

# ==========================================
# FILE: CONTEXT.md
# ==========================================

# CONTEXT.md - tldraw monorepo

This file provides comprehensive context for understanding the tldraw monorepo, an infinite canvas SDK for React applications and the infrastructure behind tldraw.com.

## Repository overview

This is a TypeScript monorepo containing the complete tldraw ecosystem - from the core infinite canvas SDK to the collaborative whiteboard application tldraw.com. It's organized using Yarn Berry workspaces and built with a custom incremental build system called LazyRepo.

**Repository purpose:** Develop and maintain tldraw as both an open-source SDK for developers and a commercial collaborative whiteboard service.

**Version:** 3.15.1 across all packages  
**Node.js:** ^20.0.0 required  
**React:** ^18.0.0 || ^19.0.0 peer dependency

## Essential commands

### Development commands

- `yarn dev` - Start development server for examples app (main SDK showcase)
- `yarn dev-app` - Start tldraw.com client app development
- `yarn dev-docs` - Start documentation site development (tldraw.dev)
- `yarn dev-vscode` - Start VSCode extension development
- `yarn dev-template <template>` - Run a specific template (e.g., vite, nextjs, workflow)
- `yarn refresh-assets` - Refresh and bundle assets after changes
- `yarn refresh-context` - Review and update CONTEXT.md files using Claude Code CLI
- `yarn context` - Find and display nearest CONTEXT.md file (supports -v, -r, -u flags)

### Building

- `yarn build` - Build all packages using LazyRepo (incremental build system)
- `yarn build-package` - Build all SDK packages only
- `yarn build-app` - Build tldraw.com client app
- `yarn build-docs` - Build documentation site

### Testing

- `yarn test run` - Run tests in specific workspace (cd to workspace first)
- `yarn test run --grep "pattern"` - Filter tests by pattern
- `yarn vitest` - Run all tests (slow, avoid unless necessary)
- `yarn test-ci` - Run tests in CI mode
- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-dotcom` - Run end-to-end tests for tldraw.com
- `yarn e2e-ui` - Run E2E tests with Playwright UI

### Code quality

- `yarn lint` - Lint all packages
- `yarn typecheck` - Type check all packages (run before commits)
- `yarn format` - Format code with Prettier
- `yarn api-check` - Validate public API consistency

## High-level architecture

### Monorepo structure

**Packages (`packages/`)** - Core SDK and libraries:

- `@tldraw/editor` - Foundational canvas editor engine without shapes or UI
- `@tldraw/tldraw` - Complete "batteries included" SDK with UI, shapes, and tools
- `@tldraw/store` - Reactive client-side database built on signals
- `@tldraw/state` - Fine-grained reactive state management (signals system)
- `@tldraw/tlschema` - Type definitions, validators, and migrations
- `@tldraw/sync` + `@tldraw/sync-core` - Multiplayer collaboration system
- `@tldraw/utils` - Shared utilities across packages
- `@tldraw/validate` - Lightweight validation library
- `@tldraw/create-tldraw` - npm create tldraw CLI tool
- `@tldraw/dotcom-shared` - Shared utilities for dotcom application
- `@tldraw/namespaced-tldraw` - Namespaced tldraw components
- `@tldraw/state-react` - React integration for state management
- `@tldraw/worker-shared` - Shared utilities for Cloudflare Workers

**Applications (`apps/`)** - Production applications and examples:

- `apps/examples/` - SDK examples and demos (primary development environment, 130+ examples)
- `apps/docs/` - Documentation website (tldraw.dev) built with Next.js
- `apps/dotcom/client/` - tldraw.com React frontend application with auth, file management
- `apps/dotcom/sync-worker/` - Cloudflare Worker handling multiplayer backend and real-time sync
- `apps/dotcom/asset-upload-worker/` - Cloudflare Worker for media uploads to R2
- `apps/dotcom/image-resize-worker/` - Cloudflare Worker for image optimization
- `apps/dotcom/zero-cache/` - Database synchronization layer using Rocicorp Zero
- `apps/vscode/` - tldraw VSCode extension for .tldr files
- `apps/analytics/` - Analytics service (UMD library for cookie consent and tracking)
- `apps/bemo-worker/` - Bemo worker service for collaboration and asset management

**Templates (`templates/`)** - Framework starter templates:

- `vite/` - Vite integration example (fastest way to get started)
- `nextjs/` - Next.js integration example with SSR support
- `vue/` - Vue integration example
- `sync-cloudflare/` - Multiplayer implementation with Cloudflare Durable Objects
- `ai/` - AI integration example
- `branching-chat/` - AI-powered conversational UI with node-based chat trees
- `workflow/` - Node-based visual programming interface for executable workflows
- `chat/`, `agent/`, `simple-server-example/` - Additional use case examples

### Core SDK architecture

**Three-layer system:**

1. **@tldraw/editor** - Pure canvas engine
   - No shapes, tools, or UI - just the reactive editor foundation
   - Shape system via ShapeUtil classes, Tools via StateNode state machines
   - Bindings system for relationships between shapes
   - Uses @tldraw/state for reactive state management

2. **@tldraw/tldraw** - Complete SDK
   - Wraps editor with full UI system, shape implementations, and tools
   - Default shapes: text, draw, geo, arrow, note, line, frame, highlight, etc.
   - Complete tool set: select, hand, eraser, laser, zoom + shape creation tools
   - Responsive UI with mobile/desktop adaptations

3. **@tldraw/store** - Reactive data layer
   - Type-safe record storage with automatic validation
   - Change history and undo/redo support
   - IndexedDB persistence and migration system
   - Built on @tldraw/state reactive signals

### Reactive state management

**@tldraw/state - Signals architecture:**

- Fine-grained reactivity similar to MobX or SolidJS
- `Atom<T>` for mutable state, `Computed<T>` for derived values
- Automatic dependency tracking during computation
- Efficient updates with minimal re-computation
- Memory-optimized with `ArraySet` and cleanup systems

**Pattern throughout codebase:**

- All editor state is reactive and observable
- Components automatically re-render when dependencies change
- Store changes trigger reactive updates across the system
- Batched updates prevent cascading re-computations

### Shape and tool system

**Shape architecture:**

- Each shape type has a `ShapeUtil` class defining behavior
- ShapeUtil handles geometry calculation, rendering, hit testing, interactions
- Extensible system - custom shapes via new ShapeUtil implementations
- Shape definitions in `@tldraw/tlschema` with validators and migrations

**Tool state machines:**

- Tools implemented as `StateNode` hierarchies with parent/child states
- Event-driven architecture (pointer, keyboard, tick events)
- Complex tools like SelectTool have multiple child states (Brushing, Translating, etc.)
- State machines handle tool lifecycle and user interactions

**Bindings system:**

- Relationships between shapes (arrows connecting to shapes, etc.)
- `BindingUtil` classes define binding behavior and visual indicators
- Automatic updates when connected shapes change position/properties

## Testing patterns

### Vitest tests

**Unit tests:**

- Test files named `*.test.ts` alongside source files (e.g., `LicenseManager.test.ts`)
- Integration tests use `src/test/feature-name.test.ts` format
- Test in tldraw workspace if you need default shapes/tools

**Running tests:**

- Run from specific workspace directory: `cd packages/editor && yarn test run`
- Filter with additional args: `yarn test run --grep "selection"`
- Avoid root-level `yarn test` (slow and hard to filter)

### Playwright E2E tests

- Located in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`
- Use `yarn e2e` and `yarn e2e-dotcom` commands
- Comprehensive UI interaction testing

## Development workspace structure

```
apps/
├── examples/          # SDK examples and demos (primary development environment)
├── docs/             # Documentation site (tldraw.dev) built with Next.js + SQLite + Algolia
├── dotcom/           # tldraw.com application stack
│   ├── client/       # Frontend React app with Clerk auth
│   ├── sync-worker/  # Cloudflare Worker for multiplayer backend + file management
│   ├── asset-upload-worker/  # Cloudflare Worker for media uploads to R2
│   ├── image-resize-worker/  # Cloudflare Worker for image optimization + format conversion
│   └── zero-cache/   # Future database synchronization layer (Rocicorp Zero + PostgreSQL)
├── vscode/           # tldraw VSCode extension (.tldr file support)
├── analytics/        # Analytics service (UMD library with GDPR compliance)
└── bemo-worker/      # Bemo worker service (collaboration + asset management)

packages/
├── editor/           # Core editor engine (foundational canvas editor)
├── tldraw/           # Complete SDK with UI ("batteries included")
├── store/            # Reactive client-side database built on signals
├── tlschema/         # Type definitions, validators, and migrations
├── state/            # Fine-grained reactive state management (signals system)
├── sync/             # Multiplayer collaboration system
├── sync-core/        # Core multiplayer functionality
├── utils/            # Shared utilities across packages
├── validate/         # Lightweight validation library
├── assets/           # Icons, fonts, translations (managed centrally)
├── create-tldraw/    # npm create tldraw CLI tool
├── dotcom-shared/    # Shared utilities for dotcom application
├── namespaced-tldraw/ # Namespaced tldraw components
├── state-react/      # React integration for state management
└── worker-shared/    # Shared utilities for Cloudflare Workers

templates/            # Starter templates for different frameworks
├── vite/            # Vite integration example (fastest way to start)
├── nextjs/          # Next.js integration example with SSR
├── vue/             # Vue integration example
├── sync-cloudflare/ # Multiplayer implementation with Cloudflare Durable Objects
├── ai/              # AI integration example
├── branching-chat/  # AI-powered conversational UI with node-based chat trees
├── workflow/        # Node-based visual programming interface for workflows
├── chat/            # Chat template
├── agent/           # Agent template
└── simple-server-example/ # Simple server example

internal/             # Internal development tools and configuration
├── apps-script/     # Google Apps Script configuration for Meet integration
├── config/          # Shared TypeScript, API, and test configurations
├── dev-tools/       # Git bisect helper tool for debugging
├── health-worker/   # Updown.io webhook → Discord alert forwarding
└── scripts/         # Build, deployment, and maintenance automation
```

## Development infrastructure

### Build system (LazyRepo)

Custom incremental build system optimized for monorepos:

- Builds only packages that changed based on file inputs/outputs
- Automatic dependency resolution between workspaces
- Intelligent caching with cache invalidation
- Parallel execution where dependencies allow
- Configuration in `lazy.config.ts`

### Package management

**Yarn Berry (v4) with workspaces:**

- Workspace dependencies automatically linked
- Package manager enforced via `packageManager` field
- Efficient disk usage with Plug'n'Play
- Lock file and cache committed to repository

### Code quality

**TypeScript configuration:**

- Workspace references for incremental compilation
- API surface validation with Microsoft API Extractor
- Strict type checking across all packages
- Generated API documentation from TSDoc comments

**Linting and formatting:**

- ESLint with custom configuration in `eslint.config.mjs`
- Prettier for consistent code formatting
- Pre-commit hooks via Husky ensuring quality

## Key development notes

### TypeScript workflow

- Uses workspace references for fast incremental compilation
- Run `yarn typecheck` before commits (critical for API consistency)
- API surface validated with Microsoft API Extractor
- Strict type checking across all packages

### Monorepo management

- Yarn workspaces with berry (yarn 4.x) - use `yarn` not `npm`
- Package manager enforced via `packageManager` field in package.json
- Dependencies managed at workspace level where possible
- Efficient disk usage with Plug'n'Play system

### Asset management workflow

- Icons, fonts, translations stored in `/assets` directory
- Run `yarn refresh-assets` after making asset changes
- Assets automatically bundled into packages during build process
- Shared across packages and applications with optimization

### Primary development environment

- Main development happens in `apps/examples` - the SDK showcase
- Examples demonstrate SDK capabilities and serve as development testbed
- See `apps/examples/writing-examples.md` for example guidelines
- Use examples app to test SDK changes in real scenarios

## Asset and content management

### Asset pipeline

**Static assets (`/assets`):**

- Automatic optimization and format conversion
- Deduplication and efficient bundling

**Dynamic assets:**

- Image/video upload handling in Cloudflare Workers
- Asset validation, resizing, and optimization
- Hash-based deduplication and caching
- Support for various formats and size constraints

### External content integration

**Rich content handling:**

- Bookmark creation with metadata extraction
- Embed system for YouTube, Figma, Excalidraw, etc.
- SVG import with size calculation and optimization
- Copy/paste between tldraw instances with format preservation

## Collaboration and sync

### Multiplayer architecture

**@tldraw/sync system:**

- WebSocket-based real-time collaboration
- Conflict-free updates with operational transformation
- Presence awareness (cursors, selections) separate from document state
- Cloudflare Durable Objects for scalable backend

**Data synchronization:**

- Document state synced via structured diffs
- Presence state (cursors, etc.) synced but not persisted
- Connection state management with reconnection logic
- See `templates/sync-cloudflare` for implementation patterns

### tldraw.com infrastructure

**Production application stack:**

- **Frontend**: React SPA with Vite, Clerk auth, React Router, FormatJS i18n
- **Real-time Sync**: Cloudflare Workers + Durable Objects for multiplayer collaboration
- **Database**: PostgreSQL with Zero (Rocicorp) for optimistic client-server sync
- **Asset Pipeline**: R2 storage + image optimization + CDN delivery
- **Authentication**: Clerk integration with JWT-based API access
- **File Management**: Complete file system with sharing, publishing, version history

## Development patterns

### Creating custom components

**Custom shapes:**

1. Define shape type in schema with validator
2. Create `ShapeUtil` class extending base ShapeUtil
3. Implement required methods (getGeometry, component, indicator)
4. Register in editor via `shapeUtils` prop
5. Implement creation tool if needed

**Custom tools:**

1. Create `StateNode` class with tool logic
2. Define state machine with onEnter/onExit/event handlers (onPointerDown, etc.)
3. Handle state transitions and editor updates
4. Register in editor via `tools` prop

### UI customization

**Component override system:**

- Every tldraw UI component can be replaced/customized
- Pass custom implementations via `components` prop
- Maintains responsive behavior and accessibility
- See existing components for architectural patterns

### Integration patterns

**Embedding in applications:**

- Import required CSS: `import 'tldraw/tldraw.css'` (full) or `import '@tldraw/editor/editor.css'` (editor only)
- Requires React 18+ and modern bundler support
- Works with Vite, Next.js, Create React App, and other React frameworks
- See templates directory for framework-specific examples
- Asset URLs configurable via `@tldraw/assets` package (imports, URLs, or self-hosted strategies)
- Use `npm create tldraw` CLI for quick project scaffolding

## Performance considerations

### Rendering optimization

**Canvas performance:**

- WebGL-accelerated minimap rendering
- Viewport culling - only visible shapes rendered
- Shape geometry caching with invalidation
- Efficient hit testing and bounds calculation

**Reactive system optimization:**

- Signals minimize unnecessary re-renders via precise dependency tracking
- Computed values cached until dependencies change
- Store changes batched to prevent cascading updates
- Component re-renders minimized through React.memo and signal integration
- Uses `__unsafe__getWithoutCapture()` for performance-critical paths

### Memory management

**Efficient resource usage:**

- Automatic cleanup of event listeners and signal dependencies
- Asset deduplication reduces memory footprint
- Store history pruning prevents unbounded growth
- Shape utility garbage collection when unused

## Licensing and business model

**SDK licensing:**

- Open source with "Made with tldraw" watermark by default
- Business license available for watermark removal
- Separate commercial terms for tldraw.com service

**Development philosophy:**

- SDK-first development - tldraw.com built using the same APIs
- Extensive examples and documentation for SDK adoption
- Community-driven with transparent development process

## Advanced features and integrations

### Asset management

**Centralized assets (`@tldraw/assets`):**

- **Icon system**: 80+ icons in optimized SVG sprite format
- **Typography**: IBM Plex fonts (Sans, Serif, Mono) + Shantell Sans (handwritten)
- **Internationalization**: 40+ languages with regional variants (RTL support)
- **Embed icons**: Service icons for external content (YouTube, Figma, etc.)
- **Export strategies**: Multiple formats (imports, URLs, self-hosted) for different bundlers

**Dynamic asset pipeline:**

- **Upload workers**: Cloudflare R2 + image optimization + format conversion (AVIF/WebP)
- **CDN delivery**: Global asset distribution with intelligent caching
- **External content**: Bookmark unfurling, embed metadata extraction
- **Deduplication**: Hash-based asset deduplication across uploads

### Collaboration features

**Real-time multiplayer:**

- **Presence system**: Live cursors, selections, and user awareness indicators
- **Conflict resolution**: Operational transformation for concurrent edits
- **Connection reliability**: Automatic reconnection with exponential backoff
- **Permission management**: File-level access control (view/edit/owner)

**Data synchronization:**

- **Optimistic updates**: Immediate UI feedback with server reconciliation
- **Offline support**: Queue changes during network issues, sync on reconnect
- **Version control**: Complete change history with restore capability
- **Schema migration**: Automatic data migration for schema evolution

### Extension and customization

**Developer tools:**

- **CLI scaffolding**: `npm create tldraw` with interactive template selection
- **VSCode integration**: Full editor for .tldr files with webview-based rendering
- **Testing utilities**: TestEditor, comprehensive E2E test suites
- **Performance monitoring**: Built-in performance tracking and analysis

**Extension points:**

- **Custom shapes**: ShapeUtil classes for new shape types
- **Custom tools**: StateNode state machines for interactive tools
- **Custom bindings**: BindingUtil classes for shape relationships
- **Custom UI**: Complete component override system
- **External content**: Handlers for custom import/export formats

## Technical deep dive

### Reactive architecture details

**Signals system (`@tldraw/state`):**

- **Atom/Computed pattern**: Mutable atoms + derived computed values
- **Dependency tracking**: Automatic capture of signal dependencies during computation
- **Memory optimization**: ArraySet hybrid data structure, WeakCache for object-keyed caches
- **Effect scheduling**: Pluggable scheduling (immediate vs animation frame throttled)
- **Transaction support**: Atomic multi-state updates with rollback capability

**Store system (`@tldraw/store`):**

- **Record management**: Type-safe record storage with validation and migrations
- **Query system**: Reactive indexes with incremental updates
- **Side effects**: Lifecycle hooks for create/update/delete operations
- **History tracking**: Change diffs with configurable history length
- **Schema evolution**: Version-based migration system with dependencies

### Database and persistence

**Client-side storage:**

- **IndexedDB**: Local persistence with automatic migrations
- **Store snapshots**: Complete document state serialization
- **Asset caching**: Local asset storage with deduplication
- **User preferences**: Settings persistence across sessions

**Server-side infrastructure:**

- **PostgreSQL**: Source of truth for user data, files, metadata
- **R2 object storage**: Durable asset storage with global replication
- **Durable Objects**: Stateful compute for room management and real-time sync
- **Zero sync**: Optimistic synchronization with conflict resolution

## Development workflow best practices

### Getting started

1. **Clone and setup**: `git clone` → `yarn install`
2. **Start development**: `yarn dev` (examples app at localhost:5420)
3. **Run tests**: `cd packages/editor && yarn test run` for specific packages
4. **Check types**: `yarn typecheck` before commits
5. **Follow patterns**: Read relevant CONTEXT.md files and existing code

### Creating examples

- **Location**: `apps/examples/src/examples/your-example/`
- **Structure**: README.md with frontmatter + YourExample.tsx component
- **Guidelines**: See `apps/examples/writing-examples.md` for detailed patterns
- **Categories**: getting-started, configuration, editor-api, shapes/tools, etc.

### Package development

- **Testing**: Run tests from package directory, not root
- **API changes**: Run `yarn api-check` to validate public API surface
- **Dependencies**: Check existing usage before adding new libraries
- **Documentation**: API docs auto-generated from TSDoc comments

### Performance guidelines

- **Use signals**: Leverage reactive system for automatic optimization
- **Batch updates**: Use transactions for multiple state changes
- **Memory management**: Dispose of effects and subscriptions properly
- **Asset optimization**: Use appropriate asset export strategy for your bundler

This context file provides the essential architectural understanding needed to navigate and contribute to the tldraw codebase effectively.


# ==========================================
# FILE: apps/analytics-worker/CONTEXT.md
# ==========================================

# Analytics worker

A Cloudflare Worker that determines whether users require explicit cookie consent based on their geographic location.

## Purpose

This worker supports the tldraw analytics system by providing geographic consent checking. It helps ensure compliance with privacy regulations like GDPR, UK PECR, FADP, and LGPD by identifying users in regions that require explicit opt-in for tracking.

The worker is deployed to `tldraw-consent.workers.dev` and is called by the analytics app (`apps/analytics/`) during initialization.

## How it works

1. Receives GET request from analytics client
2. Reads user's country code from CloudFlare's `CF-IPCountry` header
3. Checks if country requires explicit consent
4. Returns JSON response indicating whether consent is required
5. Includes CORS headers for allowed tldraw origins

## API

**Endpoint**: `https://tldraw-consent.workers.dev` (or environment-specific variants)

**Method**: `GET`

**Response**:

```json
{
  "requires_consent": boolean,
  "country_code": string | null
}
```

**Caching**: Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`)

## Geographic consent rules

Users in the following countries/regions require explicit consent:

**EU Member States (GDPR)**:

- Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden

**EEA/EFTA (GDPR)**:

- Iceland, Liechtenstein, Norway

**Other regions**:

- United Kingdom (UK PECR)
- Switzerland (FADP)
- Brazil (LGPD)

**Default behavior**: If country code cannot be determined, the worker defaults to requiring consent (conservative approach for privacy compliance).

## CORS configuration

The worker allows cross-origin requests from:

- `http://localhost:3000` - Local development
- `http://localhost:5420` - Local development
- `https://meet.google.com` - Google Meet integration
- `*.tldraw.com` - Production domains
- `*.tldraw.dev` - Development domains
- `*.tldraw.club` - Alternative domains
- `*.tldraw.xyz` - Alternative domains
- `*.tldraw.workers.dev` - Worker preview domains
- `*-tldraw.vercel.app` - Vercel preview deployments

## Development

### Running locally

```bash
yarn dev              # Start local development server
```

### Testing

```bash
yarn test             # Run tests
yarn test-ci          # Run tests in CI mode
```

### Deployment

The worker is deployed via GitHub Actions (`.github/workflows/deploy-analytics.yml`) which runs `internal/scripts/deploy-analytics.ts`.

**Environments**:

- **dev**: `tldraw-consent-dev` (for testing)
- **staging**: `tldraw-consent-staging` (deployed on push to `main`)
- **production**: `tldraw-consent` (deployed on push to `production`)

## File structure

- `src/worker.ts` - Main worker code
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Package configuration and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

## Integration

This worker is called by the analytics app during initialization:

1. Analytics app loads in user's browser
2. If no existing consent preference is stored
3. App calls this worker to check if consent is required
4. Based on response, app either:
   - Shows consent banner (requires_consent: true)
   - Assumes implicit consent (requires_consent: false)

See `apps/analytics/src/utils/consent-check.ts` for the client-side integration.

## Dependencies

- `@cloudflare/workers-types` - TypeScript types for Cloudflare Workers
- `wrangler` - Cloudflare Workers CLI tool

## Notes

- This is a standalone worker (not part of the analytics app bundle)
- Uses CloudFlare's edge network for low-latency responses worldwide
- Conservative default (require consent) ensures compliance even if geo-detection fails
- CORS preflight requests are handled with 24-hour cache
- Responses are cached to reduce load and improve performance


# ==========================================
# FILE: apps/analytics/CONTEXT.md
# ==========================================

# Analytics app

A unified analytics library for tldraw.com that integrates multiple analytics services with cookie consent management.

## Purpose

This package provides a single, consolidated analytics interface that:

- Integrates multiple analytics providers (PostHog, Google Analytics 4, HubSpot, Reo)
- Manages cookie consent with a UI banner and privacy settings dialog
- Exposes a unified API for tracking events, page views, and user identification
- Ensures analytics only run when users have opted in

The analytics script is built as a standalone JavaScript bundle that can be included in any tldraw web application.

## Architecture

### Core components

**Analytics class** (`src/index.ts`)

- Main entry point that orchestrates all analytics services
- Manages consent state and enables/disables services accordingly
- Exposes global `window.tlanalytics` API with methods:
  - `identify(userId, properties)` - Identify a user across all services
  - `reset()` - Reset user identity across all services (called on logout)
  - `track(name, data)` - Track an event
  - `page()` - Track a page view
  - `gtag(...args)` - Access Google Analytics gtag function
  - `openPrivacySettings()` - Show privacy settings dialog

**Analytics services** (`src/analytics-services/`)

- Base `AnalyticsService` class defines common interface
- Each service (PostHog, GA4, HubSpot, Reo) extends the base class
- Lifecycle methods:
  - `initialize()` - Set up service (runs regardless of consent)
  - `enable()` - Enable tracking when consent is granted
  - `disable()` - Disable tracking when consent is revoked
  - `identify(userId, properties)` - Identify user
  - `reset()` - Reset user identity (called on logout)
  - `trackEvent(name, data)` - Track custom event
  - `trackPageview()` - Track page view

**State management** (`src/state/`)

- `AnalyticsState<T>` - Simple reactive state class with subscribe/notify pattern
- `CookieConsentState` - Manages consent state ('unknown' | 'opted-in' | 'opted-out')
- `ThemeState` - Manages theme for UI components ('light' | 'dark')

**UI components** (`src/components/`)

- `CookieConsentBanner` - Shows cookie consent prompt when consent is unknown
- `PrivacySettingsDialog` - Allows users to review and change their consent preferences

### Consent flow

1. On initialization, analytics reads consent from `allowTracking` cookie
2. If no existing consent decision:
   - Check user location via CloudFlare worker (`shouldRequireConsent()`)
   - Users in GDPR/LGPD regions default to 'unknown' (must opt in)
   - Users in other regions default to 'opted-in' (implicit consent)
3. If consent is unknown, banner is shown
4. User actions (accept/opt-out) update the consent state
5. Consent state changes trigger enable/disable on all services
6. Only opted-in users have their events tracked

**Geographic consent checking** (`src/utils/consent-check.ts`)

- Calls CloudFlare worker at `https://tldraw-consent.workers.dev`
- Worker uses `CF-IPCountry` header to determine user's country
- Requires explicit consent for EU, EEA, UK, Switzerland, Brazil
- Falls back to requiring consent if check fails or times out (2s timeout)
- Conservative default ensures compliance with privacy regulations

### Integration with services

**PostHog** (`src/analytics-services/posthog.ts`)

- Product analytics and session recording
- Switches between memory and localStorage persistence based on consent

**Google Analytics 4** (`src/analytics-services/ga4.ts`)

- Web analytics via gtag.js
- Measurement ID provided via `window.TL_GA4_MEASUREMENT_ID`

**HubSpot** (`src/analytics-services/hubspot.ts`)

- Marketing automation and CRM tracking
- Loaded via external script

**Reo** (`src/analytics-services/reo.ts`)

- Analytics service
- Loaded via external script

### CloudFlare consent worker

The consent worker is now maintained in a separate package at `apps/analytics-worker/`.

- Standalone CloudFlare Worker deployed to `tldraw-consent.workers.dev`
- Returns whether explicit consent is required based on user's geographic location
- Uses CloudFlare's `CF-IPCountry` header to detect country
- Returns JSON: `{ requires_consent: boolean, country_code: string }`
- CORS-enabled for cross-origin requests from tldraw domains
- Cached for 1 hour to reduce load
- Countries requiring explicit consent:
  - EU member states (GDPR)
  - EEA/EFTA countries (GDPR)
  - United Kingdom (UK PECR)
  - Switzerland (FADP)
  - Brazil (LGPD)

## Development

### Running the app

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn test             # Run tests
```

### Testing

Uses Vitest for unit testing. Test files are colocated with source files (e.g., `state.test.ts`).

### Build output

Vite builds the app into two outputs:

1. JavaScript bundle in `public/` directory (via `vite build --outDir public`)
2. TypeScript compiled output in `dist/` (via `tsc`)

The built script can be included in HTML via:

```html
<script src="/analytics.js"></script>
```

## Usage

After the script loads, use the global API:

```javascript
// Identify a user
window.tlanalytics.identify('user-123', { plan: 'pro' })

// Reset user identity (on logout)
window.tlanalytics.reset()

// Track an event
window.tlanalytics.track('button_clicked', { button: 'upgrade' })

// Track a page view
window.tlanalytics.page()

// Open privacy settings
window.tlanalytics.openPrivacySettings()
```

## Configuration

Analytics services are configured via constants in `src/constants.ts` and environment variables:

- `window.TL_GA4_MEASUREMENT_ID` - Google Analytics measurement ID
- `window.TL_GOOGLE_ADS_ID` - Google Ads ID (optional)
- PostHog, HubSpot, and Reo use hardcoded configuration in constants

## Key files

- `src/index.ts` - Main Analytics class and initialization
- `src/types.ts` - TypeScript types and global declarations
- `src/analytics-services/analytics-service.ts` - Base service class
- `src/analytics-services/*.ts` - Individual service implementations (PostHog, GA4, HubSpot, Reo)
- `src/state/state.ts` - Reactive state base class
- `src/state/cookie-consent-state.ts` - Consent management
- `src/state/theme-state.ts` - Theme management for UI components
- `src/utils/consent-check.ts` - Geographic consent checking utility
- `src/components/CookieConsentBanner.ts` - Consent banner UI
- `src/components/PrivacySettingsDialog.ts` - Privacy settings dialog UI
- `src/styles.css` - Component styles (inlined via Vite)

## Dependencies

- `posthog-js` - PostHog SDK
- `js-cookie` - Cookie management
- `vite` - Build tool
- `vitest` - Testing framework

## Notes

- This app does NOT use tldraw's `@tldraw/state` library - it has its own simple reactive state implementation
- The app is framework-agnostic - uses vanilla JavaScript/TypeScript
- All UI is created with vanilla DOM manipulation (no React)
- Styles are injected at runtime from the bundled CSS
- Services are enabled/disabled dynamically based on consent without page reload
- Error handling is implemented during initialization to prevent analytics failures from breaking the page
- User identity persists in memory during session for re-identification if consent changes
- Geographic consent checking uses a conservative approach - defaults to requiring consent on failure


# ==========================================
# FILE: apps/bemo-worker/CONTEXT.md
# ==========================================

# @tldraw/bemo-worker

A Cloudflare Worker that provides essential services for tldraw applications, including asset management, bookmark unfurling, and WebSocket connections to collaborative rooms.

## Architecture

**Cloudflare Worker + Durable Object pattern**

- Main worker handles HTTP requests via itty-router
- BemoDO (Durable Object) manages persistent WebSocket connections and room state
- Uses Cloudflare R2 for asset storage and Analytics Engine for telemetry

## Core responsibilities

### 1. Asset management

- **Upload endpoint**: `POST /uploads/:objectName` - Handles user asset uploads to R2 bucket
- **Asset retrieval**: `GET /uploads/:objectName` - Serves uploaded assets with proper caching
- Storage path: `asset-uploads/{objectName}` in BEMO_BUCKET

### 2. Bookmark unfurling

- **Legacy route**: `GET /bookmarks/unfurl` - Extract metadata only
- **Full unfurl**: `POST /bookmarks/unfurl` - Extract metadata and save preview images
- **Asset serving**: `GET /bookmarks/assets/:objectName` - Serve bookmark preview images
- Storage path: `bookmark-assets/{objectName}` in BEMO_BUCKET

### 3. Real-time collaboration

- **Room connection**: `GET /connect/:slug` - Establishes WebSocket connection to collaborative rooms
- Uses BemoDO (Durable Object) to maintain room state and handle multiplayer synchronization
- Integrates with @tldraw/sync-core for real-time document collaboration

## Key components

### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates room connections to Durable Objects.

### BemoDO (BemoDO.ts)

Durable Object that manages:

- WebSocket connections for real-time collaboration
- Room state persistence and synchronization
- Analytics event tracking
- R2 bucket integration for persistent storage

### Environment configuration

Multi-environment setup (dev/preview/staging/production) with:

- Custom domains for staging/production
- Separate R2 buckets per environment
- Analytics datasets per environment
- Durable Object bindings

## Dependencies

**Core tldraw packages:**

- `@tldraw/sync-core` - Real-time collaboration engine
- `@tldraw/worker-shared` - Shared worker utilities
- `@tldraw/store` - Reactive state management
- `@tldraw/tlschema` - Type definitions and validators

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers types and APIs
- R2 for object storage
- Analytics Engine for telemetry

## Development

- `yarn dev` - Start local development server on port 8989
- Uses wrangler for local development and deployment
- Bundle size limit: 350KB (enforced via check-bundle-size script)
- TypeScript configuration optimized for Cloudflare Workers environment

## Deployment environments

- **dev**: Local development with preview bucket
- **preview**: Feature branches with temporary deployments
- **staging**: `canary-demo.tldraw.xyz` for pre-production testing
- **production**: `demo.tldraw.xyz` for live service

## Security & performance

- CORS enabled for cross-origin requests
- Proper asset caching headers
- Analytics tracking for monitoring usage patterns
- Durable Objects provide consistent state management across requests


# ==========================================
# FILE: apps/docs/CONTEXT.md
# ==========================================

# @tldraw/docs

Documentation site for the tldraw SDK, hosted at [tldraw.dev](https://tldraw.dev).

## Overview

A Next.js application that generates comprehensive documentation for the tldraw ecosystem. The site combines human-written guides with auto-generated API documentation, all organized in a searchable, navigable interface.

## Architecture

### Tech stack

- **Framework**: Next.js 15 with App Router
- **Content**: MDX for human-written docs, auto-generated from TypeScript via API Extractor
- **Database**: SQLite for content storage and search indexing
- **Styling**: Tailwind CSS with custom components
- **Search**: Algolia for full-text search capabilities
- **Themes**: Dark/light mode support via next-themes

### Content management system

- **Human content**: MDX files in `/content` with frontmatter metadata
- **Generated content**: API docs created from TypeScript source via scripts
- **Database build**: SQLite populated by build scripts for fast querying
- **File watching**: Development mode auto-rebuilds on content changes

## Directory structure

```
apps/docs/
├── app/                 # Next.js App Router pages
│   ├── (docs)/         # Documentation routes
│   ├── (marketing)/    # Marketing pages
│   ├── blog/           # Blog functionality
│   └── search/         # Search implementation
├── content/            # All documentation content
│   ├── docs/           # Human-written guides
│   ├── reference/      # Auto-generated API docs
│   ├── blog/           # Blog posts
│   ├── getting-started/# Onboarding content
│   ├── community/      # Community guides
│   └── sections.json   # Content organization
├── components/         # React components
├── scripts/            # Build and content generation
├── utils/              # Shared utilities
└── api/                # API routes
```

## Content architecture

### Section system

Content is organized into sections defined in `sections.json`:

- **getting-started**: Quick start guides
- **docs**: Core SDK documentation
- **community**: Contributing guides
- **reference**: Auto-generated API docs
- **blog**: News and updates
- **legal**: Terms and policies

### Content types

**Human-written content** (`/content/docs`, `/content/getting-started`, etc.):

- MDX files with frontmatter metadata
- Manual curation and organization
- Includes examples, tutorials, guides

**Auto-generated content** (`/content/reference`):

- Generated from TypeScript source via API Extractor
- Covers all public APIs across tldraw packages
- Automatically updated with code changes

### Frontmatter schema

```yaml
title: "Article Title"
description: "SEO and search description"
status: "published" | "draft"
author: "author_key" # References authors.json
date: "MM/DD/YYYY"
order: 1 # Display order within section
category: "category_name" # Optional grouping
keywords: ["tag1", "tag2"] # Search keywords
hero: "image_path" # Social media image
```

## Build process

### Development commands

- `yarn dev` - Development server with file watching
- `yarn dev-docs` - Docs-specific development mode
- `yarn watch-content` - Content file watcher only

### Content generation pipeline

1. **API source fetching** (`fetch-api-source.ts`)
   - Pulls TypeScript definitions from tldraw packages
   - Uses GitHub API or local files

2. **API documentation** (`create-api-markdown.ts`)
   - Processes TypeScript via API Extractor
   - Generates structured markdown for each API

3. **Content processing** (`refresh-content.ts`)
   - Processes all MDX files
   - Populates SQLite database
   - Builds search indices

4. **Search indexing** (`update-algolia-index.ts`)
   - Updates Algolia search index
   - Includes content, metadata, and search keywords

### Complete build

```bash
yarn refresh-everything  # Full regeneration
yarn refresh-content     # Content only
yarn refresh-api         # API docs only
```

## Key components

### Content rendering

- **MDX processing**: `next-mdx-remote-client` for MDX rendering
- **Code highlighting**: Shiki for syntax highlighting
- **Link handling**: Custom components for internal/external links

### Search implementation

- **Algolia integration**: Full-text search across all content
- **InstantSearch**: Real-time search UI components
- **Faceted search**: Filter by content type, section, tags

### Navigation

- **Dynamic sidebar**: Generated from content structure
- **Breadcrumbs**: Contextual navigation
- **Section organization**: Hierarchical content browsing

## API reference generation

### Source processing

Uses Microsoft API Extractor to process TypeScript:

- Extracts public APIs from built packages
- Generates structured documentation data
- Maintains type information and relationships

### Package coverage

Generates docs for all major tldraw packages:

- `@tldraw/editor` - Core editor engine
- `tldraw` - Complete SDK with UI
- `@tldraw/store` - Reactive database
- `@tldraw/state` - Signals library
- `@tldraw/sync` - Multiplayer functionality
- `@tldraw/tlschema` - Type definitions
- `@tldraw/validate` - Validation utilities

### Documentation structure

- **Classes**: Methods, properties, inheritance
- **Functions**: Parameters, return types, examples
- **Types**: Interface definitions, type aliases
- **Enums**: Values and descriptions

## Development workflow

### Content development

1. Write/edit MDX files in appropriate `/content` subdirectory
2. Use proper frontmatter with required fields
3. File watcher auto-rebuilds during development
4. Test locally before committing

### API documentation updates

1. Changes to TypeScript source trigger regeneration
2. Run `yarn refresh-api` to update API docs
3. Verify generated content accuracy
4. Update search indices

### Deployment

- **Build**: `yarn build` generates static site
- **Content validation**: Link checking, broken reference detection
- **Search**: Algolia index updates during build
- **Assets**: Optimized images, fonts, and static resources

## Integration points

### With main repository

- **Source dependency**: Reads from tldraw package builds
- **Version sync**: Tracks main repository releases
- **Asset sharing**: Uses shared icons, fonts from `/assets`

### External services

- **Algolia**: Search indexing and querying
- **GitHub API**: Source code fetching for API docs
- **Analytics**: User interaction tracking

## Performance considerations

### Static generation

- Most pages pre-rendered at build time
- Dynamic content cached in SQLite
- Incremental Static Regeneration for updates

### Search optimization

- Algolia handles search queries
- Client-side search UI components
- Debounced search input for performance

### Asset optimization

- Next.js automatic image optimization
- Font subsetting and preloading
- CSS optimization and purging

## Key files

**Configuration**:

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript settings

**Content management**:

- `content/sections.json` - Content organization
- `content/authors.json` - Author metadata
- `watcher.ts` - Development file watching

**Build scripts**:

- `scripts/refresh-content.ts` - Content processing
- `scripts/create-api-markdown.ts` - API doc generation
- `scripts/update-algolia-index.ts` - Search indexing

This documentation site serves as the primary resource for developers using the tldraw SDK, combining comprehensive API references with practical guides and examples.


# ==========================================
# FILE: apps/dotcom/asset-upload-worker/CONTEXT.md
# ==========================================

# @dotcom/asset-upload-worker

Cloudflare Worker for handling user asset uploads and serving images for tldraw.com.

## Overview

A lightweight Cloudflare Worker that provides asset upload and retrieval services for the tldraw.com web application. It handles image uploads to Cloudflare R2 storage and serves them back with proper caching, enabling users to import and work with images in their tldraw documents.

## Architecture

### Tech stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Router**: itty-router for request routing
- **Shared logic**: @tldraw/worker-shared package
- **Analytics**: Cloudflare Analytics Engine for telemetry

### Infrastructure

- **Edge computing**: Deployed globally on Cloudflare's edge network
- **Caching**: Cloudflare Cache API for optimized asset delivery
- **CORS**: Full CORS support for cross-origin requests
- **Multi-environment**: dev, preview, staging, production deployments

## Core functionality

### Asset upload (`POST /uploads/:objectName`)

- Accepts image files via POST requests
- Stores assets in Cloudflare R2 buckets
- Returns object metadata and ETags
- Prevents duplicate uploads (409 if exists)
- Preserves HTTP metadata (content-type, etc.)

### Asset retrieval (`GET /uploads/:objectName`)

- Serves uploaded assets from R2 storage
- Implements automatic caching via Cloudflare Cache API
- Supports HTTP range requests for partial content
- Handles conditional requests (If-None-Match, etc.)
- Returns 404 for non-existent assets

### Request flow

```
Client Request → Cloudflare Edge → Worker → R2 Storage
             ← Cache Layer   ← Worker ← R2 Response
```

## Environment configuration

### Development (`dev`)

- Worker Name: `tldraw-assets-dev`
- R2 Bucket: `uploads-preview`
- Local development on port 8788
- Persists assets to `tmp-assets/` directory

### Preview/Staging (`preview`/`staging`)

- Worker Name: `main-tldraw-assets` (staging)
- R2 Bucket: `uploads-preview` (shared preview bucket)
- Uses Cloudflare Workers subdomain

### Production (`production`)

- Worker Name: `tldraw-assets`
- R2 Bucket: `uploads` (dedicated production bucket)
- Custom domain: `assets.tldraw.xyz`
- Zone: `tldraw.xyz`

## Storage structure

### R2 buckets

- **uploads-preview**: Development, preview, and staging assets
- **uploads**: Production assets only
- **Object names**: Client-generated unique identifiers
- **Metadata**: Preserved HTTP headers (content-type, etc.)

### Caching strategy

- **Cloudflare cache**: Automatic edge caching for GET requests
- **Cache keys**: Full URL with headers for proper invalidation
- **Range support**: Efficient streaming for large assets
- **ETag headers**: For conditional requests and validation

## Worker implementation

### Entry point (`src/worker.ts`)

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
  readonly router = createRouter<Environment>()
    .all('*', preflight)                    // CORS preflight
    .get('/uploads/:objectName', ...)       // Asset retrieval
    .post('/uploads/:objectName', ...)      // Asset upload
    .all('*', notFound)                     // 404 fallback
}
```

### Environment interface (`src/types.ts`)

- **UPLOADS**: R2Bucket binding for asset storage
- **CF_VERSION_METADATA**: Worker version information
- **TLDRAW_ENV**: Environment identifier
- **SENTRY_DSN**: Error tracking configuration
- **MEASURE**: Analytics Engine binding

## Shared dependencies

### @tldraw/worker-shared

Provides common functionality across all tldraw workers:

- **handleUserAssetUpload**: Upload logic with duplicate prevention
- **handleUserAssetGet**: Retrieval logic with caching
- **handleApiRequest**: Common request processing
- **createRouter**: Router setup with middleware
- **CORS handling**: Cross-origin request support

### Key functions

- Upload validation and R2 storage operations
- Cache-aware asset retrieval with range support
- Error handling and response formatting
- Analytics integration for monitoring

## Security considerations

### Access control

- **CORS**: Configured for cross-origin requests (`origin: '*'`)
- **Object names**: Client-controlled, requires proper validation
- **Upload limits**: Inherits Cloudflare Worker size limits
- **Content types**: Preserves but doesn't validate file types

### Data isolation

- **Environment separation**: Separate buckets for dev/preview/production
- **No authentication**: Public upload/retrieval (relies on object name secrecy)
- **Analytics**: Basic request telemetry via Analytics Engine

## Development workflow

### Local development

```bash
yarn dev  # Starts local worker with R2 persistence
```

- Uses Wrangler dev server on port 8788
- Persists uploads to local `tmp-assets/` directory
- Inspector available on port 9449
- Hot reload on source changes

### Testing

```bash
yarn test        # Run unit tests
yarn test-ci     # CI test runner
yarn lint        # Code quality checks
```

### Deployment

- **Automatic**: Via CI/CD pipeline
- **Manual**: Using Wrangler CLI
- **Environment-specific**: Different names/buckets per environment
- **Version metadata**: Automatic version tracking

## Usage integration

### Client integration

```typescript
// Upload asset
const response = await fetch(`${WORKER_URL}/uploads/${objectName}`, {
	method: 'POST',
	body: file,
	headers: { 'Content-Type': file.type },
})

// Retrieve asset
const imageUrl = `${WORKER_URL}/uploads/${objectName}`
```

### tldraw.com integration

- **Image import**: Users can upload images to canvas
- **Asset management**: Temporary storage for session assets
- **Performance**: Edge-cached delivery for global users
- **Reliability**: R2 durability and redundancy

## Monitoring & analytics

### Analytics engine

- **Request metrics**: Upload/retrieval counts and latency
- **Error tracking**: Failed requests and error rates
- **Performance**: Response times and cache hit rates
- **Usage patterns**: Popular asset types and sizes

### Observability

- **Cloudflare Dashboard**: Worker metrics and logs
- **Sentry integration**: Error reporting and alerting
- **Version tracking**: Deployment metadata and rollback capability

## Limitations & considerations

### Size constraints

- **Worker limit**: 25MB request body size (Cloudflare limit)
- **Asset types**: No server-side validation of file types
- **Concurrency**: Limited by Cloudflare Worker isolate model

### Retention

- **No cleanup**: Assets persist indefinitely once uploaded
- **No versioning**: Object names must be unique per upload
- **No metadata**: Minimal asset information beyond HTTP headers

## Related services

### Companion workers

- **sync-worker**: Real-time collaboration backend
- **image-resize-worker**: Asset transformation and optimization

### Integration points

- **tldraw.com client**: Primary consumer of upload/retrieval APIs
- **R2 storage**: Shared storage infrastructure
- **Cloudflare Cache**: Global content delivery network

This worker provides essential asset management capabilities for tldraw.com, enabling users to work with images while maintaining global performance and reliability through Cloudflare's edge infrastructure.


# ==========================================
# FILE: apps/dotcom/client/CONTEXT.md
# ==========================================

# @dotcom/client

The frontend React application for tldraw.com - the official tldraw web application.

## Overview

A modern React SPA built with Vite that provides the complete tldraw.com user experience. This is the main consumer-facing application that users interact with when visiting tldraw.com, featuring real-time collaboration, file management, user accounts, and the full tldraw editor experience.

## Architecture

### Tech stack

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite with SWC for fast compilation
- **Router**: React Router v6 with lazy-loaded routes
- **Authentication**: Clerk for user management and auth
- **Collaboration**: @tldraw/sync for real-time multiplayer
- **Database**: @rocicorp/zero for client-side data sync
- **Styling**: CSS Modules with global styles
- **Internationalization**: FormatJS for i18n support
- **Monitoring**: Sentry for error tracking, PostHog for analytics

### Application structure

```
src/
├── components/         # Shared UI components
├── pages/             # Route components
├── tla/               # TLA (tldraw app) specific features
│   ├── app/           # Core TLA functionality
│   ├── components/    # TLA-specific components
│   ├── hooks/         # TLA business logic hooks
│   ├── pages/         # TLA route pages
│   ├── providers/     # Context providers
│   └── utils/         # TLA utilities
├── hooks/             # Global React hooks
├── utils/             # Shared utilities
└── assets/            # Static assets
```

## Core features

### Authentication & user management

- **Clerk integration**: Complete auth flow with sign-in/sign-up
- **User sessions**: Persistent authentication state
- **Protected routes**: Authenticated route protection
- **Social login**: Multiple authentication providers

### Real-time collaboration

- **WebSocket sync**: Real-time document synchronization
- **Multiplayer editing**: Multiple users editing simultaneously
- **Conflict resolution**: Operational transforms for concurrent edits
- **Presence indicators**: Live cursors and user awareness

### File management (TLA system)

- **Local files**: Client-side file storage with IndexedDB
- **Cloud sync**: Server-side file persistence and sync
- **File history**: Version control with snapshots
- **Sharing**: Public sharing and collaborative access
- **Import/export**: Multiple file format support

### Editor integration

- **Full tldraw SDK**: Complete drawing and design capabilities
- **Asset management**: Image upload and storage via workers
- **Responsive UI**: Adaptive interface for different screen sizes
- **Keyboard shortcuts**: Comprehensive hotkey system

## Routing architecture

### Route structure

```typescript
// Main application routes
/                    # Root/landing page (TLA)
/new                # Create new file
/f/:fileId          # File editor
/f/:fileId/h        # File history
/f/:fileId/h/:vsId  # History snapshot
/publish            # Publishing flow

// Legacy compatibility routes
/r/:roomId          # Legacy room redirect
/ro/:roomId         # Legacy readonly redirect
/s/:roomId          # Legacy snapshot redirect
/v/:roomId          # Legacy readonly (old format)
```

### Lazy loading

- **Route-based splitting**: Each page component lazy loaded
- **Provider splitting**: Context providers loaded on demand
- **Component splitting**: Large components split for performance

### Error boundaries

- **Global error handling**: Captures and reports all errors
- **Sync error handling**: Specific handling for collaboration errors
- **User-friendly messages**: Contextual error messages
- **Sentry integration**: Automatic error reporting

## Data management

### Client-side storage

- **IndexedDB**: Local file persistence via IDB library
- **Zero database**: Real-time sync with server state
- **Asset caching**: Local caching of uploaded images
- **Settings persistence**: User preferences and settings

### State management

- **React Context**: Global app state via providers
- **Custom hooks**: Business logic encapsulation
- **Zero Sync**: Real-time data synchronization
- **Signal-based updates**: Reactive state updates

### API integration

- **Sync worker**: Real-time collaboration backend
- **Asset upload worker**: File upload and storage
- **Image resize worker**: Image processing and optimization
- **Zero server**: Data persistence and sync

## Development environment

### Build configuration

- **Vite config**: Modern build tooling with HMR
- **Environment variables**: Config via .env files
- **Proxy setup**: API proxying for development
- **Source maps**: Full debugging support with Sentry

### Development commands

```bash
yarn dev         # Start development server
yarn build       # Production build
yarn build-i18n   # Extract and compile translations
yarn e2e         # End-to-end tests via Playwright
yarn test        # Unit tests via Vitest
yarn lint        # Code quality checks
```

### Environment setup

- **PostgreSQL**: Database dependency via wait-for-postgres.sh
- **Worker services**: Local development with companion workers
- **Hot reload**: Fast refresh for development
- **Debug tools**: Inspector and debugging support

## Internationalization

### FormatJS integration

- **Message extraction**: `yarn i18n:extract` extracts translatable strings
- **Compilation**: `yarn i18n:compile` compiles for runtime
- **ICU messages**: Full ICU message format support
- **Locale support**: Multiple language support infrastructure

### Translation workflow

- **Source scanning**: Automatic message ID generation
- **Lokalise format**: Translation management integration
- **AST compilation**: Optimized runtime message handling
- **Dynamic loading**: Locale-specific bundle loading

## Testing strategy

### End-to-end testing

- **Playwright**: Full browser automation testing
- **Auth testing**: @clerk/testing for authentication flows
- **Multiple environments**: Testing against staging/production
- **Parallel execution**: Fast test suite execution

### Unit testing

- **Vitest**: Fast unit test runner
- **React testing**: Component and hook testing
- **Snapshot tests**: UI regression testing
- **Coverage reports**: Code coverage analysis

## Performance optimizations

### Bundle optimization

- **Code splitting**: Route and component-level splitting
- **Asset optimization**: Image optimization and inlining limits
- **Tree shaking**: Unused code elimination
- **Compression**: Gzip and Brotli compression

### Runtime performance

- **Lazy loading**: On-demand component loading
- **Memoization**: React.memo and useMemo optimization
- **Virtual DOM**: Efficient React rendering
- **Service worker**: Cache management (legacy cleanup)

### Network optimization

- **CDN assets**: Static asset delivery via CDN
- **HTTP/2**: Modern protocol support
- **Caching headers**: Browser caching optimization
- **Preloading**: Critical resource preloading

## Security considerations

### Authentication security

- **JWT tokens**: Secure token-based authentication
- **HTTPS only**: Encrypted communication
- **CSRF protection**: Cross-site request forgery prevention
- **Session management**: Secure session handling

### Content security

- **Iframe protection**: IFrameProtector component for embedding
- **XSS prevention**: Input sanitization and validation
- **Asset validation**: Safe asset handling
- **Privacy controls**: User data protection

## Deployment & infrastructure

### Build process

- **Vite build**: Optimized production bundles
- **Source maps**: Error tracking and debugging
- **Asset fingerprinting**: Cache busting for static assets
- **Environment configuration**: Runtime environment detection

### Hosting

- **Vercel deployment**: Serverless hosting platform
- **CDN integration**: Global asset distribution
- **SSL/TLS**: Automatic certificate management
- **Custom domains**: tldraw.com domain configuration

### Monitoring & analytics

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Google Analytics**: User behavior tracking
- **Real user monitoring**: Performance metrics collection

## Integration points

### Backend services

- **Sync worker**: Real-time collaboration
- **Asset upload worker**: File upload handling
- **Image resize worker**: Image processing
- **Zero server**: Data persistence and sync

### Third-party services

- **Clerk**: Authentication and user management
- **Sentry**: Error reporting and monitoring
- **PostHog**: Analytics and feature flags
- **Vercel**: Hosting and deployment

## Key files

### Configuration

- `vite.config.ts` - Build tool configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

### Application core

- `src/main.tsx` - Application entry point
- `src/routes.tsx` - Route definitions and error boundaries
- `src/routeDefs.ts` - Route constants and utilities

### TLA system

- `src/tla/` - Complete file management system
- `src/tla/app/` - Core TLA functionality
- `src/tla/providers/` - Context providers

This client application serves as the primary interface for tldraw.com users, combining the powerful tldraw editor with real-time collaboration, user management, and a comprehensive file system to create a complete creative platform.


# ==========================================
# FILE: apps/dotcom/client/src/fairy/CONTEXT.md
# ==========================================

# Fairy system context

## Overview

The fairy system is an AI agent framework for tldraw.com that provides intelligent canvas assistants. Fairies are visual AI agents with sprite avatars that can interact with the canvas, perform tasks, and collaborate with users and other fairies. They appear as small animated sprites that move around the canvas as they work.

## Architecture

The fairy system uses a two-level manager architecture:

1. **Application level** (`FairyApp`): Manages global fairy state, agent lifecycle, projects, tasks, and coordination
2. **Agent level** (`FairyAgent`): Manages individual fairy behavior, mode state machine, chat, and canvas actions

### Application layer (`fairy-app/`)

**FairyApp** (`fairy-app/FairyApp.ts`)

The central coordinator for the fairy system. One instance per editor.

- Manages global state (isApplyingAction, debugFlags, modelSelection)
- Coordinates all app-level managers
- Handles state persistence (load/save/auto-save)
- Provides React context via `FairyAppProvider`

**App managers** (`fairy-app/managers/`)

All app managers extend `BaseFairyAppManager` with `reset()` and `dispose()` methods:

- **FairyAppAgentsManager**: Agent lifecycle - creation, sync with configs, disposal
- **FairyAppFollowingManager**: Camera following - tracks which fairy to follow, zoom behavior
- **FairyAppPersistenceManager**: State persistence - load, save, auto-save with throttling
- **FairyAppProjectsManager**: Project CRUD, disband, resume, member management
- **FairyAppTaskListManager**: Task CRUD, assignment, status updates, notifications
- **FairyAppWaitManager**: Wait/notification system for inter-agent coordination

**FairyAppProvider** (`fairy-app/FairyAppProvider.tsx`)

React provider that:

- Creates `FairyApp` instance on mount
- Syncs agents with user's fairy configs
- Loads/saves persisted state
- Provides `useFairyApp()` hook for context access

### Agent layer (`fairy-agent/`)

**FairyAgent** (`fairy-agent/FairyAgent.ts`)

- Main agent class that orchestrates AI interactions
- References `FairyApp` for app-level operations
- Delegates functionality to specialized manager classes
- Coordinates with the AI backend for generation
- Contains computed state for fairy entity and configuration
- Handles prompt preparation, request management, and scheduling

**Agent managers** (`fairy-agent/managers/`)

FairyAgent uses a manager pattern to organize functionality into focused classes that all extend `BaseFairyAgentManager`:

- **FairyAgentActionManager**: Action utils, action execution, and action info retrieval
- **FairyAgentChatManager**: Chat history storage and updates
- **FairyAgentChatOriginManager**: Chat origin point tracking for coordinate offset calculations
- **FairyAgentGestureManager**: Temporary visual gestures and poses
- **FairyAgentModeManager**: Mode state machine transitions
- **FairyAgentPositionManager**: Fairy positioning, spawning, following, and summon behavior
- **FairyAgentRequestManager**: Active/scheduled request management and prompt state
- **FairyAgentTodoManager**: Personal todo item management
- **FairyAgentUsageTracker**: Token usage and cost tracking
- **FairyAgentUserActionTracker**: Recording user actions on canvas
- **FairyAgentWaitManager**: Wait conditions and wake-up logic

Each manager has a `reset()` method and optional `dispose()` for cleanup.

**FairyEntity** (from `@tldraw/fairy-shared`)

- Data structure representing a fairy's state
- Includes position, selection state, personality, pose
- Tracks fairy mode, project membership, and flip orientation
- Persisted across sessions

**Fairy component** (`Fairy.tsx`)

- React component that renders the fairy sprite on canvas
- Size: 60px base with variable clickable areas (50px default, 60px selected)
- Handles selection via brush tool (shift-key for multi-select)
- Context menu interactions on right-click
- Responds to throw tool and drag interactions
- Collision detection using bounding box intersection

### Agent modes

Fairies operate in different modes defined by a state machine (`FairyModeNode.ts`):

**Basic modes**

- **sleeping**: Initial dormant state, fairy is not active
- **idling**: Default awake state, waiting for input, clears todo list and action history on enter
- **soloing**: Working independently on user requests, continues until all assigned tasks complete
- **standing-by**: Waiting state (passive)

**Solo work modes**

- **working-solo**: Working on a solo task, maintains todo list, auto-continues until task marked done
- **working-drone**: Working as drone in a project, cannot be cancelled mid-project
- **working-orchestrator**: Duo orchestrator working on their own task

**Orchestration modes**

- **orchestrating-active**: Actively coordinating a project, deploying drones and reviewing progress
- **orchestrating-waiting**: Waiting for drones to complete their tasks before resuming
- **duo-orchestrating-active**: Leading a duo project with another fairy
- **duo-orchestrating-waiting**: Waiting in duo project for partner to complete work

Each mode has lifecycle hooks:

- `onEnter`: Setup when entering the mode
- `onExit`: Cleanup when leaving the mode
- `onPromptStart`: Handle new prompt initiation
- `onPromptEnd`: Determine next action after prompt completes
- `onPromptCancel`: Handle cancellation (some modes prohibit cancellation)

### Prompt composition system

The prompt composition system is responsible for gathering context from the client, sending it to the worker, and assembling it into a structured prompt for the AI model.

**1. Gathering context (client-side)**

When `agent.prompt()` is called, `FairyAgent` collects information using **Prompt Part Utils** (`PromptPartUtil`). Each util corresponds to a specific type of context (e.g., `selectedShapes`, `chatHistory`).

- **Role**: Extract raw data from the editor/store.
- **Output**: A JSON-serializable `PromptPart` object.

```typescript
// Example: SelectedShapesPartUtil
class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	getPart(request) {
		return {
			type: 'selectedShapes',
			shapes: this.editor.getSelectedShapes().map(/* ... */),
		}
	}
}
```

**2. Prompt construction (worker-side)**

The worker receives the `AgentPrompt` (a collection of parts) and builds the final system prompt using `buildSystemPrompt`.

- **Flags**: `getSystemPromptFlags` analyzes the active mode, available actions, and present prompt parts to generate boolean flags (e.g., `isSoloing`, `hasSelectedShapesPart`).
- **Sections**: These flags drive the inclusion of specific prompt sections:
  - `intro-section`: Base identity and high-level goals.
  - `rules-section`: Dynamic rules based on capabilities (e.g., "You can create shapes...").
  - `mode-section`: Mode-specific instructions (e.g., "You are currently orchestrating...").

**3. Message building**

The worker converts prompt parts into a list of messages (`ModelMessage[]`) for the LLM.

- `buildMessages`: Iterates through parts and calls their `buildContent` method (defined in `PromptPartDefinitions` or `PromptPartUtil`).
- **Prioritization**: Parts have priority levels. For example, `SystemPrompt` is high priority, while `PeripheralShapes` might be lower.

**4. Schema generation**

The JSON schema for the model's response is dynamically generated based on the **allowed actions** for the current mode.

- If `mode: 'soloing'` allows `CreateAction`, the schema will include the definition for creating shapes.
- If `mode: 'idling'` allows fewer actions, the schema is restricted accordingly.

### Interrupt system

The interrupt system allows for immediate control flow changes in the agent's behavior. It is primarily handled by the `interrupt` method in `FairyAgent`.

**Key functions**

- **Cancel current work**: Aborts any currently running prompt or action stream.
- **Clear schedule**: Removes any pending scheduled requests.
- **Mode switching**: Optionally transitions the agent to a new mode.
- **New instruction**: Optionally provides a new prompt or input to start immediately.

**Usage**

```typescript
agent.interrupt({
	mode: 'idling', // Switch to idling mode
	input: {
		// Optional: Provide new input
		message: 'Stop what you are doing',
		source: 'user',
	},
})
```

**Common use cases**

- **User cancellation**: When a user sends a new message while the agent is working.
- **Task completion**: When an agent finishes a task and needs to report back or switch roles (e.g. `MarkSoloTaskDoneActionUtil`).
- **Mode transitions**: When changing from solo work to collaboration or orchestration.

**Implementation details**

- Clears active and scheduled requests via `requestManager`.
- Calls the underlying `AbortController` to stop network requests.
- Triggers `onExit` of the current mode and `onEnter` of the new mode.

### Action execution pipeline

The agent processes actions streamed from the AI model through a rigorous pipeline to ensure safety and consistency.

**Pipeline steps**

1. **Streaming**: Actions arrive via `_streamActions` from the worker as Server-Sent Events (SSE).
2. **Validation**: The system checks if the action type is allowed in the current mode.
3. **Sanitization**: `sanitizeAction` (in `AgentActionUtil`) transforms the action before execution (e.g. correcting IDs, validating bounds).
4. **Execution**:
   - The agent enters an "acting" state (`isActing = true`) to prevent recording its own actions as user actions.
   - `editor.store.extractingChanges` captures all state changes made during the action.
   - `applyAction` modifies the canvas (creating shapes, moving elements, etc.).
5. **Partial execution handling**:
   - If an action comes in chunks, `incompleteDiff` tracks partial changes.
   - Previous partial changes are reverted before applying the new, more complete version of the action.
6. **Page synchronization**:
   - `ensureFairyIsOnCorrectPage` ensures the fairy is on the same page as shapes being manipulated.
   - For create actions, syncs fairy to current editor page.
7. **History & persistence**:
   - `savesToHistory()` determines if the action appears in the chat log.
   - Chat history is updated with the action and its resulting diff.

**Key methods in FairyAgentActionManager**

- `act(action)`: Core method to execute a single action and capture its diff.
- `getAgentActionUtil(type)`: Get the util for an action type.
- `getActionInfo(action)`: Get display info for UI rendering.

### Chat history system

The chat history system maintains a persistent record of interactions, actions, and memory transitions. It serves as the agent's "memory," allowing it to recall past instructions and actions within specific contexts.

**Data structure**

Chat history is stored as an array of `ChatHistoryItem` objects managed by `FairyAgentChatManager`.

```typescript
type ChatHistoryItem =
	| { type: 'prompt'; agentFacingMessage: string; userFacingMessage: string; promptSource: string; ... }
	| { type: 'action'; action: AgentAction; diff: RecordsDiff; acceptance: string; ... }
	| { type: 'continuation'; data: any[]; ... }
	| { type: 'memory-transition'; agentFacingMessage: string; userFacingMessage: string | null; ... }
```

**Memory levels**

To manage context window size and relevance, the system implements a tiered memory model:

1. **Task level** (`memoryLevel: 'task'`): High-detail, short-term memory. Contains immediate actions and granular feedback for the current task. Cleared when the task is completed.
2. **Project level** (`memoryLevel: 'project'`): Medium-term memory. Contains key milestones and instructions relevant to the entire project. Persists across individual tasks but cleared when the project ends.
3. **Fairy level** (`memoryLevel: 'fairy'`): Long-term memory. Contains core personality traits and global instructions. Persists across projects.

**Filtering mechanism**

The `ChatHistoryPartUtil` uses `filterChatHistoryByMode` to send only relevant history to the AI model based on the current mode's required memory level.

- **Task mode**: Sees only current task history (stops at previous task boundaries).
- **Project mode**: Sees project-level history (stops at fairy-level boundaries).
- **Fairy mode**: Sees only global history.

### Actions system

Actions are the operations fairies can perform on the canvas. Each action extends `AgentActionUtil` and implements:

- `getInfo()`: Returns UI display information (icon, description, pose)
- `sanitizeAction()`: Transforms/validates actions before execution
- `applyAction()`: Executes the action on the canvas
- `savesToHistory()`: Whether to persist in chat history

**Canvas manipulation**

- `CreateActionUtil`: Create shapes with unique ID management and arrow bindings
- `UpdateActionUtil`: Modify existing shapes with property updates
- `DeleteActionUtil`: Remove shapes from canvas
- `MoveActionUtil`: Reposition elements with offset calculations
- `MovePositionActionUtil`: Move fairy position
- `ResizeActionUtil`: Change shape dimensions
- `RotateActionUtil`: Rotate shapes around their center
- `LabelActionUtil`: Add or update text labels on shapes
- `OffsetActionUtil`: Offset shapes by a delta

**Organization**

- `AlignActionUtil`: Align multiple shapes (left, center, right, top, middle, bottom)
- `DistributeActionUtil`: Distribute shapes evenly (horizontal, vertical)
- `StackActionUtil`: Stack shapes in organized layouts
- `PlaceActionUtil`: Position groups of shapes strategically
- `BringToFrontActionUtil`: Move shapes to front layer
- `SendToBackActionUtil`: Move shapes to back layer

**Drawing**

- `PenActionUtil`: Freehand drawing with pen tool

**Navigation**

- `ChangePageActionUtil`: Switch between document pages
- `CreatePageActionUtil`: Create new pages
- `FlyToBoundsActionUtil`: Navigate viewport to specific bounds

**Solo task management**

- `CreateSoloTaskActionUtil`: Create individual tasks
- `StartSoloTaskActionUtil`: Begin working on solo tasks
- `MarkSoloTaskDoneActionUtil`: Mark solo tasks as complete
- `ClaimTodoItemActionUtil`: Claim personal todo items
- `UpsertPersonalTodoItemActionUtil`: Manage personal todo list
- `DeletePersonalTodoItemsActionUtil`: Delete todo items

**Project task management (orchestrator)**

- `StartProjectActionUtil`: Initialize a new project
- `CreateProjectTaskActionUtil`: Create tasks within a project
- `DeleteProjectTaskActionUtil`: Delete project tasks
- `DirectToStartTaskActionUtil`: Direct drones to start tasks
- `EndCurrentProjectActionUtil`: Complete and close current project
- `AwaitTasksCompletionActionUtil`: Wait for task completion

**Duo project management**

- `StartDuoProjectActionUtil`: Initialize duo collaboration
- `CreateDuoTaskActionUtil`: Create duo tasks
- `DirectToStartDuoTaskActionUtil`: Direct partner to start task
- `StartDuoTaskActionUtil`: Begin duo task execution
- `EndDuoProjectActionUtil`: Complete duo project
- `AwaitDuoTasksCompletionActionUtil`: Wait for duo task completion
- `MarkDuoTaskDoneActionUtil`: Mark duo tasks complete

**Drone actions**

- `MarkDroneTaskDoneActionUtil`: Complete tasks as a drone

**Communication & planning**

- `MessageActionUtil`: Send messages to users
- `ThinkActionUtil`: Display thinking process
- `ReviewActionUtil`: Review and analyze canvas content

**System**

- `UnknownActionUtil`: Handle unrecognized actions (required)

### Prompt parts system

Prompt parts provide context to the AI model:

**Canvas context**

- `SelectedShapesPartUtil`: Currently selected shapes
- `PeripheralShapesPartUtil`: Nearby shapes
- `BlurryShapesPartUtil`: Distant/background shapes
- `ScreenshotPartUtil`: Visual canvas representation
- `DataPartUtil`: Shape data and properties
- `CanvasLintsPartUtil`: Canvas lint warnings

**User context**

- `UserViewportBoundsPartUtil`: User's visible area
- `UserActionHistoryPartUtil`: Recent user actions
- `MessagesPartUtil`: User messages and requests

**Agent context**

- `AgentViewportBoundsPartUtil`: Fairy's visible area
- `ChatHistoryPartUtil`: Conversation history
- `SignPartUtil`: Fairy's astrological sign
- `ModelNamePartUtil`: AI model being used

**Task context**

- `SoloTasksPartUtil`: Individual tasks
- `WorkingTasksPartUtil`: In-progress tasks
- `PersonalTodoListPartUtil`: Personal todo items
- `CurrentProjectOrchestratorPartUtil`: Project orchestration
- `CurrentProjectDronePartUtil`: Drone role in projects

**Environment context**

- `PagesPartUtil`: Document pages
- `TimePartUtil`: Temporal context
- `ModePartUtil`: Current agent mode
- `OtherFairiesPartUtil`: Other fairies present
- `DebugPartUtil`: Debug information when enabled

### Helper system

**AgentHelpers** (`fairy-agent/AgentHelpers.ts`)

Transformation utilities used during request processing:

**Coordinate transformations**

- `applyOffsetToVec/removeOffsetFromVec`: Adjust positions relative to chat origin
- `applyOffsetToBox/removeOffsetFromBox`: Transform bounding boxes
- `applyOffsetToShape/removeOffsetFromShape`: Transform entire shapes
- Helps keep numbers small for better AI model comprehension

**ID management**

- `ensureShapeIdIsUnique`: Prevent ID collisions when creating shapes
- `ensureShapeIdExists`: Validate shape references in actions
- `shapeIdMap`: Track ID transformations for consistency across actions

**Numeric precision**

- `roundingDiffMap`: Store rounding differences for restoration
- Maintains precision while simplifying numbers for AI

### Wait and notification system

**FairyAppWaitManager** (app level)

Central event dispatcher for broadcasting events to waiting agents:

- `notifyWaitingAgents()`: Central event dispatcher
- `notifyTaskCompleted()`: Broadcast when tasks complete
- `notifyAgentModeTransition()`: Broadcast mode changes
- `createTaskWaitCondition()`: Create wait condition for specific task
- `createAgentModeTransitionWaitCondition()`: Create wait condition for mode change

**FairyAgentWaitManager** (agent level)

Per-agent wait condition management:

- `waitForAll()`: Set wait conditions for an agent
- `getWaitingFor()`: Get current wait conditions
- `notifyWaitConditionFulfilled()`: Wake agent with notification message

### Collaborative features

**Projects system** (`FairyAppProjectsManager`)

- Multi-fairy collaboration on complex tasks
- Project roles:
  - **Orchestrator**: Coordinates work, assigns tasks, reviews progress, cannot be interrupted
  - **Duo-orchestrator**: Leads a duo project, can also work on tasks themselves
  - **Drone**: Executes assigned tasks, reports completion, works autonomously
- Duo projects for paired fairy collaboration
- Project state tracked globally with member lists and task assignments
- Projects have unique IDs and color coding

**Project resumption**

Projects can be resumed after interruption with intelligent state recovery:

- **State 1**: All tasks done → Resume orchestrator to review/end project
- **State 2**: Tasks in progress → Resume working drones, orchestrator waits
- **State 3**: Mix of done/todo → Resume orchestrator to continue leading
- **State 4**: No tasks exist → Resume orchestrator to finish planning
- **State 5**: All tasks todo → Resume orchestrator to direct drones

**Project lifecycle**

- `addProject()`: Register new project
- `disbandProject()`: Cancel project, interrupt members, add cancellation memory
- `disbandAllProjects()`: Cleanup all projects
- `resumeProject()`: Intelligently resume interrupted projects
- `deleteProjectAndAssociatedTasks()`: Clean removal with task cleanup

**Task management** (`FairyAppTaskListManager`)

- Shared task lists for projects
- Task states: `todo`, `in-progress`, `done`
- Tasks include:
  - Unique ID for tracking
  - Text description
  - Assignment to specific fairy
  - Completion status
  - Project association
  - Optional spatial bounds

**Inter-fairy communication**

- Fairies aware of each other through `OtherFairiesPartUtil`
- Coordinate actions to avoid conflicts
- Share project context for collaboration
- Wait conditions enable synchronization
- Mode transitions broadcast to waiting fairies

### UI components

**Main components** (`fairy-ui/`)

- `FairyHUD`: Main heads-up display container
- `FairyHUDTeaser`: Teaser/preview UI

**Chat components** (`fairy-ui/chat/`)

- `FairyChatHistory`: Full conversation display
- `FairyChatHistorySection`: Grouped history display
- `FairyChatHistoryAction`: Individual action rendering
- `FairyChatHistoryGroup`: Grouped action rendering
- `FairyProjectChatContent`: Project-specific chat content
- `filterChatHistoryByMode`: History filtering logic

**Input components** (`fairy-ui/hud/`)

- `FairySingleChatInput`: Single fairy chat input
- `FairyHUDHeader`: Header with controls
- `useFairySelection`: Selection state hook
- `useIdlingFairies`: Hook for available fairies
- `useMobilePositioning`: Mobile-specific positioning

**Menu components** (`fairy-ui/menus/`)

- `FairyContextMenuContent`: Right-click menu options
- `FairyMenuContent`: Main menu interface

**Sidebar components** (`fairy-ui/sidebar/`)

- `FairySidebarButton`: Sidebar toggle button
- `FairyListSidebar`: Fairy list in sidebar

**Other UI** (`fairy-ui/`)

- `FairyDebugDialog`: Debug interface (`fairy-ui/debug/`)
- `FairyProjectView`: Project view component (`fairy-ui/project/`)
- `FairyManualPanel`: User guide/manual panel (`fairy-ui/manual/`)

**Hooks** (`fairy-ui/hooks/`)

- `useFairyAgentChatHistory`: Chat history access
- `useFairyAgentChatOrigin`: Chat origin access

### Sprite system

**FairySprite** (`fairy-sprite/FairySprite.tsx`)

- Visual representation of fairies on canvas
- Animated sprites with multiple poses and keyframe animation
- SVG-based rendering at 108x108 viewBox

**Poses** (`FairyPose` type)

- `idle`: Default standing pose
- `active`: Active but not working
- `reading`: Reading documents
- `writing`: Writing/creating
- `thinking`: Deep thought pose
- `working`: Actively working on task
- `sleeping`: Dormant state
- `waiting`: Waiting for something
- `reviewing`: Reviewing work
- `panicking`: Error/panic state
- `poof`: Spawn/despawn animation

**Sprite parts** (`fairy-sprite/sprites/parts/`)

- `FairyBodySpritePart`: Main body
- `FairyFaceSpritePart`: Face expressions
- `FairyHatSpritePart`: Hat accessories
- `FairyLegsSpritePart`: Legs

**Wing sprites** (`fairy-sprite/sprites/WingsSprite.tsx`)

- `RaisedWingsSprite1/2/3`: High wing positions for active poses
- `LoweredWingsSprite1/2/3`: Low wing positions for passive poses
- Wing colors indicate project membership and role

**Other sprites**

- `IdleSprite`, `SleepingSprite`, `ThinkingSprite`
- `WorkingSprite1/2/3`: Working animation frames
- `ReadingSprite1/2/3`: Reading animation frames
- `WritingSprite1/2`: Writing animation frames
- `WaitingSprite/ReviewingSprite1/2/3`: Waiting states
- `PanickingSprite1/2`: Error animations
- `PoofSprite1/2/3/4`: Spawn/despawn effects
- `FairyReticleSprite`: Selection reticle
- `Avatar`: Avatar display component

**Animation**

- Frame durations vary by pose (65ms-160ms)
- `useKeyframe` hook manages animation timing
- Faster animation when generating (0.75x duration)

**Customization**

- Hat colors map to hat types (top, pointy, bald, antenna, etc.)
- Project color shown on wings
- Orchestrators have colored bottom wings
- `flipX` prop for directional facing

### Canvas UI components

**Canvas components** (`fairy-canvas-ui/`)

- `Fairies`: Container rendering all local fairies
- `RemoteFairies`: Handles fairies from other users
- `DebugFairyVision`: Debug overlay for fairy vision bounds

### Special tools

**FairyThrowTool** (`FairyThrowTool.tsx`)

- Allows throwing/moving fairies on canvas
- Integrated with select tool

### Helpers

**Name generation** (`fairy-helpers/getRandomFairyName.ts`)

- Generates unique fairy names

**Sign generation** (`fairy-helpers/getRandomFairySign.ts`)

- Creates fairy astrological signs

**Project colors** (`fairy-helpers/getProjectColor.ts`)

- Color coding for projects

**No-input messages** (`fairy-helpers/getRandomNoInputMessage.ts`)

- Messages when fairy has no input

### State management

**FairyApp state**

App-level state managed by `FairyApp`:

- `$isApplyingAction`: Whether any fairy is currently applying an action
- `$debugFlags`: Debug feature toggles (showTaskBounds)
- `$modelSelection`: Currently selected AI model

**App managers state**

Each app manager maintains its own reactive state, accessed via unified API:

- `fairyApp.agents.$agents`: List of all fairy agents
- `fairyApp.following.$followingFairyId`: ID of followed fairy
- `fairyApp.projects.$projects`: Active projects list
- `fairyApp.tasks.$tasks`: Shared task list

**Agent state**

Per-agent state managed by `FairyAgent`:

- `$fairyEntity`: Position, pose, selection, page
- `$fairyConfig`: Name, outfit, sign (from user settings)
- `$debugFlags`: Per-agent debug toggles
- `$useOneShottingMode`: Solo prompting behavior

**Persistence**

- Fairy state serialized via `fairyApp.persistence.serializeState()`
- Includes: all agent states, task list, projects
- Agent state includes: fairyEntity, chatHistory, chatOrigin, personalTodoList, waitingFor
- Restored via `fairyApp.persistence.loadState()`
- Auto-save via reactive watchers (throttled to 2 seconds)
- Configuration stored in user profile as `fairies` JSON

### Debug capabilities

**Debug flags**

- `logSystemPrompt`: Log system prompt to console
- `logMessages`: Log messages to console
- `logResponseTime`: Track AI response performance
- `showTaskBounds`: Display task bounds on canvas

**Debug dialog** (`FairyDebugDialog.tsx`)

- View internal fairy state
- Monitor active requests
- Inspect chat history
- Track mode transitions
- Performance metrics

### Internationalization

**Messages** (`fairy-messages.ts`)

Uses `defineMessages` for i18n support:

- Toolbar labels (fairies, select, deselect, close)
- Menu labels (go to, summon, follow, sleep, wake)
- Input placeholders (speak to fairy, enter message)
- Action labels (stop, send, clear)

### Backend integration

- Communicates with `FAIRY_WORKER` endpoint
- Authentication via `getToken`
- Streaming responses for real-time generation via SSE
- Model selection support

## Usage patterns

### Creating the fairy app

```typescript
// Via React provider (recommended)
<FairyAppProvider fileId={fileId} onMount={handleMount} onUnmount={handleUnmount}>
	<FairyHUD />
</FairyAppProvider>

// Access via hook
const fairyApp = useFairyApp()
```

### Creating a fairy agent

Agents are created automatically by `FairyAppAgentsManager.syncAgentsWithConfigs()` based on user's fairy configs. Manual creation:

```typescript
const fairy = new FairyAgent({
	id: uniqueId,
	fairyApp: fairyApp,
	editor: editor,
	onError: handleError,
	getToken: authTokenProvider,
})
```

### Prompting a fairy

```typescript
// Basic prompt
fairy.prompt({
	message: 'Draw a flowchart',
})

// With spatial bounds
fairy.prompt({
	message: 'Work in this area',
	bounds: { x: 100, y: 100, w: 500, h: 500 },
})
```

### Scheduling follow-up work

```typescript
// Add an instruction
fairy.schedule('Continue working on the diagram')

// Schedule with specific data
fairy.schedule({
	message: 'Review changes',
	data: ['Shape xyz was modified'],
})
```

### Interrupting a fairy

```typescript
// Cancel and switch mode
fairy.interrupt({
	mode: 'idling',
	input: { message: 'Stop and wait' },
})

// Just cancel current work
fairy.interrupt({ input: null })
```

### Custom actions

```typescript
class CustomActionUtil extends AgentActionUtil<CustomAction> {
	static override type = 'custom' as const

	override getInfo(action) {
		return { icon: 'star', description: action.description, pose: 'working' }
	}

	override sanitizeAction(action, helpers) {
		// Validate and transform action
		return action
	}

	override applyAction(action, helpers) {
		// Execute action on canvas
		this.editor.createShape(/* ... */)
	}
}
```

### Custom prompt parts

```typescript
class CustomPartUtil extends PromptPartUtil<CustomPart> {
	static type = 'custom-context' as const

	getPart(request, helpers) {
		return {
			type: 'custom-context',
			data: this.editor.getSelectedShapeIds(),
		}
	}
}
```

### Working with projects

```typescript
// Projects are typically started via StartProjectActionUtil
// But can be managed programmatically via fairyApp:
fairyApp.projects.disbandProject(projectId)
fairyApp.projects.resumeProject(projectId)

// Task management
fairyApp.tasks.createTask({ id, title, projectId })
fairyApp.tasks.setTaskStatusAndNotify(taskId, 'done')
```

### Camera following

```typescript
// Start following a fairy
fairyApp.following.startFollowing(fairyId)

// Stop following
fairyApp.following.stopFollowing()

// Check if following
fairyApp.following.isFollowing()
```

## Key features

- **Visual AI agents**: Sprites that move and interact on canvas
- **Multi-modal understanding**: Process visual and text inputs
- **Collaborative work**: Multiple fairies working together on projects
- **Task management**: Create, assign, and track tasks
- **Canvas manipulation**: Full CRUD operations on shapes
- **Page navigation**: Multi-page document support
- **Personality system**: Each fairy has unique traits and sign
- **Debug tools**: Comprehensive debugging interface
- **Project resumption**: Intelligent recovery from interruptions
- **Internationalization**: Full i18n support for UI strings
- **State persistence**: Auto-save and restore fairy state per file


# ==========================================
# FILE: apps/dotcom/fairy-worker/CONTEXT.md
# ==========================================

# Fairy Worker Context

## Overview

The `fairy-worker` (also known as `dotcom-fairy-worker`) is a Cloudflare Worker that provides AI agent interaction capabilities for tldraw. It handles streaming responses from AI agents that can interact with tldraw drawings, enabling AI-powered features like drawing assistants, automated sketching, and intelligent canvas interactions.

## Architecture

### Core Components

The fairy-worker consists of a main worker and a specialized Durable Object:

#### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates agent interactions to Durable Objects.

```typescript
export default class extends WorkerEntrypoint<Environment> {
	override fetch(request: Request): Promise<Response> {
		return router.fetch(request, this.env, this.ctx)
	}
}
```

The worker handles:

- POST /stream - Main endpoint for AI agent streaming responses
- CORS configuration for cross-origin requests
- Request routing to the appropriate Durable Object

#### AgentDurableObject - Agent Session Management

Manages individual AI agent sessions and their interactions with tldraw:

```typescript
export class AgentDurableObject extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		// Handle agent requests with streaming responses
		// Process tldraw action streams
		// Manage agent state and context
	}
}
```

The Durable Object provides:

- Persistent agent sessions
- Streaming response handling
- Integration with AI providers (OpenAI, Anthropic, Google)
- State management for agent interactions

### Request Flow

1. Client sends POST request to `/stream` with agent request data
2. Worker routes request to `AgentDurableObject` using a session identifier
3. Durable Object processes the request and streams responses back
4. Responses are formatted as Server-Sent Events (SSE) for real-time updates

## Core Responsibilities

### 1. AI Agent Management

- **Session Management**: Each agent session is isolated in its own Durable Object instance
- **State Persistence**: Agent context and conversation history maintained across requests
- **Multi-Provider Support**: Integration with OpenAI, Anthropic, and Google AI services

### 2. Streaming Responses

The worker provides real-time streaming of AI responses:

```typescript
// Streaming response with Server-Sent Events
return new Response(responseBody, {
	headers: {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	},
})
```

### 3. tldraw Integration

The agent can:

- Read and understand tldraw canvas state
- Generate drawing actions (pen strokes, shapes, etc.)
- Respond to user queries about drawings
- Provide intelligent drawing assistance

## Environment Configuration

### Required Environment Variables

```typescript
export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	FAIRY_MODEL: string
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	CLERK_SECRET_KEY: string
	CLERK_PUBLISHABLE_KEY: string
}
```

### Deployment Configuration

The worker runs as a completely independent service configured via `wrangler.toml`:

```toml
name = "fairydraw"
main = "src/worker.ts"
compatibility_date = "2024-12-30"

[dev]
port = 8789  # Runs on port 8789 in development

[env.dev]
name = "fairydraw-dev"

[env.staging]
name = "fairydraw-staging"
route = { pattern = "staging-fairy.tldraw.xyz", custom_domain = true }

[env.production]
name = "fairydraw"
route = { pattern = "fairy.tldraw.xyz", custom_domain = true }

[durable_objects]
bindings = [
    { name = "AGENT_DURABLE_OBJECT", class_name = "AgentDurableObject" },
]
```

## Dependencies

**Core tldraw packages:**

- `@tldraw/fairy-shared` - Shared utilities and types
- `@tldraw/worker-shared` - Shared worker utilities

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers runtime and APIs
- Durable Objects for stateful sessions

## Development

```bash
# Start local development server
yarn dev  # Runs on localhost with inspector on port 9559

# Run tests
yarn test

# Type checking
yarn typecheck

# Linting
yarn lint
```

## Key Features

### AI-Powered Drawing Assistance

- **Natural Language Understanding**: Interpret user requests about drawings
- **Drawing Generation**: Create shapes, strokes, and compositions
- **Contextual Awareness**: Understand existing canvas content
- **Real-time Feedback**: Stream responses as they're generated

### Scalability and Performance

- **Edge Deployment**: Runs globally on Cloudflare's edge network
- **Durable Object Isolation**: Each session gets its own compute instance
- **Streaming Architecture**: Low latency with progressive responses
- **Automatic Scaling**: Handles traffic spikes seamlessly

### Security

- **CORS Support**: Configurable cross-origin access
- **API Key Management**: Secure storage of AI provider credentials
- **Session Isolation**: Each agent session is isolated from others

## Integration with tldraw

The fairy-worker runs independently from the sync-worker, with its own endpoints:

- **Development**: `http://localhost:8789/stream`
- **Staging**: `https://staging-fairy.tldraw.xyz/stream`
- **Production**: `https://fairy.tldraw.xyz/stream`

Client-side integration example:

```typescript
// Client-side integration
const agentUrl =
	process.env.NODE_ENV === 'production'
		? 'https://fairy.tldraw.xyz/stream'
		: 'http://localhost:8789/stream'

const response = await fetch(agentUrl, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		messages: conversationHistory,
		canvasState: editor.store.serialize(),
	}),
})

// Handle streaming responses
const reader = response.body.getReader()
for await (const chunk of readStream(reader)) {
	// Process agent actions
	applyAgentAction(chunk)
}
```

## Service Architecture

The fairy-worker operates as a completely independent service:

```
tldraw Agent Template (Client)
        ↓
fairy-worker:8789 (AI Agent) [Independent Service]
├── AgentDurableObject (Session management)
└── AI Providers (OpenAI, Anthropic, Google)
        ↓
    Streaming Response
        ↓
    tldraw Canvas Updates

Note: Runs separately from sync-worker
- Development: localhost:8789
- Production: fairy.tldraw.xyz
```

The fairy-worker enables AI-powered features in tldraw by providing a scalable, real-time agent interaction service that bridges natural language understanding with canvas manipulation.


# ==========================================
# FILE: apps/dotcom/image-resize-worker/CONTEXT.md
# ==========================================

# Image Resize Worker Context

## Overview

The `image-resize-worker` is a Cloudflare Worker that provides on-demand image resizing and optimization services for tldraw.com. It acts as a reverse proxy that leverages Cloudflare's built-in Image Resizing service to dynamically transform and optimize images while providing intelligent caching and format conversion.

## Architecture

### Core functionality (`worker.ts`)

The worker implements a URL-based image transformation service:

#### Request flow

```typescript
// URL Pattern: /:origin/:path+ with optional query params
// Example: /localhost:3000/uploads/abc123.png?w=600&q=80

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter().get('/:origin/:path+', async (request) => {
		const { origin, path } = request.params
		const query = parseRequestQuery(request, queryValidator)

		// Validate origin domain
		if (!this.isValidOrigin(origin)) return notFound()

		// Determine optimal format (AVIF > WebP > original)
		const accept = request.headers.get('Accept') ?? ''
		const format = accept.includes('image/avif')
			? 'avif'
			: accept.includes('image/webp')
				? 'webp'
				: null

		// Build cache key and check cache
		const cacheKey = buildCacheKey(origin, path, query, format)
		const cachedResponse = await caches.default.match(cacheKey)
		if (cachedResponse) return handleCachedResponse(cachedResponse, request)

		// Apply image transformations
		const imageOptions = buildImageOptions(query, format)
		const response = await fetchWithTransformations(origin, path, imageOptions)

		// Cache successful responses
		if (response.status === 200) {
			this.ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
		}

		return response
	})
}
```

### Image transformation options

The worker supports Cloudflare's Image Resizing parameters:

#### Query parameters

```typescript
const queryValidator = T.object({
	w: T.string.optional(), // Width in pixels
	q: T.string.optional(), // Quality (1-100)
})

// Applied as Cloudflare image options
const imageOptions: RequestInitCfPropertiesImage = {
	fit: 'scale-down', // Never upscale images
	width: query.w ? Number(query.w) : undefined,
	quality: query.q ? Number(query.q) : undefined,
	format: format || undefined, // AVIF, WebP, or original
}
```

#### Smart format selection

Automatic format optimization based on browser capabilities:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif' // Best compression
	: accept.includes('image/webp')
		? 'webp' // Good compression
		: null // Original format
```

### Origin validation system

Security mechanism to prevent abuse by validating request origins:

#### Development mode

```typescript
isValidOrigin(origin: string) {
  if (this.env.IS_LOCAL) {
    return true // Allow all origins in local development
  }

  return (
    origin.endsWith('.tldraw.com') ||
    origin.endsWith('.tldraw.xyz') ||
    origin.endsWith('.tldraw.dev') ||
    origin.endsWith('.tldraw.workers.dev')
  )
}
```

### Routing architecture

Two distinct routing modes based on origin:

#### Service binding mode

For internal tldraw services (multiplayer server):

```typescript
if (useServiceBinding(this.env, origin)) {
	const route = `/${path}`

	// Only allow asset upload endpoints
	if (!route.startsWith(APP_ASSET_UPLOAD_ENDPOINT)) {
		return notFound()
	}

	// Route through service binding to sync worker
	const req = new Request(passthroughUrl.href, { cf: { image: imageOptions } })
	actualResponse = await this.env.SYNC_WORKER.fetch(req)
}
```

#### External fetch mode

For direct image URLs from validated origins:

```typescript
else {
  // Direct fetch with image transformations
  actualResponse = await fetch(passthroughUrl, { cf: { image: imageOptions } })
}
```

### Caching strategy

Multi-layer caching for optimal performance:

#### Cache key generation

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

#### ETag handling

Proper HTTP caching with ETag support:

```typescript
// Handle cached responses with ETag validation
if (cachedResponse.status === 200) {
	const ifNoneMatch = request.headers.get('If-None-Match')
	const etag = cachedResponse.headers.get('etag')

	if (ifNoneMatch && etag) {
		const parsedEtag = parseEtag(etag)
		for (const tag of ifNoneMatch.split(', ')) {
			if (parseEtag(tag) === parsedEtag) {
				return new Response(null, { status: 304 }) // Not Modified
			}
		}
	}
}

function parseEtag(etag: string) {
	const match = etag.match(/^(?:W\/)"(.*)"$/)
	return match ? match[1] : null
}
```

## Environment configuration

### Worker environment interface

```typescript
interface Environment {
	IS_LOCAL?: string // Development mode flag
	SENTRY_DSN?: undefined // Error tracking (disabled)
	MULTIPLAYER_SERVER?: string // Service binding configuration
	SYNC_WORKER: Fetcher // Service binding to sync worker
}
```

### Deployment configuration (`wrangler.toml`)

Multi-environment setup for different stages:

#### Development environment

```toml
[env.dev]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

#### Staging environment

```toml
[env.staging]
name = "staging-image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "main-tldraw-multiplayer" }]
route = { pattern = "staging-images.tldraw.xyz", custom_domain = true }
```

#### Production environment

```toml
[env.production]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "tldraw-multiplayer" }]
route = { pattern = "images.tldraw.xyz", custom_domain = true }
```

## Dependencies

### Core worker libraries

- **@tldraw/worker-shared**: Request handling, routing, and error management utilities
- **@tldraw/dotcom-shared**: Shared constants and configurations (APP_ASSET_UPLOAD_ENDPOINT)
- **@tldraw/validate**: Type-safe input validation for query parameters
- **itty-router**: Lightweight HTTP routing for Cloudflare Workers

### Development dependencies

- **@cloudflare/workers-types**: TypeScript definitions for Workers APIs
- **wrangler**: Cloudflare Workers CLI and deployment tool

## Key features

### Image optimization

**Format conversion**: Automatic AVIF/WebP conversion based on browser support
**Quality control**: Adjustable quality settings (1-100)
**Size control**: Width-based resizing with scale-down protection
**Compression**: Cloudflare's optimized image processing pipeline

### Performance optimization

**Global caching**: Leverages Cloudflare's global cache network
**ETag support**: Proper HTTP caching with conditional requests
**Edge processing**: Image transformation at edge locations
**Service bindings**: Direct worker-to-worker communication for internal requests

### Security

**Origin validation**: Whitelist of allowed domains to prevent abuse
**Path filtering**: Asset upload endpoint validation for service bindings
**Content type validation**: Ensures responses are actual images
**No upscaling**: Prevents resource abuse with fit: 'scale-down'

## Usage patterns

### Basic image resizing

Transform any image from a valid origin:

```
GET /assets.tldraw.com/uploads/abc123.png?w=600&q=80
```

Response: Resized image at 600px width with 80% quality

### Format optimization

Browser automatically receives optimal format:

```typescript
// Request with Accept: image/avif,image/webp,image/*
GET / assets.tldraw.com / image.jpg

// Response: AVIF format (best compression) if supported
// Fallback: WebP format if AVIF not supported
// Fallback: Original JPEG format
```

### Asset upload integration

Works with tldraw's multiplayer asset system:

```typescript
// Internal routing through sync worker
GET /localhost:3000/api/uploads/asset-uuid?w=400

// Routes to: SYNC_WORKER.fetch('/api/uploads/asset-uuid', {
//   cf: { image: { width: 400, fit: 'scale-down' } }
// })
```

## Integration with tldraw ecosystem

### Asset pipeline

The image-resize-worker is part of tldraw's asset management system:

```
User Upload -> Sync Worker -> R2 Storage
     ↓
Image Request -> Image Resize Worker -> Optimized Delivery
```

### Service architecture

```
tldraw.com (Client)
├── sync-worker (Asset uploads, multiplayer)
├── image-resize-worker (Image optimization)
└── assets.tldraw.com (CDN delivery)
```

### URL structure

Different URL patterns for different use cases:

- **Direct assets**: `/assets.tldraw.com/uploads/file.png`
- **Multiplayer assets**: `/localhost:3000/api/uploads/file.png`
- **Published content**: Various origins ending in `.tldraw.com`

## Error handling

### Validation errors

- **Invalid origin**: Returns 404 for non-whitelisted domains
- **Invalid path**: Returns 404 for non-asset paths in service binding mode
- **Invalid content**: Returns 404 for non-image responses

### Graceful degradation

- **Cache miss**: Falls back to origin fetch with transformations
- **Transformation failure**: May return original image or error
- **Service binding failure**: Falls back to direct fetch mode

## Performance characteristics

### Cloudflare edge benefits

- **Global distribution**: Processing at 200+ edge locations worldwide
- **Low latency**: Image transformation close to users
- **High throughput**: Automatic scaling based on demand
- **Bandwidth optimization**: Format conversion reduces transfer sizes

### Caching efficiency

- **Cache hit rate**: High hit rate due to consistent cache keys
- **Cache duration**: Leverages browser and CDN caching
- **Cache invalidation**: ETag-based validation for freshness

## Development and testing

### Local development

```bash
yarn dev  # Starts worker with inspector on port 9339
```

### Testing

```bash
yarn test           # Run unit tests
yarn test-coverage  # Run with coverage reporting
yarn lint          # Code linting
```

### Deployment

Each environment is deployed separately:

- Development: Manual deployment for testing
- Staging: Automatic deployment for QA
- Production: Controlled deployment with rollback capability

## Key benefits

### User experience

- **Faster loading**: Optimized images load faster
- **Bandwidth savings**: Modern formats reduce data usage
- **Responsive images**: Width-based resizing for different screen sizes
- **Universal compatibility**: Fallback to supported formats

### Developer experience

- **Simple API**: URL-based transformation parameters
- **Type safety**: Full TypeScript support with validation
- **Easy integration**: Works with existing asset upload systems
- **Monitoring**: Built-in error handling and logging

### Operations

- **Scalability**: Automatic scaling with zero configuration
- **Reliability**: Global redundancy and failover capabilities
- **Cost efficiency**: Pay-per-request pricing with caching benefits
- **Maintenance**: Minimal operational overhead


# ==========================================
# FILE: apps/dotcom/sync-worker/CONTEXT.md
# ==========================================

# Sync Worker Context

## Overview

The `sync-worker` (also known as `@tldraw/dotcom-worker`) is the core multiplayer synchronization service for tldraw.com. It handles real-time collaboration, room management, file persistence, user authentication, and data synchronization across all tldraw applications. The worker operates as a distributed system using Cloudflare Workers and Durable Objects to provide scalable, low-latency collaboration worldwide.

## Architecture

### Core components

The sync-worker consists of several specialized Durable Objects and services:

#### TLDrawDurableObject - room management

The primary collaboration engine that manages individual drawing rooms:

```typescript
export class TLDrawDurableObject extends DurableObject {
	private _room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	// Handles WebSocket connections and real-time synchronization
	async onRequest(req: IRequest, openMode: RoomOpenMode) {
		// Create WebSocket pair for client communication
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		// Validate authentication and permissions
		const auth = await getAuth(req, this.env)

		// Configure room access mode (read-write, read-only, etc.)
		const room = await this.getRoom()
		room.handleSocketConnect({
			sessionId,
			socket: serverWebSocket,
			meta: { storeId, userId: auth?.userId || null },
			isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
		})
	}
}
```

#### TLUserDurableObject - user data synchronization

Manages individual user data and application-level state:

```typescript
export class TLUserDurableObject extends DurableObject<Environment> {
	private cache: UserDataSyncer | null = null

	// Handles user-specific data synchronization with Zero/Rocicorp
	// Manages user preferences, file lists, and collaborative state
}
```

#### TLPostgresReplicator - database synchronization

Replicates PostgreSQL database changes to user Durable Objects:

```typescript
export class TLPostgresReplicator extends DurableObject<Environment> {
	// Uses PostgreSQL logical replication to stream database changes
	// Distributes changes to relevant user Durable Objects
	// Ensures eventual consistency across the distributed system
}
```

### Request routing system

The worker handles multiple types of requests through a comprehensive routing system:

#### Legacy room routes

```typescript
// Read-write collaborative rooms
.get(`/${ROOM_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_WRITE)
)

// Read-only room access
.get(`/${READ_ONLY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY)
)

// Legacy read-only rooms
.get(`/${READ_ONLY_LEGACY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
)
```

#### Modern app routes

```typescript
// TLA (Tldraw App) file collaboration
.get('/app/file/:roomId', (req, env) => {
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return forwardRoomRequest(req, env)
  }
})

// User data synchronization
.get('/app/:userId/connect', async (req, env) => {
  const auth = await getAuth(req, env)
  const stub = getUserDurableObject(env, auth.userId)
  return stub.fetch(req)
})
```

#### Asset management

```typescript
// Asset uploads
.post('/app/uploads/:objectName', upload)

// Asset retrieval with optimization
.get('/app/uploads/:objectName', async (request, env, ctx) => {
  return handleUserAssetGet({
    request,
    bucket: env.UPLOADS,
    objectName: request.params.objectName,
    context: ctx,
  })
})
```

#### API endpoints

```typescript
// File creation and management
.post('/app/tldr', createFiles)

// Bookmark metadata extraction
.get('/unfurl', extractBookmarkMetadata)

// Room snapshots and history
.post('/snapshots', createRoomSnapshot)
.get('/snapshot/:roomId', getRoomSnapshot)
```

## Data persistence architecture

### Multi-layer storage system

The sync-worker uses a sophisticated multi-layer storage approach:

#### R2 object storage

Primary storage for room data and history:

```typescript
const r2 = {
  rooms: env.ROOMS,                    // Main room snapshots
  versionCache: env.ROOMS_HISTORY_EPHEMERAL, // Version history
}

// Persist room snapshot with version history
async persistToDatabase() {
  const snapshot = room.getCurrentSnapshot()
  const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })

  // Upload to main bucket
  await this.r2.rooms.put(key, JSON.stringify(snapshot))

  // Upload to version cache with timestamp
  const versionKey = `${key}/${new Date().toISOString()}`
  await this.r2.versionCache.put(versionKey, JSON.stringify(snapshot))
}
```

#### PostgreSQL database

Structured data for users, files, and metadata:

```typescript
// File metadata
const file = table('file').columns({
	id: string(),
	name: string(),
	ownerId: string(),
	shared: boolean(),
	published: boolean(),
	createdAt: number(),
	updatedAt: number(),
})

// User preferences and state
const user = table('user').columns({
	id: string(),
	name: string(),
	email: string(),
	preferences: string(), // JSON blob
})
```

#### Durable object storage

Cached state and session data:

```typescript
// Document metadata cached in DO storage
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	deleted: boolean
}
```

### Persistence strategy

The worker implements intelligent persistence with configurable intervals:

```typescript
const PERSIST_INTERVAL_MS = 8_000 // 8 seconds

// Throttled persistence to avoid excessive writes
triggerPersist = throttle(() => {
	this.persistToDatabase()
}, PERSIST_INTERVAL_MS)
```

## Real-time collaboration

### WebSocket communication

The worker manages WebSocket connections for real-time collaboration:

#### Connection establishment

```typescript
// Upgrade HTTP request to WebSocket
const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
serverWebSocket.accept()

// Validate authentication and permissions
const auth = await getAuth(req, this.env)
if (this.documentInfo.isApp && !file.shared && !auth) {
	return closeSocket(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
}

// Connect to room with appropriate permissions
room.handleSocketConnect({
	sessionId,
	socket: serverWebSocket,
	meta: { storeId, userId: auth?.userId || null },
	isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
})
```

#### Message handling

```typescript
// Real-time message processing and broadcasting
onBeforeSendMessage: ({ message, stringified }) => {
	this.logEvent({
		type: 'send_message',
		roomId: slug,
		messageType: message.type,
		messageLength: stringified.length,
	})
}
```

#### Session management

```typescript
// Automatic cleanup when users disconnect
onSessionRemoved: async (room, args) => {
	// Log user departure
	this.logEvent({
		type: 'client',
		roomId: slug,
		name: 'leave',
		instanceId: args.sessionId,
	})

	// Persist room state if last user
	if (args.numSessionsRemaining === 0) {
		await this.persistToDatabase()
		this._room = null
		room.close()
	}
}
```

### Conflict resolution

The worker uses tldraw's sync system for operational transformation:

- **Clock-based versioning**: Each change has a logical clock timestamp
- **Last-write-wins**: Simple conflict resolution for most operations
- **Presence tracking**: Real-time cursor and selection synchronization
- **Undo/redo support**: Complete operation history maintenance

## Authentication and authorization

### Multi-provider authentication

The worker supports multiple authentication providers:

#### Clerk integration

```typescript
// JWT-based authentication with Clerk
const auth = await getAuth(req, env)
if (auth) {
	// User is authenticated
	userId = auth.userId
}
```

#### Permission system

```typescript
// File-based permissions
if (file.ownerId !== auth?.userId) {
	if (!file.shared) {
		return closeSocket(TLSyncErrorCloseEventReason.FORBIDDEN)
	}
	if (file.sharedLinkType === 'view') {
		openMode = ROOM_OPEN_MODE.READ_ONLY
	}
}
```

#### Rate limiting

```typescript
// Per-user rate limiting
const rateLimited = await isRateLimited(this.env, userId)
if (rateLimited) {
	return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
}
```

## File management system

### File lifecycle

The worker manages the complete file lifecycle:

#### File creation

```typescript
// Create new tldraw files
async createFiles(req: IRequest, env: Environment) {
  const body = await req.json() as CreateFilesRequestBody
  const auth = await requireAuth(req, env)

  for (const snapshot of body.snapshots) {
    const fileId = uniqueId()
    const slug = generateSlug()

    // Create file record in database
    await db.insertInto('file').values({
      id: fileId,
      name: snapshot.name || 'Untitled',
      ownerId: auth.userId,
      slug,
      shared: false,
    }).execute()

    // Initialize room with snapshot data
    const room = getRoomDurableObject(env, fileId)
    await room.appFileRecordCreated(fileRecord)
  }
}
```

#### File updates

```typescript
// Automatic file updates when room changes
async appFileRecordDidUpdate(file: TlaFile) {
  const room = await this.getRoom()

  // Sync file name with document name
  const documentRecord = room.getRecord(TLDOCUMENT_ID) as TLDocument
  if (documentRecord.name !== file.name) {
    room.updateStore((store) => {
      store.put({ ...documentRecord, name: file.name })
    })
  }

  // Handle permission changes
  if (!file.shared) {
    // Kick out non-owners if file becomes private
    for (const session of room.getSessions()) {
      if (session.meta.userId !== file.ownerId) {
        room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.FORBIDDEN)
      }
    }
  }
}
```

#### File deletion

```typescript
// Soft deletion with cleanup
async appFileRecordDidDelete({ id, publishedSlug }: Pick<TlaFile, 'id' | 'publishedSlug'>) {
  // Close all active sessions
  const room = await this.getRoom()
  for (const session of room.getSessions()) {
    room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
  }

  // Clean up storage
  await this.env.ROOMS.delete(getR2KeyForRoom({ slug: id, isApp: true }))
  await this.env.ROOMS_HISTORY_EPHEMERAL.delete(historyKeys)
  await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)
}
```

### Asset management

#### Asset upload pipeline

```typescript
// Handle asset uploads with queue processing
.post('/app/uploads/:objectName', async (request, env) => {
  const objectName = request.params.objectName
  const auth = await requireAuth(request, env)

  // Upload to R2 bucket
  await env.UPLOADS.put(objectName, request.body)

  // Queue asset association
  await env.QUEUE.send({
    type: 'asset-upload',
    objectName,
    fileId: extractFileId(request),
    userId: auth.userId,
  })
})

// Process queue messages
async queue(batch: MessageBatch<QueueMessage>) {
  for (const message of batch.messages) {
    const { objectName, fileId, userId } = message.body

    // Associate asset with file in database
    await db.insertInto('asset').values({
      objectName,
      fileId,
      userId,
    }).execute()

    message.ack()
  }
}
```

### Publishing system

```typescript
// Publish files for public access
async publishFile(fileId: string, auth: AuthData) {
  const file = await getFileRecord(fileId)
  if (file.ownerId !== auth.userId) {
    throw new Error('Unauthorized')
  }

  const publishedSlug = generateSlug()

  // Update file record
  await db.updateTable('file').set({
    published: true,
    publishedSlug,
    lastPublished: Date.now(),
  }).where('id', '=', fileId).execute()

  // Create snapshot for published version
  const room = getRoomDurableObject(env, fileId)
  const snapshot = room.getCurrentSnapshot()
  await env.ROOM_SNAPSHOTS.put(
    getR2KeyForRoom({ slug: `${fileId}/${publishedSlug}`, isApp: true }),
    JSON.stringify(snapshot)
  )
}
```

## Environment configuration

### Multi-environment setup

The worker supports multiple deployment environments:

#### Development environment

```toml
[env.dev]
name = "dev-tldraw-multiplayer"
vars.TLDRAW_ENV = "development"
vars.MULTIPLAYER_SERVER = "http://localhost:3000"
```

#### Staging environment

```toml
[env.staging]
name = "main-tldraw-multiplayer"

[[env.staging.routes]]
zone_name = "tldraw.com"
pattern = "staging.tldraw.com/api/*"
```

#### Production environment

```toml
[env.production]
name = "tldraw-multiplayer"

[[env.production.routes]]
zone_name = "tldraw.com"
pattern = "www.tldraw.com/api/*"
```

### Durable object configuration

All environments use the same Durable Object setup:

```toml
[durable_objects]
bindings = [
  { name = "TLDR_DOC", class_name = "TLDrawDurableObject" },
  { name = "TL_PG_REPLICATOR", class_name = "TLPostgresReplicator" },
  { name = "TL_USER", class_name = "TLUserDurableObject" },
  { name = "TL_LOGGER", class_name = "TLLoggerDurableObject" },
  { name = "TL_STATS", class_name = "TLStatsDurableObject" },
]
```

### Storage bindings

Environment-specific storage configurations:

```toml
# R2 Buckets for different data types
[[env.production.r2_buckets]]
binding = "ROOMS"                    # Main room data
bucket_name = "rooms"

[[env.production.r2_buckets]]
binding = "ROOMS_HISTORY_EPHEMERAL"  # Version history
bucket_name = "rooms-history-ephemeral"

[[env.production.r2_buckets]]
binding = "UPLOADS"                  # User assets
bucket_name = "uploads"

# KV Namespaces for metadata
[[env.production.kv_namespaces]]
binding = "SLUG_TO_READONLY_SLUG"
id = "2fb5fc7f7ca54a5a9dfae1b07a30a778"
```

## Data synchronization system

### Zero/Rocicorp integration

The worker uses Zero (Rocicorp) for client-server data synchronization:

#### Schema definition

```typescript
// Shared schema between client and server
const schema = {
	version: 1,
	tables: {
		user: table('user').columns({
			id: string(),
			name: string(),
			preferences: string(),
		}),
		file: table('file').columns({
			id: string(),
			name: string(),
			ownerId: string(),
			shared: boolean(),
		}),
	},
}
```

#### Mutation system

```typescript
// Type-safe mutations with validation
const mutators = createMutators(userId)
	// Client sends mutations to server
	.post('/app/zero/push', async (req, env) => {
		const auth = await requireAuth(req, env)
		const processor = new PushProcessor(
			new ZQLDatabase(new PostgresJSConnection(makePostgresConnector(env)), schema),
			'debug'
		)
		const result = await processor.process(createMutators(auth.userId), req)
		return json(result)
	})
```

#### Real-time replication

```typescript
// PostgreSQL logical replication to Durable Objects
export class TLPostgresReplicator extends DurableObject<Environment> {
	private readonly replicationService = new LogicalReplicationService(/*...*/)

	// Stream database changes to user Durable Objects
	async handleReplicationEvent(event: ReplicationEvent) {
		for (const change of event.changes) {
			const affectedUsers = extractAffectedUsers(change)

			for (const userId of affectedUsers) {
				const userDO = getUserDurableObject(this.env, userId)
				await userDO.handleReplicationEvent(change)
			}
		}
	}
}
```

### Conflict resolution strategy

```typescript
// Optimistic updates with server reconciliation
class UserDataSyncer {
	// Apply optimistic changes immediately
	async applyOptimisticUpdate(mutation: Mutation) {
		this.optimisticUpdates.push(mutation)
		this.broadcastChange(mutation)
	}

	// Reconcile with server state
	async handleReplicationEvent(event: ReplicationEvent) {
		// Remove confirmed optimistic updates
		this.optimisticUpdates = this.optimisticUpdates.filter(
			(update) => !event.confirmedMutations.includes(update.id)
		)

		// Apply server changes
		for (const change of event.changes) {
			this.applyServerChange(change)
		}
	}
}
```

## Performance optimizations

### Caching strategy

Multiple layers of caching for optimal performance:

#### Durable object state caching

```typescript
// Cache frequently accessed data in DO memory
class TLDrawDurableObject {
	private _fileRecordCache: TlaFile | null = null

	async getAppFileRecord(): Promise<TlaFile | null> {
		if (this._fileRecordCache) {
			return this._fileRecordCache
		}

		// Fetch from database with retries
		const result = await retry(
			async () => {
				return await this.db
					.selectFrom('file')
					.where('id', '=', this.documentInfo.slug)
					.selectAll()
					.executeTakeFirst()
			},
			{ attempts: 10, waitDuration: 100 }
		)

		this._fileRecordCache = result
		return result
	}
}
```

#### Connection pooling

```typescript
// Efficient database connection management
const pool = new Pool({
	connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
	application_name: 'sync-worker',
	max: 5, // Maximum connections per DO
	idleTimeoutMillis: 30_000,
})

const db = new Kysely<DB>({
	dialect: new PostgresDialect({ pool }),
})
```

#### Throttled persistence

```typescript
// Batch database writes to reduce load
const triggerPersist = throttle(() => {
  this.persistToDatabase()
}, PERSIST_INTERVAL_MS)

// Only persist if room state actually changed
async persistToDatabase() {
  const room = await this.getRoom()
  const clock = room.getCurrentDocumentClock()

  if (this._lastPersistedClock === clock) {
    return // No changes since last persist
  }

  // Persist to R2 with version history
  await this._uploadSnapshotToR2(room, snapshot, key)
  this._lastPersistedClock = clock
}
```

### Memory management

```typescript
// Automatic resource cleanup
onSessionRemoved: async (room, args) => {
	if (args.numSessionsRemaining === 0) {
		// Persist final state
		await this.persistToDatabase()

		// Clean up room resources
		this._room = null
		room.close()

		// Log room closure
		this.logEvent({ type: 'room', roomId: slug, name: 'room_empty' })
	}
}
```

### Scalability features

#### Connection limits

```typescript
const MAX_CONNECTIONS = 50

// Prevent room overload
if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
	return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
}
```

#### Rate limiting

```typescript
// Global rate limiting per user/session
async function isRateLimited(env: Environment, identifier: string): Promise<boolean> {
	const result = await env.RATE_LIMITER.limit({ key: identifier })
	return !result.success
}
```

## Error handling and monitoring

### Comprehensive error tracking

#### Sentry integration

```typescript
// Automatic error reporting with context
const sentry = createSentry(this.ctx, this.env, request)

try {
	return await this.router.fetch(req)
} catch (err) {
	console.error(err)
	sentry?.captureException(err)
	return new Response('Something went wrong', { status: 500 })
}
```

#### Analytics and metrics

```typescript
// Real-time analytics with Cloudflare Analytics Engine
logEvent(event: TLServerEvent) {
  switch (event.type) {
    case 'client':
      this.writeEvent(event.name, {
        blobs: [event.roomId, event.instanceId],
        indexes: [event.localClientId],
      })
      break
    case 'send_message':
      this.writeEvent('send_message', {
        blobs: [event.roomId, event.messageType],
        doubles: [event.messageLength],
      })
      break
  }
}
```

#### Health monitoring

```typescript
// Health check endpoints
.get('/app/replicator-status', async (_, env) => {
  await getReplicator(env).ping()
  return new Response('ok')
})

// Debug logging in development
.get('/app/__debug-tail', (req, env) => {
  if (isDebugLogging(env)) {
    return getLogger(env).fetch(req)
  }
  return new Response('Not Found', { status: 404 })
})
```

### Graceful degradation

```typescript
// Fallback strategies for various failure modes
async loadFromDatabase(slug: string): Promise<DBLoadResult> {
  try {
    // Try R2 first
    const roomFromBucket = await this.r2.rooms.get(key)
    if (roomFromBucket) {
      return { type: 'room_found', snapshot: await roomFromBucket.json() }
    }

    // Fallback to Supabase (legacy)
    const { data, error } = await this.supabaseClient
      .from(this.supabaseTable)
      .select('*')
      .eq('slug', slug)

    if (error) {
      return { type: 'error', error: new Error(error.message) }
    }

    return data.length > 0
      ? { type: 'room_found', snapshot: data[0].drawing }
      : { type: 'room_not_found' }

  } catch (error) {
    return { type: 'error', error: error as Error }
  }
}
```

## Key features

### Real-time collaboration

- **WebSocket-based communication**: Low-latency bidirectional communication
- **Operational transformation**: Conflict-free collaborative editing
- **Presence tracking**: Real-time cursors and user awareness
- **Session management**: Automatic cleanup and resource management

### Distributed architecture

- **Edge computing**: Deployed globally on Cloudflare Workers
- **Durable Objects**: Stateful, location-pinned computing units
- **Multi-layer caching**: Memory, KV, and R2 storage optimization
- **Database replication**: PostgreSQL logical replication for consistency

### Security and authentication

- **Multi-provider auth**: Support for Clerk and other providers
- **Fine-grained permissions**: File-level access control
- **Rate limiting**: Per-user and per-session protection
- **CORS management**: Secure cross-origin resource sharing

### File management

- **Asset pipeline**: Integrated upload and optimization system
- **Version history**: Complete editing history with restore capability
- **Publishing system**: Public sharing with custom slugs
- **Soft deletion**: Recoverable file deletion with cleanup

### Performance

- **Global distribution**: Sub-100ms latency worldwide
- **Automatic scaling**: Handle traffic spikes seamlessly
- **Resource efficiency**: Intelligent persistence and cleanup
- **Connection pooling**: Optimized database connections

## Development and testing

### Local development

```bash
# Start development server
./dev.sh

# Reset database state
./reset-db.sh

# Clean durable object state
yarn clean
```

### Environment setup

```bash
# Create local environment file
cat > .dev.vars << EOF
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
EOF
```

### Testing

```bash
# Run unit tests
yarn test

# Run with coverage
yarn test-coverage

# Bundle size validation
yarn check-bundle-size
```

### Debugging

```bash
# Enable debug logging
curl -X POST https://worker-url/app/__debug-tail/clear

# WebSocket debug tail
wscat -c wss://worker-url/app/__debug-tail
```

## Key benefits

### Developer experience

- **Type safety**: Full TypeScript support across the stack
- **Hot reloading**: Fast development iteration
- **Comprehensive logging**: Detailed debugging and monitoring
- **Testing support**: Unit and integration test frameworks

### User experience

- **Instant collaboration**: Real-time synchronization without conflicts
- **Offline resilience**: Graceful handling of network issues
- **Fast loading**: Edge caching for sub-second room joining
- **Reliable persistence**: Automatic saving with version history

### Operations

- **Zero maintenance**: Serverless architecture with auto-scaling
- **Global deployment**: Automatic worldwide distribution
- **Cost efficiency**: Pay-per-request pricing model
- **Monitoring integration**: Built-in analytics and error tracking

### Architecture

- **Microservice pattern**: Specialized Durable Objects for different concerns
- **Event-driven design**: Reactive system with real-time updates
- **Eventual consistency**: Distributed system with conflict resolution
- **Horizontal scaling**: Automatic scaling based on demand

## Integration with tldraw ecosystem

### Client integration

The sync-worker integrates seamlessly with tldraw clients:

```typescript
// Client-side connection
const editor = new Editor({
	store: createTLStore({
		schema: getSchema(),
		multiplayerStatus: 'connecting',
	}),
	// Connect to sync-worker
	room: new TLMultiplayerRoom({
		host: 'https://sync.tldraw.xyz',
		roomId: 'my-room-id',
	}),
})
```

### Service architecture

```
tldraw.com (Client)
├── sync-worker (Real-time collaboration)
├── image-resize-worker (Asset optimization)
└── asset-upload-worker (File uploads)
        ↓
    PostgreSQL (Metadata)
        ↓
    R2 Storage (Room data, assets)
        ↓
    Analytics Engine (Metrics)
```

The sync-worker serves as the central coordination point for all tldraw collaborative features, providing the foundation for scalable, real-time multiplayer drawing experiences.


# ==========================================
# FILE: apps/dotcom/zero-cache/CONTEXT.md
# ==========================================

# Zero Cache Context

## Overview

The `zero-cache` is a specialized database caching and synchronization layer for tldraw's real-time collaboration system. It serves as an intermediary between the PostgreSQL database and client applications, providing efficient data synchronization using Rocicorp's Zero framework. The system enables real-time, offline-first synchronization of user data, file metadata, and collaborative state across all tldraw applications.

## Architecture

### Core components

The zero-cache system consists of several integrated components:

#### Zero server (Rocicorp Zero)

The primary synchronization engine that provides:

```typescript
// Zero server configuration
{
  replicaFile: "/data/sync-replica.db",        // Local SQLite cache
  upstreamDB: postgresConnectionString,        // Source of truth
  cvrDB: postgresConnectionString,             // Conflict resolution database
  changeDB: postgresConnectionString,          // Change log database
  authJWKSURL: "/.well-known/jwks.json",       // JWT verification
  pushURL: "/app/zero/push",                   // Mutation endpoint
  lazyStartup: true                            // Performance optimization
}
```

#### PostgreSQL database

The authoritative data source with logical replication enabled:

```sql
-- Core tables for tldraw data
CREATE TABLE "user" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "email" VARCHAR NOT NULL,
  "avatar" VARCHAR NOT NULL,
  "color" VARCHAR NOT NULL,
  "exportFormat" VARCHAR NOT NULL,
  "exportTheme" VARCHAR NOT NULL,
  "exportBackground" BOOLEAN NOT NULL,
  "exportPadding" BOOLEAN NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "flags" VARCHAR NOT NULL,
  -- User preferences (optional)
  "locale" VARCHAR,
  "animationSpeed" BIGINT,
  "edgeScrollSpeed" BIGINT,
  "colorScheme" VARCHAR,
  "isSnapMode" BOOLEAN,
  "isWrapMode" BOOLEAN,
  "isDynamicSizeMode" BOOLEAN,
  "isPasteAtCursorMode" BOOLEAN
);

CREATE TABLE "file" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "ownerId" VARCHAR NOT NULL,
  "thumbnail" VARCHAR NOT NULL,
  "shared" BOOLEAN NOT NULL,
  "sharedLinkType" VARCHAR NOT NULL,
  "published" BOOLEAN NOT NULL,
  "lastPublished" BIGINT NOT NULL,
  "publishedSlug" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "isEmpty" BOOLEAN NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "file_state" (
  "userId" VARCHAR NOT NULL,
  "fileId" VARCHAR NOT NULL,
  "firstVisitAt" BIGINT,
  "lastEditAt" BIGINT,
  "lastSessionState" VARCHAR,
  "lastVisitAt" BIGINT,
  PRIMARY KEY ("userId", "fileId"),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE
);
```

#### PgBouncer connection pool

Efficient connection pooling for database access:

```ini
[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction    # Efficient transaction-level pooling
max_client_conn = 450     # High concurrency support
default_pool_size = 100   # Connection pool size
max_prepared_statements = 10
```

### Data synchronization flow

The zero-cache implements a sophisticated data flow:

#### 1. Database change detection

PostgreSQL logical replication streams changes to Zero:

```sql
-- Enable logical replication
CREATE PUBLICATION zero_data FOR TABLE file, file_state, public.user;

-- Full replica identity for complete change tracking
ALTER TABLE file REPLICA IDENTITY FULL;
ALTER TABLE file_state REPLICA IDENTITY FULL;
```

#### 2. Local caching

Zero maintains a local SQLite replica for performance:

```
PostgreSQL (Source of Truth)
     ↓ (Logical Replication)
SQLite Replica (/data/sync-replica.db)
     ↓ (Real-time sync)
Client Applications
```

#### 3. Conflict resolution

Zero handles conflicts using Conflict-Free Replicated Data Types (CRDTs):

- **Last-write-wins**: For simple field updates
- **Causal ordering**: For maintaining operation sequences
- **Vector clocks**: For distributed state tracking

## Database schema evolution

### Migration system

The zero-cache includes a comprehensive migration system:

```typescript
// Migration runner with transactional safety
const migrate = async (summary: string[], dryRun: boolean) => {
	await db.transaction().execute(async (tx) => {
		const appliedMigrations = await sql`
      SELECT filename FROM migrations.applied_migrations
    `.execute(tx)

		for (const migration of migrations) {
			if (!appliedMigrations.includes(migration)) {
				const migrationSql = readFileSync(`./migrations/${migration}`, 'utf8')
				await sql.raw(migrationSql).execute(tx)
				await sql`
          INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})
        `.execute(tx)
			}
		}
	})
}
```

### Schema evolution examples

Key migrations that shaped the current schema:

#### User preferences enhancement

```sql
-- Migration 019: Add keyboard shortcuts preference
ALTER TABLE "user" ADD COLUMN "areKeyboardShortcutsEnabled" BOOLEAN;

-- Migration 020: Add UI labels preference
ALTER TABLE "user" ADD COLUMN "showUiLabels" BOOLEAN;
```

#### File sharing and collaboration

```sql
-- Migration 006: Soft deletion support
ALTER TABLE "file" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 008: File pinning
ALTER TABLE "file_state" ADD COLUMN "isPinned" BOOLEAN;

-- Migration 004: Guest access
ALTER TABLE "file_state" ADD COLUMN "isFileOwner" BOOLEAN;
```

#### Asset management

```sql
-- Migration 010: Asset information
CREATE TABLE "asset" (
  "objectName" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "userId" VARCHAR,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL
);
```

### Database triggers

Automated data consistency through triggers:

```sql
-- Automatically clean up file states when sharing is disabled
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state
    WHERE "fileId" = OLD.id AND OLD."ownerId" != "userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON file
FOR EACH ROW
EXECUTE FUNCTION delete_file_states();
```

## Development environment

### Docker composition

Local development stack with Docker Compose:

```yaml
services:
  zstart_postgres:
    image: simonfuhrer/postgresql:16.1-wal2json
    environment:
      POSTGRES_USER: user
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD: password
    command: |
      postgres 
      -c wal_level=logical           # Enable logical replication
      -c max_wal_senders=10          # Multiple replication slots
      -c max_replication_slots=5     # Concurrent replications
      -c max_connections=300         # High concurrency
      -c hot_standby=on             # Read replicas support
      -c hot_standby_feedback=on    # Replication feedback
    ports:
      - 6543:5432
    volumes:
      - tlapp_pgdata:/var/lib/postgresql/data

  pgbouncer:
    image: edoburu/pgbouncer:latest
    ports:
      - '6432:6432'
    environment:
      DATABASE_URL: postgres://user:password@zstart_postgres:5432/postgres
```

### Development workflow

```bash
# Start the complete development environment
yarn dev

# This concurrently runs:
# 1. Docker containers (postgres + pgbouncer)
# 2. Database migrations
# 3. Schema bundling and watching
# 4. Zero cache server
```

#### Schema bundling

Dynamic schema compilation for Zero:

```bash
# Bundle the shared schema for Zero consumption
esbuild --bundle --platform=node --format=esm \
  --outfile=./.schema.js \
  ../../../packages/dotcom-shared/src/tlaSchema.ts

# Watch mode for development
nodemon --watch ./.schema.js \
  --exec 'zero-cache-dev -p ./.schema.js' \
  --signal SIGINT
```

### Environment management

Environment variables for different deployment stages:

#### Development

```bash
BOTCOM_POSTGRES_POOLED_CONNECTION_STRING="postgresql://user:password@127.0.0.1:6432/postgres"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
```

#### Production (Fly.io template)

```toml
[env]
ZERO_REPLICA_FILE = "/data/sync-replica.db"
ZERO_UPSTREAM_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CVR_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CHANGE_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_AUTH_JWKS_URL = "https://clerk.staging.tldraw.com/.well-known/jwks.json"
ZERO_PUSH_URL = "__ZERO_PUSH_URL"
ZERO_LAZY_STARTUP = 'true'
```

## Data model and relationships

### User management

Complete user profile and preferences:

```typescript
interface User {
	id: string // Unique user identifier
	name: string // Display name
	email: string // Authentication email
	avatar: string // Profile image URL
	color: string // User color for collaboration

	// Export preferences
	exportFormat: 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background in exports
	exportPadding: boolean // Add padding to exports

	// Editor preferences
	locale?: string // Language/region
	animationSpeed?: number // UI animation timing
	edgeScrollSpeed?: number // Canvas edge scrolling speed
	colorScheme?: 'light' | 'dark' // UI theme preference
	areKeyboardShortcutsEnabled?: boolean // Keyboard shortcuts toggle
	enhancedA11yMode?: boolean // Enhanced accessibility mode

	// Drawing preferences
	isSnapMode?: boolean // Shape snapping
	isWrapMode?: boolean // Text wrapping
	isDynamicSizeMode?: boolean // Dynamic shape sizing
	isPasteAtCursorMode?: boolean // Paste behavior

	// Metadata
	createdAt: number // Account creation timestamp
	updatedAt: number // Last update timestamp
	flags: string // Feature flags (JSON)
}
```

### File management

Comprehensive file metadata and sharing:

```typescript
interface File {
	id: string // Unique file identifier
	name: string // File display name
	ownerId: string // Owner user ID
	thumbnail: string // Preview image URL

	// Sharing configuration
	shared: boolean // Public sharing enabled
	sharedLinkType: 'view' | 'edit' // Sharing permissions

	// Publishing
	published: boolean // Published to public gallery
	lastPublished: number // Last publication timestamp
	publishedSlug: string // Public URL slug

	// State tracking
	isEmpty: boolean // File has no content
	isDeleted?: boolean // Soft deletion flag
	createSource?: string // Source for file creation

	// Metadata
	createdAt: number // File creation timestamp
	updatedAt: number // Last modification timestamp
}
```

### User-File relationships

Per-user file interaction state:

```typescript
interface FileState {
	userId: string // User identifier
	fileId: string // File identifier

	// Visit tracking
	firstVisitAt?: number // Initial access timestamp
	lastVisitAt?: number // Recent access timestamp
	lastEditAt?: number // Recent edit timestamp

	// Session state
	lastSessionState?: string // Saved editor state (JSON)

	// User relationship
	isFileOwner?: boolean // User owns this file
	isPinned?: boolean // File pinned to user's list
}
```

### Mutation tracking

Change tracking for synchronization:

```typescript
interface UserMutationNumber {
	userId: string // User identifier
	mutationNumber: number // Last processed mutation ID
}
```

## Real-time synchronization

### Client-server protocol

Zero implements a sophisticated sync protocol:

#### Initial data loading

```typescript
// Client connects and receives initial dataset
const zero = new Zero({
	server: 'https://zero-cache.tldraw.com',
	auth: () => getAuthToken(),
	schema: tldrawSchema,
})

// Zero automatically syncs relevant user data
const files = await zero.query.file.where('ownerId', userId).or('shared', true).run()
```

#### Real-time updates

```typescript
// Client mutations are immediately optimistic
await zero.mutate.file.update({
	id: fileId,
	name: 'Updated Name',
})

// Server processes and broadcasts changes
// Conflicts resolved automatically using CRDTs
```

#### Offline support

```typescript
// Zero maintains local state during disconnection
// Queues mutations for replay when reconnected
// Handles conflict resolution upon reconnection
```

### Conflict resolution strategies

Zero employs multiple conflict resolution approaches:

#### Last-write-wins (LWW)

```typescript
// Simple fields use timestamp-based resolution
if (serverChange.timestamp > localChange.timestamp) {
	applyServerChange(serverChange)
} else {
	keepLocalChange(localChange)
}
```

#### Causal consistency

```typescript
// Operations maintain causal ordering
// Vector clocks ensure proper sequencing
// Prevents causality violations
```

#### Set-based cRDTs

```typescript
// Collections use add/remove semantics
// Convergence guaranteed regardless of order
// No conflicts for set operations
```

## Production deployment

### Fly.io configuration

The zero-cache deploys to Fly.io with specialized configuration:

#### Resource allocation

```toml
[[vm]]
memory = "2gb"          # Sufficient for caching and processing
cpu_kind = "shared"     # Cost-effective shared CPUs
cpus = 2               # Dual-core for concurrency

[http_service]
internal_port = 4848            # Zero server port
force_https = true             # Security requirement
auto_stop_machines = "off"     # Always-on for real-time sync
min_machines_running = 1       # High availability
```

#### Persistent storage

```toml
[mounts]
source = "sqlite_db"          # Persistent volume for replica
destination = "/data"         # Mount point for SQLite file
```

#### Health monitoring

```toml
[[http_service.checks]]
grace_period = "10s"          # Startup grace period
interval = "30s"              # Health check frequency
method = "GET"                # HTTP health endpoint
timeout = "5s"                # Request timeout
path = "/"                    # Health check path
```

### Production considerations

#### Database configuration

```sql
-- Production PostgreSQL settings for logical replication
wal_level = logical                    -- Enable change streaming
max_wal_senders = 20                   -- Multiple replicas
max_replication_slots = 10             -- Concurrent replication
max_connections = 500                  -- High concurrency
shared_preload_libraries = 'wal2json'  -- JSON change format
```

#### Connection pooling

```ini
# Production PgBouncer configuration
[pgbouncer]
pool_mode = transaction               # Efficient pooling
max_client_conn = 1000               # High concurrency
default_pool_size = 200              # Large pool
max_prepared_statements = 50         # Statement caching
query_wait_timeout = 30              # Timeout protection
```

#### Monitoring and alerting

```typescript
// Built-in Zero metrics
{
  replicationLag: number,            // Sync delay from PostgreSQL
  activeConnections: number,         // Current client count
  mutationRate: number,              // Changes per second
  conflictRate: number,              // Conflicts per second
  cacheHitRatio: number             // Local cache effectiveness
}
```

## Performance optimizations

### Caching strategy

Multi-layer caching for optimal performance:

#### Local SQLite replica

```typescript
// Zero maintains local copy of relevant data
// Eliminates network round-trips for reads
// Instant query responses from local cache
const localData = await zero.query.local.file.findMany()
```

#### Query optimization

```typescript
// Zero optimizes queries automatically
// Indexes created based on query patterns
// Batch loading for related data
const filesWithStates = await zero.query.file
	.include({ states: true })
	.where('ownerId', userId)
	.run()
```

#### Connection efficiency

```typescript
// Single persistent connection per client
// Multiplexed operations over WebSocket
// Automatic reconnection with backoff
const zero = new Zero({
	server: 'wss://zero-cache.tldraw.com',
	reconnect: {
		maxAttempts: Infinity,
		backoff: 'exponential',
		maxDelay: 30000,
	},
})
```

### Scalability features

#### Horizontal scaling

```toml
# Multiple Zero cache instances
# Load balanced across regions
# Each instance maintains subset of data
# Automatic failover and recovery
```

#### Resource management

```typescript
// Memory-efficient data structures
// Lazy loading of large datasets
// Automatic garbage collection
// Connection pooling and reuse
```

#### Network optimization

```typescript
// Delta compression for changes
// Binary protocol for efficiency
// Request batching and coalescing
// Intelligent prefetching
```

## Maintenance and operations

### Database maintenance

#### Migration management

```bash
# Apply new migrations
yarn migrate

# Dry-run to preview changes
yarn migrate --dry-run

# View migration status
yarn migrate --status
```

#### Data cleanup

```bash
# Complete environment reset
yarn clean

# This removes:
# - Docker volumes
# - SQLite replica files
# - Cached schema bundles
```

#### Backup and recovery

```sql
-- PostgreSQL logical backup
pg_dump --format=custom --verbose \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  --file=backup.dump

-- Restore from backup
pg_restore --verbose --clean --no-acl --no-owner \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  backup.dump
```

### Monitoring and debugging

#### Performance monitoring

```typescript
// Zero provides built-in metrics
{
  syncLatency: number,              // Client-server sync time
  queryPerformance: {
    averageTime: number,            // Average query execution
    slowQueries: Array<{
      sql: string,
      duration: number
    }>
  },
  connectionHealth: {
    activeConnections: number,
    failedConnections: number,
    reconnectAttempts: number
  }
}
```

#### Error tracking

```typescript
// Comprehensive error logging
zero.on('error', (error) => {
	console.error('Zero Cache Error:', {
		type: error.type,
		message: error.message,
		stack: error.stack,
		context: error.context,
	})
})
```

#### Debug logging

```bash
# Enable debug logging
LOG_LEVEL=debug yarn zero-server

# Trace-level logging for deep debugging
LOG_LEVEL=trace yarn zero-server
```

## Key features

### Real-time synchronization

- **Instant updates**: Changes appear immediately across all connected clients
- **Offline support**: Full functionality during network disconnection
- **Conflict resolution**: Automatic handling of concurrent modifications
- **Selective sync**: Only relevant data synchronized per user

### Developer experience

- **Type safety**: Full TypeScript integration with generated types
- **Schema evolution**: Safe database migrations with rollback support
- **Hot reloading**: Automatic schema updates during development
- **Testing support**: In-memory mode for unit testing

### Production ready

- **High availability**: Multi-region deployment with failover
- **Scalability**: Horizontal scaling across multiple instances
- **Performance**: Sub-millisecond query responses from local cache
- **Reliability**: Transactional consistency with automatic recovery

### Data consistency

- **ACID transactions**: Full transactional support for complex operations
- **Causal consistency**: Operations maintain proper ordering
- **Eventual consistency**: Guaranteed convergence across all clients
- **Schema validation**: Type-safe data with runtime validation

## Integration with tldraw ecosystem

### Client integration

Zero-cache integrates seamlessly with tldraw applications:

```typescript
// React integration
const useFiles = () => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('ownerId', userId).run())
}

// Real-time subscriptions
const useFileUpdates = (fileId: string) => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('id', fileId).run())
}
```

### Service architecture

```
tldraw.com Client
├── Zero Cache (Real-time sync)
├── Sync Worker (WebSocket rooms)
└── PostgreSQL (Source of truth)
     ↓
Logical Replication
     ↓
Zero Server (Conflict resolution)
     ↓
SQLite Replica (Local cache)
     ↓
Client Applications (Offline-first)
```

### Data flow

```
User Action (Client)
     ↓
Optimistic Update (Immediate UI)
     ↓
Zero Mutation (Background sync)
     ↓
PostgreSQL Update (Persistent)
     ↓
Logical Replication (Change stream)
     ↓
Zero Server Processing (Conflict resolution)
     ↓
Client Synchronization (Real-time updates)
```

The zero-cache serves as the foundational data synchronization layer for tldraw's collaborative ecosystem, enabling real-time, offline-first user experiences while maintaining data consistency and providing excellent developer ergonomics.


# ==========================================
# FILE: apps/examples/CONTEXT.md
# ==========================================

# Examples App Context

This is the tldraw SDK examples application - a comprehensive showcase and development environment for demonstrating tldraw capabilities. It hosts over 130 example implementations showing different features, integrations, and use cases.

## Purpose & deployment

**Development**: When you run `yarn dev` from the repository root, this examples app runs at localhost:5420
**Production**: Deployed to [examples.tldraw.com](https://examples.tldraw.com) with each SDK release. Deployed to [examples-canary.tldraw.com](https://examples-canary.tldraw.com) with each push to main
**Documentation Integration**: Individual examples are iframed into the [tldraw.dev examples section](https://tldraw.dev/examples)
**Preview Deployments**: Each PR gets a preview deployment, and canary versions deploy to examples-canary.tldraw.com

## Architecture

### Core structure

- **Entry point**: `src/index.tsx` - Main application entry
- **Example wrapper**: `src/ExampleWrapper.tsx` - Provides consistent layout and error boundaries
- **Example registry**: `src/examples.tsx` - Central registry of all examples with metadata
- **Example pages**: `src/ExamplePage.tsx` - Individual example page component

### Example organization

Each example lives in its own directory under `src/examples/` following these patterns:

- **Folder naming**: kebab-case (e.g., `custom-shape`, `sync-demo`)
- **Required files**:
  - `README.md` with frontmatter metadata
  - Main component file ending with `Example.tsx`
- **Optional files**: CSS files, supporting components, utilities

### Categories

Examples are organized into these categories:

- `getting-started` - Basic usage patterns
- `configuration` - Editor setup and options
- `editor-api` - Core editor API usage
- `ui` - User interface customization
- `layout` - Canvas and viewport control
- `events` - Event handling and interactivity
- `shapes/tools` - Custom shapes and tools
- `collaboration` - Multi-user features
- `data/assets` - Data management and asset handling
- `use-cases` - Complete application scenarios

## Example types

### Core SDK examples

- **Basic usage**: Simple editor setups (`basic`, `readonly`)
- **Configuration**: Editor options (`hide-ui`, `dark-mode-toggle`)
- **API integration**: Editor methods (`api`, `canvas-events`)

### Customization examples

- **Custom shapes**: New shape types (`custom-shape`, `ag-grid-shape`)
- **Custom tools**: Interactive tools (`custom-tool`, `lasso-select-tool`)
- **Custom UI**: Interface modifications (`custom-ui`, `toolbar-groups`)
- **Custom styling**: Visual customization (`custom-grid`, `frame-colors`)

### Advanced features

- **Collaboration**: Real-time sync (`sync-demo`, `sync-custom-presence`)
- **Bindings**: Shape relationships (`pin-bindings`, `layout-bindings`)
- **Export/import**: Data exchange (`export-canvas-as-image`, `snapshots`)
- **Complex interactions**: Advanced behaviors (`drag-and-drop`, `interactive-shape`)

### Use case demonstrations

- **PDF editor**: Complete PDF annotation tool
- **Image annotator**: Image markup interface
- **Slides**: Presentation creation tool
- **Education canvas**: Learning-focused interface

## Development workflow

### Adding new examples

1. Create folder in `src/examples/` with kebab-case name
2. Add `README.md` with proper frontmatter:

   ```md
   ---
   title: Example Name
   component: ./ExampleComponent.tsx
   category: appropriate-category
   priority: number
   keywords: [relevant, search, terms]
   ---

   ## One-line summary

   Detailed description
   ```

3. Create main component file ending with `Example.tsx`
4. Follow established patterns for layout and styling

### Example component pattern

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function YourExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

### Code style guidelines

- Use numbered footnote comments: `// [1]`, `// [2]` with explanations at bottom
- Keep examples focused and minimal for "tight" examples
- Add realistic UI for "use-case" examples
- External CSS files should match example name
- Avoid inline styles unless necessary

## Testing & quality

### Available commands

- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-ui` - Run E2E tests with Playwright UI
- `yarn test` - Run unit tests (if any)
- `yarn lint` - Lint the codebase
- `yarn build` - Build for production

### Testing infrastructure

- **E2E tests**: Located in `e2e/` directory using Playwright
- **Performance tests**: Dedicated performance testing suite
- **Error boundaries**: Built-in error handling for example failures

## Key dependencies

### Core tldraw packages

- `tldraw` - Main SDK with full UI
- `@tldraw/editor` - Core editor (some examples use editor-only)
- `@tldraw/state` - Reactive state management
- `@tldraw/sync` - Collaboration features

### Supporting libraries

- `react-router-dom` - Client-side routing
- `@tiptap/core` - Rich text editing (some examples)
- `pdf-lib` - PDF manipulation (PDF examples)
- `ag-grid-react` - Data grid component (grid examples)

## Important files

### Configuration

- `vite.config.ts` - Vite build configuration with example discovery
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Core application files

- `src/examples.tsx` - Example registry and metadata
- `src/ExampleWrapper.tsx` - Layout wrapper with error boundaries
- `src/hooks/` - Shared hooks for performance monitoring, debugging
- `writing-examples.md` - Comprehensive guide for creating examples

## Development notes

- Examples should demonstrate single concepts clearly
- Use the existing example patterns and conventions
- Read `writing-examples.md` before creating new examples
- Test examples in both development and production builds
- Consider both desktop and mobile experiences
- Follow the established categorization system for discoverability


# ==========================================
# FILE: apps/vscode/CONTEXT.md
# ==========================================

# VSCode Extension (apps/vscode)

The tldraw VS Code extension enables users to create, view, and edit `.tldr` files directly within VS Code, bringing the full tldraw infinite canvas experience to the editor.

## Architecture overview

This application consists of two main components:

### Extension (`apps/vscode/extension/`)

The VS Code extension itself, built in TypeScript:

- **Entry point**: `src/extension.ts` - Main activation function and extension lifecycle
- **Editor provider**: `src/TldrawEditorProvider.ts` - Custom editor provider for .tldr files
- **Webview manager**: `src/TldrawWebviewManager.ts` - Manages webview communication
- **Document handling**: `src/TldrawDocument.ts` - Document model for .tldr files
- **File operations**: `src/file.ts` - File I/O utilities for .tldr files
- **Utilities**: `src/utils.ts`, `src/unfurl.ts`, `src/media.ts` - Supporting functionality

### Editor (`apps/vscode/editor/`)

A React-based webview application that renders the tldraw editor:

- **Entry point**: `src/index.tsx` - React app initialization
- **Main app**: `src/app.tsx` - Core tldraw editor component
- **File handling**: `src/FileOpen.tsx` - File open/import UI
- **Change tracking**: `src/ChangeResponder.tsx` - Handles editor state changes
- **Messages**: `src/FullPageMessage.tsx` - Error/loading states
- **Utils**: `src/utils/` - RPC communication, bookmarks, external content handling

## Key features

**File support**

- Opens `.tldr` and `.tldr.json` files
- Creates new tldraw files via command palette
- Bidirectional compatibility with tldraw.com web app

**Editor integration**

- Custom VS Code editor provider for seamless integration
- Keyboard shortcuts for zoom and dark mode toggle
- Hot reload support in development mode
- Webview-based rendering using the full tldraw SDK

**Communication**

- RPC-based communication between extension and webview
- Real-time file change synchronization
- External content handling for links and embeds

## Development commands

**Extension development**

- `yarn dev` - Start extension development with hot reload
- `yarn build` - Build extension and editor for production
- `yarn package` - Create .vsix package for distribution

**Editor development**

- `yarn dev` (from editor/) - Start editor development server
- `yarn build` (from editor/) - Build editor bundle

## Extension configuration

The extension contributes:

- Custom editor for `.tldr` files
- Command palette command "tldraw: New Project"
- Keyboard shortcuts for zoom and dark mode
- File type associations for `.tldr` and `.tldr.json`

## Build system

- Extension uses esbuild for fast compilation
- Editor uses esbuild with React/JSX support
- Webpack used for extension packaging
- TypeScript with strict settings for type safety

## Publishing

- Pre-releases: Automatic on `main` branch merges
- Production releases: Automatic on `production` branch merges
- Manual publishing via `yarn publish` command
- Direct .vsix downloads available from repository

## Key dependencies

- **VS Code API**: Core extension functionality
- **tldraw**: Full tldraw SDK for editor capabilities
- **React/ReactDOM**: UI framework for webview
- **fs-extra**: Enhanced file system operations
- **esbuild**: Fast TypeScript/React compilation
- **cheerio**: HTML parsing for unfurling
- **node-fetch**: HTTP requests for external content


# ==========================================
# FILE: internal/apps-script/CONTEXT.md
# ==========================================

# @internal/apps-script

This package contains the Google Apps Script configuration and build tooling for integrating tldraw as a Google Meet add-on.

## Purpose

Provides tldraw functionality within Google Meet through Google Apps Script add-ons, allowing users to collaborate on infinite canvas drawings during video calls.

## Architecture

### Core components

**appsscript.json** - Google Apps Script manifest

- Defines Meet add-on configuration with side panel and main stage URIs
- Configures OAuth scopes for Google services integration
- Sets up URL fetch whitelist for tldraw domains
- Uses placeholder `TLDRAW_HOST` replaced during build

**build-workspace-app.ts** - Build script

- Copies configuration to `dist/` directory
- Replaces `TLDRAW_HOST` placeholder with production/staging URLs
- Generates `.clasp.json` with appropriate Google Apps Script IDs
- Handles production vs staging environment configuration

### Build process

The build system:

1. Clears `dist/` directory
2. Copies `appsscript.json` to `dist/`
3. Replaces `TLDRAW_HOST` with environment-specific URL
4. Generates `.clasp.json` with correct script ID

### Environment configuration

**Production**: `https://www.tldraw.com`

- Script ID: `1FWcAvz7Rl4iPXQX3KmXm2mNG_RK2kryS7Bja8Y7RHvuAHnic51p_pqe7`

**Staging**: `https://staging.tldraw.com`

- Script ID: `1cJfZM0M_rGU-nYgG-4KR1DnERb7itkCsl1QmlqPxFvHnrz5n6Gfy8iht`

## Google Apps Script integration

### Add-on configuration

- **Side panel URI**: `/ts-side` - Compact tldraw interface for Meet sidebar
- **Main stage URI**: `/ts` - Full tldraw interface for screen sharing
- **Screen sharing support**: Enabled for presenting drawings to all participants

### OAuth scopes

Required permissions:

- User profile and email access
- Google Docs integration (current document only)
- External request capabilities for tldraw API calls
- Workspace link preview functionality

## Development workflow

### Setup commands

```bash
yarn glogin    # Login to Google Apps Script
yarn glogout   # Logout from Google Apps Script
yarn gcreate   # Create new Apps Script project
```

### Build & deploy

```bash
yarn build           # Build for production
yarn build:staging   # Build for staging
yarn gpush           # Deploy to production
yarn gpush:staging   # Deploy to staging
yarn gpull           # Pull from production
yarn gpull:staging   # Pull from staging
```

## Dependencies

- **@google/clasp**: Google Apps Script CLI tool for deployment
- **@types/google-apps-script**: TypeScript definitions for Apps Script APIs

## Integration points

This package connects tldraw with Google Meet by:

1. Providing Apps Script manifest configuration
2. Enabling tldraw URLs as trusted add-on origins
3. Supporting both sidebar and full-screen presentation modes
4. Handling authentication through Google's OAuth system

The actual tldraw functionality is served from the main tldraw.com application, with this package providing the Google Apps Script wrapper for Meet integration.


# ==========================================
# FILE: internal/config/CONTEXT.md
# ==========================================

# Internal Config Package

This package provides shared configuration files and utilities for the tldraw monorepo's build system, testing, and development tools.

## Purpose

The `@internal/config` package centralizes common configuration to ensure consistency across all packages in the monorepo. It includes TypeScript configurations, API documentation settings, and testing utilities.

## Key files

### TypeScript configuration

- **`tsconfig.base.json`** - Base TypeScript configuration extended by all packages
  - Enables strict mode, composite builds, and declaration generation
  - Configured for React JSX and modern ES modules
  - Includes Vitest globals for testing

- **`tsconfig.json`** - Package-specific TypeScript configuration

### API documentation

- **`api-extractor.json`** - Microsoft API Extractor configuration for generating consistent API documentation and validating public API surfaces across packages

### Testing configuration

- **`vitest/setup.ts`** - Global test setup and polyfills
  - Canvas mocking for browser-based tests
  - Animation frame polyfills
  - Text encoding utilities
  - Custom Jest-style matchers

- **`vitest/node-preset.ts`** - Node.js-specific Vitest configuration preset

## Usage

Other packages in the monorepo extend these configurations:

```json
{
	"extends": "config/tsconfig.base.json"
}
```

The testing setup is imported in package-specific Vitest configs to ensure consistent test environments across the monorepo.

## Dependencies

- **@jest/expect-utils** - Utilities for custom test matchers
- **@peculiar/webcrypto** - WebCrypto API polyfill for Node.js environments
- **jest-matcher-utils** - Formatting utilities for test output
- **lazyrepo** - Build system integration
- **vitest-canvas-mock** - Canvas API mocking for tests


# ==========================================
# FILE: internal/dev-tools/CONTEXT.md
# ==========================================

# Dev Tools Context

## Overview

The `@internal/dev-tools` package provides internal development tools for the tldraw team. This is a private package that contains utilities to help with development workflows and debugging.

## Package structure

```
internal/dev-tools/
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx            # React app entry point
│   ├── index.html          # HTML template
│   ├── styles.css          # Global styles
│   └── Bisect/             # Git bisect helper tool
│       ├── Bisect.tsx      # Main bisect component
│       ├── BisectButton.tsx # UI button component
│       ├── PrItem.tsx      # PR list item component
│       └── pr-numbers.ts   # PR data
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Features

### Git bisect tool

The primary feature is a web-based git bisect helper tool that:

- **PR testing**: Allows developers to test different PR preview deployments
- **Binary search**: Implements git bisect logic to find problematic PRs
- **Preview links**: Automatically opens PR preview deployments for testing
- **Interactive UI**: Mark PRs as "good" or "bad" to narrow down issues
- **Progress tracking**: Shows current bisect position and remaining candidates

The tool uses PR preview deployments at `https://pr-{number}-preview-deploy.tldraw.com/` to test different versions.

## Architecture

### Technology stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS**: Vanilla CSS styling

### Key components

- `Bisect.tsx`: Main bisect logic and state management
- `BisectButton.tsx`: Reusable button component
- `PrItem.tsx`: Individual PR item with good/bad marking
- `pr-numbers.ts`: List of PR numbers to bisect through

## Development

### Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

### Usage

1. Start the dev server: `yarn dev`
2. Click "Start bisect" to begin
3. Test the behavior in the preview links
4. Mark PRs as "good" or "bad"
5. Continue until the problematic PR is identified

## Integration

This tool is designed for internal use by the tldraw development team to:

- Debug regressions between releases
- Identify which PR introduced a bug
- Streamline the bisect process with visual tools
- Test preview deployments efficiently

The tool assumes access to tldraw's PR preview deployment infrastructure.


# ==========================================
# FILE: internal/health-worker/CONTEXT.md
# ==========================================

# Health Worker

A Cloudflare Worker that processes webhooks from [Updown](https://updown.io/) health monitoring service and forwards health status alerts to Discord.

## Architecture

**Cloudflare Worker** - Serverless function deployed on Cloudflare's edge network

- Receives HTTP webhooks from Updown monitoring service
- Transforms health events into Discord message format
- Forwards formatted messages to Discord via webhook

## Core components

**src/index.ts** - Main worker handler

- HTTP request routing and environment validation
- Processes arrays of Updown events
- Error handling and response management

**src/discord.ts** - Discord integration

- Transforms Updown events into Discord embed format
- Handles different event types (down, up, SSL issues, performance)
- Color-coded alerts (red for down, green for up, orange for warnings)

**src/updown_types.ts** - Type definitions for Updown webhook payload structure

## Event types handled

- `check.down` - Service goes down (red alert)
- `check.up` - Service comes back up (green alert)
- `check.still_down` - Ignored to prevent spam
- `check.ssl_invalid` - SSL certificate issues (red alert)
- `check.ssl_valid` - SSL certificate restored (green alert)
- `check.ssl_expiration` - SSL expiring soon (orange warning)
- `check.ssl_renewed` - SSL certificate renewed (green alert)
- `check.performance_drop` - Performance degradation (orange warning)

## Configuration

**Environment variables**

- `DISCORD_HEALTH_WEBHOOK_URL` - Discord webhook URL for sending alerts
- `HEALTH_WORKER_UPDOWN_WEBHOOK_PATH` - Secret path for Updown webhooks (security measure)

**Deployment**

- Uses Wrangler CLI for deployment to Cloudflare Workers
- Multiple environments: dev, staging, production
- Bundle size monitored (40KB limit)

## Security

- Webhook path acts as shared secret to prevent unauthorized alerts
- Only processes requests to the configured webhook path
- Returns 404 for all other requests

## Dependencies

- `@tldraw/utils` - Utility functions (exhaustiveSwitchError)
- `discord-api-types` - TypeScript types for Discord API
- `@cloudflare/workers-types` - Cloudflare Workers runtime types


# ==========================================
# FILE: internal/scripts/CONTEXT.md
# ==========================================

# @tldraw/scripts

Build scripts and development tooling for the tldraw monorepo.

## Overview

This package contains TypeScript scripts and utilities that support the tldraw development workflow, including build automation, deployment, testing, publishing, and maintenance tasks.

## Key scripts

### Build & development

- `api-check.ts` - Validates public API consistency across packages using Microsoft API Extractor
- `build-api.ts` - Generates API documentation and type definitions
- `build-package.ts` - Builds individual packages with proper dependency handling
- `typecheck.ts` - Runs TypeScript compilation checks across workspaces
- `lint.ts` - Runs ESLint across the monorepo with custom rules
- `clean.sh` - Removes build artifacts and node_modules

### Context management

- `context.ts` - Finds and displays nearest CONTEXT.md files (supports -v, -r, -u flags)
- `refresh-context.ts` - Updates CONTEXT.md files using Claude Code CLI integration
- Script supports reviewing all packages or specific directories

### Publishing & deployment

- `publish-new.ts` - Publishes new package versions
- `publish-patch.ts` - Handles patch releases
- `publish-prerelease.ts` - Manages prerelease versions
- `publish-manual.ts` - Manual publishing workflow
- `publish-vscode-extension.ts` - VSCode extension publishing
- `deploy-dotcom.ts` - Deploys tldraw.com application
- `deploy-bemo.ts` - Deploys collaboration backend

### Asset management

- `refresh-assets.ts` - Updates icons, fonts, and translations across packages
- Assets are centrally managed and distributed during builds
- `purge-css.ts` - Removes unused CSS
- `upload-static-assets.ts` - Handles CDN asset uploads

### Internationalization

- `i18n-upload-strings.ts` - Uploads translation strings to Lokalise
- `i18n-download-strings.ts` - Downloads localized strings from Lokalise
- Supports the tldraw UI translation workflow

### Testing & quality

- `check-packages.ts` - Validates package configurations and dependencies
- `check-worker-bundle.ts` - Verifies worker bundle integrity
- `license-report.ts` - Generates license compliance reports
- `generate-test-licenses.ts` - Creates test license configurations

### Template management

- `export-template.ts` - Generates starter templates for different frameworks
- `refresh-create-templates.ts` - Updates npm create tldraw templates
- `dev-template.sh` - Development script for testing templates

### Utilities library (`lib/`)

- `exec.ts` - Enhanced command execution with logging
- `file.ts` - File system operations and path utilities
- `workspace.ts` - Yarn workspace management utilities
- `publishing.ts` - Package publishing logic
- `deploy.ts` - Deployment orchestration
- `eslint-plugin.ts` - Custom ESLint rules for tldraw
- `discord.ts` - Discord webhook integrations
- `pr-info.ts` - GitHub PR metadata extraction

### Version management

- `bump-versions.ts` - Automated version bumping across packages
- `get-pr-numbers.ts` - Extracts PR numbers from commit history
- `update-pr-template.ts` - Updates GitHub PR templates

### Deployment support

- `trigger-dotcom-hotfix.ts` - Emergency deployment triggers
- `trigger-sdk-hotfix.ts` - SDK hotfix deployment
- `prune-preview-deploys.ts` - Cleanup preview deployments

## Architecture

Built on Node.js with TypeScript, using:

- **LazyRepo** for incremental build orchestration
- **yarn workspaces** for monorepo package management
- **AWS SDK** for cloud deployments and asset management
- **GitHub Actions integration** for CI/CD workflows
- **Lokalise API** for translation management

## Usage patterns

Scripts are typically run via yarn from the monorepo root:

```bash
yarn api-check           # Validate API surface
yarn context             # Find nearest CONTEXT.md
yarn refresh-context     # Update CONTEXT.md files
yarn refresh-assets      # Update icons/fonts/translations
```

Most scripts support command-line arguments and environment variables for configuration. Check individual script files for specific usage patterns.

## Development

Scripts use shared utilities from `lib/` for common operations like:

- Command execution with proper logging
- File system operations with error handling
- Workspace package discovery and management
- Git operations and PR metadata extraction

All scripts are written in TypeScript and executed via `tsx` for direct TS execution without compilation steps.


# ==========================================
# FILE: packages/assets/CONTEXT.md
# ==========================================

# Assets Package Context

## Overview

The `@tldraw/assets` package contains all static assets used by tldraw, including icons, fonts, translations, embed icons, and watermarks. It provides multiple export strategies for different bundling scenarios and ensures consistent asset access across the entire application.

## Architecture

### Asset categories

#### Icons system

Single SVG sprite with fragment identifiers for efficient icon delivery:

```typescript
// All icons consolidated into one optimized SVG file
icons: {
  'tool-pointer': iconsIcon0MergedSvg + '#tool-pointer',
  'tool-pencil': iconsIcon0MergedSvg + '#tool-pencil',
  'geo-rectangle': iconsIcon0MergedSvg + '#geo-rectangle',
  'align-center': iconsIcon0MergedSvg + '#align-center'
  // 80+ icons covering tools, shapes, UI elements, formatting
}
```

**Icon categories:**

- **Tool icons**: `tool-pointer`, `tool-pencil`, `tool-arrow`, `tool-text`, etc.
- **Geometry icons**: `geo-rectangle`, `geo-ellipse`, `geo-triangle`, `geo-star`, etc.
- **UI icons**: `chevron-*`, `align-*`, `zoom-*`, `undo`, `redo`, etc.
- **Action icons**: `duplicate`, `delete`, `lock`, `group`, `share`, etc.

#### Typography system

Complete font family with multiple weights and styles:

```typescript
fonts: {
  // IBM Plex Mono (code/monospace)
  tldraw_mono: './fonts/IBMPlexMono-Medium.woff2',
  tldraw_mono_bold: './fonts/IBMPlexMono-Bold.woff2',
  tldraw_mono_italic: './fonts/IBMPlexMono-MediumItalic.woff2',
  tldraw_mono_italic_bold: './fonts/IBMPlexMono-BoldItalic.woff2',

  // IBM Plex Sans (UI/interface)
  tldraw_sans: './fonts/IBMPlexSans-Medium.woff2',
  tldraw_sans_bold: './fonts/IBMPlexSans-Bold.woff2',
  tldraw_sans_italic: './fonts/IBMPlexSans-MediumItalic.woff2',
  tldraw_sans_italic_bold: './fonts/IBMPlexSans-BoldItalic.woff2',

  // IBM Plex Serif (formal text)
  tldraw_serif: './fonts/IBMPlexSerif-Medium.woff2',
  tldraw_serif_bold: './fonts/IBMPlexSerif-Bold.woff2',
  tldraw_serif_italic: './fonts/IBMPlexSerif-MediumItalic.woff2',
  tldraw_serif_italic_bold: './fonts/IBMPlexSerif-BoldItalic.woff2',

  // Shantell Sans (handwritten/draw style)
  tldraw_draw: './fonts/Shantell_Sans-Informal_Regular.woff2',
  tldraw_draw_bold: './fonts/Shantell_Sans-Informal_Bold.woff2',
  tldraw_draw_italic: './fonts/Shantell_Sans-Informal_Regular_Italic.woff2',
  tldraw_draw_italic_bold: './fonts/Shantell_Sans-Informal_Bold_Italic.woff2'
}
```

#### Internationalization system

Comprehensive translation support for 40+ languages:

```typescript
// Language metadata for UI
translations/languages.json: [
  { "locale": "en", "label": "English" },
  { "locale": "es", "label": "Español" },
  { "locale": "fr", "label": "Français" },
  { "locale": "zh-cn", "label": "简体中文" },
  // 40+ supported locales
]

// Translation file mapping
translations: {
  en: './translations/en.json',
  es: './translations/es.json',
  'zh-cn': './translations/zh-cn.json',
  'pt-br': './translations/pt-br.json',
  // Region-specific variants supported
}
```

#### Embed icons

Service icons for external content embedding:

```typescript
embedIcons: {
  youtube: './embed-icons/youtube.png',
  figma: './embed-icons/figma.png',
  github_gist: './embed-icons/github_gist.png',
  google_maps: './embed-icons/google_maps.png',
  codepen: './embed-icons/codepen.png',
  // 18 popular services supported
}
```

### Export strategies

#### Import-Based assets (`imports.js`)

Direct ES module imports for bundler optimization:

```javascript
import embedIconsYoutubePng from './embed-icons/youtube.png'
import fontsIBMPlexSansBoldWoff2 from './fonts/IBMPlexSans-Bold.woff2'

export function getAssetUrlsByImport(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(fontsIBMPlexSansBoldWoff2, opts),
		},
		embedIcons: {
			youtube: formatAssetUrl(embedIconsYoutubePng, opts),
		},
	}
}
```

#### URL-Based assets (`urls.js`)

Runtime URL generation using `import.meta.url`:

```javascript
export function getAssetUrlsByMetaUrl(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(
				new URL('./fonts/IBMPlexSans-Bold.woff2', import.meta.url).href,
				opts
			),
		},
	}
}
```

#### Self-Hosted assets (`selfHosted.js`)

Relative path resolution for custom hosting:

```javascript
export function getAssetUrls(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl('./fonts/IBMPlexSans-Bold.woff2', opts),
		},
	}
}
```

### Asset URL formatting

#### `formatAssetUrl` utility

Flexible asset URL processing supporting multiple hosting scenarios:

```typescript
function formatAssetUrl(assetUrl: AssetUrl, format: AssetUrlOptions = {}) {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	// Custom formatter function
	if (typeof format === 'function') return format(assetUrlString)

	const { baseUrl = '' } = format

	// Data URLs pass through unchanged
	if (assetUrlString.startsWith('data:')) return assetUrlString

	// Absolute URLs pass through unchanged
	if (assetUrlString.match(/^https?:\/\//)) return assetUrlString

	// Relative URLs get baseUrl prefix
	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
```

**Use cases:**

- **CDN hosting**: Add baseUrl for CDN deployment
- **Custom domains**: Redirect assets to custom asset servers
- **Development**: Serve assets from local dev server
- **Self-hosting**: Package assets with application bundle

### Type system

#### Asset URL types

Type-safe asset URL handling:

```typescript
type AssetUrl = string | { src: string }
type AssetUrlOptions = { baseUrl?: string } | ((assetUrl: string) => string)

interface AssetUrls {
	fonts: Record<string, string> // 16 font variants
	icons: Record<string, string> // 80+ UI icons
	translations: Record<string, string> // 40+ language files
	embedIcons: Record<string, string> // 18 service icons
}
```

### Build system integration

#### Automatic generation

Asset exports are automatically generated from source files:

```javascript
// Generated by internal/scripts/refresh-assets.ts
// Do not edit manually. Or do, I'm a comment, not a cop.
```

**Generated files:**

- `imports.js` + `imports.d.ts` - ES module imports
- `urls.js` + `urls.d.ts` - import.meta.url resolution
- `selfHosted.js` + `selfHosted.d.ts` - relative path resolution
- `types.d.ts` - TypeScript definitions

#### Vite-specific exports

Special handling for Vite bundler:

```javascript
// imports.vite.js - Vite-optimized asset imports
// imports.vite.d.ts - Vite-specific type definitions
```

## Language support

### Translation architecture

Comprehensive internationalization with regional variants:

**Language coverage:**

- **European**: en, de, fr, es, it, nl, ru, pl, etc.
- **Asian**: zh-cn, zh-tw, ja, ko-kr, hi-in, th, etc.
- **Middle Eastern**: ar, fa, he, ur
- **Regional variants**: pt-br/pt-pt, gu-in/hi-in, zh-cn/zh-tw

**Translation structure:**

```json
// Each translation file contains UI strings
{
	"action.align-bottom": "Align bottom",
	"action.bring-forward": "Bring forward",
	"tool.select": "Select",
	"style.color.black": "Black"
}
```

### Language metadata

Centralized language configuration:

```json
// translations/languages.json
[
	{ "locale": "en", "label": "English" },
	{ "locale": "zh-cn", "label": "简体中文" },
	{ "locale": "ar", "label": "عربي" }
]
```

## External service integration

### Embed service icons

Visual branding for embedded content:

**Supported services:**

- **Development**: GitHub Gist, CodePen, CodeSandbox, Replit, Observable
- **Design**: Figma, Excalidraw, tldraw
- **Media**: YouTube, Vimeo, Spotify
- **Productivity**: Google Maps, Google Slides, Google Calendar
- **Other**: Desmos, Felt, Val Town, Scratch

**Icon usage:**

```typescript
// Icons displayed when embedding external content
embedIcons: {
  figma: './embed-icons/figma.png',
  youtube: './embed-icons/youtube.png',
  github_gist: './embed-icons/github_gist.png'
}
```

## Performance optimizations

### Icon sprite system

All icons merged into single SVG sprite for optimal loading:

```svg
<!-- icons/icon/0_merged.svg -->
<svg>
  <symbol id="tool-pointer">...</symbol>
  <symbol id="geo-rectangle">...</symbol>
  <symbol id="align-center">...</symbol>
  <!-- All icons as symbols -->
</svg>
```

**Benefits:**

- **Single HTTP request**: All icons in one file
- **Browser caching**: Icons cached together
- **Fragment addressing**: Access via `#icon-name`
- **Bundle optimization**: Unused icons can be tree-shaken

### Font loading strategy

Optimized web font delivery:

```css
/* Each font variant as separate WOFF2 file */
@font-face {
	font-family: 'tldraw-sans';
	src: url('./fonts/IBMPlexSans-Medium.woff2') format('woff2');
	font-weight: 500;
	font-style: normal;
}
```

### Asset bundling flexibility

Multiple export patterns support different bundling needs:

**Import strategy**: Best for Webpack/Rollup with asset processing
**URL strategy**: Best for ESM environments with import.meta.url
**Self-hosted strategy**: Best for custom asset hosting solutions

## Development workflow

### Asset pipeline

Automated asset management and optimization:

1. **Source assets**: Fonts, icons, images stored in organized directories
2. **Build script**: `internal/scripts/refresh-assets.ts` processes assets
3. **Generated exports**: Multiple export formats created automatically
4. **Type generation**: TypeScript definitions auto-generated
5. **Bundle integration**: Assets ready for different bundler strategies

### Asset updates

Standardized process for asset modifications:

1. **Add assets**: Place new assets in appropriate directories
2. **Run build**: Execute asset refresh script
3. **Commit generated**: Include auto-generated export files
4. **Type safety**: TypeScript ensures valid asset references

## Integration patterns

### Basic asset usage

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assetUrls = getAssetUrlsByImport()
const iconUrl = assetUrls.icons['tool-pointer']
const fontUrl = assetUrls.fonts.tldraw_sans_bold
```

### Custom base URL

```typescript
import { getAssetUrls } from '@tldraw/assets/selfHosted'

const assetUrls = getAssetUrls({
	baseUrl: 'https://cdn.example.com/tldraw-assets',
})
```

### Custom URL transformation

```typescript
const assetUrls = getAssetUrls((assetUrl) => {
	// Custom logic for asset URL generation
	return `https://assets.myapp.com/${assetUrl}?v=${buildHash}`
})
```

## Key benefits

### Asset management

- **Centralized assets**: All static resources in one package
- **Type safety**: TypeScript definitions for all asset references
- **Multiple export strategies**: Support for different bundling workflows
- **Automatic generation**: Asset exports generated from source files

### Performance

- **Optimized loading**: Icon sprites and font subsetting
- **Flexible hosting**: Support for CDNs and custom asset servers
- **Bundle efficiency**: Tree-shakable exports for unused assets
- **Caching strategy**: Asset URLs designed for effective browser caching

### Internationalization

- **Global reach**: 40+ supported languages with regional variants
- **Extensible translation**: Easy to add new languages
- **Fallback strategy**: Graceful degradation to English
- **Cultural adaptation**: Right-to-left language support

### Developer experience

- **Simple integration**: Import and use pattern for all assets
- **Build-time safety**: TypeScript prevents invalid asset references
- **Hot reloading**: Development-friendly asset serving
- **Documentation**: Clear asset categorization and naming

### Maintenance

- **Single source**: All assets managed in one location
- **Automated updates**: Build scripts maintain export consistency
- **Version control**: Asset changes tracked with application changes
- **Dependency management**: Minimal external dependencies for assets


# ==========================================
# FILE: packages/create-tldraw/CONTEXT.md
# ==========================================

# Create-Tldraw Package Context

## Overview

The `create-tldraw` package is a CLI tool for scaffolding new tldraw projects. It provides an interactive command-line interface that helps developers quickly bootstrap tldraw applications with various framework templates and configurations.

## Architecture

### CLI entry point

```bash
#!/usr/bin/env node
# cli.cjs entry point loads the bundled CLI application from dist-cjs/main.cjs
npx create-tldraw [directory] [options]
```

The CLI uses a two-stage loading system:

- `cli.cjs`: Simple entry point that requires the compiled CommonJS bundle
- `dist-cjs/main.cjs`: Actual CLI implementation bundled via esbuild

### Core components

#### Interactive CLI interface (`main.ts`)

Primary CLI application with rich interactive prompts:

```typescript
async function main() {
	intro(`Let's build a tldraw app!`)

	const template = await templatePicker(args.template)
	const name = await namePicker(maybeTargetDir)

	await ensureEmpty(targetDir, args.overwrite)
	await downloadTemplate(template, targetDir)
	await renameTemplate(name, targetDir)

	outro(doneMessage.join('\n'))
}
```

**CLI features:**

- **Interactive mode**: Guided project setup with prompts and spinners
- **Argument mode**: Direct template specification via flags
- **Directory handling**: Smart target directory management with safety checks
- **Package manager detection**: Automatic npm/yarn/pnpm detection and command generation
- **Progress indication**: Visual feedback with spinners and status messages
- **Error recovery**: Graceful handling of cancellation and failures

#### Template system (`templates.ts`)

Structured template definitions for different use cases:

```typescript
interface Template {
	repo: string // GitHub repository reference
	name: string // Human-readable template name
	description: string // Template description for UI
	category: 'framework' | 'app' // Template categorization
	order: number // Display order preference (required)
}

const TEMPLATES: Templates = {
	framework: [
		{
			repo: 'tldraw/vite-template',
			name: 'Vite + tldraw',
			description:
				'The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.',
			category: 'framework',
			order: 1,
		},
		{
			repo: 'tldraw/nextjs-template',
			name: 'Next.js + tldraw',
			description: 'tldraw in a Next.js app, with TypeScript.',
			category: 'framework',
			order: 2,
		},
	],
	app: [
		{
			repo: 'tldraw/tldraw-sync-cloudflare',
			name: 'Multiplayer sync',
			description:
				'Self-hosted tldraw with realtime multiplayer, powered by tldraw sync and Cloudflare Durable Objects.',
			category: 'app',
			order: 1,
		},
	],
}
```

#### Utility functions (`utils.ts`)

Essential CLI utilities for project setup:

```typescript
// Directory Management
function isDirEmpty(path: string): boolean
function emptyDir(dir: string): void
function formatTargetDir(targetDir: string): string

// Package Naming
function isValidPackageName(projectName: string): boolean
function toValidPackageName(projectName: string): string
function pathToName(path: string): string

// Package Manager Detection
function getPackageManager(): 'npm' | 'pnpm' | 'yarn'
function getInstallCommand(manager: PackageManager): string
function getRunCommand(manager: PackageManager, command: string): string

// Error Handling
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T>
```

#### Custom ANSI text wrapping (`wrap-ansi.ts`)

Custom implementation for terminal text wrapping that handles ANSI escape sequences:

```typescript
// Wraps text while preserving ANSI color codes and escape sequences
function wrapAnsi(input: string, columns: number): string
```

This custom implementation ensures that colored text in CLI prompts and messages wraps correctly without breaking ANSI formatting codes, providing consistent visual presentation across different terminal widths.

### Template management

#### Template selection UI (`group-select.ts`)

Enhanced group-based selection interface with custom rendering:

```typescript
// Custom grouped selection prompt with category headers
const template = await groupSelect({
	message: 'Select a template',
	options: [
		...formatTemplates(TEMPLATES.framework, 'Frameworks'),
		...formatTemplates(TEMPLATES.app, 'Apps'),
	],
})

function formatTemplates(templates: Template[], groupLabel: string) {
	return templates
		.sort((a, b) => a.order - b.order)
		.map((template) => ({
			label: template.name,
			hint: template.description,
			value: template,
			group: groupLabel,
		}))
}
```

The grouped selection system provides:

- **Category Grouping**: Templates organized by framework vs application type
- **Visual Hierarchy**: Group headers with consistent styling
- **Detailed descriptions**: Helpful hints for each template option
- **Keyboard navigation**: Standard CLI navigation patterns

#### Template download system

GitHub-based template retrieval with comprehensive error handling:

```typescript
async function downloadTemplate(template: Template, targetDir: string) {
	const s = spinner()
	s.start(`Downloading github.com/${template.repo}...`)

	try {
		const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
		const tarResponse = await fetch(url)

		if (!tarResponse.ok) {
			throw new Error(`Failed to download: ${tarResponse.statusText}`)
		}

		const extractor = tar.extract({
			cwd: targetDir,
			strip: 1, // Remove top-level directory from archive
		})

		await new Promise<void>((resolve, reject) => {
			Readable.fromWeb(tarResponse.body).pipe(extractor).on('end', resolve).on('error', reject)
		})

		s.stop(`Downloaded github.com/${template.repo}`)
	} catch (error) {
		s.stop(`Failed to download github.com/${template.repo}`)
		throw error
	}
}
```

**Error handling features:**

- **Network failure recovery**: Graceful handling of download failures
- **Invalid repository detection**: Clear error messages for missing repos
- **Progress indication**: Real-time download status with spinners
- **Cleanup on failure**: Automatic cleanup of partially downloaded content

### Project customization

#### Package.json customization

Automatic project personalization with preserved licensing:

```typescript
async function renameTemplate(name: string, targetDir: string) {
	const packageJsonPath = resolve(targetDir, 'package.json')
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

	// Customize package metadata while preserving license
	packageJson.name = name
	delete packageJson.author // Remove template author
	delete packageJson.homepage // Remove template homepage
	// Note: license field is preserved from original template

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
}
```

The package.json customization preserves template licensing while personalizing the project metadata for the new owner.

#### Smart naming system

Intelligent package name generation with npm compliance:

```typescript
// Path to valid npm package name conversion
function pathToName(path: string): string {
	return toValidPackageName(basename(formatTargetDir(resolve(path))))
}

function toValidPackageName(projectName: string): string {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-') // Spaces to hyphens
		.replace(/^[._]/, '') // Remove leading dots/underscores
		.replace(/[^a-z\d\-~]+/g, '-') // Invalid chars to hyphens
}
```

### CLI command interface

#### Command-Line arguments

Flexible argument handling for different usage patterns:

```bash
# Interactive mode (default)
npx create-tldraw

# Direct template specification
npx create-tldraw my-app --template vite-template

# Overwrite existing directory
npx create-tldraw my-app --overwrite

# Help information
npx create-tldraw --help
```

**Argument Processing:**

```typescript
const args = parseArgs(process.argv.slice(2), {
	alias: {
		h: 'help',
		t: 'template',
		o: 'overwrite',
	},
	boolean: ['help', 'overwrite'],
	string: ['template'],
})
```

#### Interactive prompts

Rich CLI experience using @clack/prompts with custom enhancements:

```typescript
// Template selection with grouped options and visual hierarchy
const template = await groupSelect({
	message: 'Select a template',
	options: [
		{ label: 'Vite + tldraw', hint: 'The easiest way to get started', group: 'Frameworks' },
		{ label: 'Next.js + tldraw', hint: 'tldraw in a Next.js app', group: 'Frameworks' },
		{ label: 'Multiplayer sync', hint: 'Self-hosted realtime collaboration', group: 'Apps' },
	],
})

// Project naming with validation and smart defaults
const name = await text({
	message: 'Name your app',
	placeholder: defaultName,
	validate: (value) => {
		if (value && !isValidPackageName(value)) {
			return `Invalid name: ${value}`
		}
	},
})
```

### Directory management

#### Smart directory handling

Intelligent handling of target directories with safety checks:

```typescript
async function ensureEmpty(targetDir: string, overwriteArg: boolean) {
	if (isDirEmpty(targetDir)) {
		mkdirSync(targetDir, { recursive: true })
		return
	}

	// Interactive overwrite confirmation with multiple options
	const overwrite = overwriteArg
		? 'yes'
		: await select({
				message: `Target directory "${targetDir}" is not empty.`,
				options: [
					{ label: 'Cancel', value: 'no' },
					{ label: 'Remove existing files and continue', value: 'yes' },
					{ label: 'Ignore existing files and continue', value: 'ignore' },
				],
			})

	if (overwrite === 'yes') {
		emptyDir(targetDir) // Preserves .git directory
	}
}
```

**Directory safety features:**

- **Git repository preservation**: `.git` directories are never deleted
- **Interactive confirmation**: User must explicitly confirm destructive operations
- **Flexible options**: Cancel, overwrite, or merge with existing content
- **Recursive creation**: Automatically creates parent directories as needed

### Package manager integration

#### Universal package manager support

Automatic detection and appropriate command generation:

```typescript
function getPackageManager(): 'npm' | 'pnpm' | 'yarn' {
	const userAgent = process.env.npm_config_user_agent
	if (!userAgent) return 'npm'

	const manager = userAgent.split(' ')[0].split('/')[0]
	if (manager === 'pnpm') return 'pnpm'
	if (manager === 'yarn') return 'yarn'
	return 'npm'
}

function getInstallCommand(manager: PackageManager): string {
	switch (manager) {
		case 'pnpm':
			return 'pnpm install'
		case 'yarn':
			return 'yarn'
		case 'npm':
			return 'npm install'
	}
}

function getRunCommand(manager: PackageManager, command: string): string {
	switch (manager) {
		case 'pnpm':
			return `pnpm ${command}`
		case 'yarn':
			return `yarn ${command}`
		case 'npm':
			return `npm run ${command}`
	}
}
```

### Error handling

#### Comprehensive error management

Graceful error handling throughout the CLI with user-friendly messaging:

```typescript
// Cancellation handling with cleanup
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T> {
	const result = await promise
	if (isCancel(result)) {
		outro(`Operation cancelled`)
		process.exit(1)
	}
	return result as T
}

// Main error boundary with debug mode
main().catch((err) => {
	if (DEBUG) {
		console.error('Debug information:')
		console.error(err)
	}
	outro(`Something went wrong. Please try again.`)
	process.exit(1)
})

// Download error handling with retry suggestions
try {
	await downloadTemplate(template, targetDir)
} catch (err) {
	outro(`Failed to download template. Please check your internet connection and try again.`)
	throw err
}
```

**Error recovery strategies:**

- **Graceful degradation**: Meaningful error messages without technical details
- **Debug mode**: Detailed error information when DEBUG environment variable is set
- **Operation cleanup**: Automatic cleanup of partial operations on failure
- **User guidance**: Actionable suggestions for resolving common issues

## Build system

### esbuild bundle configuration

Optimized TypeScript to CommonJS compilation for Node.js distribution:

```bash
# scripts/build.sh
esbuild src/main.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=dist-cjs/main.cjs \
  --external:@clack/prompts \
  --external:tar
```

**Build Features:**

- **Single Bundle**: All TypeScript source compiled to one CommonJS file
- **External Dependencies**: CLI dependencies remain as external requires
- **Node.js Target**: Optimized for Node.js 18+ runtime environments
- **Development Watch**: `scripts/dev.sh` provides watch mode for development

### Distribution strategy

Optimized package structure for CLI distribution:

```json
{
	"bin": "./cli.cjs", // CLI entry point
	"files": ["dist-cjs/", "./cli.cjs"], // Files included in npm package
	"scripts": {
		"build": "./scripts/build.sh", // Production build
		"dev": "./scripts/dev.sh", // Development mode with watch
		"prepublishOnly": "yarn build" // Ensure build before publish
	}
}
```

### Development workflow

#### Development scripts

Streamlined development experience:

```bash
# Development with automatic rebuild
./scripts/dev.sh    # Watches TypeScript files and rebuilds on changes

# Production build
./scripts/build.sh  # Creates optimized CommonJS bundle

# Local testing
node cli.cjs        # Test CLI locally after build
```

#### TypeScript compilation pipeline

```
src/
├── main.ts          → Entry point and CLI orchestration
├── templates.ts     → Template definitions and management
├── utils.ts         → Shared utilities and validation
├── group-select.ts  → Custom grouped selection UI
└── wrap-ansi.ts     → ANSI text wrapping functionality
     ↓ (esbuild bundle)
dist-cjs/
└── main.cjs         → Single bundled CommonJS output
```

## Testing configuration

### Jest setup

Comprehensive test configuration for CLI validation:

```json
{
	"testEnvironment": "node",
	"testMatch": ["<rootDir>/src/**/*.test.ts"],
	"transform": {
		"^.+\\.ts$": "ts-jest"
	},
	"collectCoverage": true,
	"coverageDirectory": "coverage",
	"coverageReporters": ["text", "html"]
}
```

**Testing patterns:**

- **Unit tests**: Individual function validation (utils, naming, validation)
- **Integration tests**: Template download and project setup workflows
- **CLI tests**: Command-line interface and argument parsing
- **Mock templates**: Test template system without external dependencies

## Template categories

### Framework templates

Ready-to-use integrations with popular frameworks:

#### Vite template (`tldraw/vite-template`)

- **Purpose**: Fastest way to start with tldraw
- **Tech stack**: Vite + React + TypeScript
- **Use case**: Simple drawing applications, rapid prototyping
- **Build time**: ~10 seconds for initial setup
- **Development**: Hot module replacement with Vite dev server

#### Next.js template (`tldraw/nextjs-template`)

- **Purpose**: Full-stack applications with tldraw
- **Tech stack**: Next.js + React + TypeScript
- **Use case**: Production web applications, SSR/SSG requirements
- **Features**: App Router, optimized builds, deployment ready

### Application templates

Complete application examples with advanced features:

#### Multiplayer sync (`tldraw/tldraw-sync-cloudflare`)

- **Purpose**: Real-time collaborative drawing
- **Tech stack**: tldraw + sync + Cloudflare Durable Objects
- **Features**: Multiplayer, persistence, scalable infrastructure
- **Use case**: Collaborative whiteboarding, team drawing sessions
- **Deployment**: Cloudflare Workers with Durable Objects backend

## Usage patterns

### Basic project creation

```bash
# Interactive mode with full guidance
npx create-tldraw

# Quick setup with specific template
npx create-tldraw my-drawing-app --template vite-template

# Overwrite existing directory safely
npx create-tldraw ./existing-dir --overwrite
```

### Advanced usage patterns

```bash
# Corporate environments with specific package managers
PNPM_CONFIG_USER_AGENT=pnpm npx create-tldraw my-app

# Automated CI/CD pipeline usage
npx create-tldraw ci-app --template nextjs-template --overwrite

# Development workflow integration
npx create-tldraw && cd $(ls -t | head -1) && npm run dev
```

### Post-creation workflow

```bash
cd my-tldraw-app
npm install           # Detected package manager command
npm run dev          # Start development server
npm run build        # Create production build
npm run typecheck    # Validate TypeScript
```

## Template development

### Automatic template generation

Templates are automatically discovered and validated:

```typescript
// Template validation ensures all required fields are present
function validateTemplate(template: Template): boolean {
	return !!(
		template.repo &&
		template.name &&
		template.description &&
		template.category &&
		typeof template.order === 'number'
	)
}

// Automatic template list generation from repository metadata
async function generateTemplateList() {
	const frameworks = await discoverTemplates('framework')
	const apps = await discoverTemplates('app')
	return { framework: frameworks, app: apps }
}
```

### Template requirements

Standards for template repositories:

- **package.json**: Valid npm package with required scripts
- **README.md**: Comprehensive setup and usage instructions
- **TypeScript Configuration**: Strict TypeScript setup preferred
- **Development Scripts**: Standard `dev`, `build`, `typecheck` scripts
- **License**: Clear licensing for template usage
- **Dependencies**: Current tldraw version and compatible dependencies

### Quality assurance

Automated validation for template integrity:

- **Repository Access**: Verify GitHub repository is public and accessible
- **Package Validation**: Ensure package.json meets npm standards
- **Build Verification**: Template must build successfully after setup
- **Dependency Audit**: Check for security vulnerabilities in dependencies
- **Documentation Review**: README must include setup and usage instructions

## Development features

### Enhanced CLI experience

Visual feedback and user guidance throughout the process:

```typescript
import { intro, outro, select, spinner, text } from '@clack/prompts'

// Welcome message with branding
intro(`Let's build a tldraw app!`)

// Progress indication with detailed status
const s = spinner()
s.start(`Downloading github.com/${template.repo}...`)
await downloadTemplate(template, targetDir)
s.stop(`Downloaded github.com/${template.repo}`)

// Success message with next steps
const installCmd = getInstallCommand(getPackageManager())
const runCmd = getRunCommand(getPackageManager(), 'dev')
outro(`Done! Now run:\n\n  cd ${targetDir}\n  ${installCmd}\n  ${runCmd}`)
```

### Smart defaults and validation

Intelligent default value generation and input validation:

```typescript
// Smart project naming from current directory
const defaultName = pathToName(process.cwd())

// Package manager detection from environment
const manager = getPackageManager()

// Template ordering by popularity and ease of use
templates.sort((a, b) => a.order - b.order)

// Comprehensive package name validation
function isValidPackageName(projectName: string): boolean {
	return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

// Directory safety validation
function isDirEmpty(path: string): boolean {
	if (!existsSync(path)) return true
	const files = readdirSync(path)
	return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
```

## Key benefits

### Developer experience

- **Zero configuration**: Works immediately with sensible defaults
- **Framework flexibility**: Support for React, Next.js, and Vue ecosystems
- **Interactive guidance**: Step-by-step project setup with visual feedback
- **Universal compatibility**: Works with npm, yarn, and pnpm package managers
- **Error prevention**: Comprehensive validation and safety checks

### Template ecosystem

- **Curated quality**: Official templates demonstrate best practices
- **Feature examples**: Specialized templates for multiplayer, AI integration
- **Extensible architecture**: Easy addition of new templates
- **Automatic updates**: Template list stays current with repository changes
- **Community driven**: Clear contribution model for new template types

### Production readiness

- **TypeScript first**: All templates include strict TypeScript configuration
- **Modern tooling**: Latest build tools, development servers, and frameworks
- **Deployment ready**: Templates include production build and deployment guides
- **Testing integration**: Pre-configured testing frameworks and example tests
- **Performance optimized**: Build configurations optimized for production use

### Maintenance and reliability

- **Automated validation**: Template repositories automatically validated for integrity
- **Version consistency**: Templates maintained to work with current tldraw releases
- **Comprehensive testing**: CLI functionality covered by automated test suite
- **Documentation**: Each template includes detailed setup and customization guides
- **Error recovery**: Graceful handling of network issues, user cancellation, and edge cases


# ==========================================
# FILE: packages/dotcom-shared/CONTEXT.md
# ==========================================

# Dotcom-Shared Package Context

## Overview

The `@tldraw/dotcom-shared` package contains shared code between the tldraw.com web application and its worker services. It provides database schema, optimistic state management, permissions, and API types for the collaborative tldraw platform.

## Architecture

### Database schema (`tlaSchema.ts`)

Comprehensive data model using Rocicorp Zero for real-time collaboration:

#### Core tables

```typescript
// User Management
const user = table('user')
	.columns({
		id: string(),
		name: string(),
		email: string(),
		avatar: string(),
		color: string(),
		exportFormat: string(),
		exportTheme: string(),
		exportBackground: boolean(),
		exportPadding: boolean(),
		createdAt: number(),
		updatedAt: number(),
		flags: string(),
		// User preferences (optional)
		locale: string().optional(),
		animationSpeed: number().optional(),
		areKeyboardShortcutsEnabled: boolean().optional(),
		edgeScrollSpeed: number().optional(),
		colorScheme: string().optional(),
		isSnapMode: boolean().optional(),
		isWrapMode: boolean().optional(),
		isDynamicSizeMode: boolean().optional(),
		isPasteAtCursorMode: boolean().optional(),
		enhancedA11yMode: boolean().optional(),
		allowAnalyticsCookie: boolean().optional(),
	})
	.primaryKey('id')

// File Management
const file = table('file')
	.columns({
		id: string(),
		name: string(),
		ownerId: string(),
		ownerName: string(),
		ownerAvatar: string(),
		thumbnail: string(),
		shared: boolean(),
		sharedLinkType: string(),
		published: boolean(),
		lastPublished: number(),
		publishedSlug: string(),
		createdAt: number(),
		updatedAt: number(),
		isEmpty: boolean(),
		isDeleted: boolean(),
		createSource: string().optional(),
	})
	.primaryKey('id', 'ownerId', 'publishedSlug')

// User-File Relationship State
const file_state = table('file_state')
	.columns({
		userId: string(),
		fileId: string(),
		firstVisitAt: number().optional(),
		lastEditAt: number().optional(),
		lastSessionState: string().optional(),
		lastVisitAt: number().optional(),
		isFileOwner: boolean().optional(),
		isPinned: boolean().optional(),
	})
	.primaryKey('userId', 'fileId')
```

#### Relationships

Type-safe relational queries between tables:

```typescript
const fileRelationships = relationships(file, ({ one, many }) => ({
	owner: one({
		sourceField: ['ownerId'],
		destField: ['id'],
		destSchema: user,
	}),
	states: many({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: file_state,
	}),
}))

const fileStateRelationships = relationships(file_state, ({ one }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
}))
```

### Optimistic state management (`OptimisticAppStore.ts`)

Real-time UI updates with optimistic mutations:

#### Store architecture

```typescript
class OptimisticAppStore {
	private _gold_store = atom('zero store', null as null | ZStoreData, { isEqual })
	private _optimisticStore = atom<
		Array<{
			updates: ZRowUpdate[]
			mutationId: string
		}>
	>('optimistic store', [])

	// Computed store combining committed + optimistic changes
	private store = computed('store', () => {
		const gold = this._gold_store.get()
		if (!gold) return null

		let data = gold
		const optimistic = this._optimisticStore.get()
		for (const changes of optimistic) {
			for (const update of changes.updates) {
				data = this.applyUpdate(data, update)
			}
		}
		return data
	})
}
```

#### Optimistic update flow

```typescript
// 1. Apply optimistic update immediately for instant UI
updateOptimisticData(updates: ZRowUpdate[], mutationId: string) {
  this._optimisticStore.update(prev => [...prev, { updates, mutationId }])
}

// 2. Server confirms - remove from optimistic store
commitMutations(mutationIds: string[]) {
  this._optimisticStore.update(prev => {
    const highestIndex = prev.findLastIndex(p => mutationIds.includes(p.mutationId))
    return prev.slice(highestIndex + 1)
  })
}

// 3. Server rejects - rollback optimistic changes
rejectMutation(mutationId: string) {
  this._optimisticStore.update(prev =>
    prev.filter(p => p.mutationId !== mutationId)
  )
}
```

#### Data synchronization

```typescript
// Apply database updates (insert/update/delete)
applyUpdate(prev: ZStoreData, update: ZRowUpdate): ZStoreData {
  const { row, table, event } = update
  const tableSchema = schema.tables[table]
  const rows = prev[table]

  const matchExisting = (existing: any) =>
    tableSchema.primaryKey.every(key => existing[key] === row[key])

  switch (event) {
    case 'insert':
      return { ...prev, [table]: [...rows, row] }
    case 'update':
      return {
        ...prev,
        [table]: rows.map(existing =>
          matchExisting(existing) ? { ...existing, ...row } : existing
        )
      }
    case 'delete':
      return {
        ...prev,
        [table]: rows.filter(existing => !matchExisting(existing))
      }
  }
}
```

### Permission system

Role-based access control for collaborative features:

#### User permissions

```typescript
const permissions = definePermissions<AuthData, TlaSchema>(schema, () => {
	// Users can only access their own user record
	const allowIfIsUser = (authData: AuthData, { cmp }) => cmp('id', '=', authData.sub!)

	// Users can only access their own file states
	const allowIfIsUserIdMatches = (authData: AuthData, { cmp }) => cmp('userId', '=', authData.sub!)

	// File access: owner OR shared file with file_state record
	const userCanAccessFile = (authData: AuthData, { exists, and, cmp, or }) =>
		or(
			cmp('ownerId', '=', authData.sub!), // File owner
			and(
				cmp('shared', '=', true), // File is shared
				exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
			)
		)

	return {
		user: { row: { select: [allowIfIsUser] } },
		file: { row: { select: [userCanAccessFile] } },
		file_state: { row: { select: [allowIfIsUserIdMatches] } },
	}
})
```

### Mutation system (`mutators.ts`)

Type-safe database operations with validation:

#### User mutations

```typescript
user: {
  insert: async (tx, user: TlaUser) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    await tx.mutate.user.insert(user)
  },
  update: async (tx, user: TlaUserPartial) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    disallowImmutableMutations(user, immutableColumns.user)
    await tx.mutate.user.update(user)
  }
}
```

#### File mutations

```typescript
file: {
  insertWithFileState: async (tx, { file, fileState }) => {
    assert(file.ownerId === userId, ZErrorCode.forbidden)
    await assertNotMaxFiles(tx, userId)

    // File ID validation
    assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
    assert(file.id.length <= 32, ZErrorCode.bad_request)
    assert(file.id.length >= 16, ZErrorCode.bad_request)

    await tx.mutate.file.insert(file)
    await tx.mutate.file_state.upsert(fileState)
  },

  deleteOrForget: async (tx, file: TlaFile) => {
    // Remove user's file state
    await tx.mutate.file_state.delete({ fileId: file.id, userId })

    // If owner, mark as deleted (cascade delete other file states)
    if (file?.ownerId === userId) {
      await tx.mutate.file.update({
        id: file.id,
        ownerId: file.ownerId,
        publishedSlug: file.publishedSlug,
        isDeleted: true
      })
    }
  }
}
```

#### Data protection

```typescript
// Prevent modification of immutable columns
const immutableColumns = {
	user: new Set(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set(['ownerName', 'ownerAvatar', 'createSource', 'updatedAt', 'createdAt']),
	file_state: new Set(['firstVisitAt', 'isFileOwner']),
}

function disallowImmutableMutations(data, immutableColumns) {
	for (const immutableColumn of immutableColumns) {
		assert(!data[immutableColumn], ZErrorCode.forbidden)
	}
}
```

### API Types (`types.ts`)

Comprehensive type definitions for client-server communication:

#### Room management

```typescript
interface CreateRoomRequestBody {
	origin: string
	snapshot: Snapshot
}

interface CreateSnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
	parent_slug?: string
}

type CreateSnapshotResponseBody =
	| { error: false; roomId: string }
	| { error: true; message: string }
```

#### File operations

```typescript
interface CreateFilesRequestBody {
	origin: string
	snapshots: Snapshot[]
}

type CreateFilesResponseBody = { error: false; slugs: string[] } | { error: true; message: string }

type PublishFileResponseBody = { error: false } | { error: true; message: string }
```

#### Real-Time communication

```typescript
// Server to Client
type ZServerSentPacket =
	| { type: 'initial_data'; initialData: ZStoreData }
	| { type: 'update'; update: ZRowUpdate }
	| { type: 'commit'; mutationIds: string[] }
	| { type: 'reject'; mutationId: string; errorCode: ZErrorCode }

// Client to Server
interface ZClientSentMessage {
	type: 'mutator'
	mutationId: string
	name: string
	props: object
}
```

### Configuration and constants

#### Room management (`routes.ts`)

URL routing patterns for different room types:

```typescript
const ROOM_OPEN_MODE = {
	READ_ONLY: 'readonly',
	READ_ONLY_LEGACY: 'readonly-legacy',
	READ_WRITE: 'read-write',
}

// URL prefixes for different room types
const READ_ONLY_PREFIX = 'ro' // /ro/abc123
const READ_ONLY_LEGACY_PREFIX = 'v' // /v/abc123
const ROOM_PREFIX = 'r' // /r/abc123
const SNAPSHOT_PREFIX = 's' // /s/abc123
const FILE_PREFIX = 'f' // /f/abc123
const PUBLISH_PREFIX = 'p' // /p/abc123

const RoomOpenModeToPath = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}
```

#### Application limits (`constants.ts`)

```typescript
const MAX_NUMBER_OF_FILES = 200 // Per-user file limit
const ROOM_SIZE_LIMIT_MB = 25 // Room data size limit
```

### Error handling

#### Error code system

```typescript
const ZErrorCode = stringEnum(
	'publish_failed',
	'unpublish_failed',
	'republish_failed',
	'unknown_error',
	'client_too_old',
	'forbidden',
	'bad_request',
	'rate_limit_exceeded',
	'max_files_reached'
)
```

#### Validation and assertions

```typescript
// File limit enforcement
async function assertNotMaxFiles(tx: Transaction, userId: string) {
	const count = (await tx.query.file.where('ownerId', '=', userId).run()).filter(
		(f) => !f.isDeleted
	).length
	assert(count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
}

// File ID validation
assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
assert(file.id.length <= 32, ZErrorCode.bad_request)
assert(file.id.length >= 16, ZErrorCode.bad_request)
```

## Key features

### Real-time collaboration

**Optimistic updates**: Immediate UI response while server processes changes
**Conflict resolution**: Automatic handling of concurrent modifications
**Live sync**: Real-time data synchronization across multiple clients

### File management

**Ownership model**: Clear file ownership with sharing capabilities
**Access control**: Permission-based file access for collaboration
**State tracking**: Per-user file interaction history and preferences

### User experience

**Preferences sync**: User settings synchronized across devices
**Export options**: Customizable export formats and themes
**Session state**: Restore user's last position and tool selection

### Security

**Authentication**: JWT-based user authentication
**Authorization**: Row-level security with permission expressions
**Data Isolation**: Users can only access permitted data

## Data flow patterns

### Mutation flow

```typescript
// 1. Client initiates mutation
const mutationId = generateId()
await appStore.updateOptimisticData(updates, mutationId)

// 2. Send to server
websocket.send({
	type: 'mutator',
	mutationId,
	name: 'file.update',
	props: { name: 'New File Name' },
})

// 3. Server response
// Success: { type: 'commit', mutationIds: [mutationId] }
// Failure: { type: 'reject', mutationId, errorCode: 'forbidden' }
```

### File sharing

```typescript
// Owner shares file
await mutators.file.update({
	id: fileId,
	shared: true,
	sharedLinkType: 'edit', // or 'view'
})

// Collaborator joins
await mutators.file_state.insert({
	userId: currentUserId,
	fileId: sharedFileId,
	firstVisitAt: Date.now(),
})
```

### Permission enforcement

```typescript
// File access check
const userCanAccessFile = (authData, { exists, and, cmp, or }) =>
	or(
		cmp('ownerId', '=', authData.sub!), // User owns file
		and(
			cmp('shared', '=', true), // File is shared
			exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
		)
	)
```

## Protocol communication

### WebSocket Protocol

Bi-directional communication for real-time collaboration:

#### Server messages

```typescript
// Initial data load
{ type: 'initial_data', initialData: ZStoreData }

// Live updates
{ type: 'update', update: ZRowUpdate }

// Mutation confirmations
{ type: 'commit', mutationIds: string[] }

// Mutation rejections
{ type: 'reject', mutationId: string, errorCode: ZErrorCode }
```

#### Client messages

```typescript
// Mutation requests
{
  type: 'mutator',
  mutationId: string,
  name: 'file.update' | 'user.update' | 'file_state.insert',
  props: object
}
```

### Version management

```typescript
// Protocol versioning for backwards compatibility
const Z_PROTOCOL_VERSION = 2
const MIN_Z_PROTOCOL_VERSION = 2

// Forces client reload on breaking changes
if (clientVersion < MIN_Z_PROTOCOL_VERSION) {
	throw new Error(ZErrorCode.client_too_old)
}
```

## User preferences system

### Preferences schema

Comprehensive user customization options:

```typescript
const UserPreferencesKeys = [
	'locale', // Language/region
	'animationSpeed', // UI animation timing
	'areKeyboardShortcutsEnabled', // Keyboard shortcuts toggle
	'edgeScrollSpeed', // Canvas edge scrolling
	'colorScheme', // Light/dark theme
	'isSnapMode', // Shape snapping
	'isWrapMode', // Text wrapping
	'isDynamicSizeMode', // Dynamic shape sizing
	'isPasteAtCursorMode', // Paste behavior
	'enhancedA11yMode', // Enhanced a11y mode
	'name', // Display name
	'color', // User color for collaboration
] as const satisfies Array<keyof TlaUser>
```

### Export configuration

```typescript
interface TlaUser {
	exportFormat: string // 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: string // 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background
	exportPadding: boolean // Add padding around content
}
```

## File lifecycle

### File creation

```typescript
// Create file with initial state
await mutators.file.insertWithFileState({
	file: {
		id: generateFileId(),
		name: 'Untitled',
		ownerId: userId,
		shared: false,
		published: false,
		isEmpty: true,
		isDeleted: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	},
	fileState: {
		userId,
		fileId,
		firstVisitAt: Date.now(),
		isFileOwner: true,
	},
})
```

### File deletion

```typescript
// Soft delete preserving history
await mutators.file.deleteOrForget(file)

// If owner: marks file as deleted, cascades to all file_states
// If collaborator: removes only user's file_state
```

### Publishing system

```typescript
// Publish for public access
await mutators.file.update({
	id: fileId,
	published: true,
	publishedSlug: generateSlug(),
	lastPublished: Date.now(),
})
```

## Feedback system

### User feedback collection

```typescript
interface SubmitFeedbackRequestBody {
	description: string // User's feedback/bug report
	allowContact: boolean // Permission to follow up
	url: string // Page where feedback originated
}

const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000
```

## License management

### License key system

```typescript
// License validation for pro features
export default function getLicenseKey(): string | null {
	// Returns license key for premium features
	// Used by both client and worker for feature gating
}
```

## Key benefits

### Developer experience

- **Type safety**: Full TypeScript definitions for all operations
- **Real-time**: Optimistic updates for instant UI feedback
- **Scalable**: Designed for thousands of concurrent users
- **Reliable**: Automatic conflict resolution and error recovery

### User experience

- **Instant updates**: Changes appear immediately while syncing
- **Offline resilience**: Optimistic updates work during network issues
- **Collaborative**: Multiple users can edit simultaneously
- **Persistent**: All changes automatically saved and synchronized

### Architecture

- **Shared logic**: Common code between client and server
- **Event driven**: WebSocket-based real-time communication
- **Permission controlled**: Secure access to user and file data
- **Version managed**: Protocol versioning for smooth updates

### Maintenance

- **Schema evolution**: Zero-downtime database migrations
- **Error tracking**: Comprehensive error codes and logging
- **Performance**: Optimized queries and efficient data structures
- **Testing**: Comprehensive test coverage for critical paths


# ==========================================
# FILE: packages/editor/CONTEXT.md
# ==========================================

````markdown
# CONTEXT.md - @tldraw/editor package

This file provides comprehensive context for understanding the `@tldraw/editor` package, the core infinite canvas editor for tldraw.

## Package overview

The `@tldraw/editor` package is the foundational layer of tldraw - a minimal infinite canvas editor without any specific shapes, tools, or UI. It provides the core editing engine that the main `tldraw` package builds upon.

**Key distinction:** This package provides the editor engine only. For a complete editor with shapes and UI, use `@tldraw/tldraw` instead.

**Version:** 3.15.1  
**Compatibility:** Requires Node.js ^20.0.0, React ^18.0.0  
**Bundle:** Ships with separate CSS file (`editor.css`) that must be imported

## Architecture overview

### Core components

**1. Editor Class (`src/lib/editor/Editor.ts`)**

- Central orchestrator for all editor functionality
- Manages the store, camera, selection, tools, and rendering
- Implements the main API surface for programmatic interaction
- Event-driven architecture using EventEmitter3
- Reactive state management using `@tldraw/state` signals

**2. TldrawEditor Component (`src/lib/TldrawEditor.tsx`)**

- Main React component that renders the editor
- Handles store creation, loading states, error boundaries
- Manages editor lifecycle and mounting
- Provides theming (light/dark mode) and licensing

**3. Store Integration**

- Uses `@tldraw/store` for reactive data persistence
- Supports local IndexedDB persistence via `persistenceKey`
- Can accept external stores or create internal ones
- Handles loading states and sync status

### State management architecture

**Reactive signals system:**

- Uses `@tldraw/state` for reactive state management
- Atoms for mutable state, Computed for derived state
- Automatic dependency tracking and efficient updates
- All editor state is reactive and observable

**Store structure:**

- Document data stored in `TLStore` (shapes, pages, assets, etc.)
- Editor state (camera, selection, tools) stored separately
- Derivations compute dependent values efficiently
- History management with undo/redo support

### Tools and state system

**StateNode architecture (`src/lib/editor/tools/StateNode.ts`)**

- Hierarchical finite state machine for tools
- Each tool is a StateNode with potential child states
- Event-driven with handlers for pointer, keyboard, tick events
- Supports both "branch" nodes (with children) and "leaf" nodes

**Tool types:**

- Root state manages overall editor state
- Tool states handle specific user interactions
- Child states for complex tools (e.g., drawing, resizing)
- Configurable tool state charts

### Shape system

**ShapeUtil architecture (`src/lib/editor/shapes/ShapeUtil.ts`)**

- Abstract base class for defining shape behavior
- Each shape type needs a corresponding ShapeUtil
- Handles rendering, geometry, interactions, and serialization
- Extensible system for custom shapes

**Key shape methods:**

- `getGeometry()` - Shape's geometric representation
- `component()` - React component for rendering
- `indicator()` - Selection indicator rendering
- `onResize()`, `onRotate()` - Interaction handlers

### Binding system

**BindingUtil architecture (`src/lib/editor/bindings/BindingUtil.ts`)**

- Abstract base class for defining relationships between shapes
- Manages connections like arrows to shapes, text to shapes, etc.
- Handles binding creation, updates, and cleanup
- Each binding type needs a corresponding BindingUtil

**Key binding concepts:**

- Bindings connect shapes through relationships
- `fromId` and `toId` reference connected shapes
- BindingUtils define visual indicators and interaction behavior
- Automatically updated when connected shapes change

### Manager system

The editor uses specialized managers for different concerns:

**Core managers:**

- `ClickManager` - Multi-click detection and handling
- `EdgeScrollManager` - Auto-scroll at viewport edges during interactions
- `FocusManager` - Focus state and keyboard event handling
- `FontManager` - Font loading and management
- `HistoryManager` - Undo/redo functionality
- `ScribbleManager` - Brush/scribble interactions
- `SnapManager` - Shape snapping during interactions
- `TextManager` - Text measurement and rendering
- `TickManager` - Animation frame management
- `UserPreferencesManager` - User settings persistence

### Component system

**Default components (`src/lib/components/default-components/`)**

- Minimal implementations for all editor UI elements
- Canvas, cursors, handles, selection indicators, grid
- Error fallbacks and loading screens
- Fully customizable via `components` prop

**Key components:**

- `DefaultCanvas` - Main drawing surface
- `DefaultCursor` - Mouse cursor rendering
- `DefaultHandles` - Shape resize/rotate handles
- `DefaultSelectionBackground/Foreground` - Selection UI
- `DefaultGrid` - Viewport grid overlay

**Indicators system (`src/lib/components/default-components/DefaultSelectionBackground.tsx`)**

- Visual feedback for shape selection and interaction states
- Includes selection boxes, rotation handles, and resize handles
- Shape-specific indicators defined in ShapeUtil.indicator()
- Binding indicators for relationship visualization

### Text editing integration

**Tiptap integration:**

- Uses `@tiptap/core` and related packages for rich text editing
- Provides collaborative text editing capabilities
- Handles text formatting, selection, and cursor management
- Integrates with tldraw's event system and state management

**Text manager (`src/lib/editor/managers/TextManager.ts`):**

- Handles text measurement and font metrics
- Manages text input states and focus
- Coordinates with Tiptap editor instances
- Provides text layout and wrapping calculations

### Geometry and math

**Primitive system (`src/lib/primitives/`)**

- `Vec` - 2D vector math
- `Mat` - 2D transformation matrices
- `Box` - Axis-aligned bounding boxes
- Geometry2d classes for shape collision/intersection
- Comprehensive math utilities for canvas operations

**Geometry classes:**

- `Rectangle2d`, `Circle2d`, `Polygon2d`, etc.
- Hit testing and intersection calculations
- Point-in-shape and shape-shape collision detection

### Event system

**Event flow:**

1. DOM events captured by editor container
2. Processed through pointer/keyboard managers
3. Dispatched to current tool's StateNode
4. Tool updates editor state accordingly
5. Reactive system triggers re-renders

**Event types:**

- Pointer events (down, move, up) with target detection
- Keyboard events with modifier key handling
- Wheel events for zooming/panning
- Tick events for animations

### Export and serialization

**Export capabilities:**

- SVG export with full shape fidelity
- PNG/JPEG export via canvas rendering
- Snapshot serialization for persistence
- Asset handling (images, videos, fonts)

**Deep links:**

- URL-based state synchronization
- Camera position and selected shapes in URL
- Configurable deep link behavior

### Licensing and watermark

**License management:**

- Handles tldraw licensing and watermark display
- `LicenseProvider` and `LicenseManager` components
- Watermark removal with valid business license
- License validation and enforcement

## Key files and directories

### Core implementation

- `src/lib/editor/Editor.ts` - Main editor class
- `src/lib/TldrawEditor.tsx` - React component wrapper
- `src/lib/config/createTLStore.ts` - Store creation and configuration
- `src/lib/options.ts` - Editor configuration options

### Tools and state

- `src/lib/editor/tools/StateNode.ts` - State machine base class
- `src/lib/editor/tools/RootState.ts` - Root state implementation
- `src/lib/editor/tools/BaseBoxShapeTool/` - Base tool for box shapes

### Shape system

- `src/lib/editor/shapes/ShapeUtil.ts` - Shape utility base class
- `src/lib/editor/shapes/BaseBoxShapeUtil.tsx` - Base for rectangular shapes
- `src/lib/editor/shapes/group/GroupShapeUtil.tsx` - Group shape implementation

### Binding system

- `src/lib/editor/bindings/BindingUtil.ts` - Binding utility base class

### Managers

- `src/lib/editor/managers/` - All manager implementations
- `src/lib/editor/managers/ClickManager.ts` - Multi-click handling
- `src/lib/editor/managers/EdgeScrollManager.ts` - Auto-scroll functionality
- `src/lib/editor/managers/FocusManager.ts` - Focus state management
- `src/lib/editor/managers/FontManager.ts` - Font loading and management
- `src/lib/editor/managers/HistoryManager.ts` - Undo/redo functionality
- `src/lib/editor/managers/ScribbleManager.ts` - Brush interactions
- `src/lib/editor/managers/SnapManager.ts` - Shape snapping
- `src/lib/editor/managers/TextManager.ts` - Text measurement and rendering
- `src/lib/editor/managers/TickManager.ts` - Animation frame management
- `src/lib/editor/managers/UserPreferencesManager.ts` - User settings

### Components and indicators

- `src/lib/components/default-components/` - Default UI components
- `src/lib/components/default-components/DefaultCanvas.tsx` - Main drawing surface
- `src/lib/components/default-components/DefaultCursor.tsx` - Mouse cursor rendering
- `src/lib/components/default-components/DefaultHandles.tsx` - Shape handles
- `src/lib/components/default-components/DefaultSelectionBackground.tsx` - Selection indicators
- `src/lib/components/default-components/DefaultGrid.tsx` - Viewport grid

### Testing infrastructure

- `src/test/TestEditor.ts` - Editor testing utilities and mocks
- `src/test/` - Integration tests and test helpers

### Utilities

- `src/lib/utils/` - Editor-specific utilities
- `src/lib/primitives/` - Math and geometry utilities
- `src/lib/hooks/` - React hooks for editor integration

## Development patterns

### Creating custom shapes

```typescript
class MyShapeUtil extends ShapeUtil<TLMyShape> {
  static override type = 'my-shape' as const

  getGeometry(shape: TLMyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
    })
  }

  component(shape: TLMyShape) {
    return <div>My Shape Content</div>
  }

  indicator(shape: TLMyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```
````

### Creating custom tools

```typescript
export class MyTool extends StateNode {
	static override id = 'my-tool'

	onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	onPointerDown(info: TLPointerEventInfo) {
		this.editor.createShape({
			id: createShapeId(),
			type: 'my-shape',
			x: info.point.x,
			y: info.point.y,
		})
	}
}
```

### State management

```typescript
// Access reactive state
const selectedShapes = editor.getSelectedShapes()
const bounds = editor.getSelectionPageBounds()

// Subscribe to changes
editor.store.listen((entry) => {
	console.log('Store changed:', entry)
})

// Use transactions for atomic updates
editor.batch(() => {
	editor.createShape(shape1)
	editor.createShape(shape2)
	editor.selectAll()
})
```

### Testing patterns

```typescript
import { TestEditor } from './test/TestEditor'

describe('MyFeature', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	it('should create shapes', () => {
		editor.createShape({ type: 'geo', id: ids.box1 })
		expect(editor.getOnlySelectedShape()).toBe(editor.getShape(ids.box1))
	})
})
```

## Dependencies

**Runtime dependencies:**

- `@tldraw/state` ^3.15.1 - Reactive state management
- `@tldraw/state-react` ^3.15.1 - React integration for state
- `@tldraw/store` ^3.15.1 - Document store
- `@tldraw/tlschema` ^3.15.1 - Type definitions and migrations
- `@tldraw/utils` ^3.15.1 - Shared utilities
- `@tldraw/validate` ^3.15.1 - Schema validation
- `@tiptap/core` ^2.6.6 - Rich text editing foundation
- `@tiptap/react` ^2.6.6 - React integration for Tiptap
- `@tiptap/pm` ^2.6.6 - ProseMirror integration
- `@use-gesture/react` ^10.3.1 - Touch/gesture handling
- `classnames` ^2.5.1 - CSS class utility
- `core-js` ^3.39.0 - JavaScript polyfills
- `eventemitter3` ^5.0.1 - Event system
- `idb` ^8.0.0 - IndexedDB wrapper
- `is-plain-object` ^5.0.0 - Object type checking

**Key peer dependencies:**

- `react` ^18.0.0 - Required React version
- `react-dom` ^18.0.0 - Required React DOM version

## CSS and styling

**CSS bundle:**

- Ships with `editor.css` containing all core styles
- Uses CSS custom properties for theming
- Separate from tldraw.css (which includes shape styles)
- Must be imported: `import '@tldraw/editor/editor.css'`

**Styling approach:**

- CSS-in-JS for dynamic styles (selections, cursors)
- Static CSS for layout and base component styles
- Theme variables for light/dark mode switching
- Minimal external styling dependencies

## Performance considerations

**Reactive system optimization:**

- Reactive system minimizes unnecessary re-renders through precise dependency tracking
- Computed values are cached and only recalculated when dependencies change
- Store changes are batched to prevent cascading updates
- Component re-renders are minimized through React memo and signal integration

**Rendering performance:**

- Geometry calculations are cached and memoized using shape geometry cache
- Large shape counts handled via viewport culling - only visible shapes are rendered
- Canvas rendering optimized for 60fps interactions with efficient paint cycles
- SVG export uses virtualization for large documents
- Font loading is managed asynchronously to prevent layout shifts during text rendering

**Memory management:**

- Unused shape utilities are garbage collected
- Event listeners are properly cleaned up on component unmount
- Large assets are handled with lazy loading and disposal
- Store history is pruned to prevent unbounded memory growth

## Extensibility points

**Highly customizable:**

- Shape definitions via ShapeUtil
- Binding definitions via BindingUtil
- Tool behavior via StateNode
- UI components via components prop
- Event handling via editor instance
- Styling via CSS custom properties

**Less customizable:**

- Core editor logic and data flow
- Store structure and reactivity system
- Basic event processing pipeline
- Text editing integration with Tiptap

```

```


# ==========================================
# FILE: packages/namespaced-tldraw/CONTEXT.md
# ==========================================

Now I have enough information to fix the CONTEXT.md file with the correct details. Here's the updated version:

# Namespaced-Tldraw Package Context

## Overview

The `@tldraw/tldraw` package is a legacy compatibility wrapper that re-exports the main `tldraw` package while adding global library registration. It exists primarily for backwards compatibility and CDN/global usage scenarios where version tracking is important.

## Architecture

### Legacy compatibility layer

Simple re-export pattern with version registration:

```typescript
import { registerTldrawLibraryVersion } from 'tldraw'
export * from 'tldraw'

// Register version info for global usage tracking
registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
```

### Package structure

```
namespaced-tldraw/
├── src/
│   └── index.ts              # Re-export + version registration
├── scripts/
│   └── copy-css-files.mjs    # CSS file synchronization
├── tldraw.css                # Copied CSS from main package
├── dist-cjs/                 # CommonJS distribution
├── dist-esm/                 # ES modules distribution
├── api/                      # API documentation
└── api-report.api.md         # API report in package root
```

## Distribution strategy

### Build system integration

Uses tsx wrapper for build processes:

```json
{
	"build": "yarn run -T tsx ../../internal/scripts/build-package.ts",
	"build-api": "yarn run -T tsx ../../internal/scripts/build-api.ts",
	"prepack": "yarn run -T tsx ../../internal/scripts/prepack.ts"
}
```

**Note**: The `main` and `types` fields in package.json are rewritten by the build script and are not the actual published values.

### CSS asset management

Automated CSS synchronization from main package using correct relative paths:

```javascript
// scripts/copy-css-files.mjs
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const packageDir = join(__dirname, '..')
const content = readFileSync(join(packageDir, '..', 'tldraw', 'tldraw.css'), 'utf8')
const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, content)
```

**Build integration:**

```json
{
	"predev": "node ./scripts/copy-css-files.mjs",
	"dev": "chokidar '../tldraw/tldraw.css' -c 'node ./scripts/copy-css-files.mjs'",
	"prebuild": "node ./scripts/copy-css-files.mjs"
}
```

## Global usage support

### Version registration system

Enables version tracking for CDN and global usage using globalThis casting:

```typescript
// Library version info injected by build system
// Global variables accessed via globalThis casting
registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME, // Package identifier
	(globalThis as any).TLDRAW_LIBRARY_VERSION, // Semantic version
	(globalThis as any).TLDRAW_LIBRARY_MODULES // Included modules list
)
```

### CDN integration patterns

Designed for script tag and global usage:

```html
<!-- CDN usage -->
<script src="https://unpkg.com/@tldraw/tldraw"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw/tldraw.css" />

<script>
	// Access via global namespace
	const { Tldraw } = window.Tldraw

	// Version tracking automatically enabled
	console.log('tldraw version:', window.TLDRAW_LIBRARY_VERSION)
</script>
```

## Package dependencies

### Minimal dependency chain

Single dependency on core tldraw package:

```json
{
	"dependencies": {
		"tldraw": "workspace:*" // Re-export main package
	},
	"peerDependencies": {
		"react": "^18.2.0 || ^19.2.1",
		"react-dom": "^18.2.0 || ^19.2.1"
	}
}
```

### Development dependencies

Build and development tooling:

```json
{
	"devDependencies": {
		"@types/react": "^18.3.18",
		"chokidar-cli": "^3.0.0", // CSS file watching
		"lazyrepo": "0.0.0-alpha.27",
		"react": "^18.3.1",
		"react-dom": "^18.3.1"
	}
}
```

## Build system

### Dual package exports

Support for both CommonJS and ES modules (built by tsx scripts):

```
dist-cjs/
├── index.js          # CommonJS entry point
├── index.d.ts        # CommonJS type definitions
└── index.js.map      # Source maps

dist-esm/
├── index.mjs         # ES module entry point
├── index.d.mts       # ES module type definitions
└── index.mjs.map     # Source maps
```

### API Documentation

Automated API extraction and documentation:

```
api/
├── api.json          # Machine-readable API surface
├── public.d.ts       # Public API definitions
├── internal.d.ts     # Internal API definitions
└── temp/
    └── api-report.api.md  # Human-readable API report

api-report.api.md     # Also exists in package root
```

### CSS Distribution

CSS file included in package files array:

```json
{
	"files": ["tldraw.css"]
}
```

**CSS Import**: Users import the CSS file directly from the package:

```typescript
import '@tldraw/tldraw/tldraw.css'
```

## Legacy support

### Migration path

Smooth transition for existing users:

```typescript
// Old usage (still works)
import { Tldraw } from '@tldraw/tldraw'

// New recommended usage
import { Tldraw } from 'tldraw'

// Both import the exact same functionality
```

### Backwards compatibility

Maintains full API compatibility:

- **Same exports**: Identical API surface as main package
- **Same types**: TypeScript definitions preserved
- **Same CSS**: Styling rules synchronized
- **Same behavior**: Functional parity guaranteed

## Use cases

### CDN distribution

Global script tag usage for quick prototyping:

```html
<script src="https://unpkg.com/@tldraw/tldraw@latest/dist-cjs/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw@latest/tldraw.css" />
```

### Legacy projects

Existing codebases that depend on `@tldraw/tldraw` naming:

```typescript
// Existing imports continue to work
import { Tldraw, Editor, createShapeId } from '@tldraw/tldraw'

// No code changes required for migration
```

### Version monitoring

Applications that need to track tldraw version usage:

```typescript
// Access version information at runtime
const libraryInfo = {
	name: (globalThis as any).TLDRAW_LIBRARY_NAME,
	version: (globalThis as any).TLDRAW_LIBRARY_VERSION,
	modules: (globalThis as any).TLDRAW_LIBRARY_MODULES,
}

// Useful for analytics, debugging, feature detection
```

## Development workflow

### CSS synchronization

Automatic CSS file management during development:

```bash
# Development mode - watch for CSS changes
yarn dev  # Monitors ../tldraw/tldraw.css for changes

# Build mode - ensure CSS is current
yarn build  # Copies CSS before building distributions
```

### Testing environment

Jest configuration with correct testEnvironment path:

```json
{
	"preset": "../../internal/config/jest/node/jest-preset.js",
	"testEnvironment": "../../../packages/utils/patchedJestJsDom.js",
	"setupFiles": ["raf/polyfill", "jest-canvas-mock"],
	"setupFilesAfterEnv": ["../../internal/config/setupJest.ts"],
	"moduleNameMapper": {
		"^~(.*)": "<rootDir>/src/$1",
		"\\.(css|less|scss|sass)$": "identity-obj-proxy"
	}
}
```

## Migration guidance

### For new projects

```typescript
// Recommended: Use main package
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

### For existing projects

```typescript
// Current: Legacy package (still supported)
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// Migration: Update imports when convenient
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

## Key benefits

### Backwards compatibility

- **Zero breaking changes**: Existing code continues to work
- **Gradual migration**: Update imports at your own pace
- **Feature parity**: Identical functionality to main package
- **Documentation continuity**: Same API documentation applies

### Global usage

- **CDN friendly**: Optimized for script tag inclusion
- **Version tracking**: Runtime version information available via globalThis
- **Namespace safety**: Avoids global namespace conflicts
- **Browser compatibility**: Works in all modern browsers

### Maintenance

- **Automated sync**: CSS and exports stay current with main package via tsx build scripts
- **Single source**: No duplicate implementation to maintain
- **Version alignment**: Always matches main package version
- **Testing coverage**: Inherits test suite from main package

### Ecosystem

- **NPM compatibility**: Standard npm package structure
- **Bundler support**: Works with all major bundlers
- **TypeScript ready**: Full type safety maintained
- **Documentation**: API docs generated automatically with reports in both api/temp/ and package root


# ==========================================
# FILE: packages/state-react/CONTEXT.md
# ==========================================

````markdown
# State-React Package Context

## Overview

The `@tldraw/state-react` package provides React bindings for tldraw's reactive state system (signals). It bridges the gap between the pure signals implementation in `@tldraw/state` and React's component lifecycle, enabling seamless integration of reactive state with React applications.

## Architecture

### Core React hooks

#### `useValue` - signal subscription

The primary hook for extracting values from signals and subscribing to changes:

```typescript
// Direct signal subscription
useValue<Value>(signal: Signal<Value>): Value

// Computed value with dependency tracking
useValue<Value>(name: string, compute: () => Value, deps: unknown[]): Value
```
````

Implementation details:

- Uses `useSyncExternalStore` for React 18 compatibility
- Creates subscription to signal change events
- Returns unwrapped value using `__unsafe__getWithoutCapture()` method
- Supports both direct signals and computed expressions
- Automatic dependency tracking with deps array
- Safe error handling with try-catch blocks for render-time exceptions

**Return signature:**
The hook returns the actual value (not the signal wrapper) by using `__unsafe__getWithoutCapture()` to avoid triggering dependency tracking during the subscription callback.

#### `useAtom` - component-local state

Creates component-scoped reactive atoms:

```typescript
useAtom<Value, Diff>(
  name: string,
  valueOrInitialiser: Value | (() => Value),
  options?: AtomOptions<Value, Diff>
): Atom<Value, Diff>
```

Features:

- Created only once per component instance using `useState`
- Supports lazy initialization with function initializers
- Configurable with AtomOptions (diff functions, etc.)
- Automatically cleaned up when component unmounts

#### `useComputed` - component-local computed values

Creates memoized computed signals within components:

```typescript
// Basic computed value
useComputed<Value>(name: string, compute: () => Value, deps: any[]): Computed<Value>

// Advanced computed value with options
useComputed<Value, Diff>(
  name: string,
  compute: () => Value,
  opts: ComputedOptions<Value, Diff>,
  deps: any[]
): Computed<Value>
```

The second overload accepts `ComputedOptions` which allows configuration of diff functions, equality checks, and other advanced behaviors for optimization.

Benefits:

- Memoized using `useMemo` with dependency array
- Reactive dependencies tracked automatically during computation
- Efficient recomputation only when dependencies change
- Named for debugging and performance profiling

### Effect hooks

#### `useReactor` - frame-throttled effects

Runs reactive effects with updates throttled to animation frames:

```typescript
useReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with custom `scheduleEffect` callback
- The throttling is handled by `throttleToNextFrame` utility passed to the scheduler
- `EffectScheduler` itself doesn't handle throttling - it delegates to the provided callback
- Proper cleanup on unmount or dependency changes
- Ideal for visual updates and animations

#### `useQuickReactor` - immediate effects

Runs reactive effects without throttling:

```typescript
useQuickReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with immediate execution (no throttling callback)
- Effects run synchronously when dependencies change

Use cases:

- Immediate state synchronization
- Non-visual side effects
- Critical updates that can't wait for next frame

### Component tracking

#### `track` - higher-order component

Automatically tracks signal dependencies in React components:

```typescript
track<T extends FunctionComponent<any>>(
  baseComponent: T
): React.NamedExoticComponent<React.ComponentProps<T>>
```

Advanced implementation:

- **ProxyHandlers**: Uses JavaScript Proxy to intercept function calls and track signal access
- **React.memo integration**: Automatically wraps components in memo for performance
- **Forward ref support**: Handles forwardRef components correctly
- **Symbol detection**: Works with React's internal component types

#### `useStateTracking` - lower-level tracking

Manual reactive tracking for render functions:

```typescript
useStateTracking<T>(name: string, render: () => T, deps: unknown[] = []): T
```

Features:

- Uses `EffectScheduler` for dependency tracking
- Integrates with `useSyncExternalStore`
- Uses `scheduleCount` mechanism for efficient snapshot-based change detection
- Deferred effect attachment to avoid render-phase side effects
- Prevents "zombie component" issues during unmounting
- `deps` parameter has default empty array value

## Key implementation details

### The `__unsafe__getWithoutCapture` method

This internal method is used in `useValue` to extract signal values without triggering dependency tracking:

```typescript
// In useValue implementation
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		return signal.subscribe(signal.name, onStoreChange)
	},
	[$signal]
)

const getSnapshot = useCallback(() => {
	return $signal.__unsafe__getWithoutCapture() // Avoids dependency tracking
}, [$signal])
```

**Why it's needed:**

- During subscription callbacks, we want the current value without creating reactive dependencies
- Prevents infinite loops where getting a value triggers the subscription
- Ensures clean separation between subscription and value extraction

### ProxyHandlers implementation

The `track` function uses JavaScript Proxy to intercept React component function calls:

```typescript
const proxiedComponent = new Proxy(baseComponent, {
	apply(target, thisArg, argArray) {
		return useStateTracking(target.name || 'TrackedComponent', () => {
			return target.apply(thisArg, argArray)
		})
	},
})
```

This allows automatic signal tracking without manual hook calls in every component.

### EffectScheduler integration

The package uses `EffectScheduler` differently for different hooks:

**useReactor (throttled):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn,
			{ scheduleEffect: throttleToNextFrame } // Custom scheduling
		),
	deps
)
```

**useQuickReactor (immediate):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn
			// No scheduleEffect = immediate execution
		),
	deps
)
```

The `EffectScheduler` itself is agnostic to timing - it delegates scheduling to the provided callback or executes immediately.

## Key design patterns

### React integration strategy

The package uses several React patterns for optimal integration:

1. **useSyncExternalStore**: Official React 18 hook for external state
2. **useEffect**: Lifecycle management for reactive effects
3. **useMemo**: Memoization of expensive signal creation
4. **useState**: Component-local signal instances

### Performance optimizations

#### Throttling strategy

```typescript
// Frame-throttled updates for visual changes
useReactor(
	'visual-update',
	() => {
		// Updates throttled to animation frame
	},
	[]
)

// Immediate updates for critical state
useQuickReactor(
	'state-sync',
	() => {
		// Immediate execution
	},
	[]
)
```

#### Dependency management

- Explicit dependency arrays like React hooks
- Automatic signal dependency tracking during execution
- Efficient change detection using epoch-based snapshots
- `scheduleCount` mechanism in `useStateTracking` for batched updates

### Error handling patterns

The package includes comprehensive error handling:

```typescript
// In useValue subscription
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		try {
			return $signal.subscribe($signal.name, onStoreChange)
		} catch (error) {
			// Handle subscription errors gracefully
			console.error('Signal subscription failed:', error)
			return () => {} // Return no-op cleanup
		}
	},
	[$signal]
)
```

Common patterns:

- Try-catch blocks around signal operations
- Graceful degradation on subscription failures
- Error isolation to prevent cascade failures
- Safe cleanup functions to prevent memory leaks

### Memory management

- Automatic cleanup of reactive subscriptions
- Proper disposal of effect schedulers
- Prevention of memory leaks through careful lifecycle management
- Component unmounting detection to avoid "zombie" subscriptions

## Component unmounting and cleanup

### Handling component lifecycle

```typescript
// Effect cleanup on unmount
useEffect(() => {
	const scheduler = new EffectScheduler(name, reactFn, options)
	return () => scheduler.dispose() // Automatic cleanup
}, deps)

// Atom cleanup (handled automatically by React)
const atom = useAtom('myAtom', initialValue)
// No manual cleanup needed - React handles disposal
```

### Preventing memory leaks

- All reactive subscriptions are automatically unsubscribed on unmount
- Effect schedulers are properly disposed
- Signal references are cleared when components unmount
- Proxy objects don't create persistent references

## Usage patterns

### Basic component tracking

```typescript
const Counter = track(function Counter() {
  const $count = useAtom('count', 0)
  return <button onClick={() => $count.set($count.get() + 1)}>
    {$count.get()}
  </button>
})
```

### Computed values in components

```typescript
const UserProfile = track(function UserProfile({ userId }: Props) {
  const $user = useValue('user', () => getUserById(userId), [userId])
  const $displayName = useComputed('displayName', () =>
    `${$user.firstName} ${$user.lastName}`, [$user]
  )
  return <div>{$displayName.get()}</div>
})
```

### Side effects and synchronization

```typescript
const DataSyncComponent = track(function DataSync() {
	const $editor = useEditor()

	// Visual updates (throttled to animation frame)
	useReactor(
		'ui-updates',
		() => {
			updateUIBasedOnSelection($editor.getSelectedShapeIds())
		},
		[$editor]
	)

	// Critical state sync (immediate)
	useQuickReactor(
		'data-sync',
		() => {
			syncCriticalData($editor.getPageState())
		},
		[$editor]
	)
})
```

### Manual state tracking

```typescript
function CustomComponent() {
  return useStateTracking('CustomComponent', () => {
    const $shapes = editor.getCurrentPageShapes()
    return <div>Shape count: {$shapes.length}</div>
  })
}
```

## Performance considerations

### When to use each hook

**useValue:**

- Best for: Simple signal subscriptions and computed values
- Performance: Optimal for frequently changing values
- Use when: You need the raw value, not the signal wrapper

**useReactor:**

- Best for: Visual updates, DOM manipulations, animations
- Performance: Throttled to 60fps, prevents excessive renders
- Use when: Updates can be batched to animation frames

**useQuickReactor:**

- Best for: Critical state synchronization, event handling
- Performance: Immediate execution, higher CPU usage
- Use when: Updates must happen immediately

**useStateTracking:**

- Best for: Complex render logic with multiple signal dependencies
- Performance: Fine-grained control over tracking behavior
- Use when: You need manual control over the tracking lifecycle

### Optimization guidelines

1. **Prefer `$` prefix**: Use consistent naming for signals (`$count`, `$user`)
2. **Batch related changes**: Group signal updates to minimize renders
3. **Use appropriate effect hooks**: Choose throttled vs immediate based on use case
4. **Minimize dependency arrays**: Only include truly reactive dependencies
5. **Avoid creating signals in render**: Use `useAtom`/`useComputed` for component-local state

### Memory and performance monitoring

- Signal subscriptions are lightweight but should be monitored in large applications
- Use React DevTools to identify unnecessary re-renders
- Monitor `EffectScheduler` instances in development for cleanup verification
- Track signal creation/disposal patterns to identify memory leaks

## Integration with tldraw

### Editor components

Used throughout tldraw's React components:

- **TldrawEditor**: Main editor component uses tracking
- **UI components**: All reactive UI elements use state-react hooks
- **Tool components**: State machines integrated with React lifecycle

### Performance in complex UIs

- **Selective updates**: Only components accessing changed signals re-render
- **Batched updates**: Multiple signal changes batched into single renders
- **Frame alignment**: Visual updates aligned with browser paint cycles

## Key benefits

### Automatic reactivity

- No manual subscription management required
- Automatic dependency tracking eliminates bugs
- Components automatically re-render when state changes

### React ecosystem compatibility

- Works with existing React patterns and tools
- Compatible with React DevTools
- Integrates with React Suspense and Concurrent Features

### Performance

- Fine-grained reactivity prevents unnecessary re-renders
- Efficient change detection and subscription management
- Optimized for large, complex applications

### Developer experience

- Familiar React hook patterns
- Clear error messages with component context
- TypeScript integration with full type safety

## Dependencies

### External dependencies

- **React**: Core React hooks and lifecycle integration
- **@tldraw/state**: Core reactive state system (EffectScheduler, signals)
- **@tldraw/utils**: Throttling utilities (`throttleToNextFrame`)

### Integration points

- Builds directly on EffectScheduler from state package
- Uses utility functions for performance optimization
- Provides React-specific API surface for signals system

```

```


# ==========================================
# FILE: packages/state/CONTEXT.md
# ==========================================

# CONTEXT.md - @tldraw/state Package

This file provides comprehensive context for understanding the `@tldraw/state` package, a powerful reactive state management library using signals.

## Package overview

`@tldraw/state` is a fine-grained reactive state management library similar to MobX or SolidJS reactivity, but designed specifically for tldraw's performance requirements. It provides automatic dependency tracking, lazy evaluation, and efficient updates through a signals-based architecture.

**Core Philosophy:** Only recompute what actually needs to change, when it needs to change, with minimal overhead.

## Architecture overview

### Signal system foundation

The entire system is built around the `Signal<Value, Diff>` interface defined in `src/lib/types.ts`:

```typescript
interface Signal<Value, Diff = unknown> {
	name: string
	get(): Value
	lastChangedEpoch: number
	getDiffSince(epoch: number): RESET_VALUE | Diff[]
	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value
	children: ArraySet<Child>
}
```

**Two signal types:**

1. **Atoms** (`src/lib/Atom.ts`) - Mutable state containers that hold raw values
2. **Computed** (`src/lib/Computed.ts`) - Derived values that automatically recompute when dependencies change

### Dependency tracking system

**Capture mechanism (`src/lib/capture.ts`):**

- Uses a global capture stack to automatically track dependencies
- When `.get()` is called during computation, `maybeCaptureParent()` registers dependencies
- `CaptureStackFrame` manages the capture context with efficient parent tracking
- `unsafe__withoutCapture()` allows reading values without creating dependencies

**Parent-child relationships:**

- Each signal maintains an `ArraySet<Child>` of dependents
- Each child maintains arrays of `parents` and `parentEpochs`
- Automatic cleanup when no more children exist

### Memory-optimized data structures

**ArraySet (`src/lib/ArraySet.ts`):**

- Hybrid array/Set implementation for optimal performance
- Uses array for small collections (≤8 items), switches to Set for larger ones
- Constant-time operations with minimal memory overhead
- Critical for managing parent-child relationships efficiently

### Reactive update propagation

**Effect scheduling (`src/lib/EffectScheduler.ts`):**

- `EffectScheduler` manages side effects and reactions
- `react()` creates immediate reactions, `reactor()` creates controllable ones
- Pluggable `scheduleEffect` for custom batching (e.g., requestAnimationFrame)
- Automatic cleanup and lifecycle management

**Epoch-based invalidation:**

- Global epoch counter increments on any state change
- Each signal tracks `lastChangedEpoch` for efficient dirty checking
- `haveParentsChanged()` in `helpers.ts` compares epochs to determine if recomputation needed

### Transaction system

**Atomic updates (`src/lib/transactions.ts`):**

- `transact()` batches multiple state changes into single atomic operation
- `transaction()` supports nested transactions with individual rollback
- Automatic rollback on exceptions
- `initialAtomValues` map stores original values for rollback

**Global state management:**

- Singleton pattern for global transaction state
- `globalEpoch` tracks current time
- `globalIsReacting` prevents infinite loops
- `cleanupReactors` manages effect cleanup during reactions

### History and time travel

**Change tracking (`src/lib/HistoryBuffer.ts`):**

- Circular buffer stores diffs between sequential values
- Configurable `historyLength` per signal
- `ComputeDiff<Value, Diff>` functions for custom diff computation
- `RESET_VALUE` symbol when history insufficient for incremental updates

**Incremental computation:**

- `withDiff()` helper for manually providing diffs
- `isUninitialized()` for handling first computation
- Diff-based computation allows efficient updates for large data structures

## Key classes and components

### Core signal implementations

**`__Atom__` (src/lib/Atom.ts):**

```typescript
class __Atom__<Value, Diff> implements Atom<Value, Diff> {
	private current: Value
	children: ArraySet<Child>
	historyBuffer?: HistoryBuffer<Diff>
	lastChangedEpoch: number

	get(): Value // captures parent relationship
	set(value: Value, diff?: Diff): Value
	update(updater: (Value) => Value): Value
}
```

**`__UNSAFE__Computed` (src/lib/Computed.ts):**

```typescript
class __UNSAFE__Computed<Value, Diff> implements Computed<Value, Diff> {
	private derivation: (prevValue: Value | UNINITIALIZED) => Value
	private lastComputedEpoch: number
	private state: 'dirty' | 'computing' | 'computed-clean'
	parents: Signal<any, any>[]
	parentSet: ArraySet<Signal<any, any>>

	// Lazy evaluation with dependency tracking
	get(): Value
}
```

### Supporting infrastructure

**Capture stack frame:**

- Manages dependency tracking during computation
- Efficiently handles parent addition/removal
- Supports debugging with ancestor epoch tracking

**Transaction management:**

- Nested transaction support with proper cleanup
- Rollback capability with value restoration
- Integration with effect scheduling

## Performance optimizations

### Memory efficiency

- `EMPTY_ARRAY` singleton for zero-allocation empty dependencies
- `ArraySet` hybrid data structure minimizes memory for small collections
- Lazy `HistoryBuffer` allocation only when history tracking needed
- `singleton()` pattern prevents duplicate global state

### Computation efficiency

- **Lazy evaluation:** Computed values only recalculate when dependencies change
- **Epoch comparison:** Fast dirty checking via numeric epoch comparison
- **Dependency pruning:** Automatic cleanup of unused parent-child relationships
- **Batch updates:** Transaction system prevents intermediate computations

### Runtime optimizations

- `__unsafe__getWithoutCapture()` bypasses dependency tracking for hot paths
- `isEqual` custom comparison functions prevent unnecessary updates
- Pluggable effect scheduling for batching (e.g., RAF)
- `haveParentsChanged()` efficiently checks if recomputation needed

## API patterns and usage

### Basic reactive state

```typescript
// Mutable state
const count = atom('count', 0)

// Derived state
const doubled = computed('doubled', () => count.get() * 2)

// Side effects
const stop = react('logger', () => console.log(doubled.get()))
```

### Advanced patterns

```typescript
// Custom equality
const user = atom('user', userObj, {
  isEqual: (a, b) => a.id === b.id
})

// History tracking
const shapes = atom('shapes', [], {
  historyLength: 100,
  computeDiff: (prev, next) => /* custom diff logic */
})

// Incremental computation
const processedData = computed('processed', (prevValue) => {
  if (isUninitialized(prevValue)) {
    return expensiveInitialComputation()
  }
  return incrementalUpdate(prevValue)
})
```

### Transaction patterns

```typescript
// Atomic updates
transact(() => {
	firstName.set('Jane')
	lastName.set('Smith')
	// Reactions run only once after both updates
})

// Rollback on error
try {
	transact((rollback) => {
		makeRiskyChanges()
		if (shouldAbort) rollback()
	})
} catch (error) {
	// Automatic rollback occurred
}
```

### Performance patterns

```typescript
// Reading without dependency tracking
const expensiveComputed = computed('expensive', () => {
	const important = importantAtom.get() // Creates dependency

	// Read metadata without creating dependency
	const metadata = unsafe__withoutCapture(() => metadataAtom.get())

	return computeExpensiveValue(important, metadata)
})

// Custom effect scheduling
const stop = react('dom-update', updateDOM, {
	scheduleEffect: (execute) => requestAnimationFrame(execute),
})
```

## Debugging and development

### Dependency debugging

- `whyAmIRunning()` prints hierarchical dependency tree showing what triggered updates
- Each signal has a `name` for debugging identification
- Debug flags track ancestor epochs in development

### Development warnings

- Warnings for computed getters (should use `@computed` decorator)
- API version checking prevents incompatible package versions
- Error boundaries with proper error propagation

## Integration points

### Internal dependencies

- `@tldraw/utils` for `registerTldrawLibraryVersion()`, `assert()`, utilities
- No external runtime dependencies - pure TypeScript implementation

### Related packages

- **`@tldraw/state-react`** - React hooks and components for state integration
- **`@tldraw/store`** - Record-based storage built on @tldraw/state
- **`@tldraw/editor`** - Canvas editor using reactive state throughout

### Extension points

- `AtomOptions.isEqual` - Custom equality comparison
- `ComputeDiff<Value, Diff>` - Custom diff computation
- `EffectSchedulerOptions.scheduleEffect` - Custom effect batching
- `@computed` decorator for class-based computed properties

## Key files and their roles

### Core implementation

- **`src/lib/types.ts`** - Foundational interfaces and types
- **`src/lib/Atom.ts`** - Mutable state containers (~200 lines)
- **`src/lib/Computed.ts`** - Derived state with lazy evaluation (~400 lines)
- **`src/lib/EffectScheduler.ts`** - Side effect management (~200 lines)

### Infrastructure

- **`src/lib/capture.ts`** - Dependency tracking mechanism (~150 lines)
- **`src/lib/transactions.ts`** - Atomic updates and rollback (~250 lines)
- **`src/lib/helpers.ts`** - Utilities and optimizations (~100 lines)
- **`src/lib/ArraySet.ts`** - Hybrid array/set data structure (~150 lines)
- **`src/lib/HistoryBuffer.ts`** - Change tracking storage (~100 lines)

### Support files

- **`src/lib/constants.ts`** - System constants
- **`src/lib/isSignal.ts`** - Type guards
- **`src/lib/warnings.ts`** - Development warnings
- **`src/index.ts`** - Public API exports

## Development guidelines

### Signal creation

- Always provide meaningful names for debugging
- Use `historyLength` only when diffs are needed
- Prefer built-in equality checking unless custom logic required
- Consider memory implications of history buffers

### Computed signals

- Use `@computed` decorator for class-based computed properties
- Handle `UNINITIALIZED` for incremental computations
- Use `withDiff()` when manually computing diffs
- Prefer lazy evaluation - avoid forcing computation unnecessarily

### Effect management

- Use `react()` for fire-and-forget effects
- Use `reactor()` when you need start/stop control
- Always clean up effects to prevent memory leaks
- Consider custom `scheduleEffect` for batching DOM updates

### Performance best practices

- Use `unsafe__withoutCapture()` sparingly for hot paths
- Implement custom `isEqual` for complex objects
- Batch updates with transactions
- Minimize signal creation in hot paths

### Debugging workflow

1. Use `whyAmIRunning()` to trace unexpected updates
2. Check signal names for clarity in debug output
3. Verify epoch tracking with ancestor debugging
4. Use browser devtools to inspect signal state

## Testing patterns

Located in `src/lib/__tests__/`:

- Unit tests for each core component
- Integration tests for complex scenarios
- Performance tests for optimization validation
- Mock implementations for external dependencies

## Common pitfalls

1. **Infinite loops:** Avoid updating atoms inside their own reactions
2. **Memory leaks:** Always clean up reactions and computed signals
3. **Unnecessary dependencies:** Use `unsafe__withoutCapture()` judiciously
4. **Transaction misuse:** Don't nest transactions unnecessarily
5. **History overhead:** Set appropriate `historyLength` based on usage patterns


# ==========================================
# FILE: packages/store/CONTEXT.md
# ==========================================

# CONTEXT.md - @tldraw/store Package

This file provides comprehensive context for understanding the `@tldraw/store` package, a reactive record storage system built on `@tldraw/state`.

## Package overview

`@tldraw/store` is a reactive record storage library that provides a type-safe, event-driven database for managing collections of records. It combines the reactive primitives from `@tldraw/state` with a robust record management system, including validation, migrations, side effects, and history tracking.

**Core Philosophy:** Manage collections of typed records with automatic reactivity, validation, and change tracking while maintaining excellent performance and type safety.

## Architecture overview

### Store system foundation

The `Store` class (`src/lib/Store.ts`) is the central orchestrator that manages:

- Record storage via reactive `AtomMap<RecordId, Record>`
- Change history via reactive `Atom<number, RecordsDiff>`
- Validation through `StoreSchema`
- Side effects through `StoreSideEffects`
- Query capabilities through `StoreQueries`

### Record system

**BaseRecord Interface (`src/lib/BaseRecord.ts`):**

```typescript
interface BaseRecord<TypeName extends string, Id extends RecordId<UnknownRecord>> {
	readonly id: Id
	readonly typeName: TypeName
}
```

**RecordType System (`src/lib/RecordType.ts`):**

- Factory for creating typed records with validation
- Manages default properties and record scopes
- Handles ID generation (random or custom)
- Supports ephemeral properties for non-persistent data

**Record Scopes:**

- **`document`** - Persistent and synced across instances
- **`session`** - Per-instance only, not synced but may be persisted
- **`presence`** - Per-instance, synced but not persisted (e.g., cursors)

### Reactive storage architecture

**AtomMap (`src/lib/AtomMap.ts`):**

- Reactive replacement for `Map` that stores values in atoms
- Each record is stored in its own atom for fine-grained reactivity
- Automatic dependency tracking when accessing records
- Supports both captured and uncaptured access patterns

**Storage Structure:**

```typescript
class Store<R extends UnknownRecord> {
	private readonly records: AtomMap<IdOf<R>, R> // Individual record atoms
	readonly history: Atom<number, RecordsDiff<R>> // Change tracking
	readonly query: StoreQueries<R> // Query derivations
	readonly sideEffects: StoreSideEffects<R> // Lifecycle hooks
}
```

### Change tracking and history

**RecordsDiff System (`src/lib/RecordsDiff.ts`):**

```typescript
interface RecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}
```

**History Management:**

- `HistoryAccumulator` batches changes before flushing to listeners
- History reactor uses `throttleToNextFrame` for performance
- Automatic diff squashing for efficient updates
- Support for reversible diffs and time-travel

### Query and indexing system

**StoreQueries (`src/lib/StoreQueries.ts`):**

- Reactive indexes for efficient querying
- `RSIndex<R, Property>` - Reactive indexes by property value
- `filterHistory()` - Type-filtered change streams
- `executeQuery()` - Complex query evaluation with incremental updates

**Query Features:**

- Automatic index maintenance via reactive derivations
- Incremental index updates using diffs
- Type-safe querying with full TypeScript support
- Performance-optimized for large record collections

### Migration system

**Migration Architecture (`src/lib/migrate.ts`):**

- Version-based migration system for schema evolution
- Support for both record-level and store-level migrations
- Dependency-aware migration ordering
- Rollback and validation during migrations

**Migration Types:**

- **Legacy Migrations** - Backward compatibility with old migration format
- **Modern Migrations** - New sequence-based migration system with dependencies
- **Subtype Migrations** - Property-level migrations for complex records

**Key Components:**

- `MigrationSequence` - Ordered migrations with dependency tracking
- `MigrationId` - Typed identifiers for migration versioning
- `createMigrationSequence()` - Builder for migration sequences
- `parseMigrationId()` - Version parsing and validation

### Side effects system

**StoreSideEffects (`src/lib/StoreSideEffects.ts`):**

- Lifecycle hooks for record operations
- Before/after handlers for create, update, delete operations
- Operation complete handlers for batch processing
- Type-specific handler registration

**Handler Types:**

```typescript
StoreBeforeCreateHandler<R> - Pre-process records before creation
StoreAfterCreateHandler<R>  - React to record creation
StoreBeforeChangeHandler<R> - Transform records before updates
StoreAfterChangeHandler<R>  - React to record changes
StoreBeforeDeleteHandler<R> - Validate or prevent deletions
StoreAfterDeleteHandler<R>  - Clean up after deletions
```

### Schema and validation

**StoreSchema (`src/lib/StoreSchema.ts`):**

- Type-safe record type registry
- Validation pipeline for record integrity
- Migration coordination across record types
- Schema versioning and evolution

**Validation Pipeline:**

1. `StoreValidator.validate()` - Basic record validation
2. `StoreValidator.validateUsingKnownGoodVersion()` - Optimized validation
3. Schema-level validation with error handling
4. Development-time integrity checking

## Key data structures and patterns

### AtomMap implementation

**Reactive Map Interface:**

- Implements standard `Map<K, V>` interface
- Each value stored in individual atom for granular reactivity
- Uses `ImmutableMap` internally for efficient updates
- Supports both reactive and non-reactive access patterns

**Memory Management:**

- Lazy atom creation - atoms created only when needed
- Automatic cleanup when records removed
- `UNINITIALIZED` marker for deleted values
- Efficient batch operations via transactions

### Query system architecture

**Reactive Indexing:**

```typescript
type RSIndex<R, Property> = Computed<
	RSIndexMap<R, Property>, // Map<PropertyValue, Set<RecordId>>
	RSIndexDiff<R, Property> // Map<PropertyValue, CollectionDiff<RecordId>>
>
```

**Incremental Updates:**

- Indexes maintained via reactive derivations
- Diff-based incremental updates for performance
- Automatic cleanup of empty index entries
- Cache management for frequently used queries

### Transaction and consistency

**Atomic Operations:**

- All multi-record operations wrapped in transactions
- Side effects run within transaction context
- Automatic rollback on validation failures
- Consistent view of data throughout operations

**Change Source Tracking:**

- `'user'` - Changes from application logic
- `'remote'` - Changes from synchronization
- Filtered listeners based on change source
- Separate handling for local vs remote updates

## Development patterns

### Creating record types

```typescript
// Define record interface
interface Book extends BaseRecord<'book'> {
	title: string
	author: IdOf<Author>
	numPages: number
}

// Create record type with defaults
const Book = createRecordType<Book>('book', {
	validator: bookValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	numPages: 0,
}))

// Use in store schema
const schema = StoreSchema.create(
	{
		book: Book,
		author: Author,
	},
	{
		migrations: [
			/* migration sequences */
		],
	}
)
```

### Store usage patterns

```typescript
// Create store
const store = new Store({
	schema,
	initialData: savedData,
	props: customProps,
})

// Basic operations
store.put([Book.create({ title: '1984', author: authorId })])
store.update(bookId, (book) => ({ ...book, title: 'Animal Farm' }))
store.remove([bookId])

// Reactive queries
const booksByAuthor = store.query.index('book', 'author')
const authorBooks = computed('author-books', () => {
	return booksByAuthor.get().get(authorId) ?? new Set()
})
```

### Side effects registration

```typescript
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
	// Update author's book count
	const author = store.get(book.author)
	store.update(book.author, (a) => ({
		...a,
		bookCount: a.bookCount + 1,
	}))
})

store.sideEffects.registerBeforeDeleteHandler('author', (author, source) => {
	// Prevent deletion if author has books
	const books = store.query.index('book', 'author').get().get(author.id)
	if (books && books.size > 0) {
		return false // Prevent deletion
	}
})
```

### Migration definition

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.myapp.book',
	sequence: [
		{
			id: 'com.myapp.book/1',
			up: (record: any) => {
				record.publishedYear = new Date(record.publishDate).getFullYear()
				delete record.publishDate
				return record
			},
			down: (record: any) => {
				record.publishDate = new Date(record.publishedYear, 0, 1).toISOString()
				delete record.publishedYear
				return record
			},
		},
	],
})
```

## Performance considerations

### Memory optimization

- `AtomMap` provides reactive access without duplicating data
- `ImmutableMap` used internally for efficient updates
- Lazy atom creation reduces memory overhead
- Automatic cleanup when records removed

### Query performance

- Reactive indexes automatically maintained
- Incremental updates via diff application
- Query result caching with automatic invalidation
- Efficient set operations for large collections

### Change propagation

- History accumulator batches changes before notification
- `throttleToNextFrame` prevents excessive listener calls
- Scoped listeners reduce unnecessary processing
- Filtered change streams for targeted reactivity

## Integration points

### Dependencies

- **`@tldraw/state`** - Core reactivity system
- **`@tldraw/utils`** - Utility functions and performance helpers

### Extension points

- **Custom Validators** - Record validation logic
- **Side Effect Handlers** - Lifecycle hooks for business logic
- **Migration Sequences** - Schema evolution over time
- **Query Expressions** - Complex record filtering

### Framework integration

- Framework-agnostic core with React bindings available
- Store instances can be shared across components
- Natural integration with `@tldraw/state-react` hooks
- SSR-compatible with proper hydration

## Key files and components

### Core implementation

- **`src/lib/Store.ts`** - Main store class (~800 lines)
- **`src/lib/AtomMap.ts`** - Reactive map implementation (~300 lines)
- **`src/lib/BaseRecord.ts`** - Record type definitions (~25 lines)
- **`src/lib/RecordType.ts`** - Record factory and management (~200 lines)

### Change management

- **`src/lib/RecordsDiff.ts`** - Diff operations and utilities (~200 lines)
- **`src/lib/StoreQueries.ts`** - Reactive indexing system (~400 lines)
- **`src/lib/StoreSideEffects.ts`** - Lifecycle hooks (~200 lines)

### Schema and validation

- **`src/lib/StoreSchema.ts`** - Schema management (~300 lines)
- **`src/lib/migrate.ts`** - Migration system (~500 lines)

### Support infrastructure

- **`src/lib/executeQuery.ts`** - Query evaluation engine
- **`src/lib/IncrementalSetConstructor.ts`** - Efficient set operations
- **`src/lib/devFreeze.ts`** - Development-time immutability
- **`src/lib/setUtils.ts`** - Set operation utilities

## Development guidelines

### Record design

- Keep records immutable - always return new objects
- Use appropriate record scopes for different data types
- Design records for efficient diffing when needed
- Implement proper validation for data integrity

### Store configuration

- Initialize stores with appropriate schema and props
- Configure migration sequences for schema evolution
- Set up side effects for business logic enforcement
- Use scoped listeners for performance optimization

### Query patterns

- Leverage reactive indexes for frequently accessed data
- Use computed signals to derive complex query results
- Prefer incremental updates over full recomputation
- Cache expensive query results appropriately

### Migration best practices

- Version changes incrementally with clear migration paths
- Test migrations thoroughly with real data
- Handle migration failures gracefully
- Document breaking changes and migration requirements

### Performance optimization

- Use `__unsafe__getWithoutCapture()` for hot paths that don't need reactivity
- Batch operations with transactions
- Implement efficient `isEqual` functions for complex records
- Profile query performance for large datasets

## Testing patterns

### Test structure

- Unit tests for individual components in `src/lib/test/`
- Integration tests for store operations
- Migration testing with sample data
- Performance testing for large datasets

### Common test scenarios

- Record CRUD operations with validation
- Side effect execution and error handling
- Migration forward and backward compatibility
- Query correctness and performance
- Concurrent access and transaction handling

## Common pitfalls

1. **Memory Leaks:** Not cleaning up listeners and computed queries
2. **Side Effect Loops:** Circular dependencies in side effect handlers
3. **Migration Failures:** Insufficient testing of schema changes
4. **Performance Issues:** Over-reactive queries without proper batching
5. **Validation Errors:** Inconsistent validation between create and update paths
6. **Transaction Scope:** Forgetting to wrap multi-record operations in transactions


# ==========================================
# FILE: packages/sync-core/CONTEXT.md
# ==========================================

# Sync-Core Package Context

## Overview

The `@tldraw/sync-core` package provides the core infrastructure for real-time collaboration and synchronization in tldraw. It implements a robust client-server synchronization protocol for sharing drawing state across multiple users, handling network issues, conflict resolution, and maintaining data consistency.

## Architecture

### Core components

#### `TLSyncClient` - client-Side synchronization

Manages client-side synchronization with the server:

```typescript
class TLSyncClient<R extends UnknownRecord> {
	// Connection management
	connect(): void
	disconnect(): void

	// State synchronization
	status: Signal<TLPersistentClientSocketStatus>
	store: Store<R>

	// Error handling
	TLSyncErrorCloseEventCode: 4099
	TLSyncErrorCloseEventReason: Record<string, string>
}
```

Key features:

- **Automatic Reconnection**: Handles network drops and reconnection
- **Optimistic Updates**: Local changes applied immediately
- **Conflict Resolution**: Server authoritative with rollback capability
- **Presence Management**: Real-time cursor and user presence

#### `TLSyncRoom` - server-Side room management

Manages server-side state for collaboration rooms:

```typescript
class TLSyncRoom<R extends UnknownRecord, Meta> {
	// Session management
	sessions: Map<string, RoomSession<R, Meta>>

	// State management
	state: DocumentState
	store: Store<R>

	// Room lifecycle
	getNumActiveConnections(): number
	close(): void
}
```

Responsibilities:

- **Session Lifecycle**: Connect, disconnect, timeout management
- **State Broadcasting**: Distribute changes to all connected clients
- **Persistence**: Coordinate with storage backends
- **Schema Management**: Handle schema migrations and compatibility

### Protocol system

#### WebSocket Protocol (`protocol.ts`)

Defines the communication protocol between client and server:

**Client → Server Messages:**

```typescript
type TLSocketClientSentEvent =
	| TLConnectRequest // Initial connection with schema
	| TLPushRequest // State changes to apply
	| TLPingRequest // Keepalive ping
```

**Server → Client Messages:**

```typescript
type TLSocketServerSentEvent =
	| ConnectEvent // Connection established with initial state
	| DataEvent // State updates to apply
	| IncompatibilityError // Schema/version mismatch
	| PongEvent // Ping response
```

#### Connection lifecycle

1. **Connect Request**: Client sends schema and initial state
2. **Hydration**: Server responds with full state snapshot
3. **Incremental Sync**: Bidirectional diff-based updates
4. **Presence Sync**: Real-time user cursor/selection state
5. **Graceful Disconnect**: Proper cleanup and persistence

### Diff system

#### `NetworkDiff` - efficient change representation

Compact, network-optimized change format:

```typescript
interface NetworkDiff<R extends UnknownRecord> {
	[recordId: string]: RecordOp<R>
}

type RecordOp<R> =
	| [RecordOpType.Put, R] // Add/replace record
	| [RecordOpType.Patch, ObjectDiff] // Partial update
	| [RecordOpType.Remove] // Delete record
```

#### Object diffing

Fine-grained property-level changes:

```typescript
interface ObjectDiff {
	[key: string]: ValueOp
}

type ValueOp =
	| [ValueOpType.Put, any] // Set property value
	| [ValueOpType.Patch, ObjectDiff] // Nested object update
	| [ValueOpType.Append, any] // Array append
	| [ValueOpType.Delete] // Remove property
```

### Session management

#### `RoomSession` - individual client sessions

Tracks state for each connected client:

```typescript
type RoomSession<R, Meta> = {
	state: RoomSessionState // Connection state
	sessionId: string // Unique session identifier
	presenceId: string | null // User presence identifier
	socket: TLRoomSocket<R> // WebSocket connection
	meta: Meta // Custom session metadata
	isReadonly: boolean // Permission level
	lastInteractionTime: number // For timeout detection
}

enum RoomSessionState {
	AwaitingConnectMessage, // Initial connection
	Connected, // Fully synchronized
	AwaitingRemoval, // Disconnection cleanup
}
```

Session lifecycle constants:

- `SESSION_START_WAIT_TIME`: 10 seconds for initial connection
- `SESSION_IDLE_TIMEOUT`: 20 seconds before idle detection
- `SESSION_REMOVAL_WAIT_TIME`: 5 seconds for cleanup delay

### Network adapters

#### `ClientWebSocketAdapter` - client connection management

Manages WebSocket connections with reliability features:

```typescript
class ClientWebSocketAdapter implements TLPersistentClientSocket<TLRecord> {
	// Connection state
	status: Atom<TLPersistentClientSocketStatus>

	// Reliability features
	restart(): void // Force reconnection
	sendMessage(msg: any): void // Send with queuing

	// Event handling
	onReceiveMessage: SubscribingFn<any>
	onStatusChange: SubscribingFn<TLPersistentClientSocketStatus>
}
```

#### `ReconnectManager` - connection reliability

Handles automatic reconnection with exponential backoff:

- **Progressive Delays**: Increasing delays between reconnection attempts
- **Max Retry Limits**: Prevents infinite reconnection loops
- **Connection Health**: Monitors connection quality
- **Graceful Degradation**: Handles various failure modes

### Data consistency

#### Conflict resolution strategy

**Server Authoritative Model:**

1. Client applies changes optimistically
2. Server validates and potentially modifies changes
3. Server broadcasts canonical version to all clients
4. Clients rollback and re-apply if conflicts detected

#### Change ordering

- **Causal Ordering**: Changes applied in dependency order
- **Vector Clocks**: Track causality across distributed clients
- **Tombstone Management**: Handle deletions in distributed system

#### Schema evolution

- **Version Compatibility**: Detect and handle schema mismatches
- **Migration Support**: Upgrade/downgrade data during sync
- **Graceful Degradation**: Handle unknown record types

### Performance optimizations

#### Batching and chunking

```typescript
// Message chunking for large updates
chunk<T>(items: T[], maxSize: number): T[][]

// Batch updates for efficiency
throttle(updateFn: () => void, delay: number)
```

#### Presence optimization

- **Throttled Updates**: Cursor movements throttled to reduce bandwidth
- **Selective Broadcasting**: Only send presence to relevant clients
- **Ephemeral State**: Presence doesn't persist to storage

### Error handling

#### `TLRemoteSyncError` - sync-Specific errors

Specialized error types for synchronization issues:

```typescript
class TLRemoteSyncError extends Error {
	code: TLSyncErrorCloseEventCode
	reason: TLSyncErrorCloseEventReason
}

// Error reasons include:
// - NOT_FOUND: Room doesn't exist
// - FORBIDDEN: Permission denied
// - CLIENT_TOO_OLD: Client needs upgrade
// - SERVER_TOO_OLD: Server needs upgrade
```

#### Connection recovery

- **Automatic Retry**: Exponential backoff for reconnection
- **State Reconciliation**: Re-sync state after reconnection
- **Partial Recovery**: Handle partial data loss gracefully

## Key design patterns

### Event-Driven architecture

- **nanoevents**: Lightweight event system for internal communication
- **Signal Integration**: Reactive updates using signals
- **WebSocket Events**: Standard WebSocket event handling

### Immutable state updates

- **Structural Sharing**: Minimize memory usage for state changes
- **Diff-Based Sync**: Only transmit actual changes
- **Rollback Support**: Maintain history for conflict resolution

### Async state management

- **Promise-Based APIs**: Async operations return promises
- **Effect Scheduling**: Coordinate updates with React lifecycle
- **Transaction Support**: Atomic multi-record updates

## Network protocol

### Message types

1. **Connect**: Establish session with schema validation
2. **Push**: Client sends local changes to server
3. **Data**: Server broadcasts changes to clients
4. **Ping/Pong**: Keepalive for connection health
5. **Error**: Communicate protocol violations

### Reliability features

- **Message Ordering**: Guaranteed order of operations
- **Duplicate Detection**: Prevent duplicate message processing
- **Timeout Handling**: Detect and recover from network issues
- **Graceful Shutdown**: Clean disconnection protocol

## Integration points

### With store package

- **Store Synchronization**: Bidirectional sync with local stores
- **Migration Coordination**: Handle schema changes during sync
- **Query Integration**: Sync affects query results

### With state package

- **Reactive Integration**: Changes trigger signal updates
- **Transaction Coordination**: Maintain consistency during sync
- **Effect Scheduling**: Coordinate with React updates

### With schema package

- **Schema Validation**: Ensure type safety across clients
- **Version Management**: Handle schema evolution
- **Record Validation**: Validate all synchronized records

## Use cases

### Real-Time collaboration

- **Multi-User Drawing**: Multiple users editing simultaneously
- **Live Cursors**: Real-time cursor and selection display
- **Conflict Resolution**: Handle simultaneous edits gracefully

### Offline/Online sync

- **Offline Editing**: Local changes queued for sync
- **Reconnection Sync**: State reconciliation after network recovery
- **Partial Sync**: Handle incomplete synchronization

### Scalable architecture

- **Room-Based Isolation**: Separate sync contexts per document
- **Horizontal Scaling**: Support multiple server instances
- **Load Management**: Handle varying client loads efficiently

## Security considerations

### Access control

- **Read-Only Mode**: Restrict editing permissions per session
- **Session Validation**: Verify client identity and permissions
- **Schema Enforcement**: Prevent malicious schema changes

### Data integrity

- **Change Validation**: Server validates all client changes
- **Type Safety**: Schema ensures data structure integrity
- **Audit Trail**: Maintain change history for debugging


# ==========================================
# FILE: packages/sync/CONTEXT.md
# ==========================================

# Sync Package Context

## Overview

The `@tldraw/sync` package provides React hooks and high-level utilities for integrating tldraw's real-time collaboration features into React applications. It builds on `@tldraw/sync-core` to offer a developer-friendly API for multiplayer functionality with minimal configuration.

## Architecture

### Primary hooks

#### `useSync` - production multiplayer hook

The main hook for production multiplayer integration:

```typescript
function useSync(options: UseSyncOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncOptions {
	uri: string | (() => string | Promise<string>) // WebSocket server URI
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo> // User identity
	assets: TLAssetStore // Blob storage implementation
	roomId?: string // Room identifier for analytics
	trackAnalyticsEvent?: (name: string, data: any) => void // Analytics callback
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

#### `useSyncDemo` - demo server integration

Simplified hook for quick prototyping with tldraw's demo server:

```typescript
function useSyncDemo(options: UseSyncDemoOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncDemoOptions {
	roomId: string // Unique room identifier
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo>
	host?: string // Demo server URL override
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

### Store integration

#### `RemoteTLStoreWithStatus` - multiplayer store state

Enhanced store wrapper with connection status:

```typescript
type RemoteTLStoreWithStatus =
	| { status: 'loading' } // Initial connection
	| { status: 'error'; error: Error } // Connection/sync errors
	| {
			status: 'synced-remote' // Connected and syncing
			connectionStatus: 'online' | 'offline' // Network state
			store: TLStore // Synchronized store
	  }
```

Status progression:

1. **loading**: Establishing connection, performing initial sync
2. **synced-remote**: Successfully connected and synchronized
3. **error**: Connection failed or sync error occurred

### Connection management

#### WebSocket connection lifecycle

Comprehensive connection state management:

**Connection Establishment:**

```typescript
// 1. Create WebSocket adapter
const socket = new ClientWebSocketAdapter(async () => {
	const uriString = typeof uri === 'string' ? uri : await uri()
	const url = new URL(uriString)
	url.searchParams.set('sessionId', TAB_ID) // Browser tab identification
	url.searchParams.set('storeId', storeId) // Store instance identification
	return url.toString()
})

// 2. Initialize TLSyncClient with reactive integration
const client = new TLSyncClient({
	store,
	socket,
	didCancel: () => cancelled, // Cleanup detection
	onLoad: (client) => setState({ readyClient: client }),
	onSyncError: (reason) => handleSyncError(reason),
	onAfterConnect: (_, { isReadonly }) => updatePermissions(isReadonly),
	presence,
	presenceMode,
})
```

#### Error handling and recovery

Comprehensive error handling with user feedback:

```typescript
// Sync error categorization and analytics
onSyncError(reason) {
  switch (reason) {
    case TLSyncErrorCloseEventReason.NOT_FOUND:
      track('room-not-found')
      break
    case TLSyncErrorCloseEventReason.FORBIDDEN:
      track('forbidden')
      break
    case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
      track('not-authenticated')
      break
    case TLSyncErrorCloseEventReason.RATE_LIMITED:
      track('rate-limited')
      break
  }
  setState({ error: new TLRemoteSyncError(reason) })
}
```

### Presence system

#### User presence management

Real-time user cursor and selection synchronization:

```typescript
// User information computation
const userPreferences = computed('userPreferences', () => {
	const user = getUserInfo() ?? getUserPreferences()
	return {
		id: user.id,
		color: user.color ?? defaultUserPreferences.color,
		name: user.name ?? defaultUserPreferences.name,
	}
})

// Presence state generation
const presence = computed('instancePresence', () => {
	const presenceState = getUserPresence(store, userPreferences.get())
	if (!presenceState) return null

	return InstancePresenceRecordType.create({
		...presenceState,
		id: InstancePresenceRecordType.createId(store.id),
	})
})
```

#### Presence modes

Dynamic presence behavior based on room occupancy:

```typescript
const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
	if (otherUserPresences.get().size === 0) return 'solo'
	return 'full'
})

// Affects:
// - Cursor visibility
// - Selection indicators
// - Performance optimizations
```

### Asset management

#### Demo asset store

Integrated blob storage for demo environments:

```typescript
function createDemoAssetStore(host: string): TLAssetStore {
	return {
		// Upload to demo server
		upload: async (asset, file) => {
			const objectName = `${uniqueId()}-${file.name}`.replace(/\W/g, '-')
			const url = `${host}/uploads/${objectName}`
			await fetch(url, { method: 'POST', body: file })
			return { src: url }
		},

		// Intelligent image optimization
		resolve: (asset, context) => {
			// Automatic image resizing based on:
			// - Screen DPI and scale
			// - Network connection quality
			// - Image size thresholds
			// - Animation/vector type detection
		},
	}
}
```

#### Asset resolution strategy

Smart image optimization for performance:

- **Network-Aware**: Adjusts quality based on connection speed
- **Scale-Aware**: Resizes based on actual display size
- **Type-Aware**: Handles animated/vector images appropriately
- **Size-Threshold**: Only optimizes images above 1.5MB

### Connection reliability

#### Automatic reconnection

Built-in reconnection management:

```typescript
// Connection status tracking
const collaborationStatusSignal = computed('collaboration status', () =>
	socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
)

// Graceful degradation
store = createTLStore({
	collaboration: {
		status: collaborationStatusSignal,
		mode: syncMode, // readonly/readwrite based on server state
	},
})
```

#### State recovery

Robust recovery from connection issues:

- **Optimistic Updates**: Local changes applied immediately
- **Server Reconciliation**: Re-sync with server state on reconnect
- **Conflict Resolution**: Handle overlapping changes gracefully
- **Store Validation**: Ensure store remains usable after reconnection

## Demo server integration

### Hosted demo environment

Pre-configured integration with tldraw's demo infrastructure:

- **Demo Server**: `https://demo.tldraw.xyz` for WebSocket connections
- **Image Worker**: `https://images.tldraw.xyz` for image optimization
- **Bookmark Unfurling**: `${host}/bookmarks/unfurl` for URL metadata

### Asset processing pipeline

Integrated asset handling for demo environments:

```typescript
// Automatic bookmark creation from URLs
editor.registerExternalAssetHandler('url', async ({ url }) => {
	return await createAssetFromUrlUsingDemoServer(host, url)
})

// Generates bookmark assets with:
// - Title, description, favicon from meta tags
// - Image preview from og:image
// - Fallback to basic bookmark on errors
```

### Security and limitations

Demo server considerations:

- **Data Retention**: Demo data deleted after ~24 hours
- **Public Access**: Anyone with room ID can access content
- **Upload Restrictions**: File uploads disabled on production demo domains
- **Rate Limiting**: Built-in protection against abuse

## Integration patterns

### Basic multiplayer setup

```typescript
function MultiplayerApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssetStore,
    userInfo: { id: 'user-1', name: 'Alice', color: '#ff0000' }
  })

  if (store.status === 'loading') return <Loading />
  if (store.status === 'error') return <Error error={store.error} />

  return <Tldraw store={store.store} />
}
```

### Demo/Prototype setup

```typescript
function DemoApp() {
  const store = useSyncDemo({
    roomId: 'my-company-test-room-123',
    userInfo: myUserSignal
  })

  return <Tldraw store={store} />
}
```

### Custom presence implementation

```typescript
const store = useSync({
	uri: wsUri,
	assets: myAssets,
	getUserPresence: (store, user) => ({
		userId: user.id,
		userName: user.name,
		cursor: { x: mouseX, y: mouseY },
		selectedShapeIds: store.selectedShapeIds,
		brush: store.brush,
		// Custom presence data
		currentTool: store.currentTool,
		isTyping: store.isInEditingMode,
	}),
})
```

### Authentication integration

```typescript
const store = useSync({
	uri: async () => {
		const token = await getAuthToken()
		return `wss://myserver.com/sync/room-123?token=${token}`
	},
	assets: authenticatedAssetStore,
	onMount: (editor) => {
		// Setup authenticated external content handlers
		setupAuthenticatedHandlers(editor)
	},
})
```

## Performance considerations

### Connection optimization

- **Batched Updates**: Multiple changes sent together
- **Diff Compression**: Only send actual changes, not full state
- **Presence Throttling**: Limit cursor update frequency
- **Selective Sync**: Only sync relevant data

### Memory management

- **Automatic Cleanup**: Proper disposal of connections and resources
- **Weak References**: Prevent memory leaks in long-running sessions
- **State Pruning**: Remove unnecessary historical data

### Network efficiency

- **Binary Protocol**: Efficient message encoding
- **Compression**: Optional compression for large updates
- **Connection Pooling**: Reuse connections where possible

## Error recovery

### Network issues

- **Offline Detection**: Graceful handling of network loss
- **Automatic Retry**: Progressive backoff for reconnection
- **State Buffering**: Queue changes during disconnection
- **Conflict Resolution**: Handle changes made while offline

### Server issues

- **Server Errors**: Proper handling of server-side failures
- **Schema Mismatches**: Handle version incompatibilities
- **Rate Limiting**: Respect server-imposed limits
- **Graceful Degradation**: Fall back to local-only mode when needed

## Dependencies

### Core dependencies

- **@tldraw/sync-core**: Core synchronization infrastructure
- **@tldraw/state-react**: React integration for reactive state
- **tldraw**: Main tldraw package for store and editor integration

### Peer dependencies

- **React**: React hooks and lifecycle integration
- **WebSocket**: Browser or Node.js WebSocket implementation

## Key benefits

### Developer experience

- **Simple API**: Single hook for full multiplayer functionality
- **Flexible Configuration**: Support for custom servers and asset stores
- **Great Defaults**: Demo server for instant prototyping
- **TypeScript Support**: Full type safety throughout

### Real-Time features

- **Live Collaboration**: Multiple users editing simultaneously
- **Presence Indicators**: See other users' cursors and selections
- **Instant Updates**: Changes appear immediately across all clients
- **Conflict Resolution**: Intelligent handling of simultaneous edits

### Production ready

- **Reliability**: Robust error handling and recovery
- **Scalability**: Efficient protocols for large rooms
- **Security**: Authentication and authorization support
- **Observability**: Analytics and monitoring integration


# ==========================================
# FILE: packages/tldraw/CONTEXT.md
# ==========================================

# Tldraw Package Context

## Overview

The `@tldraw/tldraw` package is the main "batteries included" SDK that provides a complete drawing application with UI, tools, shapes, and all functionality. It builds on top of the editor package to provide a fully-featured drawing experience out of the box.

## Architecture

### Core components

#### `Tldraw.tsx` - Main component

The primary component that combines the editor with the complete UI system:

```typescript
export function Tldraw(props: TldrawProps) {
	// Merges default and custom:
	// - Shape utilities (defaultShapeUtils + custom)
	// - Tools (defaultTools + custom)
	// - Bindings (defaultBindingUtils + custom)
	// - Side effects and external content handlers
	// Returns <TldrawEditor> wrapped with <TldrawUi>
}
```

#### `TldrawUi.tsx` - UI System

Comprehensive UI system with responsive layout:

- Provider hierarchy for context, theming, translations, events
- Responsive breakpoint system (mobile, tablet, desktop)
- Layout zones: top (menu, helper buttons, top panel, share/style panels), bottom (navigation, toolbar, help)
- Conditional rendering based on focus mode, readonly state, debug mode
- Mobile-specific behavior (toolbar hiding during editing)

### Shape system

#### Default shape utilities (`defaultShapeUtils.ts`)

Complete set of shape implementations:

- **Text**: Text editing with rich text support
- **Draw**: Freehand drawing with stroke optimization
- **Geo**: Geometric shapes (rectangle, ellipse, triangle, etc.)
- **Note**: Sticky note shapes
- **Line**: Straight lines with various styles
- **Frame**: Container frames for grouping
- **Arrow**: Smart arrows with binding capabilities
- **Highlight**: Highlighter tool for annotations
- **Bookmark**: URL bookmark cards with metadata
- **Embed**: Embedded content (YouTube, Figma, etc.)
- **Image**: Image shapes with cropping support
- **Video**: Video playback shapes

Each shape has its own directory with:

- `ShapeUtil.tsx`: Rendering, hit testing, bounds calculation
- `ShapeTool.ts`: Creation tool with state machine
- Tool states (Idle, Pointing, etc.)
- Helper functions and components

### Tools system

#### Default tools (`defaultTools.ts`)

Complete toolset:

- **SelectTool**: Complex selection with multiple interaction modes
- **Shape Tools**: One for each creatable shape type
- **HandTool**: Pan/move canvas
- **EraserTool**: Delete shapes by brushing
- **LaserTool**: Temporary pointer for presentations
- **ZoomTool**: Zoom to specific areas

#### SelectTool - Primary interaction tool

Sophisticated state machine with child states:

- **Idle**: Default state, handles shape selection
- **Brushing**: Drag selection of multiple shapes
- **Translating**: Moving selected shapes
- **Resizing**: Resize handles interaction
- **Rotating**: Rotation handle interaction
- **Crop**: Image cropping functionality
- **EditingShape**: Text editing mode
- **Pointing** states: Various pointer interaction states

### UI component system

#### Component architecture

Hierarchical component system with context providers:

- **TldrawUiContextProvider**: Master provider with asset URLs, overrides, components
- **Specialized Providers**: Tooltips, translations, events, dialogs, toasts, breakpoints
- **Component Override System**: Every UI component can be replaced/customized

#### Key UI components

- **Toolbar**: Main tool selection with overflow handling
- **StylePanel**: Shape style controls (color, size, opacity, etc.)
- **MenuPanel**: Application menu with actions
- **SharePanel**: Collaboration and sharing features
- **NavigationPanel**: Page navigation and zoom controls
- **Minimap**: Canvas overview with WebGL rendering
- **Dialogs**: Modal dialogs for embeds, links, keyboard shortcuts
- **Toasts**: User notifications system

### External content system

#### Content handlers (`defaultExternalContentHandlers.ts`)

Comprehensive external content processing:

- **Files**: Drag/drop and paste of images/videos with validation
- **URLs**: Automatic bookmark creation with metadata extraction
- **Text**: Smart text pasting with rich text support
- **SVG**: Vector graphics import with size calculation
- **Embeds**: Integration with external services (YouTube, Figma, etc.)
- **Tldraw Content**: Copy/paste between tldraw instances
- **Excalidraw**: Import from Excalidraw format

#### Asset management

- Size and type validation
- Automatic image resizing and optimization
- Hash-based deduplication
- Temporary preview creation
- Background upload processing

### Bindings system

#### Arrow bindings (`ArrowBindingUtil`)

Smart arrow connections:

- Automatic binding to shape edges
- Dynamic arrow routing around obstacles
- Binding preservation during shape updates
- Visual feedback for binding states

### State management & side effects

#### Default side effects (`defaultSideEffects.ts`)

Reactive state management for UI behavior:

- **Cropping Mode**: Auto-enter/exit crop mode based on state
- **Text Editing**: Tool switching for text creation/editing
- **Tool Locking**: Persistent tool state for rapid creation

### Utilities

#### Export system (`utils/export/`)

Multi-format export capabilities:

- **Image Export**: PNG, JPG, SVG with various options
- **Data Export**: JSON format for content preservation
- **Print Support**: Optimized printing layouts
- **Copy/Paste**: Clipboard integration

#### Text processing (`utils/text/`)

Advanced text handling:

- **Rich Text**: HTML to tldraw rich text conversion
- **Text Direction**: RTL language detection and support
- **Text Measurement**: Accurate text sizing for layout

#### Asset processing (`utils/assets/`)

Asset optimization and management:

- **Image Processing**: Resizing, format conversion
- **Font Preloading**: Ensure consistent text rendering
- **Size Constraints**: Automatic asset size management

### Canvas overlays

#### Visual feedback components (`canvas/`)

Canvas-level visual elements:

- **TldrawHandles**: Resize and rotate handles
- **TldrawCropHandles**: Image cropping interface
- **TldrawScribble**: Live drawing feedback
- **TldrawSelectionForeground**: Selection outline and controls
- **TldrawShapeIndicators**: Hover and focus indicators

## Key patterns

### Component composition

- Every UI component can be overridden via the components prop
- Providers use context for dependency injection
- Responsive design with breakpoint-based rendering

### State machine architecture

- Tools implemented as hierarchical state machines
- Clear separation between tool logic and rendering
- Reactive state updates trigger automatic UI changes

### Asset pipeline

- Async asset processing with progress feedback
- Automatic optimization and validation
- Hash-based caching and deduplication

### Extension points

- Custom shapes via ShapeUtil classes
- Custom tools via StateNode extensions
- Custom UI via component overrides
- Custom external content handlers

## Integration

### With editor package

- Wraps `@tldraw/editor` with complete UI
- Extends editor with additional functionality
- Provides default implementations for all extension points

### With external systems

- Clipboard integration for copy/paste
- File system integration for drag/drop
- URL handling for bookmarks and embeds
- External service integration (YouTube, Figma, etc.)

### Responsive design

- Mobile-first breakpoint system
- Touch-optimized interactions
- Adaptive UI based on screen size
- Virtual keyboard handling on mobile

## Performance considerations

### Canvas rendering

- WebGL-accelerated minimap
- Optimized shape rendering with culling
- Efficient hit testing and bounds calculation

### Asset handling

- Lazy loading of external content
- Background processing of large files
- Temporary previews during upload
- Automatic cleanup of unused assets

### Memory management

- Proper cleanup of event listeners and reactors
- Efficient state updates with batching
- Asset deduplication to reduce memory usage

## Development patterns

### Testing

- Comprehensive test coverage for tools and shapes
- Snapshot testing for complex rendering
- Mock implementations for external dependencies

### TypeScript Integration

- Full type safety for all APIs
- Generic type parameters for extensibility
- Proper inference for shape and tool types

### Error handling

- Graceful degradation for failed external content
- User-friendly error messages via toast system
- Comprehensive validation for all inputs


# ==========================================
# FILE: packages/tlschema/CONTEXT.md
# ==========================================

# CONTEXT.md - @tldraw/tlschema Package

This file provides comprehensive context for understanding the `@tldraw/tlschema` package, which defines the type system, data schemas, and migrations for tldraw's persisted data.

## Package overview

`@tldraw/tlschema` is the central type definition and schema management package for tldraw. It defines all record types (shapes, assets, pages, etc.), their validation schemas, migration sequences, and the overall data model that powers the tldraw editor.

**Core purpose:** Provide a complete, type-safe, and version-aware data model for tldraw that can evolve over time while maintaining backward compatibility.

## Architecture overview

### Record system hierarchy

**TLRecord union (`src/records/TLRecord.ts`):**

```typescript
type TLRecord =
	| TLAsset // Images, videos, bookmarks
	| TLBinding // Connections between shapes (arrows)
	| TLCamera // Viewport state per page
	| TLDocument // Root document metadata
	| TLInstance // User instance state
	| TLInstancePageState // Per-page user state
	| TLPage // Document pages
	| TLShape // All shape types
	| TLInstancePresence // Real-time presence
	| TLPointer // Mouse/touch state
```

### Store system foundation

**TLStore (`src/TLStore.ts`):**

- Type alias for `Store<TLRecord, TLStoreProps>`
- `TLStoreProps` includes asset store integration and editor mounting
- `createIntegrityChecker()` ensures store consistency (pages, cameras, states)
- Error redaction for sensitive data (asset URLs)

**TLSchema Creation (`src/createTLSchema.ts`):**

- `createTLSchema()` factory for building schemas with custom shapes/bindings
- `defaultShapeSchemas` - All built-in shape configurations
- `defaultBindingSchemas` - Built-in binding configurations
- Automatic migration sequence coordination

### Shape system architecture

**Base shape structure (`src/shapes/TLBaseShape.ts`):**

```typescript
interface TLBaseShape<Type extends string, Props extends object> {
	id: TLShapeId
	type: Type
	x: number
	y: number
	rotation: number
	index: IndexKey // Fractional index for ordering
	parentId: TLParentId // Page or parent shape
	isLocked: boolean
	opacity: TLOpacityType
	props: Props // Shape-specific properties
	meta: JsonObject // User-defined metadata
}
```

**Shape Types (`src/shapes/`):**

- **Basic Shapes:** Geo (rectangles, circles, etc.), Text, Note, Frame, Group
- **Drawing Shapes:** Draw (freehand), Line (multi-point), Highlight
- **Media Shapes:** Image, Video, Bookmark, Embed
- **Complex Shapes:** Arrow (with bindings)

**Shape Props Pattern:**
Each shape defines:

- Props interface with styled and regular properties
- Props validation object using `@tldraw/validate`
- Migration sequence for schema evolution
- Style property integration

### Style system

**StyleProp Architecture (`src/styles/StyleProp.ts`):**

- Base class for properties that can be applied across multiple shapes
- Last-used value persistence for consistent styling
- Enum-based and free-form style properties
- Automatic validation and type safety

**Default Style Properties:**

- `DefaultColorStyle` - Shape and text colors with theme support
- `DefaultDashStyle` - Stroke patterns (solid, dashed, dotted)
- `DefaultFillStyle` - Fill patterns (none, solid, semi, pattern)
- `DefaultSizeStyle` - Size variants (s, m, l, xl)
- `DefaultFontStyle` - Typography (draw, sans, serif, mono)
- Alignment styles (horizontal, vertical, text)

**Theme System:**

- `TLDefaultColorTheme` with light/dark variants
- Color palette with semantic naming
- CSS custom properties integration
- Frame and note-specific color variants

### Asset system

**Asset types (`src/assets/`):**

- **TLImageAsset** - Raster images with metadata (size, MIME type, etc.)
- **TLVideoAsset** - Video files with duration and thumbnail info
- **TLBookmarkAsset** - Web page previews with title, description, favicon

**Asset Management:**

- `TLAssetStore` interface for storage abstraction
- Upload/resolve/remove lifecycle management
- `TLAssetContext` for resolution optimization
- Support for data URLs, IndexedDB, and remote storage

### Binding system

**Binding architecture (`src/bindings/`):**

- `TLBaseBinding` - Base interface for shape connections
- `TLArrowBinding` - Connects arrows to shapes with precise positioning
- Binding creation, validation, and lifecycle management
- Integration with shape deletion and updates

### Validation system

**Validation infrastructure:**

- Built on `@tldraw/validate` for runtime type checking
- Cascading validation from store → record → props
- Custom validators for complex types (rich text, geometry, etc.)
- Development vs production validation modes

**Validation Patterns:**

- `idValidator<T>()` - Type-safe ID validation
- `createShapeValidator()` - Generic shape validation factory
- Custom prop validators for each shape type
- Meta property validation (user-defined data)

### Migration system

**Migration architecture:**

- **Store-level migrations** (`src/store-migrations.ts`) - Structural changes
- **Record-level migrations** - Individual record type evolution
- **Props migrations** (`src/recordsWithProps.ts`) - Shape/binding property changes
- **Asset migrations** - Asset schema evolution

**Migration Patterns:**

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.geo',
	sequence: [
		{
			id: 'com.tldraw.shape.geo/1',
			up: (props) => ({ ...props, newProperty: defaultValue }),
			down: ({ newProperty, ...props }) => props,
		},
	],
})
```

**Migration Coordination:**

- Version-based migration IDs
- Dependency tracking between migrations
- Forward and backward migration support
- Retroactive vs non-retroactive migrations

## Key data structures

### Shape property system

**Properties with styles:**

```typescript
interface TLGeoShapeProps {
	geo: TLGeoShapeGeoStyle // Style property (shared)
	color: TLDefaultColorStyle // Style property (shared)
	w: number // Regular property (shape-specific)
	h: number // Regular property (shape-specific)
	richText: TLRichText // Complex validated property
}
```

**Style Property Definition:**

```typescript
const GeoShapeGeoStyle = StyleProp.defineEnum('tldraw:geo', {
	defaultValue: 'rectangle',
	values: ['rectangle', 'ellipse', 'triangle' /* ... */],
})
```

### Record type creation

**Shape record creation:**

```typescript
const GeoShapeRecordType = createRecordType<TLGeoShape>('shape', {
	validator: createShapeValidator('geo', geoShapeProps),
	scope: 'document',
})
```

**Asset Record Creation:**

```typescript
const AssetRecordType = createRecordType<TLAsset>('asset', {
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ meta: {} }))
```

### Complex type patterns

**Rich Text (`src/misc/TLRichText.ts`):**

- Structured text with formatting
- JSON-based representation
- Validation and conversion utilities
- Integration with text shapes

**Geometry Types (`src/misc/geometry-types.ts`):**

- `VecModel` - 2D points with validation
- `BoxModel` - Axis-aligned rectangles
- Integration with editor geometry system

## Development patterns

### Adding new shape types

1. **Define shape interface:**

```typescript
interface TLCustomShape extends TLBaseShape<'custom', TLCustomShapeProps> {}

interface TLCustomShapeProps {
	color: TLDefaultColorStyle // Use existing styles
	customProp: string // Shape-specific properties
}
```

2. **Create Props Validation:**

```typescript
const customShapeProps: RecordProps<TLCustomShape> = {
	color: DefaultColorStyle,
	customProp: T.string,
}
```

3. **Define Migrations:**

```typescript
const customShapeMigrations = createShapePropsMigrationSequence({
	sequenceId: 'com.yourapp.shape.custom',
	sequence: [
		/* migration objects */
	],
})
```

4. **Register in Schema:**

```typescript
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		custom: {
			migrations: customShapeMigrations,
			props: customShapeProps,
		},
	},
})
```

### Adding style properties

```typescript
const MyStyleProp = StyleProp.define('myapp:style', {
	defaultValue: 'default',
	type: T.unionWithValidator(['option1', 'option2'], T.string),
})

// Use in shape props
interface MyShapeProps {
	myStyle: T.TypeOf<typeof MyStyleProp>
	// other props...
}

const myShapeProps: RecordProps<MyShape> = {
	myStyle: MyStyleProp,
	// other validators...
}
```

### Migration best practices

**Record-level migration:**

```typescript
const recordMigrations = createRecordMigrationSequence({
	sequenceId: 'com.myapp.myrecord',
	recordType: 'myrecord',
	sequence: [
		{
			id: 'com.myapp.myrecord/1',
			up: (record) => {
				record.newField = computeDefault(record)
				return record
			},
			down: ({ newField, ...record }) => record,
		},
	],
})
```

**Props Migration:**

```typescript
const propsMigrations: TLPropsMigrations = {
	sequence: [
		{
			id: 'com.myapp.shape.custom/1',
			up: (props) => ({ ...props, newProp: 'default' }),
			down: ({ newProp, ...props }) => props,
		},
	],
}
```

## File organization and structure

### Core records (`src/records/`)

- **TLShape.ts** - Base shape system and root migrations (~300 lines)
- **TLAsset.ts** - Asset management and validation (~100 lines)
- **TLBinding.ts** - Shape connection system (~150 lines)
- **TLPage.ts** - Document page structure (~50 lines)
- **TLDocument.ts** - Root document record (~50 lines)
- **TLInstance.ts** - User instance state (~200 lines)
- **TLPageState.ts** - Per-page user state (~150 lines)
- **TLCamera.ts** - Viewport state (~50 lines)
- **TLPresence.ts** - Real-time user presence (~100 lines)
- **TLPointer.ts** - Input device state (~50 lines)

### Shape implementations (`src/shapes/`)

Each shape file (~100-200 lines) includes:

- TypeScript interface definition
- Props validation object
- Migration sequence
- Type exports and utilities

### Style definitions (`src/styles/`)

- **StyleProp.ts** - Base style property system (~150 lines)
- Individual style implementations (~50-100 lines each)
- Theme definitions and color palettes
- Validation and type utilities

### Asset definitions (`src/assets/`)

- Base asset system and individual asset types (~50-100 lines each)
- Upload/resolution interfaces
- Asset-specific validation and metadata

### Support systems

- **`src/misc/`** - Utility types, validators, and helper functions
- **`src/translations/`** - Internationalization support
- **`src/createPresenceStateDerivation.ts`** - Real-time presence logic
- **`src/store-migrations.ts`** - Historical store structure changes

## Type system patterns

### ID system

- Strongly typed IDs using branded types
- `RecordId<T>` prevents ID confusion between record types
- Custom ID creation for predictable IDs
- Random ID generation for new records

### Props with styles

```typescript
// Shapes use a mix of style props and regular props
interface ShapeProps {
	// Style props (shared across shapes, persisted globally)
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle

	// Regular props (shape-specific)
	width: number
	height: number
	text: string
}
```

### Validation integration

- All properties validated at runtime
- Custom validation for complex types
- Graceful degradation for unknown properties
- Development vs production validation levels

## Store integration points

### Schema configuration

```typescript
const schema = createTLSchema({
	shapes: customShapeSchemas,
	bindings: customBindingSchemas,
	migrations: additionalMigrations,
})

const store = new Store({
	schema,
	props: {
		defaultName: 'Untitled',
		assets: assetStore,
		onMount: (editor) => {
			/* setup */
		},
	},
})
```

### Asset store integration

```typescript
interface TLAssetStore {
	upload(asset: TLAsset, file: File): Promise<{ src: string }>
	resolve?(asset: TLAsset, ctx: TLAssetContext): Promise<string | null>
	remove?(assetIds: TLAssetId[]): Promise<void>
}
```

## Development guidelines

### Schema evolution

1. **Always add migrations** when changing persisted data structures
2. **Version changes incrementally** with descriptive names
3. **Test migrations thoroughly** with real-world data
4. **Document breaking changes** and migration requirements
5. **Handle migration failures gracefully** with validation fallbacks

### Shape development

1. **Follow existing patterns** for props structure and validation
2. **Use style properties** for attributes that should be shared across shapes
3. **Implement proper validation** for all properties including edge cases
4. **Consider performance implications** of complex property validation
5. **Design for extensibility** while maintaining type safety

### Validation strategy

1. **Use appropriate validators** from `@tldraw/validate`
2. **Implement custom validators** for domain-specific types
3. **Handle validation errors gracefully** in production
4. **Test validation edge cases** thoroughly
5. **Consider validation performance** for large datasets

### Migration strategy

1. **Plan migration paths** before making schema changes
2. **Group related changes** into single migration steps
3. **Test both up and down migrations** for correctness
4. **Consider migration dependencies** across packages
5. **Provide clear migration documentation** for major changes

## Performance considerations

### Memory optimization

- Immutable record structures prevent accidental mutations
- `devFreeze()` in development prevents mutation bugs
- Efficient ID generation with minimal allocations
- Style property sharing reduces memory overhead

### Validation performance

- Lazy validation where possible
- `validateUsingKnownGoodVersion()` optimizations
- Minimal validation in hot paths
- Development vs production validation levels

### Schema efficiency

- Fractional indexing for efficient reordering
- Minimal required properties to reduce validation overhead
- Efficient diff computation for large record sets
- Optimized serialization/deserialization

## Key components deep dive

### Style property system

**Style Property Lifecycle:**

1. Definition with unique ID and default value
2. Registration in shape props validation
3. Style tracking in editor state
4. Application to selected shapes
5. Persistence for next shape creation

**Style Property Types:**

- **Free-form:** `StyleProp.define()` with custom validation
- **Enum-based:** `StyleProp.defineEnum()` with predefined values
- **Theme integration:** Colors that adapt to light/dark themes

### Shape property patterns

**Geometric properties:**

- Position: `x`, `y`, `rotation` (inherited from base)
- Size: `w`, `h` or shape-specific dimensions
- Transform: Handled by editor transformation system

**Visual Properties:**

- Color, dash, fill, size (style properties)
- Opacity (inherited from base)
- Shape-specific visual properties (e.g., `geo` for geometric shapes)

**Content Properties:**

- Text content (`richText` for formatted text)
- Asset references (`assetId` for media shapes)
- URLs and metadata for external content

### Record scope system

**Scope Types:**

- **`document`** - Synced and persisted (shapes, assets, pages)
- **`session`** - Per-instance, may be persisted (user preferences)
- **`presence`** - Real-time only, not persisted (cursors, selections)

**Scope Implications:**

- Different sync and persistence behavior
- Scoped listeners for targeted reactivity
- Security and privacy considerations
- Performance optimization opportunities

## Integration points

### Dependencies

- **`@tldraw/store`** - Record storage and reactivity
- **`@tldraw/validate`** - Runtime validation system
- **`@tldraw/utils`** - Utility functions and type helpers

### Extension points

- **Custom shapes** via schema configuration
- **Custom bindings** for shape connections
- **Custom assets** for media handling
- **Custom migrations** for schema evolution
- **Custom style properties** for shared styling

### Framework integration

- Framework-agnostic type definitions
- React integration via editor package
- Server-side rendering support
- Validation works in any JavaScript environment

## Common development scenarios

### Adding a new shape

1. Define shape interface extending `TLBaseShape`
2. Create props validation object
3. Implement migration sequence
4. Add to default shape schemas
5. Test validation and migrations

### Modifying existing shape

1. Update shape interface
2. Add migration for property changes
3. Update validation schema
4. Test backward compatibility
5. Update shape util implementation

### Adding style property

1. Define style property with unique ID
2. Add to relevant shape props
3. Update shape validation
4. Consider theme integration
5. Test style persistence

### Schema evolution

1. Identify breaking changes
2. Plan migration strategy
3. Implement migrations with tests
4. Update documentation
5. Coordinate with related packages

## Testing patterns

### Migration testing (`src/__tests__/`)

- Round-trip migration testing (up then down)
- Migration performance testing
- Edge case handling
- Data corruption prevention

### Validation testing

- Valid and invalid input testing
- Type coercion behavior
- Performance under load
- Error message quality

### Integration testing

- Store integration with real data
- Cross-package compatibility
- Asset handling workflows
- Real-time sync scenarios

## Common pitfalls

1. **Migration inconsistencies:** Mismatched up/down migrations causing data loss
2. **Validation performance:** Over-complex validators in hot paths
3. **Style Property Conflicts:** Multiple properties with same ID
4. **ID Type Confusion:** Using wrong ID types for references
5. **Schema Breaking Changes:** Changes without proper migrations
6. **Asset reference issues:** Orphaned asset references after deletion
7. **Scope misuse:** Wrong record scope affecting sync/persistence behavior

## Package dependencies and integration

**Internal dependencies:**

- Builds on `@tldraw/store` for record management
- Uses `@tldraw/validate` for all validation
- Requires `@tldraw/utils` for utilities

**Consumer Packages:**

- `@tldraw/editor` uses schema for editor configuration
- `@tldraw/tldraw` provides default schemas
- Custom implementations extend base schemas

**External Integration:**

- Asset stores implement `TLAssetStore` interface
- Sync engines use record diffs and migrations
- Persistence layers handle schema versioning


# ==========================================
# FILE: packages/utils/CONTEXT.md
# ==========================================

````markdown
# Utils Package Context

## Overview

The `@tldraw/utils` package provides foundational utility functions used throughout the tldraw codebase. It contains pure, reusable helper functions for common programming tasks including array manipulation, object operations, control flow, media processing, and performance optimization.

## Package structure & exports

The utils package uses a barrel export pattern through `index.ts`, exposing all utilities as named exports:

```typescript
// Main entry point exports
export * from './lib/array'
export * from './lib/object'
export * from './lib/control'
export * from './lib/reordering'
export * from './lib/media/media'
export * from './lib/ExecutionQueue'
export * from './lib/perf'
export * from './lib/PerformanceTracker'
export * from './lib/hash'
export * from './lib/cache'
export * from './lib/storage'
export * from './lib/file'
export * from './lib/value'
export * from './lib/network'
export * from './lib/error'
// ... and more

// Import examples:
import { dedupe, rotateArray, partition } from '@tldraw/utils'
import { ExecutionQueue, PerformanceTracker } from '@tldraw/utils'
import { Result, assert, exhaustiveSwitchError } from '@tldraw/utils'
```
````

## Architecture

### Core categories

#### Array utilities (`array.ts`)

Type-safe array manipulation functions with complete TypeScript signatures:

```typescript
// Array transformation and analysis
rotateArray<T>(arr: T[], offset: number): T[]
dedupe<T>(input: T[], equals?: (a: any, b: any) => boolean): T[]
partition<T>(arr: readonly T[], predicate: (item: T, index: number) => boolean): [T[], T[]]

// Array search and comparison
minBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
maxBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
areArraysShallowEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean

// Advanced merging with override support
mergeArraysAndReplaceDefaults<Key extends string | number | symbol, T extends Record<Key, unknown>>(
  key: Key,
  custom: T[],
  defaults: T[]
): T[]
```

#### Object utilities (`object.ts`)

Type-preserving object operations with complete signatures:

```typescript
// Type-safe object key/value extraction
objectMapKeys<Key extends string | number | symbol>(object: {readonly [K in Key]: unknown}): Array<Key>
objectMapValues<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<Value>
objectMapEntries<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<[Key, Value]>

// Object transformation and filtering with full type preservation
filterEntries<Key extends string | number | symbol, Value>(
  object: {readonly [K in Key]: Value},
  predicate: (key: Key, value: Value) => boolean
): {[K in Key]: Value}

mapObjectMapValues<Key extends string | number | symbol, ValueBefore, ValueAfter>(
  object: {readonly [K in Key]: ValueBefore},
  mapper: (key: Key, value: ValueBefore) => ValueAfter
): {readonly [K in Key]: ValueAfter}

areObjectsShallowEqual<T extends Record<string | number | symbol, unknown>>(obj1: T, obj2: T): boolean
```

#### Control flow (`control.ts`)

Error handling and async utilities:

```typescript
// Result type for error handling without exceptions
interface OkResult<T> { readonly ok: true; readonly value: T }
interface ErrorResult<E> { readonly ok: false; readonly error: E }
type Result<T, E> = OkResult<T> | ErrorResult<E>

class Result {
  static ok<T>(value: T): OkResult<T>
  static err<E>(error: E): ErrorResult<E>
}

// Assertions with stack trace optimization
assert(value: unknown, message?: string): asserts value
assertExists<T>(value: T | null | undefined, message?: string): NonNullable<T>
exhaustiveSwitchError(value: never, property?: string): never

// Promise utilities
promiseWithResolve<T>(): Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}
sleep(ms: number): Promise<void>
```

#### Reordering system (`reordering.ts`)

Fractional indexing for item ordering. IndexKey is a branded string type that ensures type safety for ordering operations:

```typescript
// Brand type prevents mixing regular strings with index keys
type IndexKey = string & { __brand: 'indexKey' }
const ZERO_INDEX_KEY = 'a0' as IndexKey

// Generate indices for ordering - creates fractional indices between bounds
getIndices(below: IndexKey | null, above: IndexKey | null, n: number): IndexKey[]
getIndexBetween(below: IndexKey | null, above: IndexKey | null): IndexKey
getIndexAbove(below: IndexKey | null): IndexKey
getIndexBelow(above: IndexKey | null): IndexKey
validateIndexKey(key: string): IndexKey

// Sort comparison function for items that have index properties
sortByIndex<T extends { index: IndexKey }>(a: T, b: T): number
```

#### Media helpers (`media/media.ts`)

Media file processing and validation:

```typescript
// Supported media types constants
const DEFAULT_SUPPORTED_IMAGE_TYPES: readonly string[]
const DEFAULT_SUPPORT_VIDEO_TYPES: readonly string[]

class MediaHelpers {
	// Image processing
	static async getImageSize(file: File): Promise<{ w: number; h: number }>
	static async getImageAndDimensions(
		file: File
	): Promise<{ image: HTMLImageElement; w: number; h: number }>
	static isImageType(mimeType: string): boolean
	static isStaticImageType(mimeType: string): boolean
	static isVectorImageType(mimeType: string): boolean
	static isAnimatedImageType(mimeType: string): boolean
	static async isAnimated(file: File): Promise<boolean>

	// Video processing
	static async getVideoSize(file: File): Promise<{ w: number; h: number }>
	static async getVideoFrameAsDataUrl(file: File): Promise<string>
	static async loadVideo(url: string): Promise<HTMLVideoElement>

	// URL management
	static usingObjectURL<T>(blob: Blob, fn: (url: string) => T): T
}
```

### Performance & execution

#### ExecutionQueue (`ExecutionQueue.ts`)

Sequential task execution with optional timing - ensures tasks run one at a time:

```typescript
class ExecutionQueue {
  constructor(private readonly timeout?: number)

  // Add task to queue - waits for previous tasks to complete
  async push<T>(task: () => T | Promise<T>): Promise<Awaited<T>>
  isEmpty(): boolean
  close(): void

  // Usage example:
  const queue = new ExecutionQueue(5000) // 5 second timeout

  // Tasks execute sequentially, not in parallel
  const result1 = await queue.push(() => expensiveOperation1())
  const result2 = await queue.push(() => expensiveOperation2()) // Waits for operation1
}
```

#### Performance tracking (`perf.ts`, `PerformanceTracker.ts`)

Performance measurement and monitoring:

```typescript
// Duration measurement utilities
measureDuration<T>(fn: () => T): {duration: number; result: T}
measureCbDuration<T>(fn: (cb: () => void) => T): Promise<{duration: number; result: T}>
measureAverageDuration(label: string, fn: () => void, iterations: number): void

// Performance tracking across app lifecycle
class PerformanceTracker {
  mark(name: string): void
  measure(name: string, start?: string, end?: string): PerformanceMeasure | void

  // Usage example:
  const tracker = new PerformanceTracker()
  tracker.mark('render-start')
  // ... rendering logic
  tracker.mark('render-end')
  tracker.measure('render-duration', 'render-start', 'render-end')
}
```

### Data processing

#### Hashing (`hash.ts`)

Content hashing for deduplication and caching:

```typescript
// Hash generation for various input types
getHashForString(string: string): string
getHashForBuffer(buffer: ArrayBuffer): string
getHashForObject(object: object): string
lns(str: string): string // locale-normalized string for consistent hashing
```

#### Caching (`cache.ts`)

Weak reference caching system that prevents memory leaks:

```typescript
class WeakCache<T extends object, U> {
	get<P extends T>(item: P, cb: (item: P) => U): U

	// Usage example - caches expensive computations tied to object lifecycle:
	cache = new WeakCache<Shape, BoundingBox>()
	bbox = cache.get(shape, (s) => computeBoundingBox(s)) // Computed once per shape
}
```

#### Storage (`storage.ts`)

Browser storage utilities with comprehensive error handling:

```typescript
// LocalStorage operations with error boundaries
getFromLocalStorage(key: string): string | null
setInLocalStorage(key: string, value: string): void
deleteFromLocalStorage(key: string): void
clearLocalStorage(): void

// SessionStorage operations
getFromSessionStorage(key: string): string | null
setInSessionStorage(key: string, value: string): void
deleteFromSessionStorage(key: string): void
clearSessionStorage(): void
```

### Utility functions

#### Timing & throttling

```typescript
// Throttling utilities for performance
debounce<T extends (...args: any[]) => any>(func: T, wait: number): T
fpsThrottle<T extends (...args: any[]) => any>(func: T): T // 60fps throttling
throttleToNextFrame<T extends (...args: any[]) => any>(func: T): T

// Timer management with cleanup
class Timers {
  setTimeout(handler: () => void, timeout?: number): number
  setInterval(handler: () => void, timeout?: number): number
  requestAnimationFrame(handler: () => void): number
  dispose(): void // Cleanup all timers
}
```

#### File operations (`file.ts`)

File system and blob utilities:

```typescript
class FileHelpers {
	static mimeTypeFromFilename(filename: string): string
	static extension(filename: string): string
	static isImage(file: File): boolean
	static isVideo(file: File): boolean
	static async dataUrlToBlob(dataUrl: string): Promise<Blob>
	static async blobToDataUrl(blob: Blob): Promise<string>
}
```

#### Value processing (`value.ts`)

Value validation and cloning:

```typescript
// Type guards with proper type narrowing
isDefined<T>(value: T): value is NonNullable<T>
isNonNull<T>(value: T): value is NonNull<T>
isNonNullish<T>(value: T): value is NonNullable<T>

// Structured cloning with fallbacks
structuredClone<T>(obj: T): T
isNativeStructuredClone(): boolean
```

#### Network (`network.ts`)

Network utilities with cross-platform polyfills:

```typescript
// Cross-platform fetch and Image with Node.js compatibility
export const fetch: typeof globalThis.fetch
export const Image: typeof globalThis.Image
```

### Specialized utilities

#### String processing

```typescript
// String enumeration helper for creating string literal types
stringEnum<T extends Record<string, string>>(obj: T): T

// URL processing with safe parsing
safeParseUrl(url: string): URL | undefined
```

#### Mathematical operations

```typescript
// Interpolation and random number generation
lerp(a: number, b: number, t: number): number
invLerp(a: number, b: number, v: number): number
modulate(value: number, rangeA: [number, number], rangeB: [number, number]): number
rng(seed?: string): () => number // Seedable PRNG for deterministic randomness
```

#### Error enhancement (`error.ts`)

Error annotation system for debugging:

```typescript
interface ErrorAnnotations {
  tags?: {[key: string]: {value: unknown}}
  extras?: {[key: string]: unknown}
}

annotateError(error: unknown, annotations: ErrorAnnotations): void
getErrorAnnotations(error: unknown): ErrorAnnotations | undefined
```

## Key design patterns

### Type safety

- Extensive use of TypeScript generics for type preservation
- Brand types for nominal typing (IndexKey prevents string/index confusion)
- Type guards for runtime type checking with proper narrowing
- Assertion functions that provide type information to TypeScript

### Performance optimization

- Stack trace optimization with `omitFromStackTrace` for cleaner debugging
- Weak reference caching to prevent memory leaks
- FPS-aware throttling for smooth 60fps animations
- Efficient object comparison with early returns and shallow checks

### Cross-Platform compatibility

The utils package ensures consistent behavior across different JavaScript environments:

**Browser Compatibility:**

- Storage utilities handle quota exceeded errors gracefully
- Media helpers work with File API and canvas operations
- Performance tracking uses native Performance API when available

**Node.js Compatibility:**

- Network utilities provide fetch and Image polyfills for server environments
- File operations handle both browser Blob/File APIs and Node.js buffers
- Performance tracking falls back to high-resolution time measurements

**Test Environment:**

- Mock-friendly APIs that can be easily stubbed
- Deterministic random number generation for reproducible tests
- Environment detection utilities for conditional behavior

### Functional programming

- Pure functions with no side effects (except explicit I/O operations)
- Immutable operations that return new objects rather than mutating inputs
- Higher-order functions for common patterns like filtering and mapping
- Composition-friendly API design that works well with pipes and chains

## Usage patterns & examples

### In editor package

```typescript
// Array utilities for managing shape collections
const visibleShapes = shapes.filter((shape) => shape.visible)
const uniqueShapes = dedupe(shapes, (a, b) => a.id === b.id)
const [selectedShapes, unselectedShapes] = partition(shapes, (shape) => shape.selected)

// Reordering system for z-index management
const newIndex = getIndexBetween(belowShape?.index ?? null, aboveShape?.index ?? null)
const sortedShapes = shapes.sort(sortByIndex)
```

### In state package

```typescript
// Control flow utilities for error handling
const result = Result.ok(computedValue)
if (!result.ok) {
	// Handle error case
	return result.error
}

// Performance tracking for reactive updates
const tracker = new PerformanceTracker()
tracker.mark('reaction-start')
// ... reactive computation
tracker.measure('reaction-time', 'reaction-start')
```

### In store package

```typescript
// Hashing for record deduplication
const recordHash = getHashForObject(record)
const isDuplicate = existingHashes.has(recordHash)

// Execution queue for atomic operations
const writeQueue = new ExecutionQueue()
await writeQueue.push(() => database.write(operation))
```

## Dependencies

### External dependencies

- `lodash.isequal`, `lodash.isequalwith`: Deep equality comparison for complex objects
- `lodash.throttle`, `lodash.uniq`: Performance utilities with battle-tested implementations
- `fractional-indexing-jittered`: Fractional indexing implementation for stable ordering

### Peer dependencies

None - the utils package is completely self-contained and provides the foundation for other tldraw packages.

### Internal dependencies

None - this package has no dependencies on other `@tldraw/*` packages, making it the foundation of the dependency graph.

## When to use utils vs other packages

**Use @tldraw/utils when:**

- You need basic array/object manipulation utilities
- You're implementing error handling with Result types
- You need performance measurement or throttling
- You're working with media files or storage operations
- You need cross-platform compatibility utilities

**Use other packages when:**

- `@tldraw/state` for reactive state management
- `@tldraw/store` for document/record management
- `@tldraw/editor` for canvas/shape operations
- `@tldraw/tldraw` for complete editor with UI

## Testing patterns

The utils package follows co-located testing with `.test.ts` files alongside source files:

```typescript
// Example test patterns
describe('ExecutionQueue', () => {
	it('executes tasks sequentially', async () => {
		const queue = new ExecutionQueue()
		const results: number[] = []

		// These should execute in order, not parallel
		await Promise.all([
			queue.push(() => {
				results.push(1)
				return 1
			}),
			queue.push(() => {
				results.push(2)
				return 2
			}),
			queue.push(() => {
				results.push(3)
				return 3
			}),
		])

		expect(results).toEqual([1, 2, 3])
	})
})
```

## Troubleshooting common issues

### Performance issues

- Use `fpsThrottle` for UI updates that happen frequently
- Use `WeakCache` for expensive computations tied to object lifecycles
- Use `ExecutionQueue` to prevent overwhelming the system with parallel operations

### Memory leaks

- Prefer `WeakCache` over `Map` for object-keyed caches
- Always call `dispose()` on `Timers` instances
- Use `Result` types instead of throwing exceptions in hot paths

### Type safety issues

- Use assertion functions (`assert`, `assertExists`) for runtime type checking
- Prefer branded types (like `IndexKey`) for values that shouldn't be mixed
- Use type guards (`isDefined`, `isNonNull`) before accessing potentially undefined values

### Cross-Platform issues

- Use provided `fetch` and `Image` exports instead of globals for Node.js compatibility
- Handle storage quota errors with try/catch around storage operations
- Use `safeParseUrl` instead of `new URL()` constructor for user input

## Version compatibility

The utils package maintains backward compatibility within major versions. When upgrading:

- Check for deprecated function warnings in TypeScript
- Review breaking changes in CHANGELOG.md
- Test thoroughly with your specific usage patterns
- Consider using the migration scripts provided for major version updates

## Key benefits

### Performance

- Optimized algorithms for common operations (O(n) where possible)
- Memory-efficient caching with automatic cleanup
- Non-blocking execution patterns with queuing
- Minimal object allocations in hot paths

### Reliability

- Comprehensive error handling with Result types
- Type-safe operations prevent runtime errors
- Defensive programming practices throughout
- Extensive test coverage (>95% line coverage)

### Developer experience

- Clear, descriptive function names following consistent patterns
- Comprehensive TypeScript types with proper generic constraints
- Well-documented public interfaces with usage examples
- Functional programming patterns that compose well

```

```


# ==========================================
# FILE: packages/validate/CONTEXT.md
# ==========================================

# Validate Package Context

## Overview

The `@tldraw/validate` package provides a comprehensive runtime validation system for TypeScript applications. It offers type-safe validation with performance optimizations, detailed error reporting, and composable validators for complex data structures.

## Architecture

### Core validation system

#### `Validator<T>` - base validator class

The foundation of the validation system:

```typescript
class Validator<T> implements Validatable<T> {
	validate(value: unknown): T
	validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T
	isValid(value: unknown): value is T
	nullable(): Validator<T | null>
	optional(): Validator<T | undefined>
	refine<U>(otherValidationFn: (value: T) => U): Validator<U>
	check(checkFn: (value: T) => void): Validator<T>
}
```

Key features:

- **Performance optimization**: `validateUsingKnownGoodVersion` avoids re-validating unchanged parts
- **Type safety**: Maintains TypeScript type information through validation
- **Composability**: Chain validators with `refine` and `check`
- **Nullability**: Easy nullable/optional variants

#### `ValidationError` - enhanced error reporting

Detailed error information with path tracking:

```typescript
class ValidationError extends Error {
  constructor(
    public readonly rawMessage: string,
    public readonly path: ReadonlyArray<number | string> = []
  )
}
```

Features:

- **Path tracking**: Shows exactly where in nested objects validation failed
- **Formatted messages**: Human-readable error descriptions
- **Stack trace integration**: Proper error reporting for debugging

### Primitive validators

#### Basic types

```typescript
// Core primitives
const string: Validator<string>
const number: Validator<number>      // finite, non-NaN
const boolean: Validator<boolean>
const bigint: Validator<bigint>
const unknown: Validator<unknown>    // accepts anything
const any: Validator<any>           // escape hatch

// Arrays
const array: Validator<unknown[]>
arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T>
```

#### Numeric validators

Specialized number validation:

```typescript
const positiveNumber: Validator<number> // > 0
const nonZeroNumber: Validator<number> // >= 0
const integer: Validator<number> // whole numbers
const positiveInteger: Validator<number> // positive integers
const nonZeroInteger: Validator<number> // non-negative integers
```

#### URL validators

Safe URL validation for different contexts:

```typescript
const linkUrl: Validator<string> // http/https/mailto URLs safe for links
const srcUrl: Validator<string> // http/https/data/asset URLs safe for resources
const httpUrl: Validator<string> // strict http/https only
```

#### Literal & enum validators

```typescript
literal<T>(expectedValue: T): Validator<T>
literalEnum<Values>(...values: Values): Validator<Values[number]>
setEnum<T>(values: ReadonlySet<T>): Validator<T>
```

### Complex validators

#### `ObjectValidator<Shape>` - object validation

Type-safe object structure validation:

```typescript
class ObjectValidator<Shape> extends Validator<Shape> {
	constructor(config: { [K in keyof Shape]: Validatable<Shape[K]> })

	allowUnknownProperties(): ObjectValidator<Shape>
	extend<Extension>(extension: Extension): ObjectValidator<Shape & Extension>
}

// Usage
const personValidator = object({
	name: string,
	age: positiveInteger,
	email: linkUrl.optional(),
})
```

Features:

- **Property validation**: Each property validated with its own validator
- **Unknown property handling**: Strict by default, configurable
- **Extension support**: Compose validators via extension
- **Performance**: Optimized validation using known good values

#### `ArrayOfValidator<T>` - array content validation

Validates array contents with additional constraints:

```typescript
class ArrayOfValidator<T> extends Validator<T[]> {
	constructor(itemValidator: Validatable<T>)

	nonEmpty(): ArrayOfValidator<T>
	lengthGreaterThan1(): ArrayOfValidator<T>
}

// Usage
const numbersValidator = arrayOf(number).nonEmpty()
```

#### `UnionValidator<Key, config>` - discriminated unions

Type-safe discriminated union validation:

```typescript
class UnionValidator<Key, Config> extends Validator<TypeOf<Config[keyof Config]>> {
	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown>
}

// Usage
const shapeValidator = union('type', {
	rectangle: object({ type: literal('rectangle'), width: number, height: number }),
	circle: object({ type: literal('circle'), radius: number }),
})
```

#### `DictValidator<Key, value>` - dictionary validation

Validates objects as key-value maps:

```typescript
class DictValidator<Key, Value> extends Validator<Record<Key, Value>> {
	constructor(keyValidator: Validatable<Key>, valueValidator: Validatable<Value>)
}

// Usage
const stringToNumberDict = dict(string, number)
const jsonDict = dict(string, jsonValue)
```

### Specialized validators

#### JSON Validation

Safe JSON value validation:

```typescript
const jsonValue: Validator<JsonValue>
jsonDict(): DictValidator<string, JsonValue>
```

Handles:

- Primitive JSON types (string, number, boolean, null)
- Nested arrays and objects
- Performance optimized for large JSON structures

#### Index key validation

Fractional indexing support:

```typescript
const indexKey: Validator<IndexKey>
```

Validates fractional indexing keys for ordering systems.

#### Model validation

Named entity validation with enhanced error reporting:

```typescript
model<T extends {readonly id: string}>(name: string, validator: Validatable<T>): Validator<T>
```

### Utility functions

#### Composition helpers

```typescript
// Union composition
or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2>

// Nullability
optional<T>(validator: Validatable<T>): Validator<T | undefined>
nullable<T>(validator: Validatable<T>): Validator<T | null>
```

## Performance optimizations

### Known good version validation

The `validateUsingKnownGoodVersion` method provides significant performance benefits:

- **Structural sharing**: Returns the previous value if validation passes and no changes detected
- **Partial validation**: Only validates changed parts of complex structures
- **Reference equality**: Uses `Object.is()` for quick equality checks
- **Early returns**: Avoids expensive validation when possible

### Efficient object processing

- **Property iteration**: Optimized loops for object validation
- **Error path building**: Lazy path construction for error reporting
- **Type guards**: Fast runtime type checking

## Error handling

### Detailed error messages

- **Type information**: Clear description of expected vs actual types
- **Path context**: Exact location of validation failure in nested structures
- **Custom messages**: Support for domain-specific error descriptions

### Error path formatting

```typescript
// Example error paths:
'At name: Expected string, got number'
"At users.0.email: Expected a valid url, got 'invalid-email'"
'At shape.(type = rectangle).width: Expected a positive number, got -5'
```

## Usage patterns

### Shape schema validation

Used extensively in tlschema package:

```typescript
export const imageShapeProps: RecordProps<TLImageShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
}
```

### API request validation

Safe handling of external data:

```typescript
const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

const validatedQuery = queryValidator.validate(request.query)
```

### Store migration validation

Ensures data integrity during schema migrations:

```typescript
const migrationValidator = T.object({
	fromVersion: T.positiveInteger,
	toVersion: T.positiveInteger,
	data: T.jsonValue,
})
```

## Design principles

### Type safety first

- **Compile-time**: Full TypeScript support with proper type inference
- **Runtime**: Guaranteed type safety after validation passes
- **Type preservation**: Validators maintain exact input types when possible

### Performance conscious

- **Minimal allocations**: Reuse objects when validation passes
- **Early exits**: Fast paths for common cases
- **Lazy evaluation**: Only compute expensive operations when needed

### Developer experience

- **Clear APIs**: Intuitive method names and composition patterns
- **Helpful errors**: Detailed error messages with context
- **Composability**: Easy to build complex validators from simple ones

### Security focused

- **Safe URLs**: Protocol validation prevents XSS and other attacks
- **Input sanitization**: Strict validation of external data
- **No unsafe operations**: All validators are pure functions

## Integration with tldraw

### Schema validation

Core integration with tlschema package for:

- Shape property validation
- Style property validation
- Record type validation
- Migration validation

### Store integration

Used in store package for:

- Record validation during creation/updates
- Migration step validation
- Query parameter validation

### Editor integration

Runtime validation in editor for:

- User input validation
- External content validation
- API response validation
- Configuration validation

## Key benefits

### Runtime safety

- Catch type errors at runtime before they cause issues
- Validate external data (API responses, user input, file contents)
- Ensure data integrity throughout the application

### Development productivity

- Clear error messages help debug validation issues quickly
- Type inference reduces boilerplate
- Composable design enables reusable validation logic

### Performance

- Optimized validation reduces unnecessary work
- Structural sharing preserves object references
- Early exits minimize computation cost


# ==========================================
# FILE: packages/worker-shared/CONTEXT.md
# ==========================================

# Worker-Shared Package Context

## Overview

The `@tldraw/worker-shared` package provides shared utilities for tldraw's worker services (bemo-worker, dotcom-worker, etc.). It includes request handling, asset management, bookmark processing, error monitoring, and environment utilities optimized for edge computing platforms like Cloudflare Workers.

## Architecture

### Request routing system (`handleRequest.ts`)

Type-safe HTTP request handling with validation:

#### Router creation

```typescript
import { Router, RouterType, IRequest, RequestHandler } from 'itty-router'

type ApiRoute<Env, Ctx> = (
	path: string,
	...handlers: RequestHandler<IRequest, [env: Env, ctx: Ctx]>[]
) => RouterType<IRequest, [env: Env, ctx: Ctx]>

function createRouter<Env extends SentryEnvironment, Ctx extends ExecutionContext>() {
	const router: ApiRouter<Env, Ctx> = Router()
	return router
}
```

#### Request handler

```typescript
async function handleApiRequest({
	router,
	request,
	env,
	ctx,
	after,
}: {
	router: ApiRouter<Env, Ctx>
	request: Request
	env: Env
	ctx: Ctx
	after(response: Response): Response | Promise<Response>
}) {
	try {
		response = await router.fetch(request, env, ctx)
	} catch (error: any) {
		if (error instanceof StatusError) {
			response = Response.json({ error: error.message }, { status: error.status })
		} else {
			response = Response.json({ error: 'Internal server error' }, { status: 500 })
			createSentry(ctx, env, request)?.captureException(error)
		}
	}

	return await after(response)
}
```

#### Input validation

Type-safe request parsing with validation:

```typescript
// Query parameter validation
function parseRequestQuery<Params>(request: IRequest, validator: T.Validator<Params>) {
	try {
		return validator.validate(request.query)
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Query parameters: ${err.message}`)
		}
		throw err
	}
}

// Request body validation
async function parseRequestBody<Body>(request: IRequest, validator: T.Validator<Body>) {
	try {
		return validator.validate(await request.json())
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Body: ${err.message}`)
		}
		throw err
	}
}
```

### Asset management (`userAssetUploads.ts`)

Cloudflare R2 integration for user-uploaded assets:

#### Asset upload

```typescript
async function handleUserAssetUpload({
	body,
	headers,
	bucket,
	objectName,
}: {
	objectName: string
	bucket: R2Bucket
	body: ReadableStream | null
	headers: Headers
}): Promise<Response> {
	// Prevent duplicate uploads
	if (await bucket.head(objectName)) {
		return Response.json({ error: 'Asset already exists' }, { status: 409 })
	}

	// Store in R2 with original metadata
	const object = await bucket.put(objectName, body, {
		httpMetadata: headers,
	})

	return Response.json(
		{ object: objectName },
		{
			headers: { etag: object.httpEtag },
		}
	)
}
```

#### Asset retrieval with caching

```typescript
async function handleUserAssetGet({
	request,
	bucket,
	objectName,
	context,
}: {
	request: IRequest
	bucket: R2Bucket
	objectName: string
	context: ExecutionContext
}): Promise<Response> {
	// Check Cloudflare cache first
	const cacheKey = new Request(request.url, { headers: request.headers })
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) return cachedResponse

	// Fetch from R2 with range/conditional support
	const object = await bucket.get(objectName, {
		range: request.headers, // Support Range requests
		onlyIf: request.headers, // Support If-None-Match, etc.
	})

	if (!object) return notFound()

	const headers = new Headers()
	object.writeHttpMetadata(headers)

	// Immutable asset caching (1 year)
	headers.set('cache-control', 'public, max-age=31536000, immutable')
	headers.set('etag', object.httpEtag)
	headers.set('access-control-allow-origin', '*')

	// Handle Range responses
	if (object.range) {
		const contentRange = calculateContentRange(object)
		headers.set('content-range', contentRange)
	}

	const status = object.body ? (object.range ? 206 : 200) : 304

	// Cache successful responses
	if (status === 200) {
		const [cacheBody, responseBody] = object.body!.tee()
		context.waitUntil(caches.default.put(cacheKey, new Response(cacheBody, { headers, status })))
		return new Response(responseBody, { headers, status })
	}

	return new Response(object.body, { headers, status })
}
```

### Bookmark processing (`bookmarks.ts`)

Web page metadata extraction with image optimization:

#### Metadata extraction

```typescript
import { unfurl } from 'cloudflare-workers-unfurl'

const queryValidator = T.object({
	url: T.httpUrl, // Validate URL format
})

async function handleExtractBookmarkMetadataRequest({
	request,
	uploadImage,
}: {
	request: IRequest
	uploadImage?: UploadImage
}) {
	const url = parseRequestQuery(request, queryValidator).url

	const metadataResult = await unfurl(url)

	if (!metadataResult.ok) {
		switch (metadataResult.error) {
			case 'bad-param':
				throw new StatusError(400, 'Bad URL')
			case 'failed-fetch':
				throw new StatusError(422, 'Failed to fetch URL')
		}
	}

	const metadata = metadataResult.value

	// Optionally save optimized images
	if (uploadImage) {
		const id = crypto.randomUUID()
		await Promise.all([
			trySaveImage('image', metadata, id, 600, uploadImage), // 600px preview
			trySaveImage('favicon', metadata, id, 64, uploadImage), // 64px favicon
		])
	}

	return Response.json(metadata)
}
```

#### Image optimization

```typescript
async function trySaveImage(
	key: 'image' | 'favicon',
	metadata: { [key]?: string },
	id: string,
	size: number,
	uploadImage: UploadImage
): Promise<void> {
	const initialUrl = metadata[key]
	if (!initialUrl) return

	try {
		// Cloudflare image optimization
		const imageResponse = await fetch(initialUrl, {
			cf: {
				image: {
					width: size,
					fit: 'scale-down',
					quality: 80,
				},
			},
		})

		if (!imageResponse.ok) throw new Error('Failed to fetch image')

		const contentType = imageResponse.headers.get('content-type')
		if (!contentType?.startsWith('image/')) {
			throw new Error('Not an image')
		}

		// Upload optimized image
		const objectName = `bookmark-${key}-${id}`
		metadata[key] = await uploadImage(imageResponse.headers, imageResponse.body, objectName)
	} catch (error) {
		console.error(`Error saving ${key}:`, error)
		// Graceful degradation - keep original URL
	}
}
```

### Error monitoring (`sentry.ts`)

Sentry integration for production error tracking:

#### Sentry configuration

```typescript
import { Toucan } from 'toucan-js'

interface SentryEnvironment {
	readonly SENTRY_DSN?: string
	readonly TLDRAW_ENV?: string
	readonly WORKER_NAME?: string
	readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}

function createSentry(ctx: Context, env: SentryEnvironment, request?: Request) {
	// Skip Sentry in development
	if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
		return null
	}

	const { SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA } = requiredEnv(env, {
		SENTRY_DSN: true,
		WORKER_NAME: true,
		CF_VERSION_METADATA: true,
	})

	return new Toucan({
		dsn: SENTRY_DSN,
		release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`, // Worker version tracking
		environment: WORKER_NAME,
		context: ctx,
		request,
		requestDataOptions: {
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		},
	})
}
```

### Environment management (`env.ts`)

Type-safe environment variable handling:

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}

// Usage example
const { SENTRY_DSN, API_KEY } = requiredEnv(env, {
	SENTRY_DSN: true,
	API_KEY: true,
})
// TypeScript guarantees these are non-null
```

### HTTP error utilities (`errors.ts`)

Standard HTTP error responses:

```typescript
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Key features

### Asset pipeline

**R2 integration**: Cloudflare R2 object storage for user assets
**Caching strategy**: Multi-layer caching with Cloudflare Cache API
**Range requests**: Support for partial content delivery
**Immutable assets**: Long-term caching for uploaded content

### Bookmark system

**Metadata extraction**: Rich preview data from web pages
**Image optimization**: Automatic image resizing and quality optimization
**Fallback handling**: Graceful degradation when image processing fails
**Multi-size support**: Different image sizes for different use cases

### Error handling

**Structured errors**: Consistent error response format
**Monitoring integration**: Automatic error reporting to Sentry
**Graceful degradation**: Fallback behavior for non-critical failures
**Development safety**: Sentry disabled in development mode

### Performance

**Edge computing**: Optimized for Cloudflare Workers runtime
**Streaming support**: Efficient handling of large uploads/downloads
**Cache integration**: Leverages Cloudflare's global cache network
**Minimal dependencies**: Lightweight for fast cold starts

## Integration patterns

### Basic worker setup

```typescript
import {
	createRouter,
	handleApiRequest,
	createSentry,
	handleUserAssetUpload,
	handleExtractBookmarkMetadataRequest,
} from '@tldraw/worker-shared'

const router = createRouter<Env, ExecutionContext>()

router.post('/api/uploads/:objectName', async (request, env, ctx) => {
	return handleUserAssetUpload({
		objectName: request.params.objectName,
		bucket: env.UPLOADS_BUCKET,
		body: request.body,
		headers: request.headers,
	})
})

router.get('/api/bookmark', async (request, env, ctx) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			await handleUserAssetUpload({ objectName, bucket: env.ASSETS_BUCKET, body, headers })
			return `https://assets.tldraw.com/${objectName}`
		},
	})
})

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return handleApiRequest({
			router,
			request,
			env,
			ctx,
			after: (response) => {
				// Add CORS headers, rate limiting, etc.
				response.headers.set('access-control-allow-origin', '*')
				return response
			},
		})
	},
}
```

### Asset upload flow

```typescript
// 1. Client uploads asset
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/uploads/asset-uuid', {
	method: 'POST',
	body: formData,
})

// 2. Worker processes upload
const { object } = await response.json()
// object === 'asset-uuid'

// 3. Client references asset
const assetUrl = `https://assets.tldraw.com/${object}`
```

### Bookmark processing flow

```typescript
// 1. Client requests bookmark metadata
const response = await fetch(`/api/bookmark?url=${encodeURIComponent(pageUrl)}`)

// 2. Worker extracts metadata
const metadata = await unfurl(url) // Title, description, image, favicon

// 3. Worker optimizes images
await Promise.all([
	trySaveImage('image', metadata, id, 600, uploadImage), // Preview image
	trySaveImage('favicon', metadata, id, 64, uploadImage), // Icon
])

// 4. Client receives processed metadata
const { title, description, image, favicon } = await response.json()
```

## Cloudflare workers integration

### R2 storage integration

```typescript
interface Env {
	UPLOADS_BUCKET: R2Bucket
	ASSETS_BUCKET: R2Bucket
}

// Upload to R2
await bucket.put(objectName, body, {
	httpMetadata: headers, // Preserve original headers
})

// Retrieve from R2 with caching
const object = await bucket.get(objectName, {
	range: request.headers, // Support Range requests
	onlyIf: request.headers, // Support conditional requests
})
```

### Image optimization

```typescript
// Cloudflare Image Resizing
const imageResponse = await fetch(imageUrl, {
	cf: {
		image: {
			width: 600,
			fit: 'scale-down',
			quality: 80,
		},
	},
})
```

### Cache API integration

```typescript
// Leverage Cloudflare's global cache
const cacheKey = new Request(request.url, { headers: request.headers })
const cachedResponse = await caches.default.match(cacheKey)

if (cachedResponse) return cachedResponse

// ... generate response

// Cache for future requests
context.waitUntil(caches.default.put(cacheKey, response.clone()))
```

## Environment management

### Type-safe environment variables

```typescript
interface WorkerEnv {
	SENTRY_DSN?: string
	TLDRAW_ENV?: string
	WORKER_NAME?: string
	CF_VERSION_METADATA?: WorkerVersionMetadata
	API_BUCKET?: R2Bucket
}

// Validate required environment variables
const { SENTRY_DSN, WORKER_NAME } = requiredEnv(env, {
	SENTRY_DSN: true,
	WORKER_NAME: true,
})
// TypeScript guarantees these are defined
```

### Environment validation

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}
```

## Error handling system

### Standard HTTP errors

```typescript
// Common error responses
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}

// Validation errors
throw new StatusError(400, `Query parameters: ${validationMessage}`)
```

### Monitoring integration

```typescript
// Automatic error reporting
try {
	// ... worker logic
} catch (error) {
	createSentry(ctx, env, request)?.captureException(error)
	return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Development vs production

```typescript
// Sentry only in production
if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
	return null // No Sentry in dev
}

// Production error tracking
const sentry = new Toucan({
	dsn: SENTRY_DSN,
	release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`,
	environment: WORKER_NAME,
})
```

## Performance optimizations

### Edge computing

- **Global distribution**: Workers run at Cloudflare edge locations
- **Low latency**: Processing close to users
- **Automatic scaling**: Handles traffic spikes automatically
- **Zero cold starts**: V8 isolates for instant execution

### Caching strategy

- **Multi-layer caching**: Browser cache + CDN cache + worker cache
- **Immutable assets**: Assets cached for 1 year
- **Cache invalidation**: ETags for conditional requests
- **Range support**: Efficient partial content delivery

### Resource efficiency

- **Streaming**: Support for large file uploads/downloads
- **Memory management**: Efficient handling of binary data
- **Connection pooling**: Reuse connections for external requests
- **Background tasks**: Non-blocking asset processing

## Security considerations

### Input validation

- **URL validation**: Ensure valid HTTP/HTTPS URLs for bookmarks
- **File type validation**: Verify content types for uploads
- **Size limits**: Prevent abuse with file size restrictions
- **Path sanitization**: Secure object naming patterns

### Access control

- **CORS configuration**: Controlled cross-origin access
- **Authentication**: Integration with auth systems
- **Rate limiting**: Prevent API abuse
- **Error information**: Careful error message disclosure

### Content safety

- **Image processing**: Automatic optimization prevents malicious images
- **Metadata scrubbing**: Remove sensitive information from extracted data
- **Sandbox execution**: Workers isolated from sensitive systems
- **Monitoring**: Comprehensive error and security event tracking

## Deployment architecture

### Worker distribution

```
Edge Locations (Global)
├── bemo-worker          # Multiplayer sync worker
├── dotcom-worker        # Main app API worker
├── assets-worker        # Asset serving worker
└── bookmark-worker      # Bookmark processing worker
    └── worker-shared/   # Shared utilities (this package)
```

### Service integration

- **R2 Storage**: Asset persistence and delivery
- **Cache API**: Performance optimization
- **Analytics**: Request and error monitoring
- **CDN**: Global content delivery network

## Key benefits

### Development experience

- **Type safety**: Full TypeScript support for worker development
- **Reusable patterns**: Common worker utilities abstracted
- **Error handling**: Comprehensive error management system
- **Testing support**: Jest configuration for worker code

### Operations

- **Monitoring**: Automatic error reporting and analytics
- **Performance**: Edge computing with global distribution
- **Reliability**: Graceful error handling and fallbacks
- **Scaling**: Automatic traffic handling and resource management

### Maintenance

- **Shared code**: Consistent patterns across all workers
- **Environment management**: Type-safe configuration handling
- **Dependency management**: Minimal, focused dependencies
- **Deployment**: Streamlined worker deployment workflows


# ==========================================
# FILE: templates/branching-chat/CONTEXT.md
# ==========================================

# Branching Chat Template

This template demonstrates a branching conversational UI built on tldraw, showcasing how to create interactive node-based chat interfaces that can branch and merge conversation flows.

## Overview

The branching chat template is a full-stack application that combines tldraw's infinite canvas with AI chat capabilities, allowing users to create visual conversation trees with branching dialogue paths.

### Key features

- **Visual conversation flow**: Create branching conversation trees on an infinite canvas
- **AI integration**: Stream responses from AI models (OpenAI/compatible APIs)
- **Node-based UI**: Custom node shapes representing chat messages
- **Connection system**: Visual connections between conversation nodes
- **Real-time updates**: Streaming AI responses with live updates
- **Cloudflare Workers**: Backend powered by Cloudflare Workers and Durable Objects

## Architecture

### Frontend (`/client`)

**Core app structure**

- `App.tsx` - Main application component with tldraw configuration
- Custom shape utilities: `NodeShapeUtil`, `ConnectionShapeUtil`
- Custom binding utilities: `ConnectionBindingUtil`
- Workflow-specific toolbar and UI components

**Node system** (`/client/nodes`)

- `NodeShapeUtil.tsx` - Defines how chat nodes render and behave
- `nodeTypes.tsx` - Type definitions and node management utilities
- `types/MessageNode.tsx` - Message node implementation with AI streaming
- `nodePorts.tsx` - Connection port system for linking nodes

**Connection system** (`/client/connection`)

- `ConnectionShapeUtil.tsx` - Visual connections between nodes
- `ConnectionBindingUtil.tsx` - Binding logic for node relationships
- `keepConnectionsAtBottom.tsx` - Z-index management for connections

**Ports system** (`/client/ports`)

- `Port.tsx` - Port definitions and utilities
- `PointingPort.tsx` - Interactive port pointing tool

**UI components** (`/client/components`)

- `WorkflowToolbar.tsx` - Custom toolbar with node creation tools
- Custom icons and UI elements

### Backend (`/worker`)

**Cloudflare Workers architecture**

- `worker.ts` - Main worker entry point with routing
- `do.ts` - Durable Object for stateful operations
- `routes/` - API route handlers
- `types.ts` - Shared type definitions

**Key endpoints**

- `/stream` - POST endpoint for AI chat streaming
- Handles conversation context from connected nodes
- Streams AI responses back to frontend

## Key concepts

### Node types

**MessageNode**

- Represents a single message in the conversation
- Contains user input and AI assistant response
- Supports streaming updates for AI responses
- Dynamic sizing based on content length

### Connection flow

1. **Node creation**: Users create message nodes via toolbar
2. **Connection**: Nodes connect via ports to establish conversation flow
3. **Context building**: When sending a message, system traces back through connected nodes to build conversation history
4. **AI processing**: Complete conversation context sent to AI endpoint
5. **Streaming response**: AI response streamed back and displayed in real-time

### Port system

- **Input ports**: Allow incoming connections from previous conversation steps
- **Output ports**: Allow outgoing connections to next conversation steps
- **Dynamic positioning**: Ports adjust position based on node content size

## Development setup

### Environment variables

Required in `.env` or `.dev.vars`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local development

```bash
yarn dev    # Start development server
```

Serves the application at `http://localhost:5173/`

### Cloudflare Workers

The template uses Cloudflare Workers for the backend:

- `wrangler.toml` - Worker configuration
- Durable Objects for state management
- Edge runtime for global performance

## Customization points

### Adding new node types

1. Create new node definition in `/client/nodes/types/`
2. Add to `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, `computeOutput`

### Custom AI integration

- Modify `/worker/routes/` to change AI provider
- Uses Vercel AI SDK - supports multiple providers
- Streaming implementation in `MessageNode.tsx`

### UI customization

- Override tldraw components via `components` prop
- Custom toolbar in `WorkflowToolbar.tsx`
- Styling in `index.css`

## Integration with tldraw

### Custom shape system

- Extends tldraw's shape system with `NodeShapeUtil`
- Custom geometry, rendering, and interaction handling
- Maintains tldraw's reactive state management

### Custom tools

- `PointingPort` tool for creating connections
- Integrated into tldraw's select tool state machine
- Drag-and-drop node creation from toolbar

### Binding system

- `ConnectionBindingUtil` manages relationships between nodes
- Automatic cleanup when nodes are deleted
- Visual feedback for connections

## Technical details

### State management

- Uses tldraw's reactive signals for state
- Node data stored in tldraw's document model
- Automatic persistence via tldraw's persistence system

### Performance optimizations

- Connection shapes kept at bottom layer
- Transparency disabled for workflow shapes
- Efficient text measurement for dynamic sizing
- Streaming responses prevent UI blocking

### Deployment

Ready for deployment to Cloudflare Workers:

```bash
yarn build    # Build frontend
wrangler deploy    # Deploy to Cloudflare
```

## File structure

```
/templates/branching-chat/
├── client/                 # Frontend React application
│   ├── App.tsx            # Main app component
│   ├── components/        # UI components
│   ├── connection/        # Connection system
│   ├── nodes/             # Node system
│   ├── ports/             # Port system
│   └── main.tsx          # App entry point
├── worker/                # Cloudflare Worker backend
│   ├── worker.ts         # Worker entry point
│   ├── do.ts             # Durable Object
│   └── routes/           # API routes
├── public/               # Static assets
├── package.json          # Dependencies
├── wrangler.toml         # Worker config
└── vite.config.ts        # Build config
```

This template demonstrates advanced tldraw concepts including custom shapes, tools, bindings, and full-stack integration with modern web technologies.


# ==========================================
# FILE: templates/workflow/CONTEXT.md
# ==========================================

# Workflow Template Context

## Overview

This is a starter template for building workflow/flowchart applications using tldraw. It demonstrates how to create a node-based visual programming interface where users can connect functional nodes to create executable workflows.

## Key concepts

### Nodes

- **NodeShapeUtil** (`src/nodes/NodeShapeUtil.tsx`): Custom tldraw shape representing workflow nodes
- **Node types** (`src/nodes/types/`): Different node implementations including:
  - `AddNode`, `SubtractNode`, `MultiplyNode`, `DivideNode`: Mathematical operations
  - `SliderNode`: Input node with slider control
  - `ConditionalNode`: Conditional logic node
- **Node ports** (`src/nodes/nodePorts.tsx`): Helper functions for managing input/output ports on nodes

### Connections

- **ConnectionShapeUtil** (`src/connection/ConnectionShapeUtil.tsx`): Custom shape for connecting nodes
- **ConnectionBindingUtil** (`src/connection/ConnectionBindingUtil.tsx`): Manages relationships between connected nodes
- **Connection management**: Utilities for inserting nodes within connections and maintaining visual hierarchy

### Ports

- **Port system** (`src/ports/Port.tsx`): Defines input/output connection points on nodes
- **PointingPort** (`src/ports/PointingPort.tsx`): Custom interaction state for port-specific behaviors

### Execution system

- **ExecutionGraph** (`src/execution/ExecutionGraph.tsx`): Handles asynchronous execution of workflow graphs
- **Real-time updates**: Nodes update instantly to show results
- **Async execution**: Demonstrates how workflows might execute against real services

## Key features

### Interactive behaviors

- Click output ports to create new connected nodes
- Drag from ports to create connections
- Insert nodes by clicking connection midpoints
- Reconnect or disconnect existing connections
- Visual workflow regions with execution controls

### Custom UI components

- **WorkflowToolbar** (`src/components/WorkflowToolbar.tsx`): Vertical toolbar with workflow-specific tools
- **OnCanvasComponentPicker** (`src/components/OnCanvasComponentPicker.tsx`): Node selection interface
- **WorkflowRegions** (`src/components/WorkflowRegions.tsx`): Visual grouping of connected nodes with play buttons

## Architecture patterns

### Extending tldraw

- **Custom shapes**: `NodeShapeUtil` and `ConnectionShapeUtil` extend tldraw's shape system
- **Custom bindings**: `ConnectionBindingUtil` manages node-to-node relationships
- **Tool extensions**: `PointingPort` extends the select tool with port-specific interactions
- **UI customization**: Complete replacement of toolbar and addition of canvas overlays

### State management

- Uses tldraw's reactive state system for shape data
- Node values flow through connections using port system
- Execution state managed separately for workflow running

### Event handling

- **Port interactions**: Custom pointer events for creating connections and nodes
- **Connection management**: Automatic connection rerouting and cleanup
- **Z-order management**: Connections automatically stay below nodes

## Development patterns

### Creating new node types

1. Extend base node interface in `src/nodes/types/shared.tsx`
2. Implement node component with ports configuration
3. Add to `nodeTypes` registry in `src/nodes/nodeTypes.tsx`
4. Update toolbar in `src/components/WorkflowToolbar.tsx`

### Custom interactions

- Extend `PointingPort` state node for new port behaviors
- Use tldraw's event system for custom shape interactions
- Leverage binding system for automatic relationship management

## File structure

```
src/
├── App.tsx                 # Main app with tldraw customizations
├── main.tsx               # React entry point
├── nodes/                 # Node system
│   ├── NodeShapeUtil.tsx  # Core node shape implementation
│   ├── nodePorts.tsx      # Port management utilities
│   ├── nodeTypes.tsx      # Node type registry
│   └── types/             # Individual node implementations
├── connection/            # Connection system
│   ├── ConnectionShapeUtil.tsx     # Connection shape
│   ├── ConnectionBindingUtil.tsx   # Connection relationships
│   └── [other connection utils]
├── ports/                 # Port interaction system
├── execution/             # Workflow execution engine
└── components/            # UI components
    ├── WorkflowToolbar.tsx
    ├── OnCanvasComponentPicker.tsx
    └── WorkflowRegions.tsx
```

## Usage

Run with `yarn dev` to start development server. The template showcases:

- Creating and connecting nodes
- Real-time value propagation
- Workflow execution simulation
- Custom tldraw UI integration

This template serves as a foundation for building more complex workflow applications, visual programming tools, or node-based editors.


# ==================
# FILE: CONTEXT.md
# ==================

# CONTEXT.md - tldraw monorepo

This file provides comprehensive context for understanding the tldraw monorepo, an infinite canvas SDK for React applications and the infrastructure behind tldraw.com.

## Repository overview

This is a TypeScript monorepo containing the complete tldraw ecosystem - from the core infinite canvas SDK to the collaborative whiteboard application tldraw.com. It's organized using Yarn Berry workspaces and built with a custom incremental build system called LazyRepo.

**Repository purpose:** Develop and maintain tldraw as both an open-source SDK for developers and a commercial collaborative whiteboard service.

**Version:** 3.15.1 across all packages  
**Node.js:** ^20.0.0 required  
**React:** ^18.0.0 || ^19.0.0 peer dependency

## Essential commands

### Development commands

- `yarn dev` - Start development server for examples app (main SDK showcase)
- `yarn dev-app` - Start tldraw.com client app development
- `yarn dev-docs` - Start documentation site development (tldraw.dev)
- `yarn dev-vscode` - Start VSCode extension development
- `yarn dev-template <template>` - Run a specific template (e.g., vite, nextjs, workflow)
- `yarn refresh-assets` - Refresh and bundle assets after changes
- `yarn refresh-context` - Review and update CONTEXT.md files using Claude Code CLI
- `yarn context` - Find and display nearest CONTEXT.md file (supports -v, -r, -u flags)

### Building

- `yarn build` - Build all packages using LazyRepo (incremental build system)
- `yarn build-package` - Build all SDK packages only
- `yarn build-app` - Build tldraw.com client app
- `yarn build-docs` - Build documentation site

### Testing

- `yarn test run` - Run tests in specific workspace (cd to workspace first)
- `yarn test run --grep "pattern"` - Filter tests by pattern
- `yarn vitest` - Run all tests (slow, avoid unless necessary)
- `yarn test-ci` - Run tests in CI mode
- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-dotcom` - Run end-to-end tests for tldraw.com
- `yarn e2e-ui` - Run E2E tests with Playwright UI

### Code quality

- `yarn lint` - Lint all packages
- `yarn typecheck` - Type check all packages (run before commits)
- `yarn format` - Format code with Prettier
- `yarn api-check` - Validate public API consistency

## High-level architecture

### Monorepo structure

**Packages (`packages/`)** - Core SDK and libraries:

- `@tldraw/editor` - Foundational canvas editor engine without shapes or UI
- `@tldraw/tldraw` - Complete "batteries included" SDK with UI, shapes, and tools
- `@tldraw/store` - Reactive client-side database built on signals
- `@tldraw/state` - Fine-grained reactive state management (signals system)
- `@tldraw/tlschema` - Type definitions, validators, and migrations
- `@tldraw/sync` + `@tldraw/sync-core` - Multiplayer collaboration system
- `@tldraw/utils` - Shared utilities across packages
- `@tldraw/validate` - Lightweight validation library
- `@tldraw/create-tldraw` - npm create tldraw CLI tool
- `@tldraw/dotcom-shared` - Shared utilities for dotcom application
- `@tldraw/namespaced-tldraw` - Namespaced tldraw components
- `@tldraw/state-react` - React integration for state management
- `@tldraw/worker-shared` - Shared utilities for Cloudflare Workers

**Applications (`apps/`)** - Production applications and examples:

- `apps/examples/` - SDK examples and demos (primary development environment, 130+ examples)
- `apps/docs/` - Documentation website (tldraw.dev) built with Next.js
- `apps/dotcom/client/` - tldraw.com React frontend application with auth, file management
- `apps/dotcom/sync-worker/` - Cloudflare Worker handling multiplayer backend and real-time sync
- `apps/dotcom/asset-upload-worker/` - Cloudflare Worker for media uploads to R2
- `apps/dotcom/image-resize-worker/` - Cloudflare Worker for image optimization
- `apps/dotcom/zero-cache/` - Database synchronization layer using Rocicorp Zero
- `apps/vscode/` - tldraw VSCode extension for .tldr files
- `apps/analytics/` - Analytics service (UMD library for cookie consent and tracking)
- `apps/bemo-worker/` - Bemo worker service for collaboration and asset management

**Templates (`templates/`)** - Framework starter templates:

- `vite/` - Vite integration example (fastest way to get started)
- `nextjs/` - Next.js integration example with SSR support
- `vue/` - Vue integration example
- `sync-cloudflare/` - Multiplayer implementation with Cloudflare Durable Objects
- `ai/` - AI integration example
- `branching-chat/` - AI-powered conversational UI with node-based chat trees
- `workflow/` - Node-based visual programming interface for executable workflows
- `chat/`, `agent/`, `simple-server-example/` - Additional use case examples

### Core SDK architecture

**Three-layer system:**

1. **@tldraw/editor** - Pure canvas engine
   - No shapes, tools, or UI - just the reactive editor foundation
   - Shape system via ShapeUtil classes, Tools via StateNode state machines
   - Bindings system for relationships between shapes
   - Uses @tldraw/state for reactive state management

2. **@tldraw/tldraw** - Complete SDK
   - Wraps editor with full UI system, shape implementations, and tools
   - Default shapes: text, draw, geo, arrow, note, line, frame, highlight, etc.
   - Complete tool set: select, hand, eraser, laser, zoom + shape creation tools
   - Responsive UI with mobile/desktop adaptations

3. **@tldraw/store** - Reactive data layer
   - Type-safe record storage with automatic validation
   - Change history and undo/redo support
   - IndexedDB persistence and migration system
   - Built on @tldraw/state reactive signals

### Reactive state management

**@tldraw/state - Signals architecture:**

- Fine-grained reactivity similar to MobX or SolidJS
- `Atom<T>` for mutable state, `Computed<T>` for derived values
- Automatic dependency tracking during computation
- Efficient updates with minimal re-computation
- Memory-optimized with `ArraySet` and cleanup systems

**Pattern throughout codebase:**

- All editor state is reactive and observable
- Components automatically re-render when dependencies change
- Store changes trigger reactive updates across the system
- Batched updates prevent cascading re-computations

### Shape and tool system

**Shape architecture:**

- Each shape type has a `ShapeUtil` class defining behavior
- ShapeUtil handles geometry calculation, rendering, hit testing, interactions
- Extensible system - custom shapes via new ShapeUtil implementations
- Shape definitions in `@tldraw/tlschema` with validators and migrations

**Tool state machines:**

- Tools implemented as `StateNode` hierarchies with parent/child states
- Event-driven architecture (pointer, keyboard, tick events)
- Complex tools like SelectTool have multiple child states (Brushing, Translating, etc.)
- State machines handle tool lifecycle and user interactions

**Bindings system:**

- Relationships between shapes (arrows connecting to shapes, etc.)
- `BindingUtil` classes define binding behavior and visual indicators
- Automatic updates when connected shapes change position/properties

## Testing patterns

### Vitest tests

**Unit tests:**

- Test files named `*.test.ts` alongside source files (e.g., `LicenseManager.test.ts`)
- Integration tests use `src/test/feature-name.test.ts` format
- Test in tldraw workspace if you need default shapes/tools

**Running tests:**

- Run from specific workspace directory: `cd packages/editor && yarn test run`
- Filter with additional args: `yarn test run --grep "selection"`
- Avoid root-level `yarn test` (slow and hard to filter)

### Playwright E2E tests

- Located in `apps/examples/e2e/` and `apps/dotcom/client/e2e/`
- Use `yarn e2e` and `yarn e2e-dotcom` commands
- Comprehensive UI interaction testing

## Development workspace structure

```
apps/
├── examples/          # SDK examples and demos (primary development environment)
├── docs/             # Documentation site (tldraw.dev) built with Next.js + SQLite + Algolia
├── dotcom/           # tldraw.com application stack
│   ├── client/       # Frontend React app with Clerk auth
│   ├── sync-worker/  # Cloudflare Worker for multiplayer backend + file management
│   ├── asset-upload-worker/  # Cloudflare Worker for media uploads to R2
│   ├── image-resize-worker/  # Cloudflare Worker for image optimization + format conversion
│   └── zero-cache/   # Future database synchronization layer (Rocicorp Zero + PostgreSQL)
├── vscode/           # tldraw VSCode extension (.tldr file support)
├── analytics/        # Analytics service (UMD library with GDPR compliance)
└── bemo-worker/      # Bemo worker service (collaboration + asset management)

packages/
├── editor/           # Core editor engine (foundational canvas editor)
├── tldraw/           # Complete SDK with UI ("batteries included")
├── store/            # Reactive client-side database built on signals
├── tlschema/         # Type definitions, validators, and migrations
├── state/            # Fine-grained reactive state management (signals system)
├── sync/             # Multiplayer collaboration system
├── sync-core/        # Core multiplayer functionality
├── utils/            # Shared utilities across packages
├── validate/         # Lightweight validation library
├── assets/           # Icons, fonts, translations (managed centrally)
├── create-tldraw/    # npm create tldraw CLI tool
├── dotcom-shared/    # Shared utilities for dotcom application
├── namespaced-tldraw/ # Namespaced tldraw components
├── state-react/      # React integration for state management
└── worker-shared/    # Shared utilities for Cloudflare Workers

templates/            # Starter templates for different frameworks
├── vite/            # Vite integration example (fastest way to start)
├── nextjs/          # Next.js integration example with SSR
├── vue/             # Vue integration example
├── sync-cloudflare/ # Multiplayer implementation with Cloudflare Durable Objects
├── ai/              # AI integration example
├── branching-chat/  # AI-powered conversational UI with node-based chat trees
├── workflow/        # Node-based visual programming interface for workflows
├── chat/            # Chat template
├── agent/           # Agent template
└── simple-server-example/ # Simple server example

internal/             # Internal development tools and configuration
├── apps-script/     # Google Apps Script configuration for Meet integration
├── config/          # Shared TypeScript, API, and test configurations
├── dev-tools/       # Git bisect helper tool for debugging
├── health-worker/   # Updown.io webhook → Discord alert forwarding
└── scripts/         # Build, deployment, and maintenance automation
```

## Development infrastructure

### Build system (LazyRepo)

Custom incremental build system optimized for monorepos:

- Builds only packages that changed based on file inputs/outputs
- Automatic dependency resolution between workspaces
- Intelligent caching with cache invalidation
- Parallel execution where dependencies allow
- Configuration in `lazy.config.ts`

### Package management

**Yarn Berry (v4) with workspaces:**

- Workspace dependencies automatically linked
- Package manager enforced via `packageManager` field
- Efficient disk usage with Plug'n'Play
- Lock file and cache committed to repository

### Code quality

**TypeScript configuration:**

- Workspace references for incremental compilation
- API surface validation with Microsoft API Extractor
- Strict type checking across all packages
- Generated API documentation from TSDoc comments

**Linting and formatting:**

- ESLint with custom configuration in `eslint.config.mjs`
- Prettier for consistent code formatting
- Pre-commit hooks via Husky ensuring quality

## Key development notes

### TypeScript workflow

- Uses workspace references for fast incremental compilation
- Run `yarn typecheck` before commits (critical for API consistency)
- API surface validated with Microsoft API Extractor
- Strict type checking across all packages

### Monorepo management

- Yarn workspaces with berry (yarn 4.x) - use `yarn` not `npm`
- Package manager enforced via `packageManager` field in package.json
- Dependencies managed at workspace level where possible
- Efficient disk usage with Plug'n'Play system

### Asset management workflow

- Icons, fonts, translations stored in `/assets` directory
- Run `yarn refresh-assets` after making asset changes
- Assets automatically bundled into packages during build process
- Shared across packages and applications with optimization

### Primary development environment

- Main development happens in `apps/examples` - the SDK showcase
- Examples demonstrate SDK capabilities and serve as development testbed
- See `apps/examples/writing-examples.md` for example guidelines
- Use examples app to test SDK changes in real scenarios

## Asset and content management

### Asset pipeline

**Static assets (`/assets`):**

- Automatic optimization and format conversion
- Deduplication and efficient bundling

**Dynamic assets:**

- Image/video upload handling in Cloudflare Workers
- Asset validation, resizing, and optimization
- Hash-based deduplication and caching
- Support for various formats and size constraints

### External content integration

**Rich content handling:**

- Bookmark creation with metadata extraction
- Embed system for YouTube, Figma, Excalidraw, etc.
- SVG import with size calculation and optimization
- Copy/paste between tldraw instances with format preservation

## Collaboration and sync

### Multiplayer architecture

**@tldraw/sync system:**

- WebSocket-based real-time collaboration
- Conflict-free updates with operational transformation
- Presence awareness (cursors, selections) separate from document state
- Cloudflare Durable Objects for scalable backend

**Data synchronization:**

- Document state synced via structured diffs
- Presence state (cursors, etc.) synced but not persisted
- Connection state management with reconnection logic
- See `templates/sync-cloudflare` for implementation patterns

### tldraw.com infrastructure

**Production application stack:**

- **Frontend**: React SPA with Vite, Clerk auth, React Router, FormatJS i18n
- **Real-time Sync**: Cloudflare Workers + Durable Objects for multiplayer collaboration
- **Database**: PostgreSQL with Zero (Rocicorp) for optimistic client-server sync
- **Asset Pipeline**: R2 storage + image optimization + CDN delivery
- **Authentication**: Clerk integration with JWT-based API access
- **File Management**: Complete file system with sharing, publishing, version history

## Development patterns

### Creating custom components

**Custom shapes:**

1. Define shape type in schema with validator
2. Create `ShapeUtil` class extending base ShapeUtil
3. Implement required methods (getGeometry, component, indicator)
4. Register in editor via `shapeUtils` prop
5. Implement creation tool if needed

**Custom tools:**

1. Create `StateNode` class with tool logic
2. Define state machine with onEnter/onExit/event handlers (onPointerDown, etc.)
3. Handle state transitions and editor updates
4. Register in editor via `tools` prop

### UI customization

**Component override system:**

- Every tldraw UI component can be replaced/customized
- Pass custom implementations via `components` prop
- Maintains responsive behavior and accessibility
- See existing components for architectural patterns

### Integration patterns

**Embedding in applications:**

- Import required CSS: `import 'tldraw/tldraw.css'` (full) or `import '@tldraw/editor/editor.css'` (editor only)
- Requires React 18+ and modern bundler support
- Works with Vite, Next.js, Create React App, and other React frameworks
- See templates directory for framework-specific examples
- Asset URLs configurable via `@tldraw/assets` package (imports, URLs, or self-hosted strategies)
- Use `npm create tldraw` CLI for quick project scaffolding

## Performance considerations

### Rendering optimization

**Canvas performance:**

- WebGL-accelerated minimap rendering
- Viewport culling - only visible shapes rendered
- Shape geometry caching with invalidation
- Efficient hit testing and bounds calculation

**Reactive system optimization:**

- Signals minimize unnecessary re-renders via precise dependency tracking
- Computed values cached until dependencies change
- Store changes batched to prevent cascading updates
- Component re-renders minimized through React.memo and signal integration
- Uses `__unsafe__getWithoutCapture()` for performance-critical paths

### Memory management

**Efficient resource usage:**

- Automatic cleanup of event listeners and signal dependencies
- Asset deduplication reduces memory footprint
- Store history pruning prevents unbounded growth
- Shape utility garbage collection when unused

## Licensing and business model

**SDK licensing:**

- Open source with "Made with tldraw" watermark by default
- Business license available for watermark removal
- Separate commercial terms for tldraw.com service

**Development philosophy:**

- SDK-first development - tldraw.com built using the same APIs
- Extensive examples and documentation for SDK adoption
- Community-driven with transparent development process

## Advanced features and integrations

### Asset management

**Centralized assets (`@tldraw/assets`):**

- **Icon system**: 80+ icons in optimized SVG sprite format
- **Typography**: IBM Plex fonts (Sans, Serif, Mono) + Shantell Sans (handwritten)
- **Internationalization**: 40+ languages with regional variants (RTL support)
- **Embed icons**: Service icons for external content (YouTube, Figma, etc.)
- **Export strategies**: Multiple formats (imports, URLs, self-hosted) for different bundlers

**Dynamic asset pipeline:**

- **Upload workers**: Cloudflare R2 + image optimization + format conversion (AVIF/WebP)
- **CDN delivery**: Global asset distribution with intelligent caching
- **External content**: Bookmark unfurling, embed metadata extraction
- **Deduplication**: Hash-based asset deduplication across uploads

### Collaboration features

**Real-time multiplayer:**

- **Presence system**: Live cursors, selections, and user awareness indicators
- **Conflict resolution**: Operational transformation for concurrent edits
- **Connection reliability**: Automatic reconnection with exponential backoff
- **Permission management**: File-level access control (view/edit/owner)

**Data synchronization:**

- **Optimistic updates**: Immediate UI feedback with server reconciliation
- **Offline support**: Queue changes during network issues, sync on reconnect
- **Version control**: Complete change history with restore capability
- **Schema migration**: Automatic data migration for schema evolution

### Extension and customization

**Developer tools:**

- **CLI scaffolding**: `npm create tldraw` with interactive template selection
- **VSCode integration**: Full editor for .tldr files with webview-based rendering
- **Testing utilities**: TestEditor, comprehensive E2E test suites
- **Performance monitoring**: Built-in performance tracking and analysis

**Extension points:**

- **Custom shapes**: ShapeUtil classes for new shape types
- **Custom tools**: StateNode state machines for interactive tools
- **Custom bindings**: BindingUtil classes for shape relationships
- **Custom UI**: Complete component override system
- **External content**: Handlers for custom import/export formats

## Technical deep dive

### Reactive architecture details

**Signals system (`@tldraw/state`):**

- **Atom/Computed pattern**: Mutable atoms + derived computed values
- **Dependency tracking**: Automatic capture of signal dependencies during computation
- **Memory optimization**: ArraySet hybrid data structure, WeakCache for object-keyed caches
- **Effect scheduling**: Pluggable scheduling (immediate vs animation frame throttled)
- **Transaction support**: Atomic multi-state updates with rollback capability

**Store system (`@tldraw/store`):**

- **Record management**: Type-safe record storage with validation and migrations
- **Query system**: Reactive indexes with incremental updates
- **Side effects**: Lifecycle hooks for create/update/delete operations
- **History tracking**: Change diffs with configurable history length
- **Schema evolution**: Version-based migration system with dependencies

### Database and persistence

**Client-side storage:**

- **IndexedDB**: Local persistence with automatic migrations
- **Store snapshots**: Complete document state serialization
- **Asset caching**: Local asset storage with deduplication
- **User preferences**: Settings persistence across sessions

**Server-side infrastructure:**

- **PostgreSQL**: Source of truth for user data, files, metadata
- **R2 object storage**: Durable asset storage with global replication
- **Durable Objects**: Stateful compute for room management and real-time sync
- **Zero sync**: Optimistic synchronization with conflict resolution

## Development workflow best practices

### Getting started

1. **Clone and setup**: `git clone` → `yarn install`
2. **Start development**: `yarn dev` (examples app at localhost:5420)
3. **Run tests**: `cd packages/editor && yarn test run` for specific packages
4. **Check types**: `yarn typecheck` before commits
5. **Follow patterns**: Read relevant CONTEXT.md files and existing code

### Creating examples

- **Location**: `apps/examples/src/examples/your-example/`
- **Structure**: README.md with frontmatter + YourExample.tsx component
- **Guidelines**: See `apps/examples/writing-examples.md` for detailed patterns
- **Categories**: getting-started, configuration, editor-api, shapes/tools, etc.

### Package development

- **Testing**: Run tests from package directory, not root
- **API changes**: Run `yarn api-check` to validate public API surface
- **Dependencies**: Check existing usage before adding new libraries
- **Documentation**: API docs auto-generated from TSDoc comments

### Performance guidelines

- **Use signals**: Leverage reactive system for automatic optimization
- **Batch updates**: Use transactions for multiple state changes
- **Memory management**: Dispose of effects and subscriptions properly
- **Asset optimization**: Use appropriate asset export strategy for your bundler

This context file provides the essential architectural understanding needed to navigate and contribute to the tldraw codebase effectively.


# ==================
# FILE: apps/analytics-worker/CONTEXT.md
# ==================

# Analytics worker

A Cloudflare Worker that determines whether users require explicit cookie consent based on their geographic location.

## Purpose

This worker supports the tldraw analytics system by providing geographic consent checking. It helps ensure compliance with privacy regulations like GDPR, UK PECR, FADP, and LGPD by identifying users in regions that require explicit opt-in for tracking.

The worker is deployed to `tldraw-consent.workers.dev` and is called by the analytics app (`apps/analytics/`) during initialization.

## How it works

1. Receives GET request from analytics client
2. Reads user's country code from CloudFlare's `CF-IPCountry` header
3. Checks if country requires explicit consent
4. Returns JSON response indicating whether consent is required
5. Includes CORS headers for allowed tldraw origins

## API

**Endpoint**: `https://tldraw-consent.workers.dev` (or environment-specific variants)

**Method**: `GET`

**Response**:

```json
{
  "requires_consent": boolean,
  "country_code": string | null
}
```

**Caching**: Responses are cached for 1 hour (`Cache-Control: public, max-age=3600`)

## Geographic consent rules

Users in the following countries/regions require explicit consent:

**EU Member States (GDPR)**:

- Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden

**EEA/EFTA (GDPR)**:

- Iceland, Liechtenstein, Norway

**Other regions**:

- United Kingdom (UK PECR)
- Switzerland (FADP)
- Brazil (LGPD)

**Default behavior**: If country code cannot be determined, the worker defaults to requiring consent (conservative approach for privacy compliance).

## CORS configuration

The worker allows cross-origin requests from:

- `http://localhost:3000` - Local development
- `http://localhost:5420` - Local development
- `https://meet.google.com` - Google Meet integration
- `*.tldraw.com` - Production domains
- `*.tldraw.dev` - Development domains
- `*.tldraw.club` - Alternative domains
- `*.tldraw.xyz` - Alternative domains
- `*.tldraw.workers.dev` - Worker preview domains
- `*-tldraw.vercel.app` - Vercel preview deployments

## Development

### Running locally

```bash
yarn dev              # Start local development server
```

### Testing

```bash
yarn test             # Run tests
yarn test-ci          # Run tests in CI mode
```

### Deployment

The worker is deployed via GitHub Actions (`.github/workflows/deploy-analytics.yml`) which runs `internal/scripts/deploy-analytics.ts`.

**Environments**:

- **dev**: `tldraw-consent-dev` (for testing)
- **staging**: `tldraw-consent-staging` (deployed on push to `main`)
- **production**: `tldraw-consent` (deployed on push to `production`)

## File structure

- `src/worker.ts` - Main worker code
- `wrangler.toml` - Cloudflare Worker configuration
- `package.json` - Package configuration and scripts
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

## Integration

This worker is called by the analytics app during initialization:

1. Analytics app loads in user's browser
2. If no existing consent preference is stored
3. App calls this worker to check if consent is required
4. Based on response, app either:
   - Shows consent banner (requires_consent: true)
   - Assumes implicit consent (requires_consent: false)

See `apps/analytics/src/utils/consent-check.ts` for the client-side integration.

## Dependencies

- `@cloudflare/workers-types` - TypeScript types for Cloudflare Workers
- `wrangler` - Cloudflare Workers CLI tool

## Notes

- This is a standalone worker (not part of the analytics app bundle)
- Uses CloudFlare's edge network for low-latency responses worldwide
- Conservative default (require consent) ensures compliance even if geo-detection fails
- CORS preflight requests are handled with 24-hour cache
- Responses are cached to reduce load and improve performance


# ==================
# FILE: apps/analytics/CONTEXT.md
# ==================

# Analytics app

A unified analytics library for tldraw.com that integrates multiple analytics services with cookie consent management.

## Purpose

This package provides a single, consolidated analytics interface that:

- Integrates multiple analytics providers (PostHog, Google Analytics 4, HubSpot, Reo)
- Manages cookie consent with a UI banner and privacy settings dialog
- Exposes a unified API for tracking events, page views, and user identification
- Ensures analytics only run when users have opted in

The analytics script is built as a standalone JavaScript bundle that can be included in any tldraw web application.

## Architecture

### Core components

**Analytics class** (`src/index.ts`)

- Main entry point that orchestrates all analytics services
- Manages consent state and enables/disables services accordingly
- Exposes global `window.tlanalytics` API with methods:
  - `identify(userId, properties)` - Identify a user across all services
  - `reset()` - Reset user identity across all services (called on logout)
  - `track(name, data)` - Track an event
  - `page()` - Track a page view
  - `gtag(...args)` - Access Google Analytics gtag function
  - `openPrivacySettings()` - Show privacy settings dialog

**Analytics services** (`src/analytics-services/`)

- Base `AnalyticsService` class defines common interface
- Each service (PostHog, GA4, HubSpot, Reo) extends the base class
- Lifecycle methods:
  - `initialize()` - Set up service (runs regardless of consent)
  - `enable()` - Enable tracking when consent is granted
  - `disable()` - Disable tracking when consent is revoked
  - `identify(userId, properties)` - Identify user
  - `reset()` - Reset user identity (called on logout)
  - `trackEvent(name, data)` - Track custom event
  - `trackPageview()` - Track page view

**State management** (`src/state/`)

- `AnalyticsState<T>` - Simple reactive state class with subscribe/notify pattern
- `CookieConsentState` - Manages consent state ('unknown' | 'opted-in' | 'opted-out')
- `ThemeState` - Manages theme for UI components ('light' | 'dark')

**UI components** (`src/components/`)

- `CookieConsentBanner` - Shows cookie consent prompt when consent is unknown
- `PrivacySettingsDialog` - Allows users to review and change their consent preferences

### Consent flow

1. On initialization, analytics reads consent from `allowTracking` cookie
2. If no existing consent decision:
   - Check user location via CloudFlare worker (`shouldRequireConsent()`)
   - Users in GDPR/LGPD regions default to 'unknown' (must opt in)
   - Users in other regions default to 'opted-in' (implicit consent)
3. If consent is unknown, banner is shown
4. User actions (accept/opt-out) update the consent state
5. Consent state changes trigger enable/disable on all services
6. Only opted-in users have their events tracked

**Geographic consent checking** (`src/utils/consent-check.ts`)

- Calls CloudFlare worker at `https://tldraw-consent.workers.dev`
- Worker uses `CF-IPCountry` header to determine user's country
- Requires explicit consent for EU, EEA, UK, Switzerland, Brazil
- Falls back to requiring consent if check fails or times out (2s timeout)
- Conservative default ensures compliance with privacy regulations

### Integration with services

**PostHog** (`src/analytics-services/posthog.ts`)

- Product analytics and session recording
- Switches between memory and localStorage persistence based on consent

**Google Analytics 4** (`src/analytics-services/ga4.ts`)

- Web analytics via gtag.js
- Measurement ID provided via `window.TL_GA4_MEASUREMENT_ID`

**HubSpot** (`src/analytics-services/hubspot.ts`)

- Marketing automation and CRM tracking
- Loaded via external script

**Reo** (`src/analytics-services/reo.ts`)

- Analytics service
- Loaded via external script

### CloudFlare consent worker

The consent worker is now maintained in a separate package at `apps/analytics-worker/`.

- Standalone CloudFlare Worker deployed to `tldraw-consent.workers.dev`
- Returns whether explicit consent is required based on user's geographic location
- Uses CloudFlare's `CF-IPCountry` header to detect country
- Returns JSON: `{ requires_consent: boolean, country_code: string }`
- CORS-enabled for cross-origin requests from tldraw domains
- Cached for 1 hour to reduce load
- Countries requiring explicit consent:
  - EU member states (GDPR)
  - EEA/EFTA countries (GDPR)
  - United Kingdom (UK PECR)
  - Switzerland (FADP)
  - Brazil (LGPD)

## Development

### Running the app

```bash
yarn dev              # Start development server
yarn build            # Build for production
yarn test             # Run tests
```

### Testing

Uses Vitest for unit testing. Test files are colocated with source files (e.g., `state.test.ts`).

### Build output

Vite builds the app into two outputs:

1. JavaScript bundle in `public/` directory (via `vite build --outDir public`)
2. TypeScript compiled output in `dist/` (via `tsc`)

The built script can be included in HTML via:

```html
<script src="/analytics.js"></script>
```

## Usage

After the script loads, use the global API:

```javascript
// Identify a user
window.tlanalytics.identify('user-123', { plan: 'pro' })

// Reset user identity (on logout)
window.tlanalytics.reset()

// Track an event
window.tlanalytics.track('button_clicked', { button: 'upgrade' })

// Track a page view
window.tlanalytics.page()

// Open privacy settings
window.tlanalytics.openPrivacySettings()
```

## Configuration

Analytics services are configured via constants in `src/constants.ts` and environment variables:

- `window.TL_GA4_MEASUREMENT_ID` - Google Analytics measurement ID
- `window.TL_GOOGLE_ADS_ID` - Google Ads ID (optional)
- PostHog, HubSpot, and Reo use hardcoded configuration in constants

## Key files

- `src/index.ts` - Main Analytics class and initialization
- `src/types.ts` - TypeScript types and global declarations
- `src/analytics-services/analytics-service.ts` - Base service class
- `src/analytics-services/*.ts` - Individual service implementations (PostHog, GA4, HubSpot, Reo)
- `src/state/state.ts` - Reactive state base class
- `src/state/cookie-consent-state.ts` - Consent management
- `src/state/theme-state.ts` - Theme management for UI components
- `src/utils/consent-check.ts` - Geographic consent checking utility
- `src/components/CookieConsentBanner.ts` - Consent banner UI
- `src/components/PrivacySettingsDialog.ts` - Privacy settings dialog UI
- `src/styles.css` - Component styles (inlined via Vite)

## Dependencies

- `posthog-js` - PostHog SDK
- `js-cookie` - Cookie management
- `vite` - Build tool
- `vitest` - Testing framework

## Notes

- This app does NOT use tldraw's `@tldraw/state` library - it has its own simple reactive state implementation
- The app is framework-agnostic - uses vanilla JavaScript/TypeScript
- All UI is created with vanilla DOM manipulation (no React)
- Styles are injected at runtime from the bundled CSS
- Services are enabled/disabled dynamically based on consent without page reload
- Error handling is implemented during initialization to prevent analytics failures from breaking the page
- User identity persists in memory during session for re-identification if consent changes
- Geographic consent checking uses a conservative approach - defaults to requiring consent on failure


# ==================
# FILE: apps/bemo-worker/CONTEXT.md
# ==================

# @tldraw/bemo-worker

A Cloudflare Worker that provides essential services for tldraw applications, including asset management, bookmark unfurling, and WebSocket connections to collaborative rooms.

## Architecture

**Cloudflare Worker + Durable Object pattern**

- Main worker handles HTTP requests via itty-router
- BemoDO (Durable Object) manages persistent WebSocket connections and room state
- Uses Cloudflare R2 for asset storage and Analytics Engine for telemetry

## Core responsibilities

### 1. Asset management

- **Upload endpoint**: `POST /uploads/:objectName` - Handles user asset uploads to R2 bucket
- **Asset retrieval**: `GET /uploads/:objectName` - Serves uploaded assets with proper caching
- Storage path: `asset-uploads/{objectName}` in BEMO_BUCKET

### 2. Bookmark unfurling

- **Legacy route**: `GET /bookmarks/unfurl` - Extract metadata only
- **Full unfurl**: `POST /bookmarks/unfurl` - Extract metadata and save preview images
- **Asset serving**: `GET /bookmarks/assets/:objectName` - Serve bookmark preview images
- Storage path: `bookmark-assets/{objectName}` in BEMO_BUCKET

### 3. Real-time collaboration

- **Room connection**: `GET /connect/:slug` - Establishes WebSocket connection to collaborative rooms
- Uses BemoDO (Durable Object) to maintain room state and handle multiplayer synchronization
- Integrates with @tldraw/sync-core for real-time document collaboration

## Key components

### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates room connections to Durable Objects.

### BemoDO (BemoDO.ts)

Durable Object that manages:

- WebSocket connections for real-time collaboration
- Room state persistence and synchronization
- Analytics event tracking
- R2 bucket integration for persistent storage

### Environment configuration

Multi-environment setup (dev/preview/staging/production) with:

- Custom domains for staging/production
- Separate R2 buckets per environment
- Analytics datasets per environment
- Durable Object bindings

## Dependencies

**Core tldraw packages:**

- `@tldraw/sync-core` - Real-time collaboration engine
- `@tldraw/worker-shared` - Shared worker utilities
- `@tldraw/store` - Reactive state management
- `@tldraw/tlschema` - Type definitions and validators

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers types and APIs
- R2 for object storage
- Analytics Engine for telemetry

## Development

- `yarn dev` - Start local development server on port 8989
- Uses wrangler for local development and deployment
- Bundle size limit: 350KB (enforced via check-bundle-size script)
- TypeScript configuration optimized for Cloudflare Workers environment

## Deployment environments

- **dev**: Local development with preview bucket
- **preview**: Feature branches with temporary deployments
- **staging**: `canary-demo.tldraw.xyz` for pre-production testing
- **production**: `demo.tldraw.xyz` for live service

## Security & performance

- CORS enabled for cross-origin requests
- Proper asset caching headers
- Analytics tracking for monitoring usage patterns
- Durable Objects provide consistent state management across requests


# ==================
# FILE: apps/docs/CONTEXT.md
# ==================

# @tldraw/docs

Documentation site for the tldraw SDK, hosted at [tldraw.dev](https://tldraw.dev).

## Overview

A Next.js application that generates comprehensive documentation for the tldraw ecosystem. The site combines human-written guides with auto-generated API documentation, all organized in a searchable, navigable interface.

## Architecture

### Tech stack

- **Framework**: Next.js 15 with App Router
- **Content**: MDX for human-written docs, auto-generated from TypeScript via API Extractor
- **Database**: SQLite for content storage and search indexing
- **Styling**: Tailwind CSS with custom components
- **Search**: Algolia for full-text search capabilities
- **Themes**: Dark/light mode support via next-themes

### Content management system

- **Human content**: MDX files in `/content` with frontmatter metadata
- **Generated content**: API docs created from TypeScript source via scripts
- **Database build**: SQLite populated by build scripts for fast querying
- **File watching**: Development mode auto-rebuilds on content changes

## Directory structure

```
apps/docs/
├── app/                 # Next.js App Router pages
│   ├── (docs)/         # Documentation routes
│   ├── (marketing)/    # Marketing pages
│   ├── blog/           # Blog functionality
│   └── search/         # Search implementation
├── content/            # All documentation content
│   ├── docs/           # Human-written guides
│   ├── reference/      # Auto-generated API docs
│   ├── blog/           # Blog posts
│   ├── getting-started/# Onboarding content
│   ├── community/      # Community guides
│   └── sections.json   # Content organization
├── components/         # React components
├── scripts/            # Build and content generation
├── utils/              # Shared utilities
└── api/                # API routes
```

## Content architecture

### Section system

Content is organized into sections defined in `sections.json`:

- **getting-started**: Quick start guides
- **docs**: Core SDK documentation
- **community**: Contributing guides
- **reference**: Auto-generated API docs
- **blog**: News and updates
- **legal**: Terms and policies

### Content types

**Human-written content** (`/content/docs`, `/content/getting-started`, etc.):

- MDX files with frontmatter metadata
- Manual curation and organization
- Includes examples, tutorials, guides

**Auto-generated content** (`/content/reference`):

- Generated from TypeScript source via API Extractor
- Covers all public APIs across tldraw packages
- Automatically updated with code changes

### Frontmatter schema

```yaml
title: "Article Title"
description: "SEO and search description"
status: "published" | "draft"
author: "author_key" # References authors.json
date: "MM/DD/YYYY"
order: 1 # Display order within section
category: "category_name" # Optional grouping
keywords: ["tag1", "tag2"] # Search keywords
hero: "image_path" # Social media image
```

## Build process

### Development commands

- `yarn dev` - Development server with file watching
- `yarn dev-docs` - Docs-specific development mode
- `yarn watch-content` - Content file watcher only

### Content generation pipeline

1. **API source fetching** (`fetch-api-source.ts`)
   - Pulls TypeScript definitions from tldraw packages
   - Uses GitHub API or local files

2. **API documentation** (`create-api-markdown.ts`)
   - Processes TypeScript via API Extractor
   - Generates structured markdown for each API

3. **Content processing** (`refresh-content.ts`)
   - Processes all MDX files
   - Populates SQLite database
   - Builds search indices

4. **Search indexing** (`update-algolia-index.ts`)
   - Updates Algolia search index
   - Includes content, metadata, and search keywords

### Complete build

```bash
yarn refresh-everything  # Full regeneration
yarn refresh-content     # Content only
yarn refresh-api         # API docs only
```

## Key components

### Content rendering

- **MDX processing**: `next-mdx-remote-client` for MDX rendering
- **Code highlighting**: Shiki for syntax highlighting
- **Link handling**: Custom components for internal/external links

### Search implementation

- **Algolia integration**: Full-text search across all content
- **InstantSearch**: Real-time search UI components
- **Faceted search**: Filter by content type, section, tags

### Navigation

- **Dynamic sidebar**: Generated from content structure
- **Breadcrumbs**: Contextual navigation
- **Section organization**: Hierarchical content browsing

## API reference generation

### Source processing

Uses Microsoft API Extractor to process TypeScript:

- Extracts public APIs from built packages
- Generates structured documentation data
- Maintains type information and relationships

### Package coverage

Generates docs for all major tldraw packages:

- `@tldraw/editor` - Core editor engine
- `tldraw` - Complete SDK with UI
- `@tldraw/store` - Reactive database
- `@tldraw/state` - Signals library
- `@tldraw/sync` - Multiplayer functionality
- `@tldraw/tlschema` - Type definitions
- `@tldraw/validate` - Validation utilities

### Documentation structure

- **Classes**: Methods, properties, inheritance
- **Functions**: Parameters, return types, examples
- **Types**: Interface definitions, type aliases
- **Enums**: Values and descriptions

## Development workflow

### Content development

1. Write/edit MDX files in appropriate `/content` subdirectory
2. Use proper frontmatter with required fields
3. File watcher auto-rebuilds during development
4. Test locally before committing

### API documentation updates

1. Changes to TypeScript source trigger regeneration
2. Run `yarn refresh-api` to update API docs
3. Verify generated content accuracy
4. Update search indices

### Deployment

- **Build**: `yarn build` generates static site
- **Content validation**: Link checking, broken reference detection
- **Search**: Algolia index updates during build
- **Assets**: Optimized images, fonts, and static resources

## Integration points

### With main repository

- **Source dependency**: Reads from tldraw package builds
- **Version sync**: Tracks main repository releases
- **Asset sharing**: Uses shared icons, fonts from `/assets`

### External services

- **Algolia**: Search indexing and querying
- **GitHub API**: Source code fetching for API docs
- **Analytics**: User interaction tracking

## Performance considerations

### Static generation

- Most pages pre-rendered at build time
- Dynamic content cached in SQLite
- Incremental Static Regeneration for updates

### Search optimization

- Algolia handles search queries
- Client-side search UI components
- Debounced search input for performance

### Asset optimization

- Next.js automatic image optimization
- Font subsetting and preloading
- CSS optimization and purging

## Key files

**Configuration**:

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript settings

**Content management**:

- `content/sections.json` - Content organization
- `content/authors.json` - Author metadata
- `watcher.ts` - Development file watching

**Build scripts**:

- `scripts/refresh-content.ts` - Content processing
- `scripts/create-api-markdown.ts` - API doc generation
- `scripts/update-algolia-index.ts` - Search indexing

This documentation site serves as the primary resource for developers using the tldraw SDK, combining comprehensive API references with practical guides and examples.


# ==================
# FILE: apps/dotcom/asset-upload-worker/CONTEXT.md
# ==================

# @dotcom/asset-upload-worker

Cloudflare Worker for handling user asset uploads and serving images for tldraw.com.

## Overview

A lightweight Cloudflare Worker that provides asset upload and retrieval services for the tldraw.com web application. It handles image uploads to Cloudflare R2 storage and serves them back with proper caching, enabling users to import and work with images in their tldraw documents.

## Architecture

### Tech stack

- **Runtime**: Cloudflare Workers (V8 isolates)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Router**: itty-router for request routing
- **Shared logic**: @tldraw/worker-shared package
- **Analytics**: Cloudflare Analytics Engine for telemetry

### Infrastructure

- **Edge computing**: Deployed globally on Cloudflare's edge network
- **Caching**: Cloudflare Cache API for optimized asset delivery
- **CORS**: Full CORS support for cross-origin requests
- **Multi-environment**: dev, preview, staging, production deployments

## Core functionality

### Asset upload (`POST /uploads/:objectName`)

- Accepts image files via POST requests
- Stores assets in Cloudflare R2 buckets
- Returns object metadata and ETags
- Prevents duplicate uploads (409 if exists)
- Preserves HTTP metadata (content-type, etc.)

### Asset retrieval (`GET /uploads/:objectName`)

- Serves uploaded assets from R2 storage
- Implements automatic caching via Cloudflare Cache API
- Supports HTTP range requests for partial content
- Handles conditional requests (If-None-Match, etc.)
- Returns 404 for non-existent assets

### Request flow

```
Client Request → Cloudflare Edge → Worker → R2 Storage
             ← Cache Layer   ← Worker ← R2 Response
```

## Environment configuration

### Development (`dev`)

- Worker Name: `tldraw-assets-dev`
- R2 Bucket: `uploads-preview`
- Local development on port 8788
- Persists assets to `tmp-assets/` directory

### Preview/Staging (`preview`/`staging`)

- Worker Name: `main-tldraw-assets` (staging)
- R2 Bucket: `uploads-preview` (shared preview bucket)
- Uses Cloudflare Workers subdomain

### Production (`production`)

- Worker Name: `tldraw-assets`
- R2 Bucket: `uploads` (dedicated production bucket)
- Custom domain: `assets.tldraw.xyz`
- Zone: `tldraw.xyz`

## Storage structure

### R2 buckets

- **uploads-preview**: Development, preview, and staging assets
- **uploads**: Production assets only
- **Object names**: Client-generated unique identifiers
- **Metadata**: Preserved HTTP headers (content-type, etc.)

### Caching strategy

- **Cloudflare cache**: Automatic edge caching for GET requests
- **Cache keys**: Full URL with headers for proper invalidation
- **Range support**: Efficient streaming for large assets
- **ETag headers**: For conditional requests and validation

## Worker implementation

### Entry point (`src/worker.ts`)

```typescript
export default class Worker extends WorkerEntrypoint<Environment> {
  readonly router = createRouter<Environment>()
    .all('*', preflight)                    // CORS preflight
    .get('/uploads/:objectName', ...)       // Asset retrieval
    .post('/uploads/:objectName', ...)      // Asset upload
    .all('*', notFound)                     // 404 fallback
}
```

### Environment interface (`src/types.ts`)

- **UPLOADS**: R2Bucket binding for asset storage
- **CF_VERSION_METADATA**: Worker version information
- **TLDRAW_ENV**: Environment identifier
- **SENTRY_DSN**: Error tracking configuration
- **MEASURE**: Analytics Engine binding

## Shared dependencies

### @tldraw/worker-shared

Provides common functionality across all tldraw workers:

- **handleUserAssetUpload**: Upload logic with duplicate prevention
- **handleUserAssetGet**: Retrieval logic with caching
- **handleApiRequest**: Common request processing
- **createRouter**: Router setup with middleware
- **CORS handling**: Cross-origin request support

### Key functions

- Upload validation and R2 storage operations
- Cache-aware asset retrieval with range support
- Error handling and response formatting
- Analytics integration for monitoring

## Security considerations

### Access control

- **CORS**: Configured for cross-origin requests (`origin: '*'`)
- **Object names**: Client-controlled, requires proper validation
- **Upload limits**: Inherits Cloudflare Worker size limits
- **Content types**: Preserves but doesn't validate file types

### Data isolation

- **Environment separation**: Separate buckets for dev/preview/production
- **No authentication**: Public upload/retrieval (relies on object name secrecy)
- **Analytics**: Basic request telemetry via Analytics Engine

## Development workflow

### Local development

```bash
yarn dev  # Starts local worker with R2 persistence
```

- Uses Wrangler dev server on port 8788
- Persists uploads to local `tmp-assets/` directory
- Inspector available on port 9449
- Hot reload on source changes

### Testing

```bash
yarn test        # Run unit tests
yarn test-ci     # CI test runner
yarn lint        # Code quality checks
```

### Deployment

- **Automatic**: Via CI/CD pipeline
- **Manual**: Using Wrangler CLI
- **Environment-specific**: Different names/buckets per environment
- **Version metadata**: Automatic version tracking

## Usage integration

### Client integration

```typescript
// Upload asset
const response = await fetch(`${WORKER_URL}/uploads/${objectName}`, {
	method: 'POST',
	body: file,
	headers: { 'Content-Type': file.type },
})

// Retrieve asset
const imageUrl = `${WORKER_URL}/uploads/${objectName}`
```

### tldraw.com integration

- **Image import**: Users can upload images to canvas
- **Asset management**: Temporary storage for session assets
- **Performance**: Edge-cached delivery for global users
- **Reliability**: R2 durability and redundancy

## Monitoring & analytics

### Analytics engine

- **Request metrics**: Upload/retrieval counts and latency
- **Error tracking**: Failed requests and error rates
- **Performance**: Response times and cache hit rates
- **Usage patterns**: Popular asset types and sizes

### Observability

- **Cloudflare Dashboard**: Worker metrics and logs
- **Sentry integration**: Error reporting and alerting
- **Version tracking**: Deployment metadata and rollback capability

## Limitations & considerations

### Size constraints

- **Worker limit**: 25MB request body size (Cloudflare limit)
- **Asset types**: No server-side validation of file types
- **Concurrency**: Limited by Cloudflare Worker isolate model

### Retention

- **No cleanup**: Assets persist indefinitely once uploaded
- **No versioning**: Object names must be unique per upload
- **No metadata**: Minimal asset information beyond HTTP headers

## Related services

### Companion workers

- **sync-worker**: Real-time collaboration backend
- **image-resize-worker**: Asset transformation and optimization

### Integration points

- **tldraw.com client**: Primary consumer of upload/retrieval APIs
- **R2 storage**: Shared storage infrastructure
- **Cloudflare Cache**: Global content delivery network

This worker provides essential asset management capabilities for tldraw.com, enabling users to work with images while maintaining global performance and reliability through Cloudflare's edge infrastructure.


# ==================
# FILE: apps/dotcom/client/CONTEXT.md
# ==================

# @dotcom/client

The frontend React application for tldraw.com - the official tldraw web application.

## Overview

A modern React SPA built with Vite that provides the complete tldraw.com user experience. This is the main consumer-facing application that users interact with when visiting tldraw.com, featuring real-time collaboration, file management, user accounts, and the full tldraw editor experience.

## Architecture

### Tech stack

- **Framework**: React 18 with TypeScript
- **Build tool**: Vite with SWC for fast compilation
- **Router**: React Router v6 with lazy-loaded routes
- **Authentication**: Clerk for user management and auth
- **Collaboration**: @tldraw/sync for real-time multiplayer
- **Database**: @rocicorp/zero for client-side data sync
- **Styling**: CSS Modules with global styles
- **Internationalization**: FormatJS for i18n support
- **Monitoring**: Sentry for error tracking, PostHog for analytics

### Application structure

```
src/
├── components/         # Shared UI components
├── pages/             # Route components
├── tla/               # TLA (tldraw app) specific features
│   ├── app/           # Core TLA functionality
│   ├── components/    # TLA-specific components
│   ├── hooks/         # TLA business logic hooks
│   ├── pages/         # TLA route pages
│   ├── providers/     # Context providers
│   └── utils/         # TLA utilities
├── hooks/             # Global React hooks
├── utils/             # Shared utilities
└── assets/            # Static assets
```

## Core features

### Authentication & user management

- **Clerk integration**: Complete auth flow with sign-in/sign-up
- **User sessions**: Persistent authentication state
- **Protected routes**: Authenticated route protection
- **Social login**: Multiple authentication providers

### Real-time collaboration

- **WebSocket sync**: Real-time document synchronization
- **Multiplayer editing**: Multiple users editing simultaneously
- **Conflict resolution**: Operational transforms for concurrent edits
- **Presence indicators**: Live cursors and user awareness

### File management (TLA system)

- **Local files**: Client-side file storage with IndexedDB
- **Cloud sync**: Server-side file persistence and sync
- **File history**: Version control with snapshots
- **Sharing**: Public sharing and collaborative access
- **Import/export**: Multiple file format support

### Editor integration

- **Full tldraw SDK**: Complete drawing and design capabilities
- **Asset management**: Image upload and storage via workers
- **Responsive UI**: Adaptive interface for different screen sizes
- **Keyboard shortcuts**: Comprehensive hotkey system

## Routing architecture

### Route structure

```typescript
// Main application routes
/                    # Root/landing page (TLA)
/new                # Create new file
/f/:fileId          # File editor
/f/:fileId/h        # File history
/f/:fileId/h/:vsId  # History snapshot
/publish            # Publishing flow

// Legacy compatibility routes
/r/:roomId          # Legacy room redirect
/ro/:roomId         # Legacy readonly redirect
/s/:roomId          # Legacy snapshot redirect
/v/:roomId          # Legacy readonly (old format)
```

### Lazy loading

- **Route-based splitting**: Each page component lazy loaded
- **Provider splitting**: Context providers loaded on demand
- **Component splitting**: Large components split for performance

### Error boundaries

- **Global error handling**: Captures and reports all errors
- **Sync error handling**: Specific handling for collaboration errors
- **User-friendly messages**: Contextual error messages
- **Sentry integration**: Automatic error reporting

## Data management

### Client-side storage

- **IndexedDB**: Local file persistence via IDB library
- **Zero database**: Real-time sync with server state
- **Asset caching**: Local caching of uploaded images
- **Settings persistence**: User preferences and settings

### State management

- **React Context**: Global app state via providers
- **Custom hooks**: Business logic encapsulation
- **Zero Sync**: Real-time data synchronization
- **Signal-based updates**: Reactive state updates

### API integration

- **Sync worker**: Real-time collaboration backend
- **Asset upload worker**: File upload and storage
- **Image resize worker**: Image processing and optimization
- **Zero server**: Data persistence and sync

## Development environment

### Build configuration

- **Vite config**: Modern build tooling with HMR
- **Environment variables**: Config via .env files
- **Proxy setup**: API proxying for development
- **Source maps**: Full debugging support with Sentry

### Development commands

```bash
yarn dev         # Start development server
yarn build       # Production build
yarn build-i18n   # Extract and compile translations
yarn e2e         # End-to-end tests via Playwright
yarn test        # Unit tests via Vitest
yarn lint        # Code quality checks
```

### Environment setup

- **PostgreSQL**: Database dependency via wait-for-postgres.sh
- **Worker services**: Local development with companion workers
- **Hot reload**: Fast refresh for development
- **Debug tools**: Inspector and debugging support

## Internationalization

### FormatJS integration

- **Message extraction**: `yarn i18n:extract` extracts translatable strings
- **Compilation**: `yarn i18n:compile` compiles for runtime
- **ICU messages**: Full ICU message format support
- **Locale support**: Multiple language support infrastructure

### Translation workflow

- **Source scanning**: Automatic message ID generation
- **Lokalise format**: Translation management integration
- **AST compilation**: Optimized runtime message handling
- **Dynamic loading**: Locale-specific bundle loading

## Testing strategy

### End-to-end testing

- **Playwright**: Full browser automation testing
- **Auth testing**: @clerk/testing for authentication flows
- **Multiple environments**: Testing against staging/production
- **Parallel execution**: Fast test suite execution

### Unit testing

- **Vitest**: Fast unit test runner
- **React testing**: Component and hook testing
- **Snapshot tests**: UI regression testing
- **Coverage reports**: Code coverage analysis

## Performance optimizations

### Bundle optimization

- **Code splitting**: Route and component-level splitting
- **Asset optimization**: Image optimization and inlining limits
- **Tree shaking**: Unused code elimination
- **Compression**: Gzip and Brotli compression

### Runtime performance

- **Lazy loading**: On-demand component loading
- **Memoization**: React.memo and useMemo optimization
- **Virtual DOM**: Efficient React rendering
- **Service worker**: Cache management (legacy cleanup)

### Network optimization

- **CDN assets**: Static asset delivery via CDN
- **HTTP/2**: Modern protocol support
- **Caching headers**: Browser caching optimization
- **Preloading**: Critical resource preloading

## Security considerations

### Authentication security

- **JWT tokens**: Secure token-based authentication
- **HTTPS only**: Encrypted communication
- **CSRF protection**: Cross-site request forgery prevention
- **Session management**: Secure session handling

### Content security

- **Iframe protection**: IFrameProtector component for embedding
- **XSS prevention**: Input sanitization and validation
- **Asset validation**: Safe asset handling
- **Privacy controls**: User data protection

## Deployment & infrastructure

### Build process

- **Vite build**: Optimized production bundles
- **Source maps**: Error tracking and debugging
- **Asset fingerprinting**: Cache busting for static assets
- **Environment configuration**: Runtime environment detection

### Hosting

- **Vercel deployment**: Serverless hosting platform
- **CDN integration**: Global asset distribution
- **SSL/TLS**: Automatic certificate management
- **Custom domains**: tldraw.com domain configuration

### Monitoring & analytics

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Google Analytics**: User behavior tracking
- **Real user monitoring**: Performance metrics collection

## Integration points

### Backend services

- **Sync worker**: Real-time collaboration
- **Asset upload worker**: File upload handling
- **Image resize worker**: Image processing
- **Zero server**: Data persistence and sync

### Third-party services

- **Clerk**: Authentication and user management
- **Sentry**: Error reporting and monitoring
- **PostHog**: Analytics and feature flags
- **Vercel**: Hosting and deployment

## Key files

### Configuration

- `vite.config.ts` - Build tool configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

### Application core

- `src/main.tsx` - Application entry point
- `src/routes.tsx` - Route definitions and error boundaries
- `src/routeDefs.ts` - Route constants and utilities

### TLA system

- `src/tla/` - Complete file management system
- `src/tla/app/` - Core TLA functionality
- `src/tla/providers/` - Context providers

This client application serves as the primary interface for tldraw.com users, combining the powerful tldraw editor with real-time collaboration, user management, and a comprehensive file system to create a complete creative platform.


# ==================
# FILE: apps/dotcom/client/src/fairy/CONTEXT.md
# ==================

# Fairy system context

## Overview

The fairy system is an AI agent framework for tldraw.com that provides intelligent canvas assistants. Fairies are visual AI agents with sprite avatars that can interact with the canvas, perform tasks, and collaborate with users and other fairies. They appear as small animated sprites that move around the canvas as they work.

## Architecture

The fairy system uses a two-level manager architecture:

1. **Application level** (`FairyApp`): Manages global fairy state, agent lifecycle, projects, tasks, and coordination
2. **Agent level** (`FairyAgent`): Manages individual fairy behavior, mode state machine, chat, and canvas actions

### Application layer (`fairy-app/`)

**FairyApp** (`fairy-app/FairyApp.ts`)

The central coordinator for the fairy system. One instance per editor.

- Manages global state (isApplyingAction, debugFlags, modelSelection)
- Coordinates all app-level managers
- Handles state persistence (load/save/auto-save)
- Provides React context via `FairyAppProvider`

**App managers** (`fairy-app/managers/`)

All app managers extend `BaseFairyAppManager` with `reset()` and `dispose()` methods:

- **FairyAppAgentsManager**: Agent lifecycle - creation, sync with configs, disposal
- **FairyAppFollowingManager**: Camera following - tracks which fairy to follow, zoom behavior
- **FairyAppPersistenceManager**: State persistence - load, save, auto-save with throttling
- **FairyAppProjectsManager**: Project CRUD, disband, resume, member management
- **FairyAppTaskListManager**: Task CRUD, assignment, status updates, notifications
- **FairyAppWaitManager**: Wait/notification system for inter-agent coordination

**FairyAppProvider** (`fairy-app/FairyAppProvider.tsx`)

React provider that:

- Creates `FairyApp` instance on mount
- Syncs agents with user's fairy configs
- Loads/saves persisted state
- Provides `useFairyApp()` hook for context access

### Agent layer (`fairy-agent/`)

**FairyAgent** (`fairy-agent/FairyAgent.ts`)

- Main agent class that orchestrates AI interactions
- References `FairyApp` for app-level operations
- Delegates functionality to specialized manager classes
- Coordinates with the AI backend for generation
- Contains computed state for fairy entity and configuration
- Handles prompt preparation, request management, and scheduling

**Agent managers** (`fairy-agent/managers/`)

FairyAgent uses a manager pattern to organize functionality into focused classes that all extend `BaseFairyAgentManager`:

- **FairyAgentActionManager**: Action utils, action execution, and action info retrieval
- **FairyAgentChatManager**: Chat history storage and updates
- **FairyAgentChatOriginManager**: Chat origin point tracking for coordinate offset calculations
- **FairyAgentGestureManager**: Temporary visual gestures and poses
- **FairyAgentModeManager**: Mode state machine transitions
- **FairyAgentPositionManager**: Fairy positioning, spawning, following, and summon behavior
- **FairyAgentRequestManager**: Active/scheduled request management and prompt state
- **FairyAgentTodoManager**: Personal todo item management
- **FairyAgentUsageTracker**: Token usage and cost tracking
- **FairyAgentUserActionTracker**: Recording user actions on canvas
- **FairyAgentWaitManager**: Wait conditions and wake-up logic

Each manager has a `reset()` method and optional `dispose()` for cleanup.

**FairyEntity** (from `@tldraw/fairy-shared`)

- Data structure representing a fairy's state
- Includes position, selection state, personality, pose
- Tracks fairy mode, project membership, and flip orientation
- Persisted across sessions

**Fairy component** (`Fairy.tsx`)

- React component that renders the fairy sprite on canvas
- Size: 60px base with variable clickable areas (50px default, 60px selected)
- Handles selection via brush tool (shift-key for multi-select)
- Context menu interactions on right-click
- Responds to throw tool and drag interactions
- Collision detection using bounding box intersection

### Agent modes

Fairies operate in different modes defined by a state machine (`FairyModeNode.ts`):

**Basic modes**

- **sleeping**: Initial dormant state, fairy is not active
- **idling**: Default awake state, waiting for input, clears todo list and action history on enter
- **soloing**: Working independently on user requests, continues until all assigned tasks complete
- **standing-by**: Waiting state (passive)

**Solo work modes**

- **working-solo**: Working on a solo task, maintains todo list, auto-continues until task marked done
- **working-drone**: Working as drone in a project, cannot be cancelled mid-project
- **working-orchestrator**: Duo orchestrator working on their own task

**Orchestration modes**

- **orchestrating-active**: Actively coordinating a project, deploying drones and reviewing progress
- **orchestrating-waiting**: Waiting for drones to complete their tasks before resuming
- **duo-orchestrating-active**: Leading a duo project with another fairy
- **duo-orchestrating-waiting**: Waiting in duo project for partner to complete work

Each mode has lifecycle hooks:

- `onEnter`: Setup when entering the mode
- `onExit`: Cleanup when leaving the mode
- `onPromptStart`: Handle new prompt initiation
- `onPromptEnd`: Determine next action after prompt completes
- `onPromptCancel`: Handle cancellation (some modes prohibit cancellation)

### Prompt composition system

The prompt composition system is responsible for gathering context from the client, sending it to the worker, and assembling it into a structured prompt for the AI model.

**1. Gathering context (client-side)**

When `agent.prompt()` is called, `FairyAgent` collects information using **Prompt Part Utils** (`PromptPartUtil`). Each util corresponds to a specific type of context (e.g., `selectedShapes`, `chatHistory`).

- **Role**: Extract raw data from the editor/store.
- **Output**: A JSON-serializable `PromptPart` object.

```typescript
// Example: SelectedShapesPartUtil
class SelectedShapesPartUtil extends PromptPartUtil<SelectedShapesPart> {
	getPart(request) {
		return {
			type: 'selectedShapes',
			shapes: this.editor.getSelectedShapes().map(/* ... */),
		}
	}
}
```

**2. Prompt construction (worker-side)**

The worker receives the `AgentPrompt` (a collection of parts) and builds the final system prompt using `buildSystemPrompt`.

- **Flags**: `getSystemPromptFlags` analyzes the active mode, available actions, and present prompt parts to generate boolean flags (e.g., `isSoloing`, `hasSelectedShapesPart`).
- **Sections**: These flags drive the inclusion of specific prompt sections:
  - `intro-section`: Base identity and high-level goals.
  - `rules-section`: Dynamic rules based on capabilities (e.g., "You can create shapes...").
  - `mode-section`: Mode-specific instructions (e.g., "You are currently orchestrating...").

**3. Message building**

The worker converts prompt parts into a list of messages (`ModelMessage[]`) for the LLM.

- `buildMessages`: Iterates through parts and calls their `buildContent` method (defined in `PromptPartDefinitions` or `PromptPartUtil`).
- **Prioritization**: Parts have priority levels. For example, `SystemPrompt` is high priority, while `PeripheralShapes` might be lower.

**4. Schema generation**

The JSON schema for the model's response is dynamically generated based on the **allowed actions** for the current mode.

- If `mode: 'soloing'` allows `CreateAction`, the schema will include the definition for creating shapes.
- If `mode: 'idling'` allows fewer actions, the schema is restricted accordingly.

### Interrupt system

The interrupt system allows for immediate control flow changes in the agent's behavior. It is primarily handled by the `interrupt` method in `FairyAgent`.

**Key functions**

- **Cancel current work**: Aborts any currently running prompt or action stream.
- **Clear schedule**: Removes any pending scheduled requests.
- **Mode switching**: Optionally transitions the agent to a new mode.
- **New instruction**: Optionally provides a new prompt or input to start immediately.

**Usage**

```typescript
agent.interrupt({
	mode: 'idling', // Switch to idling mode
	input: {
		// Optional: Provide new input
		message: 'Stop what you are doing',
		source: 'user',
	},
})
```

**Common use cases**

- **User cancellation**: When a user sends a new message while the agent is working.
- **Task completion**: When an agent finishes a task and needs to report back or switch roles (e.g. `MarkSoloTaskDoneActionUtil`).
- **Mode transitions**: When changing from solo work to collaboration or orchestration.

**Implementation details**

- Clears active and scheduled requests via `requestManager`.
- Calls the underlying `AbortController` to stop network requests.
- Triggers `onExit` of the current mode and `onEnter` of the new mode.

### Action execution pipeline

The agent processes actions streamed from the AI model through a rigorous pipeline to ensure safety and consistency.

**Pipeline steps**

1. **Streaming**: Actions arrive via `_streamActions` from the worker as Server-Sent Events (SSE).
2. **Validation**: The system checks if the action type is allowed in the current mode.
3. **Sanitization**: `sanitizeAction` (in `AgentActionUtil`) transforms the action before execution (e.g. correcting IDs, validating bounds).
4. **Execution**:
   - The agent enters an "acting" state (`isActing = true`) to prevent recording its own actions as user actions.
   - `editor.store.extractingChanges` captures all state changes made during the action.
   - `applyAction` modifies the canvas (creating shapes, moving elements, etc.).
5. **Partial execution handling**:
   - If an action comes in chunks, `incompleteDiff` tracks partial changes.
   - Previous partial changes are reverted before applying the new, more complete version of the action.
6. **Page synchronization**:
   - `ensureFairyIsOnCorrectPage` ensures the fairy is on the same page as shapes being manipulated.
   - For create actions, syncs fairy to current editor page.
7. **History & persistence**:
   - `savesToHistory()` determines if the action appears in the chat log.
   - Chat history is updated with the action and its resulting diff.

**Key methods in FairyAgentActionManager**

- `act(action)`: Core method to execute a single action and capture its diff.
- `getAgentActionUtil(type)`: Get the util for an action type.
- `getActionInfo(action)`: Get display info for UI rendering.

### Chat history system

The chat history system maintains a persistent record of interactions, actions, and memory transitions. It serves as the agent's "memory," allowing it to recall past instructions and actions within specific contexts.

**Data structure**

Chat history is stored as an array of `ChatHistoryItem` objects managed by `FairyAgentChatManager`.

```typescript
type ChatHistoryItem =
	| { type: 'prompt'; agentFacingMessage: string; userFacingMessage: string; promptSource: string; ... }
	| { type: 'action'; action: AgentAction; diff: RecordsDiff; acceptance: string; ... }
	| { type: 'continuation'; data: any[]; ... }
	| { type: 'memory-transition'; agentFacingMessage: string; userFacingMessage: string | null; ... }
```

**Memory levels**

To manage context window size and relevance, the system implements a tiered memory model:

1. **Task level** (`memoryLevel: 'task'`): High-detail, short-term memory. Contains immediate actions and granular feedback for the current task. Cleared when the task is completed.
2. **Project level** (`memoryLevel: 'project'`): Medium-term memory. Contains key milestones and instructions relevant to the entire project. Persists across individual tasks but cleared when the project ends.
3. **Fairy level** (`memoryLevel: 'fairy'`): Long-term memory. Contains core personality traits and global instructions. Persists across projects.

**Filtering mechanism**

The `ChatHistoryPartUtil` uses `filterChatHistoryByMode` to send only relevant history to the AI model based on the current mode's required memory level.

- **Task mode**: Sees only current task history (stops at previous task boundaries).
- **Project mode**: Sees project-level history (stops at fairy-level boundaries).
- **Fairy mode**: Sees only global history.

### Actions system

Actions are the operations fairies can perform on the canvas. Each action extends `AgentActionUtil` and implements:

- `getInfo()`: Returns UI display information (icon, description, pose)
- `sanitizeAction()`: Transforms/validates actions before execution
- `applyAction()`: Executes the action on the canvas
- `savesToHistory()`: Whether to persist in chat history

**Canvas manipulation**

- `CreateActionUtil`: Create shapes with unique ID management and arrow bindings
- `UpdateActionUtil`: Modify existing shapes with property updates
- `DeleteActionUtil`: Remove shapes from canvas
- `MoveActionUtil`: Reposition elements with offset calculations
- `MovePositionActionUtil`: Move fairy position
- `ResizeActionUtil`: Change shape dimensions
- `RotateActionUtil`: Rotate shapes around their center
- `LabelActionUtil`: Add or update text labels on shapes
- `OffsetActionUtil`: Offset shapes by a delta

**Organization**

- `AlignActionUtil`: Align multiple shapes (left, center, right, top, middle, bottom)
- `DistributeActionUtil`: Distribute shapes evenly (horizontal, vertical)
- `StackActionUtil`: Stack shapes in organized layouts
- `PlaceActionUtil`: Position groups of shapes strategically
- `BringToFrontActionUtil`: Move shapes to front layer
- `SendToBackActionUtil`: Move shapes to back layer

**Drawing**

- `PenActionUtil`: Freehand drawing with pen tool

**Navigation**

- `ChangePageActionUtil`: Switch between document pages
- `CreatePageActionUtil`: Create new pages
- `FlyToBoundsActionUtil`: Navigate viewport to specific bounds

**Solo task management**

- `CreateSoloTaskActionUtil`: Create individual tasks
- `StartSoloTaskActionUtil`: Begin working on solo tasks
- `MarkSoloTaskDoneActionUtil`: Mark solo tasks as complete
- `ClaimTodoItemActionUtil`: Claim personal todo items
- `UpsertPersonalTodoItemActionUtil`: Manage personal todo list
- `DeletePersonalTodoItemsActionUtil`: Delete todo items

**Project task management (orchestrator)**

- `StartProjectActionUtil`: Initialize a new project
- `CreateProjectTaskActionUtil`: Create tasks within a project
- `DeleteProjectTaskActionUtil`: Delete project tasks
- `DirectToStartTaskActionUtil`: Direct drones to start tasks
- `EndCurrentProjectActionUtil`: Complete and close current project
- `AwaitTasksCompletionActionUtil`: Wait for task completion

**Duo project management**

- `StartDuoProjectActionUtil`: Initialize duo collaboration
- `CreateDuoTaskActionUtil`: Create duo tasks
- `DirectToStartDuoTaskActionUtil`: Direct partner to start task
- `StartDuoTaskActionUtil`: Begin duo task execution
- `EndDuoProjectActionUtil`: Complete duo project
- `AwaitDuoTasksCompletionActionUtil`: Wait for duo task completion
- `MarkDuoTaskDoneActionUtil`: Mark duo tasks complete

**Drone actions**

- `MarkDroneTaskDoneActionUtil`: Complete tasks as a drone

**Communication & planning**

- `MessageActionUtil`: Send messages to users
- `ThinkActionUtil`: Display thinking process
- `ReviewActionUtil`: Review and analyze canvas content

**System**

- `UnknownActionUtil`: Handle unrecognized actions (required)

### Prompt parts system

Prompt parts provide context to the AI model:

**Canvas context**

- `SelectedShapesPartUtil`: Currently selected shapes
- `PeripheralShapesPartUtil`: Nearby shapes
- `BlurryShapesPartUtil`: Distant/background shapes
- `ScreenshotPartUtil`: Visual canvas representation
- `DataPartUtil`: Shape data and properties
- `CanvasLintsPartUtil`: Canvas lint warnings

**User context**

- `UserViewportBoundsPartUtil`: User's visible area
- `UserActionHistoryPartUtil`: Recent user actions
- `MessagesPartUtil`: User messages and requests

**Agent context**

- `AgentViewportBoundsPartUtil`: Fairy's visible area
- `ChatHistoryPartUtil`: Conversation history
- `SignPartUtil`: Fairy's astrological sign
- `ModelNamePartUtil`: AI model being used

**Task context**

- `SoloTasksPartUtil`: Individual tasks
- `WorkingTasksPartUtil`: In-progress tasks
- `PersonalTodoListPartUtil`: Personal todo items
- `CurrentProjectOrchestratorPartUtil`: Project orchestration
- `CurrentProjectDronePartUtil`: Drone role in projects

**Environment context**

- `PagesPartUtil`: Document pages
- `TimePartUtil`: Temporal context
- `ModePartUtil`: Current agent mode
- `OtherFairiesPartUtil`: Other fairies present
- `DebugPartUtil`: Debug information when enabled

### Helper system

**AgentHelpers** (`fairy-agent/AgentHelpers.ts`)

Transformation utilities used during request processing:

**Coordinate transformations**

- `applyOffsetToVec/removeOffsetFromVec`: Adjust positions relative to chat origin
- `applyOffsetToBox/removeOffsetFromBox`: Transform bounding boxes
- `applyOffsetToShape/removeOffsetFromShape`: Transform entire shapes
- Helps keep numbers small for better AI model comprehension

**ID management**

- `ensureShapeIdIsUnique`: Prevent ID collisions when creating shapes
- `ensureShapeIdExists`: Validate shape references in actions
- `shapeIdMap`: Track ID transformations for consistency across actions

**Numeric precision**

- `roundingDiffMap`: Store rounding differences for restoration
- Maintains precision while simplifying numbers for AI

### Wait and notification system

**FairyAppWaitManager** (app level)

Central event dispatcher for broadcasting events to waiting agents:

- `notifyWaitingAgents()`: Central event dispatcher
- `notifyTaskCompleted()`: Broadcast when tasks complete
- `notifyAgentModeTransition()`: Broadcast mode changes
- `createTaskWaitCondition()`: Create wait condition for specific task
- `createAgentModeTransitionWaitCondition()`: Create wait condition for mode change

**FairyAgentWaitManager** (agent level)

Per-agent wait condition management:

- `waitForAll()`: Set wait conditions for an agent
- `getWaitingFor()`: Get current wait conditions
- `notifyWaitConditionFulfilled()`: Wake agent with notification message

### Collaborative features

**Projects system** (`FairyAppProjectsManager`)

- Multi-fairy collaboration on complex tasks
- Project roles:
  - **Orchestrator**: Coordinates work, assigns tasks, reviews progress, cannot be interrupted
  - **Duo-orchestrator**: Leads a duo project, can also work on tasks themselves
  - **Drone**: Executes assigned tasks, reports completion, works autonomously
- Duo projects for paired fairy collaboration
- Project state tracked globally with member lists and task assignments
- Projects have unique IDs and color coding

**Project resumption**

Projects can be resumed after interruption with intelligent state recovery:

- **State 1**: All tasks done → Resume orchestrator to review/end project
- **State 2**: Tasks in progress → Resume working drones, orchestrator waits
- **State 3**: Mix of done/todo → Resume orchestrator to continue leading
- **State 4**: No tasks exist → Resume orchestrator to finish planning
- **State 5**: All tasks todo → Resume orchestrator to direct drones

**Project lifecycle**

- `addProject()`: Register new project
- `disbandProject()`: Cancel project, interrupt members, add cancellation memory
- `disbandAllProjects()`: Cleanup all projects
- `resumeProject()`: Intelligently resume interrupted projects
- `deleteProjectAndAssociatedTasks()`: Clean removal with task cleanup

**Task management** (`FairyAppTaskListManager`)

- Shared task lists for projects
- Task states: `todo`, `in-progress`, `done`
- Tasks include:
  - Unique ID for tracking
  - Text description
  - Assignment to specific fairy
  - Completion status
  - Project association
  - Optional spatial bounds

**Inter-fairy communication**

- Fairies aware of each other through `OtherFairiesPartUtil`
- Coordinate actions to avoid conflicts
- Share project context for collaboration
- Wait conditions enable synchronization
- Mode transitions broadcast to waiting fairies

### UI components

**Main components** (`fairy-ui/`)

- `FairyHUD`: Main heads-up display container
- `FairyHUDTeaser`: Teaser/preview UI

**Chat components** (`fairy-ui/chat/`)

- `FairyChatHistory`: Full conversation display
- `FairyChatHistorySection`: Grouped history display
- `FairyChatHistoryAction`: Individual action rendering
- `FairyChatHistoryGroup`: Grouped action rendering
- `FairyProjectChatContent`: Project-specific chat content
- `filterChatHistoryByMode`: History filtering logic

**Input components** (`fairy-ui/hud/`)

- `FairySingleChatInput`: Single fairy chat input
- `FairyHUDHeader`: Header with controls
- `useFairySelection`: Selection state hook
- `useIdlingFairies`: Hook for available fairies
- `useMobilePositioning`: Mobile-specific positioning

**Menu components** (`fairy-ui/menus/`)

- `FairyContextMenuContent`: Right-click menu options
- `FairyMenuContent`: Main menu interface

**Sidebar components** (`fairy-ui/sidebar/`)

- `FairySidebarButton`: Sidebar toggle button
- `FairyListSidebar`: Fairy list in sidebar

**Other UI** (`fairy-ui/`)

- `FairyDebugDialog`: Debug interface (`fairy-ui/debug/`)
- `FairyProjectView`: Project view component (`fairy-ui/project/`)
- `FairyManualPanel`: User guide/manual panel (`fairy-ui/manual/`)

**Hooks** (`fairy-ui/hooks/`)

- `useFairyAgentChatHistory`: Chat history access
- `useFairyAgentChatOrigin`: Chat origin access

### Sprite system

**FairySprite** (`fairy-sprite/FairySprite.tsx`)

- Visual representation of fairies on canvas
- Animated sprites with multiple poses and keyframe animation
- SVG-based rendering at 108x108 viewBox

**Poses** (`FairyPose` type)

- `idle`: Default standing pose
- `active`: Active but not working
- `reading`: Reading documents
- `writing`: Writing/creating
- `thinking`: Deep thought pose
- `working`: Actively working on task
- `sleeping`: Dormant state
- `waiting`: Waiting for something
- `reviewing`: Reviewing work
- `panicking`: Error/panic state
- `poof`: Spawn/despawn animation

**Sprite parts** (`fairy-sprite/sprites/parts/`)

- `FairyBodySpritePart`: Main body
- `FairyFaceSpritePart`: Face expressions
- `FairyHatSpritePart`: Hat accessories
- `FairyLegsSpritePart`: Legs

**Wing sprites** (`fairy-sprite/sprites/WingsSprite.tsx`)

- `RaisedWingsSprite1/2/3`: High wing positions for active poses
- `LoweredWingsSprite1/2/3`: Low wing positions for passive poses
- Wing colors indicate project membership and role

**Other sprites**

- `IdleSprite`, `SleepingSprite`, `ThinkingSprite`
- `WorkingSprite1/2/3`: Working animation frames
- `ReadingSprite1/2/3`: Reading animation frames
- `WritingSprite1/2`: Writing animation frames
- `WaitingSprite/ReviewingSprite1/2/3`: Waiting states
- `PanickingSprite1/2`: Error animations
- `PoofSprite1/2/3/4`: Spawn/despawn effects
- `FairyReticleSprite`: Selection reticle
- `Avatar`: Avatar display component

**Animation**

- Frame durations vary by pose (65ms-160ms)
- `useKeyframe` hook manages animation timing
- Faster animation when generating (0.75x duration)

**Customization**

- Hat colors map to hat types (top, pointy, bald, antenna, etc.)
- Project color shown on wings
- Orchestrators have colored bottom wings
- `flipX` prop for directional facing

### Canvas UI components

**Canvas components** (`fairy-canvas-ui/`)

- `Fairies`: Container rendering all local fairies
- `RemoteFairies`: Handles fairies from other users
- `DebugFairyVision`: Debug overlay for fairy vision bounds

### Special tools

**FairyThrowTool** (`FairyThrowTool.tsx`)

- Allows throwing/moving fairies on canvas
- Integrated with select tool

### Helpers

**Name generation** (`fairy-helpers/getRandomFairyName.ts`)

- Generates unique fairy names

**Sign generation** (`fairy-helpers/getRandomFairySign.ts`)

- Creates fairy astrological signs

**Project colors** (`fairy-helpers/getProjectColor.ts`)

- Color coding for projects

**No-input messages** (`fairy-helpers/getRandomNoInputMessage.ts`)

- Messages when fairy has no input

### State management

**FairyApp state**

App-level state managed by `FairyApp`:

- `$isApplyingAction`: Whether any fairy is currently applying an action
- `$debugFlags`: Debug feature toggles (showTaskBounds)
- `$modelSelection`: Currently selected AI model

**App managers state**

Each app manager maintains its own reactive state, accessed via unified API:

- `fairyApp.agents.$agents`: List of all fairy agents
- `fairyApp.following.$followingFairyId`: ID of followed fairy
- `fairyApp.projects.$projects`: Active projects list
- `fairyApp.tasks.$tasks`: Shared task list

**Agent state**

Per-agent state managed by `FairyAgent`:

- `$fairyEntity`: Position, pose, selection, page
- `$fairyConfig`: Name, outfit, sign (from user settings)
- `$debugFlags`: Per-agent debug toggles
- `$useOneShottingMode`: Solo prompting behavior

**Persistence**

- Fairy state serialized via `fairyApp.persistence.serializeState()`
- Includes: all agent states, task list, projects
- Agent state includes: fairyEntity, chatHistory, chatOrigin, personalTodoList, waitingFor
- Restored via `fairyApp.persistence.loadState()`
- Auto-save via reactive watchers (throttled to 2 seconds)
- Configuration stored in user profile as `fairies` JSON

### Debug capabilities

**Debug flags**

- `logSystemPrompt`: Log system prompt to console
- `logMessages`: Log messages to console
- `logResponseTime`: Track AI response performance
- `showTaskBounds`: Display task bounds on canvas

**Debug dialog** (`FairyDebugDialog.tsx`)

- View internal fairy state
- Monitor active requests
- Inspect chat history
- Track mode transitions
- Performance metrics

### Internationalization

**Messages** (`fairy-messages.ts`)

Uses `defineMessages` for i18n support:

- Toolbar labels (fairies, select, deselect, close)
- Menu labels (go to, summon, follow, sleep, wake)
- Input placeholders (speak to fairy, enter message)
- Action labels (stop, send, clear)

### Backend integration

- Communicates with `FAIRY_WORKER` endpoint
- Authentication via `getToken`
- Streaming responses for real-time generation via SSE
- Model selection support

## Usage patterns

### Creating the fairy app

```typescript
// Via React provider (recommended)
<FairyAppProvider fileId={fileId} onMount={handleMount} onUnmount={handleUnmount}>
	<FairyHUD />
</FairyAppProvider>

// Access via hook
const fairyApp = useFairyApp()
```

### Creating a fairy agent

Agents are created automatically by `FairyAppAgentsManager.syncAgentsWithConfigs()` based on user's fairy configs. Manual creation:

```typescript
const fairy = new FairyAgent({
	id: uniqueId,
	fairyApp: fairyApp,
	editor: editor,
	onError: handleError,
	getToken: authTokenProvider,
})
```

### Prompting a fairy

```typescript
// Basic prompt
fairy.prompt({
	message: 'Draw a flowchart',
})

// With spatial bounds
fairy.prompt({
	message: 'Work in this area',
	bounds: { x: 100, y: 100, w: 500, h: 500 },
})
```

### Scheduling follow-up work

```typescript
// Add an instruction
fairy.schedule('Continue working on the diagram')

// Schedule with specific data
fairy.schedule({
	message: 'Review changes',
	data: ['Shape xyz was modified'],
})
```

### Interrupting a fairy

```typescript
// Cancel and switch mode
fairy.interrupt({
	mode: 'idling',
	input: { message: 'Stop and wait' },
})

// Just cancel current work
fairy.interrupt({ input: null })
```

### Custom actions

```typescript
class CustomActionUtil extends AgentActionUtil<CustomAction> {
	static override type = 'custom' as const

	override getInfo(action) {
		return { icon: 'star', description: action.description, pose: 'working' }
	}

	override sanitizeAction(action, helpers) {
		// Validate and transform action
		return action
	}

	override applyAction(action, helpers) {
		// Execute action on canvas
		this.editor.createShape(/* ... */)
	}
}
```

### Custom prompt parts

```typescript
class CustomPartUtil extends PromptPartUtil<CustomPart> {
	static type = 'custom-context' as const

	getPart(request, helpers) {
		return {
			type: 'custom-context',
			data: this.editor.getSelectedShapeIds(),
		}
	}
}
```

### Working with projects

```typescript
// Projects are typically started via StartProjectActionUtil
// But can be managed programmatically via fairyApp:
fairyApp.projects.disbandProject(projectId)
fairyApp.projects.resumeProject(projectId)

// Task management
fairyApp.tasks.createTask({ id, title, projectId })
fairyApp.tasks.setTaskStatusAndNotify(taskId, 'done')
```

### Camera following

```typescript
// Start following a fairy
fairyApp.following.startFollowing(fairyId)

// Stop following
fairyApp.following.stopFollowing()

// Check if following
fairyApp.following.isFollowing()
```

## Key features

- **Visual AI agents**: Sprites that move and interact on canvas
- **Multi-modal understanding**: Process visual and text inputs
- **Collaborative work**: Multiple fairies working together on projects
- **Task management**: Create, assign, and track tasks
- **Canvas manipulation**: Full CRUD operations on shapes
- **Page navigation**: Multi-page document support
- **Personality system**: Each fairy has unique traits and sign
- **Debug tools**: Comprehensive debugging interface
- **Project resumption**: Intelligent recovery from interruptions
- **Internationalization**: Full i18n support for UI strings
- **State persistence**: Auto-save and restore fairy state per file


# ==================
# FILE: apps/dotcom/fairy-worker/CONTEXT.md
# ==================

# Fairy Worker Context

## Overview

The `fairy-worker` (also known as `dotcom-fairy-worker`) is a Cloudflare Worker that provides AI agent interaction capabilities for tldraw. It handles streaming responses from AI agents that can interact with tldraw drawings, enabling AI-powered features like drawing assistants, automated sketching, and intelligent canvas interactions.

## Architecture

### Core Components

The fairy-worker consists of a main worker and a specialized Durable Object:

#### Worker (worker.ts)

Main entry point extending `WorkerEntrypoint`. Sets up routing with CORS support and delegates agent interactions to Durable Objects.

```typescript
export default class extends WorkerEntrypoint<Environment> {
	override fetch(request: Request): Promise<Response> {
		return router.fetch(request, this.env, this.ctx)
	}
}
```

The worker handles:

- POST /stream - Main endpoint for AI agent streaming responses
- CORS configuration for cross-origin requests
- Request routing to the appropriate Durable Object

#### AgentDurableObject - Agent Session Management

Manages individual AI agent sessions and their interactions with tldraw:

```typescript
export class AgentDurableObject extends DurableObject {
	async fetch(request: Request): Promise<Response> {
		// Handle agent requests with streaming responses
		// Process tldraw action streams
		// Manage agent state and context
	}
}
```

The Durable Object provides:

- Persistent agent sessions
- Streaming response handling
- Integration with AI providers (OpenAI, Anthropic, Google)
- State management for agent interactions

### Request Flow

1. Client sends POST request to `/stream` with agent request data
2. Worker routes request to `AgentDurableObject` using a session identifier
3. Durable Object processes the request and streams responses back
4. Responses are formatted as Server-Sent Events (SSE) for real-time updates

## Core Responsibilities

### 1. AI Agent Management

- **Session Management**: Each agent session is isolated in its own Durable Object instance
- **State Persistence**: Agent context and conversation history maintained across requests
- **Multi-Provider Support**: Integration with OpenAI, Anthropic, and Google AI services

### 2. Streaming Responses

The worker provides real-time streaming of AI responses:

```typescript
// Streaming response with Server-Sent Events
return new Response(responseBody, {
	headers: {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	},
})
```

### 3. tldraw Integration

The agent can:

- Read and understand tldraw canvas state
- Generate drawing actions (pen strokes, shapes, etc.)
- Respond to user queries about drawings
- Provide intelligent drawing assistance

## Environment Configuration

### Required Environment Variables

```typescript
export interface Environment {
	AGENT_DURABLE_OBJECT: DurableObjectNamespace
	OPENAI_API_KEY: string
	ANTHROPIC_API_KEY: string
	GOOGLE_API_KEY: string
	FAIRY_MODEL: string
	SENTRY_DSN: string | undefined
	IS_LOCAL: string | undefined
	CLERK_SECRET_KEY: string
	CLERK_PUBLISHABLE_KEY: string
}
```

### Deployment Configuration

The worker runs as a completely independent service configured via `wrangler.toml`:

```toml
name = "fairydraw"
main = "src/worker.ts"
compatibility_date = "2024-12-30"

[dev]
port = 8789  # Runs on port 8789 in development

[env.dev]
name = "fairydraw-dev"

[env.staging]
name = "fairydraw-staging"
route = { pattern = "staging-fairy.tldraw.xyz", custom_domain = true }

[env.production]
name = "fairydraw"
route = { pattern = "fairy.tldraw.xyz", custom_domain = true }

[durable_objects]
bindings = [
    { name = "AGENT_DURABLE_OBJECT", class_name = "AgentDurableObject" },
]
```

## Dependencies

**Core tldraw packages:**

- `@tldraw/fairy-shared` - Shared utilities and types
- `@tldraw/worker-shared` - Shared worker utilities

**Infrastructure:**

- `itty-router` - HTTP request routing
- Cloudflare Workers runtime and APIs
- Durable Objects for stateful sessions

## Development

```bash
# Start local development server
yarn dev  # Runs on localhost with inspector on port 9559

# Run tests
yarn test

# Type checking
yarn typecheck

# Linting
yarn lint
```

## Key Features

### AI-Powered Drawing Assistance

- **Natural Language Understanding**: Interpret user requests about drawings
- **Drawing Generation**: Create shapes, strokes, and compositions
- **Contextual Awareness**: Understand existing canvas content
- **Real-time Feedback**: Stream responses as they're generated

### Scalability and Performance

- **Edge Deployment**: Runs globally on Cloudflare's edge network
- **Durable Object Isolation**: Each session gets its own compute instance
- **Streaming Architecture**: Low latency with progressive responses
- **Automatic Scaling**: Handles traffic spikes seamlessly

### Security

- **CORS Support**: Configurable cross-origin access
- **API Key Management**: Secure storage of AI provider credentials
- **Session Isolation**: Each agent session is isolated from others

## Integration with tldraw

The fairy-worker runs independently from the sync-worker, with its own endpoints:

- **Development**: `http://localhost:8789/stream`
- **Staging**: `https://staging-fairy.tldraw.xyz/stream`
- **Production**: `https://fairy.tldraw.xyz/stream`

Client-side integration example:

```typescript
// Client-side integration
const agentUrl =
	process.env.NODE_ENV === 'production'
		? 'https://fairy.tldraw.xyz/stream'
		: 'http://localhost:8789/stream'

const response = await fetch(agentUrl, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		messages: conversationHistory,
		canvasState: editor.store.serialize(),
	}),
})

// Handle streaming responses
const reader = response.body.getReader()
for await (const chunk of readStream(reader)) {
	// Process agent actions
	applyAgentAction(chunk)
}
```

## Service Architecture

The fairy-worker operates as a completely independent service:

```
tldraw Agent Template (Client)
        ↓
fairy-worker:8789 (AI Agent) [Independent Service]
├── AgentDurableObject (Session management)
└── AI Providers (OpenAI, Anthropic, Google)
        ↓
    Streaming Response
        ↓
    tldraw Canvas Updates

Note: Runs separately from sync-worker
- Development: localhost:8789
- Production: fairy.tldraw.xyz
```

The fairy-worker enables AI-powered features in tldraw by providing a scalable, real-time agent interaction service that bridges natural language understanding with canvas manipulation.


# ==================
# FILE: apps/dotcom/image-resize-worker/CONTEXT.md
# ==================

# Image Resize Worker Context

## Overview

The `image-resize-worker` is a Cloudflare Worker that provides on-demand image resizing and optimization services for tldraw.com. It acts as a reverse proxy that leverages Cloudflare's built-in Image Resizing service to dynamically transform and optimize images while providing intelligent caching and format conversion.

## Architecture

### Core functionality (`worker.ts`)

The worker implements a URL-based image transformation service:

#### Request flow

```typescript
// URL Pattern: /:origin/:path+ with optional query params
// Example: /localhost:3000/uploads/abc123.png?w=600&q=80

export default class Worker extends WorkerEntrypoint<Environment> {
	readonly router = createRouter().get('/:origin/:path+', async (request) => {
		const { origin, path } = request.params
		const query = parseRequestQuery(request, queryValidator)

		// Validate origin domain
		if (!this.isValidOrigin(origin)) return notFound()

		// Determine optimal format (AVIF > WebP > original)
		const accept = request.headers.get('Accept') ?? ''
		const format = accept.includes('image/avif')
			? 'avif'
			: accept.includes('image/webp')
				? 'webp'
				: null

		// Build cache key and check cache
		const cacheKey = buildCacheKey(origin, path, query, format)
		const cachedResponse = await caches.default.match(cacheKey)
		if (cachedResponse) return handleCachedResponse(cachedResponse, request)

		// Apply image transformations
		const imageOptions = buildImageOptions(query, format)
		const response = await fetchWithTransformations(origin, path, imageOptions)

		// Cache successful responses
		if (response.status === 200) {
			this.ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
		}

		return response
	})
}
```

### Image transformation options

The worker supports Cloudflare's Image Resizing parameters:

#### Query parameters

```typescript
const queryValidator = T.object({
	w: T.string.optional(), // Width in pixels
	q: T.string.optional(), // Quality (1-100)
})

// Applied as Cloudflare image options
const imageOptions: RequestInitCfPropertiesImage = {
	fit: 'scale-down', // Never upscale images
	width: query.w ? Number(query.w) : undefined,
	quality: query.q ? Number(query.q) : undefined,
	format: format || undefined, // AVIF, WebP, or original
}
```

#### Smart format selection

Automatic format optimization based on browser capabilities:

```typescript
const accept = request.headers.get('Accept') ?? ''
const format = accept.includes('image/avif')
	? 'avif' // Best compression
	: accept.includes('image/webp')
		? 'webp' // Good compression
		: null // Original format
```

### Origin validation system

Security mechanism to prevent abuse by validating request origins:

#### Development mode

```typescript
isValidOrigin(origin: string) {
  if (this.env.IS_LOCAL) {
    return true // Allow all origins in local development
  }

  return (
    origin.endsWith('.tldraw.com') ||
    origin.endsWith('.tldraw.xyz') ||
    origin.endsWith('.tldraw.dev') ||
    origin.endsWith('.tldraw.workers.dev')
  )
}
```

### Routing architecture

Two distinct routing modes based on origin:

#### Service binding mode

For internal tldraw services (multiplayer server):

```typescript
if (useServiceBinding(this.env, origin)) {
	const route = `/${path}`

	// Only allow asset upload endpoints
	if (!route.startsWith(APP_ASSET_UPLOAD_ENDPOINT)) {
		return notFound()
	}

	// Route through service binding to sync worker
	const req = new Request(passthroughUrl.href, { cf: { image: imageOptions } })
	actualResponse = await this.env.SYNC_WORKER.fetch(req)
}
```

#### External fetch mode

For direct image URLs from validated origins:

```typescript
else {
  // Direct fetch with image transformations
  actualResponse = await fetch(passthroughUrl, { cf: { image: imageOptions } })
}
```

### Caching strategy

Multi-layer caching for optimal performance:

#### Cache key generation

```typescript
const cacheKey = new URL(passthroughUrl)
cacheKey.searchParams.set('format', format ?? 'original')
for (const [key, value] of Object.entries(query)) {
	cacheKey.searchParams.set(key, value)
}
```

#### ETag handling

Proper HTTP caching with ETag support:

```typescript
// Handle cached responses with ETag validation
if (cachedResponse.status === 200) {
	const ifNoneMatch = request.headers.get('If-None-Match')
	const etag = cachedResponse.headers.get('etag')

	if (ifNoneMatch && etag) {
		const parsedEtag = parseEtag(etag)
		for (const tag of ifNoneMatch.split(', ')) {
			if (parseEtag(tag) === parsedEtag) {
				return new Response(null, { status: 304 }) // Not Modified
			}
		}
	}
}

function parseEtag(etag: string) {
	const match = etag.match(/^(?:W\/)"(.*)"$/)
	return match ? match[1] : null
}
```

## Environment configuration

### Worker environment interface

```typescript
interface Environment {
	IS_LOCAL?: string // Development mode flag
	SENTRY_DSN?: undefined // Error tracking (disabled)
	MULTIPLAYER_SERVER?: string // Service binding configuration
	SYNC_WORKER: Fetcher // Service binding to sync worker
}
```

### Deployment configuration (`wrangler.toml`)

Multi-environment setup for different stages:

#### Development environment

```toml
[env.dev]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

#### Staging environment

```toml
[env.staging]
name = "staging-image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "main-tldraw-multiplayer" }]
route = { pattern = "staging-images.tldraw.xyz", custom_domain = true }
```

#### Production environment

```toml
[env.production]
name = "image-optimizer"
services = [{ binding = "SYNC_WORKER", service = "tldraw-multiplayer" }]
route = { pattern = "images.tldraw.xyz", custom_domain = true }
```

## Dependencies

### Core worker libraries

- **@tldraw/worker-shared**: Request handling, routing, and error management utilities
- **@tldraw/dotcom-shared**: Shared constants and configurations (APP_ASSET_UPLOAD_ENDPOINT)
- **@tldraw/validate**: Type-safe input validation for query parameters
- **itty-router**: Lightweight HTTP routing for Cloudflare Workers

### Development dependencies

- **@cloudflare/workers-types**: TypeScript definitions for Workers APIs
- **wrangler**: Cloudflare Workers CLI and deployment tool

## Key features

### Image optimization

**Format conversion**: Automatic AVIF/WebP conversion based on browser support
**Quality control**: Adjustable quality settings (1-100)
**Size control**: Width-based resizing with scale-down protection
**Compression**: Cloudflare's optimized image processing pipeline

### Performance optimization

**Global caching**: Leverages Cloudflare's global cache network
**ETag support**: Proper HTTP caching with conditional requests
**Edge processing**: Image transformation at edge locations
**Service bindings**: Direct worker-to-worker communication for internal requests

### Security

**Origin validation**: Whitelist of allowed domains to prevent abuse
**Path filtering**: Asset upload endpoint validation for service bindings
**Content type validation**: Ensures responses are actual images
**No upscaling**: Prevents resource abuse with fit: 'scale-down'

## Usage patterns

### Basic image resizing

Transform any image from a valid origin:

```
GET /assets.tldraw.com/uploads/abc123.png?w=600&q=80
```

Response: Resized image at 600px width with 80% quality

### Format optimization

Browser automatically receives optimal format:

```typescript
// Request with Accept: image/avif,image/webp,image/*
GET / assets.tldraw.com / image.jpg

// Response: AVIF format (best compression) if supported
// Fallback: WebP format if AVIF not supported
// Fallback: Original JPEG format
```

### Asset upload integration

Works with tldraw's multiplayer asset system:

```typescript
// Internal routing through sync worker
GET /localhost:3000/api/uploads/asset-uuid?w=400

// Routes to: SYNC_WORKER.fetch('/api/uploads/asset-uuid', {
//   cf: { image: { width: 400, fit: 'scale-down' } }
// })
```

## Integration with tldraw ecosystem

### Asset pipeline

The image-resize-worker is part of tldraw's asset management system:

```
User Upload -> Sync Worker -> R2 Storage
     ↓
Image Request -> Image Resize Worker -> Optimized Delivery
```

### Service architecture

```
tldraw.com (Client)
├── sync-worker (Asset uploads, multiplayer)
├── image-resize-worker (Image optimization)
└── assets.tldraw.com (CDN delivery)
```

### URL structure

Different URL patterns for different use cases:

- **Direct assets**: `/assets.tldraw.com/uploads/file.png`
- **Multiplayer assets**: `/localhost:3000/api/uploads/file.png`
- **Published content**: Various origins ending in `.tldraw.com`

## Error handling

### Validation errors

- **Invalid origin**: Returns 404 for non-whitelisted domains
- **Invalid path**: Returns 404 for non-asset paths in service binding mode
- **Invalid content**: Returns 404 for non-image responses

### Graceful degradation

- **Cache miss**: Falls back to origin fetch with transformations
- **Transformation failure**: May return original image or error
- **Service binding failure**: Falls back to direct fetch mode

## Performance characteristics

### Cloudflare edge benefits

- **Global distribution**: Processing at 200+ edge locations worldwide
- **Low latency**: Image transformation close to users
- **High throughput**: Automatic scaling based on demand
- **Bandwidth optimization**: Format conversion reduces transfer sizes

### Caching efficiency

- **Cache hit rate**: High hit rate due to consistent cache keys
- **Cache duration**: Leverages browser and CDN caching
- **Cache invalidation**: ETag-based validation for freshness

## Development and testing

### Local development

```bash
yarn dev  # Starts worker with inspector on port 9339
```

### Testing

```bash
yarn test           # Run unit tests
yarn test-coverage  # Run with coverage reporting
yarn lint          # Code linting
```

### Deployment

Each environment is deployed separately:

- Development: Manual deployment for testing
- Staging: Automatic deployment for QA
- Production: Controlled deployment with rollback capability

## Key benefits

### User experience

- **Faster loading**: Optimized images load faster
- **Bandwidth savings**: Modern formats reduce data usage
- **Responsive images**: Width-based resizing for different screen sizes
- **Universal compatibility**: Fallback to supported formats

### Developer experience

- **Simple API**: URL-based transformation parameters
- **Type safety**: Full TypeScript support with validation
- **Easy integration**: Works with existing asset upload systems
- **Monitoring**: Built-in error handling and logging

### Operations

- **Scalability**: Automatic scaling with zero configuration
- **Reliability**: Global redundancy and failover capabilities
- **Cost efficiency**: Pay-per-request pricing with caching benefits
- **Maintenance**: Minimal operational overhead


# ==================
# FILE: apps/dotcom/sync-worker/CONTEXT.md
# ==================

# Sync Worker Context

## Overview

The `sync-worker` (also known as `@tldraw/dotcom-worker`) is the core multiplayer synchronization service for tldraw.com. It handles real-time collaboration, room management, file persistence, user authentication, and data synchronization across all tldraw applications. The worker operates as a distributed system using Cloudflare Workers and Durable Objects to provide scalable, low-latency collaboration worldwide.

## Architecture

### Core components

The sync-worker consists of several specialized Durable Objects and services:

#### TLDrawDurableObject - room management

The primary collaboration engine that manages individual drawing rooms:

```typescript
export class TLDrawDurableObject extends DurableObject {
	private _room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	// Handles WebSocket connections and real-time synchronization
	async onRequest(req: IRequest, openMode: RoomOpenMode) {
		// Create WebSocket pair for client communication
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		// Validate authentication and permissions
		const auth = await getAuth(req, this.env)

		// Configure room access mode (read-write, read-only, etc.)
		const room = await this.getRoom()
		room.handleSocketConnect({
			sessionId,
			socket: serverWebSocket,
			meta: { storeId, userId: auth?.userId || null },
			isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
		})
	}
}
```

#### TLUserDurableObject - user data synchronization

Manages individual user data and application-level state:

```typescript
export class TLUserDurableObject extends DurableObject<Environment> {
	private cache: UserDataSyncer | null = null

	// Handles user-specific data synchronization with Zero/Rocicorp
	// Manages user preferences, file lists, and collaborative state
}
```

#### TLPostgresReplicator - database synchronization

Replicates PostgreSQL database changes to user Durable Objects:

```typescript
export class TLPostgresReplicator extends DurableObject<Environment> {
	// Uses PostgreSQL logical replication to stream database changes
	// Distributes changes to relevant user Durable Objects
	// Ensures eventual consistency across the distributed system
}
```

### Request routing system

The worker handles multiple types of requests through a comprehensive routing system:

#### Legacy room routes

```typescript
// Read-write collaborative rooms
.get(`/${ROOM_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_WRITE)
)

// Read-only room access
.get(`/${READ_ONLY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY)
)

// Legacy read-only rooms
.get(`/${READ_ONLY_LEGACY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
)
```

#### Modern app routes

```typescript
// TLA (Tldraw App) file collaboration
.get('/app/file/:roomId', (req, env) => {
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return forwardRoomRequest(req, env)
  }
})

// User data synchronization
.get('/app/:userId/connect', async (req, env) => {
  const auth = await getAuth(req, env)
  const stub = getUserDurableObject(env, auth.userId)
  return stub.fetch(req)
})
```

#### Asset management

```typescript
// Asset uploads
.post('/app/uploads/:objectName', upload)

// Asset retrieval with optimization
.get('/app/uploads/:objectName', async (request, env, ctx) => {
  return handleUserAssetGet({
    request,
    bucket: env.UPLOADS,
    objectName: request.params.objectName,
    context: ctx,
  })
})
```

#### API endpoints

```typescript
// File creation and management
.post('/app/tldr', createFiles)

// Bookmark metadata extraction
.get('/unfurl', extractBookmarkMetadata)

// Room snapshots and history
.post('/snapshots', createRoomSnapshot)
.get('/snapshot/:roomId', getRoomSnapshot)
```

## Data persistence architecture

### Multi-layer storage system

The sync-worker uses a sophisticated multi-layer storage approach:

#### R2 object storage

Primary storage for room data and history:

```typescript
const r2 = {
  rooms: env.ROOMS,                    // Main room snapshots
  versionCache: env.ROOMS_HISTORY_EPHEMERAL, // Version history
}

// Persist room snapshot with version history
async persistToDatabase() {
  const snapshot = room.getCurrentSnapshot()
  const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })

  // Upload to main bucket
  await this.r2.rooms.put(key, JSON.stringify(snapshot))

  // Upload to version cache with timestamp
  const versionKey = `${key}/${new Date().toISOString()}`
  await this.r2.versionCache.put(versionKey, JSON.stringify(snapshot))
}
```

#### PostgreSQL database

Structured data for users, files, and metadata:

```typescript
// File metadata
const file = table('file').columns({
	id: string(),
	name: string(),
	ownerId: string(),
	shared: boolean(),
	published: boolean(),
	createdAt: number(),
	updatedAt: number(),
})

// User preferences and state
const user = table('user').columns({
	id: string(),
	name: string(),
	email: string(),
	preferences: string(), // JSON blob
})
```

#### Durable object storage

Cached state and session data:

```typescript
// Document metadata cached in DO storage
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	deleted: boolean
}
```

### Persistence strategy

The worker implements intelligent persistence with configurable intervals:

```typescript
const PERSIST_INTERVAL_MS = 8_000 // 8 seconds

// Throttled persistence to avoid excessive writes
triggerPersist = throttle(() => {
	this.persistToDatabase()
}, PERSIST_INTERVAL_MS)
```

## Real-time collaboration

### WebSocket communication

The worker manages WebSocket connections for real-time collaboration:

#### Connection establishment

```typescript
// Upgrade HTTP request to WebSocket
const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
serverWebSocket.accept()

// Validate authentication and permissions
const auth = await getAuth(req, this.env)
if (this.documentInfo.isApp && !file.shared && !auth) {
	return closeSocket(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
}

// Connect to room with appropriate permissions
room.handleSocketConnect({
	sessionId,
	socket: serverWebSocket,
	meta: { storeId, userId: auth?.userId || null },
	isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
})
```

#### Message handling

```typescript
// Real-time message processing and broadcasting
onBeforeSendMessage: ({ message, stringified }) => {
	this.logEvent({
		type: 'send_message',
		roomId: slug,
		messageType: message.type,
		messageLength: stringified.length,
	})
}
```

#### Session management

```typescript
// Automatic cleanup when users disconnect
onSessionRemoved: async (room, args) => {
	// Log user departure
	this.logEvent({
		type: 'client',
		roomId: slug,
		name: 'leave',
		instanceId: args.sessionId,
	})

	// Persist room state if last user
	if (args.numSessionsRemaining === 0) {
		await this.persistToDatabase()
		this._room = null
		room.close()
	}
}
```

### Conflict resolution

The worker uses tldraw's sync system for operational transformation:

- **Clock-based versioning**: Each change has a logical clock timestamp
- **Last-write-wins**: Simple conflict resolution for most operations
- **Presence tracking**: Real-time cursor and selection synchronization
- **Undo/redo support**: Complete operation history maintenance

## Authentication and authorization

### Multi-provider authentication

The worker supports multiple authentication providers:

#### Clerk integration

```typescript
// JWT-based authentication with Clerk
const auth = await getAuth(req, env)
if (auth) {
	// User is authenticated
	userId = auth.userId
}
```

#### Permission system

```typescript
// File-based permissions
if (file.ownerId !== auth?.userId) {
	if (!file.shared) {
		return closeSocket(TLSyncErrorCloseEventReason.FORBIDDEN)
	}
	if (file.sharedLinkType === 'view') {
		openMode = ROOM_OPEN_MODE.READ_ONLY
	}
}
```

#### Rate limiting

```typescript
// Per-user rate limiting
const rateLimited = await isRateLimited(this.env, userId)
if (rateLimited) {
	return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
}
```

## File management system

### File lifecycle

The worker manages the complete file lifecycle:

#### File creation

```typescript
// Create new tldraw files
async createFiles(req: IRequest, env: Environment) {
  const body = await req.json() as CreateFilesRequestBody
  const auth = await requireAuth(req, env)

  for (const snapshot of body.snapshots) {
    const fileId = uniqueId()
    const slug = generateSlug()

    // Create file record in database
    await db.insertInto('file').values({
      id: fileId,
      name: snapshot.name || 'Untitled',
      ownerId: auth.userId,
      slug,
      shared: false,
    }).execute()

    // Initialize room with snapshot data
    const room = getRoomDurableObject(env, fileId)
    await room.appFileRecordCreated(fileRecord)
  }
}
```

#### File updates

```typescript
// Automatic file updates when room changes
async appFileRecordDidUpdate(file: TlaFile) {
  const room = await this.getRoom()

  // Sync file name with document name
  const documentRecord = room.getRecord(TLDOCUMENT_ID) as TLDocument
  if (documentRecord.name !== file.name) {
    room.updateStore((store) => {
      store.put({ ...documentRecord, name: file.name })
    })
  }

  // Handle permission changes
  if (!file.shared) {
    // Kick out non-owners if file becomes private
    for (const session of room.getSessions()) {
      if (session.meta.userId !== file.ownerId) {
        room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.FORBIDDEN)
      }
    }
  }
}
```

#### File deletion

```typescript
// Soft deletion with cleanup
async appFileRecordDidDelete({ id, publishedSlug }: Pick<TlaFile, 'id' | 'publishedSlug'>) {
  // Close all active sessions
  const room = await this.getRoom()
  for (const session of room.getSessions()) {
    room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
  }

  // Clean up storage
  await this.env.ROOMS.delete(getR2KeyForRoom({ slug: id, isApp: true }))
  await this.env.ROOMS_HISTORY_EPHEMERAL.delete(historyKeys)
  await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)
}
```

### Asset management

#### Asset upload pipeline

```typescript
// Handle asset uploads with queue processing
.post('/app/uploads/:objectName', async (request, env) => {
  const objectName = request.params.objectName
  const auth = await requireAuth(request, env)

  // Upload to R2 bucket
  await env.UPLOADS.put(objectName, request.body)

  // Queue asset association
  await env.QUEUE.send({
    type: 'asset-upload',
    objectName,
    fileId: extractFileId(request),
    userId: auth.userId,
  })
})

// Process queue messages
async queue(batch: MessageBatch<QueueMessage>) {
  for (const message of batch.messages) {
    const { objectName, fileId, userId } = message.body

    // Associate asset with file in database
    await db.insertInto('asset').values({
      objectName,
      fileId,
      userId,
    }).execute()

    message.ack()
  }
}
```

### Publishing system

```typescript
// Publish files for public access
async publishFile(fileId: string, auth: AuthData) {
  const file = await getFileRecord(fileId)
  if (file.ownerId !== auth.userId) {
    throw new Error('Unauthorized')
  }

  const publishedSlug = generateSlug()

  // Update file record
  await db.updateTable('file').set({
    published: true,
    publishedSlug,
    lastPublished: Date.now(),
  }).where('id', '=', fileId).execute()

  // Create snapshot for published version
  const room = getRoomDurableObject(env, fileId)
  const snapshot = room.getCurrentSnapshot()
  await env.ROOM_SNAPSHOTS.put(
    getR2KeyForRoom({ slug: `${fileId}/${publishedSlug}`, isApp: true }),
    JSON.stringify(snapshot)
  )
}
```

## Environment configuration

### Multi-environment setup

The worker supports multiple deployment environments:

#### Development environment

```toml
[env.dev]
name = "dev-tldraw-multiplayer"
vars.TLDRAW_ENV = "development"
vars.MULTIPLAYER_SERVER = "http://localhost:3000"
```

#### Staging environment

```toml
[env.staging]
name = "main-tldraw-multiplayer"

[[env.staging.routes]]
zone_name = "tldraw.com"
pattern = "staging.tldraw.com/api/*"
```

#### Production environment

```toml
[env.production]
name = "tldraw-multiplayer"

[[env.production.routes]]
zone_name = "tldraw.com"
pattern = "www.tldraw.com/api/*"
```

### Durable object configuration

All environments use the same Durable Object setup:

```toml
[durable_objects]
bindings = [
  { name = "TLDR_DOC", class_name = "TLDrawDurableObject" },
  { name = "TL_PG_REPLICATOR", class_name = "TLPostgresReplicator" },
  { name = "TL_USER", class_name = "TLUserDurableObject" },
  { name = "TL_LOGGER", class_name = "TLLoggerDurableObject" },
  { name = "TL_STATS", class_name = "TLStatsDurableObject" },
]
```

### Storage bindings

Environment-specific storage configurations:

```toml
# R2 Buckets for different data types
[[env.production.r2_buckets]]
binding = "ROOMS"                    # Main room data
bucket_name = "rooms"

[[env.production.r2_buckets]]
binding = "ROOMS_HISTORY_EPHEMERAL"  # Version history
bucket_name = "rooms-history-ephemeral"

[[env.production.r2_buckets]]
binding = "UPLOADS"                  # User assets
bucket_name = "uploads"

# KV Namespaces for metadata
[[env.production.kv_namespaces]]
binding = "SLUG_TO_READONLY_SLUG"
id = "2fb5fc7f7ca54a5a9dfae1b07a30a778"
```

## Data synchronization system

### Zero/Rocicorp integration

The worker uses Zero (Rocicorp) for client-server data synchronization:

#### Schema definition

```typescript
// Shared schema between client and server
const schema = {
	version: 1,
	tables: {
		user: table('user').columns({
			id: string(),
			name: string(),
			preferences: string(),
		}),
		file: table('file').columns({
			id: string(),
			name: string(),
			ownerId: string(),
			shared: boolean(),
		}),
	},
}
```

#### Mutation system

```typescript
// Type-safe mutations with validation
const mutators = createMutators(userId)
	// Client sends mutations to server
	.post('/app/zero/push', async (req, env) => {
		const auth = await requireAuth(req, env)
		const processor = new PushProcessor(
			new ZQLDatabase(new PostgresJSConnection(makePostgresConnector(env)), schema),
			'debug'
		)
		const result = await processor.process(createMutators(auth.userId), req)
		return json(result)
	})
```

#### Real-time replication

```typescript
// PostgreSQL logical replication to Durable Objects
export class TLPostgresReplicator extends DurableObject<Environment> {
	private readonly replicationService = new LogicalReplicationService(/*...*/)

	// Stream database changes to user Durable Objects
	async handleReplicationEvent(event: ReplicationEvent) {
		for (const change of event.changes) {
			const affectedUsers = extractAffectedUsers(change)

			for (const userId of affectedUsers) {
				const userDO = getUserDurableObject(this.env, userId)
				await userDO.handleReplicationEvent(change)
			}
		}
	}
}
```

### Conflict resolution strategy

```typescript
// Optimistic updates with server reconciliation
class UserDataSyncer {
	// Apply optimistic changes immediately
	async applyOptimisticUpdate(mutation: Mutation) {
		this.optimisticUpdates.push(mutation)
		this.broadcastChange(mutation)
	}

	// Reconcile with server state
	async handleReplicationEvent(event: ReplicationEvent) {
		// Remove confirmed optimistic updates
		this.optimisticUpdates = this.optimisticUpdates.filter(
			(update) => !event.confirmedMutations.includes(update.id)
		)

		// Apply server changes
		for (const change of event.changes) {
			this.applyServerChange(change)
		}
	}
}
```

## Performance optimizations

### Caching strategy

Multiple layers of caching for optimal performance:

#### Durable object state caching

```typescript
// Cache frequently accessed data in DO memory
class TLDrawDurableObject {
	private _fileRecordCache: TlaFile | null = null

	async getAppFileRecord(): Promise<TlaFile | null> {
		if (this._fileRecordCache) {
			return this._fileRecordCache
		}

		// Fetch from database with retries
		const result = await retry(
			async () => {
				return await this.db
					.selectFrom('file')
					.where('id', '=', this.documentInfo.slug)
					.selectAll()
					.executeTakeFirst()
			},
			{ attempts: 10, waitDuration: 100 }
		)

		this._fileRecordCache = result
		return result
	}
}
```

#### Connection pooling

```typescript
// Efficient database connection management
const pool = new Pool({
	connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
	application_name: 'sync-worker',
	max: 5, // Maximum connections per DO
	idleTimeoutMillis: 30_000,
})

const db = new Kysely<DB>({
	dialect: new PostgresDialect({ pool }),
})
```

#### Throttled persistence

```typescript
// Batch database writes to reduce load
const triggerPersist = throttle(() => {
  this.persistToDatabase()
}, PERSIST_INTERVAL_MS)

// Only persist if room state actually changed
async persistToDatabase() {
  const room = await this.getRoom()
  const clock = room.getCurrentDocumentClock()

  if (this._lastPersistedClock === clock) {
    return // No changes since last persist
  }

  // Persist to R2 with version history
  await this._uploadSnapshotToR2(room, snapshot, key)
  this._lastPersistedClock = clock
}
```

### Memory management

```typescript
// Automatic resource cleanup
onSessionRemoved: async (room, args) => {
	if (args.numSessionsRemaining === 0) {
		// Persist final state
		await this.persistToDatabase()

		// Clean up room resources
		this._room = null
		room.close()

		// Log room closure
		this.logEvent({ type: 'room', roomId: slug, name: 'room_empty' })
	}
}
```

### Scalability features

#### Connection limits

```typescript
const MAX_CONNECTIONS = 50

// Prevent room overload
if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
	return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
}
```

#### Rate limiting

```typescript
// Global rate limiting per user/session
async function isRateLimited(env: Environment, identifier: string): Promise<boolean> {
	const result = await env.RATE_LIMITER.limit({ key: identifier })
	return !result.success
}
```

## Error handling and monitoring

### Comprehensive error tracking

#### Sentry integration

```typescript
// Automatic error reporting with context
const sentry = createSentry(this.ctx, this.env, request)

try {
	return await this.router.fetch(req)
} catch (err) {
	console.error(err)
	sentry?.captureException(err)
	return new Response('Something went wrong', { status: 500 })
}
```

#### Analytics and metrics

```typescript
// Real-time analytics with Cloudflare Analytics Engine
logEvent(event: TLServerEvent) {
  switch (event.type) {
    case 'client':
      this.writeEvent(event.name, {
        blobs: [event.roomId, event.instanceId],
        indexes: [event.localClientId],
      })
      break
    case 'send_message':
      this.writeEvent('send_message', {
        blobs: [event.roomId, event.messageType],
        doubles: [event.messageLength],
      })
      break
  }
}
```

#### Health monitoring

```typescript
// Health check endpoints
.get('/app/replicator-status', async (_, env) => {
  await getReplicator(env).ping()
  return new Response('ok')
})

// Debug logging in development
.get('/app/__debug-tail', (req, env) => {
  if (isDebugLogging(env)) {
    return getLogger(env).fetch(req)
  }
  return new Response('Not Found', { status: 404 })
})
```

### Graceful degradation

```typescript
// Fallback strategies for various failure modes
async loadFromDatabase(slug: string): Promise<DBLoadResult> {
  try {
    // Try R2 first
    const roomFromBucket = await this.r2.rooms.get(key)
    if (roomFromBucket) {
      return { type: 'room_found', snapshot: await roomFromBucket.json() }
    }

    // Fallback to Supabase (legacy)
    const { data, error } = await this.supabaseClient
      .from(this.supabaseTable)
      .select('*')
      .eq('slug', slug)

    if (error) {
      return { type: 'error', error: new Error(error.message) }
    }

    return data.length > 0
      ? { type: 'room_found', snapshot: data[0].drawing }
      : { type: 'room_not_found' }

  } catch (error) {
    return { type: 'error', error: error as Error }
  }
}
```

## Key features

### Real-time collaboration

- **WebSocket-based communication**: Low-latency bidirectional communication
- **Operational transformation**: Conflict-free collaborative editing
- **Presence tracking**: Real-time cursors and user awareness
- **Session management**: Automatic cleanup and resource management

### Distributed architecture

- **Edge computing**: Deployed globally on Cloudflare Workers
- **Durable Objects**: Stateful, location-pinned computing units
- **Multi-layer caching**: Memory, KV, and R2 storage optimization
- **Database replication**: PostgreSQL logical replication for consistency

### Security and authentication

- **Multi-provider auth**: Support for Clerk and other providers
- **Fine-grained permissions**: File-level access control
- **Rate limiting**: Per-user and per-session protection
- **CORS management**: Secure cross-origin resource sharing

### File management

- **Asset pipeline**: Integrated upload and optimization system
- **Version history**: Complete editing history with restore capability
- **Publishing system**: Public sharing with custom slugs
- **Soft deletion**: Recoverable file deletion with cleanup

### Performance

- **Global distribution**: Sub-100ms latency worldwide
- **Automatic scaling**: Handle traffic spikes seamlessly
- **Resource efficiency**: Intelligent persistence and cleanup
- **Connection pooling**: Optimized database connections

## Development and testing

### Local development

```bash
# Start development server
./dev.sh

# Reset database state
./reset-db.sh

# Clean durable object state
yarn clean
```

### Environment setup

```bash
# Create local environment file
cat > .dev.vars << EOF
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
EOF
```

### Testing

```bash
# Run unit tests
yarn test

# Run with coverage
yarn test-coverage

# Bundle size validation
yarn check-bundle-size
```

### Debugging

```bash
# Enable debug logging
curl -X POST https://worker-url/app/__debug-tail/clear

# WebSocket debug tail
wscat -c wss://worker-url/app/__debug-tail
```

## Key benefits

### Developer experience

- **Type safety**: Full TypeScript support across the stack
- **Hot reloading**: Fast development iteration
- **Comprehensive logging**: Detailed debugging and monitoring
- **Testing support**: Unit and integration test frameworks

### User experience

- **Instant collaboration**: Real-time synchronization without conflicts
- **Offline resilience**: Graceful handling of network issues
- **Fast loading**: Edge caching for sub-second room joining
- **Reliable persistence**: Automatic saving with version history

### Operations

- **Zero maintenance**: Serverless architecture with auto-scaling
- **Global deployment**: Automatic worldwide distribution
- **Cost efficiency**: Pay-per-request pricing model
- **Monitoring integration**: Built-in analytics and error tracking

### Architecture

- **Microservice pattern**: Specialized Durable Objects for different concerns
- **Event-driven design**: Reactive system with real-time updates
- **Eventual consistency**: Distributed system with conflict resolution
- **Horizontal scaling**: Automatic scaling based on demand

## Integration with tldraw ecosystem

### Client integration

The sync-worker integrates seamlessly with tldraw clients:

```typescript
// Client-side connection
const editor = new Editor({
	store: createTLStore({
		schema: getSchema(),
		multiplayerStatus: 'connecting',
	}),
	// Connect to sync-worker
	room: new TLMultiplayerRoom({
		host: 'https://sync.tldraw.xyz',
		roomId: 'my-room-id',
	}),
})
```

### Service architecture

```
tldraw.com (Client)
├── sync-worker (Real-time collaboration)
├── image-resize-worker (Asset optimization)
└── asset-upload-worker (File uploads)
        ↓
    PostgreSQL (Metadata)
        ↓
    R2 Storage (Room data, assets)
        ↓
    Analytics Engine (Metrics)
```

The sync-worker serves as the central coordination point for all tldraw collaborative features, providing the foundation for scalable, real-time multiplayer drawing experiences.


# ==================
# FILE: apps/dotcom/zero-cache/CONTEXT.md
# ==================

# Zero Cache Context

## Overview

The `zero-cache` is a specialized database caching and synchronization layer for tldraw's real-time collaboration system. It serves as an intermediary between the PostgreSQL database and client applications, providing efficient data synchronization using Rocicorp's Zero framework. The system enables real-time, offline-first synchronization of user data, file metadata, and collaborative state across all tldraw applications.

## Architecture

### Core components

The zero-cache system consists of several integrated components:

#### Zero server (Rocicorp Zero)

The primary synchronization engine that provides:

```typescript
// Zero server configuration
{
  replicaFile: "/data/sync-replica.db",        // Local SQLite cache
  upstreamDB: postgresConnectionString,        // Source of truth
  cvrDB: postgresConnectionString,             // Conflict resolution database
  changeDB: postgresConnectionString,          // Change log database
  authJWKSURL: "/.well-known/jwks.json",       // JWT verification
  pushURL: "/app/zero/push",                   // Mutation endpoint
  lazyStartup: true                            // Performance optimization
}
```

#### PostgreSQL database

The authoritative data source with logical replication enabled:

```sql
-- Core tables for tldraw data
CREATE TABLE "user" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "email" VARCHAR NOT NULL,
  "avatar" VARCHAR NOT NULL,
  "color" VARCHAR NOT NULL,
  "exportFormat" VARCHAR NOT NULL,
  "exportTheme" VARCHAR NOT NULL,
  "exportBackground" BOOLEAN NOT NULL,
  "exportPadding" BOOLEAN NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "flags" VARCHAR NOT NULL,
  -- User preferences (optional)
  "locale" VARCHAR,
  "animationSpeed" BIGINT,
  "edgeScrollSpeed" BIGINT,
  "colorScheme" VARCHAR,
  "isSnapMode" BOOLEAN,
  "isWrapMode" BOOLEAN,
  "isDynamicSizeMode" BOOLEAN,
  "isPasteAtCursorMode" BOOLEAN
);

CREATE TABLE "file" (
  "id" VARCHAR PRIMARY KEY,
  "name" VARCHAR NOT NULL,
  "ownerId" VARCHAR NOT NULL,
  "thumbnail" VARCHAR NOT NULL,
  "shared" BOOLEAN NOT NULL,
  "sharedLinkType" VARCHAR NOT NULL,
  "published" BOOLEAN NOT NULL,
  "lastPublished" BIGINT NOT NULL,
  "publishedSlug" VARCHAR NOT NULL,
  "createdAt" BIGINT NOT NULL,
  "updatedAt" BIGINT NOT NULL,
  "isEmpty" BOOLEAN NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "file_state" (
  "userId" VARCHAR NOT NULL,
  "fileId" VARCHAR NOT NULL,
  "firstVisitAt" BIGINT,
  "lastEditAt" BIGINT,
  "lastSessionState" VARCHAR,
  "lastVisitAt" BIGINT,
  PRIMARY KEY ("userId", "fileId"),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE
);
```

#### PgBouncer connection pool

Efficient connection pooling for database access:

```ini
[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction    # Efficient transaction-level pooling
max_client_conn = 450     # High concurrency support
default_pool_size = 100   # Connection pool size
max_prepared_statements = 10
```

### Data synchronization flow

The zero-cache implements a sophisticated data flow:

#### 1. Database change detection

PostgreSQL logical replication streams changes to Zero:

```sql
-- Enable logical replication
CREATE PUBLICATION zero_data FOR TABLE file, file_state, public.user;

-- Full replica identity for complete change tracking
ALTER TABLE file REPLICA IDENTITY FULL;
ALTER TABLE file_state REPLICA IDENTITY FULL;
```

#### 2. Local caching

Zero maintains a local SQLite replica for performance:

```
PostgreSQL (Source of Truth)
     ↓ (Logical Replication)
SQLite Replica (/data/sync-replica.db)
     ↓ (Real-time sync)
Client Applications
```

#### 3. Conflict resolution

Zero handles conflicts using Conflict-Free Replicated Data Types (CRDTs):

- **Last-write-wins**: For simple field updates
- **Causal ordering**: For maintaining operation sequences
- **Vector clocks**: For distributed state tracking

## Database schema evolution

### Migration system

The zero-cache includes a comprehensive migration system:

```typescript
// Migration runner with transactional safety
const migrate = async (summary: string[], dryRun: boolean) => {
	await db.transaction().execute(async (tx) => {
		const appliedMigrations = await sql`
      SELECT filename FROM migrations.applied_migrations
    `.execute(tx)

		for (const migration of migrations) {
			if (!appliedMigrations.includes(migration)) {
				const migrationSql = readFileSync(`./migrations/${migration}`, 'utf8')
				await sql.raw(migrationSql).execute(tx)
				await sql`
          INSERT INTO migrations.applied_migrations (filename) VALUES (${migration})
        `.execute(tx)
			}
		}
	})
}
```

### Schema evolution examples

Key migrations that shaped the current schema:

#### User preferences enhancement

```sql
-- Migration 019: Add keyboard shortcuts preference
ALTER TABLE "user" ADD COLUMN "areKeyboardShortcutsEnabled" BOOLEAN;

-- Migration 020: Add UI labels preference
ALTER TABLE "user" ADD COLUMN "showUiLabels" BOOLEAN;
```

#### File sharing and collaboration

```sql
-- Migration 006: Soft deletion support
ALTER TABLE "file" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE;

-- Migration 008: File pinning
ALTER TABLE "file_state" ADD COLUMN "isPinned" BOOLEAN;

-- Migration 004: Guest access
ALTER TABLE "file_state" ADD COLUMN "isFileOwner" BOOLEAN;
```

#### Asset management

```sql
-- Migration 010: Asset information
CREATE TABLE "asset" (
  "objectName" VARCHAR PRIMARY KEY,
  "fileId" VARCHAR NOT NULL,
  "userId" VARCHAR,
  FOREIGN KEY ("fileId") REFERENCES "file" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL
);
```

### Database triggers

Automated data consistency through triggers:

```sql
-- Automatically clean up file states when sharing is disabled
CREATE OR REPLACE FUNCTION delete_file_states() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.shared = TRUE AND NEW.shared = FALSE THEN
    DELETE FROM file_state
    WHERE "fileId" = OLD.id AND OLD."ownerId" != "userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER file_shared_update
AFTER UPDATE OF shared ON file
FOR EACH ROW
EXECUTE FUNCTION delete_file_states();
```

## Development environment

### Docker composition

Local development stack with Docker Compose:

```yaml
services:
  zstart_postgres:
    image: simonfuhrer/postgresql:16.1-wal2json
    environment:
      POSTGRES_USER: user
      POSTGRES_DB: postgres
      POSTGRES_PASSWORD: password
    command: |
      postgres 
      -c wal_level=logical           # Enable logical replication
      -c max_wal_senders=10          # Multiple replication slots
      -c max_replication_slots=5     # Concurrent replications
      -c max_connections=300         # High concurrency
      -c hot_standby=on             # Read replicas support
      -c hot_standby_feedback=on    # Replication feedback
    ports:
      - 6543:5432
    volumes:
      - tlapp_pgdata:/var/lib/postgresql/data

  pgbouncer:
    image: edoburu/pgbouncer:latest
    ports:
      - '6432:6432'
    environment:
      DATABASE_URL: postgres://user:password@zstart_postgres:5432/postgres
```

### Development workflow

```bash
# Start the complete development environment
yarn dev

# This concurrently runs:
# 1. Docker containers (postgres + pgbouncer)
# 2. Database migrations
# 3. Schema bundling and watching
# 4. Zero cache server
```

#### Schema bundling

Dynamic schema compilation for Zero:

```bash
# Bundle the shared schema for Zero consumption
esbuild --bundle --platform=node --format=esm \
  --outfile=./.schema.js \
  ../../../packages/dotcom-shared/src/tlaSchema.ts

# Watch mode for development
nodemon --watch ./.schema.js \
  --exec 'zero-cache-dev -p ./.schema.js' \
  --signal SIGINT
```

### Environment management

Environment variables for different deployment stages:

#### Development

```bash
BOTCOM_POSTGRES_POOLED_CONNECTION_STRING="postgresql://user:password@127.0.0.1:6432/postgres"
ZERO_REPLICA_FILE="/tmp/sync-replica.db"
```

#### Production (Fly.io template)

```toml
[env]
ZERO_REPLICA_FILE = "/data/sync-replica.db"
ZERO_UPSTREAM_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CVR_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_CHANGE_DB = "__BOTCOM_POSTGRES_CONNECTION_STRING"
ZERO_AUTH_JWKS_URL = "https://clerk.staging.tldraw.com/.well-known/jwks.json"
ZERO_PUSH_URL = "__ZERO_PUSH_URL"
ZERO_LAZY_STARTUP = 'true'
```

## Data model and relationships

### User management

Complete user profile and preferences:

```typescript
interface User {
	id: string // Unique user identifier
	name: string // Display name
	email: string // Authentication email
	avatar: string // Profile image URL
	color: string // User color for collaboration

	// Export preferences
	exportFormat: 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background in exports
	exportPadding: boolean // Add padding to exports

	// Editor preferences
	locale?: string // Language/region
	animationSpeed?: number // UI animation timing
	edgeScrollSpeed?: number // Canvas edge scrolling speed
	colorScheme?: 'light' | 'dark' // UI theme preference
	areKeyboardShortcutsEnabled?: boolean // Keyboard shortcuts toggle
	enhancedA11yMode?: boolean // Enhanced accessibility mode

	// Drawing preferences
	isSnapMode?: boolean // Shape snapping
	isWrapMode?: boolean // Text wrapping
	isDynamicSizeMode?: boolean // Dynamic shape sizing
	isPasteAtCursorMode?: boolean // Paste behavior

	// Metadata
	createdAt: number // Account creation timestamp
	updatedAt: number // Last update timestamp
	flags: string // Feature flags (JSON)
}
```

### File management

Comprehensive file metadata and sharing:

```typescript
interface File {
	id: string // Unique file identifier
	name: string // File display name
	ownerId: string // Owner user ID
	thumbnail: string // Preview image URL

	// Sharing configuration
	shared: boolean // Public sharing enabled
	sharedLinkType: 'view' | 'edit' // Sharing permissions

	// Publishing
	published: boolean // Published to public gallery
	lastPublished: number // Last publication timestamp
	publishedSlug: string // Public URL slug

	// State tracking
	isEmpty: boolean // File has no content
	isDeleted?: boolean // Soft deletion flag
	createSource?: string // Source for file creation

	// Metadata
	createdAt: number // File creation timestamp
	updatedAt: number // Last modification timestamp
}
```

### User-File relationships

Per-user file interaction state:

```typescript
interface FileState {
	userId: string // User identifier
	fileId: string // File identifier

	// Visit tracking
	firstVisitAt?: number // Initial access timestamp
	lastVisitAt?: number // Recent access timestamp
	lastEditAt?: number // Recent edit timestamp

	// Session state
	lastSessionState?: string // Saved editor state (JSON)

	// User relationship
	isFileOwner?: boolean // User owns this file
	isPinned?: boolean // File pinned to user's list
}
```

### Mutation tracking

Change tracking for synchronization:

```typescript
interface UserMutationNumber {
	userId: string // User identifier
	mutationNumber: number // Last processed mutation ID
}
```

## Real-time synchronization

### Client-server protocol

Zero implements a sophisticated sync protocol:

#### Initial data loading

```typescript
// Client connects and receives initial dataset
const zero = new Zero({
	server: 'https://zero-cache.tldraw.com',
	auth: () => getAuthToken(),
	schema: tldrawSchema,
})

// Zero automatically syncs relevant user data
const files = await zero.query.file.where('ownerId', userId).or('shared', true).run()
```

#### Real-time updates

```typescript
// Client mutations are immediately optimistic
await zero.mutate.file.update({
	id: fileId,
	name: 'Updated Name',
})

// Server processes and broadcasts changes
// Conflicts resolved automatically using CRDTs
```

#### Offline support

```typescript
// Zero maintains local state during disconnection
// Queues mutations for replay when reconnected
// Handles conflict resolution upon reconnection
```

### Conflict resolution strategies

Zero employs multiple conflict resolution approaches:

#### Last-write-wins (LWW)

```typescript
// Simple fields use timestamp-based resolution
if (serverChange.timestamp > localChange.timestamp) {
	applyServerChange(serverChange)
} else {
	keepLocalChange(localChange)
}
```

#### Causal consistency

```typescript
// Operations maintain causal ordering
// Vector clocks ensure proper sequencing
// Prevents causality violations
```

#### Set-based cRDTs

```typescript
// Collections use add/remove semantics
// Convergence guaranteed regardless of order
// No conflicts for set operations
```

## Production deployment

### Fly.io configuration

The zero-cache deploys to Fly.io with specialized configuration:

#### Resource allocation

```toml
[[vm]]
memory = "2gb"          # Sufficient for caching and processing
cpu_kind = "shared"     # Cost-effective shared CPUs
cpus = 2               # Dual-core for concurrency

[http_service]
internal_port = 4848            # Zero server port
force_https = true             # Security requirement
auto_stop_machines = "off"     # Always-on for real-time sync
min_machines_running = 1       # High availability
```

#### Persistent storage

```toml
[mounts]
source = "sqlite_db"          # Persistent volume for replica
destination = "/data"         # Mount point for SQLite file
```

#### Health monitoring

```toml
[[http_service.checks]]
grace_period = "10s"          # Startup grace period
interval = "30s"              # Health check frequency
method = "GET"                # HTTP health endpoint
timeout = "5s"                # Request timeout
path = "/"                    # Health check path
```

### Production considerations

#### Database configuration

```sql
-- Production PostgreSQL settings for logical replication
wal_level = logical                    -- Enable change streaming
max_wal_senders = 20                   -- Multiple replicas
max_replication_slots = 10             -- Concurrent replication
max_connections = 500                  -- High concurrency
shared_preload_libraries = 'wal2json'  -- JSON change format
```

#### Connection pooling

```ini
# Production PgBouncer configuration
[pgbouncer]
pool_mode = transaction               # Efficient pooling
max_client_conn = 1000               # High concurrency
default_pool_size = 200              # Large pool
max_prepared_statements = 50         # Statement caching
query_wait_timeout = 30              # Timeout protection
```

#### Monitoring and alerting

```typescript
// Built-in Zero metrics
{
  replicationLag: number,            // Sync delay from PostgreSQL
  activeConnections: number,         // Current client count
  mutationRate: number,              // Changes per second
  conflictRate: number,              // Conflicts per second
  cacheHitRatio: number             // Local cache effectiveness
}
```

## Performance optimizations

### Caching strategy

Multi-layer caching for optimal performance:

#### Local SQLite replica

```typescript
// Zero maintains local copy of relevant data
// Eliminates network round-trips for reads
// Instant query responses from local cache
const localData = await zero.query.local.file.findMany()
```

#### Query optimization

```typescript
// Zero optimizes queries automatically
// Indexes created based on query patterns
// Batch loading for related data
const filesWithStates = await zero.query.file
	.include({ states: true })
	.where('ownerId', userId)
	.run()
```

#### Connection efficiency

```typescript
// Single persistent connection per client
// Multiplexed operations over WebSocket
// Automatic reconnection with backoff
const zero = new Zero({
	server: 'wss://zero-cache.tldraw.com',
	reconnect: {
		maxAttempts: Infinity,
		backoff: 'exponential',
		maxDelay: 30000,
	},
})
```

### Scalability features

#### Horizontal scaling

```toml
# Multiple Zero cache instances
# Load balanced across regions
# Each instance maintains subset of data
# Automatic failover and recovery
```

#### Resource management

```typescript
// Memory-efficient data structures
// Lazy loading of large datasets
// Automatic garbage collection
// Connection pooling and reuse
```

#### Network optimization

```typescript
// Delta compression for changes
// Binary protocol for efficiency
// Request batching and coalescing
// Intelligent prefetching
```

## Maintenance and operations

### Database maintenance

#### Migration management

```bash
# Apply new migrations
yarn migrate

# Dry-run to preview changes
yarn migrate --dry-run

# View migration status
yarn migrate --status
```

#### Data cleanup

```bash
# Complete environment reset
yarn clean

# This removes:
# - Docker volumes
# - SQLite replica files
# - Cached schema bundles
```

#### Backup and recovery

```sql
-- PostgreSQL logical backup
pg_dump --format=custom --verbose \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  --file=backup.dump

-- Restore from backup
pg_restore --verbose --clean --no-acl --no-owner \
  --host=postgres.tldraw.com \
  --dbname=postgres \
  backup.dump
```

### Monitoring and debugging

#### Performance monitoring

```typescript
// Zero provides built-in metrics
{
  syncLatency: number,              // Client-server sync time
  queryPerformance: {
    averageTime: number,            // Average query execution
    slowQueries: Array<{
      sql: string,
      duration: number
    }>
  },
  connectionHealth: {
    activeConnections: number,
    failedConnections: number,
    reconnectAttempts: number
  }
}
```

#### Error tracking

```typescript
// Comprehensive error logging
zero.on('error', (error) => {
	console.error('Zero Cache Error:', {
		type: error.type,
		message: error.message,
		stack: error.stack,
		context: error.context,
	})
})
```

#### Debug logging

```bash
# Enable debug logging
LOG_LEVEL=debug yarn zero-server

# Trace-level logging for deep debugging
LOG_LEVEL=trace yarn zero-server
```

## Key features

### Real-time synchronization

- **Instant updates**: Changes appear immediately across all connected clients
- **Offline support**: Full functionality during network disconnection
- **Conflict resolution**: Automatic handling of concurrent modifications
- **Selective sync**: Only relevant data synchronized per user

### Developer experience

- **Type safety**: Full TypeScript integration with generated types
- **Schema evolution**: Safe database migrations with rollback support
- **Hot reloading**: Automatic schema updates during development
- **Testing support**: In-memory mode for unit testing

### Production ready

- **High availability**: Multi-region deployment with failover
- **Scalability**: Horizontal scaling across multiple instances
- **Performance**: Sub-millisecond query responses from local cache
- **Reliability**: Transactional consistency with automatic recovery

### Data consistency

- **ACID transactions**: Full transactional support for complex operations
- **Causal consistency**: Operations maintain proper ordering
- **Eventual consistency**: Guaranteed convergence across all clients
- **Schema validation**: Type-safe data with runtime validation

## Integration with tldraw ecosystem

### Client integration

Zero-cache integrates seamlessly with tldraw applications:

```typescript
// React integration
const useFiles = () => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('ownerId', userId).run())
}

// Real-time subscriptions
const useFileUpdates = (fileId: string) => {
	const zero = useZero()
	return zero.useQuery((z) => z.file.where('id', fileId).run())
}
```

### Service architecture

```
tldraw.com Client
├── Zero Cache (Real-time sync)
├── Sync Worker (WebSocket rooms)
└── PostgreSQL (Source of truth)
     ↓
Logical Replication
     ↓
Zero Server (Conflict resolution)
     ↓
SQLite Replica (Local cache)
     ↓
Client Applications (Offline-first)
```

### Data flow

```
User Action (Client)
     ↓
Optimistic Update (Immediate UI)
     ↓
Zero Mutation (Background sync)
     ↓
PostgreSQL Update (Persistent)
     ↓
Logical Replication (Change stream)
     ↓
Zero Server Processing (Conflict resolution)
     ↓
Client Synchronization (Real-time updates)
```

The zero-cache serves as the foundational data synchronization layer for tldraw's collaborative ecosystem, enabling real-time, offline-first user experiences while maintaining data consistency and providing excellent developer ergonomics.


# ==================
# FILE: apps/examples/CONTEXT.md
# ==================

# Examples App Context

This is the tldraw SDK examples application - a comprehensive showcase and development environment for demonstrating tldraw capabilities. It hosts over 130 example implementations showing different features, integrations, and use cases.

## Purpose & deployment

**Development**: When you run `yarn dev` from the repository root, this examples app runs at localhost:5420
**Production**: Deployed to [examples.tldraw.com](https://examples.tldraw.com) with each SDK release. Deployed to [examples-canary.tldraw.com](https://examples-canary.tldraw.com) with each push to main
**Documentation Integration**: Individual examples are iframed into the [tldraw.dev examples section](https://tldraw.dev/examples)
**Preview Deployments**: Each PR gets a preview deployment, and canary versions deploy to examples-canary.tldraw.com

## Architecture

### Core structure

- **Entry point**: `src/index.tsx` - Main application entry
- **Example wrapper**: `src/ExampleWrapper.tsx` - Provides consistent layout and error boundaries
- **Example registry**: `src/examples.tsx` - Central registry of all examples with metadata
- **Example pages**: `src/ExamplePage.tsx` - Individual example page component

### Example organization

Each example lives in its own directory under `src/examples/` following these patterns:

- **Folder naming**: kebab-case (e.g., `custom-shape`, `sync-demo`)
- **Required files**:
  - `README.md` with frontmatter metadata
  - Main component file ending with `Example.tsx`
- **Optional files**: CSS files, supporting components, utilities

### Categories

Examples are organized into these categories:

- `getting-started` - Basic usage patterns
- `configuration` - Editor setup and options
- `editor-api` - Core editor API usage
- `ui` - User interface customization
- `layout` - Canvas and viewport control
- `events` - Event handling and interactivity
- `shapes/tools` - Custom shapes and tools
- `collaboration` - Multi-user features
- `data/assets` - Data management and asset handling
- `use-cases` - Complete application scenarios

## Example types

### Core SDK examples

- **Basic usage**: Simple editor setups (`basic`, `readonly`)
- **Configuration**: Editor options (`hide-ui`, `dark-mode-toggle`)
- **API integration**: Editor methods (`api`, `canvas-events`)

### Customization examples

- **Custom shapes**: New shape types (`custom-shape`, `ag-grid-shape`)
- **Custom tools**: Interactive tools (`custom-tool`, `lasso-select-tool`)
- **Custom UI**: Interface modifications (`custom-ui`, `toolbar-groups`)
- **Custom styling**: Visual customization (`custom-grid`, `frame-colors`)

### Advanced features

- **Collaboration**: Real-time sync (`sync-demo`, `sync-custom-presence`)
- **Bindings**: Shape relationships (`pin-bindings`, `layout-bindings`)
- **Export/import**: Data exchange (`export-canvas-as-image`, `snapshots`)
- **Complex interactions**: Advanced behaviors (`drag-and-drop`, `interactive-shape`)

### Use case demonstrations

- **PDF editor**: Complete PDF annotation tool
- **Image annotator**: Image markup interface
- **Slides**: Presentation creation tool
- **Education canvas**: Learning-focused interface

## Development workflow

### Adding new examples

1. Create folder in `src/examples/` with kebab-case name
2. Add `README.md` with proper frontmatter:

   ```md
   ---
   title: Example Name
   component: ./ExampleComponent.tsx
   category: appropriate-category
   priority: number
   keywords: [relevant, search, terms]
   ---

   ## One-line summary

   Detailed description
   ```

3. Create main component file ending with `Example.tsx`
4. Follow established patterns for layout and styling

### Example component pattern

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function YourExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

### Code style guidelines

- Use numbered footnote comments: `// [1]`, `// [2]` with explanations at bottom
- Keep examples focused and minimal for "tight" examples
- Add realistic UI for "use-case" examples
- External CSS files should match example name
- Avoid inline styles unless necessary

## Testing & quality

### Available commands

- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-ui` - Run E2E tests with Playwright UI
- `yarn test` - Run unit tests (if any)
- `yarn lint` - Lint the codebase
- `yarn build` - Build for production

### Testing infrastructure

- **E2E tests**: Located in `e2e/` directory using Playwright
- **Performance tests**: Dedicated performance testing suite
- **Error boundaries**: Built-in error handling for example failures

## Key dependencies

### Core tldraw packages

- `tldraw` - Main SDK with full UI
- `@tldraw/editor` - Core editor (some examples use editor-only)
- `@tldraw/state` - Reactive state management
- `@tldraw/sync` - Collaboration features

### Supporting libraries

- `react-router-dom` - Client-side routing
- `@tiptap/core` - Rich text editing (some examples)
- `pdf-lib` - PDF manipulation (PDF examples)
- `ag-grid-react` - Data grid component (grid examples)

## Important files

### Configuration

- `vite.config.ts` - Vite build configuration with example discovery
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Core application files

- `src/examples.tsx` - Example registry and metadata
- `src/ExampleWrapper.tsx` - Layout wrapper with error boundaries
- `src/hooks/` - Shared hooks for performance monitoring, debugging
- `writing-examples.md` - Comprehensive guide for creating examples

## Development notes

- Examples should demonstrate single concepts clearly
- Use the existing example patterns and conventions
- Read `writing-examples.md` before creating new examples
- Test examples in both development and production builds
- Consider both desktop and mobile experiences
- Follow the established categorization system for discoverability


# ==================
# FILE: apps/vscode/CONTEXT.md
# ==================

# VSCode Extension (apps/vscode)

The tldraw VS Code extension enables users to create, view, and edit `.tldr` files directly within VS Code, bringing the full tldraw infinite canvas experience to the editor.

## Architecture overview

This application consists of two main components:

### Extension (`apps/vscode/extension/`)

The VS Code extension itself, built in TypeScript:

- **Entry point**: `src/extension.ts` - Main activation function and extension lifecycle
- **Editor provider**: `src/TldrawEditorProvider.ts` - Custom editor provider for .tldr files
- **Webview manager**: `src/TldrawWebviewManager.ts` - Manages webview communication
- **Document handling**: `src/TldrawDocument.ts` - Document model for .tldr files
- **File operations**: `src/file.ts` - File I/O utilities for .tldr files
- **Utilities**: `src/utils.ts`, `src/unfurl.ts`, `src/media.ts` - Supporting functionality

### Editor (`apps/vscode/editor/`)

A React-based webview application that renders the tldraw editor:

- **Entry point**: `src/index.tsx` - React app initialization
- **Main app**: `src/app.tsx` - Core tldraw editor component
- **File handling**: `src/FileOpen.tsx` - File open/import UI
- **Change tracking**: `src/ChangeResponder.tsx` - Handles editor state changes
- **Messages**: `src/FullPageMessage.tsx` - Error/loading states
- **Utils**: `src/utils/` - RPC communication, bookmarks, external content handling

## Key features

**File support**

- Opens `.tldr` and `.tldr.json` files
- Creates new tldraw files via command palette
- Bidirectional compatibility with tldraw.com web app

**Editor integration**

- Custom VS Code editor provider for seamless integration
- Keyboard shortcuts for zoom and dark mode toggle
- Hot reload support in development mode
- Webview-based rendering using the full tldraw SDK

**Communication**

- RPC-based communication between extension and webview
- Real-time file change synchronization
- External content handling for links and embeds

## Development commands

**Extension development**

- `yarn dev` - Start extension development with hot reload
- `yarn build` - Build extension and editor for production
- `yarn package` - Create .vsix package for distribution

**Editor development**

- `yarn dev` (from editor/) - Start editor development server
- `yarn build` (from editor/) - Build editor bundle

## Extension configuration

The extension contributes:

- Custom editor for `.tldr` files
- Command palette command "tldraw: New Project"
- Keyboard shortcuts for zoom and dark mode
- File type associations for `.tldr` and `.tldr.json`

## Build system

- Extension uses esbuild for fast compilation
- Editor uses esbuild with React/JSX support
- Webpack used for extension packaging
- TypeScript with strict settings for type safety

## Publishing

- Pre-releases: Automatic on `main` branch merges
- Production releases: Automatic on `production` branch merges
- Manual publishing via `yarn publish` command
- Direct .vsix downloads available from repository

## Key dependencies

- **VS Code API**: Core extension functionality
- **tldraw**: Full tldraw SDK for editor capabilities
- **React/ReactDOM**: UI framework for webview
- **fs-extra**: Enhanced file system operations
- **esbuild**: Fast TypeScript/React compilation
- **cheerio**: HTML parsing for unfurling
- **node-fetch**: HTTP requests for external content


# ==================
# FILE: internal/apps-script/CONTEXT.md
# ==================

# @internal/apps-script

This package contains the Google Apps Script configuration and build tooling for integrating tldraw as a Google Meet add-on.

## Purpose

Provides tldraw functionality within Google Meet through Google Apps Script add-ons, allowing users to collaborate on infinite canvas drawings during video calls.

## Architecture

### Core components

**appsscript.json** - Google Apps Script manifest

- Defines Meet add-on configuration with side panel and main stage URIs
- Configures OAuth scopes for Google services integration
- Sets up URL fetch whitelist for tldraw domains
- Uses placeholder `TLDRAW_HOST` replaced during build

**build-workspace-app.ts** - Build script

- Copies configuration to `dist/` directory
- Replaces `TLDRAW_HOST` placeholder with production/staging URLs
- Generates `.clasp.json` with appropriate Google Apps Script IDs
- Handles production vs staging environment configuration

### Build process

The build system:

1. Clears `dist/` directory
2. Copies `appsscript.json` to `dist/`
3. Replaces `TLDRAW_HOST` with environment-specific URL
4. Generates `.clasp.json` with correct script ID

### Environment configuration

**Production**: `https://www.tldraw.com`

- Script ID: `1FWcAvz7Rl4iPXQX3KmXm2mNG_RK2kryS7Bja8Y7RHvuAHnic51p_pqe7`

**Staging**: `https://staging.tldraw.com`

- Script ID: `1cJfZM0M_rGU-nYgG-4KR1DnERb7itkCsl1QmlqPxFvHnrz5n6Gfy8iht`

## Google Apps Script integration

### Add-on configuration

- **Side panel URI**: `/ts-side` - Compact tldraw interface for Meet sidebar
- **Main stage URI**: `/ts` - Full tldraw interface for screen sharing
- **Screen sharing support**: Enabled for presenting drawings to all participants

### OAuth scopes

Required permissions:

- User profile and email access
- Google Docs integration (current document only)
- External request capabilities for tldraw API calls
- Workspace link preview functionality

## Development workflow

### Setup commands

```bash
yarn glogin    # Login to Google Apps Script
yarn glogout   # Logout from Google Apps Script
yarn gcreate   # Create new Apps Script project
```

### Build & deploy

```bash
yarn build           # Build for production
yarn build:staging   # Build for staging
yarn gpush           # Deploy to production
yarn gpush:staging   # Deploy to staging
yarn gpull           # Pull from production
yarn gpull:staging   # Pull from staging
```

## Dependencies

- **@google/clasp**: Google Apps Script CLI tool for deployment
- **@types/google-apps-script**: TypeScript definitions for Apps Script APIs

## Integration points

This package connects tldraw with Google Meet by:

1. Providing Apps Script manifest configuration
2. Enabling tldraw URLs as trusted add-on origins
3. Supporting both sidebar and full-screen presentation modes
4. Handling authentication through Google's OAuth system

The actual tldraw functionality is served from the main tldraw.com application, with this package providing the Google Apps Script wrapper for Meet integration.


# ==================
# FILE: internal/config/CONTEXT.md
# ==================

# Internal Config Package

This package provides shared configuration files and utilities for the tldraw monorepo's build system, testing, and development tools.

## Purpose

The `@internal/config` package centralizes common configuration to ensure consistency across all packages in the monorepo. It includes TypeScript configurations, API documentation settings, and testing utilities.

## Key files

### TypeScript configuration

- **`tsconfig.base.json`** - Base TypeScript configuration extended by all packages
  - Enables strict mode, composite builds, and declaration generation
  - Configured for React JSX and modern ES modules
  - Includes Vitest globals for testing

- **`tsconfig.json`** - Package-specific TypeScript configuration

### API documentation

- **`api-extractor.json`** - Microsoft API Extractor configuration for generating consistent API documentation and validating public API surfaces across packages

### Testing configuration

- **`vitest/setup.ts`** - Global test setup and polyfills
  - Canvas mocking for browser-based tests
  - Animation frame polyfills
  - Text encoding utilities
  - Custom Jest-style matchers

- **`vitest/node-preset.ts`** - Node.js-specific Vitest configuration preset

## Usage

Other packages in the monorepo extend these configurations:

```json
{
	"extends": "config/tsconfig.base.json"
}
```

The testing setup is imported in package-specific Vitest configs to ensure consistent test environments across the monorepo.

## Dependencies

- **@jest/expect-utils** - Utilities for custom test matchers
- **@peculiar/webcrypto** - WebCrypto API polyfill for Node.js environments
- **jest-matcher-utils** - Formatting utilities for test output
- **lazyrepo** - Build system integration
- **vitest-canvas-mock** - Canvas API mocking for tests


# ==================
# FILE: internal/dev-tools/CONTEXT.md
# ==================

# Dev Tools Context

## Overview

The `@internal/dev-tools` package provides internal development tools for the tldraw team. This is a private package that contains utilities to help with development workflows and debugging.

## Package structure

```
internal/dev-tools/
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx            # React app entry point
│   ├── index.html          # HTML template
│   ├── styles.css          # Global styles
│   └── Bisect/             # Git bisect helper tool
│       ├── Bisect.tsx      # Main bisect component
│       ├── BisectButton.tsx # UI button component
│       ├── PrItem.tsx      # PR list item component
│       └── pr-numbers.ts   # PR data
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Features

### Git bisect tool

The primary feature is a web-based git bisect helper tool that:

- **PR testing**: Allows developers to test different PR preview deployments
- **Binary search**: Implements git bisect logic to find problematic PRs
- **Preview links**: Automatically opens PR preview deployments for testing
- **Interactive UI**: Mark PRs as "good" or "bad" to narrow down issues
- **Progress tracking**: Shows current bisect position and remaining candidates

The tool uses PR preview deployments at `https://pr-{number}-preview-deploy.tldraw.com/` to test different versions.

## Architecture

### Technology stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS**: Vanilla CSS styling

### Key components

- `Bisect.tsx`: Main bisect logic and state management
- `BisectButton.tsx`: Reusable button component
- `PrItem.tsx`: Individual PR item with good/bad marking
- `pr-numbers.ts`: List of PR numbers to bisect through

## Development

### Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

### Usage

1. Start the dev server: `yarn dev`
2. Click "Start bisect" to begin
3. Test the behavior in the preview links
4. Mark PRs as "good" or "bad"
5. Continue until the problematic PR is identified

## Integration

This tool is designed for internal use by the tldraw development team to:

- Debug regressions between releases
- Identify which PR introduced a bug
- Streamline the bisect process with visual tools
- Test preview deployments efficiently

The tool assumes access to tldraw's PR preview deployment infrastructure.


# ==================
# FILE: internal/health-worker/CONTEXT.md
# ==================

# Health Worker

A Cloudflare Worker that processes webhooks from [Updown](https://updown.io/) health monitoring service and forwards health status alerts to Discord.

## Architecture

**Cloudflare Worker** - Serverless function deployed on Cloudflare's edge network

- Receives HTTP webhooks from Updown monitoring service
- Transforms health events into Discord message format
- Forwards formatted messages to Discord via webhook

## Core components

**src/index.ts** - Main worker handler

- HTTP request routing and environment validation
- Processes arrays of Updown events
- Error handling and response management

**src/discord.ts** - Discord integration

- Transforms Updown events into Discord embed format
- Handles different event types (down, up, SSL issues, performance)
- Color-coded alerts (red for down, green for up, orange for warnings)

**src/updown_types.ts** - Type definitions for Updown webhook payload structure

## Event types handled

- `check.down` - Service goes down (red alert)
- `check.up` - Service comes back up (green alert)
- `check.still_down` - Ignored to prevent spam
- `check.ssl_invalid` - SSL certificate issues (red alert)
- `check.ssl_valid` - SSL certificate restored (green alert)
- `check.ssl_expiration` - SSL expiring soon (orange warning)
- `check.ssl_renewed` - SSL certificate renewed (green alert)
- `check.performance_drop` - Performance degradation (orange warning)

## Configuration

**Environment variables**

- `DISCORD_HEALTH_WEBHOOK_URL` - Discord webhook URL for sending alerts
- `HEALTH_WORKER_UPDOWN_WEBHOOK_PATH` - Secret path for Updown webhooks (security measure)

**Deployment**

- Uses Wrangler CLI for deployment to Cloudflare Workers
- Multiple environments: dev, staging, production
- Bundle size monitored (40KB limit)

## Security

- Webhook path acts as shared secret to prevent unauthorized alerts
- Only processes requests to the configured webhook path
- Returns 404 for all other requests

## Dependencies

- `@tldraw/utils` - Utility functions (exhaustiveSwitchError)
- `discord-api-types` - TypeScript types for Discord API
- `@cloudflare/workers-types` - Cloudflare Workers runtime types


# ==================
# FILE: internal/scripts/CONTEXT.md
# ==================

# @tldraw/scripts

Build scripts and development tooling for the tldraw monorepo.

## Overview

This package contains TypeScript scripts and utilities that support the tldraw development workflow, including build automation, deployment, testing, publishing, and maintenance tasks.

## Key scripts

### Build & development

- `api-check.ts` - Validates public API consistency across packages using Microsoft API Extractor
- `build-api.ts` - Generates API documentation and type definitions
- `build-package.ts` - Builds individual packages with proper dependency handling
- `typecheck.ts` - Runs TypeScript compilation checks across workspaces
- `lint.ts` - Runs ESLint across the monorepo with custom rules
- `clean.sh` - Removes build artifacts and node_modules

### Context management

- `context.ts` - Finds and displays nearest CONTEXT.md files (supports -v, -r, -u flags)
- `refresh-context.ts` - Updates CONTEXT.md files using Claude Code CLI integration
- Script supports reviewing all packages or specific directories

### Publishing & deployment

- `publish-new.ts` - Publishes new package versions
- `publish-patch.ts` - Handles patch releases
- `publish-prerelease.ts` - Manages prerelease versions
- `publish-manual.ts` - Manual publishing workflow
- `publish-vscode-extension.ts` - VSCode extension publishing
- `deploy-dotcom.ts` - Deploys tldraw.com application
- `deploy-bemo.ts` - Deploys collaboration backend

### Asset management

- `refresh-assets.ts` - Updates icons, fonts, and translations across packages
- Assets are centrally managed and distributed during builds
- `purge-css.ts` - Removes unused CSS
- `upload-static-assets.ts` - Handles CDN asset uploads

### Internationalization

- `i18n-upload-strings.ts` - Uploads translation strings to Lokalise
- `i18n-download-strings.ts` - Downloads localized strings from Lokalise
- Supports the tldraw UI translation workflow

### Testing & quality

- `check-packages.ts` - Validates package configurations and dependencies
- `check-worker-bundle.ts` - Verifies worker bundle integrity
- `license-report.ts` - Generates license compliance reports
- `generate-test-licenses.ts` - Creates test license configurations

### Template management

- `export-template.ts` - Generates starter templates for different frameworks
- `refresh-create-templates.ts` - Updates npm create tldraw templates
- `dev-template.sh` - Development script for testing templates

### Utilities library (`lib/`)

- `exec.ts` - Enhanced command execution with logging
- `file.ts` - File system operations and path utilities
- `workspace.ts` - Yarn workspace management utilities
- `publishing.ts` - Package publishing logic
- `deploy.ts` - Deployment orchestration
- `eslint-plugin.ts` - Custom ESLint rules for tldraw
- `discord.ts` - Discord webhook integrations
- `pr-info.ts` - GitHub PR metadata extraction

### Version management

- `bump-versions.ts` - Automated version bumping across packages
- `get-pr-numbers.ts` - Extracts PR numbers from commit history
- `update-pr-template.ts` - Updates GitHub PR templates

### Deployment support

- `trigger-dotcom-hotfix.ts` - Emergency deployment triggers
- `trigger-sdk-hotfix.ts` - SDK hotfix deployment
- `prune-preview-deploys.ts` - Cleanup preview deployments

## Architecture

Built on Node.js with TypeScript, using:

- **LazyRepo** for incremental build orchestration
- **yarn workspaces** for monorepo package management
- **AWS SDK** for cloud deployments and asset management
- **GitHub Actions integration** for CI/CD workflows
- **Lokalise API** for translation management

## Usage patterns

Scripts are typically run via yarn from the monorepo root:

```bash
yarn api-check           # Validate API surface
yarn context             # Find nearest CONTEXT.md
yarn refresh-context     # Update CONTEXT.md files
yarn refresh-assets      # Update icons/fonts/translations
```

Most scripts support command-line arguments and environment variables for configuration. Check individual script files for specific usage patterns.

## Development

Scripts use shared utilities from `lib/` for common operations like:

- Command execution with proper logging
- File system operations with error handling
- Workspace package discovery and management
- Git operations and PR metadata extraction

All scripts are written in TypeScript and executed via `tsx` for direct TS execution without compilation steps.


# ==================
# FILE: packages/assets/CONTEXT.md
# ==================

# Assets Package Context

## Overview

The `@tldraw/assets` package contains all static assets used by tldraw, including icons, fonts, translations, embed icons, and watermarks. It provides multiple export strategies for different bundling scenarios and ensures consistent asset access across the entire application.

## Architecture

### Asset categories

#### Icons system

Single SVG sprite with fragment identifiers for efficient icon delivery:

```typescript
// All icons consolidated into one optimized SVG file
icons: {
  'tool-pointer': iconsIcon0MergedSvg + '#tool-pointer',
  'tool-pencil': iconsIcon0MergedSvg + '#tool-pencil',
  'geo-rectangle': iconsIcon0MergedSvg + '#geo-rectangle',
  'align-center': iconsIcon0MergedSvg + '#align-center'
  // 80+ icons covering tools, shapes, UI elements, formatting
}
```

**Icon categories:**

- **Tool icons**: `tool-pointer`, `tool-pencil`, `tool-arrow`, `tool-text`, etc.
- **Geometry icons**: `geo-rectangle`, `geo-ellipse`, `geo-triangle`, `geo-star`, etc.
- **UI icons**: `chevron-*`, `align-*`, `zoom-*`, `undo`, `redo`, etc.
- **Action icons**: `duplicate`, `delete`, `lock`, `group`, `share`, etc.

#### Typography system

Complete font family with multiple weights and styles:

```typescript
fonts: {
  // IBM Plex Mono (code/monospace)
  tldraw_mono: './fonts/IBMPlexMono-Medium.woff2',
  tldraw_mono_bold: './fonts/IBMPlexMono-Bold.woff2',
  tldraw_mono_italic: './fonts/IBMPlexMono-MediumItalic.woff2',
  tldraw_mono_italic_bold: './fonts/IBMPlexMono-BoldItalic.woff2',

  // IBM Plex Sans (UI/interface)
  tldraw_sans: './fonts/IBMPlexSans-Medium.woff2',
  tldraw_sans_bold: './fonts/IBMPlexSans-Bold.woff2',
  tldraw_sans_italic: './fonts/IBMPlexSans-MediumItalic.woff2',
  tldraw_sans_italic_bold: './fonts/IBMPlexSans-BoldItalic.woff2',

  // IBM Plex Serif (formal text)
  tldraw_serif: './fonts/IBMPlexSerif-Medium.woff2',
  tldraw_serif_bold: './fonts/IBMPlexSerif-Bold.woff2',
  tldraw_serif_italic: './fonts/IBMPlexSerif-MediumItalic.woff2',
  tldraw_serif_italic_bold: './fonts/IBMPlexSerif-BoldItalic.woff2',

  // Shantell Sans (handwritten/draw style)
  tldraw_draw: './fonts/Shantell_Sans-Informal_Regular.woff2',
  tldraw_draw_bold: './fonts/Shantell_Sans-Informal_Bold.woff2',
  tldraw_draw_italic: './fonts/Shantell_Sans-Informal_Regular_Italic.woff2',
  tldraw_draw_italic_bold: './fonts/Shantell_Sans-Informal_Bold_Italic.woff2'
}
```

#### Internationalization system

Comprehensive translation support for 40+ languages:

```typescript
// Language metadata for UI
translations/languages.json: [
  { "locale": "en", "label": "English" },
  { "locale": "es", "label": "Español" },
  { "locale": "fr", "label": "Français" },
  { "locale": "zh-cn", "label": "简体中文" },
  // 40+ supported locales
]

// Translation file mapping
translations: {
  en: './translations/en.json',
  es: './translations/es.json',
  'zh-cn': './translations/zh-cn.json',
  'pt-br': './translations/pt-br.json',
  // Region-specific variants supported
}
```

#### Embed icons

Service icons for external content embedding:

```typescript
embedIcons: {
  youtube: './embed-icons/youtube.png',
  figma: './embed-icons/figma.png',
  github_gist: './embed-icons/github_gist.png',
  google_maps: './embed-icons/google_maps.png',
  codepen: './embed-icons/codepen.png',
  // 18 popular services supported
}
```

### Export strategies

#### Import-Based assets (`imports.js`)

Direct ES module imports for bundler optimization:

```javascript
import embedIconsYoutubePng from './embed-icons/youtube.png'
import fontsIBMPlexSansBoldWoff2 from './fonts/IBMPlexSans-Bold.woff2'

export function getAssetUrlsByImport(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(fontsIBMPlexSansBoldWoff2, opts),
		},
		embedIcons: {
			youtube: formatAssetUrl(embedIconsYoutubePng, opts),
		},
	}
}
```

#### URL-Based assets (`urls.js`)

Runtime URL generation using `import.meta.url`:

```javascript
export function getAssetUrlsByMetaUrl(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl(
				new URL('./fonts/IBMPlexSans-Bold.woff2', import.meta.url).href,
				opts
			),
		},
	}
}
```

#### Self-Hosted assets (`selfHosted.js`)

Relative path resolution for custom hosting:

```javascript
export function getAssetUrls(opts) {
	return {
		fonts: {
			tldraw_sans_bold: formatAssetUrl('./fonts/IBMPlexSans-Bold.woff2', opts),
		},
	}
}
```

### Asset URL formatting

#### `formatAssetUrl` utility

Flexible asset URL processing supporting multiple hosting scenarios:

```typescript
function formatAssetUrl(assetUrl: AssetUrl, format: AssetUrlOptions = {}) {
	const assetUrlString = typeof assetUrl === 'string' ? assetUrl : assetUrl.src

	// Custom formatter function
	if (typeof format === 'function') return format(assetUrlString)

	const { baseUrl = '' } = format

	// Data URLs pass through unchanged
	if (assetUrlString.startsWith('data:')) return assetUrlString

	// Absolute URLs pass through unchanged
	if (assetUrlString.match(/^https?:\/\//)) return assetUrlString

	// Relative URLs get baseUrl prefix
	return `${baseUrl.replace(/\/$/, '')}/${assetUrlString.replace(/^\.?\//, '')}`
}
```

**Use cases:**

- **CDN hosting**: Add baseUrl for CDN deployment
- **Custom domains**: Redirect assets to custom asset servers
- **Development**: Serve assets from local dev server
- **Self-hosting**: Package assets with application bundle

### Type system

#### Asset URL types

Type-safe asset URL handling:

```typescript
type AssetUrl = string | { src: string }
type AssetUrlOptions = { baseUrl?: string } | ((assetUrl: string) => string)

interface AssetUrls {
	fonts: Record<string, string> // 16 font variants
	icons: Record<string, string> // 80+ UI icons
	translations: Record<string, string> // 40+ language files
	embedIcons: Record<string, string> // 18 service icons
}
```

### Build system integration

#### Automatic generation

Asset exports are automatically generated from source files:

```javascript
// Generated by internal/scripts/refresh-assets.ts
// Do not edit manually. Or do, I'm a comment, not a cop.
```

**Generated files:**

- `imports.js` + `imports.d.ts` - ES module imports
- `urls.js` + `urls.d.ts` - import.meta.url resolution
- `selfHosted.js` + `selfHosted.d.ts` - relative path resolution
- `types.d.ts` - TypeScript definitions

#### Vite-specific exports

Special handling for Vite bundler:

```javascript
// imports.vite.js - Vite-optimized asset imports
// imports.vite.d.ts - Vite-specific type definitions
```

## Language support

### Translation architecture

Comprehensive internationalization with regional variants:

**Language coverage:**

- **European**: en, de, fr, es, it, nl, ru, pl, etc.
- **Asian**: zh-cn, zh-tw, ja, ko-kr, hi-in, th, etc.
- **Middle Eastern**: ar, fa, he, ur
- **Regional variants**: pt-br/pt-pt, gu-in/hi-in, zh-cn/zh-tw

**Translation structure:**

```json
// Each translation file contains UI strings
{
	"action.align-bottom": "Align bottom",
	"action.bring-forward": "Bring forward",
	"tool.select": "Select",
	"style.color.black": "Black"
}
```

### Language metadata

Centralized language configuration:

```json
// translations/languages.json
[
	{ "locale": "en", "label": "English" },
	{ "locale": "zh-cn", "label": "简体中文" },
	{ "locale": "ar", "label": "عربي" }
]
```

## External service integration

### Embed service icons

Visual branding for embedded content:

**Supported services:**

- **Development**: GitHub Gist, CodePen, CodeSandbox, Replit, Observable
- **Design**: Figma, Excalidraw, tldraw
- **Media**: YouTube, Vimeo, Spotify
- **Productivity**: Google Maps, Google Slides, Google Calendar
- **Other**: Desmos, Felt, Val Town, Scratch

**Icon usage:**

```typescript
// Icons displayed when embedding external content
embedIcons: {
  figma: './embed-icons/figma.png',
  youtube: './embed-icons/youtube.png',
  github_gist: './embed-icons/github_gist.png'
}
```

## Performance optimizations

### Icon sprite system

All icons merged into single SVG sprite for optimal loading:

```svg
<!-- icons/icon/0_merged.svg -->
<svg>
  <symbol id="tool-pointer">...</symbol>
  <symbol id="geo-rectangle">...</symbol>
  <symbol id="align-center">...</symbol>
  <!-- All icons as symbols -->
</svg>
```

**Benefits:**

- **Single HTTP request**: All icons in one file
- **Browser caching**: Icons cached together
- **Fragment addressing**: Access via `#icon-name`
- **Bundle optimization**: Unused icons can be tree-shaken

### Font loading strategy

Optimized web font delivery:

```css
/* Each font variant as separate WOFF2 file */
@font-face {
	font-family: 'tldraw-sans';
	src: url('./fonts/IBMPlexSans-Medium.woff2') format('woff2');
	font-weight: 500;
	font-style: normal;
}
```

### Asset bundling flexibility

Multiple export patterns support different bundling needs:

**Import strategy**: Best for Webpack/Rollup with asset processing
**URL strategy**: Best for ESM environments with import.meta.url
**Self-hosted strategy**: Best for custom asset hosting solutions

## Development workflow

### Asset pipeline

Automated asset management and optimization:

1. **Source assets**: Fonts, icons, images stored in organized directories
2. **Build script**: `internal/scripts/refresh-assets.ts` processes assets
3. **Generated exports**: Multiple export formats created automatically
4. **Type generation**: TypeScript definitions auto-generated
5. **Bundle integration**: Assets ready for different bundler strategies

### Asset updates

Standardized process for asset modifications:

1. **Add assets**: Place new assets in appropriate directories
2. **Run build**: Execute asset refresh script
3. **Commit generated**: Include auto-generated export files
4. **Type safety**: TypeScript ensures valid asset references

## Integration patterns

### Basic asset usage

```typescript
import { getAssetUrlsByImport } from '@tldraw/assets/imports'

const assetUrls = getAssetUrlsByImport()
const iconUrl = assetUrls.icons['tool-pointer']
const fontUrl = assetUrls.fonts.tldraw_sans_bold
```

### Custom base URL

```typescript
import { getAssetUrls } from '@tldraw/assets/selfHosted'

const assetUrls = getAssetUrls({
	baseUrl: 'https://cdn.example.com/tldraw-assets',
})
```

### Custom URL transformation

```typescript
const assetUrls = getAssetUrls((assetUrl) => {
	// Custom logic for asset URL generation
	return `https://assets.myapp.com/${assetUrl}?v=${buildHash}`
})
```

## Key benefits

### Asset management

- **Centralized assets**: All static resources in one package
- **Type safety**: TypeScript definitions for all asset references
- **Multiple export strategies**: Support for different bundling workflows
- **Automatic generation**: Asset exports generated from source files

### Performance

- **Optimized loading**: Icon sprites and font subsetting
- **Flexible hosting**: Support for CDNs and custom asset servers
- **Bundle efficiency**: Tree-shakable exports for unused assets
- **Caching strategy**: Asset URLs designed for effective browser caching

### Internationalization

- **Global reach**: 40+ supported languages with regional variants
- **Extensible translation**: Easy to add new languages
- **Fallback strategy**: Graceful degradation to English
- **Cultural adaptation**: Right-to-left language support

### Developer experience

- **Simple integration**: Import and use pattern for all assets
- **Build-time safety**: TypeScript prevents invalid asset references
- **Hot reloading**: Development-friendly asset serving
- **Documentation**: Clear asset categorization and naming

### Maintenance

- **Single source**: All assets managed in one location
- **Automated updates**: Build scripts maintain export consistency
- **Version control**: Asset changes tracked with application changes
- **Dependency management**: Minimal external dependencies for assets


# ==================
# FILE: packages/create-tldraw/CONTEXT.md
# ==================

# Create-Tldraw Package Context

## Overview

The `create-tldraw` package is a CLI tool for scaffolding new tldraw projects. It provides an interactive command-line interface that helps developers quickly bootstrap tldraw applications with various framework templates and configurations.

## Architecture

### CLI entry point

```bash
#!/usr/bin/env node
# cli.cjs entry point loads the bundled CLI application from dist-cjs/main.cjs
npx create-tldraw [directory] [options]
```

The CLI uses a two-stage loading system:

- `cli.cjs`: Simple entry point that requires the compiled CommonJS bundle
- `dist-cjs/main.cjs`: Actual CLI implementation bundled via esbuild

### Core components

#### Interactive CLI interface (`main.ts`)

Primary CLI application with rich interactive prompts:

```typescript
async function main() {
	intro(`Let's build a tldraw app!`)

	const template = await templatePicker(args.template)
	const name = await namePicker(maybeTargetDir)

	await ensureEmpty(targetDir, args.overwrite)
	await downloadTemplate(template, targetDir)
	await renameTemplate(name, targetDir)

	outro(doneMessage.join('\n'))
}
```

**CLI features:**

- **Interactive mode**: Guided project setup with prompts and spinners
- **Argument mode**: Direct template specification via flags
- **Directory handling**: Smart target directory management with safety checks
- **Package manager detection**: Automatic npm/yarn/pnpm detection and command generation
- **Progress indication**: Visual feedback with spinners and status messages
- **Error recovery**: Graceful handling of cancellation and failures

#### Template system (`templates.ts`)

Structured template definitions for different use cases:

```typescript
interface Template {
	repo: string // GitHub repository reference
	name: string // Human-readable template name
	description: string // Template description for UI
	category: 'framework' | 'app' // Template categorization
	order: number // Display order preference (required)
}

const TEMPLATES: Templates = {
	framework: [
		{
			repo: 'tldraw/vite-template',
			name: 'Vite + tldraw',
			description:
				'The easiest way to get started with tldraw. Built with Vite, React, and TypeScript.',
			category: 'framework',
			order: 1,
		},
		{
			repo: 'tldraw/nextjs-template',
			name: 'Next.js + tldraw',
			description: 'tldraw in a Next.js app, with TypeScript.',
			category: 'framework',
			order: 2,
		},
	],
	app: [
		{
			repo: 'tldraw/tldraw-sync-cloudflare',
			name: 'Multiplayer sync',
			description:
				'Self-hosted tldraw with realtime multiplayer, powered by tldraw sync and Cloudflare Durable Objects.',
			category: 'app',
			order: 1,
		},
	],
}
```

#### Utility functions (`utils.ts`)

Essential CLI utilities for project setup:

```typescript
// Directory Management
function isDirEmpty(path: string): boolean
function emptyDir(dir: string): void
function formatTargetDir(targetDir: string): string

// Package Naming
function isValidPackageName(projectName: string): boolean
function toValidPackageName(projectName: string): string
function pathToName(path: string): string

// Package Manager Detection
function getPackageManager(): 'npm' | 'pnpm' | 'yarn'
function getInstallCommand(manager: PackageManager): string
function getRunCommand(manager: PackageManager, command: string): string

// Error Handling
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T>
```

#### Custom ANSI text wrapping (`wrap-ansi.ts`)

Custom implementation for terminal text wrapping that handles ANSI escape sequences:

```typescript
// Wraps text while preserving ANSI color codes and escape sequences
function wrapAnsi(input: string, columns: number): string
```

This custom implementation ensures that colored text in CLI prompts and messages wraps correctly without breaking ANSI formatting codes, providing consistent visual presentation across different terminal widths.

### Template management

#### Template selection UI (`group-select.ts`)

Enhanced group-based selection interface with custom rendering:

```typescript
// Custom grouped selection prompt with category headers
const template = await groupSelect({
	message: 'Select a template',
	options: [
		...formatTemplates(TEMPLATES.framework, 'Frameworks'),
		...formatTemplates(TEMPLATES.app, 'Apps'),
	],
})

function formatTemplates(templates: Template[], groupLabel: string) {
	return templates
		.sort((a, b) => a.order - b.order)
		.map((template) => ({
			label: template.name,
			hint: template.description,
			value: template,
			group: groupLabel,
		}))
}
```

The grouped selection system provides:

- **Category Grouping**: Templates organized by framework vs application type
- **Visual Hierarchy**: Group headers with consistent styling
- **Detailed descriptions**: Helpful hints for each template option
- **Keyboard navigation**: Standard CLI navigation patterns

#### Template download system

GitHub-based template retrieval with comprehensive error handling:

```typescript
async function downloadTemplate(template: Template, targetDir: string) {
	const s = spinner()
	s.start(`Downloading github.com/${template.repo}...`)

	try {
		const url = `https://github.com/${template.repo}/archive/refs/heads/main.tar.gz`
		const tarResponse = await fetch(url)

		if (!tarResponse.ok) {
			throw new Error(`Failed to download: ${tarResponse.statusText}`)
		}

		const extractor = tar.extract({
			cwd: targetDir,
			strip: 1, // Remove top-level directory from archive
		})

		await new Promise<void>((resolve, reject) => {
			Readable.fromWeb(tarResponse.body).pipe(extractor).on('end', resolve).on('error', reject)
		})

		s.stop(`Downloaded github.com/${template.repo}`)
	} catch (error) {
		s.stop(`Failed to download github.com/${template.repo}`)
		throw error
	}
}
```

**Error handling features:**

- **Network failure recovery**: Graceful handling of download failures
- **Invalid repository detection**: Clear error messages for missing repos
- **Progress indication**: Real-time download status with spinners
- **Cleanup on failure**: Automatic cleanup of partially downloaded content

### Project customization

#### Package.json customization

Automatic project personalization with preserved licensing:

```typescript
async function renameTemplate(name: string, targetDir: string) {
	const packageJsonPath = resolve(targetDir, 'package.json')
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

	// Customize package metadata while preserving license
	packageJson.name = name
	delete packageJson.author // Remove template author
	delete packageJson.homepage // Remove template homepage
	// Note: license field is preserved from original template

	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n')
}
```

The package.json customization preserves template licensing while personalizing the project metadata for the new owner.

#### Smart naming system

Intelligent package name generation with npm compliance:

```typescript
// Path to valid npm package name conversion
function pathToName(path: string): string {
	return toValidPackageName(basename(formatTargetDir(resolve(path))))
}

function toValidPackageName(projectName: string): string {
	return projectName
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-') // Spaces to hyphens
		.replace(/^[._]/, '') // Remove leading dots/underscores
		.replace(/[^a-z\d\-~]+/g, '-') // Invalid chars to hyphens
}
```

### CLI command interface

#### Command-Line arguments

Flexible argument handling for different usage patterns:

```bash
# Interactive mode (default)
npx create-tldraw

# Direct template specification
npx create-tldraw my-app --template vite-template

# Overwrite existing directory
npx create-tldraw my-app --overwrite

# Help information
npx create-tldraw --help
```

**Argument Processing:**

```typescript
const args = parseArgs(process.argv.slice(2), {
	alias: {
		h: 'help',
		t: 'template',
		o: 'overwrite',
	},
	boolean: ['help', 'overwrite'],
	string: ['template'],
})
```

#### Interactive prompts

Rich CLI experience using @clack/prompts with custom enhancements:

```typescript
// Template selection with grouped options and visual hierarchy
const template = await groupSelect({
	message: 'Select a template',
	options: [
		{ label: 'Vite + tldraw', hint: 'The easiest way to get started', group: 'Frameworks' },
		{ label: 'Next.js + tldraw', hint: 'tldraw in a Next.js app', group: 'Frameworks' },
		{ label: 'Multiplayer sync', hint: 'Self-hosted realtime collaboration', group: 'Apps' },
	],
})

// Project naming with validation and smart defaults
const name = await text({
	message: 'Name your app',
	placeholder: defaultName,
	validate: (value) => {
		if (value && !isValidPackageName(value)) {
			return `Invalid name: ${value}`
		}
	},
})
```

### Directory management

#### Smart directory handling

Intelligent handling of target directories with safety checks:

```typescript
async function ensureEmpty(targetDir: string, overwriteArg: boolean) {
	if (isDirEmpty(targetDir)) {
		mkdirSync(targetDir, { recursive: true })
		return
	}

	// Interactive overwrite confirmation with multiple options
	const overwrite = overwriteArg
		? 'yes'
		: await select({
				message: `Target directory "${targetDir}" is not empty.`,
				options: [
					{ label: 'Cancel', value: 'no' },
					{ label: 'Remove existing files and continue', value: 'yes' },
					{ label: 'Ignore existing files and continue', value: 'ignore' },
				],
			})

	if (overwrite === 'yes') {
		emptyDir(targetDir) // Preserves .git directory
	}
}
```

**Directory safety features:**

- **Git repository preservation**: `.git` directories are never deleted
- **Interactive confirmation**: User must explicitly confirm destructive operations
- **Flexible options**: Cancel, overwrite, or merge with existing content
- **Recursive creation**: Automatically creates parent directories as needed

### Package manager integration

#### Universal package manager support

Automatic detection and appropriate command generation:

```typescript
function getPackageManager(): 'npm' | 'pnpm' | 'yarn' {
	const userAgent = process.env.npm_config_user_agent
	if (!userAgent) return 'npm'

	const manager = userAgent.split(' ')[0].split('/')[0]
	if (manager === 'pnpm') return 'pnpm'
	if (manager === 'yarn') return 'yarn'
	return 'npm'
}

function getInstallCommand(manager: PackageManager): string {
	switch (manager) {
		case 'pnpm':
			return 'pnpm install'
		case 'yarn':
			return 'yarn'
		case 'npm':
			return 'npm install'
	}
}

function getRunCommand(manager: PackageManager, command: string): string {
	switch (manager) {
		case 'pnpm':
			return `pnpm ${command}`
		case 'yarn':
			return `yarn ${command}`
		case 'npm':
			return `npm run ${command}`
	}
}
```

### Error handling

#### Comprehensive error management

Graceful error handling throughout the CLI with user-friendly messaging:

```typescript
// Cancellation handling with cleanup
async function uncancel<T>(promise: Promise<T | symbol>): Promise<T> {
	const result = await promise
	if (isCancel(result)) {
		outro(`Operation cancelled`)
		process.exit(1)
	}
	return result as T
}

// Main error boundary with debug mode
main().catch((err) => {
	if (DEBUG) {
		console.error('Debug information:')
		console.error(err)
	}
	outro(`Something went wrong. Please try again.`)
	process.exit(1)
})

// Download error handling with retry suggestions
try {
	await downloadTemplate(template, targetDir)
} catch (err) {
	outro(`Failed to download template. Please check your internet connection and try again.`)
	throw err
}
```

**Error recovery strategies:**

- **Graceful degradation**: Meaningful error messages without technical details
- **Debug mode**: Detailed error information when DEBUG environment variable is set
- **Operation cleanup**: Automatic cleanup of partial operations on failure
- **User guidance**: Actionable suggestions for resolving common issues

## Build system

### esbuild bundle configuration

Optimized TypeScript to CommonJS compilation for Node.js distribution:

```bash
# scripts/build.sh
esbuild src/main.ts \
  --bundle \
  --platform=node \
  --target=node18 \
  --format=cjs \
  --outfile=dist-cjs/main.cjs \
  --external:@clack/prompts \
  --external:tar
```

**Build Features:**

- **Single Bundle**: All TypeScript source compiled to one CommonJS file
- **External Dependencies**: CLI dependencies remain as external requires
- **Node.js Target**: Optimized for Node.js 18+ runtime environments
- **Development Watch**: `scripts/dev.sh` provides watch mode for development

### Distribution strategy

Optimized package structure for CLI distribution:

```json
{
	"bin": "./cli.cjs", // CLI entry point
	"files": ["dist-cjs/", "./cli.cjs"], // Files included in npm package
	"scripts": {
		"build": "./scripts/build.sh", // Production build
		"dev": "./scripts/dev.sh", // Development mode with watch
		"prepublishOnly": "yarn build" // Ensure build before publish
	}
}
```

### Development workflow

#### Development scripts

Streamlined development experience:

```bash
# Development with automatic rebuild
./scripts/dev.sh    # Watches TypeScript files and rebuilds on changes

# Production build
./scripts/build.sh  # Creates optimized CommonJS bundle

# Local testing
node cli.cjs        # Test CLI locally after build
```

#### TypeScript compilation pipeline

```
src/
├── main.ts          → Entry point and CLI orchestration
├── templates.ts     → Template definitions and management
├── utils.ts         → Shared utilities and validation
├── group-select.ts  → Custom grouped selection UI
└── wrap-ansi.ts     → ANSI text wrapping functionality
     ↓ (esbuild bundle)
dist-cjs/
└── main.cjs         → Single bundled CommonJS output
```

## Testing configuration

### Jest setup

Comprehensive test configuration for CLI validation:

```json
{
	"testEnvironment": "node",
	"testMatch": ["<rootDir>/src/**/*.test.ts"],
	"transform": {
		"^.+\\.ts$": "ts-jest"
	},
	"collectCoverage": true,
	"coverageDirectory": "coverage",
	"coverageReporters": ["text", "html"]
}
```

**Testing patterns:**

- **Unit tests**: Individual function validation (utils, naming, validation)
- **Integration tests**: Template download and project setup workflows
- **CLI tests**: Command-line interface and argument parsing
- **Mock templates**: Test template system without external dependencies

## Template categories

### Framework templates

Ready-to-use integrations with popular frameworks:

#### Vite template (`tldraw/vite-template`)

- **Purpose**: Fastest way to start with tldraw
- **Tech stack**: Vite + React + TypeScript
- **Use case**: Simple drawing applications, rapid prototyping
- **Build time**: ~10 seconds for initial setup
- **Development**: Hot module replacement with Vite dev server

#### Next.js template (`tldraw/nextjs-template`)

- **Purpose**: Full-stack applications with tldraw
- **Tech stack**: Next.js + React + TypeScript
- **Use case**: Production web applications, SSR/SSG requirements
- **Features**: App Router, optimized builds, deployment ready

### Application templates

Complete application examples with advanced features:

#### Multiplayer sync (`tldraw/tldraw-sync-cloudflare`)

- **Purpose**: Real-time collaborative drawing
- **Tech stack**: tldraw + sync + Cloudflare Durable Objects
- **Features**: Multiplayer, persistence, scalable infrastructure
- **Use case**: Collaborative whiteboarding, team drawing sessions
- **Deployment**: Cloudflare Workers with Durable Objects backend

## Usage patterns

### Basic project creation

```bash
# Interactive mode with full guidance
npx create-tldraw

# Quick setup with specific template
npx create-tldraw my-drawing-app --template vite-template

# Overwrite existing directory safely
npx create-tldraw ./existing-dir --overwrite
```

### Advanced usage patterns

```bash
# Corporate environments with specific package managers
PNPM_CONFIG_USER_AGENT=pnpm npx create-tldraw my-app

# Automated CI/CD pipeline usage
npx create-tldraw ci-app --template nextjs-template --overwrite

# Development workflow integration
npx create-tldraw && cd $(ls -t | head -1) && npm run dev
```

### Post-creation workflow

```bash
cd my-tldraw-app
npm install           # Detected package manager command
npm run dev          # Start development server
npm run build        # Create production build
npm run typecheck    # Validate TypeScript
```

## Template development

### Automatic template generation

Templates are automatically discovered and validated:

```typescript
// Template validation ensures all required fields are present
function validateTemplate(template: Template): boolean {
	return !!(
		template.repo &&
		template.name &&
		template.description &&
		template.category &&
		typeof template.order === 'number'
	)
}

// Automatic template list generation from repository metadata
async function generateTemplateList() {
	const frameworks = await discoverTemplates('framework')
	const apps = await discoverTemplates('app')
	return { framework: frameworks, app: apps }
}
```

### Template requirements

Standards for template repositories:

- **package.json**: Valid npm package with required scripts
- **README.md**: Comprehensive setup and usage instructions
- **TypeScript Configuration**: Strict TypeScript setup preferred
- **Development Scripts**: Standard `dev`, `build`, `typecheck` scripts
- **License**: Clear licensing for template usage
- **Dependencies**: Current tldraw version and compatible dependencies

### Quality assurance

Automated validation for template integrity:

- **Repository Access**: Verify GitHub repository is public and accessible
- **Package Validation**: Ensure package.json meets npm standards
- **Build Verification**: Template must build successfully after setup
- **Dependency Audit**: Check for security vulnerabilities in dependencies
- **Documentation Review**: README must include setup and usage instructions

## Development features

### Enhanced CLI experience

Visual feedback and user guidance throughout the process:

```typescript
import { intro, outro, select, spinner, text } from '@clack/prompts'

// Welcome message with branding
intro(`Let's build a tldraw app!`)

// Progress indication with detailed status
const s = spinner()
s.start(`Downloading github.com/${template.repo}...`)
await downloadTemplate(template, targetDir)
s.stop(`Downloaded github.com/${template.repo}`)

// Success message with next steps
const installCmd = getInstallCommand(getPackageManager())
const runCmd = getRunCommand(getPackageManager(), 'dev')
outro(`Done! Now run:\n\n  cd ${targetDir}\n  ${installCmd}\n  ${runCmd}`)
```

### Smart defaults and validation

Intelligent default value generation and input validation:

```typescript
// Smart project naming from current directory
const defaultName = pathToName(process.cwd())

// Package manager detection from environment
const manager = getPackageManager()

// Template ordering by popularity and ease of use
templates.sort((a, b) => a.order - b.order)

// Comprehensive package name validation
function isValidPackageName(projectName: string): boolean {
	return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

// Directory safety validation
function isDirEmpty(path: string): boolean {
	if (!existsSync(path)) return true
	const files = readdirSync(path)
	return files.length === 0 || (files.length === 1 && files[0] === '.git')
}
```

## Key benefits

### Developer experience

- **Zero configuration**: Works immediately with sensible defaults
- **Framework flexibility**: Support for React, Next.js, and Vue ecosystems
- **Interactive guidance**: Step-by-step project setup with visual feedback
- **Universal compatibility**: Works with npm, yarn, and pnpm package managers
- **Error prevention**: Comprehensive validation and safety checks

### Template ecosystem

- **Curated quality**: Official templates demonstrate best practices
- **Feature examples**: Specialized templates for multiplayer, AI integration
- **Extensible architecture**: Easy addition of new templates
- **Automatic updates**: Template list stays current with repository changes
- **Community driven**: Clear contribution model for new template types

### Production readiness

- **TypeScript first**: All templates include strict TypeScript configuration
- **Modern tooling**: Latest build tools, development servers, and frameworks
- **Deployment ready**: Templates include production build and deployment guides
- **Testing integration**: Pre-configured testing frameworks and example tests
- **Performance optimized**: Build configurations optimized for production use

### Maintenance and reliability

- **Automated validation**: Template repositories automatically validated for integrity
- **Version consistency**: Templates maintained to work with current tldraw releases
- **Comprehensive testing**: CLI functionality covered by automated test suite
- **Documentation**: Each template includes detailed setup and customization guides
- **Error recovery**: Graceful handling of network issues, user cancellation, and edge cases


# ==================
# FILE: packages/dotcom-shared/CONTEXT.md
# ==================

# Dotcom-Shared Package Context

## Overview

The `@tldraw/dotcom-shared` package contains shared code between the tldraw.com web application and its worker services. It provides database schema, optimistic state management, permissions, and API types for the collaborative tldraw platform.

## Architecture

### Database schema (`tlaSchema.ts`)

Comprehensive data model using Rocicorp Zero for real-time collaboration:

#### Core tables

```typescript
// User Management
const user = table('user')
	.columns({
		id: string(),
		name: string(),
		email: string(),
		avatar: string(),
		color: string(),
		exportFormat: string(),
		exportTheme: string(),
		exportBackground: boolean(),
		exportPadding: boolean(),
		createdAt: number(),
		updatedAt: number(),
		flags: string(),
		// User preferences (optional)
		locale: string().optional(),
		animationSpeed: number().optional(),
		areKeyboardShortcutsEnabled: boolean().optional(),
		edgeScrollSpeed: number().optional(),
		colorScheme: string().optional(),
		isSnapMode: boolean().optional(),
		isWrapMode: boolean().optional(),
		isDynamicSizeMode: boolean().optional(),
		isPasteAtCursorMode: boolean().optional(),
		enhancedA11yMode: boolean().optional(),
		allowAnalyticsCookie: boolean().optional(),
	})
	.primaryKey('id')

// File Management
const file = table('file')
	.columns({
		id: string(),
		name: string(),
		ownerId: string(),
		ownerName: string(),
		ownerAvatar: string(),
		thumbnail: string(),
		shared: boolean(),
		sharedLinkType: string(),
		published: boolean(),
		lastPublished: number(),
		publishedSlug: string(),
		createdAt: number(),
		updatedAt: number(),
		isEmpty: boolean(),
		isDeleted: boolean(),
		createSource: string().optional(),
	})
	.primaryKey('id', 'ownerId', 'publishedSlug')

// User-File Relationship State
const file_state = table('file_state')
	.columns({
		userId: string(),
		fileId: string(),
		firstVisitAt: number().optional(),
		lastEditAt: number().optional(),
		lastSessionState: string().optional(),
		lastVisitAt: number().optional(),
		isFileOwner: boolean().optional(),
		isPinned: boolean().optional(),
	})
	.primaryKey('userId', 'fileId')
```

#### Relationships

Type-safe relational queries between tables:

```typescript
const fileRelationships = relationships(file, ({ one, many }) => ({
	owner: one({
		sourceField: ['ownerId'],
		destField: ['id'],
		destSchema: user,
	}),
	states: many({
		sourceField: ['id'],
		destField: ['fileId'],
		destSchema: file_state,
	}),
}))

const fileStateRelationships = relationships(file_state, ({ one }) => ({
	file: one({
		sourceField: ['fileId'],
		destField: ['id'],
		destSchema: file,
	}),
	user: one({
		sourceField: ['userId'],
		destField: ['id'],
		destSchema: user,
	}),
}))
```

### Optimistic state management (`OptimisticAppStore.ts`)

Real-time UI updates with optimistic mutations:

#### Store architecture

```typescript
class OptimisticAppStore {
	private _gold_store = atom('zero store', null as null | ZStoreData, { isEqual })
	private _optimisticStore = atom<
		Array<{
			updates: ZRowUpdate[]
			mutationId: string
		}>
	>('optimistic store', [])

	// Computed store combining committed + optimistic changes
	private store = computed('store', () => {
		const gold = this._gold_store.get()
		if (!gold) return null

		let data = gold
		const optimistic = this._optimisticStore.get()
		for (const changes of optimistic) {
			for (const update of changes.updates) {
				data = this.applyUpdate(data, update)
			}
		}
		return data
	})
}
```

#### Optimistic update flow

```typescript
// 1. Apply optimistic update immediately for instant UI
updateOptimisticData(updates: ZRowUpdate[], mutationId: string) {
  this._optimisticStore.update(prev => [...prev, { updates, mutationId }])
}

// 2. Server confirms - remove from optimistic store
commitMutations(mutationIds: string[]) {
  this._optimisticStore.update(prev => {
    const highestIndex = prev.findLastIndex(p => mutationIds.includes(p.mutationId))
    return prev.slice(highestIndex + 1)
  })
}

// 3. Server rejects - rollback optimistic changes
rejectMutation(mutationId: string) {
  this._optimisticStore.update(prev =>
    prev.filter(p => p.mutationId !== mutationId)
  )
}
```

#### Data synchronization

```typescript
// Apply database updates (insert/update/delete)
applyUpdate(prev: ZStoreData, update: ZRowUpdate): ZStoreData {
  const { row, table, event } = update
  const tableSchema = schema.tables[table]
  const rows = prev[table]

  const matchExisting = (existing: any) =>
    tableSchema.primaryKey.every(key => existing[key] === row[key])

  switch (event) {
    case 'insert':
      return { ...prev, [table]: [...rows, row] }
    case 'update':
      return {
        ...prev,
        [table]: rows.map(existing =>
          matchExisting(existing) ? { ...existing, ...row } : existing
        )
      }
    case 'delete':
      return {
        ...prev,
        [table]: rows.filter(existing => !matchExisting(existing))
      }
  }
}
```

### Permission system

Role-based access control for collaborative features:

#### User permissions

```typescript
const permissions = definePermissions<AuthData, TlaSchema>(schema, () => {
	// Users can only access their own user record
	const allowIfIsUser = (authData: AuthData, { cmp }) => cmp('id', '=', authData.sub!)

	// Users can only access their own file states
	const allowIfIsUserIdMatches = (authData: AuthData, { cmp }) => cmp('userId', '=', authData.sub!)

	// File access: owner OR shared file with file_state record
	const userCanAccessFile = (authData: AuthData, { exists, and, cmp, or }) =>
		or(
			cmp('ownerId', '=', authData.sub!), // File owner
			and(
				cmp('shared', '=', true), // File is shared
				exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
			)
		)

	return {
		user: { row: { select: [allowIfIsUser] } },
		file: { row: { select: [userCanAccessFile] } },
		file_state: { row: { select: [allowIfIsUserIdMatches] } },
	}
})
```

### Mutation system (`mutators.ts`)

Type-safe database operations with validation:

#### User mutations

```typescript
user: {
  insert: async (tx, user: TlaUser) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    await tx.mutate.user.insert(user)
  },
  update: async (tx, user: TlaUserPartial) => {
    assert(userId === user.id, ZErrorCode.forbidden)
    disallowImmutableMutations(user, immutableColumns.user)
    await tx.mutate.user.update(user)
  }
}
```

#### File mutations

```typescript
file: {
  insertWithFileState: async (tx, { file, fileState }) => {
    assert(file.ownerId === userId, ZErrorCode.forbidden)
    await assertNotMaxFiles(tx, userId)

    // File ID validation
    assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
    assert(file.id.length <= 32, ZErrorCode.bad_request)
    assert(file.id.length >= 16, ZErrorCode.bad_request)

    await tx.mutate.file.insert(file)
    await tx.mutate.file_state.upsert(fileState)
  },

  deleteOrForget: async (tx, file: TlaFile) => {
    // Remove user's file state
    await tx.mutate.file_state.delete({ fileId: file.id, userId })

    // If owner, mark as deleted (cascade delete other file states)
    if (file?.ownerId === userId) {
      await tx.mutate.file.update({
        id: file.id,
        ownerId: file.ownerId,
        publishedSlug: file.publishedSlug,
        isDeleted: true
      })
    }
  }
}
```

#### Data protection

```typescript
// Prevent modification of immutable columns
const immutableColumns = {
	user: new Set(['email', 'createdAt', 'updatedAt', 'avatar']),
	file: new Set(['ownerName', 'ownerAvatar', 'createSource', 'updatedAt', 'createdAt']),
	file_state: new Set(['firstVisitAt', 'isFileOwner']),
}

function disallowImmutableMutations(data, immutableColumns) {
	for (const immutableColumn of immutableColumns) {
		assert(!data[immutableColumn], ZErrorCode.forbidden)
	}
}
```

### API Types (`types.ts`)

Comprehensive type definitions for client-server communication:

#### Room management

```typescript
interface CreateRoomRequestBody {
	origin: string
	snapshot: Snapshot
}

interface CreateSnapshotRequestBody {
	schema: SerializedSchema
	snapshot: SerializedStore<TLRecord>
	parent_slug?: string
}

type CreateSnapshotResponseBody =
	| { error: false; roomId: string }
	| { error: true; message: string }
```

#### File operations

```typescript
interface CreateFilesRequestBody {
	origin: string
	snapshots: Snapshot[]
}

type CreateFilesResponseBody = { error: false; slugs: string[] } | { error: true; message: string }

type PublishFileResponseBody = { error: false } | { error: true; message: string }
```

#### Real-Time communication

```typescript
// Server to Client
type ZServerSentPacket =
	| { type: 'initial_data'; initialData: ZStoreData }
	| { type: 'update'; update: ZRowUpdate }
	| { type: 'commit'; mutationIds: string[] }
	| { type: 'reject'; mutationId: string; errorCode: ZErrorCode }

// Client to Server
interface ZClientSentMessage {
	type: 'mutator'
	mutationId: string
	name: string
	props: object
}
```

### Configuration and constants

#### Room management (`routes.ts`)

URL routing patterns for different room types:

```typescript
const ROOM_OPEN_MODE = {
	READ_ONLY: 'readonly',
	READ_ONLY_LEGACY: 'readonly-legacy',
	READ_WRITE: 'read-write',
}

// URL prefixes for different room types
const READ_ONLY_PREFIX = 'ro' // /ro/abc123
const READ_ONLY_LEGACY_PREFIX = 'v' // /v/abc123
const ROOM_PREFIX = 'r' // /r/abc123
const SNAPSHOT_PREFIX = 's' // /s/abc123
const FILE_PREFIX = 'f' // /f/abc123
const PUBLISH_PREFIX = 'p' // /p/abc123

const RoomOpenModeToPath = {
	[ROOM_OPEN_MODE.READ_ONLY]: READ_ONLY_PREFIX,
	[ROOM_OPEN_MODE.READ_ONLY_LEGACY]: READ_ONLY_LEGACY_PREFIX,
	[ROOM_OPEN_MODE.READ_WRITE]: ROOM_PREFIX,
}
```

#### Application limits (`constants.ts`)

```typescript
const MAX_NUMBER_OF_FILES = 200 // Per-user file limit
const ROOM_SIZE_LIMIT_MB = 25 // Room data size limit
```

### Error handling

#### Error code system

```typescript
const ZErrorCode = stringEnum(
	'publish_failed',
	'unpublish_failed',
	'republish_failed',
	'unknown_error',
	'client_too_old',
	'forbidden',
	'bad_request',
	'rate_limit_exceeded',
	'max_files_reached'
)
```

#### Validation and assertions

```typescript
// File limit enforcement
async function assertNotMaxFiles(tx: Transaction, userId: string) {
	const count = (await tx.query.file.where('ownerId', '=', userId).run()).filter(
		(f) => !f.isDeleted
	).length
	assert(count < MAX_NUMBER_OF_FILES, ZErrorCode.max_files_reached)
}

// File ID validation
assert(file.id.match(/^[a-zA-Z0-9_-]+$/), ZErrorCode.bad_request)
assert(file.id.length <= 32, ZErrorCode.bad_request)
assert(file.id.length >= 16, ZErrorCode.bad_request)
```

## Key features

### Real-time collaboration

**Optimistic updates**: Immediate UI response while server processes changes
**Conflict resolution**: Automatic handling of concurrent modifications
**Live sync**: Real-time data synchronization across multiple clients

### File management

**Ownership model**: Clear file ownership with sharing capabilities
**Access control**: Permission-based file access for collaboration
**State tracking**: Per-user file interaction history and preferences

### User experience

**Preferences sync**: User settings synchronized across devices
**Export options**: Customizable export formats and themes
**Session state**: Restore user's last position and tool selection

### Security

**Authentication**: JWT-based user authentication
**Authorization**: Row-level security with permission expressions
**Data Isolation**: Users can only access permitted data

## Data flow patterns

### Mutation flow

```typescript
// 1. Client initiates mutation
const mutationId = generateId()
await appStore.updateOptimisticData(updates, mutationId)

// 2. Send to server
websocket.send({
	type: 'mutator',
	mutationId,
	name: 'file.update',
	props: { name: 'New File Name' },
})

// 3. Server response
// Success: { type: 'commit', mutationIds: [mutationId] }
// Failure: { type: 'reject', mutationId, errorCode: 'forbidden' }
```

### File sharing

```typescript
// Owner shares file
await mutators.file.update({
	id: fileId,
	shared: true,
	sharedLinkType: 'edit', // or 'view'
})

// Collaborator joins
await mutators.file_state.insert({
	userId: currentUserId,
	fileId: sharedFileId,
	firstVisitAt: Date.now(),
})
```

### Permission enforcement

```typescript
// File access check
const userCanAccessFile = (authData, { exists, and, cmp, or }) =>
	or(
		cmp('ownerId', '=', authData.sub!), // User owns file
		and(
			cmp('shared', '=', true), // File is shared
			exists('states', (q) => q.where('userId', '=', authData.sub!)) // User has state
		)
	)
```

## Protocol communication

### WebSocket Protocol

Bi-directional communication for real-time collaboration:

#### Server messages

```typescript
// Initial data load
{ type: 'initial_data', initialData: ZStoreData }

// Live updates
{ type: 'update', update: ZRowUpdate }

// Mutation confirmations
{ type: 'commit', mutationIds: string[] }

// Mutation rejections
{ type: 'reject', mutationId: string, errorCode: ZErrorCode }
```

#### Client messages

```typescript
// Mutation requests
{
  type: 'mutator',
  mutationId: string,
  name: 'file.update' | 'user.update' | 'file_state.insert',
  props: object
}
```

### Version management

```typescript
// Protocol versioning for backwards compatibility
const Z_PROTOCOL_VERSION = 2
const MIN_Z_PROTOCOL_VERSION = 2

// Forces client reload on breaking changes
if (clientVersion < MIN_Z_PROTOCOL_VERSION) {
	throw new Error(ZErrorCode.client_too_old)
}
```

## User preferences system

### Preferences schema

Comprehensive user customization options:

```typescript
const UserPreferencesKeys = [
	'locale', // Language/region
	'animationSpeed', // UI animation timing
	'areKeyboardShortcutsEnabled', // Keyboard shortcuts toggle
	'edgeScrollSpeed', // Canvas edge scrolling
	'colorScheme', // Light/dark theme
	'isSnapMode', // Shape snapping
	'isWrapMode', // Text wrapping
	'isDynamicSizeMode', // Dynamic shape sizing
	'isPasteAtCursorMode', // Paste behavior
	'enhancedA11yMode', // Enhanced a11y mode
	'name', // Display name
	'color', // User color for collaboration
] as const satisfies Array<keyof TlaUser>
```

### Export configuration

```typescript
interface TlaUser {
	exportFormat: string // 'svg' | 'png' | 'jpeg' | 'webp'
	exportTheme: string // 'light' | 'dark' | 'auto'
	exportBackground: boolean // Include background
	exportPadding: boolean // Add padding around content
}
```

## File lifecycle

### File creation

```typescript
// Create file with initial state
await mutators.file.insertWithFileState({
	file: {
		id: generateFileId(),
		name: 'Untitled',
		ownerId: userId,
		shared: false,
		published: false,
		isEmpty: true,
		isDeleted: false,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	},
	fileState: {
		userId,
		fileId,
		firstVisitAt: Date.now(),
		isFileOwner: true,
	},
})
```

### File deletion

```typescript
// Soft delete preserving history
await mutators.file.deleteOrForget(file)

// If owner: marks file as deleted, cascades to all file_states
// If collaborator: removes only user's file_state
```

### Publishing system

```typescript
// Publish for public access
await mutators.file.update({
	id: fileId,
	published: true,
	publishedSlug: generateSlug(),
	lastPublished: Date.now(),
})
```

## Feedback system

### User feedback collection

```typescript
interface SubmitFeedbackRequestBody {
	description: string // User's feedback/bug report
	allowContact: boolean // Permission to follow up
	url: string // Page where feedback originated
}

const MAX_PROBLEM_DESCRIPTION_LENGTH = 2000
```

## License management

### License key system

```typescript
// License validation for pro features
export default function getLicenseKey(): string | null {
	// Returns license key for premium features
	// Used by both client and worker for feature gating
}
```

## Key benefits

### Developer experience

- **Type safety**: Full TypeScript definitions for all operations
- **Real-time**: Optimistic updates for instant UI feedback
- **Scalable**: Designed for thousands of concurrent users
- **Reliable**: Automatic conflict resolution and error recovery

### User experience

- **Instant updates**: Changes appear immediately while syncing
- **Offline resilience**: Optimistic updates work during network issues
- **Collaborative**: Multiple users can edit simultaneously
- **Persistent**: All changes automatically saved and synchronized

### Architecture

- **Shared logic**: Common code between client and server
- **Event driven**: WebSocket-based real-time communication
- **Permission controlled**: Secure access to user and file data
- **Version managed**: Protocol versioning for smooth updates

### Maintenance

- **Schema evolution**: Zero-downtime database migrations
- **Error tracking**: Comprehensive error codes and logging
- **Performance**: Optimized queries and efficient data structures
- **Testing**: Comprehensive test coverage for critical paths


# ==================
# FILE: packages/editor/CONTEXT.md
# ==================

````markdown
# CONTEXT.md - @tldraw/editor package

This file provides comprehensive context for understanding the `@tldraw/editor` package, the core infinite canvas editor for tldraw.

## Package overview

The `@tldraw/editor` package is the foundational layer of tldraw - a minimal infinite canvas editor without any specific shapes, tools, or UI. It provides the core editing engine that the main `tldraw` package builds upon.

**Key distinction:** This package provides the editor engine only. For a complete editor with shapes and UI, use `@tldraw/tldraw` instead.

**Version:** 3.15.1  
**Compatibility:** Requires Node.js ^20.0.0, React ^18.0.0  
**Bundle:** Ships with separate CSS file (`editor.css`) that must be imported

## Architecture overview

### Core components

**1. Editor Class (`src/lib/editor/Editor.ts`)**

- Central orchestrator for all editor functionality
- Manages the store, camera, selection, tools, and rendering
- Implements the main API surface for programmatic interaction
- Event-driven architecture using EventEmitter3
- Reactive state management using `@tldraw/state` signals

**2. TldrawEditor Component (`src/lib/TldrawEditor.tsx`)**

- Main React component that renders the editor
- Handles store creation, loading states, error boundaries
- Manages editor lifecycle and mounting
- Provides theming (light/dark mode) and licensing

**3. Store Integration**

- Uses `@tldraw/store` for reactive data persistence
- Supports local IndexedDB persistence via `persistenceKey`
- Can accept external stores or create internal ones
- Handles loading states and sync status

### State management architecture

**Reactive signals system:**

- Uses `@tldraw/state` for reactive state management
- Atoms for mutable state, Computed for derived state
- Automatic dependency tracking and efficient updates
- All editor state is reactive and observable

**Store structure:**

- Document data stored in `TLStore` (shapes, pages, assets, etc.)
- Editor state (camera, selection, tools) stored separately
- Derivations compute dependent values efficiently
- History management with undo/redo support

### Tools and state system

**StateNode architecture (`src/lib/editor/tools/StateNode.ts`)**

- Hierarchical finite state machine for tools
- Each tool is a StateNode with potential child states
- Event-driven with handlers for pointer, keyboard, tick events
- Supports both "branch" nodes (with children) and "leaf" nodes

**Tool types:**

- Root state manages overall editor state
- Tool states handle specific user interactions
- Child states for complex tools (e.g., drawing, resizing)
- Configurable tool state charts

### Shape system

**ShapeUtil architecture (`src/lib/editor/shapes/ShapeUtil.ts`)**

- Abstract base class for defining shape behavior
- Each shape type needs a corresponding ShapeUtil
- Handles rendering, geometry, interactions, and serialization
- Extensible system for custom shapes

**Key shape methods:**

- `getGeometry()` - Shape's geometric representation
- `component()` - React component for rendering
- `indicator()` - Selection indicator rendering
- `onResize()`, `onRotate()` - Interaction handlers

### Binding system

**BindingUtil architecture (`src/lib/editor/bindings/BindingUtil.ts`)**

- Abstract base class for defining relationships between shapes
- Manages connections like arrows to shapes, text to shapes, etc.
- Handles binding creation, updates, and cleanup
- Each binding type needs a corresponding BindingUtil

**Key binding concepts:**

- Bindings connect shapes through relationships
- `fromId` and `toId` reference connected shapes
- BindingUtils define visual indicators and interaction behavior
- Automatically updated when connected shapes change

### Manager system

The editor uses specialized managers for different concerns:

**Core managers:**

- `ClickManager` - Multi-click detection and handling
- `EdgeScrollManager` - Auto-scroll at viewport edges during interactions
- `FocusManager` - Focus state and keyboard event handling
- `FontManager` - Font loading and management
- `HistoryManager` - Undo/redo functionality
- `ScribbleManager` - Brush/scribble interactions
- `SnapManager` - Shape snapping during interactions
- `TextManager` - Text measurement and rendering
- `TickManager` - Animation frame management
- `UserPreferencesManager` - User settings persistence

### Component system

**Default components (`src/lib/components/default-components/`)**

- Minimal implementations for all editor UI elements
- Canvas, cursors, handles, selection indicators, grid
- Error fallbacks and loading screens
- Fully customizable via `components` prop

**Key components:**

- `DefaultCanvas` - Main drawing surface
- `DefaultCursor` - Mouse cursor rendering
- `DefaultHandles` - Shape resize/rotate handles
- `DefaultSelectionBackground/Foreground` - Selection UI
- `DefaultGrid` - Viewport grid overlay

**Indicators system (`src/lib/components/default-components/DefaultSelectionBackground.tsx`)**

- Visual feedback for shape selection and interaction states
- Includes selection boxes, rotation handles, and resize handles
- Shape-specific indicators defined in ShapeUtil.indicator()
- Binding indicators for relationship visualization

### Text editing integration

**Tiptap integration:**

- Uses `@tiptap/core` and related packages for rich text editing
- Provides collaborative text editing capabilities
- Handles text formatting, selection, and cursor management
- Integrates with tldraw's event system and state management

**Text manager (`src/lib/editor/managers/TextManager.ts`):**

- Handles text measurement and font metrics
- Manages text input states and focus
- Coordinates with Tiptap editor instances
- Provides text layout and wrapping calculations

### Geometry and math

**Primitive system (`src/lib/primitives/`)**

- `Vec` - 2D vector math
- `Mat` - 2D transformation matrices
- `Box` - Axis-aligned bounding boxes
- Geometry2d classes for shape collision/intersection
- Comprehensive math utilities for canvas operations

**Geometry classes:**

- `Rectangle2d`, `Circle2d`, `Polygon2d`, etc.
- Hit testing and intersection calculations
- Point-in-shape and shape-shape collision detection

### Event system

**Event flow:**

1. DOM events captured by editor container
2. Processed through pointer/keyboard managers
3. Dispatched to current tool's StateNode
4. Tool updates editor state accordingly
5. Reactive system triggers re-renders

**Event types:**

- Pointer events (down, move, up) with target detection
- Keyboard events with modifier key handling
- Wheel events for zooming/panning
- Tick events for animations

### Export and serialization

**Export capabilities:**

- SVG export with full shape fidelity
- PNG/JPEG export via canvas rendering
- Snapshot serialization for persistence
- Asset handling (images, videos, fonts)

**Deep links:**

- URL-based state synchronization
- Camera position and selected shapes in URL
- Configurable deep link behavior

### Licensing and watermark

**License management:**

- Handles tldraw licensing and watermark display
- `LicenseProvider` and `LicenseManager` components
- Watermark removal with valid business license
- License validation and enforcement

## Key files and directories

### Core implementation

- `src/lib/editor/Editor.ts` - Main editor class
- `src/lib/TldrawEditor.tsx` - React component wrapper
- `src/lib/config/createTLStore.ts` - Store creation and configuration
- `src/lib/options.ts` - Editor configuration options

### Tools and state

- `src/lib/editor/tools/StateNode.ts` - State machine base class
- `src/lib/editor/tools/RootState.ts` - Root state implementation
- `src/lib/editor/tools/BaseBoxShapeTool/` - Base tool for box shapes

### Shape system

- `src/lib/editor/shapes/ShapeUtil.ts` - Shape utility base class
- `src/lib/editor/shapes/BaseBoxShapeUtil.tsx` - Base for rectangular shapes
- `src/lib/editor/shapes/group/GroupShapeUtil.tsx` - Group shape implementation

### Binding system

- `src/lib/editor/bindings/BindingUtil.ts` - Binding utility base class

### Managers

- `src/lib/editor/managers/` - All manager implementations
- `src/lib/editor/managers/ClickManager.ts` - Multi-click handling
- `src/lib/editor/managers/EdgeScrollManager.ts` - Auto-scroll functionality
- `src/lib/editor/managers/FocusManager.ts` - Focus state management
- `src/lib/editor/managers/FontManager.ts` - Font loading and management
- `src/lib/editor/managers/HistoryManager.ts` - Undo/redo functionality
- `src/lib/editor/managers/ScribbleManager.ts` - Brush interactions
- `src/lib/editor/managers/SnapManager.ts` - Shape snapping
- `src/lib/editor/managers/TextManager.ts` - Text measurement and rendering
- `src/lib/editor/managers/TickManager.ts` - Animation frame management
- `src/lib/editor/managers/UserPreferencesManager.ts` - User settings

### Components and indicators

- `src/lib/components/default-components/` - Default UI components
- `src/lib/components/default-components/DefaultCanvas.tsx` - Main drawing surface
- `src/lib/components/default-components/DefaultCursor.tsx` - Mouse cursor rendering
- `src/lib/components/default-components/DefaultHandles.tsx` - Shape handles
- `src/lib/components/default-components/DefaultSelectionBackground.tsx` - Selection indicators
- `src/lib/components/default-components/DefaultGrid.tsx` - Viewport grid

### Testing infrastructure

- `src/test/TestEditor.ts` - Editor testing utilities and mocks
- `src/test/` - Integration tests and test helpers

### Utilities

- `src/lib/utils/` - Editor-specific utilities
- `src/lib/primitives/` - Math and geometry utilities
- `src/lib/hooks/` - React hooks for editor integration

## Development patterns

### Creating custom shapes

```typescript
class MyShapeUtil extends ShapeUtil<TLMyShape> {
  static override type = 'my-shape' as const

  getGeometry(shape: TLMyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
    })
  }

  component(shape: TLMyShape) {
    return <div>My Shape Content</div>
  }

  indicator(shape: TLMyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```
````

### Creating custom tools

```typescript
export class MyTool extends StateNode {
	static override id = 'my-tool'

	onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	onPointerDown(info: TLPointerEventInfo) {
		this.editor.createShape({
			id: createShapeId(),
			type: 'my-shape',
			x: info.point.x,
			y: info.point.y,
		})
	}
}
```

### State management

```typescript
// Access reactive state
const selectedShapes = editor.getSelectedShapes()
const bounds = editor.getSelectionPageBounds()

// Subscribe to changes
editor.store.listen((entry) => {
	console.log('Store changed:', entry)
})

// Use transactions for atomic updates
editor.batch(() => {
	editor.createShape(shape1)
	editor.createShape(shape2)
	editor.selectAll()
})
```

### Testing patterns

```typescript
import { TestEditor } from './test/TestEditor'

describe('MyFeature', () => {
	let editor: TestEditor

	beforeEach(() => {
		editor = new TestEditor()
	})

	it('should create shapes', () => {
		editor.createShape({ type: 'geo', id: ids.box1 })
		expect(editor.getOnlySelectedShape()).toBe(editor.getShape(ids.box1))
	})
})
```

## Dependencies

**Runtime dependencies:**

- `@tldraw/state` ^3.15.1 - Reactive state management
- `@tldraw/state-react` ^3.15.1 - React integration for state
- `@tldraw/store` ^3.15.1 - Document store
- `@tldraw/tlschema` ^3.15.1 - Type definitions and migrations
- `@tldraw/utils` ^3.15.1 - Shared utilities
- `@tldraw/validate` ^3.15.1 - Schema validation
- `@tiptap/core` ^2.6.6 - Rich text editing foundation
- `@tiptap/react` ^2.6.6 - React integration for Tiptap
- `@tiptap/pm` ^2.6.6 - ProseMirror integration
- `@use-gesture/react` ^10.3.1 - Touch/gesture handling
- `classnames` ^2.5.1 - CSS class utility
- `core-js` ^3.39.0 - JavaScript polyfills
- `eventemitter3` ^5.0.1 - Event system
- `idb` ^8.0.0 - IndexedDB wrapper
- `is-plain-object` ^5.0.0 - Object type checking

**Key peer dependencies:**

- `react` ^18.0.0 - Required React version
- `react-dom` ^18.0.0 - Required React DOM version

## CSS and styling

**CSS bundle:**

- Ships with `editor.css` containing all core styles
- Uses CSS custom properties for theming
- Separate from tldraw.css (which includes shape styles)
- Must be imported: `import '@tldraw/editor/editor.css'`

**Styling approach:**

- CSS-in-JS for dynamic styles (selections, cursors)
- Static CSS for layout and base component styles
- Theme variables for light/dark mode switching
- Minimal external styling dependencies

## Performance considerations

**Reactive system optimization:**

- Reactive system minimizes unnecessary re-renders through precise dependency tracking
- Computed values are cached and only recalculated when dependencies change
- Store changes are batched to prevent cascading updates
- Component re-renders are minimized through React memo and signal integration

**Rendering performance:**

- Geometry calculations are cached and memoized using shape geometry cache
- Large shape counts handled via viewport culling - only visible shapes are rendered
- Canvas rendering optimized for 60fps interactions with efficient paint cycles
- SVG export uses virtualization for large documents
- Font loading is managed asynchronously to prevent layout shifts during text rendering

**Memory management:**

- Unused shape utilities are garbage collected
- Event listeners are properly cleaned up on component unmount
- Large assets are handled with lazy loading and disposal
- Store history is pruned to prevent unbounded memory growth

## Extensibility points

**Highly customizable:**

- Shape definitions via ShapeUtil
- Binding definitions via BindingUtil
- Tool behavior via StateNode
- UI components via components prop
- Event handling via editor instance
- Styling via CSS custom properties

**Less customizable:**

- Core editor logic and data flow
- Store structure and reactivity system
- Basic event processing pipeline
- Text editing integration with Tiptap

```

```


# ==================
# FILE: packages/namespaced-tldraw/CONTEXT.md
# ==================

Now I have enough information to fix the CONTEXT.md file with the correct details. Here's the updated version:

# Namespaced-Tldraw Package Context

## Overview

The `@tldraw/tldraw` package is a legacy compatibility wrapper that re-exports the main `tldraw` package while adding global library registration. It exists primarily for backwards compatibility and CDN/global usage scenarios where version tracking is important.

## Architecture

### Legacy compatibility layer

Simple re-export pattern with version registration:

```typescript
import { registerTldrawLibraryVersion } from 'tldraw'
export * from 'tldraw'

// Register version info for global usage tracking
registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
```

### Package structure

```
namespaced-tldraw/
├── src/
│   └── index.ts              # Re-export + version registration
├── scripts/
│   └── copy-css-files.mjs    # CSS file synchronization
├── tldraw.css                # Copied CSS from main package
├── dist-cjs/                 # CommonJS distribution
├── dist-esm/                 # ES modules distribution
├── api/                      # API documentation
└── api-report.api.md         # API report in package root
```

## Distribution strategy

### Build system integration

Uses tsx wrapper for build processes:

```json
{
	"build": "yarn run -T tsx ../../internal/scripts/build-package.ts",
	"build-api": "yarn run -T tsx ../../internal/scripts/build-api.ts",
	"prepack": "yarn run -T tsx ../../internal/scripts/prepack.ts"
}
```

**Note**: The `main` and `types` fields in package.json are rewritten by the build script and are not the actual published values.

### CSS asset management

Automated CSS synchronization from main package using correct relative paths:

```javascript
// scripts/copy-css-files.mjs
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

const packageDir = join(__dirname, '..')
const content = readFileSync(join(packageDir, '..', 'tldraw', 'tldraw.css'), 'utf8')
const destination = join(packageDir, 'tldraw.css')
writeFileSync(destination, content)
```

**Build integration:**

```json
{
	"predev": "node ./scripts/copy-css-files.mjs",
	"dev": "chokidar '../tldraw/tldraw.css' -c 'node ./scripts/copy-css-files.mjs'",
	"prebuild": "node ./scripts/copy-css-files.mjs"
}
```

## Global usage support

### Version registration system

Enables version tracking for CDN and global usage using globalThis casting:

```typescript
// Library version info injected by build system
// Global variables accessed via globalThis casting
registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME, // Package identifier
	(globalThis as any).TLDRAW_LIBRARY_VERSION, // Semantic version
	(globalThis as any).TLDRAW_LIBRARY_MODULES // Included modules list
)
```

### CDN integration patterns

Designed for script tag and global usage:

```html
<!-- CDN usage -->
<script src="https://unpkg.com/@tldraw/tldraw"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw/tldraw.css" />

<script>
	// Access via global namespace
	const { Tldraw } = window.Tldraw

	// Version tracking automatically enabled
	console.log('tldraw version:', window.TLDRAW_LIBRARY_VERSION)
</script>
```

## Package dependencies

### Minimal dependency chain

Single dependency on core tldraw package:

```json
{
	"dependencies": {
		"tldraw": "workspace:*" // Re-export main package
	},
	"peerDependencies": {
		"react": "^18.2.0 || ^19.2.1",
		"react-dom": "^18.2.0 || ^19.2.1"
	}
}
```

### Development dependencies

Build and development tooling:

```json
{
	"devDependencies": {
		"@types/react": "^18.3.18",
		"chokidar-cli": "^3.0.0", // CSS file watching
		"lazyrepo": "0.0.0-alpha.27",
		"react": "^18.3.1",
		"react-dom": "^18.3.1"
	}
}
```

## Build system

### Dual package exports

Support for both CommonJS and ES modules (built by tsx scripts):

```
dist-cjs/
├── index.js          # CommonJS entry point
├── index.d.ts        # CommonJS type definitions
└── index.js.map      # Source maps

dist-esm/
├── index.mjs         # ES module entry point
├── index.d.mts       # ES module type definitions
└── index.mjs.map     # Source maps
```

### API Documentation

Automated API extraction and documentation:

```
api/
├── api.json          # Machine-readable API surface
├── public.d.ts       # Public API definitions
├── internal.d.ts     # Internal API definitions
└── temp/
    └── api-report.api.md  # Human-readable API report

api-report.api.md     # Also exists in package root
```

### CSS Distribution

CSS file included in package files array:

```json
{
	"files": ["tldraw.css"]
}
```

**CSS Import**: Users import the CSS file directly from the package:

```typescript
import '@tldraw/tldraw/tldraw.css'
```

## Legacy support

### Migration path

Smooth transition for existing users:

```typescript
// Old usage (still works)
import { Tldraw } from '@tldraw/tldraw'

// New recommended usage
import { Tldraw } from 'tldraw'

// Both import the exact same functionality
```

### Backwards compatibility

Maintains full API compatibility:

- **Same exports**: Identical API surface as main package
- **Same types**: TypeScript definitions preserved
- **Same CSS**: Styling rules synchronized
- **Same behavior**: Functional parity guaranteed

## Use cases

### CDN distribution

Global script tag usage for quick prototyping:

```html
<script src="https://unpkg.com/@tldraw/tldraw@latest/dist-cjs/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw@latest/tldraw.css" />
```

### Legacy projects

Existing codebases that depend on `@tldraw/tldraw` naming:

```typescript
// Existing imports continue to work
import { Tldraw, Editor, createShapeId } from '@tldraw/tldraw'

// No code changes required for migration
```

### Version monitoring

Applications that need to track tldraw version usage:

```typescript
// Access version information at runtime
const libraryInfo = {
	name: (globalThis as any).TLDRAW_LIBRARY_NAME,
	version: (globalThis as any).TLDRAW_LIBRARY_VERSION,
	modules: (globalThis as any).TLDRAW_LIBRARY_MODULES,
}

// Useful for analytics, debugging, feature detection
```

## Development workflow

### CSS synchronization

Automatic CSS file management during development:

```bash
# Development mode - watch for CSS changes
yarn dev  # Monitors ../tldraw/tldraw.css for changes

# Build mode - ensure CSS is current
yarn build  # Copies CSS before building distributions
```

### Testing environment

Jest configuration with correct testEnvironment path:

```json
{
	"preset": "../../internal/config/jest/node/jest-preset.js",
	"testEnvironment": "../../../packages/utils/patchedJestJsDom.js",
	"setupFiles": ["raf/polyfill", "jest-canvas-mock"],
	"setupFilesAfterEnv": ["../../internal/config/setupJest.ts"],
	"moduleNameMapper": {
		"^~(.*)": "<rootDir>/src/$1",
		"\\.(css|less|scss|sass)$": "identity-obj-proxy"
	}
}
```

## Migration guidance

### For new projects

```typescript
// Recommended: Use main package
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

### For existing projects

```typescript
// Current: Legacy package (still supported)
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// Migration: Update imports when convenient
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

## Key benefits

### Backwards compatibility

- **Zero breaking changes**: Existing code continues to work
- **Gradual migration**: Update imports at your own pace
- **Feature parity**: Identical functionality to main package
- **Documentation continuity**: Same API documentation applies

### Global usage

- **CDN friendly**: Optimized for script tag inclusion
- **Version tracking**: Runtime version information available via globalThis
- **Namespace safety**: Avoids global namespace conflicts
- **Browser compatibility**: Works in all modern browsers

### Maintenance

- **Automated sync**: CSS and exports stay current with main package via tsx build scripts
- **Single source**: No duplicate implementation to maintain
- **Version alignment**: Always matches main package version
- **Testing coverage**: Inherits test suite from main package

### Ecosystem

- **NPM compatibility**: Standard npm package structure
- **Bundler support**: Works with all major bundlers
- **TypeScript ready**: Full type safety maintained
- **Documentation**: API docs generated automatically with reports in both api/temp/ and package root


# ==================
# FILE: packages/state-react/CONTEXT.md
# ==================

````markdown
# State-React Package Context

## Overview

The `@tldraw/state-react` package provides React bindings for tldraw's reactive state system (signals). It bridges the gap between the pure signals implementation in `@tldraw/state` and React's component lifecycle, enabling seamless integration of reactive state with React applications.

## Architecture

### Core React hooks

#### `useValue` - signal subscription

The primary hook for extracting values from signals and subscribing to changes:

```typescript
// Direct signal subscription
useValue<Value>(signal: Signal<Value>): Value

// Computed value with dependency tracking
useValue<Value>(name: string, compute: () => Value, deps: unknown[]): Value
```
````

Implementation details:

- Uses `useSyncExternalStore` for React 18 compatibility
- Creates subscription to signal change events
- Returns unwrapped value using `__unsafe__getWithoutCapture()` method
- Supports both direct signals and computed expressions
- Automatic dependency tracking with deps array
- Safe error handling with try-catch blocks for render-time exceptions

**Return signature:**
The hook returns the actual value (not the signal wrapper) by using `__unsafe__getWithoutCapture()` to avoid triggering dependency tracking during the subscription callback.

#### `useAtom` - component-local state

Creates component-scoped reactive atoms:

```typescript
useAtom<Value, Diff>(
  name: string,
  valueOrInitialiser: Value | (() => Value),
  options?: AtomOptions<Value, Diff>
): Atom<Value, Diff>
```

Features:

- Created only once per component instance using `useState`
- Supports lazy initialization with function initializers
- Configurable with AtomOptions (diff functions, etc.)
- Automatically cleaned up when component unmounts

#### `useComputed` - component-local computed values

Creates memoized computed signals within components:

```typescript
// Basic computed value
useComputed<Value>(name: string, compute: () => Value, deps: any[]): Computed<Value>

// Advanced computed value with options
useComputed<Value, Diff>(
  name: string,
  compute: () => Value,
  opts: ComputedOptions<Value, Diff>,
  deps: any[]
): Computed<Value>
```

The second overload accepts `ComputedOptions` which allows configuration of diff functions, equality checks, and other advanced behaviors for optimization.

Benefits:

- Memoized using `useMemo` with dependency array
- Reactive dependencies tracked automatically during computation
- Efficient recomputation only when dependencies change
- Named for debugging and performance profiling

### Effect hooks

#### `useReactor` - frame-throttled effects

Runs reactive effects with updates throttled to animation frames:

```typescript
useReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with custom `scheduleEffect` callback
- The throttling is handled by `throttleToNextFrame` utility passed to the scheduler
- `EffectScheduler` itself doesn't handle throttling - it delegates to the provided callback
- Proper cleanup on unmount or dependency changes
- Ideal for visual updates and animations

#### `useQuickReactor` - immediate effects

Runs reactive effects without throttling:

```typescript
useQuickReactor(name: string, reactFn: () => void, deps?: any[]): void
```

Implementation:

- Uses `EffectScheduler` with immediate execution (no throttling callback)
- Effects run synchronously when dependencies change

Use cases:

- Immediate state synchronization
- Non-visual side effects
- Critical updates that can't wait for next frame

### Component tracking

#### `track` - higher-order component

Automatically tracks signal dependencies in React components:

```typescript
track<T extends FunctionComponent<any>>(
  baseComponent: T
): React.NamedExoticComponent<React.ComponentProps<T>>
```

Advanced implementation:

- **ProxyHandlers**: Uses JavaScript Proxy to intercept function calls and track signal access
- **React.memo integration**: Automatically wraps components in memo for performance
- **Forward ref support**: Handles forwardRef components correctly
- **Symbol detection**: Works with React's internal component types

#### `useStateTracking` - lower-level tracking

Manual reactive tracking for render functions:

```typescript
useStateTracking<T>(name: string, render: () => T, deps: unknown[] = []): T
```

Features:

- Uses `EffectScheduler` for dependency tracking
- Integrates with `useSyncExternalStore`
- Uses `scheduleCount` mechanism for efficient snapshot-based change detection
- Deferred effect attachment to avoid render-phase side effects
- Prevents "zombie component" issues during unmounting
- `deps` parameter has default empty array value

## Key implementation details

### The `__unsafe__getWithoutCapture` method

This internal method is used in `useValue` to extract signal values without triggering dependency tracking:

```typescript
// In useValue implementation
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		return signal.subscribe(signal.name, onStoreChange)
	},
	[$signal]
)

const getSnapshot = useCallback(() => {
	return $signal.__unsafe__getWithoutCapture() // Avoids dependency tracking
}, [$signal])
```

**Why it's needed:**

- During subscription callbacks, we want the current value without creating reactive dependencies
- Prevents infinite loops where getting a value triggers the subscription
- Ensures clean separation between subscription and value extraction

### ProxyHandlers implementation

The `track` function uses JavaScript Proxy to intercept React component function calls:

```typescript
const proxiedComponent = new Proxy(baseComponent, {
	apply(target, thisArg, argArray) {
		return useStateTracking(target.name || 'TrackedComponent', () => {
			return target.apply(thisArg, argArray)
		})
	},
})
```

This allows automatic signal tracking without manual hook calls in every component.

### EffectScheduler integration

The package uses `EffectScheduler` differently for different hooks:

**useReactor (throttled):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn,
			{ scheduleEffect: throttleToNextFrame } // Custom scheduling
		),
	deps
)
```

**useQuickReactor (immediate):**

```typescript
const scheduler = useMemo(
	() =>
		new EffectScheduler(
			name,
			reactFn
			// No scheduleEffect = immediate execution
		),
	deps
)
```

The `EffectScheduler` itself is agnostic to timing - it delegates scheduling to the provided callback or executes immediately.

## Key design patterns

### React integration strategy

The package uses several React patterns for optimal integration:

1. **useSyncExternalStore**: Official React 18 hook for external state
2. **useEffect**: Lifecycle management for reactive effects
3. **useMemo**: Memoization of expensive signal creation
4. **useState**: Component-local signal instances

### Performance optimizations

#### Throttling strategy

```typescript
// Frame-throttled updates for visual changes
useReactor(
	'visual-update',
	() => {
		// Updates throttled to animation frame
	},
	[]
)

// Immediate updates for critical state
useQuickReactor(
	'state-sync',
	() => {
		// Immediate execution
	},
	[]
)
```

#### Dependency management

- Explicit dependency arrays like React hooks
- Automatic signal dependency tracking during execution
- Efficient change detection using epoch-based snapshots
- `scheduleCount` mechanism in `useStateTracking` for batched updates

### Error handling patterns

The package includes comprehensive error handling:

```typescript
// In useValue subscription
const subscribe = useCallback(
	(onStoreChange: () => void) => {
		try {
			return $signal.subscribe($signal.name, onStoreChange)
		} catch (error) {
			// Handle subscription errors gracefully
			console.error('Signal subscription failed:', error)
			return () => {} // Return no-op cleanup
		}
	},
	[$signal]
)
```

Common patterns:

- Try-catch blocks around signal operations
- Graceful degradation on subscription failures
- Error isolation to prevent cascade failures
- Safe cleanup functions to prevent memory leaks

### Memory management

- Automatic cleanup of reactive subscriptions
- Proper disposal of effect schedulers
- Prevention of memory leaks through careful lifecycle management
- Component unmounting detection to avoid "zombie" subscriptions

## Component unmounting and cleanup

### Handling component lifecycle

```typescript
// Effect cleanup on unmount
useEffect(() => {
	const scheduler = new EffectScheduler(name, reactFn, options)
	return () => scheduler.dispose() // Automatic cleanup
}, deps)

// Atom cleanup (handled automatically by React)
const atom = useAtom('myAtom', initialValue)
// No manual cleanup needed - React handles disposal
```

### Preventing memory leaks

- All reactive subscriptions are automatically unsubscribed on unmount
- Effect schedulers are properly disposed
- Signal references are cleared when components unmount
- Proxy objects don't create persistent references

## Usage patterns

### Basic component tracking

```typescript
const Counter = track(function Counter() {
  const $count = useAtom('count', 0)
  return <button onClick={() => $count.set($count.get() + 1)}>
    {$count.get()}
  </button>
})
```

### Computed values in components

```typescript
const UserProfile = track(function UserProfile({ userId }: Props) {
  const $user = useValue('user', () => getUserById(userId), [userId])
  const $displayName = useComputed('displayName', () =>
    `${$user.firstName} ${$user.lastName}`, [$user]
  )
  return <div>{$displayName.get()}</div>
})
```

### Side effects and synchronization

```typescript
const DataSyncComponent = track(function DataSync() {
	const $editor = useEditor()

	// Visual updates (throttled to animation frame)
	useReactor(
		'ui-updates',
		() => {
			updateUIBasedOnSelection($editor.getSelectedShapeIds())
		},
		[$editor]
	)

	// Critical state sync (immediate)
	useQuickReactor(
		'data-sync',
		() => {
			syncCriticalData($editor.getPageState())
		},
		[$editor]
	)
})
```

### Manual state tracking

```typescript
function CustomComponent() {
  return useStateTracking('CustomComponent', () => {
    const $shapes = editor.getCurrentPageShapes()
    return <div>Shape count: {$shapes.length}</div>
  })
}
```

## Performance considerations

### When to use each hook

**useValue:**

- Best for: Simple signal subscriptions and computed values
- Performance: Optimal for frequently changing values
- Use when: You need the raw value, not the signal wrapper

**useReactor:**

- Best for: Visual updates, DOM manipulations, animations
- Performance: Throttled to 60fps, prevents excessive renders
- Use when: Updates can be batched to animation frames

**useQuickReactor:**

- Best for: Critical state synchronization, event handling
- Performance: Immediate execution, higher CPU usage
- Use when: Updates must happen immediately

**useStateTracking:**

- Best for: Complex render logic with multiple signal dependencies
- Performance: Fine-grained control over tracking behavior
- Use when: You need manual control over the tracking lifecycle

### Optimization guidelines

1. **Prefer `$` prefix**: Use consistent naming for signals (`$count`, `$user`)
2. **Batch related changes**: Group signal updates to minimize renders
3. **Use appropriate effect hooks**: Choose throttled vs immediate based on use case
4. **Minimize dependency arrays**: Only include truly reactive dependencies
5. **Avoid creating signals in render**: Use `useAtom`/`useComputed` for component-local state

### Memory and performance monitoring

- Signal subscriptions are lightweight but should be monitored in large applications
- Use React DevTools to identify unnecessary re-renders
- Monitor `EffectScheduler` instances in development for cleanup verification
- Track signal creation/disposal patterns to identify memory leaks

## Integration with tldraw

### Editor components

Used throughout tldraw's React components:

- **TldrawEditor**: Main editor component uses tracking
- **UI components**: All reactive UI elements use state-react hooks
- **Tool components**: State machines integrated with React lifecycle

### Performance in complex UIs

- **Selective updates**: Only components accessing changed signals re-render
- **Batched updates**: Multiple signal changes batched into single renders
- **Frame alignment**: Visual updates aligned with browser paint cycles

## Key benefits

### Automatic reactivity

- No manual subscription management required
- Automatic dependency tracking eliminates bugs
- Components automatically re-render when state changes

### React ecosystem compatibility

- Works with existing React patterns and tools
- Compatible with React DevTools
- Integrates with React Suspense and Concurrent Features

### Performance

- Fine-grained reactivity prevents unnecessary re-renders
- Efficient change detection and subscription management
- Optimized for large, complex applications

### Developer experience

- Familiar React hook patterns
- Clear error messages with component context
- TypeScript integration with full type safety

## Dependencies

### External dependencies

- **React**: Core React hooks and lifecycle integration
- **@tldraw/state**: Core reactive state system (EffectScheduler, signals)
- **@tldraw/utils**: Throttling utilities (`throttleToNextFrame`)

### Integration points

- Builds directly on EffectScheduler from state package
- Uses utility functions for performance optimization
- Provides React-specific API surface for signals system

```

```


# ==================
# FILE: packages/state/CONTEXT.md
# ==================

# CONTEXT.md - @tldraw/state Package

This file provides comprehensive context for understanding the `@tldraw/state` package, a powerful reactive state management library using signals.

## Package overview

`@tldraw/state` is a fine-grained reactive state management library similar to MobX or SolidJS reactivity, but designed specifically for tldraw's performance requirements. It provides automatic dependency tracking, lazy evaluation, and efficient updates through a signals-based architecture.

**Core Philosophy:** Only recompute what actually needs to change, when it needs to change, with minimal overhead.

## Architecture overview

### Signal system foundation

The entire system is built around the `Signal<Value, Diff>` interface defined in `src/lib/types.ts`:

```typescript
interface Signal<Value, Diff = unknown> {
	name: string
	get(): Value
	lastChangedEpoch: number
	getDiffSince(epoch: number): RESET_VALUE | Diff[]
	__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value
	children: ArraySet<Child>
}
```

**Two signal types:**

1. **Atoms** (`src/lib/Atom.ts`) - Mutable state containers that hold raw values
2. **Computed** (`src/lib/Computed.ts`) - Derived values that automatically recompute when dependencies change

### Dependency tracking system

**Capture mechanism (`src/lib/capture.ts`):**

- Uses a global capture stack to automatically track dependencies
- When `.get()` is called during computation, `maybeCaptureParent()` registers dependencies
- `CaptureStackFrame` manages the capture context with efficient parent tracking
- `unsafe__withoutCapture()` allows reading values without creating dependencies

**Parent-child relationships:**

- Each signal maintains an `ArraySet<Child>` of dependents
- Each child maintains arrays of `parents` and `parentEpochs`
- Automatic cleanup when no more children exist

### Memory-optimized data structures

**ArraySet (`src/lib/ArraySet.ts`):**

- Hybrid array/Set implementation for optimal performance
- Uses array for small collections (≤8 items), switches to Set for larger ones
- Constant-time operations with minimal memory overhead
- Critical for managing parent-child relationships efficiently

### Reactive update propagation

**Effect scheduling (`src/lib/EffectScheduler.ts`):**

- `EffectScheduler` manages side effects and reactions
- `react()` creates immediate reactions, `reactor()` creates controllable ones
- Pluggable `scheduleEffect` for custom batching (e.g., requestAnimationFrame)
- Automatic cleanup and lifecycle management

**Epoch-based invalidation:**

- Global epoch counter increments on any state change
- Each signal tracks `lastChangedEpoch` for efficient dirty checking
- `haveParentsChanged()` in `helpers.ts` compares epochs to determine if recomputation needed

### Transaction system

**Atomic updates (`src/lib/transactions.ts`):**

- `transact()` batches multiple state changes into single atomic operation
- `transaction()` supports nested transactions with individual rollback
- Automatic rollback on exceptions
- `initialAtomValues` map stores original values for rollback

**Global state management:**

- Singleton pattern for global transaction state
- `globalEpoch` tracks current time
- `globalIsReacting` prevents infinite loops
- `cleanupReactors` manages effect cleanup during reactions

### History and time travel

**Change tracking (`src/lib/HistoryBuffer.ts`):**

- Circular buffer stores diffs between sequential values
- Configurable `historyLength` per signal
- `ComputeDiff<Value, Diff>` functions for custom diff computation
- `RESET_VALUE` symbol when history insufficient for incremental updates

**Incremental computation:**

- `withDiff()` helper for manually providing diffs
- `isUninitialized()` for handling first computation
- Diff-based computation allows efficient updates for large data structures

## Key classes and components

### Core signal implementations

**`__Atom__` (src/lib/Atom.ts):**

```typescript
class __Atom__<Value, Diff> implements Atom<Value, Diff> {
	private current: Value
	children: ArraySet<Child>
	historyBuffer?: HistoryBuffer<Diff>
	lastChangedEpoch: number

	get(): Value // captures parent relationship
	set(value: Value, diff?: Diff): Value
	update(updater: (Value) => Value): Value
}
```

**`__UNSAFE__Computed` (src/lib/Computed.ts):**

```typescript
class __UNSAFE__Computed<Value, Diff> implements Computed<Value, Diff> {
	private derivation: (prevValue: Value | UNINITIALIZED) => Value
	private lastComputedEpoch: number
	private state: 'dirty' | 'computing' | 'computed-clean'
	parents: Signal<any, any>[]
	parentSet: ArraySet<Signal<any, any>>

	// Lazy evaluation with dependency tracking
	get(): Value
}
```

### Supporting infrastructure

**Capture stack frame:**

- Manages dependency tracking during computation
- Efficiently handles parent addition/removal
- Supports debugging with ancestor epoch tracking

**Transaction management:**

- Nested transaction support with proper cleanup
- Rollback capability with value restoration
- Integration with effect scheduling

## Performance optimizations

### Memory efficiency

- `EMPTY_ARRAY` singleton for zero-allocation empty dependencies
- `ArraySet` hybrid data structure minimizes memory for small collections
- Lazy `HistoryBuffer` allocation only when history tracking needed
- `singleton()` pattern prevents duplicate global state

### Computation efficiency

- **Lazy evaluation:** Computed values only recalculate when dependencies change
- **Epoch comparison:** Fast dirty checking via numeric epoch comparison
- **Dependency pruning:** Automatic cleanup of unused parent-child relationships
- **Batch updates:** Transaction system prevents intermediate computations

### Runtime optimizations

- `__unsafe__getWithoutCapture()` bypasses dependency tracking for hot paths
- `isEqual` custom comparison functions prevent unnecessary updates
- Pluggable effect scheduling for batching (e.g., RAF)
- `haveParentsChanged()` efficiently checks if recomputation needed

## API patterns and usage

### Basic reactive state

```typescript
// Mutable state
const count = atom('count', 0)

// Derived state
const doubled = computed('doubled', () => count.get() * 2)

// Side effects
const stop = react('logger', () => console.log(doubled.get()))
```

### Advanced patterns

```typescript
// Custom equality
const user = atom('user', userObj, {
  isEqual: (a, b) => a.id === b.id
})

// History tracking
const shapes = atom('shapes', [], {
  historyLength: 100,
  computeDiff: (prev, next) => /* custom diff logic */
})

// Incremental computation
const processedData = computed('processed', (prevValue) => {
  if (isUninitialized(prevValue)) {
    return expensiveInitialComputation()
  }
  return incrementalUpdate(prevValue)
})
```

### Transaction patterns

```typescript
// Atomic updates
transact(() => {
	firstName.set('Jane')
	lastName.set('Smith')
	// Reactions run only once after both updates
})

// Rollback on error
try {
	transact((rollback) => {
		makeRiskyChanges()
		if (shouldAbort) rollback()
	})
} catch (error) {
	// Automatic rollback occurred
}
```

### Performance patterns

```typescript
// Reading without dependency tracking
const expensiveComputed = computed('expensive', () => {
	const important = importantAtom.get() // Creates dependency

	// Read metadata without creating dependency
	const metadata = unsafe__withoutCapture(() => metadataAtom.get())

	return computeExpensiveValue(important, metadata)
})

// Custom effect scheduling
const stop = react('dom-update', updateDOM, {
	scheduleEffect: (execute) => requestAnimationFrame(execute),
})
```

## Debugging and development

### Dependency debugging

- `whyAmIRunning()` prints hierarchical dependency tree showing what triggered updates
- Each signal has a `name` for debugging identification
- Debug flags track ancestor epochs in development

### Development warnings

- Warnings for computed getters (should use `@computed` decorator)
- API version checking prevents incompatible package versions
- Error boundaries with proper error propagation

## Integration points

### Internal dependencies

- `@tldraw/utils` for `registerTldrawLibraryVersion()`, `assert()`, utilities
- No external runtime dependencies - pure TypeScript implementation

### Related packages

- **`@tldraw/state-react`** - React hooks and components for state integration
- **`@tldraw/store`** - Record-based storage built on @tldraw/state
- **`@tldraw/editor`** - Canvas editor using reactive state throughout

### Extension points

- `AtomOptions.isEqual` - Custom equality comparison
- `ComputeDiff<Value, Diff>` - Custom diff computation
- `EffectSchedulerOptions.scheduleEffect` - Custom effect batching
- `@computed` decorator for class-based computed properties

## Key files and their roles

### Core implementation

- **`src/lib/types.ts`** - Foundational interfaces and types
- **`src/lib/Atom.ts`** - Mutable state containers (~200 lines)
- **`src/lib/Computed.ts`** - Derived state with lazy evaluation (~400 lines)
- **`src/lib/EffectScheduler.ts`** - Side effect management (~200 lines)

### Infrastructure

- **`src/lib/capture.ts`** - Dependency tracking mechanism (~150 lines)
- **`src/lib/transactions.ts`** - Atomic updates and rollback (~250 lines)
- **`src/lib/helpers.ts`** - Utilities and optimizations (~100 lines)
- **`src/lib/ArraySet.ts`** - Hybrid array/set data structure (~150 lines)
- **`src/lib/HistoryBuffer.ts`** - Change tracking storage (~100 lines)

### Support files

- **`src/lib/constants.ts`** - System constants
- **`src/lib/isSignal.ts`** - Type guards
- **`src/lib/warnings.ts`** - Development warnings
- **`src/index.ts`** - Public API exports

## Development guidelines

### Signal creation

- Always provide meaningful names for debugging
- Use `historyLength` only when diffs are needed
- Prefer built-in equality checking unless custom logic required
- Consider memory implications of history buffers

### Computed signals

- Use `@computed` decorator for class-based computed properties
- Handle `UNINITIALIZED` for incremental computations
- Use `withDiff()` when manually computing diffs
- Prefer lazy evaluation - avoid forcing computation unnecessarily

### Effect management

- Use `react()` for fire-and-forget effects
- Use `reactor()` when you need start/stop control
- Always clean up effects to prevent memory leaks
- Consider custom `scheduleEffect` for batching DOM updates

### Performance best practices

- Use `unsafe__withoutCapture()` sparingly for hot paths
- Implement custom `isEqual` for complex objects
- Batch updates with transactions
- Minimize signal creation in hot paths

### Debugging workflow

1. Use `whyAmIRunning()` to trace unexpected updates
2. Check signal names for clarity in debug output
3. Verify epoch tracking with ancestor debugging
4. Use browser devtools to inspect signal state

## Testing patterns

Located in `src/lib/__tests__/`:

- Unit tests for each core component
- Integration tests for complex scenarios
- Performance tests for optimization validation
- Mock implementations for external dependencies

## Common pitfalls

1. **Infinite loops:** Avoid updating atoms inside their own reactions
2. **Memory leaks:** Always clean up reactions and computed signals
3. **Unnecessary dependencies:** Use `unsafe__withoutCapture()` judiciously
4. **Transaction misuse:** Don't nest transactions unnecessarily
5. **History overhead:** Set appropriate `historyLength` based on usage patterns


# ==================
# FILE: packages/store/CONTEXT.md
# ==================

# CONTEXT.md - @tldraw/store Package

This file provides comprehensive context for understanding the `@tldraw/store` package, a reactive record storage system built on `@tldraw/state`.

## Package overview

`@tldraw/store` is a reactive record storage library that provides a type-safe, event-driven database for managing collections of records. It combines the reactive primitives from `@tldraw/state` with a robust record management system, including validation, migrations, side effects, and history tracking.

**Core Philosophy:** Manage collections of typed records with automatic reactivity, validation, and change tracking while maintaining excellent performance and type safety.

## Architecture overview

### Store system foundation

The `Store` class (`src/lib/Store.ts`) is the central orchestrator that manages:

- Record storage via reactive `AtomMap<RecordId, Record>`
- Change history via reactive `Atom<number, RecordsDiff>`
- Validation through `StoreSchema`
- Side effects through `StoreSideEffects`
- Query capabilities through `StoreQueries`

### Record system

**BaseRecord Interface (`src/lib/BaseRecord.ts`):**

```typescript
interface BaseRecord<TypeName extends string, Id extends RecordId<UnknownRecord>> {
	readonly id: Id
	readonly typeName: TypeName
}
```

**RecordType System (`src/lib/RecordType.ts`):**

- Factory for creating typed records with validation
- Manages default properties and record scopes
- Handles ID generation (random or custom)
- Supports ephemeral properties for non-persistent data

**Record Scopes:**

- **`document`** - Persistent and synced across instances
- **`session`** - Per-instance only, not synced but may be persisted
- **`presence`** - Per-instance, synced but not persisted (e.g., cursors)

### Reactive storage architecture

**AtomMap (`src/lib/AtomMap.ts`):**

- Reactive replacement for `Map` that stores values in atoms
- Each record is stored in its own atom for fine-grained reactivity
- Automatic dependency tracking when accessing records
- Supports both captured and uncaptured access patterns

**Storage Structure:**

```typescript
class Store<R extends UnknownRecord> {
	private readonly records: AtomMap<IdOf<R>, R> // Individual record atoms
	readonly history: Atom<number, RecordsDiff<R>> // Change tracking
	readonly query: StoreQueries<R> // Query derivations
	readonly sideEffects: StoreSideEffects<R> // Lifecycle hooks
}
```

### Change tracking and history

**RecordsDiff System (`src/lib/RecordsDiff.ts`):**

```typescript
interface RecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}
```

**History Management:**

- `HistoryAccumulator` batches changes before flushing to listeners
- History reactor uses `throttleToNextFrame` for performance
- Automatic diff squashing for efficient updates
- Support for reversible diffs and time-travel

### Query and indexing system

**StoreQueries (`src/lib/StoreQueries.ts`):**

- Reactive indexes for efficient querying
- `RSIndex<R, Property>` - Reactive indexes by property value
- `filterHistory()` - Type-filtered change streams
- `executeQuery()` - Complex query evaluation with incremental updates

**Query Features:**

- Automatic index maintenance via reactive derivations
- Incremental index updates using diffs
- Type-safe querying with full TypeScript support
- Performance-optimized for large record collections

### Migration system

**Migration Architecture (`src/lib/migrate.ts`):**

- Version-based migration system for schema evolution
- Support for both record-level and store-level migrations
- Dependency-aware migration ordering
- Rollback and validation during migrations

**Migration Types:**

- **Legacy Migrations** - Backward compatibility with old migration format
- **Modern Migrations** - New sequence-based migration system with dependencies
- **Subtype Migrations** - Property-level migrations for complex records

**Key Components:**

- `MigrationSequence` - Ordered migrations with dependency tracking
- `MigrationId` - Typed identifiers for migration versioning
- `createMigrationSequence()` - Builder for migration sequences
- `parseMigrationId()` - Version parsing and validation

### Side effects system

**StoreSideEffects (`src/lib/StoreSideEffects.ts`):**

- Lifecycle hooks for record operations
- Before/after handlers for create, update, delete operations
- Operation complete handlers for batch processing
- Type-specific handler registration

**Handler Types:**

```typescript
StoreBeforeCreateHandler<R> - Pre-process records before creation
StoreAfterCreateHandler<R>  - React to record creation
StoreBeforeChangeHandler<R> - Transform records before updates
StoreAfterChangeHandler<R>  - React to record changes
StoreBeforeDeleteHandler<R> - Validate or prevent deletions
StoreAfterDeleteHandler<R>  - Clean up after deletions
```

### Schema and validation

**StoreSchema (`src/lib/StoreSchema.ts`):**

- Type-safe record type registry
- Validation pipeline for record integrity
- Migration coordination across record types
- Schema versioning and evolution

**Validation Pipeline:**

1. `StoreValidator.validate()` - Basic record validation
2. `StoreValidator.validateUsingKnownGoodVersion()` - Optimized validation
3. Schema-level validation with error handling
4. Development-time integrity checking

## Key data structures and patterns

### AtomMap implementation

**Reactive Map Interface:**

- Implements standard `Map<K, V>` interface
- Each value stored in individual atom for granular reactivity
- Uses `ImmutableMap` internally for efficient updates
- Supports both reactive and non-reactive access patterns

**Memory Management:**

- Lazy atom creation - atoms created only when needed
- Automatic cleanup when records removed
- `UNINITIALIZED` marker for deleted values
- Efficient batch operations via transactions

### Query system architecture

**Reactive Indexing:**

```typescript
type RSIndex<R, Property> = Computed<
	RSIndexMap<R, Property>, // Map<PropertyValue, Set<RecordId>>
	RSIndexDiff<R, Property> // Map<PropertyValue, CollectionDiff<RecordId>>
>
```

**Incremental Updates:**

- Indexes maintained via reactive derivations
- Diff-based incremental updates for performance
- Automatic cleanup of empty index entries
- Cache management for frequently used queries

### Transaction and consistency

**Atomic Operations:**

- All multi-record operations wrapped in transactions
- Side effects run within transaction context
- Automatic rollback on validation failures
- Consistent view of data throughout operations

**Change Source Tracking:**

- `'user'` - Changes from application logic
- `'remote'` - Changes from synchronization
- Filtered listeners based on change source
- Separate handling for local vs remote updates

## Development patterns

### Creating record types

```typescript
// Define record interface
interface Book extends BaseRecord<'book'> {
	title: string
	author: IdOf<Author>
	numPages: number
}

// Create record type with defaults
const Book = createRecordType<Book>('book', {
	validator: bookValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	numPages: 0,
}))

// Use in store schema
const schema = StoreSchema.create(
	{
		book: Book,
		author: Author,
	},
	{
		migrations: [
			/* migration sequences */
		],
	}
)
```

### Store usage patterns

```typescript
// Create store
const store = new Store({
	schema,
	initialData: savedData,
	props: customProps,
})

// Basic operations
store.put([Book.create({ title: '1984', author: authorId })])
store.update(bookId, (book) => ({ ...book, title: 'Animal Farm' }))
store.remove([bookId])

// Reactive queries
const booksByAuthor = store.query.index('book', 'author')
const authorBooks = computed('author-books', () => {
	return booksByAuthor.get().get(authorId) ?? new Set()
})
```

### Side effects registration

```typescript
store.sideEffects.registerAfterCreateHandler('book', (book, source) => {
	// Update author's book count
	const author = store.get(book.author)
	store.update(book.author, (a) => ({
		...a,
		bookCount: a.bookCount + 1,
	}))
})

store.sideEffects.registerBeforeDeleteHandler('author', (author, source) => {
	// Prevent deletion if author has books
	const books = store.query.index('book', 'author').get().get(author.id)
	if (books && books.size > 0) {
		return false // Prevent deletion
	}
})
```

### Migration definition

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.myapp.book',
	sequence: [
		{
			id: 'com.myapp.book/1',
			up: (record: any) => {
				record.publishedYear = new Date(record.publishDate).getFullYear()
				delete record.publishDate
				return record
			},
			down: (record: any) => {
				record.publishDate = new Date(record.publishedYear, 0, 1).toISOString()
				delete record.publishedYear
				return record
			},
		},
	],
})
```

## Performance considerations

### Memory optimization

- `AtomMap` provides reactive access without duplicating data
- `ImmutableMap` used internally for efficient updates
- Lazy atom creation reduces memory overhead
- Automatic cleanup when records removed

### Query performance

- Reactive indexes automatically maintained
- Incremental updates via diff application
- Query result caching with automatic invalidation
- Efficient set operations for large collections

### Change propagation

- History accumulator batches changes before notification
- `throttleToNextFrame` prevents excessive listener calls
- Scoped listeners reduce unnecessary processing
- Filtered change streams for targeted reactivity

## Integration points

### Dependencies

- **`@tldraw/state`** - Core reactivity system
- **`@tldraw/utils`** - Utility functions and performance helpers

### Extension points

- **Custom Validators** - Record validation logic
- **Side Effect Handlers** - Lifecycle hooks for business logic
- **Migration Sequences** - Schema evolution over time
- **Query Expressions** - Complex record filtering

### Framework integration

- Framework-agnostic core with React bindings available
- Store instances can be shared across components
- Natural integration with `@tldraw/state-react` hooks
- SSR-compatible with proper hydration

## Key files and components

### Core implementation

- **`src/lib/Store.ts`** - Main store class (~800 lines)
- **`src/lib/AtomMap.ts`** - Reactive map implementation (~300 lines)
- **`src/lib/BaseRecord.ts`** - Record type definitions (~25 lines)
- **`src/lib/RecordType.ts`** - Record factory and management (~200 lines)

### Change management

- **`src/lib/RecordsDiff.ts`** - Diff operations and utilities (~200 lines)
- **`src/lib/StoreQueries.ts`** - Reactive indexing system (~400 lines)
- **`src/lib/StoreSideEffects.ts`** - Lifecycle hooks (~200 lines)

### Schema and validation

- **`src/lib/StoreSchema.ts`** - Schema management (~300 lines)
- **`src/lib/migrate.ts`** - Migration system (~500 lines)

### Support infrastructure

- **`src/lib/executeQuery.ts`** - Query evaluation engine
- **`src/lib/IncrementalSetConstructor.ts`** - Efficient set operations
- **`src/lib/devFreeze.ts`** - Development-time immutability
- **`src/lib/setUtils.ts`** - Set operation utilities

## Development guidelines

### Record design

- Keep records immutable - always return new objects
- Use appropriate record scopes for different data types
- Design records for efficient diffing when needed
- Implement proper validation for data integrity

### Store configuration

- Initialize stores with appropriate schema and props
- Configure migration sequences for schema evolution
- Set up side effects for business logic enforcement
- Use scoped listeners for performance optimization

### Query patterns

- Leverage reactive indexes for frequently accessed data
- Use computed signals to derive complex query results
- Prefer incremental updates over full recomputation
- Cache expensive query results appropriately

### Migration best practices

- Version changes incrementally with clear migration paths
- Test migrations thoroughly with real data
- Handle migration failures gracefully
- Document breaking changes and migration requirements

### Performance optimization

- Use `__unsafe__getWithoutCapture()` for hot paths that don't need reactivity
- Batch operations with transactions
- Implement efficient `isEqual` functions for complex records
- Profile query performance for large datasets

## Testing patterns

### Test structure

- Unit tests for individual components in `src/lib/test/`
- Integration tests for store operations
- Migration testing with sample data
- Performance testing for large datasets

### Common test scenarios

- Record CRUD operations with validation
- Side effect execution and error handling
- Migration forward and backward compatibility
- Query correctness and performance
- Concurrent access and transaction handling

## Common pitfalls

1. **Memory Leaks:** Not cleaning up listeners and computed queries
2. **Side Effect Loops:** Circular dependencies in side effect handlers
3. **Migration Failures:** Insufficient testing of schema changes
4. **Performance Issues:** Over-reactive queries without proper batching
5. **Validation Errors:** Inconsistent validation between create and update paths
6. **Transaction Scope:** Forgetting to wrap multi-record operations in transactions


# ==================
# FILE: packages/sync-core/CONTEXT.md
# ==================

# Sync-Core Package Context

## Overview

The `@tldraw/sync-core` package provides the core infrastructure for real-time collaboration and synchronization in tldraw. It implements a robust client-server synchronization protocol for sharing drawing state across multiple users, handling network issues, conflict resolution, and maintaining data consistency.

## Architecture

### Core components

#### `TLSyncClient` - client-Side synchronization

Manages client-side synchronization with the server:

```typescript
class TLSyncClient<R extends UnknownRecord> {
	// Connection management
	connect(): void
	disconnect(): void

	// State synchronization
	status: Signal<TLPersistentClientSocketStatus>
	store: Store<R>

	// Error handling
	TLSyncErrorCloseEventCode: 4099
	TLSyncErrorCloseEventReason: Record<string, string>
}
```

Key features:

- **Automatic Reconnection**: Handles network drops and reconnection
- **Optimistic Updates**: Local changes applied immediately
- **Conflict Resolution**: Server authoritative with rollback capability
- **Presence Management**: Real-time cursor and user presence

#### `TLSyncRoom` - server-Side room management

Manages server-side state for collaboration rooms:

```typescript
class TLSyncRoom<R extends UnknownRecord, Meta> {
	// Session management
	sessions: Map<string, RoomSession<R, Meta>>

	// State management
	state: DocumentState
	store: Store<R>

	// Room lifecycle
	getNumActiveConnections(): number
	close(): void
}
```

Responsibilities:

- **Session Lifecycle**: Connect, disconnect, timeout management
- **State Broadcasting**: Distribute changes to all connected clients
- **Persistence**: Coordinate with storage backends
- **Schema Management**: Handle schema migrations and compatibility

### Protocol system

#### WebSocket Protocol (`protocol.ts`)

Defines the communication protocol between client and server:

**Client → Server Messages:**

```typescript
type TLSocketClientSentEvent =
	| TLConnectRequest // Initial connection with schema
	| TLPushRequest // State changes to apply
	| TLPingRequest // Keepalive ping
```

**Server → Client Messages:**

```typescript
type TLSocketServerSentEvent =
	| ConnectEvent // Connection established with initial state
	| DataEvent // State updates to apply
	| IncompatibilityError // Schema/version mismatch
	| PongEvent // Ping response
```

#### Connection lifecycle

1. **Connect Request**: Client sends schema and initial state
2. **Hydration**: Server responds with full state snapshot
3. **Incremental Sync**: Bidirectional diff-based updates
4. **Presence Sync**: Real-time user cursor/selection state
5. **Graceful Disconnect**: Proper cleanup and persistence

### Diff system

#### `NetworkDiff` - efficient change representation

Compact, network-optimized change format:

```typescript
interface NetworkDiff<R extends UnknownRecord> {
	[recordId: string]: RecordOp<R>
}

type RecordOp<R> =
	| [RecordOpType.Put, R] // Add/replace record
	| [RecordOpType.Patch, ObjectDiff] // Partial update
	| [RecordOpType.Remove] // Delete record
```

#### Object diffing

Fine-grained property-level changes:

```typescript
interface ObjectDiff {
	[key: string]: ValueOp
}

type ValueOp =
	| [ValueOpType.Put, any] // Set property value
	| [ValueOpType.Patch, ObjectDiff] // Nested object update
	| [ValueOpType.Append, any] // Array append
	| [ValueOpType.Delete] // Remove property
```

### Session management

#### `RoomSession` - individual client sessions

Tracks state for each connected client:

```typescript
type RoomSession<R, Meta> = {
	state: RoomSessionState // Connection state
	sessionId: string // Unique session identifier
	presenceId: string | null // User presence identifier
	socket: TLRoomSocket<R> // WebSocket connection
	meta: Meta // Custom session metadata
	isReadonly: boolean // Permission level
	lastInteractionTime: number // For timeout detection
}

enum RoomSessionState {
	AwaitingConnectMessage, // Initial connection
	Connected, // Fully synchronized
	AwaitingRemoval, // Disconnection cleanup
}
```

Session lifecycle constants:

- `SESSION_START_WAIT_TIME`: 10 seconds for initial connection
- `SESSION_IDLE_TIMEOUT`: 20 seconds before idle detection
- `SESSION_REMOVAL_WAIT_TIME`: 5 seconds for cleanup delay

### Network adapters

#### `ClientWebSocketAdapter` - client connection management

Manages WebSocket connections with reliability features:

```typescript
class ClientWebSocketAdapter implements TLPersistentClientSocket<TLRecord> {
	// Connection state
	status: Atom<TLPersistentClientSocketStatus>

	// Reliability features
	restart(): void // Force reconnection
	sendMessage(msg: any): void // Send with queuing

	// Event handling
	onReceiveMessage: SubscribingFn<any>
	onStatusChange: SubscribingFn<TLPersistentClientSocketStatus>
}
```

#### `ReconnectManager` - connection reliability

Handles automatic reconnection with exponential backoff:

- **Progressive Delays**: Increasing delays between reconnection attempts
- **Max Retry Limits**: Prevents infinite reconnection loops
- **Connection Health**: Monitors connection quality
- **Graceful Degradation**: Handles various failure modes

### Data consistency

#### Conflict resolution strategy

**Server Authoritative Model:**

1. Client applies changes optimistically
2. Server validates and potentially modifies changes
3. Server broadcasts canonical version to all clients
4. Clients rollback and re-apply if conflicts detected

#### Change ordering

- **Causal Ordering**: Changes applied in dependency order
- **Vector Clocks**: Track causality across distributed clients
- **Tombstone Management**: Handle deletions in distributed system

#### Schema evolution

- **Version Compatibility**: Detect and handle schema mismatches
- **Migration Support**: Upgrade/downgrade data during sync
- **Graceful Degradation**: Handle unknown record types

### Performance optimizations

#### Batching and chunking

```typescript
// Message chunking for large updates
chunk<T>(items: T[], maxSize: number): T[][]

// Batch updates for efficiency
throttle(updateFn: () => void, delay: number)
```

#### Presence optimization

- **Throttled Updates**: Cursor movements throttled to reduce bandwidth
- **Selective Broadcasting**: Only send presence to relevant clients
- **Ephemeral State**: Presence doesn't persist to storage

### Error handling

#### `TLRemoteSyncError` - sync-Specific errors

Specialized error types for synchronization issues:

```typescript
class TLRemoteSyncError extends Error {
	code: TLSyncErrorCloseEventCode
	reason: TLSyncErrorCloseEventReason
}

// Error reasons include:
// - NOT_FOUND: Room doesn't exist
// - FORBIDDEN: Permission denied
// - CLIENT_TOO_OLD: Client needs upgrade
// - SERVER_TOO_OLD: Server needs upgrade
```

#### Connection recovery

- **Automatic Retry**: Exponential backoff for reconnection
- **State Reconciliation**: Re-sync state after reconnection
- **Partial Recovery**: Handle partial data loss gracefully

## Key design patterns

### Event-Driven architecture

- **nanoevents**: Lightweight event system for internal communication
- **Signal Integration**: Reactive updates using signals
- **WebSocket Events**: Standard WebSocket event handling

### Immutable state updates

- **Structural Sharing**: Minimize memory usage for state changes
- **Diff-Based Sync**: Only transmit actual changes
- **Rollback Support**: Maintain history for conflict resolution

### Async state management

- **Promise-Based APIs**: Async operations return promises
- **Effect Scheduling**: Coordinate updates with React lifecycle
- **Transaction Support**: Atomic multi-record updates

## Network protocol

### Message types

1. **Connect**: Establish session with schema validation
2. **Push**: Client sends local changes to server
3. **Data**: Server broadcasts changes to clients
4. **Ping/Pong**: Keepalive for connection health
5. **Error**: Communicate protocol violations

### Reliability features

- **Message Ordering**: Guaranteed order of operations
- **Duplicate Detection**: Prevent duplicate message processing
- **Timeout Handling**: Detect and recover from network issues
- **Graceful Shutdown**: Clean disconnection protocol

## Integration points

### With store package

- **Store Synchronization**: Bidirectional sync with local stores
- **Migration Coordination**: Handle schema changes during sync
- **Query Integration**: Sync affects query results

### With state package

- **Reactive Integration**: Changes trigger signal updates
- **Transaction Coordination**: Maintain consistency during sync
- **Effect Scheduling**: Coordinate with React updates

### With schema package

- **Schema Validation**: Ensure type safety across clients
- **Version Management**: Handle schema evolution
- **Record Validation**: Validate all synchronized records

## Use cases

### Real-Time collaboration

- **Multi-User Drawing**: Multiple users editing simultaneously
- **Live Cursors**: Real-time cursor and selection display
- **Conflict Resolution**: Handle simultaneous edits gracefully

### Offline/Online sync

- **Offline Editing**: Local changes queued for sync
- **Reconnection Sync**: State reconciliation after network recovery
- **Partial Sync**: Handle incomplete synchronization

### Scalable architecture

- **Room-Based Isolation**: Separate sync contexts per document
- **Horizontal Scaling**: Support multiple server instances
- **Load Management**: Handle varying client loads efficiently

## Security considerations

### Access control

- **Read-Only Mode**: Restrict editing permissions per session
- **Session Validation**: Verify client identity and permissions
- **Schema Enforcement**: Prevent malicious schema changes

### Data integrity

- **Change Validation**: Server validates all client changes
- **Type Safety**: Schema ensures data structure integrity
- **Audit Trail**: Maintain change history for debugging


# ==================
# FILE: packages/sync/CONTEXT.md
# ==================

# Sync Package Context

## Overview

The `@tldraw/sync` package provides React hooks and high-level utilities for integrating tldraw's real-time collaboration features into React applications. It builds on `@tldraw/sync-core` to offer a developer-friendly API for multiplayer functionality with minimal configuration.

## Architecture

### Primary hooks

#### `useSync` - production multiplayer hook

The main hook for production multiplayer integration:

```typescript
function useSync(options: UseSyncOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncOptions {
	uri: string | (() => string | Promise<string>) // WebSocket server URI
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo> // User identity
	assets: TLAssetStore // Blob storage implementation
	roomId?: string // Room identifier for analytics
	trackAnalyticsEvent?: (name: string, data: any) => void // Analytics callback
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

#### `useSyncDemo` - demo server integration

Simplified hook for quick prototyping with tldraw's demo server:

```typescript
function useSyncDemo(options: UseSyncDemoOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncDemoOptions {
	roomId: string // Unique room identifier
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo>
	host?: string // Demo server URL override
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

### Store integration

#### `RemoteTLStoreWithStatus` - multiplayer store state

Enhanced store wrapper with connection status:

```typescript
type RemoteTLStoreWithStatus =
	| { status: 'loading' } // Initial connection
	| { status: 'error'; error: Error } // Connection/sync errors
	| {
			status: 'synced-remote' // Connected and syncing
			connectionStatus: 'online' | 'offline' // Network state
			store: TLStore // Synchronized store
	  }
```

Status progression:

1. **loading**: Establishing connection, performing initial sync
2. **synced-remote**: Successfully connected and synchronized
3. **error**: Connection failed or sync error occurred

### Connection management

#### WebSocket connection lifecycle

Comprehensive connection state management:

**Connection Establishment:**

```typescript
// 1. Create WebSocket adapter
const socket = new ClientWebSocketAdapter(async () => {
	const uriString = typeof uri === 'string' ? uri : await uri()
	const url = new URL(uriString)
	url.searchParams.set('sessionId', TAB_ID) // Browser tab identification
	url.searchParams.set('storeId', storeId) // Store instance identification
	return url.toString()
})

// 2. Initialize TLSyncClient with reactive integration
const client = new TLSyncClient({
	store,
	socket,
	didCancel: () => cancelled, // Cleanup detection
	onLoad: (client) => setState({ readyClient: client }),
	onSyncError: (reason) => handleSyncError(reason),
	onAfterConnect: (_, { isReadonly }) => updatePermissions(isReadonly),
	presence,
	presenceMode,
})
```

#### Error handling and recovery

Comprehensive error handling with user feedback:

```typescript
// Sync error categorization and analytics
onSyncError(reason) {
  switch (reason) {
    case TLSyncErrorCloseEventReason.NOT_FOUND:
      track('room-not-found')
      break
    case TLSyncErrorCloseEventReason.FORBIDDEN:
      track('forbidden')
      break
    case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
      track('not-authenticated')
      break
    case TLSyncErrorCloseEventReason.RATE_LIMITED:
      track('rate-limited')
      break
  }
  setState({ error: new TLRemoteSyncError(reason) })
}
```

### Presence system

#### User presence management

Real-time user cursor and selection synchronization:

```typescript
// User information computation
const userPreferences = computed('userPreferences', () => {
	const user = getUserInfo() ?? getUserPreferences()
	return {
		id: user.id,
		color: user.color ?? defaultUserPreferences.color,
		name: user.name ?? defaultUserPreferences.name,
	}
})

// Presence state generation
const presence = computed('instancePresence', () => {
	const presenceState = getUserPresence(store, userPreferences.get())
	if (!presenceState) return null

	return InstancePresenceRecordType.create({
		...presenceState,
		id: InstancePresenceRecordType.createId(store.id),
	})
})
```

#### Presence modes

Dynamic presence behavior based on room occupancy:

```typescript
const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
	if (otherUserPresences.get().size === 0) return 'solo'
	return 'full'
})

// Affects:
// - Cursor visibility
// - Selection indicators
// - Performance optimizations
```

### Asset management

#### Demo asset store

Integrated blob storage for demo environments:

```typescript
function createDemoAssetStore(host: string): TLAssetStore {
	return {
		// Upload to demo server
		upload: async (asset, file) => {
			const objectName = `${uniqueId()}-${file.name}`.replace(/\W/g, '-')
			const url = `${host}/uploads/${objectName}`
			await fetch(url, { method: 'POST', body: file })
			return { src: url }
		},

		// Intelligent image optimization
		resolve: (asset, context) => {
			// Automatic image resizing based on:
			// - Screen DPI and scale
			// - Network connection quality
			// - Image size thresholds
			// - Animation/vector type detection
		},
	}
}
```

#### Asset resolution strategy

Smart image optimization for performance:

- **Network-Aware**: Adjusts quality based on connection speed
- **Scale-Aware**: Resizes based on actual display size
- **Type-Aware**: Handles animated/vector images appropriately
- **Size-Threshold**: Only optimizes images above 1.5MB

### Connection reliability

#### Automatic reconnection

Built-in reconnection management:

```typescript
// Connection status tracking
const collaborationStatusSignal = computed('collaboration status', () =>
	socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
)

// Graceful degradation
store = createTLStore({
	collaboration: {
		status: collaborationStatusSignal,
		mode: syncMode, // readonly/readwrite based on server state
	},
})
```

#### State recovery

Robust recovery from connection issues:

- **Optimistic Updates**: Local changes applied immediately
- **Server Reconciliation**: Re-sync with server state on reconnect
- **Conflict Resolution**: Handle overlapping changes gracefully
- **Store Validation**: Ensure store remains usable after reconnection

## Demo server integration

### Hosted demo environment

Pre-configured integration with tldraw's demo infrastructure:

- **Demo Server**: `https://demo.tldraw.xyz` for WebSocket connections
- **Image Worker**: `https://images.tldraw.xyz` for image optimization
- **Bookmark Unfurling**: `${host}/bookmarks/unfurl` for URL metadata

### Asset processing pipeline

Integrated asset handling for demo environments:

```typescript
// Automatic bookmark creation from URLs
editor.registerExternalAssetHandler('url', async ({ url }) => {
	return await createAssetFromUrlUsingDemoServer(host, url)
})

// Generates bookmark assets with:
// - Title, description, favicon from meta tags
// - Image preview from og:image
// - Fallback to basic bookmark on errors
```

### Security and limitations

Demo server considerations:

- **Data Retention**: Demo data deleted after ~24 hours
- **Public Access**: Anyone with room ID can access content
- **Upload Restrictions**: File uploads disabled on production demo domains
- **Rate Limiting**: Built-in protection against abuse

## Integration patterns

### Basic multiplayer setup

```typescript
function MultiplayerApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssetStore,
    userInfo: { id: 'user-1', name: 'Alice', color: '#ff0000' }
  })

  if (store.status === 'loading') return <Loading />
  if (store.status === 'error') return <Error error={store.error} />

  return <Tldraw store={store.store} />
}
```

### Demo/Prototype setup

```typescript
function DemoApp() {
  const store = useSyncDemo({
    roomId: 'my-company-test-room-123',
    userInfo: myUserSignal
  })

  return <Tldraw store={store} />
}
```

### Custom presence implementation

```typescript
const store = useSync({
	uri: wsUri,
	assets: myAssets,
	getUserPresence: (store, user) => ({
		userId: user.id,
		userName: user.name,
		cursor: { x: mouseX, y: mouseY },
		selectedShapeIds: store.selectedShapeIds,
		brush: store.brush,
		// Custom presence data
		currentTool: store.currentTool,
		isTyping: store.isInEditingMode,
	}),
})
```

### Authentication integration

```typescript
const store = useSync({
	uri: async () => {
		const token = await getAuthToken()
		return `wss://myserver.com/sync/room-123?token=${token}`
	},
	assets: authenticatedAssetStore,
	onMount: (editor) => {
		// Setup authenticated external content handlers
		setupAuthenticatedHandlers(editor)
	},
})
```

## Performance considerations

### Connection optimization

- **Batched Updates**: Multiple changes sent together
- **Diff Compression**: Only send actual changes, not full state
- **Presence Throttling**: Limit cursor update frequency
- **Selective Sync**: Only sync relevant data

### Memory management

- **Automatic Cleanup**: Proper disposal of connections and resources
- **Weak References**: Prevent memory leaks in long-running sessions
- **State Pruning**: Remove unnecessary historical data

### Network efficiency

- **Binary Protocol**: Efficient message encoding
- **Compression**: Optional compression for large updates
- **Connection Pooling**: Reuse connections where possible

## Error recovery

### Network issues

- **Offline Detection**: Graceful handling of network loss
- **Automatic Retry**: Progressive backoff for reconnection
- **State Buffering**: Queue changes during disconnection
- **Conflict Resolution**: Handle changes made while offline

### Server issues

- **Server Errors**: Proper handling of server-side failures
- **Schema Mismatches**: Handle version incompatibilities
- **Rate Limiting**: Respect server-imposed limits
- **Graceful Degradation**: Fall back to local-only mode when needed

## Dependencies

### Core dependencies

- **@tldraw/sync-core**: Core synchronization infrastructure
- **@tldraw/state-react**: React integration for reactive state
- **tldraw**: Main tldraw package for store and editor integration

### Peer dependencies

- **React**: React hooks and lifecycle integration
- **WebSocket**: Browser or Node.js WebSocket implementation

## Key benefits

### Developer experience

- **Simple API**: Single hook for full multiplayer functionality
- **Flexible Configuration**: Support for custom servers and asset stores
- **Great Defaults**: Demo server for instant prototyping
- **TypeScript Support**: Full type safety throughout

### Real-Time features

- **Live Collaboration**: Multiple users editing simultaneously
- **Presence Indicators**: See other users' cursors and selections
- **Instant Updates**: Changes appear immediately across all clients
- **Conflict Resolution**: Intelligent handling of simultaneous edits

### Production ready

- **Reliability**: Robust error handling and recovery
- **Scalability**: Efficient protocols for large rooms
- **Security**: Authentication and authorization support
- **Observability**: Analytics and monitoring integration


# ==================
# FILE: packages/tldraw/CONTEXT.md
# ==================

# Tldraw Package Context

## Overview

The `@tldraw/tldraw` package is the main "batteries included" SDK that provides a complete drawing application with UI, tools, shapes, and all functionality. It builds on top of the editor package to provide a fully-featured drawing experience out of the box.

## Architecture

### Core components

#### `Tldraw.tsx` - Main component

The primary component that combines the editor with the complete UI system:

```typescript
export function Tldraw(props: TldrawProps) {
	// Merges default and custom:
	// - Shape utilities (defaultShapeUtils + custom)
	// - Tools (defaultTools + custom)
	// - Bindings (defaultBindingUtils + custom)
	// - Side effects and external content handlers
	// Returns <TldrawEditor> wrapped with <TldrawUi>
}
```

#### `TldrawUi.tsx` - UI System

Comprehensive UI system with responsive layout:

- Provider hierarchy for context, theming, translations, events
- Responsive breakpoint system (mobile, tablet, desktop)
- Layout zones: top (menu, helper buttons, top panel, share/style panels), bottom (navigation, toolbar, help)
- Conditional rendering based on focus mode, readonly state, debug mode
- Mobile-specific behavior (toolbar hiding during editing)

### Shape system

#### Default shape utilities (`defaultShapeUtils.ts`)

Complete set of shape implementations:

- **Text**: Text editing with rich text support
- **Draw**: Freehand drawing with stroke optimization
- **Geo**: Geometric shapes (rectangle, ellipse, triangle, etc.)
- **Note**: Sticky note shapes
- **Line**: Straight lines with various styles
- **Frame**: Container frames for grouping
- **Arrow**: Smart arrows with binding capabilities
- **Highlight**: Highlighter tool for annotations
- **Bookmark**: URL bookmark cards with metadata
- **Embed**: Embedded content (YouTube, Figma, etc.)
- **Image**: Image shapes with cropping support
- **Video**: Video playback shapes

Each shape has its own directory with:

- `ShapeUtil.tsx`: Rendering, hit testing, bounds calculation
- `ShapeTool.ts`: Creation tool with state machine
- Tool states (Idle, Pointing, etc.)
- Helper functions and components

### Tools system

#### Default tools (`defaultTools.ts`)

Complete toolset:

- **SelectTool**: Complex selection with multiple interaction modes
- **Shape Tools**: One for each creatable shape type
- **HandTool**: Pan/move canvas
- **EraserTool**: Delete shapes by brushing
- **LaserTool**: Temporary pointer for presentations
- **ZoomTool**: Zoom to specific areas

#### SelectTool - Primary interaction tool

Sophisticated state machine with child states:

- **Idle**: Default state, handles shape selection
- **Brushing**: Drag selection of multiple shapes
- **Translating**: Moving selected shapes
- **Resizing**: Resize handles interaction
- **Rotating**: Rotation handle interaction
- **Crop**: Image cropping functionality
- **EditingShape**: Text editing mode
- **Pointing** states: Various pointer interaction states

### UI component system

#### Component architecture

Hierarchical component system with context providers:

- **TldrawUiContextProvider**: Master provider with asset URLs, overrides, components
- **Specialized Providers**: Tooltips, translations, events, dialogs, toasts, breakpoints
- **Component Override System**: Every UI component can be replaced/customized

#### Key UI components

- **Toolbar**: Main tool selection with overflow handling
- **StylePanel**: Shape style controls (color, size, opacity, etc.)
- **MenuPanel**: Application menu with actions
- **SharePanel**: Collaboration and sharing features
- **NavigationPanel**: Page navigation and zoom controls
- **Minimap**: Canvas overview with WebGL rendering
- **Dialogs**: Modal dialogs for embeds, links, keyboard shortcuts
- **Toasts**: User notifications system

### External content system

#### Content handlers (`defaultExternalContentHandlers.ts`)

Comprehensive external content processing:

- **Files**: Drag/drop and paste of images/videos with validation
- **URLs**: Automatic bookmark creation with metadata extraction
- **Text**: Smart text pasting with rich text support
- **SVG**: Vector graphics import with size calculation
- **Embeds**: Integration with external services (YouTube, Figma, etc.)
- **Tldraw Content**: Copy/paste between tldraw instances
- **Excalidraw**: Import from Excalidraw format

#### Asset management

- Size and type validation
- Automatic image resizing and optimization
- Hash-based deduplication
- Temporary preview creation
- Background upload processing

### Bindings system

#### Arrow bindings (`ArrowBindingUtil`)

Smart arrow connections:

- Automatic binding to shape edges
- Dynamic arrow routing around obstacles
- Binding preservation during shape updates
- Visual feedback for binding states

### State management & side effects

#### Default side effects (`defaultSideEffects.ts`)

Reactive state management for UI behavior:

- **Cropping Mode**: Auto-enter/exit crop mode based on state
- **Text Editing**: Tool switching for text creation/editing
- **Tool Locking**: Persistent tool state for rapid creation

### Utilities

#### Export system (`utils/export/`)

Multi-format export capabilities:

- **Image Export**: PNG, JPG, SVG with various options
- **Data Export**: JSON format for content preservation
- **Print Support**: Optimized printing layouts
- **Copy/Paste**: Clipboard integration

#### Text processing (`utils/text/`)

Advanced text handling:

- **Rich Text**: HTML to tldraw rich text conversion
- **Text Direction**: RTL language detection and support
- **Text Measurement**: Accurate text sizing for layout

#### Asset processing (`utils/assets/`)

Asset optimization and management:

- **Image Processing**: Resizing, format conversion
- **Font Preloading**: Ensure consistent text rendering
- **Size Constraints**: Automatic asset size management

### Canvas overlays

#### Visual feedback components (`canvas/`)

Canvas-level visual elements:

- **TldrawHandles**: Resize and rotate handles
- **TldrawCropHandles**: Image cropping interface
- **TldrawScribble**: Live drawing feedback
- **TldrawSelectionForeground**: Selection outline and controls
- **TldrawShapeIndicators**: Hover and focus indicators

## Key patterns

### Component composition

- Every UI component can be overridden via the components prop
- Providers use context for dependency injection
- Responsive design with breakpoint-based rendering

### State machine architecture

- Tools implemented as hierarchical state machines
- Clear separation between tool logic and rendering
- Reactive state updates trigger automatic UI changes

### Asset pipeline

- Async asset processing with progress feedback
- Automatic optimization and validation
- Hash-based caching and deduplication

### Extension points

- Custom shapes via ShapeUtil classes
- Custom tools via StateNode extensions
- Custom UI via component overrides
- Custom external content handlers

## Integration

### With editor package

- Wraps `@tldraw/editor` with complete UI
- Extends editor with additional functionality
- Provides default implementations for all extension points

### With external systems

- Clipboard integration for copy/paste
- File system integration for drag/drop
- URL handling for bookmarks and embeds
- External service integration (YouTube, Figma, etc.)

### Responsive design

- Mobile-first breakpoint system
- Touch-optimized interactions
- Adaptive UI based on screen size
- Virtual keyboard handling on mobile

## Performance considerations

### Canvas rendering

- WebGL-accelerated minimap
- Optimized shape rendering with culling
- Efficient hit testing and bounds calculation

### Asset handling

- Lazy loading of external content
- Background processing of large files
- Temporary previews during upload
- Automatic cleanup of unused assets

### Memory management

- Proper cleanup of event listeners and reactors
- Efficient state updates with batching
- Asset deduplication to reduce memory usage

## Development patterns

### Testing

- Comprehensive test coverage for tools and shapes
- Snapshot testing for complex rendering
- Mock implementations for external dependencies

### TypeScript Integration

- Full type safety for all APIs
- Generic type parameters for extensibility
- Proper inference for shape and tool types

### Error handling

- Graceful degradation for failed external content
- User-friendly error messages via toast system
- Comprehensive validation for all inputs


# ==================
# FILE: packages/tlschema/CONTEXT.md
# ==================

# CONTEXT.md - @tldraw/tlschema Package

This file provides comprehensive context for understanding the `@tldraw/tlschema` package, which defines the type system, data schemas, and migrations for tldraw's persisted data.

## Package overview

`@tldraw/tlschema` is the central type definition and schema management package for tldraw. It defines all record types (shapes, assets, pages, etc.), their validation schemas, migration sequences, and the overall data model that powers the tldraw editor.

**Core purpose:** Provide a complete, type-safe, and version-aware data model for tldraw that can evolve over time while maintaining backward compatibility.

## Architecture overview

### Record system hierarchy

**TLRecord union (`src/records/TLRecord.ts`):**

```typescript
type TLRecord =
	| TLAsset // Images, videos, bookmarks
	| TLBinding // Connections between shapes (arrows)
	| TLCamera // Viewport state per page
	| TLDocument // Root document metadata
	| TLInstance // User instance state
	| TLInstancePageState // Per-page user state
	| TLPage // Document pages
	| TLShape // All shape types
	| TLInstancePresence // Real-time presence
	| TLPointer // Mouse/touch state
```

### Store system foundation

**TLStore (`src/TLStore.ts`):**

- Type alias for `Store<TLRecord, TLStoreProps>`
- `TLStoreProps` includes asset store integration and editor mounting
- `createIntegrityChecker()` ensures store consistency (pages, cameras, states)
- Error redaction for sensitive data (asset URLs)

**TLSchema Creation (`src/createTLSchema.ts`):**

- `createTLSchema()` factory for building schemas with custom shapes/bindings
- `defaultShapeSchemas` - All built-in shape configurations
- `defaultBindingSchemas` - Built-in binding configurations
- Automatic migration sequence coordination

### Shape system architecture

**Base shape structure (`src/shapes/TLBaseShape.ts`):**

```typescript
interface TLBaseShape<Type extends string, Props extends object> {
	id: TLShapeId
	type: Type
	x: number
	y: number
	rotation: number
	index: IndexKey // Fractional index for ordering
	parentId: TLParentId // Page or parent shape
	isLocked: boolean
	opacity: TLOpacityType
	props: Props // Shape-specific properties
	meta: JsonObject // User-defined metadata
}
```

**Shape Types (`src/shapes/`):**

- **Basic Shapes:** Geo (rectangles, circles, etc.), Text, Note, Frame, Group
- **Drawing Shapes:** Draw (freehand), Line (multi-point), Highlight
- **Media Shapes:** Image, Video, Bookmark, Embed
- **Complex Shapes:** Arrow (with bindings)

**Shape Props Pattern:**
Each shape defines:

- Props interface with styled and regular properties
- Props validation object using `@tldraw/validate`
- Migration sequence for schema evolution
- Style property integration

### Style system

**StyleProp Architecture (`src/styles/StyleProp.ts`):**

- Base class for properties that can be applied across multiple shapes
- Last-used value persistence for consistent styling
- Enum-based and free-form style properties
- Automatic validation and type safety

**Default Style Properties:**

- `DefaultColorStyle` - Shape and text colors with theme support
- `DefaultDashStyle` - Stroke patterns (solid, dashed, dotted)
- `DefaultFillStyle` - Fill patterns (none, solid, semi, pattern)
- `DefaultSizeStyle` - Size variants (s, m, l, xl)
- `DefaultFontStyle` - Typography (draw, sans, serif, mono)
- Alignment styles (horizontal, vertical, text)

**Theme System:**

- `TLDefaultColorTheme` with light/dark variants
- Color palette with semantic naming
- CSS custom properties integration
- Frame and note-specific color variants

### Asset system

**Asset types (`src/assets/`):**

- **TLImageAsset** - Raster images with metadata (size, MIME type, etc.)
- **TLVideoAsset** - Video files with duration and thumbnail info
- **TLBookmarkAsset** - Web page previews with title, description, favicon

**Asset Management:**

- `TLAssetStore` interface for storage abstraction
- Upload/resolve/remove lifecycle management
- `TLAssetContext` for resolution optimization
- Support for data URLs, IndexedDB, and remote storage

### Binding system

**Binding architecture (`src/bindings/`):**

- `TLBaseBinding` - Base interface for shape connections
- `TLArrowBinding` - Connects arrows to shapes with precise positioning
- Binding creation, validation, and lifecycle management
- Integration with shape deletion and updates

### Validation system

**Validation infrastructure:**

- Built on `@tldraw/validate` for runtime type checking
- Cascading validation from store → record → props
- Custom validators for complex types (rich text, geometry, etc.)
- Development vs production validation modes

**Validation Patterns:**

- `idValidator<T>()` - Type-safe ID validation
- `createShapeValidator()` - Generic shape validation factory
- Custom prop validators for each shape type
- Meta property validation (user-defined data)

### Migration system

**Migration architecture:**

- **Store-level migrations** (`src/store-migrations.ts`) - Structural changes
- **Record-level migrations** - Individual record type evolution
- **Props migrations** (`src/recordsWithProps.ts`) - Shape/binding property changes
- **Asset migrations** - Asset schema evolution

**Migration Patterns:**

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.geo',
	sequence: [
		{
			id: 'com.tldraw.shape.geo/1',
			up: (props) => ({ ...props, newProperty: defaultValue }),
			down: ({ newProperty, ...props }) => props,
		},
	],
})
```

**Migration Coordination:**

- Version-based migration IDs
- Dependency tracking between migrations
- Forward and backward migration support
- Retroactive vs non-retroactive migrations

## Key data structures

### Shape property system

**Properties with styles:**

```typescript
interface TLGeoShapeProps {
	geo: TLGeoShapeGeoStyle // Style property (shared)
	color: TLDefaultColorStyle // Style property (shared)
	w: number // Regular property (shape-specific)
	h: number // Regular property (shape-specific)
	richText: TLRichText // Complex validated property
}
```

**Style Property Definition:**

```typescript
const GeoShapeGeoStyle = StyleProp.defineEnum('tldraw:geo', {
	defaultValue: 'rectangle',
	values: ['rectangle', 'ellipse', 'triangle' /* ... */],
})
```

### Record type creation

**Shape record creation:**

```typescript
const GeoShapeRecordType = createRecordType<TLGeoShape>('shape', {
	validator: createShapeValidator('geo', geoShapeProps),
	scope: 'document',
})
```

**Asset Record Creation:**

```typescript
const AssetRecordType = createRecordType<TLAsset>('asset', {
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ meta: {} }))
```

### Complex type patterns

**Rich Text (`src/misc/TLRichText.ts`):**

- Structured text with formatting
- JSON-based representation
- Validation and conversion utilities
- Integration with text shapes

**Geometry Types (`src/misc/geometry-types.ts`):**

- `VecModel` - 2D points with validation
- `BoxModel` - Axis-aligned rectangles
- Integration with editor geometry system

## Development patterns

### Adding new shape types

1. **Define shape interface:**

```typescript
interface TLCustomShape extends TLBaseShape<'custom', TLCustomShapeProps> {}

interface TLCustomShapeProps {
	color: TLDefaultColorStyle // Use existing styles
	customProp: string // Shape-specific properties
}
```

2. **Create Props Validation:**

```typescript
const customShapeProps: RecordProps<TLCustomShape> = {
	color: DefaultColorStyle,
	customProp: T.string,
}
```

3. **Define Migrations:**

```typescript
const customShapeMigrations = createShapePropsMigrationSequence({
	sequenceId: 'com.yourapp.shape.custom',
	sequence: [
		/* migration objects */
	],
})
```

4. **Register in Schema:**

```typescript
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		custom: {
			migrations: customShapeMigrations,
			props: customShapeProps,
		},
	},
})
```

### Adding style properties

```typescript
const MyStyleProp = StyleProp.define('myapp:style', {
	defaultValue: 'default',
	type: T.unionWithValidator(['option1', 'option2'], T.string),
})

// Use in shape props
interface MyShapeProps {
	myStyle: T.TypeOf<typeof MyStyleProp>
	// other props...
}

const myShapeProps: RecordProps<MyShape> = {
	myStyle: MyStyleProp,
	// other validators...
}
```

### Migration best practices

**Record-level migration:**

```typescript
const recordMigrations = createRecordMigrationSequence({
	sequenceId: 'com.myapp.myrecord',
	recordType: 'myrecord',
	sequence: [
		{
			id: 'com.myapp.myrecord/1',
			up: (record) => {
				record.newField = computeDefault(record)
				return record
			},
			down: ({ newField, ...record }) => record,
		},
	],
})
```

**Props Migration:**

```typescript
const propsMigrations: TLPropsMigrations = {
	sequence: [
		{
			id: 'com.myapp.shape.custom/1',
			up: (props) => ({ ...props, newProp: 'default' }),
			down: ({ newProp, ...props }) => props,
		},
	],
}
```

## File organization and structure

### Core records (`src/records/`)

- **TLShape.ts** - Base shape system and root migrations (~300 lines)
- **TLAsset.ts** - Asset management and validation (~100 lines)
- **TLBinding.ts** - Shape connection system (~150 lines)
- **TLPage.ts** - Document page structure (~50 lines)
- **TLDocument.ts** - Root document record (~50 lines)
- **TLInstance.ts** - User instance state (~200 lines)
- **TLPageState.ts** - Per-page user state (~150 lines)
- **TLCamera.ts** - Viewport state (~50 lines)
- **TLPresence.ts** - Real-time user presence (~100 lines)
- **TLPointer.ts** - Input device state (~50 lines)

### Shape implementations (`src/shapes/`)

Each shape file (~100-200 lines) includes:

- TypeScript interface definition
- Props validation object
- Migration sequence
- Type exports and utilities

### Style definitions (`src/styles/`)

- **StyleProp.ts** - Base style property system (~150 lines)
- Individual style implementations (~50-100 lines each)
- Theme definitions and color palettes
- Validation and type utilities

### Asset definitions (`src/assets/`)

- Base asset system and individual asset types (~50-100 lines each)
- Upload/resolution interfaces
- Asset-specific validation and metadata

### Support systems

- **`src/misc/`** - Utility types, validators, and helper functions
- **`src/translations/`** - Internationalization support
- **`src/createPresenceStateDerivation.ts`** - Real-time presence logic
- **`src/store-migrations.ts`** - Historical store structure changes

## Type system patterns

### ID system

- Strongly typed IDs using branded types
- `RecordId<T>` prevents ID confusion between record types
- Custom ID creation for predictable IDs
- Random ID generation for new records

### Props with styles

```typescript
// Shapes use a mix of style props and regular props
interface ShapeProps {
	// Style props (shared across shapes, persisted globally)
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle

	// Regular props (shape-specific)
	width: number
	height: number
	text: string
}
```

### Validation integration

- All properties validated at runtime
- Custom validation for complex types
- Graceful degradation for unknown properties
- Development vs production validation levels

## Store integration points

### Schema configuration

```typescript
const schema = createTLSchema({
	shapes: customShapeSchemas,
	bindings: customBindingSchemas,
	migrations: additionalMigrations,
})

const store = new Store({
	schema,
	props: {
		defaultName: 'Untitled',
		assets: assetStore,
		onMount: (editor) => {
			/* setup */
		},
	},
})
```

### Asset store integration

```typescript
interface TLAssetStore {
	upload(asset: TLAsset, file: File): Promise<{ src: string }>
	resolve?(asset: TLAsset, ctx: TLAssetContext): Promise<string | null>
	remove?(assetIds: TLAssetId[]): Promise<void>
}
```

## Development guidelines

### Schema evolution

1. **Always add migrations** when changing persisted data structures
2. **Version changes incrementally** with descriptive names
3. **Test migrations thoroughly** with real-world data
4. **Document breaking changes** and migration requirements
5. **Handle migration failures gracefully** with validation fallbacks

### Shape development

1. **Follow existing patterns** for props structure and validation
2. **Use style properties** for attributes that should be shared across shapes
3. **Implement proper validation** for all properties including edge cases
4. **Consider performance implications** of complex property validation
5. **Design for extensibility** while maintaining type safety

### Validation strategy

1. **Use appropriate validators** from `@tldraw/validate`
2. **Implement custom validators** for domain-specific types
3. **Handle validation errors gracefully** in production
4. **Test validation edge cases** thoroughly
5. **Consider validation performance** for large datasets

### Migration strategy

1. **Plan migration paths** before making schema changes
2. **Group related changes** into single migration steps
3. **Test both up and down migrations** for correctness
4. **Consider migration dependencies** across packages
5. **Provide clear migration documentation** for major changes

## Performance considerations

### Memory optimization

- Immutable record structures prevent accidental mutations
- `devFreeze()` in development prevents mutation bugs
- Efficient ID generation with minimal allocations
- Style property sharing reduces memory overhead

### Validation performance

- Lazy validation where possible
- `validateUsingKnownGoodVersion()` optimizations
- Minimal validation in hot paths
- Development vs production validation levels

### Schema efficiency

- Fractional indexing for efficient reordering
- Minimal required properties to reduce validation overhead
- Efficient diff computation for large record sets
- Optimized serialization/deserialization

## Key components deep dive

### Style property system

**Style Property Lifecycle:**

1. Definition with unique ID and default value
2. Registration in shape props validation
3. Style tracking in editor state
4. Application to selected shapes
5. Persistence for next shape creation

**Style Property Types:**

- **Free-form:** `StyleProp.define()` with custom validation
- **Enum-based:** `StyleProp.defineEnum()` with predefined values
- **Theme integration:** Colors that adapt to light/dark themes

### Shape property patterns

**Geometric properties:**

- Position: `x`, `y`, `rotation` (inherited from base)
- Size: `w`, `h` or shape-specific dimensions
- Transform: Handled by editor transformation system

**Visual Properties:**

- Color, dash, fill, size (style properties)
- Opacity (inherited from base)
- Shape-specific visual properties (e.g., `geo` for geometric shapes)

**Content Properties:**

- Text content (`richText` for formatted text)
- Asset references (`assetId` for media shapes)
- URLs and metadata for external content

### Record scope system

**Scope Types:**

- **`document`** - Synced and persisted (shapes, assets, pages)
- **`session`** - Per-instance, may be persisted (user preferences)
- **`presence`** - Real-time only, not persisted (cursors, selections)

**Scope Implications:**

- Different sync and persistence behavior
- Scoped listeners for targeted reactivity
- Security and privacy considerations
- Performance optimization opportunities

## Integration points

### Dependencies

- **`@tldraw/store`** - Record storage and reactivity
- **`@tldraw/validate`** - Runtime validation system
- **`@tldraw/utils`** - Utility functions and type helpers

### Extension points

- **Custom shapes** via schema configuration
- **Custom bindings** for shape connections
- **Custom assets** for media handling
- **Custom migrations** for schema evolution
- **Custom style properties** for shared styling

### Framework integration

- Framework-agnostic type definitions
- React integration via editor package
- Server-side rendering support
- Validation works in any JavaScript environment

## Common development scenarios

### Adding a new shape

1. Define shape interface extending `TLBaseShape`
2. Create props validation object
3. Implement migration sequence
4. Add to default shape schemas
5. Test validation and migrations

### Modifying existing shape

1. Update shape interface
2. Add migration for property changes
3. Update validation schema
4. Test backward compatibility
5. Update shape util implementation

### Adding style property

1. Define style property with unique ID
2. Add to relevant shape props
3. Update shape validation
4. Consider theme integration
5. Test style persistence

### Schema evolution

1. Identify breaking changes
2. Plan migration strategy
3. Implement migrations with tests
4. Update documentation
5. Coordinate with related packages

## Testing patterns

### Migration testing (`src/__tests__/`)

- Round-trip migration testing (up then down)
- Migration performance testing
- Edge case handling
- Data corruption prevention

### Validation testing

- Valid and invalid input testing
- Type coercion behavior
- Performance under load
- Error message quality

### Integration testing

- Store integration with real data
- Cross-package compatibility
- Asset handling workflows
- Real-time sync scenarios

## Common pitfalls

1. **Migration inconsistencies:** Mismatched up/down migrations causing data loss
2. **Validation performance:** Over-complex validators in hot paths
3. **Style Property Conflicts:** Multiple properties with same ID
4. **ID Type Confusion:** Using wrong ID types for references
5. **Schema Breaking Changes:** Changes without proper migrations
6. **Asset reference issues:** Orphaned asset references after deletion
7. **Scope misuse:** Wrong record scope affecting sync/persistence behavior

## Package dependencies and integration

**Internal dependencies:**

- Builds on `@tldraw/store` for record management
- Uses `@tldraw/validate` for all validation
- Requires `@tldraw/utils` for utilities

**Consumer Packages:**

- `@tldraw/editor` uses schema for editor configuration
- `@tldraw/tldraw` provides default schemas
- Custom implementations extend base schemas

**External Integration:**

- Asset stores implement `TLAssetStore` interface
- Sync engines use record diffs and migrations
- Persistence layers handle schema versioning


# ==================
# FILE: packages/utils/CONTEXT.md
# ==================

````markdown
# Utils Package Context

## Overview

The `@tldraw/utils` package provides foundational utility functions used throughout the tldraw codebase. It contains pure, reusable helper functions for common programming tasks including array manipulation, object operations, control flow, media processing, and performance optimization.

## Package structure & exports

The utils package uses a barrel export pattern through `index.ts`, exposing all utilities as named exports:

```typescript
// Main entry point exports
export * from './lib/array'
export * from './lib/object'
export * from './lib/control'
export * from './lib/reordering'
export * from './lib/media/media'
export * from './lib/ExecutionQueue'
export * from './lib/perf'
export * from './lib/PerformanceTracker'
export * from './lib/hash'
export * from './lib/cache'
export * from './lib/storage'
export * from './lib/file'
export * from './lib/value'
export * from './lib/network'
export * from './lib/error'
// ... and more

// Import examples:
import { dedupe, rotateArray, partition } from '@tldraw/utils'
import { ExecutionQueue, PerformanceTracker } from '@tldraw/utils'
import { Result, assert, exhaustiveSwitchError } from '@tldraw/utils'
```
````

## Architecture

### Core categories

#### Array utilities (`array.ts`)

Type-safe array manipulation functions with complete TypeScript signatures:

```typescript
// Array transformation and analysis
rotateArray<T>(arr: T[], offset: number): T[]
dedupe<T>(input: T[], equals?: (a: any, b: any) => boolean): T[]
partition<T>(arr: readonly T[], predicate: (item: T, index: number) => boolean): [T[], T[]]

// Array search and comparison
minBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
maxBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined
areArraysShallowEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean

// Advanced merging with override support
mergeArraysAndReplaceDefaults<Key extends string | number | symbol, T extends Record<Key, unknown>>(
  key: Key,
  custom: T[],
  defaults: T[]
): T[]
```

#### Object utilities (`object.ts`)

Type-preserving object operations with complete signatures:

```typescript
// Type-safe object key/value extraction
objectMapKeys<Key extends string | number | symbol>(object: {readonly [K in Key]: unknown}): Array<Key>
objectMapValues<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<Value>
objectMapEntries<Key extends string | number | symbol, Value>(object: {readonly [K in Key]: Value}): Array<[Key, Value]>

// Object transformation and filtering with full type preservation
filterEntries<Key extends string | number | symbol, Value>(
  object: {readonly [K in Key]: Value},
  predicate: (key: Key, value: Value) => boolean
): {[K in Key]: Value}

mapObjectMapValues<Key extends string | number | symbol, ValueBefore, ValueAfter>(
  object: {readonly [K in Key]: ValueBefore},
  mapper: (key: Key, value: ValueBefore) => ValueAfter
): {readonly [K in Key]: ValueAfter}

areObjectsShallowEqual<T extends Record<string | number | symbol, unknown>>(obj1: T, obj2: T): boolean
```

#### Control flow (`control.ts`)

Error handling and async utilities:

```typescript
// Result type for error handling without exceptions
interface OkResult<T> { readonly ok: true; readonly value: T }
interface ErrorResult<E> { readonly ok: false; readonly error: E }
type Result<T, E> = OkResult<T> | ErrorResult<E>

class Result {
  static ok<T>(value: T): OkResult<T>
  static err<E>(error: E): ErrorResult<E>
}

// Assertions with stack trace optimization
assert(value: unknown, message?: string): asserts value
assertExists<T>(value: T | null | undefined, message?: string): NonNullable<T>
exhaustiveSwitchError(value: never, property?: string): never

// Promise utilities
promiseWithResolve<T>(): Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}
sleep(ms: number): Promise<void>
```

#### Reordering system (`reordering.ts`)

Fractional indexing for item ordering. IndexKey is a branded string type that ensures type safety for ordering operations:

```typescript
// Brand type prevents mixing regular strings with index keys
type IndexKey = string & { __brand: 'indexKey' }
const ZERO_INDEX_KEY = 'a0' as IndexKey

// Generate indices for ordering - creates fractional indices between bounds
getIndices(below: IndexKey | null, above: IndexKey | null, n: number): IndexKey[]
getIndexBetween(below: IndexKey | null, above: IndexKey | null): IndexKey
getIndexAbove(below: IndexKey | null): IndexKey
getIndexBelow(above: IndexKey | null): IndexKey
validateIndexKey(key: string): IndexKey

// Sort comparison function for items that have index properties
sortByIndex<T extends { index: IndexKey }>(a: T, b: T): number
```

#### Media helpers (`media/media.ts`)

Media file processing and validation:

```typescript
// Supported media types constants
const DEFAULT_SUPPORTED_IMAGE_TYPES: readonly string[]
const DEFAULT_SUPPORT_VIDEO_TYPES: readonly string[]

class MediaHelpers {
	// Image processing
	static async getImageSize(file: File): Promise<{ w: number; h: number }>
	static async getImageAndDimensions(
		file: File
	): Promise<{ image: HTMLImageElement; w: number; h: number }>
	static isImageType(mimeType: string): boolean
	static isStaticImageType(mimeType: string): boolean
	static isVectorImageType(mimeType: string): boolean
	static isAnimatedImageType(mimeType: string): boolean
	static async isAnimated(file: File): Promise<boolean>

	// Video processing
	static async getVideoSize(file: File): Promise<{ w: number; h: number }>
	static async getVideoFrameAsDataUrl(file: File): Promise<string>
	static async loadVideo(url: string): Promise<HTMLVideoElement>

	// URL management
	static usingObjectURL<T>(blob: Blob, fn: (url: string) => T): T
}
```

### Performance & execution

#### ExecutionQueue (`ExecutionQueue.ts`)

Sequential task execution with optional timing - ensures tasks run one at a time:

```typescript
class ExecutionQueue {
  constructor(private readonly timeout?: number)

  // Add task to queue - waits for previous tasks to complete
  async push<T>(task: () => T | Promise<T>): Promise<Awaited<T>>
  isEmpty(): boolean
  close(): void

  // Usage example:
  const queue = new ExecutionQueue(5000) // 5 second timeout

  // Tasks execute sequentially, not in parallel
  const result1 = await queue.push(() => expensiveOperation1())
  const result2 = await queue.push(() => expensiveOperation2()) // Waits for operation1
}
```

#### Performance tracking (`perf.ts`, `PerformanceTracker.ts`)

Performance measurement and monitoring:

```typescript
// Duration measurement utilities
measureDuration<T>(fn: () => T): {duration: number; result: T}
measureCbDuration<T>(fn: (cb: () => void) => T): Promise<{duration: number; result: T}>
measureAverageDuration(label: string, fn: () => void, iterations: number): void

// Performance tracking across app lifecycle
class PerformanceTracker {
  mark(name: string): void
  measure(name: string, start?: string, end?: string): PerformanceMeasure | void

  // Usage example:
  const tracker = new PerformanceTracker()
  tracker.mark('render-start')
  // ... rendering logic
  tracker.mark('render-end')
  tracker.measure('render-duration', 'render-start', 'render-end')
}
```

### Data processing

#### Hashing (`hash.ts`)

Content hashing for deduplication and caching:

```typescript
// Hash generation for various input types
getHashForString(string: string): string
getHashForBuffer(buffer: ArrayBuffer): string
getHashForObject(object: object): string
lns(str: string): string // locale-normalized string for consistent hashing
```

#### Caching (`cache.ts`)

Weak reference caching system that prevents memory leaks:

```typescript
class WeakCache<T extends object, U> {
	get<P extends T>(item: P, cb: (item: P) => U): U

	// Usage example - caches expensive computations tied to object lifecycle:
	cache = new WeakCache<Shape, BoundingBox>()
	bbox = cache.get(shape, (s) => computeBoundingBox(s)) // Computed once per shape
}
```

#### Storage (`storage.ts`)

Browser storage utilities with comprehensive error handling:

```typescript
// LocalStorage operations with error boundaries
getFromLocalStorage(key: string): string | null
setInLocalStorage(key: string, value: string): void
deleteFromLocalStorage(key: string): void
clearLocalStorage(): void

// SessionStorage operations
getFromSessionStorage(key: string): string | null
setInSessionStorage(key: string, value: string): void
deleteFromSessionStorage(key: string): void
clearSessionStorage(): void
```

### Utility functions

#### Timing & throttling

```typescript
// Throttling utilities for performance
debounce<T extends (...args: any[]) => any>(func: T, wait: number): T
fpsThrottle<T extends (...args: any[]) => any>(func: T): T // 60fps throttling
throttleToNextFrame<T extends (...args: any[]) => any>(func: T): T

// Timer management with cleanup
class Timers {
  setTimeout(handler: () => void, timeout?: number): number
  setInterval(handler: () => void, timeout?: number): number
  requestAnimationFrame(handler: () => void): number
  dispose(): void // Cleanup all timers
}
```

#### File operations (`file.ts`)

File system and blob utilities:

```typescript
class FileHelpers {
	static mimeTypeFromFilename(filename: string): string
	static extension(filename: string): string
	static isImage(file: File): boolean
	static isVideo(file: File): boolean
	static async dataUrlToBlob(dataUrl: string): Promise<Blob>
	static async blobToDataUrl(blob: Blob): Promise<string>
}
```

#### Value processing (`value.ts`)

Value validation and cloning:

```typescript
// Type guards with proper type narrowing
isDefined<T>(value: T): value is NonNullable<T>
isNonNull<T>(value: T): value is NonNull<T>
isNonNullish<T>(value: T): value is NonNullable<T>

// Structured cloning with fallbacks
structuredClone<T>(obj: T): T
isNativeStructuredClone(): boolean
```

#### Network (`network.ts`)

Network utilities with cross-platform polyfills:

```typescript
// Cross-platform fetch and Image with Node.js compatibility
export const fetch: typeof globalThis.fetch
export const Image: typeof globalThis.Image
```

### Specialized utilities

#### String processing

```typescript
// String enumeration helper for creating string literal types
stringEnum<T extends Record<string, string>>(obj: T): T

// URL processing with safe parsing
safeParseUrl(url: string): URL | undefined
```

#### Mathematical operations

```typescript
// Interpolation and random number generation
lerp(a: number, b: number, t: number): number
invLerp(a: number, b: number, v: number): number
modulate(value: number, rangeA: [number, number], rangeB: [number, number]): number
rng(seed?: string): () => number // Seedable PRNG for deterministic randomness
```

#### Error enhancement (`error.ts`)

Error annotation system for debugging:

```typescript
interface ErrorAnnotations {
  tags?: {[key: string]: {value: unknown}}
  extras?: {[key: string]: unknown}
}

annotateError(error: unknown, annotations: ErrorAnnotations): void
getErrorAnnotations(error: unknown): ErrorAnnotations | undefined
```

## Key design patterns

### Type safety

- Extensive use of TypeScript generics for type preservation
- Brand types for nominal typing (IndexKey prevents string/index confusion)
- Type guards for runtime type checking with proper narrowing
- Assertion functions that provide type information to TypeScript

### Performance optimization

- Stack trace optimization with `omitFromStackTrace` for cleaner debugging
- Weak reference caching to prevent memory leaks
- FPS-aware throttling for smooth 60fps animations
- Efficient object comparison with early returns and shallow checks

### Cross-Platform compatibility

The utils package ensures consistent behavior across different JavaScript environments:

**Browser Compatibility:**

- Storage utilities handle quota exceeded errors gracefully
- Media helpers work with File API and canvas operations
- Performance tracking uses native Performance API when available

**Node.js Compatibility:**

- Network utilities provide fetch and Image polyfills for server environments
- File operations handle both browser Blob/File APIs and Node.js buffers
- Performance tracking falls back to high-resolution time measurements

**Test Environment:**

- Mock-friendly APIs that can be easily stubbed
- Deterministic random number generation for reproducible tests
- Environment detection utilities for conditional behavior

### Functional programming

- Pure functions with no side effects (except explicit I/O operations)
- Immutable operations that return new objects rather than mutating inputs
- Higher-order functions for common patterns like filtering and mapping
- Composition-friendly API design that works well with pipes and chains

## Usage patterns & examples

### In editor package

```typescript
// Array utilities for managing shape collections
const visibleShapes = shapes.filter((shape) => shape.visible)
const uniqueShapes = dedupe(shapes, (a, b) => a.id === b.id)
const [selectedShapes, unselectedShapes] = partition(shapes, (shape) => shape.selected)

// Reordering system for z-index management
const newIndex = getIndexBetween(belowShape?.index ?? null, aboveShape?.index ?? null)
const sortedShapes = shapes.sort(sortByIndex)
```

### In state package

```typescript
// Control flow utilities for error handling
const result = Result.ok(computedValue)
if (!result.ok) {
	// Handle error case
	return result.error
}

// Performance tracking for reactive updates
const tracker = new PerformanceTracker()
tracker.mark('reaction-start')
// ... reactive computation
tracker.measure('reaction-time', 'reaction-start')
```

### In store package

```typescript
// Hashing for record deduplication
const recordHash = getHashForObject(record)
const isDuplicate = existingHashes.has(recordHash)

// Execution queue for atomic operations
const writeQueue = new ExecutionQueue()
await writeQueue.push(() => database.write(operation))
```

## Dependencies

### External dependencies

- `lodash.isequal`, `lodash.isequalwith`: Deep equality comparison for complex objects
- `lodash.throttle`, `lodash.uniq`: Performance utilities with battle-tested implementations
- `fractional-indexing-jittered`: Fractional indexing implementation for stable ordering

### Peer dependencies

None - the utils package is completely self-contained and provides the foundation for other tldraw packages.

### Internal dependencies

None - this package has no dependencies on other `@tldraw/*` packages, making it the foundation of the dependency graph.

## When to use utils vs other packages

**Use @tldraw/utils when:**

- You need basic array/object manipulation utilities
- You're implementing error handling with Result types
- You need performance measurement or throttling
- You're working with media files or storage operations
- You need cross-platform compatibility utilities

**Use other packages when:**

- `@tldraw/state` for reactive state management
- `@tldraw/store` for document/record management
- `@tldraw/editor` for canvas/shape operations
- `@tldraw/tldraw` for complete editor with UI

## Testing patterns

The utils package follows co-located testing with `.test.ts` files alongside source files:

```typescript
// Example test patterns
describe('ExecutionQueue', () => {
	it('executes tasks sequentially', async () => {
		const queue = new ExecutionQueue()
		const results: number[] = []

		// These should execute in order, not parallel
		await Promise.all([
			queue.push(() => {
				results.push(1)
				return 1
			}),
			queue.push(() => {
				results.push(2)
				return 2
			}),
			queue.push(() => {
				results.push(3)
				return 3
			}),
		])

		expect(results).toEqual([1, 2, 3])
	})
})
```

## Troubleshooting common issues

### Performance issues

- Use `fpsThrottle` for UI updates that happen frequently
- Use `WeakCache` for expensive computations tied to object lifecycles
- Use `ExecutionQueue` to prevent overwhelming the system with parallel operations

### Memory leaks

- Prefer `WeakCache` over `Map` for object-keyed caches
- Always call `dispose()` on `Timers` instances
- Use `Result` types instead of throwing exceptions in hot paths

### Type safety issues

- Use assertion functions (`assert`, `assertExists`) for runtime type checking
- Prefer branded types (like `IndexKey`) for values that shouldn't be mixed
- Use type guards (`isDefined`, `isNonNull`) before accessing potentially undefined values

### Cross-Platform issues

- Use provided `fetch` and `Image` exports instead of globals for Node.js compatibility
- Handle storage quota errors with try/catch around storage operations
- Use `safeParseUrl` instead of `new URL()` constructor for user input

## Version compatibility

The utils package maintains backward compatibility within major versions. When upgrading:

- Check for deprecated function warnings in TypeScript
- Review breaking changes in CHANGELOG.md
- Test thoroughly with your specific usage patterns
- Consider using the migration scripts provided for major version updates

## Key benefits

### Performance

- Optimized algorithms for common operations (O(n) where possible)
- Memory-efficient caching with automatic cleanup
- Non-blocking execution patterns with queuing
- Minimal object allocations in hot paths

### Reliability

- Comprehensive error handling with Result types
- Type-safe operations prevent runtime errors
- Defensive programming practices throughout
- Extensive test coverage (>95% line coverage)

### Developer experience

- Clear, descriptive function names following consistent patterns
- Comprehensive TypeScript types with proper generic constraints
- Well-documented public interfaces with usage examples
- Functional programming patterns that compose well

```

```


# ==================
# FILE: packages/validate/CONTEXT.md
# ==================

# Validate Package Context

## Overview

The `@tldraw/validate` package provides a comprehensive runtime validation system for TypeScript applications. It offers type-safe validation with performance optimizations, detailed error reporting, and composable validators for complex data structures.

## Architecture

### Core validation system

#### `Validator<T>` - base validator class

The foundation of the validation system:

```typescript
class Validator<T> implements Validatable<T> {
	validate(value: unknown): T
	validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T
	isValid(value: unknown): value is T
	nullable(): Validator<T | null>
	optional(): Validator<T | undefined>
	refine<U>(otherValidationFn: (value: T) => U): Validator<U>
	check(checkFn: (value: T) => void): Validator<T>
}
```

Key features:

- **Performance optimization**: `validateUsingKnownGoodVersion` avoids re-validating unchanged parts
- **Type safety**: Maintains TypeScript type information through validation
- **Composability**: Chain validators with `refine` and `check`
- **Nullability**: Easy nullable/optional variants

#### `ValidationError` - enhanced error reporting

Detailed error information with path tracking:

```typescript
class ValidationError extends Error {
  constructor(
    public readonly rawMessage: string,
    public readonly path: ReadonlyArray<number | string> = []
  )
}
```

Features:

- **Path tracking**: Shows exactly where in nested objects validation failed
- **Formatted messages**: Human-readable error descriptions
- **Stack trace integration**: Proper error reporting for debugging

### Primitive validators

#### Basic types

```typescript
// Core primitives
const string: Validator<string>
const number: Validator<number>      // finite, non-NaN
const boolean: Validator<boolean>
const bigint: Validator<bigint>
const unknown: Validator<unknown>    // accepts anything
const any: Validator<any>           // escape hatch

// Arrays
const array: Validator<unknown[]>
arrayOf<T>(itemValidator: Validatable<T>): ArrayOfValidator<T>
```

#### Numeric validators

Specialized number validation:

```typescript
const positiveNumber: Validator<number> // > 0
const nonZeroNumber: Validator<number> // >= 0
const integer: Validator<number> // whole numbers
const positiveInteger: Validator<number> // positive integers
const nonZeroInteger: Validator<number> // non-negative integers
```

#### URL validators

Safe URL validation for different contexts:

```typescript
const linkUrl: Validator<string> // http/https/mailto URLs safe for links
const srcUrl: Validator<string> // http/https/data/asset URLs safe for resources
const httpUrl: Validator<string> // strict http/https only
```

#### Literal & enum validators

```typescript
literal<T>(expectedValue: T): Validator<T>
literalEnum<Values>(...values: Values): Validator<Values[number]>
setEnum<T>(values: ReadonlySet<T>): Validator<T>
```

### Complex validators

#### `ObjectValidator<Shape>` - object validation

Type-safe object structure validation:

```typescript
class ObjectValidator<Shape> extends Validator<Shape> {
	constructor(config: { [K in keyof Shape]: Validatable<Shape[K]> })

	allowUnknownProperties(): ObjectValidator<Shape>
	extend<Extension>(extension: Extension): ObjectValidator<Shape & Extension>
}

// Usage
const personValidator = object({
	name: string,
	age: positiveInteger,
	email: linkUrl.optional(),
})
```

Features:

- **Property validation**: Each property validated with its own validator
- **Unknown property handling**: Strict by default, configurable
- **Extension support**: Compose validators via extension
- **Performance**: Optimized validation using known good values

#### `ArrayOfValidator<T>` - array content validation

Validates array contents with additional constraints:

```typescript
class ArrayOfValidator<T> extends Validator<T[]> {
	constructor(itemValidator: Validatable<T>)

	nonEmpty(): ArrayOfValidator<T>
	lengthGreaterThan1(): ArrayOfValidator<T>
}

// Usage
const numbersValidator = arrayOf(number).nonEmpty()
```

#### `UnionValidator<Key, config>` - discriminated unions

Type-safe discriminated union validation:

```typescript
class UnionValidator<Key, Config> extends Validator<TypeOf<Config[keyof Config]>> {
	validateUnknownVariants<Unknown>(
		unknownValueValidation: (value: object, variant: string) => Unknown
	): UnionValidator<Key, Config, Unknown>
}

// Usage
const shapeValidator = union('type', {
	rectangle: object({ type: literal('rectangle'), width: number, height: number }),
	circle: object({ type: literal('circle'), radius: number }),
})
```

#### `DictValidator<Key, value>` - dictionary validation

Validates objects as key-value maps:

```typescript
class DictValidator<Key, Value> extends Validator<Record<Key, Value>> {
	constructor(keyValidator: Validatable<Key>, valueValidator: Validatable<Value>)
}

// Usage
const stringToNumberDict = dict(string, number)
const jsonDict = dict(string, jsonValue)
```

### Specialized validators

#### JSON Validation

Safe JSON value validation:

```typescript
const jsonValue: Validator<JsonValue>
jsonDict(): DictValidator<string, JsonValue>
```

Handles:

- Primitive JSON types (string, number, boolean, null)
- Nested arrays and objects
- Performance optimized for large JSON structures

#### Index key validation

Fractional indexing support:

```typescript
const indexKey: Validator<IndexKey>
```

Validates fractional indexing keys for ordering systems.

#### Model validation

Named entity validation with enhanced error reporting:

```typescript
model<T extends {readonly id: string}>(name: string, validator: Validatable<T>): Validator<T>
```

### Utility functions

#### Composition helpers

```typescript
// Union composition
or<T1, T2>(v1: Validatable<T1>, v2: Validatable<T2>): Validator<T1 | T2>

// Nullability
optional<T>(validator: Validatable<T>): Validator<T | undefined>
nullable<T>(validator: Validatable<T>): Validator<T | null>
```

## Performance optimizations

### Known good version validation

The `validateUsingKnownGoodVersion` method provides significant performance benefits:

- **Structural sharing**: Returns the previous value if validation passes and no changes detected
- **Partial validation**: Only validates changed parts of complex structures
- **Reference equality**: Uses `Object.is()` for quick equality checks
- **Early returns**: Avoids expensive validation when possible

### Efficient object processing

- **Property iteration**: Optimized loops for object validation
- **Error path building**: Lazy path construction for error reporting
- **Type guards**: Fast runtime type checking

## Error handling

### Detailed error messages

- **Type information**: Clear description of expected vs actual types
- **Path context**: Exact location of validation failure in nested structures
- **Custom messages**: Support for domain-specific error descriptions

### Error path formatting

```typescript
// Example error paths:
'At name: Expected string, got number'
"At users.0.email: Expected a valid url, got 'invalid-email'"
'At shape.(type = rectangle).width: Expected a positive number, got -5'
```

## Usage patterns

### Shape schema validation

Used extensively in tlschema package:

```typescript
export const imageShapeProps: RecordProps<TLImageShape> = {
	w: T.nonZeroNumber,
	h: T.nonZeroNumber,
	playing: T.boolean,
	url: T.linkUrl,
	assetId: assetIdValidator.nullable(),
	crop: ImageShapeCrop.nullable(),
	flipX: T.boolean,
	flipY: T.boolean,
}
```

### API request validation

Safe handling of external data:

```typescript
const queryValidator = T.object({
	w: T.string.optional(),
	q: T.string.optional(),
})

const validatedQuery = queryValidator.validate(request.query)
```

### Store migration validation

Ensures data integrity during schema migrations:

```typescript
const migrationValidator = T.object({
	fromVersion: T.positiveInteger,
	toVersion: T.positiveInteger,
	data: T.jsonValue,
})
```

## Design principles

### Type safety first

- **Compile-time**: Full TypeScript support with proper type inference
- **Runtime**: Guaranteed type safety after validation passes
- **Type preservation**: Validators maintain exact input types when possible

### Performance conscious

- **Minimal allocations**: Reuse objects when validation passes
- **Early exits**: Fast paths for common cases
- **Lazy evaluation**: Only compute expensive operations when needed

### Developer experience

- **Clear APIs**: Intuitive method names and composition patterns
- **Helpful errors**: Detailed error messages with context
- **Composability**: Easy to build complex validators from simple ones

### Security focused

- **Safe URLs**: Protocol validation prevents XSS and other attacks
- **Input sanitization**: Strict validation of external data
- **No unsafe operations**: All validators are pure functions

## Integration with tldraw

### Schema validation

Core integration with tlschema package for:

- Shape property validation
- Style property validation
- Record type validation
- Migration validation

### Store integration

Used in store package for:

- Record validation during creation/updates
- Migration step validation
- Query parameter validation

### Editor integration

Runtime validation in editor for:

- User input validation
- External content validation
- API response validation
- Configuration validation

## Key benefits

### Runtime safety

- Catch type errors at runtime before they cause issues
- Validate external data (API responses, user input, file contents)
- Ensure data integrity throughout the application

### Development productivity

- Clear error messages help debug validation issues quickly
- Type inference reduces boilerplate
- Composable design enables reusable validation logic

### Performance

- Optimized validation reduces unnecessary work
- Structural sharing preserves object references
- Early exits minimize computation cost


# ==================
# FILE: packages/worker-shared/CONTEXT.md
# ==================

# Worker-Shared Package Context

## Overview

The `@tldraw/worker-shared` package provides shared utilities for tldraw's worker services (bemo-worker, dotcom-worker, etc.). It includes request handling, asset management, bookmark processing, error monitoring, and environment utilities optimized for edge computing platforms like Cloudflare Workers.

## Architecture

### Request routing system (`handleRequest.ts`)

Type-safe HTTP request handling with validation:

#### Router creation

```typescript
import { Router, RouterType, IRequest, RequestHandler } from 'itty-router'

type ApiRoute<Env, Ctx> = (
	path: string,
	...handlers: RequestHandler<IRequest, [env: Env, ctx: Ctx]>[]
) => RouterType<IRequest, [env: Env, ctx: Ctx]>

function createRouter<Env extends SentryEnvironment, Ctx extends ExecutionContext>() {
	const router: ApiRouter<Env, Ctx> = Router()
	return router
}
```

#### Request handler

```typescript
async function handleApiRequest({
	router,
	request,
	env,
	ctx,
	after,
}: {
	router: ApiRouter<Env, Ctx>
	request: Request
	env: Env
	ctx: Ctx
	after(response: Response): Response | Promise<Response>
}) {
	try {
		response = await router.fetch(request, env, ctx)
	} catch (error: any) {
		if (error instanceof StatusError) {
			response = Response.json({ error: error.message }, { status: error.status })
		} else {
			response = Response.json({ error: 'Internal server error' }, { status: 500 })
			createSentry(ctx, env, request)?.captureException(error)
		}
	}

	return await after(response)
}
```

#### Input validation

Type-safe request parsing with validation:

```typescript
// Query parameter validation
function parseRequestQuery<Params>(request: IRequest, validator: T.Validator<Params>) {
	try {
		return validator.validate(request.query)
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Query parameters: ${err.message}`)
		}
		throw err
	}
}

// Request body validation
async function parseRequestBody<Body>(request: IRequest, validator: T.Validator<Body>) {
	try {
		return validator.validate(await request.json())
	} catch (err) {
		if (err instanceof T.ValidationError) {
			throw new StatusError(400, `Body: ${err.message}`)
		}
		throw err
	}
}
```

### Asset management (`userAssetUploads.ts`)

Cloudflare R2 integration for user-uploaded assets:

#### Asset upload

```typescript
async function handleUserAssetUpload({
	body,
	headers,
	bucket,
	objectName,
}: {
	objectName: string
	bucket: R2Bucket
	body: ReadableStream | null
	headers: Headers
}): Promise<Response> {
	// Prevent duplicate uploads
	if (await bucket.head(objectName)) {
		return Response.json({ error: 'Asset already exists' }, { status: 409 })
	}

	// Store in R2 with original metadata
	const object = await bucket.put(objectName, body, {
		httpMetadata: headers,
	})

	return Response.json(
		{ object: objectName },
		{
			headers: { etag: object.httpEtag },
		}
	)
}
```

#### Asset retrieval with caching

```typescript
async function handleUserAssetGet({
	request,
	bucket,
	objectName,
	context,
}: {
	request: IRequest
	bucket: R2Bucket
	objectName: string
	context: ExecutionContext
}): Promise<Response> {
	// Check Cloudflare cache first
	const cacheKey = new Request(request.url, { headers: request.headers })
	const cachedResponse = await caches.default.match(cacheKey)
	if (cachedResponse) return cachedResponse

	// Fetch from R2 with range/conditional support
	const object = await bucket.get(objectName, {
		range: request.headers, // Support Range requests
		onlyIf: request.headers, // Support If-None-Match, etc.
	})

	if (!object) return notFound()

	const headers = new Headers()
	object.writeHttpMetadata(headers)

	// Immutable asset caching (1 year)
	headers.set('cache-control', 'public, max-age=31536000, immutable')
	headers.set('etag', object.httpEtag)
	headers.set('access-control-allow-origin', '*')

	// Handle Range responses
	if (object.range) {
		const contentRange = calculateContentRange(object)
		headers.set('content-range', contentRange)
	}

	const status = object.body ? (object.range ? 206 : 200) : 304

	// Cache successful responses
	if (status === 200) {
		const [cacheBody, responseBody] = object.body!.tee()
		context.waitUntil(caches.default.put(cacheKey, new Response(cacheBody, { headers, status })))
		return new Response(responseBody, { headers, status })
	}

	return new Response(object.body, { headers, status })
}
```

### Bookmark processing (`bookmarks.ts`)

Web page metadata extraction with image optimization:

#### Metadata extraction

```typescript
import { unfurl } from 'cloudflare-workers-unfurl'

const queryValidator = T.object({
	url: T.httpUrl, // Validate URL format
})

async function handleExtractBookmarkMetadataRequest({
	request,
	uploadImage,
}: {
	request: IRequest
	uploadImage?: UploadImage
}) {
	const url = parseRequestQuery(request, queryValidator).url

	const metadataResult = await unfurl(url)

	if (!metadataResult.ok) {
		switch (metadataResult.error) {
			case 'bad-param':
				throw new StatusError(400, 'Bad URL')
			case 'failed-fetch':
				throw new StatusError(422, 'Failed to fetch URL')
		}
	}

	const metadata = metadataResult.value

	// Optionally save optimized images
	if (uploadImage) {
		const id = crypto.randomUUID()
		await Promise.all([
			trySaveImage('image', metadata, id, 600, uploadImage), // 600px preview
			trySaveImage('favicon', metadata, id, 64, uploadImage), // 64px favicon
		])
	}

	return Response.json(metadata)
}
```

#### Image optimization

```typescript
async function trySaveImage(
	key: 'image' | 'favicon',
	metadata: { [key]?: string },
	id: string,
	size: number,
	uploadImage: UploadImage
): Promise<void> {
	const initialUrl = metadata[key]
	if (!initialUrl) return

	try {
		// Cloudflare image optimization
		const imageResponse = await fetch(initialUrl, {
			cf: {
				image: {
					width: size,
					fit: 'scale-down',
					quality: 80,
				},
			},
		})

		if (!imageResponse.ok) throw new Error('Failed to fetch image')

		const contentType = imageResponse.headers.get('content-type')
		if (!contentType?.startsWith('image/')) {
			throw new Error('Not an image')
		}

		// Upload optimized image
		const objectName = `bookmark-${key}-${id}`
		metadata[key] = await uploadImage(imageResponse.headers, imageResponse.body, objectName)
	} catch (error) {
		console.error(`Error saving ${key}:`, error)
		// Graceful degradation - keep original URL
	}
}
```

### Error monitoring (`sentry.ts`)

Sentry integration for production error tracking:

#### Sentry configuration

```typescript
import { Toucan } from 'toucan-js'

interface SentryEnvironment {
	readonly SENTRY_DSN?: string
	readonly TLDRAW_ENV?: string
	readonly WORKER_NAME?: string
	readonly CF_VERSION_METADATA?: WorkerVersionMetadata
}

function createSentry(ctx: Context, env: SentryEnvironment, request?: Request) {
	// Skip Sentry in development
	if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
		return null
	}

	const { SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA } = requiredEnv(env, {
		SENTRY_DSN: true,
		WORKER_NAME: true,
		CF_VERSION_METADATA: true,
	})

	return new Toucan({
		dsn: SENTRY_DSN,
		release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`, // Worker version tracking
		environment: WORKER_NAME,
		context: ctx,
		request,
		requestDataOptions: {
			allowedHeaders: ['user-agent'],
			allowedSearchParams: /(.*)/,
		},
	})
}
```

### Environment management (`env.ts`)

Type-safe environment variable handling:

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}

// Usage example
const { SENTRY_DSN, API_KEY } = requiredEnv(env, {
	SENTRY_DSN: true,
	API_KEY: true,
})
// TypeScript guarantees these are non-null
```

### HTTP error utilities (`errors.ts`)

Standard HTTP error responses:

```typescript
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Key features

### Asset pipeline

**R2 integration**: Cloudflare R2 object storage for user assets
**Caching strategy**: Multi-layer caching with Cloudflare Cache API
**Range requests**: Support for partial content delivery
**Immutable assets**: Long-term caching for uploaded content

### Bookmark system

**Metadata extraction**: Rich preview data from web pages
**Image optimization**: Automatic image resizing and quality optimization
**Fallback handling**: Graceful degradation when image processing fails
**Multi-size support**: Different image sizes for different use cases

### Error handling

**Structured errors**: Consistent error response format
**Monitoring integration**: Automatic error reporting to Sentry
**Graceful degradation**: Fallback behavior for non-critical failures
**Development safety**: Sentry disabled in development mode

### Performance

**Edge computing**: Optimized for Cloudflare Workers runtime
**Streaming support**: Efficient handling of large uploads/downloads
**Cache integration**: Leverages Cloudflare's global cache network
**Minimal dependencies**: Lightweight for fast cold starts

## Integration patterns

### Basic worker setup

```typescript
import {
	createRouter,
	handleApiRequest,
	createSentry,
	handleUserAssetUpload,
	handleExtractBookmarkMetadataRequest,
} from '@tldraw/worker-shared'

const router = createRouter<Env, ExecutionContext>()

router.post('/api/uploads/:objectName', async (request, env, ctx) => {
	return handleUserAssetUpload({
		objectName: request.params.objectName,
		bucket: env.UPLOADS_BUCKET,
		body: request.body,
		headers: request.headers,
	})
})

router.get('/api/bookmark', async (request, env, ctx) => {
	return handleExtractBookmarkMetadataRequest({
		request,
		uploadImage: async (headers, body, objectName) => {
			await handleUserAssetUpload({ objectName, bucket: env.ASSETS_BUCKET, body, headers })
			return `https://assets.tldraw.com/${objectName}`
		},
	})
})

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		return handleApiRequest({
			router,
			request,
			env,
			ctx,
			after: (response) => {
				// Add CORS headers, rate limiting, etc.
				response.headers.set('access-control-allow-origin', '*')
				return response
			},
		})
	},
}
```

### Asset upload flow

```typescript
// 1. Client uploads asset
const formData = new FormData()
formData.append('file', file)

const response = await fetch('/api/uploads/asset-uuid', {
	method: 'POST',
	body: formData,
})

// 2. Worker processes upload
const { object } = await response.json()
// object === 'asset-uuid'

// 3. Client references asset
const assetUrl = `https://assets.tldraw.com/${object}`
```

### Bookmark processing flow

```typescript
// 1. Client requests bookmark metadata
const response = await fetch(`/api/bookmark?url=${encodeURIComponent(pageUrl)}`)

// 2. Worker extracts metadata
const metadata = await unfurl(url) // Title, description, image, favicon

// 3. Worker optimizes images
await Promise.all([
	trySaveImage('image', metadata, id, 600, uploadImage), // Preview image
	trySaveImage('favicon', metadata, id, 64, uploadImage), // Icon
])

// 4. Client receives processed metadata
const { title, description, image, favicon } = await response.json()
```

## Cloudflare workers integration

### R2 storage integration

```typescript
interface Env {
	UPLOADS_BUCKET: R2Bucket
	ASSETS_BUCKET: R2Bucket
}

// Upload to R2
await bucket.put(objectName, body, {
	httpMetadata: headers, // Preserve original headers
})

// Retrieve from R2 with caching
const object = await bucket.get(objectName, {
	range: request.headers, // Support Range requests
	onlyIf: request.headers, // Support conditional requests
})
```

### Image optimization

```typescript
// Cloudflare Image Resizing
const imageResponse = await fetch(imageUrl, {
	cf: {
		image: {
			width: 600,
			fit: 'scale-down',
			quality: 80,
		},
	},
})
```

### Cache API integration

```typescript
// Leverage Cloudflare's global cache
const cacheKey = new Request(request.url, { headers: request.headers })
const cachedResponse = await caches.default.match(cacheKey)

if (cachedResponse) return cachedResponse

// ... generate response

// Cache for future requests
context.waitUntil(caches.default.put(cacheKey, response.clone()))
```

## Environment management

### Type-safe environment variables

```typescript
interface WorkerEnv {
	SENTRY_DSN?: string
	TLDRAW_ENV?: string
	WORKER_NAME?: string
	CF_VERSION_METADATA?: WorkerVersionMetadata
	API_BUCKET?: R2Bucket
}

// Validate required environment variables
const { SENTRY_DSN, WORKER_NAME } = requiredEnv(env, {
	SENTRY_DSN: true,
	WORKER_NAME: true,
})
// TypeScript guarantees these are defined
```

### Environment validation

```typescript
function requiredEnv<T extends object>(
	env: T,
	keys: { [K in keyof T]: true }
): { [K in keyof T]-?: NonNullable<T[K]> } {
	for (const key of Object.keys(keys)) {
		if (getOwnProperty(env, key) === undefined) {
			throw new Error(`Missing required env var: ${key}`)
		}
	}
	return env as any
}
```

## Error handling system

### Standard HTTP errors

```typescript
// Common error responses
function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}

// Validation errors
throw new StatusError(400, `Query parameters: ${validationMessage}`)
```

### Monitoring integration

```typescript
// Automatic error reporting
try {
	// ... worker logic
} catch (error) {
	createSentry(ctx, env, request)?.captureException(error)
	return Response.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Development vs production

```typescript
// Sentry only in production
if (!env.SENTRY_DSN && env.TLDRAW_ENV === 'development') {
	return null // No Sentry in dev
}

// Production error tracking
const sentry = new Toucan({
	dsn: SENTRY_DSN,
	release: `${WORKER_NAME}.${CF_VERSION_METADATA.id}`,
	environment: WORKER_NAME,
})
```

## Performance optimizations

### Edge computing

- **Global distribution**: Workers run at Cloudflare edge locations
- **Low latency**: Processing close to users
- **Automatic scaling**: Handles traffic spikes automatically
- **Zero cold starts**: V8 isolates for instant execution

### Caching strategy

- **Multi-layer caching**: Browser cache + CDN cache + worker cache
- **Immutable assets**: Assets cached for 1 year
- **Cache invalidation**: ETags for conditional requests
- **Range support**: Efficient partial content delivery

### Resource efficiency

- **Streaming**: Support for large file uploads/downloads
- **Memory management**: Efficient handling of binary data
- **Connection pooling**: Reuse connections for external requests
- **Background tasks**: Non-blocking asset processing

## Security considerations

### Input validation

- **URL validation**: Ensure valid HTTP/HTTPS URLs for bookmarks
- **File type validation**: Verify content types for uploads
- **Size limits**: Prevent abuse with file size restrictions
- **Path sanitization**: Secure object naming patterns

### Access control

- **CORS configuration**: Controlled cross-origin access
- **Authentication**: Integration with auth systems
- **Rate limiting**: Prevent API abuse
- **Error information**: Careful error message disclosure

### Content safety

- **Image processing**: Automatic optimization prevents malicious images
- **Metadata scrubbing**: Remove sensitive information from extracted data
- **Sandbox execution**: Workers isolated from sensitive systems
- **Monitoring**: Comprehensive error and security event tracking

## Deployment architecture

### Worker distribution

```
Edge Locations (Global)
├── bemo-worker          # Multiplayer sync worker
├── dotcom-worker        # Main app API worker
├── assets-worker        # Asset serving worker
└── bookmark-worker      # Bookmark processing worker
    └── worker-shared/   # Shared utilities (this package)
```

### Service integration

- **R2 Storage**: Asset persistence and delivery
- **Cache API**: Performance optimization
- **Analytics**: Request and error monitoring
- **CDN**: Global content delivery network

## Key benefits

### Development experience

- **Type safety**: Full TypeScript support for worker development
- **Reusable patterns**: Common worker utilities abstracted
- **Error handling**: Comprehensive error management system
- **Testing support**: Jest configuration for worker code

### Operations

- **Monitoring**: Automatic error reporting and analytics
- **Performance**: Edge computing with global distribution
- **Reliability**: Graceful error handling and fallbacks
- **Scaling**: Automatic traffic handling and resource management

### Maintenance

- **Shared code**: Consistent patterns across all workers
- **Environment management**: Type-safe configuration handling
- **Dependency management**: Minimal, focused dependencies
- **Deployment**: Streamlined worker deployment workflows


# ==================
# FILE: templates/branching-chat/CONTEXT.md
# ==================

# Branching Chat Template

This template demonstrates a branching conversational UI built on tldraw, showcasing how to create interactive node-based chat interfaces that can branch and merge conversation flows.

## Overview

The branching chat template is a full-stack application that combines tldraw's infinite canvas with AI chat capabilities, allowing users to create visual conversation trees with branching dialogue paths.

### Key features

- **Visual conversation flow**: Create branching conversation trees on an infinite canvas
- **AI integration**: Stream responses from AI models (OpenAI/compatible APIs)
- **Node-based UI**: Custom node shapes representing chat messages
- **Connection system**: Visual connections between conversation nodes
- **Real-time updates**: Streaming AI responses with live updates
- **Cloudflare Workers**: Backend powered by Cloudflare Workers and Durable Objects

## Architecture

### Frontend (`/client`)

**Core app structure**

- `App.tsx` - Main application component with tldraw configuration
- Custom shape utilities: `NodeShapeUtil`, `ConnectionShapeUtil`
- Custom binding utilities: `ConnectionBindingUtil`
- Workflow-specific toolbar and UI components

**Node system** (`/client/nodes`)

- `NodeShapeUtil.tsx` - Defines how chat nodes render and behave
- `nodeTypes.tsx` - Type definitions and node management utilities
- `types/MessageNode.tsx` - Message node implementation with AI streaming
- `nodePorts.tsx` - Connection port system for linking nodes

**Connection system** (`/client/connection`)

- `ConnectionShapeUtil.tsx` - Visual connections between nodes
- `ConnectionBindingUtil.tsx` - Binding logic for node relationships
- `keepConnectionsAtBottom.tsx` - Z-index management for connections

**Ports system** (`/client/ports`)

- `Port.tsx` - Port definitions and utilities
- `PointingPort.tsx` - Interactive port pointing tool

**UI components** (`/client/components`)

- `WorkflowToolbar.tsx` - Custom toolbar with node creation tools
- Custom icons and UI elements

### Backend (`/worker`)

**Cloudflare Workers architecture**

- `worker.ts` - Main worker entry point with routing
- `do.ts` - Durable Object for stateful operations
- `routes/` - API route handlers
- `types.ts` - Shared type definitions

**Key endpoints**

- `/stream` - POST endpoint for AI chat streaming
- Handles conversation context from connected nodes
- Streams AI responses back to frontend

## Key concepts

### Node types

**MessageNode**

- Represents a single message in the conversation
- Contains user input and AI assistant response
- Supports streaming updates for AI responses
- Dynamic sizing based on content length

### Connection flow

1. **Node creation**: Users create message nodes via toolbar
2. **Connection**: Nodes connect via ports to establish conversation flow
3. **Context building**: When sending a message, system traces back through connected nodes to build conversation history
4. **AI processing**: Complete conversation context sent to AI endpoint
5. **Streaming response**: AI response streamed back and displayed in real-time

### Port system

- **Input ports**: Allow incoming connections from previous conversation steps
- **Output ports**: Allow outgoing connections to next conversation steps
- **Dynamic positioning**: Ports adjust position based on node content size

## Development setup

### Environment variables

Required in `.env` or `.dev.vars`:

```
OPENAI_API_KEY=your_openai_api_key_here
```

### Local development

```bash
yarn dev    # Start development server
```

Serves the application at `http://localhost:5173/`

### Cloudflare Workers

The template uses Cloudflare Workers for the backend:

- `wrangler.toml` - Worker configuration
- Durable Objects for state management
- Edge runtime for global performance

## Customization points

### Adding new node types

1. Create new node definition in `/client/nodes/types/`
2. Add to `NodeDefinitions` array in `nodeTypes.tsx`
3. Implement required methods: `Component`, `getPorts`, `computeOutput`

### Custom AI integration

- Modify `/worker/routes/` to change AI provider
- Uses Vercel AI SDK - supports multiple providers
- Streaming implementation in `MessageNode.tsx`

### UI customization

- Override tldraw components via `components` prop
- Custom toolbar in `WorkflowToolbar.tsx`
- Styling in `index.css`

## Integration with tldraw

### Custom shape system

- Extends tldraw's shape system with `NodeShapeUtil`
- Custom geometry, rendering, and interaction handling
- Maintains tldraw's reactive state management

### Custom tools

- `PointingPort` tool for creating connections
- Integrated into tldraw's select tool state machine
- Drag-and-drop node creation from toolbar

### Binding system

- `ConnectionBindingUtil` manages relationships between nodes
- Automatic cleanup when nodes are deleted
- Visual feedback for connections

## Technical details

### State management

- Uses tldraw's reactive signals for state
- Node data stored in tldraw's document model
- Automatic persistence via tldraw's persistence system

### Performance optimizations

- Connection shapes kept at bottom layer
- Transparency disabled for workflow shapes
- Efficient text measurement for dynamic sizing
- Streaming responses prevent UI blocking

### Deployment

Ready for deployment to Cloudflare Workers:

```bash
yarn build    # Build frontend
wrangler deploy    # Deploy to Cloudflare
```

## File structure

```
/templates/branching-chat/
├── client/                 # Frontend React application
│   ├── App.tsx            # Main app component
│   ├── components/        # UI components
│   ├── connection/        # Connection system
│   ├── nodes/             # Node system
│   ├── ports/             # Port system
│   └── main.tsx          # App entry point
├── worker/                # Cloudflare Worker backend
│   ├── worker.ts         # Worker entry point
│   ├── do.ts             # Durable Object
│   └── routes/           # API routes
├── public/               # Static assets
├── package.json          # Dependencies
├── wrangler.toml         # Worker config
└── vite.config.ts        # Build config
```

This template demonstrates advanced tldraw concepts including custom shapes, tools, bindings, and full-stack integration with modern web technologies.


# ==================
# FILE: templates/workflow/CONTEXT.md
# ==================

# Workflow Template Context

## Overview

This is a starter template for building workflow/flowchart applications using tldraw. It demonstrates how to create a node-based visual programming interface where users can connect functional nodes to create executable workflows.

## Key concepts

### Nodes

- **NodeShapeUtil** (`src/nodes/NodeShapeUtil.tsx`): Custom tldraw shape representing workflow nodes
- **Node types** (`src/nodes/types/`): Different node implementations including:
  - `AddNode`, `SubtractNode`, `MultiplyNode`, `DivideNode`: Mathematical operations
  - `SliderNode`: Input node with slider control
  - `ConditionalNode`: Conditional logic node
- **Node ports** (`src/nodes/nodePorts.tsx`): Helper functions for managing input/output ports on nodes

### Connections

- **ConnectionShapeUtil** (`src/connection/ConnectionShapeUtil.tsx`): Custom shape for connecting nodes
- **ConnectionBindingUtil** (`src/connection/ConnectionBindingUtil.tsx`): Manages relationships between connected nodes
- **Connection management**: Utilities for inserting nodes within connections and maintaining visual hierarchy

### Ports

- **Port system** (`src/ports/Port.tsx`): Defines input/output connection points on nodes
- **PointingPort** (`src/ports/PointingPort.tsx`): Custom interaction state for port-specific behaviors

### Execution system

- **ExecutionGraph** (`src/execution/ExecutionGraph.tsx`): Handles asynchronous execution of workflow graphs
- **Real-time updates**: Nodes update instantly to show results
- **Async execution**: Demonstrates how workflows might execute against real services

## Key features

### Interactive behaviors

- Click output ports to create new connected nodes
- Drag from ports to create connections
- Insert nodes by clicking connection midpoints
- Reconnect or disconnect existing connections
- Visual workflow regions with execution controls

### Custom UI components

- **WorkflowToolbar** (`src/components/WorkflowToolbar.tsx`): Vertical toolbar with workflow-specific tools
- **OnCanvasComponentPicker** (`src/components/OnCanvasComponentPicker.tsx`): Node selection interface
- **WorkflowRegions** (`src/components/WorkflowRegions.tsx`): Visual grouping of connected nodes with play buttons

## Architecture patterns

### Extending tldraw

- **Custom shapes**: `NodeShapeUtil` and `ConnectionShapeUtil` extend tldraw's shape system
- **Custom bindings**: `ConnectionBindingUtil` manages node-to-node relationships
- **Tool extensions**: `PointingPort` extends the select tool with port-specific interactions
- **UI customization**: Complete replacement of toolbar and addition of canvas overlays

### State management

- Uses tldraw's reactive state system for shape data
- Node values flow through connections using port system
- Execution state managed separately for workflow running

### Event handling

- **Port interactions**: Custom pointer events for creating connections and nodes
- **Connection management**: Automatic connection rerouting and cleanup
- **Z-order management**: Connections automatically stay below nodes

## Development patterns

### Creating new node types

1. Extend base node interface in `src/nodes/types/shared.tsx`
2. Implement node component with ports configuration
3. Add to `nodeTypes` registry in `src/nodes/nodeTypes.tsx`
4. Update toolbar in `src/components/WorkflowToolbar.tsx`

### Custom interactions

- Extend `PointingPort` state node for new port behaviors
- Use tldraw's event system for custom shape interactions
- Leverage binding system for automatic relationship management

## File structure

```
src/
├── App.tsx                 # Main app with tldraw customizations
├── main.tsx               # React entry point
├── nodes/                 # Node system
│   ├── NodeShapeUtil.tsx  # Core node shape implementation
│   ├── nodePorts.tsx      # Port management utilities
│   ├── nodeTypes.tsx      # Node type registry
│   └── types/             # Individual node implementations
├── connection/            # Connection system
│   ├── ConnectionShapeUtil.tsx     # Connection shape
│   ├── ConnectionBindingUtil.tsx   # Connection relationships
│   └── [other connection utils]
├── ports/                 # Port interaction system
├── execution/             # Workflow execution engine
└── components/            # UI components
    ├── WorkflowToolbar.tsx
    ├── OnCanvasComponentPicker.tsx
    └── WorkflowRegions.tsx
```

## Usage

Run with `yarn dev` to start development server. The template showcases:

- Creating and connecting nodes
- Real-time value propagation
- Workflow execution simulation
- Custom tldraw UI integration

This template serves as a foundation for building more complex workflow applications, visual programming tools, or node-based editors.
