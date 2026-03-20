# APS Home App

Simple web app for managing home consumables and preventive maintenance.

## Features

- Shopping kanban with two flows:
  - `At Home`: consumables currently in stock.
  - `Shopping List`: items marked low or gone.
- One-click status actions:
  - Mark `Low` or `Gone` to move item to shopping list.
  - `Confirm Purchased` to return item to stock.
- Drag-and-drop shopping flow:
  - Drag any consumable card between `At Home` and `Shopping List`.
  - Drop in `Shopping List` to mark as needed.
  - Drop in `At Home` to move it back to stock.
- Inline editing:
  - Edit consumable name/notes directly on its card.
  - Edit maintenance task name and interval directly on its card.
- Preventive maintenance queue:
  - Add tasks with custom interval in days.
  - Queue auto-sorts by nearest due date.
  - Mark task done to reschedule based on interval.
- Persistent data in browser `localStorage`.

## Run locally

Because this app has no build dependencies, you can serve it directly.

```bash
cd /Users/aps/APSHomeApp
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish on GitHub Pages

Repository: `https://github.com/AnnPasz/APSHomeApp`

1. Push this project to the `main` branch.
2. In GitHub, open `Settings` → `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. The workflow in `.github/workflows/deploy-pages.yml` deploys automatically on each push to `main`.

Your site URL will be:

- `https://annpasz.github.io/APSHomeApp/`

If the page is blank after the first deploy, wait ~1 minute and refresh.

### First publish commands

```bash
cd /Users/aps/APSHomeApp
git init
git add .
git commit -m "Initial APS Home App"
git branch -M main
git remote add origin https://github.com/AnnPasz/APSHomeApp.git
git push -u origin main
```

If your repository is already initialized, run only:

```bash
cd /Users/aps/APSHomeApp
git add .
git commit -m "Add GitHub Pages deployment"
git push
```

## Files

- `index.html` – structure and sections
- `styles.css` – responsive layout and styles
- `app.js` – shopping + maintenance logic and persistence
