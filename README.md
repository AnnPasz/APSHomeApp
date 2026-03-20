# APS Home

Aplikacja webowa do zarządzania zakupami domowymi i cyklicznymi pracami prewencyjnymi.

## Układ aplikacji

Po lewej stronie znajduje się menu z trzema widokami:

- `Zakupy Kanban`
- `Czynności domowe`
- `Ustawienia`

W sekcji `Ustawienia` znajdują się:

- `Kategorie artykułów`
- `Synchronizacja GitHub`

## Funkcje

- Kanban zakupów:
  - kolumny `W domu` i `Lista zakupów`
  - oznaczanie: `Kończy się`, `Brak`, `Kupione`
  - przeciąganie kart między kolumnami
- Kategorie produktów:
  - każdy produkt ma kategorię
  - osobny panel do dodawania i usuwania kategorii
- Filtrowanie listy produktów:
  - filtr po kategorii
  - dynamiczne wyszukiwanie po nazwie
- Zadania prewencyjne:
  - własna częstotliwość w dniach
  - automatyczne sortowanie wg terminu
  - oznaczanie zadania jako wykonane
- Synchronizacja GitHub:
  - `Wyślij na GitHub` zapisuje stan do pliku JSON w repozytorium
  - `Pobierz z GitHub` odtwarza stan na innym urządzeniu lub w innej przeglądarce

## Uruchomienie lokalne

```bash
cd /Users/aps/APSHomeApp
python3 -m http.server 8000
```

Następnie otwórz `http://localhost:8000`.

## Synchronizacja lokalna + GitHub Pages

Sugerowane ustawienia synchronizacji:

- Właściciel: `AnnPasz`
- Repozytorium: `APSHomeApp`
- Gałąź: `main`
- Ścieżka danych: `data/state.json`

### Token GitHub

Do wysyłki wymagany jest token z uprawnieniem `Contents: Read and write` dla repozytorium `APSHomeApp`.

Ścieżka w GitHub:

`Settings` → `Developer settings` → `Personal access tokens` → `Fine-grained tokens` → `Generate new token`

## GitHub Pages

Po każdym pushu na `main` uruchamia się workflow z `.github/workflows/deploy-pages.yml`.

Adres aplikacji:

- `https://annpasz.github.io/APSHomeApp/`# APS Home

Aplikacja webowa do zarządzania zakupami domowymi i cyklicznymi pracami prewencyjnymi.

## Funkcje

- Kanban zakupów:
  - `W domu` i `Lista zakupów`.
  - Oznaczanie: `Kończy się`, `Brak`, `Kupione`.
  - Przeciąganie kart między kolumnami.
- Kategorie produktów:
  - Każdy produkt ma kategorię.
  - Osobne submenu do dodawania/usuwania kategorii.
- Filtrowanie listy produktów:
  - Filtr po kategorii.
  - Dynamiczne wyszukiwanie po nazwie (na żywo).
- Zadania prewencyjne:
  - Własna częstotliwość (dni) dla każdego zadania.
  - Automatyczne sortowanie kolejki wg terminu.
  - Oznaczanie zadania jako wykonane.
- Synchronizacja GitHub:
  - `Wyślij na GitHub` zapisuje stan do pliku JSON w repo.
  - `Pobierz z GitHub` odtwarza stan na innym urządzeniu/przeglądarce.

## Uruchomienie lokalne

```bash
cd /Users/aps/APSHomeApp
python3 -m http.server 8000
```

Następnie otwórz: `http://localhost:8000`.

## Synchronizacja lokalna + GitHub Pages

W aplikacji użyj panelu **Synchronizacja GitHub**.

Sugerowane ustawienia:

- Właściciel: `AnnPasz`
- Repozytorium: `APSHomeApp`
- Gałąź: `main`
- Ścieżka danych: `data/state.json`

### Token GitHub

Do wysyłki wymagany jest token z uprawnieniem `Contents: Read and write` dla repozytorium `APSHomeApp`.

Token tworzysz w GitHub:

`Settings` → `Developer settings` → `Personal access tokens` → `Fine-grained tokens` → `Generate new token`

## GitHub Pages

Po pushu na `main` uruchamia się workflow z `.github/workflows/deploy-pages.yml`.

Docelowy adres:

- `https://annpasz.github.io/APSHomeApp/`
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
- GitHub sync:
  - Upload current app data to a JSON file in your GitHub repo.
  - Download app data from that JSON file to any device/browser.

## Run locally

Because this app has no build dependencies, you can serve it directly.

```bash
cd /Users/aps/APSHomeApp
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Sync local and online versions

Use the **GitHub Sync** panel in the app.

Suggested settings for your repo:

- Owner: `AnnPasz`
- Repo: `APSHomeApp`
- Branch: `main`
- Data path: `data/state.json`

### Upload to GitHub

1. Create a GitHub token with repository **Contents write** access.
2. Paste token in the sync panel.
3. Click `Upload to GitHub`.

### Download from GitHub

1. Fill owner/repo/branch/path.
2. Click `Download from GitHub`.
3. Local data will be replaced with remote synced data.

For public repositories, download can work without token, but upload always requires a token.

Security note: token is saved in browser `localStorage` for convenience. Use a fine-grained token scoped only to this repository.

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
