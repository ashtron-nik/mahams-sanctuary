# Setup Guide — Dreambox

## Prerequisites

- A [Netlify](https://netlify.com) account (free)
- A [Firebase](https://console.firebase.google.com) account (free)
- A code editor (VS Code recommended)
- Git (optional, but recommended)

---

## Step 1: Deploy to Netlify

### Option A: Drag & Drop (Easiest)

1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag the entire `dreambox` folder onto the deploy area
3. Wait for the deploy to finish
4. Click the generated URL to view your site

### Option B: Git + Netlify

1. Create a new GitHub repository
2. Push the `dreambox` folder to it
3. On Netlify, click "New site from Git"
4. Select your repository
5. Deploy settings: leave defaults (no build command, publish directory is `/`)
6. Click "Deploy site"

---

## Step 2: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click "Create a project" (or "Add project")
3. Enter a project name (e.g., `my-dreambox`)
4. Disable Google Analytics (optional, not needed)
5. Click "Create project"

### Enable Realtime Database

1. In the left sidebar, click "Realtime Database"
2. Click "Create Database"
3. Choose a location (closest to your users)
4. Start in **test mode** (you can change rules later)
5. Click "Enable"

### Get Your Config

1. Click the gear icon (⚙) → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Enter a nickname (e.g., "Dreambox Web")
5. Click "Register app"
6. Copy the `firebaseConfig` object — you'll need it in Step 3

---

## Step 3: Connect Firebase to Your Site

1. Open `fb-db.js` in your code editor
2. Find the `firebaseConfig` object (around line 109)
3. Replace the placeholder values with your Firebase config:

```javascript
var firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

4. Save the file
5. If using Git, commit and push. If drag-and-drop, re-deploy to Netlify.

### Set Database Rules (Important!)

1. In Firebase Console → Realtime Database → Rules
2. Set to:

```json
{
  "rules": {
    "dreambox": {
      ".read": true,
      ".write": true
    }
  }
}
```

3. Click "Publish"

> **Note:** This allows public read/write. For production, you should add authentication.

---

## Step 4: Access the Admin Panel

1. Go to `https://your-site.netlify.app/admin.html`
2. Enter the admin passkey: `dreambox`
3. You're in! Customize everything from here.

### Admin Panel Features

- **Sections** — Add, edit, reorder content sections
- **Gallery** — Upload photos and videos
- **Songs** — Add music tracks with unlock dates
- **Letters** — Write secret letters
- **Dreams** — Add dream journal entries
- **Timeline** — Create story chapters
- **Quiz** — Set up section unlock quizzes
- **Settings** — Configure section access, dates, features

---

## Step 5: Customize Your Site

### Change the Title

1. Open `index.html`
2. Find `<title>Dreambox</title>` and change it
3. Also update `manifest.json` → `"name"` and `"short_name"`

### Change the Theme Colors

Open `style.css` and modify the CSS variables at the top:

```css
:root {
  --bg: #181214;
  --parchment: #ffebd2;
  --parchment-dim: #b5a99a;
  --ash: #6b5f52;
  --gold: #ffe680;
  --ruby: #e85d3a;
}
```

### Remove or Customize Sections

Use the admin panel to:
- Hide sections you don't need
- Reorder sections
- Change unlock dates
- Set admin-only locks

---

## Step 6: Add Your Own Content

### Photos

1. Go to Admin → Gallery
2. Click "Upload Gallery Images"
3. Select your photos (JPG, PNG, or MP4)
4. Add labels and notes for each

### Music

1. Go to Admin → Songs
2. Click "Add Song"
3. Enter title, artist, and optional unlock date
4. Upload the audio file

### Letters

1. Go to Admin → Letters
2. Click "Add Letter"
3. Write your letter content
4. Set unlock conditions (page views, tree visits, etc.)

---

## Troubleshooting

### "Firebase: No Firebase App" Error

- Make sure `firebaseConfig` is filled in correctly in `fb-db.js`
- Check that the Realtime Database is enabled in Firebase Console

### Images Not Loading

- Make sure images are uploaded through the admin panel
- Check the browser console for 404 errors

### Admin Panel Not Saving

- Check that your Firebase database rules allow write access
- Look at the browser console for permission denied errors

### Site Looks Broken

- Clear your browser cache
- Check that all files were uploaded correctly
- Open browser console (F12) and look for errors

---

## Going Further

### Custom Domain

1. In Netlify, go to Site settings → Domain management
2. Add your custom domain
3. Enable HTTPS

### Firebase Security Rules

For production, add authentication to your Firebase rules:

```json
{
  "rules": {
    "dreambox": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

Then add Firebase Authentication to `fb-db.js`.

### PWA Setup

The site includes PWA support out of the box. To customize:
1. Edit `manifest.json` — change name, icons, colors
2. The service worker (`sw.js`) handles caching automatically

---

## Support

If you run into issues, check:
1. Browser console (F12 → Console tab)
2. Firebase console for database errors
3. Netlify deploy logs for build errors
