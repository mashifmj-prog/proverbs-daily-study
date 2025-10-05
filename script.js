// Proverbs Daily Study — script.js

const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');
const chapterText = document.getElementById('chapterText');
let chapters = {}; // Object to store fetched chapters: {1: ['1: verse1', '2: verse2', ...], ...}
let currentVerse = "";
let currentChapter = null;

// Live date and clock
function updateDateTime() {
  const now = new Date();
  dateElem.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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

// Fetch and cache chapter
async function loadChapter(ch) {
  const baseURL = `https://bible-api.com/proverbs ${ch}?translation=web`;
  let cachedData = null;
  if ('caches' in window) {
    const cache = await caches.open('proverbs-cache-v1');
    const match = await cache.match(baseURL);
    if (match) cachedData = await match.json();
  }
  if (cachedData) {
    processChapter(cachedData, ch);
    return; // Render from cache, but still try fresh fetch in background
  }
  chapterText.innerHTML = '<p>Loading chapter…</p>';
  try {
    const res = await fetch(baseURL);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    processChapter(data, ch);
    if ('caches' in window) {
      const cache = await caches.open('proverbs-cache-v1');
      cache.put(baseURL, new Response(JSON.stringify(data)));
    }
  } catch (err) {
    console.error('Failed to fetch chapter:', err);
    if (!cachedData) {
      chapterText.innerHTML = '<p>Error loading chapter. Please check your internet connection and try again.</p>';
    }
  }
}

function processChapter(data, ch) {
  const verses = data.verses.map(v => `${v.verse}: ${v.text}`);
  chapters[ch] = verses;
  renderChapter(ch);
}

// Render a chapter
function renderChapter(ch) {
  currentChapter = ch;
  const chData = chapters[ch];
  document.getElementById('chapterTitle').textContent = `Proverbs — Chapter ${ch}`;
  document.getElementById('chapterNumber').textContent = `Chapter ${ch}`;
  document.getElementById('chapterDate').textContent = getEffectiveDate().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  chapterText.innerHTML = '';
  if (!chData) {
    chapterText.innerHTML = '<p>Loading chapter…</p>';
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
  const chData = chapters[ch];
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

// Populate chapter select
const select = document.getElementById('chapterSelect');
for (let i = 1; i <= 31; i++) {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `Chapter ${i}`;
  select.appendChild(opt);
}

// Event listeners
document.getElementById('randomVerseBtn').addEventListener('click', () => {
  if (!currentChapter) return;
  const verse = pickRandomVerse(currentChapter);
  if (!verse) return;
  currentVerse = verse;
  document.getElementById('randomVerseArea').classList.remove('hidden');
  document.getElementById('randomVerseText').textContent = verse;
  // Highlight in chapter
  document.querySelectorAll('#chapterText p').forEach(p => {
    p.classList.toggle('highlight', p.textContent === verse);
  });
});

document.getElementById('closeRandom').addEventListener('click', () => {
  document.getElementById('randomVerseArea').classList.add('hidden');
  document.querySelectorAll('#chapterText p').forEach(p => p.classList.remove('highlight'));
});

document.getElementById('copyVerseBtn').addEventListener('click', () => {
  if (currentVerse) copyToClipboard(currentVerse);
});

document.getElementById('copyChapterBtn').addEventListener('click', () => {
  if (!currentChapter) return;
  const data = chapters[currentChapter];
  if (data) copyToClipboard(data.join('\n'));
});

// Date override
document.getElementById('dateOverride').addEventListener('change', () => {
  const d = getEffectiveDate();
  localStorage.setItem('dateOverride', document.getElementById('dateOverride').value);
  const ch = getChapterForDate(d);
  loadChapter(ch);
});

document.getElementById('todayBtn').addEventListener('click', () => {
  document.getElementById('dateOverride').value = '';
  localStorage.removeItem('dateOverride');
  const ch = getChapterForDate(new Date());
  loadChapter(ch);
});

document.getElementById('chapterSelect').addEventListener('change', () => {
  const ch = parseInt(select.value);
  if (ch) loadChapter(ch);
});

// Share buttons
document.getElementById('shareNative').addEventListener('click', async () => {
  if (navigator.share && currentVerse) {
    try {
      await navigator.share({
        title: 'Proverbs Random Verse',
        text: currentVerse,
        url: window.location.href
      });
    } catch (err) {
      alert('Share cancelled or failed');
    }
  } else alert('Native share not supported');
});

document.getElementById('shareWhatsApp').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://wa.me/?text=${encodeURIComponent(currentVerse + '\n\nFrom Proverbs Daily Study: ' + window.location.href)}`;
  window.open(url, '_blank');
});

document.getElementById('shareTwitter').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(currentVerse)}&url=${encodeURIComponent(window.location.href)}`;
  window.open(url, '_blank');
});

document.getElementById('shareFacebook').addEventListener('click', () => {
  if (!currentVerse) return;
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(currentVerse)}`;
  window.open(url, '_blank');
});

// Initial load
async function init() {
  const storedDate = localStorage.getItem('dateOverride');
  if (storedDate) {
    document.getElementById('dateOverride').value = storedDate;
  }
  const initialCh = getChapterForDate(getEffectiveDate());
  await loadChapter(initialCh);
}
init();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.error('SW registration failed:', err));
  });
}
