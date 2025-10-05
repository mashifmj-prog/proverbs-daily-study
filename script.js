// Proverbs Daily Study — script.js

const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');
const chapterText = document.getElementById('chapterText');
const footerNote = document.getElementById('footerNote');
const translationSelect = document.getElementById('translationSelect');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKey');
let chapters = {}; // { '5_web': ['1: verse1', ...] }
let explanations = {}; // Cache: { '5_web_verse1': 'explanation text' }
let reflections = {}; // Cache: { '5_web': 'reflection text' }
let currentVerse = "";
let currentChapter = null;
let currentTranslation = 'web';

// Translation map
const translations = {
  web: 'World English Bible (WEB)',
  kjv: 'King James Version (KJV)',
  asv: 'American Standard Version (ASV)',
  bbe: 'Bible in Basic English (BBE)',
  ceb: 'Common English Bible (CEB)',
  ylt: 'Young\'s Literal Translation (YLT)'
};

// Grok API config
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_MODEL = 'grok-3-mini'; // Cost-efficient for short outputs

// Get API key
function getApiKey() {
  return localStorage.getItem('grokApiKey') || '';
}

// Save API key
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem('grokApiKey', key);
    alert('API key saved! Refresh for new content.');
    apiKeyInput.value = '';
  } else {
    alert('Please enter a valid key.');
  }
});

// Load saved key on init
apiKeyInput.value = getApiKey();

// Call Grok API
async function callGrok(prompt, cacheKey) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key required. Add via settings.');
  }
  if (explanations[cacheKey] || reflections[cacheKey]) {
    return explanations[cacheKey] || reflections[cacheKey];
  }
  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150, // Keep concise
        temperature: 0.7
      })
    });
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    const output = data.choices[0].message.content.trim();
    if (cacheKey.startsWith('verse_')) {
      explanations[cacheKey] = output;
    } else {
      reflections[cacheKey] = output;
    }
    return output;
  } catch (err) {
    console.error('Grok API error:', err);
    throw err;
  }
}

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

// Fetch and cache chapter with translation
async function loadChapter(ch, trans = currentTranslation) {
  const key = `${ch}_${trans}`;
  const baseURL = `https://bible-api.com/proverbs ${ch}?translation=${trans}`;
  let cachedData = null;
  if ('caches' in window) {
    const cache = await caches.open('proverbs-cache-v1');
    const match = await cache.match(baseURL);
    if (match) cachedData = await match.json();
  }
  if (cachedData) {
    processChapter(cachedData, ch, trans);
    return;
  }
  chapterText.innerHTML = '<p class="loading">Loading chapter…</p>';
  try {
    const res = await fetch(baseURL);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    processChapter(data, ch, trans);
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

function processChapter(data, ch, trans) {
  const verses = data.verses.map(v => `${v.verse}: ${v.text}`);
  chapters[`${ch}_${trans}`] = verses;
  renderChapter(ch, trans);
}

// Render a chapter
function renderChapter(ch, trans) {
  currentChapter = ch;
  currentTranslation = trans;
  const key = `${ch}_${trans}`;
  const chData = chapters[key];
  document.getElementById('chapterTitle').textContent = `Proverbs — Chapter ${ch}`;
  document.getElementById('chapterNumber').textContent = `Chapter ${ch}`;
  document.getElementById('chapterDate').textContent = getEffectiveDate().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  footerNote.textContent = `Translation: ${translations[trans]} (Public Domain). Loaded dynamically.`;
  chapterText.innerHTML = '';
  if (!chData) {
    chapterText.innerHTML = '<p class="loading">Loading chapter…</p>';
    return;
  }
  chData.forEach(v => {
    const p = document.createElement('p');
    p.textContent = v;
    chapterText.appendChild(p);
  });
  // Check for cached reflection
  const refKey = `reflection_${key}`;
  if (reflections[refKey]) {
    document.getElementById('reflectionText').textContent = reflections[refKey];
    document.getElementById('toggleReflection').textContent = 'Hide';
  }
}

// Random verse
function pickRandomVerse(ch, trans) {
  const key = `${ch}_${trans}`;
  const chData = chapters[key];
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
  if (!currentChapter || !currentTranslation) return;
  const verse = pickRandomVerse(currentChapter, currentTranslation);
  if (!verse) return;
  currentVerse = verse;
  document.getElementById('randomVerseArea').classList.remove('hidden');
  document.getElementById('randomVerseText').textContent = verse;
  document.getElementById('verseExplanationArea').classList.add('hidden'); // Reset
  // Highlight in chapter
  document.querySelectorAll('#chapterText p').forEach(p => {
    p.classList.toggle('highlight', p.textContent === verse);
  });
});

document.getElementById('closeRandom').addEventListener('click', () => {
  document.getElementById('randomVerseArea').classList.add('hidden');
  document.querySelectorAll('#chapterText p').forEach(p => p.classList.remove('highlight'));
});

document.getElementById('explainVerseBtn').addEventListener('click', async () => {
  if (!currentVerse) return;
  const explArea = document.getElementById('verseExplanationArea');
  const explText = document.getElementById('explanationText');
  const key = `verse_${btoa(currentVerse)}_${currentTranslation}`; // Simple cache key
  explArea.classList.remove('hidden');
  explText.classList.add('loading');
  explText.textContent = 'Generating explanation...';
  try {
    const prompt = `Explain this Proverbs verse in exactly 3 concise lines, focusing on its wisdom, historical context, and modern application: "${currentVerse}"`;
    const explanation = await callGrok(prompt, key);
    explText.classList.remove('loading');
    explText.innerHTML = explanation.split('\n').map(line => `<p>${line}</p>`).join('');
  } catch (err) {
    explText.classList.remove('loading');
    explText.textContent = err.message;
  }
});

document.getElementById('copyVerseBtn').addEventListener('click', () => {
  if (currentVerse) copyToClipboard(currentVerse);
});

document.getElementById('copyChapterBtn').addEventListener('click', () => {
  if (!currentChapter || !currentTranslation) return;
  const key = `${currentChapter}_${currentTranslation}`;
  const data = chapters[key];
  if (data) copyToClipboard(data.join('\n'));
});

document.getElementById('chapterReflectionBtn').addEventListener('click', async () => {
  if (!currentChapter || !currentTranslation) return;
  const refArea = document.getElementById('chapterReflectionArea');
  const refText = document.getElementById('reflectionText');
  const toggleBtn = document.getElementById('toggleReflection');
  const key = `reflection_${currentChapter}_${currentTranslation}`;
  refArea.classList.remove('hidden');
  refText.classList.add('loading');
  refText.textContent = 'Generating reflection...';
  toggleBtn.textContent = 'Hide';
  try {
    const prompt = `Provide a concise 4-6 sentence reflection on Proverbs chapter ${currentChapter}, highlighting key themes, practical wisdom, and one modern takeaway. Keep it inspirational and educational.`;
    const reflection = await callGrok(prompt, key);
    refText.classList.remove('loading');
    refText.innerHTML = reflection.split('\n').map(line => `<p>${line}</p>`).join('');
  } catch (err) {
    refText.classList.remove('loading');
    refText.textContent = err.message;
  }
});

document.getElementById('toggleReflection').addEventListener('click', () => {
  const refArea = document.getElementById('chapterReflectionArea');
  const toggleBtn = document.getElementById('toggleReflection');
  if (refArea.classList.contains('hidden')) {
    refArea.classList.remove('hidden');
    toggleBtn.textContent = 'Hide';
  } else {
    refArea.classList.add('hidden');
    toggleBtn.textContent = 'Show';
  }
});

// Date override
document.getElementById('dateOverride').addEventListener('change', () => {
  const d = getEffectiveDate();
  localStorage.setItem('dateOverride', document.getElementById('dateOverride').value);
  const ch = getChapterForDate(d);
  loadChapter(ch, currentTranslation);
});

document.getElementById('todayBtn').addEventListener('click', () => {
  document.getElementById('dateOverride').value = '';
  localStorage.removeItem('dateOverride');
  const ch = getChapterForDate(new Date());
  loadChapter(ch, currentTranslation);
});

document.getElementById('chapterSelect').addEventListener('change', () => {
  const ch = parseInt(select.value);
  if (ch) loadChapter(ch, currentTranslation);
});

// Translation select
translationSelect.addEventListener('change', () => {
  currentTranslation = translationSelect.value;
  localStorage.setItem('translation', currentTranslation);
  if (currentChapter) {
    loadChapter(currentChapter, currentTranslation);
  }
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
  const storedTrans = localStorage.getItem('translation') || 'web';
  translationSelect.value = storedTrans;
  currentTranslation = storedTrans;
  if (storedDate) {
    document.getElementById('dateOverride').value = storedDate;
  }
  const initialCh = getChapterForDate(getEffectiveDate());
  await loadChapter(initialCh, currentTranslation);
}
init();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.error('SW registration failed:', err));
  });
}
