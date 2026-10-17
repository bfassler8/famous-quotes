# QuoteVault — 100 Famous & Inspiring Quotes Web App

A clean, modern web application built with **Python Flask**, **Vanilla JavaScript**, and **HTML5/CSS3** to explore 100 curated famous quotes.

## Features
- **100 Curated Famous Quotes**: Thoughtfully selected quotes from 63 renowned historical and modern figures across 10 categories (Philosophy, Science, Inspiration, Leadership, Wisdom, Humor, Literature, Life, Art, Success).
- **Instant Random Quote**: Spotlight hero card with smooth transition effects.
- **Author Search**: Search or filter quotes by any author name.
- **Category Explorer**: Filter by category using quick interactive pill badges or dropdown select.
- **Full-Text Search**: Real-time debounced keyword search matching quotes, authors, or topics.
- **Copy to Clipboard**: One-click quote copying with toast notification confirmation.
- **Spotlight Any Quote**: Click "Spotlight" on any quote card in search results to feature it in the hero spotlight.
- **Theme Switcher**: Dark mode and light mode toggle with system preference detection and local storage persistence.
- **Keyboard Shortcut**: Press `Spacebar` anytime to fetch a new random quote.
- **Zero NPM / Frontend Dependencies**: Pure vanilla JavaScript with native Fetch API.

---

## Project Structure
```
famous-quotes/
├── app.py                 # Flask server & REST API endpoints
├── data/
│   └── quotes.json        # Curated dataset of 100 quotes
├── static/
│   ├── css/
│   │   └── style.css      # Modern responsive styling and animations
│   └── js/
│       └── app.js         # Plain vanilla JS application logic
├── templates/
│   └── index.html         # Semantic HTML5 single-page application
├── tests/
│   ├── __init__.py
│   └── test_app.py        # Automated test suite (pytest)
├── requirements.txt       # Dependencies (Flask, pytest)
├── run.bat                # Windows launch script
└── README.md
```

---

## How to Run

### 1. Start the Flask App
Using the Anaconda Python environment:
```powershell
& "C:\Users\bfass\anaconda3\python.exe" app.py
```
Or double-click `run.bat` in the `famous-quotes` directory.

### 2. Open in Your Browser
Visit [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | Main Web Application UI |
| `/api/quotes/random` | `GET` | Returns a random quote. Supports `?category=` and `?author=` query params |
| `/api/quotes` | `GET` | Returns quotes with optional `?q=`, `?category=`, and `?author=` filters |
| `/api/categories` | `GET` | Returns list of categories with quote counts |
| `/api/authors` | `GET` | Returns list of authors with quote counts |

---

## Running Automated Tests
```powershell
& "C:\Users\bfass\anaconda3\python.exe" -m pytest tests/ -v
```
