# Film Expo India

## Local setup

Requirements: Node.js 20+, pnpm, and MySQL 8.

1. Create a local `.env.local` from `.env.local.example`.
2. Set `DATABASE_URL` to a MySQL account that can create/read/write tables in the `film` database.
3. Set a random `SESSION_SECRET` of at least 32 characters.
4. Initialize the CMS tables and starter homepage content:

   ```powershell
   corepack pnpm db:init
   ```

5. Generate and register the original, illustrated homepage artwork:

   ```powershell
   corepack pnpm artwork:generate
   corepack pnpm artwork:seed
   ```

   This updates homepage image paths and artwork metadata in MySQL while keeping the SVG files in `public/film-expo-art`. It preserves existing editorial copy while labeling generated speaker portraits, partner concepts, and gallery art as illustrative placeholders.

6. Start the app:

   ```powershell
   corepack pnpm dev
   ```

The site is available at `http://localhost:3000`; the CMS is at `http://localhost:3000/superadmin`. On the first local development visit, use the one-time setup form to create the primary admin account. For first-time production setup, configure a separate random `SUPERADMIN_SETUP_TOKEN` of at least 32 characters and enter it in the setup form. Passwords are stored in MySQL as salted scrypt hashes; they are never stored in plaintext.

The primary admin can create individual sub-admin accounts and grant Read/Edit permissions separately for site content, media, gallery, blog, exhibitor enquiries, and registrations/subscribers. Permissions are enforced by the API as well as the CMS interface. Re-run `corepack pnpm db:init` after upgrading to create the admin account and permission tables.

## Homepage CMS and media

Each homepage section is stored as a separate JSON record in the MySQL `site_sections` table. The homepage About profile, impact metrics, upcoming event schedule, exhibitor content, hero registration dialog, navigation, gallery, partners, and footer are all editable in `/superadmin`. Upcoming events can be added or removed in the visual editor, including their dates, venue, image and registration link. The **Past events** editor lets admins upload an MP4/WebM clip and a poster image for each event, preview the clip, and save it to the scrolling homepage strip; video uploads are limited to 50 MB, and sub-admins need Media Edit permission to upload. Uploaded file metadata and public paths are stored in `media_assets`; image fields can upload and select a file directly. Superadmin can update text, links, images/videos and lists, and show or hide page sections; an advanced JSON editor is also available. Re-run `corepack pnpm db:init` after upgrading to add new section defaults and missing fields without replacing saved editorial content.

The About page is available at `/about`. Its hero, story, profile, impact figures, event cards, gallery filters and images, and closing call-to-action are editable as the **About page** section in `/superadmin`. Shared branding, navigation and footer content are edited in their corresponding site sections. Run `corepack pnpm db:init` once after upgrading to seed the About page section without replacing existing customized sections.

The Exhibitors experience is a separate page at `/exhibitors`; the homepage keeps its own content and links to it from the navigation and exhibit feature. The exhibitor hero, ecosystem cards, 2026 impact figures, 2027 edition information, guest-of-honour portraits, international delegations, benefits and enquiry form copy are managed in the **Reasons to exhibit** section in `/superadmin`. Benefits and the enquiry form have their own page anchors (`/exhibitors#benefits` and `/exhibitors#form`). Enquiry form submissions are stored in MySQL and listed in the Superadmin panel.

The Conference Programme page is available at `/conferences` and is managed through the **Conference programme** section in `/superadmin`. It follows the homepage header, navigation, registration dialog, footer and navy/gold motion theme, with 3D session-image and promo-card effects. Superadmin can edit the hero, metrics, day tabs, tracks, sessions, speakers, images, calls to action and promotional cards, and add or remove list items without code changes. Starter schedule and speaker details are sample content; confirm them in Superadmin before publishing.

Images uploaded through the CMS are validated, resized to a maximum of 2400 × 2400 pixels, and converted to WebP. MP4/WebM uploads are capped at 50 MB and are not transcoded. Files are stored under `storage/uploads` and served by the local media route.

Homepage and public content pages share one persistent cached site-content query, so requests reuse the same MySQL result instead of fetching every section for each visitor. Public routes are revalidated periodically, and Superadmin saves invalidate the content cache. Local images are served through Next.js responsive AVIF/WebP optimization and load lazily below the hero. For production or multiple app servers, move uploads to durable object storage/CDN and use a restricted MySQL account instead of a database root account. Local `storage/uploads` files are not durable storage on serverless hosts.

The public site currently has a local Film Expo India 2026 media snapshot captured from `https://filmexpoindia.com/`: 61 partner/participant logos and 136 gallery photos, converted to responsive-friendly WebP and stored under `public/filmexpo-live`. `lib/filmexpo-live-media.json` records their local paths and original source URLs; the import input is `scripts/filmexpo-source-media-manifest.json`. Re-run `corepack pnpm media:import:filmexpo` to rebuild these assets from the official source. The page imports them locally and does not fetch those images from the source site at runtime. The official homepage and gallery did not expose an embedded event video during this import; the snapshot records the official YouTube channel link rather than copying an unrelated video. Importing this snapshot into MySQL remains a separate future step.

The starter homepage uses original, locally generated SVG illustrations, including a CSS-animated hero scene. This is an animated image, not a generated MP4; the imported 2026 gallery photos and partner logos come from the official Film Expo India website. Speaker portraits remain illustrative placeholders and should be replaced with approved speaker portraits before publishing them as real people. Upload a licensed video through the superadmin media library if a real video trailer is needed.

Homepage sections use staggered, reversible 3D scroll reveals from the navigation through the footer. These motions honor the visitor's reduced-motion accessibility preference.

## Verification and production launch

Run `corepack pnpm typecheck` and `corepack pnpm test` before publishing. The test command uses Node.js's built-in test runner and does not add a test framework dependency.

The homepage and conference registration forms and newsletter forms verify email and save submissions in the MySQL `email_engagements` table. Run `corepack pnpm db:init` after upgrading to create that table. Superadmin can review and export the latest 1,000 records. Newsletter marketing consent is separate from the privacy acknowledgement; registration does not opt users into marketing.

The Privacy Policy and Terms pages are initial drafts. Have the event organizer or qualified counsel confirm the legal identity, jurisdictions, processors, retention periods, attendee terms, cancellation/refund rules and support address before launch. Registration currently records an interest/request only; it does not issue a ticket, confirm admission or process payment.

Set `NEXT_PUBLIC_SITE_URL` to the canonical public origin (for example `https://filmexpoindia.com`) in production. The app provides `sitemap.xml`, `robots.txt` and a generated Open Graph image. Verify canonical URLs and rendered metadata after deployment.

The current media upload implementation writes to local `storage/uploads`. This is suitable for local development and durable single-server storage, but not ephemeral serverless deployments or multiple app instances. Before using those platforms, select and configure durable object storage/CDN and migrate existing uploads; this repository does not yet include a cloud-storage adapter.

The conference programme starts unconfirmed. Review its schedule, speakers, venue and metrics in Superadmin and switch **Programme Confirmed** only after the event team approves those details. Verify all speakers, testimonials, partner information and image permissions before publishing.
