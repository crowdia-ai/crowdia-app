# Crowdia MVP - Kanban Tasks

## Phase 0: Pre-Launch Setup (Week 1)

### Infrastructure Setup
- [ ] Create Supabase project (EU West region)
- [ ] Set up Supabase authentication (email/password only)
- [ ] Configure Supabase Storage buckets (profiles, event-covers)
- [ ] Set up development, staging, and production environments
- [ ] Create environment variable templates (.env.example)

### Database Schema
- [ ] Create `users` table with RLS policies
- [ ] Create `organizers` table with RLS policies
- [ ] Create `events` table with RLS policies
- [ ] Create `categories` table with RLS policies
- [ ] Create `event_interests` table with RLS policies
- [ ] Create `event_check_ins` table with RLS policies
- [ ] Create `badges` table with RLS policies
- [ ] Create `user_badges` table with RLS policies
- [ ] Create `waiting_list` table with RLS policies
- [ ] Create `events_with_stats` materialized view
- [ ] Add database indexes for performance
- [ ] Set up database triggers for materialized view refresh

### Landing Page (Phase 0)
- [ ] Design landing page copy and layout
- [ ] Create Carrd landing page
- [ ] Set up Tally form with three-path logic (Social Explorer / Event Creator / Ambassador)
- [ ] Configure Tally webhook to Supabase waiting_list table
- [ ] Test form submission and data flow
- [ ] Add "Founders Wall" section to landing page
- [ ] Deploy landing page and get custom domain (if needed)

---

## Phase 1A: Consumer Core (Weeks 2-3)

### Project Setup
- [ ] Initialize Expo project with TypeScript
- [ ] Set up Expo Router file-based navigation
- [ ] Install and configure core dependencies (React Query, Zustand, Zod)
- [ ] Set up Supabase client configuration
- [ ] Configure ESLint and Prettier
- [ ] Set up Git repository and .gitignore
- [ ] Create development documentation (README, contributing guide)

### Authentication Flow
- [ ] Design login screen UI
- [ ] Design signup screen UI
- [ ] Implement email/password signup with Supabase
- [ ] Implement email/password login with Supabase
- [ ] Add form validation with Zod
- [ ] Implement session management
- [ ] Add "I am an Organizer" toggle to signup
- [ ] Create protected route wrapper
- [ ] Implement logout functionality
- [ ] Add error handling for auth flows

### User Profile
- [ ] Design profile screen UI
- [ ] Implement profile data fetching
- [ ] Create profile edit form (username, displayName, bio)
- [ ] Implement profile image upload (ImagePicker + Supabase Storage)
- [ ] Add image compression before upload
- [ ] Display points and check-ins count
- [ ] Display user badges
- [ ] Implement profile update functionality
- [ ] Add loading and error states

### Event Feed
- [ ] Design event card component
- [ ] Design feed screen UI
- [ ] Implement event feed query with pagination
- [ ] Add pull-to-refresh functionality
- [ ] Create filter UI (Today, Tomorrow, Weekend, Category)
- [ ] Implement filter logic for each option
- [ ] Add sorting by featured and start time
- [ ] Implement infinite scroll/pagination
- [ ] Add empty state UI
- [ ] Add loading skeleton

### Map View
- [ ] Set up react-native-maps
- [ ] Design map screen UI
- [ ] Implement map with Palermo initial region
- [ ] Fetch events and display as pins
- [ ] Create mini event card for pin tap
- [ ] Add custom pin markers (optional styling)
- [ ] Handle map permissions
- [ ] Add loading state

### Event Detail Page
- [ ] Design event detail screen UI
- [ ] Implement event data fetching by ID
- [ ] Display full event information (title, description, image, date/time)
- [ ] Add embedded map with event location
- [ ] Implement "Get Directions" button (open native maps)
- [ ] Display "Interested" user list
- [ ] Show interested count and check-in count
- [ ] Add share button
- [ ] Add error handling and loading states

---

## Phase 1B: Gamification & Geolocation (Weeks 4-5)

### Check-in System
- [ ] Request location permissions (foreground)
- [ ] Design check-in button UI state
- [ ] Implement getCurrentPosition functionality
- [ ] Create Supabase Edge Function for check-in validation
- [ ] Implement distance calculation (Haversine or PostGIS)
- [ ] Validate 150m radius requirement
- [ ] Validate event is currently ongoing
- [ ] Prevent duplicate check-ins
- [ ] Award +100 points on successful check-in
- [ ] Update UI with success/error feedback
- [ ] Increment user check-ins counter
- [ ] Add check-in to event detail page

### Points System
- [ ] Create Supabase Edge Function for awarding points
- [ ] Implement +100 points for check-in
- [ ] Implement +50 points for share
- [ ] Implement +10 points for interested
- [ ] Create points counter component
- [ ] Add points display to profile
- [ ] Add database trigger to update points
- [ ] Test point accumulation

### Interest/Going Feature
- [ ] Design "Interested" button UI
- [ ] Implement toggle interested functionality
- [ ] Update interested count in real-time (Supabase Realtime)
- [ ] Display interested status on event card
- [ ] Show interested user list on event detail
- [ ] Award +10 points on interested
- [ ] Handle un-interested action

### Native Share Integration
- [ ] Implement Share API for events
- [ ] Create shareable event link (deep link)
- [ ] Design share content (message + URL)
- [ ] Award +50 points on share
- [ ] Test share on iOS and Android
- [ ] Add share analytics tracking

### Real-time Features
- [ ] Set up Supabase Realtime channels
- [ ] Subscribe to event interest updates
- [ ] Subscribe to event check-in updates
- [ ] Update UI when counters change
- [ ] Handle connection errors

---

## Phase 1C: Organizer Features (Week 6)

### Organizer Registration
- [ ] Create organizer onboarding flow
- [ ] Design organizer profile form
- [ ] Implement organizer profile creation (organization_name, logo, address)
- [ ] Set is_verified to false by default
- [ ] Add verification pending message
- [ ] Create organizer profile view

### Event Creation
- [ ] Design event creation form UI
- [ ] Implement title and description inputs
- [ ] Add cover image upload (ImagePicker + compression)
- [ ] Create category selector
- [ ] Implement Google Places API integration for location
- [ ] Add date/time pickers (start and end)
- [ ] Add optional externalTicketURL field
- [ ] Implement form validation (Zod)
- [ ] Create event submission function
- [ ] Handle image upload to Supabase Storage
- [ ] Add success/error feedback
- [ ] Redirect to event detail after creation

### Organizer Dashboard
- [ ] Design "My Events" screen
- [ ] Fetch organizer's events
- [ ] Display upcoming and past events separately
- [ ] Show interested count per event
- [ ] Show check-in count per event
- [ ] Add navigation to event detail
- [ ] Add navigation to edit event (optional for MVP)
- [ ] Display verification status

### Organizer Profile Page
- [ ] Design public organizer profile
- [ ] Display organization info (name, logo, bio, address)
- [ ] Show organizer's event gallery
- [ ] Separate upcoming and past events
- [ ] Make organizer name clickable from event cards
- [ ] Add loading and empty states

### Conditional Navigation
- [ ] Implement role-based tab bar (consumer vs organizer)
- [ ] Show "My Events" and "Create Event" tabs for organizers only
- [ ] Hide organizer features from consumers
- [ ] Add role check in navigation logic

---

## Phase 1D: Admin Panel (Week 7)

### Admin Panel Setup
- [ ] Initialize Next.js 14 project (App Router)
- [ ] Install Shadcn/ui and Tailwind CSS
- [ ] Set up Supabase Admin SDK (service role key)
- [ ] Configure environment variables
- [ ] Set up admin authentication
- [ ] Create admin role in Supabase (JWT claims)
- [ ] Implement admin route protection middleware
- [ ] Design admin layout and navigation

### Organizer Verification Queue
- [ ] Create `/admin/organizers` page
- [ ] Fetch all organizers with is_verified status
- [ ] Create data table with TanStack Table
- [ ] Add filter for pending (is_verified: false)
- [ ] Implement "Approve" action (set is_verified: true)
- [ ] Implement "Reject" action
- [ ] Add email notification on approval (optional)
- [ ] Show verification timestamp

### Event Management
- [ ] Create `/admin/events` page
- [ ] Fetch all events with organizer info
- [ ] Create data table with inline editing
- [ ] Implement edit event functionality
- [ ] Implement delete event functionality
- [ ] Add "Feature Event" toggle (is_featured)
- [ ] Show event stats (interested, check-ins)
- [ ] Add search and filter options

### User Management
- [ ] Create `/admin/users` page
- [ ] Fetch all users with stats
- [ ] Create data table
- [ ] Implement view user profile
- [ ] Implement ban user functionality (soft delete or flag)
- [ ] Show user activity (points, check-ins)
- [ ] Add search functionality

### Category Management
- [ ] Create `/admin/categories` page
- [ ] Implement CRUD interface for categories
- [ ] Add drag-to-reorder functionality for sort_order
- [ ] Add category icon selector (optional)
- [ ] Validate unique category names
- [ ] Test category updates reflect in mobile app

### Badge Management
- [ ] Create `/admin/badges` page
- [ ] Implement CRUD interface for badges
- [ ] Create "Award Badge" interface
- [ ] Implement user search for badge assignment
- [ ] Assign badge to user
- [ ] Show badge history (who awarded, when)
- [ ] Display user's badges on profile

### Admin Dashboard (Optional)
- [ ] Create admin home page with KPIs
- [ ] Show total users count
- [ ] Show total events count
- [ ] Show total check-ins today
- [ ] Show pending organizer approvals count
- [ ] Add charts for user growth (optional)

---

## Phase 1E: Testing & Launch (Week 8)

### Testing
- [ ] Test user registration and login flow
- [ ] Test organizer registration and verification
- [ ] Test event creation and publishing
- [ ] Test event feed with all filters
- [ ] Test map view and pins
- [ ] Test check-in validation (location + time)
- [ ] Test points system for all actions
- [ ] Test interest/going functionality
- [ ] Test native share
- [ ] Test real-time updates
- [ ] Test admin panel all CRUD operations
- [ ] Test image uploads (profile, event covers)
- [ ] Test external ticket URL (WebView)
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test RLS policies (security)
- [ ] Load test with multiple events

### Performance Optimization
- [ ] Optimize image loading (lazy load)
- [ ] Implement pagination correctly
- [ ] Add caching strategy with React Query
- [ ] Minimize bundle size
- [ ] Test app performance on low-end devices
- [ ] Optimize database queries
- [ ] Add database query monitoring

### App Store Preparation
- [ ] Create app icon (1024x1024)
- [ ] Create app screenshots (iOS + Android)
- [ ] Write app description and keywords
- [ ] Create privacy policy
- [ ] Create terms of service
- [ ] Set up Apple Developer account
- [ ] Set up Google Play Developer account
- [ ] Configure EAS Build
- [ ] Build iOS app with EAS
- [ ] Build Android app with EAS

### Deployment
- [ ] Deploy admin panel to Vercel
- [ ] Set up production Supabase environment
- [ ] Configure production environment variables
- [ ] Submit iOS app to TestFlight
- [ ] Submit Android app to internal testing
- [ ] Test production builds
- [ ] Submit iOS app to App Store review
- [ ] Submit Android app to Play Store review
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics tracking

### Go-to-Market
- [ ] Manually onboard 10-20 founding organizers
- [ ] Import events from founding organizers
- [ ] Send invites to waiting list (1000 users)
- [ ] Prepare launch announcement
- [ ] Update landing page with app store links
- [ ] Monitor launch day metrics
- [ ] Respond to user feedback
- [ ] Fix critical bugs from early users

---

## Post-MVP Enhancements (Future)

### Deferred Features
- [ ] Push notifications for event reminders
- [ ] Public leaderboard page
- [ ] Advanced filters (price range, distance radius)
- [ ] Event recommendations (AI/ML)
- [ ] In-app user-to-user chat
- [ ] Native ticketing system
- [ ] Multi-city support
- [ ] Background geofencing for auto check-ins
- [ ] Social login (Google, Apple)
- [ ] Influencer/Ambassador dashboards
- [ ] Event heatmap view
- [ ] User-generated content (posts, stories)

---

## Ongoing Tasks

### Maintenance
- [ ] Monitor Supabase usage and costs
- [ ] Review and optimize database queries
- [ ] Update dependencies regularly
- [ ] Monitor app crashes and errors
- [ ] Respond to user support requests
- [ ] Review and approve new organizers
- [ ] Feature trending events
- [ ] Award badges to engaged users

### Marketing Support
- [ ] Update Founders Wall on landing page
- [ ] Create social media content
- [ ] Gather user testimonials
- [ ] Track KPIs (DAU, retention, check-ins)
- [ ] Run user surveys
- [ ] Iterate based on feedback

---

## Notes for Notion Import

**Suggested Columns for Kanban Board:**
1. **Status:** To Do | In Progress | In Review | Done
2. **Priority:** High | Medium | Low
3. **Phase:** Phase 0 | Phase 1A | Phase 1B | Phase 1C | Phase 1D | Phase 1E
4. **Category:** Frontend | Backend | Design | DevOps | Admin | Testing
5. **Assignee:** (Team member)
6. **Due Date:** (Based on phase timeline)
7. **Story Points:** (Optional for estimation)

**Color Coding Suggestion:**
- 🟦 Phase 0: Blue
- 🟩 Phase 1A: Green  
- 🟨 Phase 1B: Yellow
- 🟧 Phase 1C: Orange
- 🟥 Phase 1D: Red
- 🟪 Phase 1E: Purple
- ⚫ Post-MVP: Gray

