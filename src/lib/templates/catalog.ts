import type { TemplateDefinition, TemplateListItem } from "./types";

/**
 * Appo's starter catalogue.
 *
 * Sixty templates, each a genuinely different product shape — not one
 * layout renamed sixty times. Every entry carries the screens Appo will
 * build and the seed prompt it will build them from, so "Use this
 * template" produces something recognisably that product.
 *
 * Every entry also has a preview image, generated from its archetype and
 * accent by lib/templates/thumbnail.ts. Those previews are illustrative
 * wireframes of the layout the template produces — they are deliberately
 * NOT presented as screenshots of a finished app, because nobody has run
 * these yet and a fabricated screenshot would be a lie about the output.
 */

const T = (definition: TemplateDefinition): TemplateDefinition => definition;

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
  // ---------------------------------------------------------- AI
  T({
    slug: "ai-support-agent",
    name: "AI Support Agent",
    description:
      "A customer support desk where an AI agent answers from your own help articles, escalates what it cannot answer, and leaves a full transcript for the human who picks it up.",
    category: "ai",
    tags: ["ai", "support", "chat", "rag"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "chat",
    accent: "#A855F7",
    screens: ["Conversation inbox", "Chat thread", "Knowledge base", "Escalation queue", "Agent settings"],
    prompt:
      "Build a customer support platform where an AI agent answers questions from an uploaded knowledge base, with confidence scoring, automatic escalation to a human queue, conversation transcripts and per-agent settings.",
    featured: true,
    popularity: 96,
  }),
  T({
    slug: "ai-content-studio",
    name: "AI Content Studio",
    description:
      "A writing workspace for marketing teams: briefs in, drafts out, with tone presets, a revision history and an approval step before anything publishes.",
    category: "ai",
    tags: ["ai", "content", "marketing", "editor"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "editor",
    accent: "#8B5CF6",
    screens: ["Brief library", "Draft editor", "Tone presets", "Revision history", "Approval queue"],
    prompt:
      "Build a content production tool where a user writes a brief, generates a draft with selectable tone presets, edits it in a rich editor, and routes it through an approval step with full revision history.",
    featured: true,
    popularity: 91,
  }),
  T({
    slug: "ai-meeting-notes",
    name: "AI Meeting Notes",
    description:
      "Upload or record a meeting, get a structured summary, decisions and owned action items that sync to each attendee's task list.",
    category: "ai",
    tags: ["ai", "productivity", "meetings", "transcription"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#38BDF8",
    screens: ["Meeting list", "Transcript view", "Summary & decisions", "Action items", "Integrations"],
    prompt:
      "Build a meeting intelligence app that ingests a recording or transcript, produces a structured summary with decisions and action items, assigns owners, and lets attendees tick items off.",
    popularity: 84,
  }),
  T({
    slug: "ai-knowledge-base",
    name: "AI Knowledge Base",
    description:
      "An internal wiki that answers questions in plain language and cites the exact document and section it drew from.",
    category: "ai",
    tags: ["ai", "rag", "search", "internal-tools"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "list",
    accent: "#A855F7",
    screens: ["Search", "Answer with citations", "Document library", "Upload & indexing", "Access control"],
    prompt:
      "Build an internal knowledge base with semantic search over uploaded documents, plain-language answers that cite their source passages, an upload and indexing pipeline, and per-team access control.",
    popularity: 82,
  }),
  T({
    slug: "ai-sales-outreach",
    name: "AI Sales Outreach",
    description:
      "Research a prospect, draft a personalised sequence, and track replies — with a hard stop on sending anything a human has not approved.",
    category: "ai",
    tags: ["ai", "sales", "outreach", "crm"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "table",
    accent: "#22C55E",
    screens: ["Prospect list", "Research panel", "Sequence builder", "Approval queue", "Reply tracking"],
    prompt:
      "Build a sales outreach tool that researches prospects, drafts personalised multi-step email sequences, requires explicit human approval before any send, and tracks opens and replies.",
    isNew: true,
    popularity: 79,
  }),
  T({
    slug: "ai-image-workspace",
    name: "AI Image Workspace",
    description:
      "A prompt-to-image workspace with saved presets, a generation history and collections you can share with a client.",
    category: "ai",
    tags: ["ai", "images", "creative", "gallery"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "gallery",
    accent: "#D946EF",
    screens: ["Generate", "History", "Collections", "Presets", "Share link"],
    prompt:
      "Build an image generation workspace with a prompt composer, reusable style presets, a browsable generation history, shareable collections and per-image metadata.",
    popularity: 74,
  }),

  // ---------------------------------------------------------- SaaS
  T({
    slug: "saas-starter",
    name: "SaaS Starter",
    description:
      "The parts every SaaS needs before it needs anything else: auth, an organisation model, roles, subscription billing and a settings area.",
    category: "saas",
    tags: ["saas", "auth", "billing", "multi-tenant"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "dashboard",
    accent: "#7C5CFF",
    screens: ["Sign up & sign in", "Organisation switcher", "Team & roles", "Billing & plans", "Settings"],
    prompt:
      "Build a multi-tenant SaaS foundation with email and OAuth sign-in, organisations, role-based access control, subscription plans with usage limits, and an account settings area.",
    featured: true,
    popularity: 98,
  }),
  T({
    slug: "saas-usage-billing",
    name: "Usage-Based Billing",
    description:
      "Meter what customers actually consume, show them a live running total, and bill on it — with alerts before anyone gets a surprise.",
    category: "saas",
    tags: ["saas", "billing", "metering", "analytics"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "dashboard",
    accent: "#F59E0B",
    screens: ["Usage overview", "Meters", "Invoices", "Spend alerts", "Plan limits"],
    prompt:
      "Build a usage-based billing system that records metered events, shows customers a live running total against their plan, sends spend alerts at configurable thresholds, and generates invoices.",
    popularity: 71,
  }),
  T({
    slug: "saas-admin-console",
    name: "Internal Admin Console",
    description:
      "The back office your support team actually needs: find a customer, see their plan and usage, and fix things without a database client.",
    category: "saas",
    tags: ["saas", "admin", "internal-tools", "support"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "table",
    accent: "#5B7CFF",
    screens: ["Customer search", "Customer detail", "Subscription controls", "Impersonation log", "Audit trail"],
    prompt:
      "Build an internal admin console with customer search, a detail view showing plan, usage and recent activity, safe subscription overrides, and an audit trail of every admin action.",
    popularity: 68,
  }),
  T({
    slug: "saas-feature-flags",
    name: "Feature Flags",
    description:
      "Roll a feature out to 5% of accounts, watch it, and turn it off from your phone if it misbehaves.",
    category: "saas",
    tags: ["saas", "devtools", "experiments"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "list",
    accent: "#38BDF8",
    screens: ["Flag list", "Targeting rules", "Rollout percentage", "Change history", "SDK keys"],
    prompt:
      "Build a feature flag service with boolean and percentage rollouts, targeting rules by account attribute, a change history, and scoped SDK keys per environment.",
    popularity: 63,
  }),

  // ---------------------------------------------------------- E-commerce
  T({
    slug: "storefront",
    name: "Modern Storefront",
    description:
      "A fast product catalogue with variants, cart, checkout and order confirmation — the whole path from browsing to paid.",
    category: "ecommerce",
    tags: ["ecommerce", "shop", "checkout", "payments"],
    platforms: ["web", "ios", "android"],
    difficulty: "intermediate",
    archetype: "storefront",
    accent: "#22C55E",
    screens: ["Catalogue", "Product detail", "Cart", "Checkout", "Order confirmation"],
    prompt:
      "Build an online store with a filterable product catalogue, product variants and stock, a persistent cart, a checkout flow with address and payment steps, and order confirmation.",
    featured: true,
    popularity: 94,
  }),
  T({
    slug: "subscription-box",
    name: "Subscription Box",
    description:
      "Recurring physical orders: choose a plan, set a cadence, skip a month, and see exactly what is in the next box.",
    category: "ecommerce",
    tags: ["ecommerce", "subscription", "recurring"],
    platforms: ["web", "ios"],
    difficulty: "intermediate",
    archetype: "storefront",
    accent: "#F59E0B",
    screens: ["Plan picker", "Box preview", "Delivery schedule", "Skip or pause", "Billing history"],
    prompt:
      "Build a subscription box service where customers pick a plan and cadence, preview the upcoming box, skip or pause deliveries, and manage recurring billing.",
    popularity: 66,
  }),
  T({
    slug: "digital-downloads",
    name: "Digital Downloads",
    description:
      "Sell files without giving them away: time-limited signed links, per-order download limits and a licence key per purchase.",
    category: "ecommerce",
    tags: ["ecommerce", "digital", "downloads", "licensing"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#7C5CFF",
    screens: ["Product list", "Checkout", "Download library", "Licence keys", "Sales dashboard"],
    prompt:
      "Build a digital product store that sells downloadable files with expiring signed download links, per-order download limits, generated licence keys and a seller sales dashboard.",
    popularity: 61,
  }),
  T({
    slug: "pos-terminal",
    name: "Point of Sale",
    description:
      "A counter-side till: tap items, split a bill, take payment and reconcile the drawer at close.",
    category: "pos",
    tags: ["pos", "retail", "payments", "offline"],
    platforms: ["ios", "android"],
    difficulty: "advanced",
    archetype: "storefront",
    accent: "#22C55E",
    screens: ["Till", "Item grid", "Split bill", "Payment", "End-of-day report"],
    prompt:
      "Build a point-of-sale app with a fast item grid, cart with discounts, bill splitting, card and cash payment capture, and an end-of-day reconciliation report.",
    popularity: 58,
  }),
  T({
    slug: "inventory-manager",
    name: "Inventory Manager",
    description:
      "Know what you have, where it is and when to reorder — with stock movements you can actually trace.",
    category: "inventory",
    tags: ["inventory", "stock", "warehouse", "operations"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "table",
    accent: "#5B7CFF",
    screens: ["Stock list", "Item detail", "Stock movements", "Reorder alerts", "Suppliers"],
    prompt:
      "Build an inventory management app with per-location stock levels, traceable stock movements, low-stock reorder alerts, supplier records and a purchase order flow.",
    popularity: 64,
  }),

  // ---------------------------------------------------------- Fitness & health
  T({
    slug: "workout-tracker",
    name: "Workout Tracker",
    description:
      "Log sets and reps in the gym without fighting the interface, then see whether you are actually getting stronger.",
    category: "fitness",
    tags: ["fitness", "tracking", "health", "charts"],
    platforms: ["ios", "android"],
    difficulty: "starter",
    archetype: "list",
    accent: "#22C55E",
    screens: ["Today's workout", "Exercise logger", "Routine builder", "Progress charts", "History"],
    prompt:
      "Build a workout tracking app with routine templates, a fast in-session set and rep logger, rest timers, personal-record detection and progress charts over time.",
    featured: true,
    popularity: 89,
  }),
  T({
    slug: "habit-tracker",
    name: "Habit Tracker",
    description:
      "Small daily commitments, a streak that is honest about misses, and a month view you can read at a glance.",
    category: "fitness",
    tags: ["habits", "productivity", "streaks"],
    platforms: ["ios", "android"],
    difficulty: "starter",
    archetype: "calendar",
    accent: "#38BDF8",
    screens: ["Today", "Habit detail", "Month view", "Streaks", "Reminders"],
    prompt:
      "Build a habit tracking app with daily check-ins, streak counting that handles missed days honestly, a month heat-map view and configurable reminders.",
    popularity: 81,
  }),
  T({
    slug: "meal-planner",
    name: "Meal Planner",
    description:
      "Plan the week, get the shopping list generated from it, and stop buying three jars of the same thing.",
    category: "fitness",
    tags: ["food", "planning", "health", "shopping"],
    platforms: ["ios", "android", "web"],
    difficulty: "intermediate",
    archetype: "calendar",
    accent: "#F59E0B",
    screens: ["Week planner", "Recipe library", "Recipe detail", "Shopping list", "Nutrition summary"],
    prompt:
      "Build a meal planning app with a weekly calendar, a recipe library with ingredients and steps, an automatically consolidated shopping list, and a nutrition summary per day.",
    popularity: 70,
  }),
  T({
    slug: "meditation-app",
    name: "Meditation & Sleep",
    description:
      "Guided sessions, a player that behaves when the screen locks, and a streak that encourages rather than nags.",
    category: "fitness",
    tags: ["wellbeing", "audio", "mindfulness"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "player",
    accent: "#A855F7",
    screens: ["Browse", "Session player", "Downloads", "Streaks", "Sleep timer"],
    prompt:
      "Build a meditation app with categorised guided sessions, a background audio player with lock-screen controls, offline downloads, a sleep timer and gentle streak tracking.",
    popularity: 62,
  }),
  T({
    slug: "clinic-appointments",
    name: "Clinic Appointments",
    description:
      "Patient-facing booking with practitioner availability, reminders and a pre-visit questionnaire.",
    category: "healthcare",
    tags: ["healthcare", "booking", "appointments", "forms"],
    platforms: ["web", "ios"],
    difficulty: "advanced",
    archetype: "calendar",
    accent: "#38BDF8",
    screens: ["Find a practitioner", "Availability", "Booking confirmation", "Pre-visit form", "Appointment history"],
    prompt:
      "Build a clinic booking app with practitioner profiles and availability, slot booking with confirmation, automated reminders, a pre-visit questionnaire and appointment history.",
    popularity: 67,
  }),
  T({
    slug: "symptom-journal",
    name: "Symptom Journal",
    description:
      "A private daily log of symptoms, triggers and medication, exportable as a PDF to take to an appointment.",
    category: "healthcare",
    tags: ["healthcare", "journal", "tracking", "privacy"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#EF4444",
    screens: ["Daily entry", "Symptom timeline", "Triggers", "Medication log", "Export report"],
    prompt:
      "Build a private health journal for logging daily symptoms, severity, triggers and medication, with a timeline view, correlation hints and a PDF export to share with a clinician.",
    popularity: 54,
  }),

  // ---------------------------------------------------------- Education
  T({
    slug: "lms-course-platform",
    name: "Course Platform",
    description:
      "Sell and deliver a course: modules, lessons, progress that survives a refresh, and a certificate at the end.",
    category: "lms",
    tags: ["education", "lms", "video", "certificates"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "player",
    accent: "#7C5CFF",
    screens: ["Course catalogue", "Lesson player", "Progress tracker", "Quizzes", "Certificate"],
    prompt:
      "Build a course platform with a catalogue, enrolment and payment, a video lesson player with resumable progress, quizzes with grading, and a completion certificate.",
    featured: true,
    popularity: 87,
  }),
  T({
    slug: "flashcards",
    name: "Spaced Repetition Flashcards",
    description:
      "Decks, a review queue driven by a real spacing algorithm, and statistics that show what you keep forgetting.",
    category: "education",
    tags: ["education", "study", "spaced-repetition"],
    platforms: ["ios", "android", "web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#A855F7",
    screens: ["Deck list", "Review session", "Card editor", "Statistics", "Import & export"],
    prompt:
      "Build a flashcard app with decks, a spaced-repetition review queue, card creation with images, retention statistics, and deck import/export.",
    popularity: 72,
  }),
  T({
    slug: "school-portal",
    name: "School Portal",
    description:
      "One place for timetables, assignments and grades, with the right view for students, teachers and parents.",
    category: "education",
    tags: ["education", "school", "roles", "grades"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "dashboard",
    accent: "#5B7CFF",
    screens: ["Timetable", "Assignments", "Grade book", "Announcements", "Parent view"],
    prompt:
      "Build a school portal with role-based views for students, teachers and parents, covering timetables, assignment submission, a grade book and school announcements.",
    popularity: 59,
  }),
  T({
    slug: "language-tutor",
    name: "Language Practice",
    description:
      "Short daily lessons, spoken practice with instant feedback, and a level that moves with you.",
    category: "education",
    tags: ["education", "language", "ai", "audio"],
    platforms: ["ios", "android"],
    difficulty: "advanced",
    archetype: "chat",
    accent: "#22C55E",
    screens: ["Daily lesson", "Conversation practice", "Vocabulary", "Progress", "Level test"],
    prompt:
      "Build a language learning app with short daily lessons, an AI conversation partner giving corrective feedback, a spaced vocabulary review and adaptive level placement.",
    isNew: true,
    popularity: 76,
  }),

  // ---------------------------------------------------------- Finance
  T({
    slug: "expense-tracker",
    name: "Expense Tracker",
    description:
      "Where the money went, by category, with receipts attached and a budget that warns you before you blow it.",
    category: "finance",
    tags: ["finance", "budget", "expenses", "charts"],
    platforms: ["ios", "android", "web"],
    difficulty: "starter",
    archetype: "dashboard",
    accent: "#22C55E",
    screens: ["Overview", "Add expense", "Categories", "Budgets", "Monthly report"],
    prompt:
      "Build a personal finance app with quick expense entry, receipt photo attachment, category budgets with threshold warnings, and a monthly spending report with charts.",
    featured: true,
    popularity: 88,
  }),
  T({
    slug: "invoice-generator",
    name: "Invoicing for Freelancers",
    description:
      "Create an invoice in under a minute, send it, and see at a glance who has not paid.",
    category: "finance",
    tags: ["finance", "invoicing", "freelance", "pdf"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "table",
    accent: "#F59E0B",
    screens: ["Invoice list", "Invoice editor", "Client book", "Payment status", "Tax summary"],
    prompt:
      "Build an invoicing app for freelancers with reusable client records, line-item invoices, PDF generation, payment status tracking, overdue reminders and a tax summary.",
    popularity: 77,
  }),
  T({
    slug: "split-expenses",
    name: "Split Expenses",
    description:
      "Shared costs between friends, settled with the fewest possible transfers.",
    category: "finance",
    tags: ["finance", "social", "groups", "settlement"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#38BDF8",
    screens: ["Groups", "Add expense", "Balances", "Settle up", "Activity"],
    prompt:
      "Build a shared expense app where groups log costs with uneven splits, see who owes whom, and settle up with a minimised set of transfers.",
    popularity: 69,
  }),
  T({
    slug: "portfolio-tracker",
    name: "Investment Tracker",
    description:
      "Holdings, cost basis and realised versus unrealised gains — without pretending to give advice.",
    category: "finance",
    tags: ["finance", "investing", "charts", "portfolio"],
    platforms: ["web", "ios"],
    difficulty: "advanced",
    archetype: "dashboard",
    accent: "#7C5CFF",
    screens: ["Portfolio overview", "Holding detail", "Transactions", "Allocation", "Performance"],
    prompt:
      "Build an investment portfolio tracker with manual and imported transactions, cost-basis calculation, realised and unrealised gain reporting, allocation breakdown and performance charts.",
    popularity: 60,
  }),

  // ---------------------------------------------------------- Food & booking
  T({
    slug: "restaurant-ordering",
    name: "Restaurant Ordering",
    description:
      "Scan the table code, browse the menu, order and pay — no app install, no waiting to catch someone's eye.",
    category: "restaurant",
    tags: ["restaurant", "ordering", "qr", "payments"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "storefront",
    accent: "#F59E0B",
    screens: ["Table scan", "Menu", "Order", "Payment", "Kitchen display"],
    prompt:
      "Build a QR-based restaurant ordering system with per-table sessions, a categorised menu with modifiers, order submission to a kitchen display, and split payment at the table.",
    featured: true,
    popularity: 83,
  }),
  T({
    slug: "reservations",
    name: "Table Reservations",
    description:
      "Seat the room properly: real capacity, a waitlist that moves, and reminders that cut no-shows.",
    category: "booking",
    tags: ["booking", "restaurant", "calendar", "reminders"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "calendar",
    accent: "#EF4444",
    screens: ["Availability", "Booking form", "Floor plan", "Waitlist", "Guest history"],
    prompt:
      "Build a restaurant reservation system with real table capacity, a booking flow with confirmation, a floor plan view, a waitlist and guest history with no-show tracking.",
    popularity: 65,
  }),
  T({
    slug: "appointment-scheduler",
    name: "Appointment Scheduler",
    description:
      "Publish your availability, let people book it, and never double-book across two calendars again.",
    category: "booking",
    tags: ["booking", "calendar", "scheduling", "reminders"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "calendar",
    accent: "#7C5CFF",
    screens: ["Availability rules", "Public booking page", "Upcoming", "Reschedule", "Notifications"],
    prompt:
      "Build an appointment scheduling app with configurable availability rules, buffer times, a public booking page, timezone-correct slots, rescheduling and reminder notifications.",
    popularity: 80,
  }),
  T({
    slug: "food-delivery",
    name: "Food Delivery",
    description:
      "Order, track the rider on a map, and know when it is actually arriving.",
    category: "delivery",
    tags: ["delivery", "maps", "tracking", "orders"],
    platforms: ["ios", "android"],
    difficulty: "advanced",
    archetype: "map",
    accent: "#22C55E",
    screens: ["Restaurant list", "Menu", "Cart & checkout", "Live tracking", "Order history"],
    prompt:
      "Build a food delivery app with restaurant discovery, menus with modifiers, checkout, live courier tracking on a map with ETA updates, and order history.",
    popularity: 73,
  }),

  // ---------------------------------------------------------- Travel & maps
  T({
    slug: "trip-planner",
    name: "Trip Planner",
    description:
      "A day-by-day itinerary with bookings attached, that works when you land somewhere with no signal.",
    category: "travel",
    tags: ["travel", "itinerary", "offline", "maps"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "calendar",
    accent: "#38BDF8",
    screens: ["Trips", "Day itinerary", "Bookings", "Map", "Offline mode"],
    prompt:
      "Build a travel planning app with multi-day itineraries, attached booking confirmations, a map of each day's stops, packing lists and offline access to the whole trip.",
    popularity: 68,
  }),
  T({
    slug: "city-guide",
    name: "City Guide",
    description:
      "Curated places on a map, filtered by what you actually feel like doing right now.",
    category: "travel",
    tags: ["travel", "maps", "discovery", "local"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "map",
    accent: "#A855F7",
    screens: ["Map", "Place detail", "Curated lists", "Saved places", "Nearby now"],
    prompt:
      "Build a city guide app with a map of curated places, rich place detail pages, themed lists, saved favourites and a 'near me right now' filter.",
    popularity: 55,
  }),
  T({
    slug: "property-listings",
    name: "Property Listings",
    description:
      "Search by what matters — commute, not just postcode — and book a viewing without a phone call.",
    category: "realestate",
    tags: ["realestate", "search", "maps", "gallery"],
    platforms: ["web", "ios"],
    difficulty: "advanced",
    archetype: "map",
    accent: "#5B7CFF",
    screens: ["Search & filters", "Map results", "Listing detail", "Saved searches", "Book a viewing"],
    prompt:
      "Build a property listing platform with map and list search, rich filters, photo galleries, saved searches with alerts, and viewing appointment booking.",
    popularity: 71,
  }),
  T({
    slug: "fleet-tracking",
    name: "Fleet Tracking",
    description:
      "Where every vehicle is, what it is doing, and which one is due a service.",
    category: "logistics",
    tags: ["logistics", "fleet", "maps", "operations"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "map",
    accent: "#F59E0B",
    screens: ["Live map", "Vehicle detail", "Route history", "Maintenance", "Driver assignments"],
    prompt:
      "Build a fleet management dashboard with live vehicle positions on a map, route history playback, maintenance schedules with due alerts, and driver assignment.",
    popularity: 52,
  }),

  // ---------------------------------------------------------- Social & community
  T({
    slug: "photo-feed",
    name: "Photo Feed",
    description:
      "Post, follow, comment — a social core that stays fast as the feed gets long.",
    category: "social",
    tags: ["social", "feed", "images", "follow"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "feed",
    accent: "#D946EF",
    screens: ["Feed", "Post detail", "Create post", "Profile", "Notifications"],
    prompt:
      "Build a photo sharing app with an infinite feed, image upload with captions, follows, likes and threaded comments, profiles and a notification inbox.",
    popularity: 78,
  }),
  T({
    slug: "community-forum",
    name: "Community Forum",
    description:
      "Threaded discussion with moderation that works before a problem becomes a fire.",
    category: "community",
    tags: ["community", "forum", "moderation", "threads"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#7C5CFF",
    screens: ["Categories", "Thread list", "Thread view", "Moderation queue", "Member profiles"],
    prompt:
      "Build a discussion forum with categories, threaded replies, voting, a report and moderation queue, member reputation and profile pages.",
    popularity: 64,
  }),
  T({
    slug: "group-chat",
    name: "Group Messaging",
    description:
      "Real-time channels and direct messages, with read state that is actually correct.",
    category: "social",
    tags: ["chat", "realtime", "messaging", "presence"],
    platforms: ["ios", "android", "web"],
    difficulty: "advanced",
    archetype: "chat",
    accent: "#38BDF8",
    screens: ["Channel list", "Conversation", "Direct messages", "Members & presence", "Search"],
    prompt:
      "Build a real-time messaging app with channels and direct messages, typing indicators, presence, read receipts, file attachments and message search.",
    popularity: 75,
  }),
  T({
    slug: "event-platform",
    name: "Event Platform",
    description:
      "Publish an event, sell tickets, scan people in at the door.",
    category: "events",
    tags: ["events", "ticketing", "qr", "payments"],
    platforms: ["web", "ios"],
    difficulty: "advanced",
    archetype: "storefront",
    accent: "#A855F7",
    screens: ["Event listing", "Event detail", "Ticket checkout", "My tickets", "Door scanner"],
    prompt:
      "Build an event ticketing platform with event pages, tiered ticket types with capacity, checkout, QR tickets in a wallet view and a door-scanning check-in tool.",
    popularity: 70,
  }),
  T({
    slug: "creator-membership",
    name: "Creator Memberships",
    description:
      "Paid tiers, members-only posts, and a straight answer on what you earned this month.",
    category: "creator",
    tags: ["creator", "membership", "subscription", "content"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "feed",
    accent: "#D946EF",
    screens: ["Public page", "Membership tiers", "Members-only feed", "Earnings", "Member list"],
    prompt:
      "Build a creator membership platform with public and members-only posts, paid subscription tiers, member management, and an earnings dashboard.",
    isNew: true,
    popularity: 66,
  }),

  // ---------------------------------------------------------- Productivity & work
  T({
    slug: "task-manager",
    name: "Task Manager",
    description:
      "Projects, tasks, due dates and a today view that does not lie to you.",
    category: "productivity",
    tags: ["productivity", "tasks", "projects"],
    platforms: ["web", "ios", "android"],
    difficulty: "starter",
    archetype: "list",
    accent: "#7C5CFF",
    screens: ["Today", "Projects", "Task detail", "Upcoming", "Completed"],
    prompt:
      "Build a task management app with projects, sub-tasks, due dates, priorities, a today view, recurring tasks and a completed archive.",
    featured: true,
    popularity: 92,
  }),
  T({
    slug: "kanban-board",
    name: "Kanban Board",
    description:
      "Drag work across columns, with WIP limits that stop a board becoming a wish list.",
    category: "project",
    tags: ["project", "kanban", "agile", "collaboration"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "kanban",
    accent: "#5B7CFF",
    screens: ["Board", "Card detail", "Backlog", "Filters", "Activity"],
    prompt:
      "Build a kanban project board with draggable cards, custom columns with WIP limits, card detail with checklists and attachments, filters and an activity log.",
    popularity: 85,
  }),
  T({
    slug: "docs-workspace",
    name: "Docs Workspace",
    description:
      "Nested documents with real-time collaborative editing and a history you can roll back.",
    category: "productivity",
    tags: ["docs", "editor", "collaboration", "realtime"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "editor",
    accent: "#A855F7",
    screens: ["Document tree", "Editor", "Comments", "Version history", "Sharing"],
    prompt:
      "Build a collaborative document workspace with a nested page tree, a rich-text editor with real-time co-editing, inline comments, version history and granular sharing.",
    popularity: 79,
  }),
  T({
    slug: "time-tracking",
    name: "Time Tracking",
    description:
      "Start a timer, tag it to a client, and get a timesheet that turns straight into an invoice.",
    category: "productivity",
    tags: ["time", "billing", "freelance", "reports"],
    platforms: ["web", "ios"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#F59E0B",
    screens: ["Timer", "Timesheet", "Projects & rates", "Reports", "Invoice export"],
    prompt:
      "Build a time tracking app with a running timer, manual entry, per-project billable rates, weekly timesheets, reporting by client and export to an invoice.",
    popularity: 67,
  }),
  T({
    slug: "note-taking",
    name: "Notes & Highlights",
    description:
      "Capture quickly, find it later — full-text search, tags and backlinks between notes.",
    category: "productivity",
    tags: ["notes", "search", "tags", "offline"],
    platforms: ["ios", "android", "web"],
    difficulty: "intermediate",
    archetype: "editor",
    accent: "#38BDF8",
    screens: ["All notes", "Note editor", "Search", "Tags", "Backlinks"],
    prompt:
      "Build a note-taking app with fast capture, markdown editing, full-text search, tagging, backlinks between notes and offline-first sync.",
    popularity: 74,
  }),
  T({
    slug: "form-builder",
    name: "Form Builder",
    description:
      "Build a form by dragging fields, share the link, and read the responses as a table or a chart.",
    category: "productivity",
    tags: ["forms", "surveys", "no-code", "analytics"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "form",
    accent: "#22C55E",
    screens: ["Form list", "Builder", "Logic rules", "Public form", "Responses"],
    prompt:
      "Build a form builder with drag-and-drop fields, conditional logic, a public responsive form page, response storage and a results view with tables and charts.",
    popularity: 72,
  }),

  // ---------------------------------------------------------- Business systems
  T({
    slug: "crm-pipeline",
    name: "Sales CRM",
    description:
      "Contacts, deals and a pipeline you can drag — plus the activity history that explains why a deal stalled.",
    category: "crm",
    tags: ["crm", "sales", "pipeline", "contacts"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "kanban",
    accent: "#5B7CFF",
    screens: ["Pipeline", "Deal detail", "Contacts", "Activity timeline", "Forecast"],
    prompt:
      "Build a sales CRM with a draggable deal pipeline, contact and company records, an activity timeline of calls and emails, task reminders and a weighted forecast.",
    featured: true,
    popularity: 86,
  }),
  T({
    slug: "helpdesk",
    name: "Support Helpdesk",
    description:
      "Tickets with a real SLA clock, assignment rules, and canned replies for the questions you answer daily.",
    category: "support",
    tags: ["support", "tickets", "sla", "inbox"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "list",
    accent: "#38BDF8",
    screens: ["Ticket inbox", "Ticket detail", "Assignment rules", "Canned replies", "SLA report"],
    prompt:
      "Build a support helpdesk with a shared ticket inbox, statuses and priorities, SLA timers with breach warnings, assignment rules, canned replies and a performance report.",
    popularity: 69,
  }),
  T({
    slug: "hr-onboarding",
    name: "Employee Onboarding",
    description:
      "Everything a new starter needs in week one, tracked so nothing is quietly skipped.",
    category: "hr",
    tags: ["hr", "onboarding", "checklists", "documents"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#22C55E",
    screens: ["New starters", "Onboarding checklist", "Document signing", "Equipment", "Progress report"],
    prompt:
      "Build an employee onboarding system with per-role checklists, document collection and signing, equipment assignment, buddy allocation and a completion report for HR.",
    popularity: 57,
  }),
  T({
    slug: "applicant-tracking",
    name: "Applicant Tracking",
    description:
      "Roles, candidates and interview stages — with scorecards so hiring decisions are comparable.",
    category: "hr",
    tags: ["hr", "hiring", "pipeline", "interviews"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "kanban",
    accent: "#7C5CFF",
    screens: ["Open roles", "Candidate pipeline", "Candidate profile", "Interview scorecards", "Offer stage"],
    prompt:
      "Build an applicant tracking system with job postings, a candidate pipeline by stage, CV storage, structured interview scorecards and an offer approval flow.",
    popularity: 61,
  }),
  T({
    slug: "job-board",
    name: "Job Board",
    description:
      "A niche board: employers post, candidates search and apply, and applications land somewhere useful.",
    category: "jobs",
    tags: ["jobs", "marketplace", "search", "applications"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#5B7CFF",
    screens: ["Job search", "Job detail", "Apply", "Employer dashboard", "Application inbox"],
    prompt:
      "Build a niche job board with employer job posting and payment, candidate search with filters, one-click apply with CV upload, and an employer application inbox.",
    popularity: 63,
  }),
  T({
    slug: "service-marketplace",
    name: "Service Marketplace",
    description:
      "Two-sided: providers list services, customers book and pay, and the platform takes its cut.",
    category: "marketplace",
    tags: ["marketplace", "two-sided", "booking", "payouts"],
    platforms: ["web", "ios"],
    difficulty: "advanced",
    archetype: "storefront",
    accent: "#A855F7",
    screens: ["Browse services", "Provider profile", "Booking & payment", "Provider dashboard", "Payouts"],
    prompt:
      "Build a two-sided service marketplace with provider profiles and service listings, availability-based booking, escrowed payment with commission, reviews and provider payouts.",
    popularity: 76,
  }),

  // ---------------------------------------------------------- Content & media
  T({
    slug: "blog-platform",
    name: "Blog Platform",
    description:
      "Write, schedule, publish — with the SEO metadata filled in rather than forgotten.",
    category: "blog",
    tags: ["blog", "cms", "seo", "editor"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "editor",
    accent: "#7C5CFF",
    screens: ["Post list", "Editor", "SEO & metadata", "Scheduling", "Public blog"],
    prompt:
      "Build a blogging platform with a markdown editor, draft and scheduled publishing, tags and categories, SEO metadata and OG images, and a fast public blog with RSS.",
    popularity: 73,
  }),
  T({
    slug: "podcast-app",
    name: "Podcast Player",
    description:
      "Subscribe, download for the commute, and keep your place across devices.",
    category: "media",
    tags: ["media", "audio", "podcast", "offline"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "player",
    accent: "#D946EF",
    screens: ["Discover", "Show detail", "Player", "Downloads", "Queue"],
    prompt:
      "Build a podcast app with RSS subscription, an episode queue, a background player with speed control and sleep timer, offline downloads and cross-device playback position.",
    popularity: 62,
  }),
  T({
    slug: "video-library",
    name: "Video Library",
    description:
      "A private video catalogue with collections, resume-where-you-left-off and access control.",
    category: "media",
    tags: ["media", "video", "streaming", "access-control"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "gallery",
    accent: "#EF4444",
    screens: ["Library", "Video detail", "Player", "Collections", "Access control"],
    prompt:
      "Build a private video library with upload and transcoding hand-off, collections, a player with resumable progress and captions, and per-collection access control.",
    popularity: 56,
  }),
  T({
    slug: "news-reader",
    name: "News Reader",
    description:
      "Your sources in one place, grouped by topic, readable offline.",
    category: "media",
    tags: ["news", "rss", "reader", "offline"],
    platforms: ["ios", "android"],
    difficulty: "intermediate",
    archetype: "feed",
    accent: "#38BDF8",
    screens: ["Timeline", "Article reader", "Sources", "Topics", "Saved"],
    prompt:
      "Build a news reader with RSS and API sources, a topic-grouped timeline, a distraction-free article view, offline caching and a read-later list.",
    popularity: 58,
  }),
  T({
    slug: "portfolio-site",
    name: "Portfolio Site",
    description:
      "Case studies that show the work properly, with a contact form that actually reaches you.",
    category: "portfolio",
    tags: ["portfolio", "landing", "case-studies", "seo"],
    platforms: ["web"],
    difficulty: "starter",
    archetype: "landing",
    accent: "#A855F7",
    screens: ["Home", "Work index", "Case study", "About", "Contact"],
    prompt:
      "Build a personal portfolio site with a hero, a filterable work index, detailed case study pages with image galleries, an about page and a working contact form.",
    popularity: 81,
  }),
  T({
    slug: "product-landing",
    name: "Product Landing Page",
    description:
      "A conversion-focused launch page: clear value, proof, pricing, FAQ, one obvious action.",
    category: "landing",
    tags: ["landing", "marketing", "conversion", "pricing"],
    platforms: ["web"],
    difficulty: "starter",
    archetype: "landing",
    accent: "#7C5CFF",
    screens: ["Hero", "Features", "Pricing", "FAQ", "Sign-up"],
    prompt:
      "Build a product landing page with a hero and primary call to action, feature sections, a pricing table with a plan comparison, an FAQ accordion and an email capture form.",
    featured: true,
    popularity: 90,
  }),

  // ---------------------------------------------------------- Analytics & data
  T({
    slug: "analytics-dashboard",
    name: "Analytics Dashboard",
    description:
      "The numbers that matter, over the period you choose, without a chart library fighting you.",
    category: "analytics",
    tags: ["analytics", "charts", "reporting", "dashboard"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "dashboard",
    accent: "#38BDF8",
    screens: ["Overview", "Metric detail", "Segments", "Date comparison", "Scheduled reports"],
    prompt:
      "Build an analytics dashboard with headline metrics, time-series charts with period comparison, segment filters, drill-down detail views and scheduled email reports.",
    popularity: 82,
  }),
  T({
    slug: "survey-insights",
    name: "Survey & Insights",
    description:
      "Run a survey and read the result — including the free-text answers, grouped by theme.",
    category: "analytics",
    tags: ["surveys", "research", "nlp", "charts"],
    platforms: ["web"],
    difficulty: "advanced",
    archetype: "form",
    accent: "#A855F7",
    screens: ["Survey builder", "Distribution", "Responses", "Theme analysis", "Report"],
    prompt:
      "Build a survey platform with a question builder, distribution links, response collection, quantitative charts, thematic grouping of free-text answers and an exportable report.",
    popularity: 59,
  }),
  T({
    slug: "status-page",
    name: "Status Page",
    description:
      "Tell customers what is broken before they tell you — components, incidents and uptime history.",
    category: "saas",
    tags: ["status", "incidents", "uptime", "trust"],
    platforms: ["web"],
    difficulty: "intermediate",
    archetype: "list",
    accent: "#22C55E",
    screens: ["Public status", "Incident detail", "Component management", "Subscriber notifications", "Uptime history"],
    prompt:
      "Build a public status page with per-component status, incident creation with timeline updates, email and webhook subscriber notifications, and 90-day uptime history.",
    isNew: true,
    popularity: 60,
  }),
  T({
    slug: "changelog-app",
    name: "Product Changelog",
    description:
      "Ship notes your users will actually read, with an in-app widget that stops nagging once they have.",
    category: "saas",
    tags: ["changelog", "release-notes", "widget", "product"],
    platforms: ["web"],
    difficulty: "starter",
    archetype: "feed",
    accent: "#7C5CFF",
    screens: ["Changelog feed", "Entry editor", "Categories", "In-app widget", "Subscribers"],
    prompt:
      "Build a product changelog with a public feed, categorised entries, a markdown editor, an embeddable in-app widget with unread state, and email subscribers.",
    popularity: 53,
  }),
];

/**
 * Slug collisions would silently shadow a template in every lookup, and
 * the catalogue is edited by hand — so this is checked at module load
 * rather than left to a code review to catch.
 */
const seenSlugs = new Set<string>();
for (const template of TEMPLATE_CATALOG) {
  if (seenSlugs.has(template.slug)) {
    throw new Error(`Duplicate template slug in catalog: ${template.slug}`);
  }
  seenSlugs.add(template.slug);
}

export function thumbnailPathFor(slug: string): string {
  return `/api/templates/${slug}/thumbnail`;
}

export function toListItem(template: TemplateDefinition): TemplateListItem {
  return { ...template, thumbnail: thumbnailPathFor(template.slug), source: "appo" };
}

export function getTemplateBySlug(slug: string): TemplateDefinition | undefined {
  return TEMPLATE_CATALOG.find((template) => template.slug === slug);
}

/** Categories that actually have templates, in catalogue order. */
export function availableCategories(): string[] {
  const seen = new Set<string>();
  for (const template of TEMPLATE_CATALOG) seen.add(template.category);
  return [...seen];
}

export function allTags(): string[] {
  const counts = new Map<string, number>();
  for (const template of TEMPLATE_CATALOG) {
    for (const tag of template.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
}
