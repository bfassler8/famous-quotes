/**
 * QuoteVault — Plain Vanilla JavaScript Application
 * Manages fetching, searching, filtering, CSV export, theme toggling, animations, and clipboard interactions.
 */

(function () {
  'use strict';

  // CSS Root Variables for Light and Dark modes
  const THEME_ROOT_VARIABLES = {
    light: {
      '--bg-primary': '#f8fafc',
      '--bg-surface': '#ffffff',
      '--bg-surface-elevated': '#ffffff',
      '--bg-secondary': '#f1f5f9',
      '--bg-tertiary': '#e2e8f0',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#64748b',
      '--border-subtle': '#e2e8f0',
      '--border-focus': '#818cf8',
      '--accent-primary': '#4f46e5',
      '--accent-primary-hover': '#4338ca',
      '--accent-light': '#e0e7ff',
      '--accent-text': '#3730a3'
    },
    dark: {
      '--bg-primary': '#0b0f19',
      '--bg-surface': '#111827',
      '--bg-surface-elevated': '#1f2937',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#cbd5e1',
      '--text-muted': '#94a3b8',
      '--border-subtle': '#1e293b',
      '--border-focus': '#6366f1',
      '--accent-primary': '#6366f1',
      '--accent-primary-hover': '#4f46e5',
      '--accent-light': '#1e1b4b',
      '--accent-text': '#c7d2fe'
    }
  };

  // State
  let currentSpotlightQuote = null;
  let currentFilteredQuotes = [];
  const activeFilters = {
    q: '',
    category: '',
    author: ''
  };

  // DOM Elements
  const spotlightQuote = document.getElementById('spotlightQuote');
  const spotlightAuthor = document.getElementById('spotlightAuthor');
  const spotlightCategory = document.getElementById('spotlightCategory');
  const spotlightCard = document.getElementById('spotlightCard');

  const btnRandom = document.getElementById('btnRandom');
  const btnCopy = document.getElementById('btnCopy');
  const themeToggleCheckbox = document.getElementById('themeToggleCheckbox');

  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const categorySelect = document.getElementById('categorySelect');
  const authorSelect = document.getElementById('authorSelect');
  const btnResetFilters = document.getElementById('btnResetFilters');
  const btnEmptyReset = document.getElementById('btnEmptyReset');
  const btnExportCsv = document.getElementById('btnExportCsv');

  const categoryPillsContainer = document.getElementById('categoryPills');
  const quotesGrid = document.getElementById('quotesGrid');
  const resultsCount = document.getElementById('resultsCount');
  const resultsTitle = document.getElementById('resultsTitle');
  const emptyState = document.getElementById('emptyState');
  const toast = document.getElementById('toast');

  let toastTimeout = null;

  /* ==========================================================================
     Initialization
     ========================================================================== */
  async function init() {
    initTheme();
    setupEventListeners();
    await Promise.all([
      loadCategories(),
      loadAuthors(),
      getRandomQuote(),
      filterQuotes()
    ]);
  }

  /* ==========================================================================
     Theme Management (Overrides CSS Root Variables)
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('quotevault-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    const vars = THEME_ROOT_VARIABLES[theme] || THEME_ROOT_VARIABLES.light;

    // Directly override CSS root variables on the root document element
    for (const [property, value] of Object.entries(vars)) {
      root.style.setProperty(property, value);
    }

    root.setAttribute('data-theme', theme);
    localStorage.setItem('quotevault-theme', theme);

    if (themeToggleCheckbox) {
      themeToggleCheckbox.checked = (theme === 'dark');
    }
  }

  function handleThemeToggle() {
    const isDark = themeToggleCheckbox.checked;
    const newTheme = isDark ? 'dark' : 'light';
    applyTheme(newTheme);
    showToast(`Switched to ${newTheme} mode`);
  }

  /* ==========================================================================
     API Calls
     ========================================================================== */
  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const categories = await res.json();

      categorySelect.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = `${cat.name} (${cat.count})`;
        categorySelect.appendChild(option);
      });

      categoryPillsContainer.innerHTML = '<button class="pill-filter active" data-category="">All</button>';
      categories.forEach(cat => {
        const pill = document.createElement('button');
        pill.className = 'pill-filter';
        pill.dataset.category = cat.name;
        pill.textContent = cat.name;
        categoryPillsContainer.appendChild(pill);
      });
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadAuthors() {
    try {
      const res = await fetch('/api/authors');
      if (!res.ok) throw new Error('Failed to load authors');
      const authors = await res.json();

      authorSelect.innerHTML = '<option value="">All Authors</option>';
      authors.forEach(auth => {
        const option = document.createElement('option');
        option.value = auth.name;
        option.textContent = `${auth.name} (${auth.count})`;
        authorSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Error loading authors:', err);
    }
  }

  async function getRandomQuote() {
    try {
      const params = new URLSearchParams();
      if (activeFilters.category) params.append('category', activeFilters.category);
      if (activeFilters.author) params.append('author', activeFilters.author);

      const url = `/api/quotes/random?${params.toString()}`;
      const res = await fetch(url);

      if (res.status === 404) {
        const fallbackRes = await fetch('/api/quotes/random');
        const quote = await fallbackRes.json();
        updateSpotlightCard(quote);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch random quote');
      const quote = await res.json();
      updateSpotlightCard(quote);
    } catch (err) {
      console.error('Error fetching random quote:', err);
      spotlightQuote.textContent = 'Could not load a random quote. Please try again.';
    }
  }

  async function filterQuotes() {
    try {
      const params = new URLSearchParams();
      if (activeFilters.q) params.append('q', activeFilters.q);
      if (activeFilters.category) params.append('category', activeFilters.category);
      if (activeFilters.author) params.append('author', activeFilters.author);

      const res = await fetch(`/api/quotes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to search quotes');
      const data = await res.json();

      currentFilteredQuotes = data.quotes || [];
      renderQuotesGrid(currentFilteredQuotes);
      updateResultsHeader(data.total);
    } catch (err) {
      console.error('Error searching quotes:', err);
      currentFilteredQuotes = [];
      quotesGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      resultsCount.textContent = 'Error loading results';
    }
  }

  /* ==========================================================================
     UI Rendering
     ========================================================================== */
  function updateSpotlightCard(quote) {
    currentSpotlightQuote = quote;

    spotlightQuote.classList.add('fade-out');

    setTimeout(() => {
      spotlightQuote.textContent = quote.quote;
      spotlightAuthor.textContent = quote.author;
      spotlightCategory.textContent = quote.category;
      spotlightQuote.classList.remove('fade-out');
    }, 150);
  }

  function renderQuotesGrid(quotes) {
    quotesGrid.innerHTML = '';

    if (!quotes || quotes.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    quotes.forEach(item => {
      const card = document.createElement('article');
      card.className = 'quote-card';

      card.innerHTML = `
        <div class="card-body">
          <p class="card-quote">“${escapeHtml(item.quote)}”</p>
          <div class="card-author">— ${escapeHtml(item.author)}</div>
        </div>
        <div class="card-footer">
          <span class="card-pill">${escapeHtml(item.category)}</span>
          <div class="card-actions">
            <button class="btn-card-action btn-card-spotlight" title="Feature in spotlight">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>Spotlight</span>
            </button>
            <button class="btn-card-action btn-card-copy" title="Copy to clipboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy Quote</span>
            </button>
          </div>
        </div>
      `;

      // Spotlight action
      const btnSpotlight = card.querySelector('.btn-card-spotlight');
      btnSpotlight.addEventListener('click', () => {
        updateSpotlightCard(item);
        spotlightCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('Quote set to spotlight!');
      });

      // Individual Copy to Clipboard action
      const btnCardCopy = card.querySelector('.btn-card-copy');
      btnCardCopy.addEventListener('click', () => {
        copyQuoteText(item);
      });

      quotesGrid.appendChild(card);
    });
  }

  function updateResultsHeader(total) {
    if (activeFilters.q || activeFilters.category || activeFilters.author) {
      resultsTitle.textContent = 'Filtered Results';
      resultsCount.textContent = `Showing ${total} quote${total === 1 ? '' : 's'}`;
    } else {
      resultsTitle.textContent = 'Explore All Quotes';
      resultsCount.textContent = `Showing all ${total} quotes`;
    }
  }

  /* ==========================================================================
     Actions & Helpers
     ========================================================================== */
  function copyQuoteText(quoteObj) {
    if (!quoteObj) return;
    const textToCopy = `“${quoteObj.quote}” — ${quoteObj.author}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => showToast('Quote copied to clipboard!'))
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Quote copied to clipboard!');
      });
  }

  function exportToCsv() {
    if (!currentFilteredQuotes || currentFilteredQuotes.length === 0) {
      showToast('No quotes to export!');
      return;
    }

    const headers = ['ID', 'Quote', 'Author', 'Category', 'Tags'];
    const rows = currentFilteredQuotes.map(item => [
      item.id,
      `"${(item.quote || '').replace(/"/g, '""')}"`,
      `"${(item.author || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.tags || []).join('; ').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'famous_quotes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${currentFilteredQuotes.length} quotes to CSV!`);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  function syncCategoryPills(activeCat) {
    const pills = categoryPillsContainer.querySelectorAll('.pill-filter');
    pills.forEach(pill => {
      if (pill.dataset.category === activeCat) {
        pill.classList.add('active');
        pill.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function resetAllFilters() {
    activeFilters.q = '';
    activeFilters.category = '';
    activeFilters.author = '';

    searchInput.value = '';
    categorySelect.value = '';
    authorSelect.value = '';
    btnClearSearch.classList.add('hidden');

    syncCategoryPills('');
    filterQuotes();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /* ==========================================================================
     Event Listeners
     ========================================================================== */
  function setupEventListeners() {
    // Spotlight Random Button
    btnRandom.addEventListener('click', getRandomQuote);

    // Spotlight Copy Button
    btnCopy.addEventListener('click', () => {
      if (currentSpotlightQuote) {
        copyQuoteText(currentSpotlightQuote);
      }
    });

    // Theme toggle switch
    if (themeToggleCheckbox) {
      themeToggleCheckbox.addEventListener('change', handleThemeToggle);
    }

    // Export to CSV button
    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', exportToCsv);
    }

    // Search input (Debounced)
    const debouncedSearch = debounce(() => {
      activeFilters.q = searchInput.value.trim();
      filterQuotes();
    }, 250);

    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim().length > 0) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
      debouncedSearch();
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.classList.add('hidden');
      activeFilters.q = '';
      filterQuotes();
      searchInput.focus();
    });

    // Category Select Dropdown
    categorySelect.addEventListener('change', () => {
      activeFilters.category = categorySelect.value;
      syncCategoryPills(activeFilters.category);
      filterQuotes();
    });

    // Category Quick Pills Click
    categoryPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-filter');
      if (!pill) return;
      const category = pill.dataset.category || '';
      activeFilters.category = category;
      categorySelect.value = category;
      syncCategoryPills(category);
      filterQuotes();
    });

    // Author Select Dropdown
    authorSelect.addEventListener('change', () => {
      activeFilters.author = authorSelect.value;
      filterQuotes();
    });

    // Reset Buttons
    btnResetFilters.addEventListener('click', resetAllFilters);
    btnEmptyReset.addEventListener('click', resetAllFilters);

    // Keyboard shortcut: Spacebar for next random quote (when not inside inputs)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        getRandomQuote();
      }
    });
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
