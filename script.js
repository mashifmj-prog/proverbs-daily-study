// Proverbs Daily Study — script.js (Fixed for GitHub Pages & Error Handling)

const dateElem = document.getElementById('liveDate');
const clockElem = document.getElementById('liveClock');
const chapterText = document.getElementById('chapterText');
const footerNote = document.getElementById('footerNote');
const translationSelect = document.getElementById('translationSelect');
let chapters = {}; // { '5_web': [{text: '...', reference: '5:1'}, ...] }
let explanations = {}; // Cache: { 'verse_5:1_web': 'explanation text' }
let reflections = {}; // Cache: { 'reflection_5_web': 'reflection text' }
let currentVerse = "";
let currentChapter = null;
let currentTranslation = 'web';

// Translation map (only WEB for now to avoid errors)
const translations = {
  web: 'World English Bible (WEB)'
};

// DeepSeek API config (free via OpenRouter) - Note: Requires API key; placeholder for now
const DEEPSEEK_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek/deepseek-r1:free'; // Free tier model

// Call DeepSeek API (no key needed for free tier - but update if you have one)
async function callDeepSeek(prompt, cacheKey) {
  // Check cache first
  const storedExplanations = JSON.parse(localStorage.getItem('explanations') || '{}');
  const storedReflections = JSON.parse(localStorage.getItem('reflections') || '{}');
  if (explanations[cacheKey] || storedExplanations[cacheKey] || reflections[cacheKey] || storedReflections[cacheKey]) {
    const output = explanations[cacheKey] || storedExplanations[cacheKey] || reflections[cacheKey] || storedReflections[cacheKey];
    return output;
  }
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Proverbs Daily Study'
        // Add 'Authorization': 'Bearer YOUR_API_KEY' if needed for OpenRouter
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
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
      localStorage.setItem('explanations', JSON.stringify({ ...storedExplanations, [cacheKey]: output }));
    } else {
      reflections[cacheKey] = output;
      localStorage.setItem('reflections', JSON.stringify({ ...storedReflections, [cacheKey]: output }));
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
  return Math.min(day, lastDay, 31); // Cap at 31 for Proverbs
}

// Load chapter from bundled JSON (with localStorage cache) - FIXED jsonFile logic
async function loadChapter(ch, trans = currentTranslation) {
  // FIXED: Always use WEB path since only WEB is supported; prevent null
  const jsonFile = '/web-proverbs.json'; // Absolute path for GitHub Pages
  const cacheKey = `chapters_${trans}`;
  chapterText.innerHTML = '<p class="loading">Loading chapter…</p>';

  // Try localStorage cache first (offline fallback)
  const cachedChapters = JSON.parse(localStorage.getItem(cacheKey) || '{}');
  if (cachedChapters[ch]) {
    chapters[`${ch}_${trans}`] = cachedChapters[ch].verses;
    renderChapter(ch, trans);
    return;
  }

  // Fallback sample data if offline or no cache (prevents blank page)
  if (!navigator.onLine) {
    console.warn('Offline: Using fallback sample data for Chapter 1');
    chapters[`${ch}_${trans}`] = getSampleChapterData(ch); // Define below
    renderChapter(ch, trans);
    return;
  }

  try {
    const res = await fetch(jsonFile);
    if (!res.ok) throw new Error(`Failed to load ${jsonFile}: ${res.status} ${res.statusText}. Ensure file is deployed to repo root.`);
    const data = await res.json();
    const chapterData = data.chapters[ch.toString()];
    if (!chapterData || !chapterData.verses || chapterData.verses.length === 0) {
      throw new Error(`Chapter ${ch} not found or empty in ${jsonFile}.`);
    }
    
    chapters[`${ch}_${trans}`] = chapterData.verses;
    // Cache full translation if not already
    localStorage.setItem(cacheKey, JSON.stringify(data.chapters));
    renderChapter(ch, trans);
  } catch (err) {
    console.error('Failed to load chapter:', err);
    // Fallback to sample data on error
    chapters[`${ch}_${trans}`] = getSampleChapterData(ch);
    renderChapter(ch, trans);
    chapterText.innerHTML += `<p style="color: red; font-size: 0.9em;"><strong>Debug:</strong> ${err.message}. Using sample data. Check console (F12) for details.</p>`;
  }
}

// Sample fallback data for Chapter 1 (WEB) - embed to avoid total failure
function getSampleChapterData(ch) {
  if (ch === 1) {
    return [
      { "text": "The proverbs of Solomon, son of David, king of Israel:", "reference": "1:1" },
      { "text": "To know wisdom and instruction; to discern the words of understanding;", "reference": "1:2" },
      { "text": "To receive instruction in wise dealing, in righteousness, justice, and equity;", "reference": "1:3" },
      // Add more verses as needed; this is just a sample
      { "text": "The fear of Yahweh is the beginning of knowledge. The foolish despise wisdom and instruction.", "reference": "1:7" },
      { "text": "But whoever listens to me will dwell securely, in safety, without fear of harm.", "reference": "1:33" }
    ];
  }
  // For other chapters, return empty or generic
  return [{ "text": `Sample verse for Chapter ${ch}: Seek wisdom daily.`, "reference": `${ch}:1` }];
}

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
  if (!chData || chData.length === 0) {
    chapterText.innerHTML = '<p class="loading">Chapter data not available yet. Using sample content below.</p>';
    // Add sample if empty
    chData.push({ "text": `Reflect on Chapter ${ch}: Wisdom begins with the fear of the Lord.`, "reference": `${ch}:1` });
  }
  chData.forEach(verse => {
    const p = document.createElement('p');
    p.className = 'verse';
    p.innerHTML = `<sup>${verse.reference.split(':')[1]}</sup> ${verse.text}`;
    chapterText.appendChild(p);
  });
  // Check for cached reflection
  const refKey = `reflection_${key}`;
  const storedReflections = JSON.parse(localStorage.getItem('reflections') || '{}');
  if (reflections[refKey] || storedReflections[refKey]) {
    document.getElementById('reflectionText').innerHTML = (reflections[refKey] || storedReflections[refKey]).split('\n').map(line => `<p>${line}</p>`).join('');
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
  const verseObj = pickRandomVerse(currentChapter, currentTranslation);
  if (!verseObj) return;
  currentVerse = `${verseObj.reference}: ${verseObj.text}`;
  document.getElementById('randomVerseArea').classList.remove('hidden');
  document.getElementById('randomVerseText').innerHTML = `<sup>${verseObj.reference.split(':')[1]}</sup> ${verseObj.text}`;
  document.getElementById('verseExplanationArea').classList.add('hidden'); // Reset
  // Highlight in chapter
  document.querySelectorAll('#chapterText .verse').forEach(p => {
    p.classList.toggle('highlight', p.innerHTML.includes(verseObj.text));
  });
});

document.getElementById('closeRandom').addEventListener('click', () => {
  document.getElementById('randomVerseArea').classList.add('hidden');
  document.querySelectorAll('#chapterText .verse').forEach(p => p.classList.remove('highlight'));
  document.getElementById('verseExplanationArea').classList.add('hidden');
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
  if (data) {
    const fullText = data.map(v => `${v.reference}: ${v.text}`).join('\n');
    copyToClipboard(fullText);
  }
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
    const chapterVerses = chapters[key].map(v => `${v.reference}: ${v.text}`).join(' ');
    const prompt = `Provide a concise 4-6 sentence reflection on Proverbs chapter ${currentChapter}, highlighting key themes, practical wisdom, and one modern takeaway. Keep it inspirational and educational. Chapter text: ${chapterVerses.substring(0, 1500)}...`;
    const reflection = await callDeepSeek(prompt, key);
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
  const ch = parseInt(document.getElementById('chapterSelect').value);
  if (ch) loadChapter(ch, currentTranslation);
});

// Translation select (limited to WEB)
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

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  });
}
