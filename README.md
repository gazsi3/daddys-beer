# 🍺 Daddy's Beer

Where should daddy get his beer with his friends? An Angular web app that takes a
list of friends (name + address), geocodes them on a map, and shows the **fair
meeting point** — the weighted center of everyone's location — with an adjustable
search radius around it.

Includes a **cheat mode**: turn it on and each friend gets a weight that biases the
meeting point toward them (by default Ricsi = 100, everyone else = 1, all editable
in the UI).

- **Map & tiles:** Leaflet + OpenStreetMap (free, no API key)
- **Geocoding:** OpenStreetMap Nominatim (free, no API key), cached in your browser
- **Storage:** your friend list & settings live in `localStorage` (no backend needed)
- **Hosting:** Firebase Hosting free tier, auto-deployed on every push to `main`

---

## Run locally

```bash
npm install
npm start
```

Open http://localhost:4200. The default friends are geocoded automatically on first
load (needs internet for the OpenStreetMap lookup).

Build a production bundle:

```bash
npm run build   # output goes to dist/daddys-beer
```

---

## Deploy to Firebase (free) — what you need to do

I've already created everything in the repo: `firebase.json`, `.firebaserc`, and the
GitHub Actions workflow at `.github/workflows/firebase-deploy.yml`. You only need to
do the account-level steps I can't do for you. **~10 minutes, one time.**

### 1. Create a free Firebase project
1. Go to https://console.firebase.google.com → **Add project**.
2. Name it (e.g. `daddys-beer`). Google Analytics is optional — you can skip it.
3. After it's created, copy the **Project ID** (looks like `daddys-beer-1a2b3`).
   The free **Spark** plan is enough — Hosting is free, no card required.

### 2. Put your Project ID in the repo
Open [.firebaserc](.firebaserc) and replace `REPLACE_WITH_YOUR_FIREBASE_PROJECT_ID`
with your real Project ID. That's the only place it's needed — the GitHub Action
reads it from there.

### 3. Create the GitHub repo and push
```bash
# from this folder:
git add -A
git commit -m "Daddy's Beer app"
gh repo create daddys-beer --public --source=. --push
#   …or create the repo manually on github.com and then:
# git remote add origin https://github.com/<you>/daddys-beer.git
# git branch -M main
# git push -u origin main
```

### 4. Connect Firebase to GitHub (creates the deploy secret automatically)
This is the easy path — the Firebase CLI generates a service account **and** adds it
to your GitHub repo as a secret for you:

```bash
firebase login          # opens a browser, one time
firebase init hosting:github
```

When it asks:
- **For which GitHub repository?** → `<you>/daddys-beer`
- **Set up the workflow to run a build script before deploy?** → **No**
  (we already have a workflow; you don't want it to create a second one)
- **Set up automatic deployment to your site's live channel on merge?** → **No**
- If it offers to overwrite `.github/workflows/...`, choose **No**.

The only thing you need from this command is that it creates the GitHub secret
**`FIREBASE_SERVICE_ACCOUNT`** in your repo. The workflow I wrote uses exactly that
secret name.

> **Manual alternative** (if you'd rather not use the CLI): In the Firebase Console →
> ⚙ Project settings → **Service accounts** → **Generate new private key** to download
> a JSON file. Then in your GitHub repo → **Settings → Secrets and variables → Actions
> → New repository secret**, name it `FIREBASE_SERVICE_ACCOUNT` and paste the entire
> JSON file contents as the value.

### 5. Done — it deploys itself
Every push to `main` now builds the app and deploys it. Watch progress in your repo's
**Actions** tab. Your live URL will be:

```
https://<your-project-id>.web.app
```

To trigger the first deploy, just push (step 3 already did, or push any change).

---

## How the meeting point is calculated

For every friend that geocoded successfully, the app takes a weighted average of
latitude/longitude:

```
centerLat = Σ(weightᵢ · latᵢ) / Σ(weightᵢ)
centerLng = Σ(weightᵢ · lngᵢ) / Σ(weightᵢ)
```

- **Cheat mode off:** every friend's weight is forced to 1 → plain geographic center.
- **Cheat mode on:** each friend's editable weight is used, so a high weight drags the
  meeting point toward that person.

The orange circle is just the adjustable search radius around that point — the area to
go looking for a pub.

---

## Project layout

| Path | What it is |
|------|------------|
| `src/app/models/friend.ts` | The `Friend` data shape |
| `src/app/services/geocoding.service.ts` | Address → coordinates via Nominatim (cached) |
| `src/app/services/friends.service.ts` | Friend list state, persistence, meeting-point math |
| `src/app/components/map/map.component.ts` | Leaflet map, markers, meeting pin, radius circle |
| `src/app/app.component.*` | Sidebar UI (friends, cheat mode, radius) + layout |
| `firebase.json`, `.firebaserc` | Firebase Hosting config |
| `.github/workflows/firebase-deploy.yml` | Auto-deploy on push to `main` |
