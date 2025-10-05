// Proverbs Daily Study — script.js

const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');
const chapterText = document.getElementById('chapterText');
const footerNote = document.getElementById('footerNote');
const translationSelect = document.getElementById('translationSelect');
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

// DeepSeek API config (free via OpenRouter)
const DEEPSEEK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1:free'; // Free tier model

// Call DeepSeek API (no key needed for free tier)
async function callDeepSeek(prompt, cacheKey) {
  // Check cache first
  if (explanations[cacheKey] || reflections[cacheKey]) {
    return explanations[cacheKey] || reflections[cacheKey];
  }
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin, // Optional for OpenRouter
        'X-Title': 'Proverbs Daily Study' // Optional
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150, // Keep concise
        temperature: 0.7
      })
    });
    if (!response.ok) {
      if (response.status >= 429) throw new Error('Free tier limit reached—try again tomorrow.');
      throw new Error('API request failed—check connection.');
    }
    const data = await response.json();
    const output = data.choices[0].message.content.trim();
    if (cacheKey.startsWith('verse_')) {
      explanations[cacheKey] = output;
    } else {
      reflections[cacheKey] = output;
    }
    return output;
  } catch (err) {
    console.error('DeepSeek API error:', err);
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

// Fetch chapter (no caching)
async function loadChapter(ch, trans = currentTranslation) {
  const baseURL = `https://bible-api.com/proverbs ${ch}?translation=${trans}`;
  chapterText.innerHTML = '<p class="loading">Loading chapter…</p>';
  try {
    const res = await fetch(baseURL);
    if (!res.ok) throw new Error('Fetch failed');
    const data = await res.json();
    processChapter(data, ch, trans);
  } catch (err) {
    console.error('Failed to fetch chapter:', err);
    chapterText.innerHTML = '<p>Error loading chapter. Please check your internet connection and try again.</p>';
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
    const explanation = await callDeepSeek(prompt, key);
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
  const refText = document.getElementById('reflectionText
