# 🍜 Food Finder Cambodia

A mobile-first food discovery website for Cambodia. Visitors can find restaurants, cafés and street food near them,
read reviews, and add new spots. Every new spot waits for an administrator to approve it before the public can see it.

```
Food_Finder_Cambodia/
├── backend/     Node.js + Express + MongoDB (the API, login, uploads)
└── frontend/    React + Vite (the website and the admin dashboard)
```

Your original project (FoodieFind, React + Vite, data in the browser) is now the `frontend/`. The look is the same
(orange and deep green, rounded cards, dark mode). What changed is that everything now talks to a real server and database.

---

## What you need first

- **Node.js 18.18 or newer** (check with `node -v`). Download it from https://nodejs.org
- **MongoDB** running on your computer (step 3 below), or a free MongoDB Atlas database

---

## Setup, step by step

### 1. Install the dependencies

Open two terminals, one in each folder:

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Set up the `.env` file

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in **`JWT_SECRET`**. It must be a long random string. This command makes one for you:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the result after `JWT_SECRET=`. The other defaults work as they are for local development.

| Setting | What it does |
|---|---|
| `MONGODB_URI` | Where your database is. Default is a local MongoDB. |
| `JWT_SECRET` | Secret used to sign logins. Keep it private. |
| `CLIENT_URL` | The website address allowed to call the API (`http://localhost:5173`). |
| `PUBLIC_URL` | The API's own address, used to build image links (`http://localhost:5001`). |
| `REVIEW_MODERATION` | `true` = new reviews wait for your approval. `false` = they show straight away (you can still delete them). |

### 3. Start MongoDB

Pick whichever matches your computer:

- **Windows:** MongoDB usually runs as a service after install. If not, open "Services" and start **MongoDB Server**.
- **macOS (Homebrew):** `brew services start mongodb-community`
- **Linux:** `sudo systemctl start mongod`
- **Docker (works everywhere):** `docker run -d --name ff-mongo -p 27017:27017 mongo:7`
- **No install at all:** make a free cluster at https://www.mongodb.com/atlas and paste its connection string into `MONGODB_URI`.

### 4. Add the demo food and promotions, then start the backend

```bash
cd backend
npm run seed      # 40 demo listings + the 5 carousel promotions (safe to run twice)
npm run dev       # starts the API
```

You should see `MongoDB connected` and `API running at http://localhost:5001`.

### 5. Start the frontend

In the second terminal:

```bash
cd frontend
npm run dev
```

### 6 and 7. Where everything lives

| | Address |
|---|---|
| Website | http://localhost:5173 |
| Admin login | http://localhost:5173/admin/login |
| API | http://localhost:5001/api (try http://localhost:5001/api/health) |

Always open the website through **5173**. It passes `/api` calls to the backend for you, which keeps login cookies working.

### 8. Create the first admin account

There is no public admin sign-up, on purpose. Create the first one from the terminal:

```bash
cd backend
npm run create-admin
```

It asks for a name, email and password (10+ characters, letters and numbers). Then log in at
http://localhost:5173/admin/login. Running it again with the same email resets that admin's password.

> The admin login is separate from the normal user login. A normal account can never open `/admin`,
> and an admin account can't log in on the public login page.

---

## 9. Try the whole thing yourself (5 minutes)

1. **Sign up** at `/signup` with any email.
2. Open **Add Food**. Fill in the form, tap *Use my current location* (or type coordinates), add 2 or 3 photos, send it.
   You'll see *"Your food submission has been received and is waiting for approval."*
3. Check **Account**. Your spot is listed as **Pending**. Search for it on the home page: it is *not* there yet.
4. Open a private window, go to `/admin/login`, sign in. The **Dashboard** shows 1 pending listing.
5. Go to **Foods → Pending → Approve**. It is now public with a **✓ Verified** badge.
6. Back on the website, find it on Home, **Nearby** and its **Category**. Open it for the details page, map and *Get Directions*.
7. Write a **review** (log in first). It shows up with the star average ("★★★★★ 4.5, Based on 25 reviews").
8. In the admin, open **Reviews** and delete it. It disappears from the public page and the rating updates.
9. Also try in the admin: **Foods** (add, edit, reject, delete), **Users** (view, disable, delete) and **Promotions**
   (add, edit, reorder, disable, delete). The carousel on the home page follows what you set.

### Automated tests

With the backend running, an empty-ish test database and an admin account:

```bash
cd backend
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='your-admin-password' npm run test:e2e
node tests/cloudinary.mjs     # checks the Cloudinary upload/delete code with a pretend account (no login needed)
node tests/vercel-mode.mjs    # checks the app runs the way Vercel runs it
```

It runs about 130 checks through the real API: signup, login, uploads, approval, reviews, moderation, roles and promotions.
**Use a test database for this** (change `MONGODB_URI` to e.g. `.../food_finder_test`), because it creates and deletes records.

---

## How the main rules work

- **Approval:** a user submission is saved as `pending` and hidden everywhere (lists, search, nearby, even the direct link).
  Only the person who submitted it can see it, in their Account. If they edit it later, it goes back to pending.
- **Badges:** approved community listings show **✓ Verified**. Demo data shows **Demo Listing** and never gets Verified.
- **Open / Closed / Opens Soon:** calculated by the server from the saved business hours, in Cambodia time (UTC+7).
  Hours that cross midnight (17:00 to 01:00) work. Same open and close time means 24 hours.
  "Opens Soon" means within the next hour.
- **Nearby:** uses the browser's location permission. If it's off, you get a friendly message and can keep browsing.
  Distance is a straight line, not driving distance.
- **Privacy:** public cards and pages never include who submitted a listing. The phone and Telegram shown on the details page are the
  business contact details entered in the form, not the user's account details.
- **Images:** JPG, PNG or WebP, 2 or 3 per listing. The browser shrinks each photo first, then the server really decodes it
  (a renamed text file is rejected), removes camera location data, converts it to WebP, gives it a random name and stores it (Cloudinary or disk).
- **Reviews:** one per person per place, 1 to 5 stars. The average is calculated from approved reviews only.

## Security notes

Passwords are hashed with bcrypt, logins use HttpOnly cookies (JavaScript on the page can't read them), admin and user sessions are separate,
admin routes check the role in the database on every request, inputs are validated, login attempts are rate-limited, requests from other
websites are blocked, and error messages never show database details. No secrets are in the code. They all come from `.env`.

## Photo storage: Cloudinary

Uploaded photos can be stored on [Cloudinary](https://cloudinary.com) (free plan is fine to start). This is **required on Vercel**
and recommended anywhere else, because many hosts erase files saved on the server whenever it restarts.

1. Create a free Cloudinary account and open the dashboard.
2. Copy the **Cloud name**, **API Key** and **API Secret**.
3. Put them in `backend/.env`:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-secret
CLOUDINARY_FOLDER=food-finder-cambodia
```

Restart the backend. New photos now go to Cloudinary (in `food-finder-cambodia/foods` and `food-finder-cambodia/promotions`) and the
listing stores the picture's web address. Leave the three values empty and photos are saved in `backend/uploads` instead, which is fine for testing on your computer.

**Deleting:** pictures are removed from Cloudinary automatically when

- an admin deletes a listing (or a user deletes their own),
- a photo is replaced or removed while editing a listing,
- a promotion is deleted or its image is replaced,
- a user account is deleted (their unpublished listings go with it),
- an upload fails half-way (photos that already went up are removed again).

The app only ever deletes pictures that it uploaded itself, in your account and inside `CLOUDINARY_FOLDER`.
If you ran `npm run seed` earlier without Cloudinary, those 5 promotion images are on disk. Run `npm run seed:reset` after adding the
Cloudinary values to re-create them there.

Photos are also shrunk in the visitor's browser before upload, so phone photos of 5 to 10 MB are fine.

## Going live on Vercel

The `vercel.json` at the top of this project runs the frontend and backend as two services on one address, so `/api/...` reaches the
backend and everything else is the website. Login cookies then work with no extra settings.

1. Push the project to GitHub and import it in Vercel.
2. In **Settings → Build and Deployment → Framework Preset**, choose **Services** (Vercel only reads the `services` block with this setting).
3. In **Settings → Environment Variables** add:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your MongoDB Atlas connection string |
| `JWT_SECRET` | a long random string (the command in step 2 makes one) |
| `CLIENT_URL` | your site address, e.g. `https://your-app.vercel.app` |
| `PUBLIC_URL` | the same address |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | from Cloudinary |

4. In MongoDB Atlas, open **Network Access** and allow `0.0.0.0/0` (Vercel's addresses change). Use a strong database password.
5. Deploy, then open `https://your-app.vercel.app/api/health`. You should see `{"ok":true}`.
6. Create the first admin **from your own computer**, pointing at the live database: put the Atlas string in `backend/.env`, then run
   `npm run create-admin` and `npm run seed`.

Good to know: uploads are limited to about 4.5 MB per request on Vercel (the in-browser shrinking keeps you well under that),
and the login rate limiter counts per server instance, so it is a speed bump rather than a hard wall.

## Going live somewhere else

Build the frontend (`cd frontend && npm run build`, publish `dist/`) and run the backend on any Node host (Render, Railway, Fly.io, a VPS).
Make `/api` reach the backend on the same domain with a reverse proxy, set the same variables as above, and serve over **HTTPS**
(browsers only allow location on HTTPS). If the site and API must be on different domains, set `COOKIE_SAMESITE=none` and `VITE_API_URL` in the frontend.

## If something goes wrong

- **"Could not connect to MongoDB"**: MongoDB isn't running (step 3), or `MONGODB_URI` is wrong.
- **"JWT_SECRET is missing"**: finish step 2.
- **Website says it cannot reach the server**: the backend isn't running, or you opened the site on a different port than 5173.
- **Location doesn't work**: the browser needs permission, and the page must be `localhost` or HTTPS.
- **Map tiles are blank**: the map pictures come from OpenStreetMap, so the computer needs internet.

## Project map (for when you want to change something)

```
backend/src/
  config/        env, database, category + province lists
  models/        User, Food, Review, Promotion
  routes/        every API address in one file (routes/index.js)
  controllers/   what each address does (auth, foods, reviews, admin, promotions)
  middleware/    login checks, admin check, validation, uploads, errors, rate limits
  services/      image processing, food search, rating calculation
  scripts/       seed.js, createAdmin.js
frontend/src/
  pages/         Home, Browse (Nearby / Category / Search), FoodDetails, AddFood, Auth, Account
  admin/         Dashboard, Foods, Reviews, Users, Promotions
  components/    Header, BottomNav, Hero, PromoCarousel, FoodGrid, FoodForm, Reviews, ui/*
  context/       login, admin login, location, toast messages
  styles/app.css the whole design in one file
```

Adding a category later: add it to `backend/src/config/categories.js` and `frontend/src/data.js`.
