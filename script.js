const chapterText = document.getElementById('chapterText');
const footerNote = document.getElementById('footerNote');
const chapterSelect = document.getElementById('chapterSelect');
const translationSelect = document.getElementById('translationSelect');
const dateOverride = document.getElementById('dateOverride');
const todayBtn = document.getElementById('todayBtn');
const liveDate = document.getElementById('liveDate');
const liveClock = document.getElementById('liveClock');
const randomVerseBtn = document.getElementById('randomVerseBtn');
const copyChapterBtn = document.getElementById('copyChapterBtn');
const chapterReflectionBtn = document.getElementById('chapterReflectionBtn');
const chapterReflectionArea = document.getElementById('chapterReflectionArea');
const reflectionText = document.getElementById('reflectionText');
const toggleReflection = document.getElementById('toggleReflection');
const randomVerseArea = document.getElementById('randomVerseArea');
const randomVerseText = document.getElementById('randomVerseText');
const explainVerseBtn = document.getElementById('explainVerseBtn');
const verseExplanationArea = document.getElementById('verseExplanationArea');
const explanationText = document.getElementById('explanationText');
const closeRandom = document.getElementById('closeRandom');
const shareNative = document.getElementById('shareNative');
const shareWhatsApp = document.getElementById('shareWhatsApp');
const shareTwitter = document.getElementById('shareTwitter');
const shareFacebook = document.getElementById('shareFacebook');
const copyVerseBtn = document.getElementById('copyVerseBtn');

let currentChapter = null;
let currentTranslation = 'web';
let currentRandomVerse = null;
let chapters = {};
const translations = { web: 'World English Bible (WEB)' };

function setChapterSelectOptions() {
  chapterSelect.innerHTML = '<option value="">Auto</option>';
  for (let i = 1; i <= 31; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Chapter ${i}`;
    chapterSelect.appendChild(option);
  }
}

function getEffectiveDate() {
  return dateOverride.value ? new Date(dateOverride.value) : new Date();
}

function updateDateTime() {
  const now = new Date();
  liveDate.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  liveClock.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

async function loadChapter(ch, trans = currentTranslation) {
  const jsonFile = '/web-proverbs.json'; // Absolute path for GitHub Pages
  const cacheKey = `chapters_${trans}`;
  chapterText.innerHTML = '<p class="loading">Loading chapter…</p>';

  // Try localStorage cache first
  const cachedChapters = JSON.parse(localStorage.getItem(cacheKey) || '{}');
  if (cachedChapters[ch]) {
    chapters[`${ch}_${trans}`] = cachedChapters[ch].verses;
    renderChapter(ch, trans);
    return;
  }

  try {
    if (!navigator.onLine) throw new Error('Offline: Please connect to the internet to load chapters.');
    const res = await fetch(jsonFile);
    if (!res.ok) throw new Error(`Failed to load ${jsonFile}: ${res.status} ${res.statusText}`);
    const data = await res.json();
    const chapterData = data.chapters[ch.toString()];
    if (!chapterData || !chapterData.verses) {
      throw new Error(`Chapter ${ch} data missing or incomplete.`);
    }
    chapters[`${ch}_${trans}`] = chapterData.verses;
    localStorage.setItem(cacheKey, JSON.stringify(data.chapters));
    renderChapter(ch, trans);
  } catch (err) {
    console.error('Failed to load chapter:', err);
    chapterText.innerHTML = `<p>Error loading chapter ${ch}: ${err.message}. Try refreshing or check your connection. <button onclick="location.reload()">Retry</button></p>`;
  }
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
    chapterText.innerHTML = '<p>Chapter data coming soon! For now, reflect on previous chapters or select an earlier date.</p>';
    return;
  }
  chData.forEach(verse => {
    const p = document.createElement('p');
    p.className = 'verse';
    p.innerHTML = `<sup>${verse.reference.split(':')[1]}</sup> ${verse.text}`;
    chapterText.appendChild(p);
  });
  chapterText.focus();
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function getReflection(ch) {
  try {
    const res = await fetchWithTimeout('https://api.openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-or-v1-xxx' },
      body: JSON.stringify({
        model: 'deepseek',
        messages: [{ role: 'user', content: `Provide a concise reflection (2-3 sentences) on Proverbs chapter ${ch} from the Bible, focusing on its key themes and how they apply to daily life.` }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error('Failed to fetch reflection:', err);
    return 'Unable to load reflection. Please try again later.';
  }
}

async function getVerseExplanation(verse) {
  try {
    const res = await fetchWithTimeout('https://api.openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer sk-or-v1-xxx' },
      body: JSON.stringify({
        model: 'deepseek',
        messages: [{ role: 'user', content: `Explain the meaning of Proverbs ${verse.reference} (“${verse.text}”) in 2-3 sentences, focusing on its practical application.` }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error('Failed to fetch explanation:', err);
    return 'Unable to load explanation. Please try again later.';
  }
}

function pickRandomVerse() {
  const verses = chapters[`${currentChapter}_${currentTranslation}`];
  if (!verses || verses.length === 0) {
    randomVerseText.textContent = 'No verses available for this chapter.';
    randomVerseArea.classList.remove('hidden');
    return;
  }
  currentRandomVerse = verses[Math.floor(Math.random() * verses.length)];
  randomVerseText.textContent = `${currentRandomVerse.reference}: ${currentRandomVerse.text}`;
  randomVerseArea.classList.remove('hidden');
  verseExplanationArea.classList.add('hidden');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert('Text copied to clipboard!')).catch(err => alert('Failed to copy text: ' + err));
}

function shareVerse(platform) {
  if (!currentRandomVerse) return;
  const text = `Proverbs ${currentRandomVerse.reference} (${translations[currentTranslation]}): ${currentRandomVerse.text}`;
  const url = encodeURIComponent(window.location.href);
  const encodedText = encodeURIComponent(text);
  let shareUrl = '';
  switch (platform) {
    case 'whatsapp':
      shareUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodedText}`;
      break;
    case 'native':
      if (navigator.share) {
        navigator.share({ title: 'Proverbs — Daily Study', text, url }).catch(err => console.error('Share failed:', err));
      } else {
        alert('Native sharing not supported on this device.');
      }
      return;
  }
  window.open(shareUrl, '_blank');
}

setChapterSelectOptions();
updateDateTime();
setInterval(updateDateTime, 1000);

chapterSelect.addEventListener('change', () => {
  const ch = chapterSelect.value;
  dateOverride.value = '';
  if (ch) loadChapter(Number(ch));
  else loadChapter(getEffectiveDate().getDate());
});

translationSelect.addEventListener('change', () => {
  const trans = translationSelect.value;
  if (trans) loadChapter(currentChapter || getEffectiveDate().getDate(), trans);
});

dateOverride.addEventListener('change', () => {
  if (dateOverride.value) {
    const date = new Date(dateOverride.value);
    chapterSelect.value = '';
    loadChapter(date.getDate());
  }
});

todayBtn.addEventListener('click', () => {
  dateOverride.value = '';
  chapterSelect.value = '';
  loadChapter(getEffectiveDate().getDate());
});

randomVerseBtn.addEventListener('click', pickRandomVerse);

copyChapterBtn.addEventListener('click', () => {
  const verses = chapters[`${currentChapter}_${currentTranslation}`];
  if (!verses) return;
  const text = verses.map(v => `${v.reference} ${v.text}`).join('\n');
  copyText(`Proverbs ${currentChapter} (${translations[currentTranslation]})\n\n${text}`);
});

chapterReflectionBtn.addEventListener('click', async () => {
  if (chapterReflectionArea.classList.contains('hidden')) {
    reflectionText.textContent = 'Loading reflection…';
    chapterReflectionArea.classList.remove('hidden');
    const reflection = await getReflection(currentChapter);
    reflectionText.textContent = reflection;
  } else {
    chapterReflectionArea.classList.add('hidden');
  }
});

toggleReflection.addEventListener('click', () => {
  chapterReflectionArea.classList.toggle('hidden');
});

explainVerseBtn.addEventListener('click', async () => {
  if (!currentRandomVerse) return;
  explanationText.textContent = 'Loading explanation…';
  verseExplanationArea.classList.remove('hidden');
  const explanation = await getVerseExplanation(currentRandomVerse);
  explanationText.textContent = explanation;
});

closeRandom.addEventListener('click', () => {
  randomVerseArea.classList.add('hidden');
});

shareNative.addEventListener('click', () => shareVerse('native'));
shareWhatsApp.addEventListener('click', () => shareVerse('whatsapp'));
shareTwitter.addEventListener('click', () => shareVerse('twitter'));
shareFacebook.addEventListener('click', () => shareVerse('facebook'));
copyVerseBtn.addEventListener('click', () => {
  if (currentRandomVerse) {
    copyText(`Proverbs ${currentRandomVerse.reference} (${translations[currentTranslation]}): ${currentRandomVerse.text}`);
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(reg => {
    console.log('Service Worker registered:', reg);
  }).catch(err => {
    console.error('Service Worker registration failed:', err);
  });
}

loadChapter(getEffectiveDate().getDate());
