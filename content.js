// YouTube Subtitle Translator - Content Script

// --- Dictionary Modules ---

/**
 * Handles interactions with the Free Dictionary API
 */
class FreeDictionaryLookup {
  constructor() {
    this.apiBase = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
    this.cache = new Map(); // Key: word|en|free-dictionary
  }

  async lookup(word) {
    if (!word) return null;

    // Normalize word
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord || cleanWord.length < 2) return null; // Filter too short

    const cacheKey = `${cleanWord}|en|free-dictionary`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.apiBase}${encodeURIComponent(cleanWord)}`);

      if (!response.ok) {
        if (response.status === 404) {
          const result = { found: false, word: cleanWord };
          this.cache.set(cacheKey, result); // Cache 404s too to save requests
          return result;
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const result = this.adaptResponse(data, cleanWord);

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn('[Dict] Lookup failed:', error);
      return null;
    }
  }

  adaptResponse(data, originalWord) {
    // API returns array of entries. We usually take the first comprehensive one.
    if (!Array.isArray(data) || data.length === 0) return { found: false, word: originalWord };

    const entry = data[0];

    return {
      found: true,
      word: entry.word || originalWord,
      phonetic: entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || '',
      pronunciation: (entry.phonetics && entry.phonetics.find(p => p.audio)?.audio) || '',
      meanings: (entry.meanings || []).map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: (m.definitions || []).slice(0, 3).map(d => ({ // Limit to top 3 definitions per PoS
          definition: d.definition,
          example: d.example || '',
          synonyms: (d.synonyms || []).slice(0, 3) // Limit synonyms
        }))
      }))
    };
  }
}

/**
 * UI Component for the Dictionary Tooltip
 */
class DictionaryTooltip {
  constructor() {
    this.tooltip = null;
    this.visible = false;
  }

  showLoading(x, y) {
    this.createTooltipIfNeeded();
    this.tooltip.innerHTML = `
      <div class="yt-dict-loading">
        <div class="yt-dict-loading-spinner"></div>
        Loading...
      </div>
    `;
    this.tooltip.style.display = 'block';
    this.visible = true;
    this.position(x, y);
  }

  show(x, y, data, showPhonetic = true) {
    this.createTooltipIfNeeded();

    // 1. Header
    const phoneticHtml = showPhonetic && data.phonetic ? `<span class="yt-dict-phonetic">[${data.phonetic}]</span>` : '';
    let audioHtml = '';
    if (data.pronunciation) {
      audioHtml = `
        <div class="yt-dict-audio" data-src="${data.pronunciation}" title="Play pronunciation">
          <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
        </div>
      `;
    }

    const headerHtml = `
      <div class="yt-dict-header">
        <span class="yt-dict-word">${data.word}</span>
        ${phoneticHtml}
        ${audioHtml}
      </div>
    `;

    // 2. Prepare Pagination Data
    this.pagedItems = [];

    if (!data.found) {
      this.pagedItems.push(`<div class="yt-dict-empty">Definition not found</div>`);
    } else {
      // Flatten the structure: POs -> Definitions
      data.meanings.forEach(m => {
        // Add Part of Speech as an item
        this.pagedItems.push(`<div class="yt-dict-pos">${m.partOfSpeech}</div>`);

        // Add Definitions as items
        m.definitions.forEach(d => {
          const defHtml = `
            <div class="yt-dict-def-item">
              <div class="yt-dict-def">• ${d.definition}</div>
              ${d.example ? `<div class="yt-dict-ex">"${d.example}"</div>` : ''}
            </div>
          `;
          this.pagedItems.push(defHtml);
        });
      });
    }

    this.currentPage = 0;
    this.itemsPerPage = 3; // Show 3 items (POS or Defs) per page
    this.totalPages = Math.ceil(this.pagedItems.length / this.itemsPerPage);

    // Initial Render Structure
    this.tooltip.innerHTML = `
      <div class="yt-dict-close">×</div>
      ${headerHtml}
      <div class="yt-dict-content-area" id="yt-dict-content-body"></div>
      <div class="yt-dict-pagination">
        <button class="yt-dict-page-btn" id="yt-dict-prev" disabled>&lt;</button>
        <span class="yt-dict-page-info" id="yt-dict-page-num">1 / ${Math.max(1, this.totalPages)}</span>
        <button class="yt-dict-page-btn" id="yt-dict-next" ${this.totalPages <= 1 ? 'disabled' : ''}>&gt;</button>
      </div>
    `;

    // Render first page
    this.renderPage(0);

    // Bind Events
    this.bindEvents();

    this.tooltip.style.display = 'block';
    this.visible = true;
    this.position(x, y);
  }

  renderPage(pageIndex) {
    const start = pageIndex * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    const itemsToShow = this.pagedItems.slice(start, end);

    const container = this.tooltip.querySelector('#yt-dict-content-body');
    if (container) {
      container.innerHTML = itemsToShow.join('');
    }

    // Update controls
    const prevBtn = this.tooltip.querySelector('#yt-dict-prev');
    const nextBtn = this.tooltip.querySelector('#yt-dict-next');
    const pageNum = this.tooltip.querySelector('#yt-dict-page-num');

    if (prevBtn) prevBtn.disabled = pageIndex === 0;
    if (nextBtn) nextBtn.disabled = pageIndex >= this.totalPages - 1;
    if (pageNum) pageNum.textContent = `${pageIndex + 1} / ${Math.max(1, this.totalPages)}`;

    this.currentPage = pageIndex;
  }

  bindEvents() {
    // 1. Close Button
    const closeBtn = this.tooltip.querySelector('.yt-dict-close');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // 2. Audio Button (if exists)
    const audioBtn = this.tooltip.querySelector('.yt-dict-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = audioBtn.getAttribute('data-src');
        if (src) new Audio(src).play().catch(console.warn);
      });
    }

    // 3. Pagination Controls
    const prevBtn = this.tooltip.querySelector('#yt-dict-prev');
    const nextBtn = this.tooltip.querySelector('#yt-dict-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentPage > 0) this.renderPage(this.currentPage - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentPage < this.totalPages - 1) this.renderPage(this.currentPage + 1);
      });
    }

    // 4. Prevent Interaction Bubbling
    ['mousedown', 'mouseup', 'click'].forEach(evt => {
      this.tooltip.addEventListener(evt, (e) => e.stopPropagation());
    });

    // Aggressive scroll blocking (still good to have)
    ['wheel', 'touchmove'].forEach(evt => {
      this.tooltip.addEventListener(evt, (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, { passive: false });
    });
  }

  position(x, y) {
    // Positioning logic (prevent overflow)
    if (!this.tooltip.parentNode) {
      document.body.appendChild(this.tooltip);
    }


    // Reset styles for measurement
    this.tooltip.style.top = '0px';
    this.tooltip.style.left = '0px';
    this.tooltip.style.maxHeight = '280px'; // Reset to default max-height

    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = y + 20;
    let left = x;

    // --- Horizontal Positioning ---
    // Prevent going off right edge
    if (left + rect.width > viewportWidth) {
      left = viewportWidth - rect.width - 20;
    }
    // Prevent going off left edge
    if (left < 10) left = 10;

    // --- Vertical Positioning & Sizing ---
    const GLOBAL_MAX_HEIGHT = 280; // Fixed height including footer

    // Re-measure after reset
    const rectUpdated = this.tooltip.getBoundingClientRect();

    // Calculate strict available space
    // 20px buffer top, 50px buffer bottom (more space for subtitles/controls)
    const spaceAbove = (y - scrollY) - 10;
    const spaceBelow = viewportHeight - (y - scrollY) - 20;

    let finalTop = 0;

    // Decision Logic:

    // 1. Prefer ABOVE if it fits
    if (rectUpdated.height <= spaceAbove && rectUpdated.height <= GLOBAL_MAX_HEIGHT) {
      finalTop = y - rectUpdated.height - 5; // Closer gap (5px)
      this.tooltip.style.maxHeight = `${GLOBAL_MAX_HEIGHT}px`;
    }
    // 2. Else prefer BELOW if it fits
    else if (rectUpdated.height <= spaceBelow && rectUpdated.height <= GLOBAL_MAX_HEIGHT) {
      finalTop = y + 15; // Closer gap (15px to avoid covering cursor immediately)
      this.tooltip.style.maxHeight = `${GLOBAL_MAX_HEIGHT}px`;
    }
    // 3. If neither fits, squeeze into the larger space
    else {
      if (spaceAbove >= spaceBelow) {
        // Place above, strict constraint
        const allowedHeight = Math.min(GLOBAL_MAX_HEIGHT, spaceAbove);
        this.tooltip.style.maxHeight = `${allowedHeight}px`;
        finalTop = y - allowedHeight - 5;
      } else {
        // Place below, strict constraint
        const allowedHeight = Math.min(GLOBAL_MAX_HEIGHT, spaceBelow);
        this.tooltip.style.maxHeight = `${allowedHeight}px`;
        finalTop = y + 15;
      }
    }

    this.tooltip.style.top = `${finalTop + scrollY}px`;
    this.tooltip.style.left = `${left + scrollX}px`;
  }

  hide() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
      this.visible = false;
    }
  }

  createTooltipIfNeeded() {
    if (this.tooltip) return;

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'yt-dict-tooltip';
    this.tooltip.style.display = 'none';

    // Event listeners are now bound in show() -> bindEvents()
  }
}

// --- Main App ---

class YouTubeSubtitleTranslator {
  constructor() {
    this.translatedContainer = null;
    this.lastSubtitle = '';
    this.observer = null;
    this.enabled = true;
    this.targetLang = 'zh-CN';
    this.translationCache = new Map();

    // Dictionary settings
    this.dictEnabled = true;
    this.dictTriggerMode = 'hover'; // Enforce hover
    this.dictShowPhonetic = true;

    this.dictionaryParams = {
      lookup: new FreeDictionaryLookup(),
      ui: new DictionaryTooltip(),
      debounceTimer: null
    };

    // Bind methods
    this.handleSelection = this.handleSelection.bind(this);
    this.handleHover = this.handleHover.bind(this);
    this.handleGlobalClick = this.handleGlobalClick.bind(this);

    this.init();
  }

  init() {
    console.log('[YT Translator] Initializing...');

    // Load settings including new dictionary ones
    chrome.storage.sync.get(['enabled', 'targetLang', 'dictEnabled', 'dictTriggerMode', 'dictShowPhonetic'], (result) => {
      this.enabled = result.enabled !== false;
      this.targetLang = result.targetLang || 'zh-CN';
      this.dictEnabled = result.dictEnabled !== false;
      this.dictTriggerMode = 'hover'; // Enforce hover
      this.dictShowPhonetic = result.dictShowPhonetic !== false;

      if (this.enabled) {
        this.start();
      }
    });

    // Listen for setting changes
    chrome.storage.onChanged.addListener((changes) => {
      let needsRestart = false;

      if (changes.enabled) {
        this.enabled = changes.enabled.newValue;
        needsRestart = true;
      }
      if (changes.targetLang) {
        this.targetLang = changes.targetLang.newValue;
        this.translationCache.clear();
      }

      // Update dictionary settings
      if (changes.dictEnabled !== undefined) {
        this.dictEnabled = changes.dictEnabled.newValue;
        // If dictionary enabled state changes, we might need to add/remove listeners
        // But simply updating the flag is enough as the listeners check the flag.
        // However, if whole extension is disabled, we already stop everything.
      }
      if (changes.dictTriggerMode !== undefined) this.dictTriggerMode = changes.dictTriggerMode.newValue;
      if (changes.dictShowPhonetic !== undefined) this.dictShowPhonetic = changes.dictShowPhonetic.newValue;

      if (needsRestart) {
        if (this.enabled) this.start();
        else this.stop();
      }
    });
  }

  start() {
    console.log('[YT Translator] Starting translation...');
    this.createTranslatedContainer();
    this.watchSubtitles();
    this.addDictionaryListeners();
  }

  stop() {
    console.log('[YT Translator] Stopping translation...');
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.translatedContainer) {
      this.translatedContainer.remove();
      this.translatedContainer = null;
    }
    this.removeDictionaryListeners();
  }

  // --- Translation Logic ---

  createTranslatedContainer() {
    if (this.translatedContainer) return;

    this.translatedContainer = document.createElement('div');
    this.translatedContainer.id = 'yt-translated-subtitle';
    this.translatedContainer.className = 'ytp-caption-window-container'; // Reuse YT class for basic layout

    // Polling until player exists
    const checkPlayer = setInterval(() => {
      const player = document.querySelector('.html5-video-player');
      if (player) {
        clearInterval(checkPlayer);
        player.appendChild(this.translatedContainer);
        console.log('[YT Translator] Translation container created');
      }
    }, 500);
  }

  watchSubtitles() {
    const findSubtitleContainer = () => document.querySelector('.ytp-caption-window-container');
    const subtitleContainer = findSubtitleContainer();

    if (!subtitleContainer) {
      console.log('[YT Translator] Waiting for subtitle container...');
      setTimeout(() => this.watchSubtitles(), 1000);
      return;
    }

    console.log('[YT Translator] Started watching subtitles');
    this.observer = new MutationObserver(() => this.handleSubtitleChange());
    this.observer.observe(subtitleContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    this.handleSubtitleChange();
  }

  handleSubtitleChange() {
    // We target the main subtitle segment. 
    // Note: YouTube sometimes has multiple segments. Ideally we concat them.
    // For simplicity and matching previous logic, we grab .ytp-caption-segment
    // Enhanced: try to get all segments if multiple exist in the active line
    const segments = document.querySelectorAll('.ytp-caption-window-container:not(#yt-translated-subtitle) .ytp-caption-segment');

    let currentSubtitle = '';
    if (segments.length > 0) {
      currentSubtitle = Array.from(segments).map(s => s.textContent).join(' ').trim();
    }

    if (!currentSubtitle) {
      this.updateTranslatedSubtitle('');
      return;
    }

    if (currentSubtitle !== this.lastSubtitle) {
      this.lastSubtitle = currentSubtitle;
      this.translateSubtitle(currentSubtitle);
    }
  }

  async translateSubtitle(text) {
    if (!text) return;
    if (this.translationCache.has(text)) {
      this.updateTranslatedSubtitle(this.translationCache.get(text));
      return;
    }

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${this.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0]) {
        const translatedText = data[0].map(item => item[0]).join('');
        this.translationCache.set(text, translatedText);
        this.updateTranslatedSubtitle(translatedText);
      }
    } catch (error) {
      console.error('[YT Translator] Translation failed:', error);
    }
  }

  updateTranslatedSubtitle(text) {
    if (!this.translatedContainer) return;
    if (!text) {
      this.translatedContainer.innerHTML = '';
      return;
    }

    // Render translated text
    // Added 'yt-trans-segment' class to help identify our own elements separate from YT source
    this.translatedContainer.innerHTML = `
      <div class="ytp-caption-window-bottom" style="display: block;">
        <span class="captions-text" style="background-color: rgba(8, 8, 8, 0.75);">
          <span class="ytp-caption-segment yt-trans-segment" style="color: rgb(255, 255, 255); cursor: text; user-select: text;">${text}</span>
        </span>
      </div>
    `;
  }

  // --- Dictionary Logic ---

  addDictionaryListeners() {
    document.addEventListener('mouseup', this.handleSelection);
    document.addEventListener('mouseover', this.handleHover);
    document.addEventListener('mousedown', this.handleGlobalClick); // To close tooltip
  }

  removeDictionaryListeners() {
    document.removeEventListener('mouseup', this.handleSelection);
    document.removeEventListener('mouseover', this.handleHover);
    document.removeEventListener('mousedown', this.handleGlobalClick);
  }

  handleGlobalClick(event) {
    // If click is not inside the tooltip, hide it
    // Logic handled inside Tooltip class usually, but global listener here ensures integration
    if (this.dictionaryParams.ui.visible) {
      // Tooltip internal clicks stop propagation, so if we reach here, it's outside
      this.dictionaryParams.ui.hide();
    }
  }

  async handleSelection(event) {
    if (!this.dictEnabled || this.dictTriggerMode === 'hover') return;

    // Give browser time to process selection
    setTimeout(async () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (!text) return;

      // Check if selection is relevant (inside a subtitle segment or our translated segment)
      const target = event.target;
      const isSubtitle = target.closest('.ytp-caption-segment') || target.closest('.yt-trans-segment');

      if (!isSubtitle) return;

      // Tokenization for selection:
      // If user selected multiple words, we try to find the first valid word equivalent.
      // Filter out punctuation etc.
      const words = text.split(/[\s\p{P}]+/u).filter(w => /^[a-zA-Z]+$/.test(w) && w.length >= 2);

      if (words.length === 0) return;

      // Use the first valid English word
      const wordToLookup = words[0];

      await this.performDictLookup(wordToLookup, event.clientX, event.clientY);

      // Clear selection after lookup if desired? No, keep it so user knows what they selected.
    }, 10);
  }

  handleHover(event) {
    // Hover logic
    if (!this.dictEnabled || this.dictTriggerMode === 'selection') return;

    const target = event.target;
    // Check if relevant element
    const isSubtitle = target.classList.contains('ytp-caption-segment') ||
      target.classList.contains('yt-trans-segment') ||
      target.closest('.ytp-caption-segment');

    if (!isSubtitle) return;

    // Clear previous debounce
    if (this.dictionaryParams.debounceTimer) {
      clearTimeout(this.dictionaryParams.debounceTimer);
    }

    this.dictionaryParams.debounceTimer = setTimeout(async () => {
      const word = this.getWordAtPoint(event.clientX, event.clientY);
      if (word && /^[a-zA-Z]+$/.test(word) && word.length >= 2) {
        // Only lookup if tooltip not already showing for this word? 
        // For now, simple behavior: just show
        await this.performDictLookup(word, event.clientX, event.clientY);
      }
    }, 250); // 250ms debounce
  }

  getWordAtPoint(x, y) {
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = range.startContainer;
        const offset = range.startOffset;
        const text = textNode.textContent;

        // Improve word boundary detection
        // Search backwards from offset
        let start = offset;
        while (start > 0 && this.isWordChar(text[start - 1])) {
          start--;
        }

        // Search forwards from offset
        let end = offset;
        while (end < text.length && this.isWordChar(text[end])) {
          end++;
        }

        // If cursor was exactly between words or on non-word char, we might get empty or invalid
        if (start < end) {
          return text.slice(start, end);
        }
      }
    }
    return null;
  }

  isWordChar(char) {
    return /[a-zA-Z]/.test(char);
  }

  async performDictLookup(word, x, y) {
    // Show loading state
    this.dictionaryParams.ui.showLoading(x, y);

    const data = await this.dictionaryParams.lookup.lookup(word);

    // Spec says: if found or 404 (handled in lookup returning found:false)
    if (data) {
      // Check if UI needs to be closed/updated
      this.dictionaryParams.ui.show(x, y, data, this.dictShowPhonetic);
    }
  }
}

// Initialization
if (window.location.hostname === 'www.youtube.com') {
  const translator = new YouTubeSubtitleTranslator();

  // Handle SPA navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('/watch')) {
        setTimeout(() => translator.start(), 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });
}
