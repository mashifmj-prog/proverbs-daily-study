// Proverbs Daily Study — script.js

const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');

const translationSelect = document.getElementById('translationSelect');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const toggleParallelBtn = document.getElementById('toggleParallelBtn');

const chapterPane1 = document.getElementById('chapterPane1');
const chapterPane2 = document.getElementById('chapterPane2');
const randomVerseArea = document.getElementById('randomVerseArea');
const randomVerseText = document.getElementById('randomVerseText');

// Buttons
const randomVerseBtn = document.getElementById('randomVerseBtn');
const copyChapterBtn = document.getElementById('copyChapterBtn');
const shareNativeBtn = document.getElementById('shareNative');
const shareWhatsAppBtn = document.getElementById('shareWhatsApp');
const shareTwitterBtn = document.getElementById('shareTwitter');
const shareFacebookBtn = document.getElementById('shareFacebook');
const copyVerseBtn = document.getElementById('copyVerseBtn');

let proverbsByTranslation = {};  // { "WEB": [chapters], "KJV": ..., etc. }
let currentTranslation = localStorage.getItem('translation') || 'WEB';
let parallelTranslation = null;  // second translation when in parallel mode
let useParallel = false;

let currentVerse = "";  // stores the verse text (active translation version)

// Live date and time
function updateDateTime() {
  const now = new Date();
  dateElem.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  clockElem.textContent = now.toLocaleTimeString();
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Date / chapter logic
function getEffectiveDate() {
  const val = document.getElementById('dateOverride').value;
  return val ? new Date(val + 'T00:00:00') : new Date();
}

function getChapterForDate(d) {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = d.getDate();
  return Math.min(day, lastDay);
}

// Build URL or fetch logic for translation
function getProverbsURLFor(trans) {
  switch (trans) {
    case 'KJV':
      return 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/KJV/proverbs.json';
    case 'NIV':
      return 'https://example.com/json/NIV/proverbs.json';  // you must host or fetch NIV
    case 'ESV':
      return 'https://example.com/json/ESV/proverbs.json';
    case 'NLT':
      return 'NLT_API';  // indicates to use API
    case 'WEB':
    default:
      return 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/WEB/proverbs.json';
  }
}

// Fetch / load for a translation (with caching)
async function loadTranslation(trans) {
  if (proverbsByTranslation[trans]) return;  // already loaded

  const url = getProverbsURLFor(trans);

  // For versions fetched via API (e.g. NLT):
  if (trans === 'NLT') {
    // For NLT, fetch via API based on chapter-by-chapter calls, for example:
    proverbsByTranslation[trans] = [null];
    for (let ch = 1; ch <= 31; ch++) {
      try {
        const res = await fetch(`https://api.nlt.to/api/passages?ref=Proverbs.${ch}&key=YOUR_KEY`);
        const htmlText = await res.text();
        // You need to parse HTML into plain verses array
        const verses = parseNLTfromHTML(htmlText);  
        proverbsByTranslation[trans][ch] = verses;
      } catch (err) {
        console.error('NLT fetch error for chapter', ch, err);
        proverbsByTranslation[trans][ch] = null;
      }
    }
    return;
  }

  // For JSON file-based translations
  let cachedData = null;
  if ('caches' in window) {
    const cacheName = `proverbs-cache-${trans}`;
    const cache = await caches.open(cacheName);
    const match = await cache.match(url);
    if (match) cachedData = await match.json();
  }
  if (cachedData) {
    proverbsByTranslation[trans] = cachedData.chapters || cachedData;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    const chapters = data.chapters || data;  // may differ format
    proverbsByTranslation[trans] = chapters;

    if ('caches' in window) {
      const cacheName = `proverbs-cache-${trans}`;
      const cache = await caches.open(cacheName);
      cache.put(url, new Response(JSON.stringify(data)));
    }
  } catch (err) {
    console.error(`Failed to fetch translation ${trans}`, err);
    if (!cachedData) {
      // fallback UI
      proverbsByTranslation[trans] = null;
    }
  }
}

// Render a chapter in a pane (pane = 1 or 2)
function renderPane(paneElem, trans, ch) {
  paneElem.innerHTML = '';
  paneElem.classList.remove('show');

  const chapters = proverbsByTranslation[trans];
  if (!chapters || !chapters[ch]) {
    paneElem.innerHTML = '<p>Error loading this translation.</p>';
    return;
  }

  chapters[ch].forEach((v, i) => {
    const p = document.createElement('p');
    p.innerHTML = `<span class="verse-number">${i+1}:</span> ${v}`;
    paneElem.appendChild(p);
  });

  // fade-in
  requestAnimationFrame(() => paneElem.classList.add('show'));
}

// Render current chapter(s)
async function renderChapter() {
  const ch = getChapterForDate(getEffectiveDate());

  // Ensure current translation is loaded
  await loadTranslation(currentTranslation);
  renderPane(chapterPane1, currentTranslation, ch);

  if (useParallel && parallelTranslation) {
    chapterPane2.classList.remove('hidden');
    await loadTranslation(parallelTranslation);
    renderPane(chapterPane2, parallelTranslation, ch);
  } else {
    chapterPane2.classList.add('hidden');
  }

  // Update header text
  document.getElementById('chapterTitle').textContent =
    `Proverbs — Chapter ${ch} (${currentTranslation}${useParallel && parallelTranslation ? ' vs ' + parallelTranslation : ''})`;
  document.getElementById('chapterNumber').textContent = `Chapter ${ch}`;
  document.getElementById('chapterDate').textContent = getEffectiveDate().toDateString();
}

// Parse NLT HTML (very simplistic, you’ll need robust HTML parse logic)
function parseNLTfromHTML(htmlText) {
  // Example: get verse lines with <span class="vn"> and body text <span class="body">
  // This is just an illustrative stub:
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const verses = [];
  const verseElems = doc.querySelectorAll('verse_export');
  verseElems.forEach(ve => {
    const vn = ve.getAttribute('vn');
    const body = ve.querySelector('span.body');
    const text = body ? body.textContent : '';
    verses.push(`${vn}: ${text}`);
  });
  return verses;
}

// Pick random verse from active translation
function pickRandomVerse() {
  const ch = getChapterForDate(getEffectiveDate());
  const chapters = proverbsByTranslation[currentTranslation];
  if (!chapters || !chapters[ch]) return null;
  const arr = chapters[ch];
  const idx = Math.floor(Math.random() * arr.length);
  return { index: idx+1, text: arr[idx] };
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  } catch {
    alert('Copy failed. Please copy manually.');
  }
}

// Download all translations for offline
async function downloadAllTranslations() {
  const all = Array.from(translationSelect.options).map(o => o.value);
  for (const trans of all) {
    await loadTranslation(trans);
  }
  alert('All translations downloaded for offline.');
}

// Toggle parallel view
function toggleParallelMode() {
  useParallel = !useParallel;
  if (useParallel) {
    // pick a parallel translation different from current
    const sel = translationSelect.value;
    parallelTranslation = sel === 'WEB' ? 'KJV' : 'WEB';  // default fallback
    if (parallelTranslation === currentTranslation) parallelTranslation = 'KJV';
  } else {
    parallelTranslation = null;
  }
  renderChapter();
}

// Event listeners
translationSelect.addEventListener('change', async (e) => {
  currentTranslation = e.target.value;
  localStorage.setItem('translation', currentTranslation);
  await renderChapter();
});

downloadAllBtn.addEventListener('click', downloadAllTranslations);

toggleParallelBtn.addEventListener('click', toggleParallelMode);

document.getElementById('applyDate').addEventListener('click', () => renderChapter());
document.getElementById('todayBtn').addEventListener('click', () => {
  document.getElementById('dateOverride').value = '';
  renderChapter();
});

randomVerseBtn.addEventListener('click', () => {
  const rv = pickRandomVerse();
  if (!rv) return;
  currentVerse = rv.text;
  randomVerseArea.classList.remove('hidden');
  randomVerseText.innerHTML = `<span class="verse-number">${rv.index}:</span> ${rv.text}`;
  randomVerseArea.focus();
});

copyVerseBtn.addEventListener('click', () => {
  if (currentVerse) copyToClipboard(currentVerse);
});

copyChapterBtn.addEventListener('click', () => {
  const ch = getChapterForDate(getEffectiveDate());
  const chap = proverbsByTranslation[currentTranslation]?.[ch];
  if (chap) copyToClipboard(chap.join('\n'));
});

shareNativeBtn.addEventListener('click', async () => {
  if (navigator.share && currentVerse) {
    try { await navigator.share({ text: currentVerse }); }
    catch { alert('Share cancelled or failed'); }
  } else alert('Native share not supported');
});

shareWhatsAppBtn.addEventListener('click', () => {
  if (!currentVerse) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(currentVerse)}`, '_blank', 'noopener,noreferrer');
});

shareTwitterBtn.addEventListener('click', () => {
  if (!currentVerse) return;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(currentVerse)}`, '_blank', 'noopener,noreferrer');
});

shareFacebookBtn.addEventListener('click', () => {
  if (!currentVerse) return;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=&quote=${encodeURIComponent(currentVerse)}`, '_blank', 'noopener,noreferrer');
});

// On load
window.addEventListener('load', () => {
  renderChapter();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('SW registered', reg))
      .catch(err => console.error('SW registration failed', err));
  }
});
