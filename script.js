// Proverbs Daily Study — script.js
const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');
let proverbs = [];
let currentVerse = "";

// Live date and clock
function updateDateTime() {
  const now = new Date();
  dateElem.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  clockElem.textContent = now.toLocaleTimeString();
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Determine date and chapter
function getEffectiveDate() {
  const val = document.getElementById('dateOverride').value;
  if (val) return new Date(val + 'T00:00:00');
  return new Date();
}

function getChapterForDate(d) {
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = d.getDate();
  return Math.min(day, lastDay);
}

// Render a chapter
function renderChapter(ch) {
  const chData = proverbs[ch];
  document.getElementById('chapterTitle').textContent = `Proverbs — Chapter ${ch}`;
  document.getElementById('chapterNumber').textContent = `Chapter ${ch}`;
  document.getElementById('chapterDate').textContent = getEffectiveDate().toDateString();

  const chapterText = document.getElementById('chapterText');
  chapterText.innerHTML = '';
  if (!chData) {
    chapterText.innerHTML = '<p>Loading Proverbs data…</p>';
    return;
  }

  chData.forEach(v => {
    const p = document.createElement('p');
    p.textContent = v;
    chapterText.appendChild(p);
  });
}

// Random verse
function pickRandomVerse(ch) {
  const chData = proverbs[ch];
  if (!chData || !chData.length) return null;
  return chData[Math.floor(Math.random() * chData.length)];
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

// Load Proverbs JSON with cache support
async function loadProverbs() {
  const URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/WEB/proverbs.json';
  let cachedData = null;

  if ('caches' in window) {
    const cache = await caches.open('proverbs-cache-v1');
    const match = await cache.match(URL);
    if (match) cachedData = await match.json();
  }

  if (cachedData) processProverbs(cachedData);

  try {
    const res = await fetch(URL);
    const data = await res.json();
    processProverbs(data);
    if ('caches' in window) {
      const cache = await caches.open('proverbs-cache-v1');
      cache.put(URL, new Response(JSON.stringify(data)));
    }
  } catch (err) {
    console.error('Failed to fetch Proverbs JSON:', err);
    if (!cachedData) document.getElementById('chapterText').innerHTML =
      '<p>Error loading Proverbs. Please check your internet connection.</p>';
  }
}

// Process JSON
function processProverbs(data) {
  proverbs = [null];
  data.chapters.forEach(ch => {
    const verses = ch.map((v, i) => `${i + 1}: ${v}`);
    proverbs.push(verses);
  });
  renderChapter(getChapterForDate(new Date()));
}

// Event listeners
document.getElementById('randomVerseBtn').addEventListener('click', () => {
  const ch = getChapterForDate(getEffectiveDate());
  const verse = pickRandomVerse(ch);
  if (!verse) return;
  currentVerse = verse;
  document.getElementById('randomVerseArea').classList.remove('hidden');
  document.getElementById('randomVerseText').textContent = verse;
});

// Copy verse
document.getElementById('copyVerseBtn').addEventListener('click', () => {
  if (currentVerse) copyToClipboard(currentVerse);
});

// Copy chapter
document.getElementById('copyChapterBtn').addEventListener('click', () => {
  const ch = getChapterForDate(getEffectiveDate());
  const data = proverbs[ch];
  if (data) copyToClipboard(data.join('\n'));
});

// Date override
document.getElementById('applyDate').addEventListener('click', () => {
  renderChapter(getChapterForDate(getEffectiveDate()));
});
document.getElementById('todayBtn').addEventListener('click', () => {
  document.getElementById('dateOverride').value = '';
  renderChapter(getChapterForDate(new Date()));
});

// Share buttons
document.getElementById('shareNative').addEventListener('click', async () => {
  if (navigator.share && currentVerse) {
    try {
      await navigator.share({ text: currentVerse });
    } catch (err) {
      alert('Share cancelled or failed');
    }
  } else alert('Native share not supported');
});

document.getElementById('shareWhatsApp').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://wa.me/?text=${encodeURIComponent(currentVerse)}`;
  window.open(url, '_blank');
});

document.getElementById('shareTwitter').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentVerse)}`;
  window.open(url, '_blank');
});

document.getElementById('shareFacebook').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://www.facebook.com/sharer/sharer.php?u=&quote=${encodeURIComponent(currentVerse)}`;
  window.open(url, '_blank');
});

// Load Proverbs and register service worker
loadProverbs();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker registered.', reg))
      .catch(err => console.error('SW registration failed:', err));
  });
}
