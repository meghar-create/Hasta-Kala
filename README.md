# Hasta-Kala Store

A multi-store marketplace for artisan shops. Customers browse handcrafted products from many local stores in one place, pay online or on delivery, and track their orders. Each shop gets its own tools to run the business: counter billing (POS), inventory, delivery settings, staff accounts, coupons and sales analytics. Hasta-Kala (the platform owner) earns from a monthly shop subscription and a small commission on online orders.

**Stack:** HTML + JavaScript + Tailwind CSS (compiled at build time) · Supabase (database, login, file storage) · Vercel serverless functions (`/api`) · Razorpay (payments, free test mode).

---

## 1. What is inside

### Four kinds of users
| Role | Login page | What they do |
|---|---|---|
| **Customer** | `/login` (email + password, or Google) | Browse products and stores, wishlist, cart, checkout, track orders, write reviews |
| **Shop owner** | `/owner-login` | Run one shop: products, billing, sales, delivery, plan, staff, coupons, analytics |
| **Staff** | `/staff-login` | Bill walk-in customers, check sales and stock (cannot see owner-only pages) |
| **Super admin** | `/super-login` | Run the whole platform: approve shops, plans, money, users, messages |

### Pages
- **Customer pages:** Home (products + stores), Store page, Product page, Cart and checkout, My Orders, Wishlist, Profile, Add your shop, About, Contact, Shipping & Returns, Privacy, Terms.
- **Shop pages (owner and staff):** Billing (POS), Sales, Inventory. **Owner only:** Dashboard, Delivery, Plan, Settings.
- **Super admin page:** Overview, Shops, Money, Plans, Users, Inbox.

### Unique features
- **Many shops, one marketplace.** The home page shows products first, with a swipeable strip of stores above them. Customers can filter by category, sort by price, and search products, stores or cities. Every store and product has a clean card (store cards show a coloured band, logo and Delivery / Pickup tags; product cards show the discount, a heart, and stock warnings like "Only 3 left").
- **Location-based discovery.** Customers tap *Use my location* and the nearest town that has stores is chosen automatically (the list is `TOWNS` in `index.html`, so every shop city works, including the demo ones). Only stores and products from that town are shown, and *Show all cities* clears it. Without using the button, everything is shown, and the search box also finds stores by city name.
- **Online shop and counter billing in one system.** The same product list powers the website and the in-shop billing screen. A counter sale prints an 80 mm / 58 mm thermal receipt or an A4 bill, includes the shop logo, address and GSTIN, and records which staff member made the sale.
- **Home delivery or store pickup.** Owners set three delivery zones (Local, Within state, Rest of India), each with its own fee and delivery days, plus a packing time, a free-delivery-above amount and cash-on-delivery on or off. Customers see an estimated delivery date, can check a pincode on the product page, and see a free-delivery progress bar in the cart.
- **Honest stock handling.** Stock is reserved the moment an order is placed. Unpaid online orders are cancelled after 60 minutes and the stock goes back. The cart re-checks every price and stock level against the database, and the server always charges the current database price, so a customer cannot pay an old or edited price.
- **Safe payments.** Money is only marked *Paid* after the server verifies Razorpay's signature. A webhook records the payment even if the customer closes the browser. If money arrives for an order that already expired, it is flagged *refund due* instead of being lost.
- **Fair, transparent commission.** The commission rate is saved on each order when it is placed, so a later plan change never changes old orders. Owners see a full commission statement; the super admin records settlements and sees who owes whom. Details are in section 5.
- **Subscription plans with a calculator.** Free, Pro and Business plans (editable by the super admin). A slider shows each owner which plan is cheapest for their expected monthly sales (fee + commission).
- **Owner analytics.** The Dashboard compares the selected period with the previous one and shows earnings after commission, a trend chart, top products, sales by person, payment modes, busiest hours and days, low-stock alerts and a to-do list. Sales lists have filters and CSV export.
- **Verified reviews.** Anyone can read reviews, but only customers whose order for that product was delivered can write one.
- **Email verification by code.** Customers sign up with a 6-digit emailed code, and can reset a forgotten password with a code.
- **Works on phones and PCs.** The layout adapts from small phones to wide screens, follows the browser's light or dark mode, and can be added to a phone's home screen like an app.
- **Three languages.** English, Hindi (हिन्दी) and Kannada (ಕನ್ನಡ). A language picker sits at the end of the header menu (and at the top-right of the sign-in pages). The choice is remembered in the browser. See section 5, *Languages*.
- **Search by photo (Lens).** A camera icon next to the search box lets a customer scan with the live camera or upload a photo of a craft and find the matching product, even from a blurry photo of a screen. See section 5, *Search by photo (Lens)*.
- **Up to 5 photos per product,** shrunk in the browser before upload and stored in Supabase Storage.

---

## 2. Requirements
- **Node.js 20 or newer** (check with `node -v`): https://nodejs.org
- Free accounts: **Supabase**, **Razorpay**, **Vercel** (only to put the site online), and optionally **Google Cloud** (only for "Continue with Google" for customers).

## 3. How accounts are created
| Role | How the account is created |
|---|---|
| Customer | Signs up on `/login` (email + password, or Google) |
| Shop owner | The **super admin** creates it (Super Admin → *Create shop owner account*). This also creates the owner's approved shop |
| Staff | The **shop owner** creates it (Settings → Staff → *Create staff account*) |
| Super admin | You create it once in Supabase (section 4.5) |

Owners and staff cannot sign themselves up. Whoever creates an account chooses its email and password (minimum 8 characters) and shares them with the person. The super admin page is not linked anywhere on the site: open `/super-login` directly.

---

## 4. Installation, step by step
Follow the steps in order. Each one is needed.

### 4.1 Create the Supabase project and tables
1. Go to https://supabase.com and create a **New project**.
2. Open **SQL Editor → New query**, paste the **entire contents of `supabase/full_setup.sql`** and click **Run**. This one file builds every table, function, security rule, the photo storage bucket and the three starter plans. It is safe to run again and never deletes your data.
3. Open **Project Settings → API** and copy:
   - **Project URL** → goes in `config.js` (`url`) and `.env` (`SUPABASE_URL`)
   - **anon public** key → goes in `config.js` (`key`)
   - **service_role** key → goes in `.env` (`SUPABASE_SERVICE_ROLE_KEY`). This one is secret: never put it in `config.js`, GitHub or chat.
4. Open **Authentication → Providers → Email** and turn **Confirm email ON**. Then set up the email codes in section 4.2.
5. Open **Authentication → URL Configuration**: set Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to Redirect URLs. After you deploy, change or add your Vercel address (section 4.7).

### 4.2 Email codes (OTP) for sign-up and password reset
Customers verify their email with a 6-digit code, and reset a forgotten password with a code. Supabase sends the emails, so set this up once:
1. **Authentication → Email Templates → Confirm signup.** Subject: `Your Hasta-Kala verification code`. Replace the body with:
   ```html
   <h2>Verify your email</h2>
   <p>Your Hasta-Kala verification code is:</p>
   <h1 style="letter-spacing:6px">{{ .Token }}</h1>
   <p>It expires in 1 hour. If you did not sign up, ignore this email.</p>
   ```
2. **Email Templates → Reset Password.** Subject: `Your Hasta-Kala password reset code`. Use the same body but say "password reset code". The `{{ .Token }}` part is what makes it a code instead of a link.
3. **Authentication → SMTP Settings → Enable custom SMTP.** Supabase's built-in sender only allows a few emails per hour and usually only delivers to members of your own Supabase organization, so real customers would not get their codes. The easiest free option is Gmail: Google Account → Security → turn on 2-Step Verification → App passwords → create one. Then use host `smtp.gmail.com`, port `465`, username = your Gmail, password = the 16-character app password, sender email = the same Gmail. Brevo and Resend also have free plans.
4. Test it: sign up on `/login` with a real inbox, enter the code, then try *Forgot password?*.

Accounts created by the super admin (owners) or by owners (staff) are already confirmed and need no code.

### 4.3 Fill in the two config files
- **`config.js`** (public, read by the browser): put your Supabase Project URL in `url` and the **anon public** key in `key`. The `biz` block holds your legal name, support email, phone, WhatsApp number (for the shop-join button; leave empty to hide it), address, grievance officer and jurisdiction. These are shown on the About, Contact, Privacy, Terms and Shipping & Returns pages. The anon key is public by design; never put the service_role key here.
- **`.env`** (secret, read only by the server): copy the template first. On Windows use `copy .env.example .env`, on Mac or Linux use `cp .env.example .env`.

> Vercel environment variables only reach the server code in `api/`. They never reach `config.js`, so the Supabase URL and anon key must be written into `config.js` itself.

| Variable | Where it goes | Value |
|---|---|---|
| `SUPABASE_URL` | `.env` and Vercel | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` and Vercel | Supabase service_role key (secret) |
| `RAZORPAY_KEY_ID` | `.env` and Vercel | `rzp_test_...` from Razorpay |
| `RAZORPAY_KEY_SECRET` | `.env` and Vercel | Razorpay test secret (shown once) |
| `RAZORPAY_WEBHOOK_SECRET` | `.env` and Vercel | Any long random string. Use the same value in the Razorpay webhook. Generate one with `openssl rand -hex 32` |

### 4.4 Run it on your computer
1. Open a terminal **inside the folder that contains `package.json`**. On Windows PowerShell: `cd C:\Users\<you>\Downloads\hasta-kala` (if you see `hasta-kala\hasta-kala`, go one level deeper).
2. Run `npm install`.
3. Run `npm start`, then open **http://localhost:3000**. Restart it after editing `.env`.
4. Optional: `npm run build` recompiles the Tailwind CSS. You only need it if you add new Tailwind classes to the HTML or `assets/js/app.js` (Vercel does this for you on deploy).

### 4.5 Razorpay test payments (free, no KYC)
1. Go to https://razorpay.com, sign up, and switch the dashboard toggle to **Test Mode**.
2. **Account & Settings → API Keys → Generate Test Key.** Put the **Key ID** in `.env` as `RAZORPAY_KEY_ID` and the **Key Secret** as `RAZORPAY_KEY_SECRET`.
3. **Webhook** (so a paid order is never missed if the customer closes the tab): Settings → Webhooks → Add. URL: `https://YOUR-APP.vercel.app/api/razorpay-webhook`. Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`. Events: **payment.captured** and **order.paid**. Webhooks cannot reach `localhost`; on your own computer the browser verification still works.

Test payment details: card `4111 1111 1111 1111` with any future expiry, any CVV and any OTP. UPI `success@razorpay` (success) or `failure@razorpay` (failure).
For real money later, swap the `rzp_test_` keys for live keys after Razorpay KYC. No code change is needed.

### 4.6 Create the super admin
The super admin has no sign-up page, so you create the account in Supabase:
1. **Authentication → Users → Add user → Create new user.** Enter your Gmail and a password, turn on **Auto Confirm User**, and click **Create user**.
2. **SQL Editor → New query** and run this with **your** email:
   ```sql
   update profiles set role='super_admin' where email='yourname@gmail.com';
   ```
   It must say **1 row affected**. To check: `select email, role from profiles;`
3. Open `/super-login` and sign in. There is no "Forgot password" on this page; if you forget the password, reset it in Supabase → Authentication → Users.

Then, from the Super Admin page you can:
- **Create shop owner account:** name, email, password, shop name and city. The shop is created already approved. Give the owner the email and password.
- Approve or suspend shops, change plans, see revenue, view owners and staff under each shop, and search customers.

### 4.7 Put it online with Vercel
1. Push the folder to GitHub (`.env` and `node_modules` are git-ignored; `config.js` is committed because it only holds public values). In Vercel choose **Add New Project** and import it. Framework Preset: **Other**. Leave Output Directory empty (`vercel.json` sets it to `.`).
2. Project → Settings → **Environment Variables:** add the five variables from the table in 4.3, then **Redeploy**. `config.js` must already contain your Supabase URL and anon key before you push.
3. Supabase → **Authentication → URL Configuration:** set Site URL to `https://YOUR-APP.vercel.app` and add `https://YOUR-APP.vercel.app/**` to Redirect URLs (keep the localhost one for local testing).
4. Create the Razorpay webhook with your Vercel address (section 4.5, step 3).

### 4.8 Google login (optional, customers only)
In Google Cloud Console (free, no billing needed):
1. Create a project, then **APIs & Services → OAuth consent screen → External.** Fill in the app name and your email. Leave the publishing status as **Testing** and add your own Gmail (and your tester's) under **Test users**. Only test users can sign in while the app is in Testing.
2. **Credentials → Create credentials → OAuth client ID → Web application.** Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback` (the Supabase address, **not** your Vercel address). Copy the Client ID and Client Secret.
3. Supabase → **Authentication → Providers → Google:** enable it, paste the Client ID and Client Secret, and save. These two values go only in Supabase, never in `.env` or any file in this project.

Google sign-in appears only on `/login`. Owner, staff and super admin pages use email and password only.

---

## 5. How it works

### Try the whole flow (demo)
Super admin creates an owner account (and shop) → owner logs in at `/owner-login`, adds products with photos, sets delivery fees and a pickup address on the Delivery page, uploads a shop logo on the Settings page, and creates a staff account → a customer finds products (or taps *Use my location*), opens a store, adds to cart, chooses **Home delivery** or **Store pickup**, and pays online with a test card (or pays at the store) → the owner sees the order on **Sales** tagged and marked Paid → staff signs in at `/staff-login` and bills a walk-in customer on **Billing** → the customer reviews the product after delivery → the owner buys a Pro plan on the Plan page → the super admin sees subscriptions, sales and commission.

### Demo data (optional, for showcasing)
1. Run `supabase/full_setup.sql` first (the demo file needs its tables and plans).
2. Open **SQL Editor → New query**, paste all of `supabase/demo_data.sql` and **Run**. It adds 8 approved shops (Channapatna, Mysuru, Ilkal, Bidar, Dharwad, Sandur, Bengaluru, Udupi), 56 products with 5 images each, and a WELCOME10 coupon per shop. It is safe to run again.
3. The product photos are illustrations that ship inside the site (`assets/demo/*.svg`), so they need no internet. Step *5b* of the file points any existing demo products at these images, so running the file again is always safe.
4. Hindi and Kannada for the demo shop and product text come from `assets/js/i18n-demo.js`, which every page loads right after `i18n-extra.js`.
5. To remove it all, run the *CLEAN-UP* line at the bottom of `demo_data.sql`.

If you add your own demo shops or products, add their names and descriptions to `i18n-demo.js` (English → `[Hindi, Kannada]`) and put photos in `assets/demo/`, using a path like `/assets/demo/name-1.svg` in the `images` column.

### Orders, stock and prices
- **Order types:** *Home delivery* (placed → packed → shipped → delivered, with courier and tracking), *Store pickup* (placed → ready for pickup → collected, no delivery fee), and *In store (counter)* (a Billing sale, recorded as sold and paid at once). A shop can switch pickup and cash-on-delivery on or off in the Delivery page.
- **Order numbers are per shop.** Each shop counts its own orders 1, 2, 3… (column `orders.shop_order_no`, set by a database trigger with a locked counter per shop, so two simultaneous orders never share a number). Other shops' orders no longer leave gaps. `orders.id` stays the internal unique key used by links, payments and cancel/pay buttons. The pages (My Orders, Sales, invoice, CSV export) show the per-shop number through the `ordNo()` helper in `assets/js/app.js`, which falls back to `id` until the SQL has been run. The invoice number is `HK-` plus the per-shop number, padded to 6 digits.
- **Expected delivery date.** My Orders shows an *Expected delivery* box (for example "Wed, 25 Nov – Fri, 27 Nov") on home-delivery orders that are still on the way. It is the order date + the shop's packing days (`handling_days`) + the delivery days for the customer's zone (Local, Within state or Rest of India, worked out from the pincode on the order), the same rule the cart uses (`orderEta()` in `assets/js/app.js`). It is hidden for pickup, counter, delivered and cancelled orders, and says *Arriving any day now* once the date has passed. The order cards are laid out responsively (`.ord-*` rules at the end of `assets/css/store.css`).
- **Stock** is reserved when an order is placed, and restored if the order is cancelled or an unpaid online order expires after 60 minutes.
- **Prices** are re-checked against the live product when the cart opens, and the server always charges the current database price.
- **Sales figures** (Dashboard, Super admin) count only money actually earned: paid orders, plus cash-on-delivery or pay-at-store orders once delivered. Unpaid and undelivered orders show as *Pending*. Cancelled orders are never counted.

### Plans and commission
- The starter plans are **Free** (₹0, 20 products, 5% commission), **Pro** (₹499 a month, 500 products, 3%) and **Business** (₹1,499 a month, unlimited products, 2%). The super admin can edit them or add more under Plans.
- A paid plan lasts 30 days from payment, and paying again before it ends adds 30 more days. If a paid plan expires, the store is hidden from customers until it renews. The Free plan never expires.
- **Commission is charged only on online orders** (placed by customers on the website), on *items minus coupon*. The delivery fee and counter sales are never charged.
- The rate is **saved on each order when it is placed** (`orders.commission_pct`, `orders.commission_amt`), so changing a plan later never rewrites old orders.
- **Money flow:** online payments go to the Hasta-Kala Razorpay account, so Hasta-Kala owes the shop *(paid online − commission)*. For cash-on-delivery and pay-at-store orders the shop keeps the cash and owes the commission. The super admin records transfers under **Money → Settle** (table `settlements`). The balance shown to both sides is *paid online − commission − settlements*. Razorpay's own gateway fees are not included.

### Payment safety
Browser → `/api/create-order` (checks the order belongs to the caller, then creates the Razorpay order) → Razorpay popup → `/api/verify-payment` (verifies the signature with the secret key, then marks the order Paid). Subscriptions work the same way through `/api/create-sub-order` and `/api/verify-sub`, and extend the shop by 30 days. `/api/razorpay-webhook` repeats the check from Razorpay's server, so payments are recorded even if the browser never comes back. Both paths are safe to run twice. If money arrives for an order that already expired, it is marked **refund due** and shown on the Sales page, and you refund it from the Razorpay dashboard. The secret keys exist only on the server.

### Signing out when returning to the store
Owner, staff and super admin accounts are signed out automatically when they open a customer page (home, store, product, cart, wishlist, orders, profile), so customer pages never show a work menu. The information pages (About, Contact, Privacy, Terms, Shipping & Returns) do not sign anyone out.

### Owner and staff accounts
`/api/create-owner` (super admin only) and `/api/create-staff` (shop owner only, for their own shop) check the caller's role on the server and then create the login. The database also locks `role` and `shop_id`, so nobody can promote themselves from the browser.

### Product photos and reviews
- Up to 5 photos per product, uploaded from the Inventory page. They are shrunk in the browser and stored in Supabase Storage (the `product-images` bucket is created by `full_setup.sql`). The first photo is the cover, and you can also paste an image link.
- Anyone can read a product's reviews (the reviewer's first name is shown). Only customers whose order for that product was delivered can write one.

### Languages
- The text is translated in the browser. `assets/js/i18n.js` is the engine and `assets/js/i18n-dict.js` holds the translations. No page needs editing to be translated.
- `window.HK_DICT` maps an English phrase to `[Hindi, Kannada]`. `window.HK_PATTERNS` handles phrases with changing parts, such as "Only 3 left" or "Order #12" (a regular expression, then the Hindi and Kannada templates, where `{0}`, `{1}` are the captured parts).
- It translates text, placeholders, `aria-label`, `title`, `alt`, page titles and `confirm()` / `alert()` pop-ups, including content drawn later by JavaScript.
- Anything missing from the tables stays in English. To find what is missing, open a page with `?i18n=debug` while Hindi or Kannada is selected and read the console for `[i18n missing]` lines. Add each one to `i18n-dict.js` (or `i18n-extra.js` / `i18n-demo.js`), then hard-refresh.
- Text that comes from the database is translated only when the exact English text is in the tables. The demo shops, products, descriptions, cities and categories are covered by `assets/js/i18n-demo.js`. Anything an owner types that is not in a table (their own products, reviews) stays in English.
- Not translated yet: the long paragraphs on the Privacy, Terms and Shipping & Returns pages (their headings are), most long help text on owner pages, and the super admin page. Have a native speaker review the translations before launch.
- In your own code, `I18N.t('Order #{0}', id)` translates a string built in JavaScript, and `I18N.loc` gives the date locale (`en-IN`, `hi-IN`, `kn-IN`).

### Search by photo (Lens)
- The camera icon beside the header search opens `assets/js/lens.js`. Everything runs in the browser: no server, no API key, no cost.
- **Ways to search:** **Live camera** (opens the camera inside the window with a Capture button), **Upload a picture** (on a phone this also offers the camera), drag a picture onto the window, or paste one. Browsers that cannot open a live camera show a **Take a photo** button instead, which opens the phone's own camera app, so only one camera button is ever shown. After a scan, **drag on your photo** to search just one item in it (like Google Lens). Blurry photos are detected and shown with a note.
- **How it matches (v7).** Each product picture is analysed once: the product is cut out from its background and reduced to a fingerprint made of its **silhouette, colours, edge directions (pattern) and layout**. The customer's photo is analysed the same way from many views (whole photo, the cut-out product, crops, sliding windows, small tilts). A product scores by how well its best view agrees with the photo's best view. When the photo is blurry, shape and colour count more than fine detail, so a soft or noisy photo still finds the product.
- **Why cut-outs matter.** Many shops use one backdrop for a whole craft, so comparing whole pictures mostly matches backdrops. Comparing the cut-out product tells similar crafts apart.
- **Results.** A confident match is shown as a large **Best match** card with price, shop and *Add to cart*. When several products look alike, or nothing matches well, the closest products are listed with a match percentage. Products already in the customer's cart get an *In your cart* tag and a small ranking boost, and are always searched even if they just sold out.
- **Speed.** Fingerprints are cached in the browser's IndexedDB (database `hk_lens`, key prefix `v7|`). The first scan reads every cover picture (a few seconds for ~60 products, longer for many); later scans take a fraction of a second. The leading 40 products are then re-checked from their other photos. Up to 1,500 in-stock products of approved shops are searched. To force a fresh start after changing the matching method, bump `KEY` in `lens.js`.
- **Limits.** It matches by appearance, not by naming objects. Very busy photos (a whole shelf) and products with almost identical pictures can be mixed up; the drag-to-select tool and the "Several products look alike" list are there for that. Product photos must be loadable cross-origin (Supabase public storage and `/assets` both are).
- Camera needs `https://` (or `localhost`) and `camera=(self)` in `vercel.json` (already set).

### Printing bills
1. Billing → *Complete sale & show bill.* The print window opens (switch this off with the checkbox on the Billing page).
2. In the print window choose your printer and paper size: **80 mm** or **58 mm roll** for a bill printer, or **A4** for a normal printer. Margins: *Default* or *None*. Turn **Headers and footers** off.
3. To keep a copy, choose **Save as PDF** as the destination.
4. If a change does not show after you deploy, hard-refresh the page (Ctrl+Shift+R).

---

## 6. Project structure
```
index.html shop.html product.html cart.html orders.html     customer pages
wishlist.html profile.html add-shop.html invoice.html       more customer pages, shop sign-up, online-order invoice
login / staff-login / owner-login / super-login .html       the four logins
forgot-password / reset-password / 404 .html                password reset and not-found page
about / contact / privacy / terms / shipping-returns .html  information pages
pos.html sales.html inventory.html                          shop staff + owner
dashboard.html delivery.html plans.html settings.html       owner only (analytics, delivery, plan + commission, shop profile/staff/coupons)
super.html                                                  super admin
api/*.js          Vercel serverless functions: Razorpay (create-order, verify-payment,
                  create-sub-order, verify-sub, razorpay-webhook) and accounts
                  (create-owner, create-staff). _lib.js is shared code.
assets/js/app.js  shared header, login page, auth guard, cart, wishlist, card builders, helpers
assets/js/i18n.js       language engine (English / Hindi / Kannada) and the language picker
assets/js/i18n-dict.js  the translation tables. Add or fix translations here
assets/js/i18n-extra.js more translations (loaded after i18n-dict.js)
assets/js/i18n-demo.js  Hindi and Kannada for the demo shops, products and categories
assets/demo/      demo product images (SVG), used by supabase/demo_data.sql
assets/js/lens.js       search by photo (Lens)
assets/css/       styles.css (theme), store.css (store layout and cards), tailwind.css (compiled)
assets/icons/     logo and app icons
supabase/         full_setup.sql (run first, in the Supabase SQL Editor) and demo_data.sql (optional demo shops and products)
src/              tailwind.input.css (source for assets/css/tailwind.css)
dev.js            local server (site + /api), used by npm start
config.js         Supabase URL + anon key + business details (public)
.env              your secrets (git-ignored); .env.example is the template
vercel.json       security headers, build command, output directory
manifest.json     lets the site be added to a phone's home screen
```

## 7. Security notes
- All user-entered text (names, reviews, addresses, shop info) is escaped with `esc()` before it is drawn. Keep using `esc()` for any new `innerHTML` template.
- `vercel.json` adds security headers. The Content-Security-Policy ships as **Report-Only**: open the site, test checkout and Google login with the browser console open, and if there are no violations, rename `Content-Security-Policy-Report-Only` to `Content-Security-Policy` to enforce it.
- Keep **Confirm email ON** in Supabase (section 4.1, step 4). Sign-up needs the emailed code.
- Never commit `.env`, and never share the service_role key, the Razorpay secret or the Google client secret.

- `vercel.json` allows the camera for this site only (`camera=(self)`), which Lens needs. Keep microphone and other permissions off.

## 8. Troubleshooting
- `npm error ENOENT package.json`: you are in the wrong folder. `cd` into the folder that has `package.json`.
- Blank pages, "Invalid API key", "Setup needed", or Google login opens `your-project.supabase.co`: `config.js` still has empty or placeholder values. Put your real Project URL and anon key in `config.js` (Vercel environment variables do not reach this file), then refresh or redeploy.
- The look did not change after an update: hard-refresh (Ctrl+Shift+R) so the browser loads the new CSS and JavaScript.
- Header looks wrong on a phone: hard-refresh. On phones the header shows the logo, a cart button and a menu button; tap the menu button to open the links (My Orders, Wishlist, Profile, Logout). Desktop shows all links in one row.
- Vercel error `No Output Directory named "public" found`: make sure `vercel.json` contains `"outputDirectory": "."` and the Output Directory box in Vercel's project settings is empty.
- "Server is missing env variable ...": `.env` is incomplete (or not set in Vercel). Restart after editing, or redeploy on Vercel.
- **"This is not a super admin account"**: the SQL update from section 4.6 did not match your email. Run `select email, role from profiles;`, copy the email exactly, and run the update again (it must say 1 row affected). If your email is missing from `profiles`, run `full_setup.sql` again and repeat the update. Log out and in again afterwards.
- Google `redirect_uri_mismatch`: the redirect URI in Google Cloud must be exactly `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
- Google "Access blocked / app not verified": add your Gmail under OAuth consent screen → Test users.
- Google login returns to the wrong page: check Site URL and Redirect URLs in Supabase (section 4.1 step 5 and section 4.7).
- "An account with this email already exists" when creating an owner or staff: that email is already registered (even as a customer). Use a different email.
- A store or its products do not appear for customers: the shop is not approved, is suspended, or its paid plan has expired (the Free plan never expires). If you used *Use my location*, tap *Show all cities* to clear the city filter.
- Unpaid online orders keep stock reserved until they are paid or cancelled. Cancelling restores stock.
- Codes never arrive: custom SMTP is not set up (section 4.2 step 3), or the template does not contain `{{ .Token }}`. Check Supabase → Authentication → Logs, and the spam folder.
- "Photo upload is not set up yet": run `supabase/full_setup.sql` again (it creates the `product-images` storage bucket and its rules). The logged-in user must be the shop owner.
- The wrong header (for example the owner menu) shows on a customer page: hard-refresh so the browser loads the latest `assets/js/app.js`. Pages restored with the Back button reload themselves, and logout replaces the page in history.
- A phrase shows in English after switching to Hindi or Kannada: it is not in `assets/js/i18n-dict.js` yet. Use `?i18n=debug` (section 5, *Languages*) to list missing phrases, add them, and hard-refresh.
- The language does not change on a page: hard-refresh so the browser loads the new `i18n.js` and `i18n-dict.js`. The choice is stored in `localStorage` as `hk_lang`; `?lang=hi` or `?lang=kn` in the address also sets it.
- Lens shows no results or the camera does not open: allow camera access in the browser (if it stays blocked, use *Upload a picture*, which can still take a photo on a phone), make sure the site is on `https://` (or `localhost`), and check that `vercel.json` has `camera=(self)`. If a product is never matched, its photo may be blocked from loading cross-origin, or the product is outside the newest 300 / out of stock / from an unapproved shop. If a scan gets stuck, close the Lens window and open it again. To clear the saved fingerprints, delete the `hk_lens` IndexedDB in the browser's developer tools (Application tab) or bump `KEY` in `lens.js`.
- Order numbers still show the big shared number, or My Orders shows no *Expected delivery*: run the latest `supabase/full_setup.sql` (it adds the per-shop numbers), and set the shop's delivery days in the Delivery page, because the date needs them.
- Razorpay popup does not open or the payment is not recorded: check the key ID and secret in Vercel, then the webhook URL, secret and events.

## 9. Not built yet
Automatic refunds (refund from the Razorpay dashboard for now), email order notifications, and a GST/tax breakdown on invoices.

## 10. Future scope
Ideas for growing the platform, roughly in the order they would help most.

**Money and payments**
- **Automatic refunds and payouts.** Refund a cancelled or expired order from inside the app, and pay shops their balance automatically (for example with Razorpay Route) instead of recording transfers by hand.
- **GST and tax invoices.** Tax breakdown per item, GST-ready invoices and a monthly tax report for each shop.
- **More ways to pay.** Wallets, EMI, and pay-later options.

**Customers**
- **Order notifications.** Email, SMS and WhatsApp updates when an order is placed, packed, shipped or delivered.
- **Better search and discovery.** Search by typing with suggestions, filters for price range and rating, "near me" sorting by distance, and recommendations such as "more from this artisan".
- **Returns and exchanges.** A request flow with reasons, photos and status tracking.
- **Loyalty.** Reward points, referral codes and platform-wide offers.
- **More languages.** Tamil, Telugu, Marathi and others; translated long policy pages; translating product and shop text that owners enter themselves (for example with automatic translation).
- **Smarter photo search.** Recognise the object itself (not only colour and shape) with an image-recognition model.
- **Installable app.** A full offline-capable app with push notifications, and later a native mobile app.

**Shops**
- **Variants.** Sizes, colours and other options for one product, with separate stock for each.
- **Barcode and QR billing.** Scan products at the counter, and import products from a spreadsheet.
- **Shop branding.** Let each owner choose the store banner colour, add a cover photo and write an "about the artisan" story.
- **Reports.** Profit reports, stock history and scheduled email summaries.
- **Multiple branches** and per-branch stock.
- **Courier integration.** Book shipments, print labels and track parcels with Shiprocket, Delhivery or similar services.

**Platform**
- **Expansion beyond Karnataka.** More states and cities, with area-wise delivery rules.
- **Admin tools.** Product and shop moderation, automatic reminders for plan renewal, and a public page for each artisan.
- **Reliability.** Automated tests, error monitoring, and scheduled database backups.
