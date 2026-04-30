const samples = [
  {
    zh: "我今天有点累，但我还是想把英语口语练一下。",
    casual: "I'm a bit tired today, but I still want to get some English speaking practice in.",
    work: "I'm a little tired today, but I'd still like to spend some time practicing my spoken English.",
    travel: "I'm a bit tired today, but I still want to practice the kind of English I'd use while traveling.",
    study: "I'm a little tired today, but I still want to work on my spoken English.",
    history: "I'm a bit tired today, but I'd still love to practice talking about history in English.",
    comfort: "I'm feeling a bit tired today, but I'm proud of myself for still showing up to practice."
  },
  {
    zh: "不好意思，我刚才没听清楚，你可以再说一遍吗？",
    casual: "Sorry, I didn't quite catch that. Could you say it again?",
    work: "Sorry, I didn't quite catch that. Could you repeat it for me?",
    travel: "Sorry, I didn't catch that. Could you say it one more time?",
    study: "Sorry, I missed that part. Could you explain it again?",
    history: "Sorry, I missed that detail. Could you go over it once more?",
    comfort: "Sorry, I didn't quite catch that. No rush, could you say it again?"
  },
  {
    zh: "我想表达我的观点，但不想听起来太强硬。",
    casual: "I want to share my point, but I don't want to sound too intense.",
    work: "I'd like to share my perspective without sounding too forceful.",
    travel: "I want to explain what I mean, but in a polite way.",
    study: "I'd like to give my opinion, but I want it to sound respectful.",
    history: "I'd like to make a point about this period, but keep the tone balanced.",
    comfort: "I want to say how I feel, but I also want to be gentle about it."
  }
];

const fallbackByScenario = {
  casual: "{text}",
  work: "{text}",
  travel: "{text}",
  study: "{text}",
  history: "{text}",
  comfort: "{text}"
};

const phraseTranslations = [
  ["练习羽毛球", "I'm practicing badminton"],
  ["练羽毛球", "I'm practicing badminton"],
  ["我今天进行了羽毛球训练", "I had badminton training today"],
  ["今天进行了羽毛球训练", "I had badminton training today"],
  ["我今天训练了羽毛球", "I practiced badminton today"],
  ["今天训练了羽毛球", "I practiced badminton today"],
  ["我今天打了羽毛球", "I played badminton today"],
  ["今天打了羽毛球", "I played badminton today"],
  ["我想练习英语口语", "I want to practice speaking English"],
  ["我想练英语口语", "I want to practice my spoken English"],
  ["我今天有点累", "I'm a bit tired today"],
  ["我刚才没听清楚", "I didn't quite catch that"],
  ["你可以再说一遍吗", "Could you say that again"],
  ["我想表达我的观点", "I want to share my point"],
  ["不想听起来太强硬", "I don't want to sound too forceful"]
];

const wordTranslations = [
  ["今天", "today"],
  ["明天", "tomorrow"],
  ["昨天", "yesterday"],
  ["我", "I"],
  ["我们", "we"],
  ["进行了", "had"],
  ["进行", "have"],
  ["训练", "training"],
  ["练习", "practice"],
  ["学习", "study"],
  ["打", "play"],
  ["羽毛球", "badminton"],
  ["篮球", "basketball"],
  ["足球", "soccer"],
  ["英语", "English"],
  ["口语", "speaking"],
  ["工作", "work"],
  ["会议", "meeting"],
  ["旅行", "travel"],
  ["历史", "history"],
  ["文化", "culture"],
  ["开心", "happy"],
  ["难过", "sad"],
  ["紧张", "nervous"],
  ["累", "tired"]
];

const rooms = [
  {
    id: "daily",
    name: "Daily chat",
    mood: "friendly",
    messages: [
      { from: "coach", text: "Hi! Tell me about your day in simple English. I'll keep it natural and supportive." }
    ]
  },
  {
    id: "history",
    name: "History",
    mood: "curious",
    messages: [
      { from: "coach", text: "Let's talk about world history. Try one sentence, and I'll help you sound more natural." }
    ]
  }
];

let activeRoomId = rooms[0].id;
let loopTimer = null;
let recognition = null;
let deferredInstallPrompt = null;
let mediaRecorder = null;
let recordedChunks = [];

const $ = (id) => document.getElementById(id);

const sourceText = $("sourceText");
const scenarioSelect = $("scenarioSelect");
const accentSelect = $("accentSelect");
const rateSelect = $("rateSelect");
const spokenText = $("spokenText");
const toneTag = $("toneTag");
const tipList = $("tipList");
const analysisBox = $("analysisBox");
const supportBadge = $("supportBadge");
const playbackAudio = $("playbackAudio");
const roomTabs = $("roomTabs");
const chatLog = $("chatLog");
const chatInput = $("chatInput");

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function polishByScenario(text, scenario) {
  const clean = text.replace(/\s+/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
  if (!clean) return "I'd like to practice speaking English today.";

  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  const sentence = /[.!?]$/.test(first) ? first : `${first}.`;

  if (scenario === "work") return sentence.replace(/^I had /, "I completed ").replace(/^I played /, "I practiced ");
  if (scenario === "study") return sentence.replace(/^I had /, "I did ").replace(/^I played /, "I practiced ");
  if (scenario === "comfort") return `I did my best today. ${sentence}`;
  return sentence;
}

function translateToEnglish(input, scenario) {
  let text = input.trim().replace(/[。！？；，]/g, " ").replace(/\s+/g, " ");
  if (!text) return "I'd like to practice speaking English today.";
  if (!hasChinese(text)) return polishByScenario(text, scenario);

  const direct = phraseTranslations.find(([zh]) => text.includes(zh));
  if (direct) return polishByScenario(direct[1], scenario);

  let translated = text;
  wordTranslations.forEach(([zh, en]) => {
    translated = translated.replaceAll(zh, ` ${en} `);
  });
  translated = translated.replace(/[\u3400-\u9fff]/g, " ").replace(/\s+/g, " ").trim();

  if (!translated || translated.length < 2) {
    return "I want to say this in natural English, but I need a more specific translation.";
  }

  translated = translated
    .replace(/\bI today had\b/i, "I had")
    .replace(/\bI today practiced\b/i, "I practiced")
    .replace(/\bhad badminton training today\b/i, "I had badminton training today")
    .replace(/\bI had badminton training\b/i, "I had badminton training");

  if (!/\btoday\b/i.test(translated) && /今天/.test(input)) translated += " today";
  return polishByScenario(translated, scenario);
}

function generateSpokenEnglish() {
  const raw = sourceText.value.trim();
  const scenario = scenarioSelect.value;
  const match = samples.find((item) => item.zh === raw);
  let text = match ? match[scenario] : "";

  if (!text) {
    const translated = translateToEnglish(raw, scenario);
    text = fallbackByScenario[scenario].replace("{text}", translated);
  }

  spokenText.textContent = text;
  toneTag.textContent = scenarioSelect.options[scenarioSelect.selectedIndex].text;
  renderTips(text);
  return text;
}

function pickVoice(lang) {
  const voices = speechSynthesis.getVoices();
  const expressiveNames = lang === "en-US"
    ? ["Samantha", "Ava", "Jenny", "Aria", "Allison", "Nicky"]
    : ["Serena", "Daniel", "Kate", "Oliver", "Libby", "Martha"];
  const expressive = voices.find((voice) =>
    voice.lang === lang && expressiveNames.some((name) => voice.name.includes(name))
  );
  const exact = voices.find((voice) => voice.lang === lang);
  const partial = voices.find((voice) => voice.lang && voice.lang.startsWith(lang.slice(0, 2)));
  return expressive || exact || partial || null;
}

function speak(text = spokenText.textContent, lang = accentSelect.value, rate = Number(rateSelect.value)) {
  if (!("speechSynthesis" in window)) {
    analysisBox.innerHTML = "<strong>当前浏览器不支持朗读</strong><span>请用 Chrome、Edge 或 Safari 打开。</span>";
    return;
  }
  speechSynthesis.cancel();
  const cleanText = (hasChinese(text) ? translateToEnglish(text, scenarioSelect.value) : text)
    .replace(/^What I mean is,\s*/i, "")
    .trim();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang;
  utterance.rate = Math.max(0.55, Math.min(1.2, rate * 0.96));
  utterance.pitch = lang === "en-GB" ? 1.02 : 1.05;
  utterance.volume = 1;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function renderTips(text) {
  const lower = text.toLowerCase();
  const tips = [];

  if (/\b(want to|going to|kind of|out of|a bit|lot of)\b/.test(lower)) {
    tips.push({
      kind: "linking",
      title: "连读：把常用词组读成一个声音块",
      body: "例如 want to 常读成 wanna，kind of 常弱化成 kinda。先慢速读清楚，再逐渐连起来。"
    });
  }

  if (/\b(to|for|of|and|that|can|could|you)\b/.test(lower)) {
    tips.push({
      kind: "reduction",
      title: "略读：功能词不要每个都重读",
      body: "to、for、of、and、that 这类词在自然交流里通常更轻、更短，把重音留给 tired、practice、history 这类信息词。"
    });
  }

  if (/\b(didn'?t you|could you|would you|missed that|catch that)\b/.test(lower)) {
    tips.push({
      kind: "assimilation",
      title: "同化：相邻音会互相影响",
      body: "could you 可以更接近 /kʊdʒə/，did you 可以更接近 /dɪdʒə/。这是自然口语速度下的常见变化。"
    });
  }

  if (/\b(tired|bit|today|practice|about|better)\b/.test(lower)) {
    tips.push({
      kind: "voicing",
      title: "浊化与弹舌：美式 T/D 更轻",
      body: "美式里 bit of、better、about it 中间的 t 常接近轻快的 d。英式通常更清楚保留 t，练习时可以切换口音对比。"
    });
  }

  if (!tips.length) {
    tips.push({
      kind: "linking",
      title: "节奏：先找重音词",
      body: "先标出你真正想表达的信息词，再把小词轻轻带过。自然口语不是每个词一样用力。"
    });
  }

  tipList.innerHTML = tips
    .map(
      (tip) => `
        <article class="tip-card tip-kind-${tip.kind}">
          <strong>${tip.title}</strong>
          <p>${tip.body}</p>
        </article>
      `
    )
    .join("");
}

function compareAccent() {
  const text = spokenText.textContent;
  speak(text, "en-US", Number(rateSelect.value));
  setTimeout(() => speak(text, "en-GB", Number(rateSelect.value)), Math.max(2200, text.length * 75));
}

function startLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
    $("loopButton").textContent = "反复播放";
    speechSynthesis.cancel();
    return;
  }
  speak();
  loopTimer = setInterval(() => speak(), Math.max(3600, spokenText.textContent.length * 95));
  $("loopButton").textContent = "停止循环";
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    supportBadge.textContent = "iPhone 回放";
    supportBadge.style.background = "#fff7e6";
    supportBadge.style.color = "#8a5a12";
    return;
  }

  supportBadge.textContent = "可用";
  recognition = new SpeechRecognition();
  recognition.lang = accentSelect.value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    analyzeSpeech(transcript);
  };
  recognition.onerror = (event) => {
    analysisBox.innerHTML = `<strong>录音没有完成</strong><span>${event.error}。请确认浏览器允许麦克风权限。</span>`;
  };
}

async function startRecordingFallback() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    analysisBox.innerHTML = "<strong>当前浏览器不能录音</strong><span>苹果手机请用 Safari 打开，并在地址栏允许麦克风权限。</span>";
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };
  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/mp4" });
    playbackAudio.src = URL.createObjectURL(blob);
    playbackAudio.style.display = "block";
    analysisBox.innerHTML = `
      <strong>已录下你的跟读</strong>
      <span>iPhone Safari 暂不稳定支持浏览器内置英文语音识别，所以这里提供录音回放训练。</span>
      <span>回听时重点检查：重音词是否更响、to/of/and 是否轻读、want to / kind of 是否连起来。</span>
      <span>需要自动评分时，要接入后端语音识别或做成小程序云函数版本。</span>
    `;
  };
  mediaRecorder.start();
  analysisBox.innerHTML = "<strong>正在录音</strong><span>读完后按“停止”，然后回放对比原句。</span>";
}

function analyzeSpeech(transcript) {
  const targetWords = normalizeText(spokenText.textContent).split(" ").filter(Boolean);
  const saidWords = normalizeText(transcript).split(" ").filter(Boolean);
  const saidSet = new Set(saidWords);
  const missing = targetWords.filter((word) => !saidSet.has(word));
  const matched = targetWords.length - missing.length;
  const score = Math.max(0, Math.round((matched / Math.max(1, targetWords.length)) * 100));
  const focusWords = missing.slice(0, 6).join(", ") || "节奏和语调";

  analysisBox.innerHTML = `
    <strong>清晰度约 ${score}% <span class="score-pill">${score >= 80 ? "不错" : "继续慢练"}</span></strong>
    <span>识别结果：${transcript}</span>
    <span>重点回练：${focusWords}</span>
    <span>建议：先用 0.65x 跟读这些词，再读完整句。注意不要把小词全部重读。</span>
  `;
}

function renderRooms() {
  roomTabs.innerHTML = rooms
    .map((room) => `<button class="${room.id === activeRoomId ? "active" : ""}" data-room="${room.id}" type="button">${room.name}</button>`)
    .join("");

  const room = rooms.find((item) => item.id === activeRoomId);
  chatLog.innerHTML = room.messages
    .map((message) => `<div class="message ${message.from === "user" ? "user" : "coach"}">${message.text}</div>`)
    .join("");
  chatLog.scrollTop = chatLog.scrollHeight;
}

function makeCoachReply(text, room) {
  const lower = text.toLowerCase();
  const emotion = /(tired|sad|nervous|worried|stress|afraid|bad)/.test(lower);
  const history = /(history|war|empire|king|britain|america|china|ancient|culture)/.test(lower) || room.id === "history";

  if (emotion) {
    return "That makes sense. A natural way to say it is: “I'm feeling a bit overwhelmed, but I'm trying to keep going.” You're doing fine. Try saying it slowly, with stress on feeling and keep going.";
  }
  if (history) {
    return "Nice topic. You could say: “I'm curious about how ordinary people lived during that period.” It sounds natural because it asks about real life, not just dates and names.";
  }
  if (/\?/.test(text)) {
    return "Good question. A more natural version is: “Could you walk me through that a little?” It sounds friendly and common in US and UK conversations.";
  }
  return "Nice. To sound more conversational, try adding a soft opener: “Honestly,” “I guess,” or “The way I see it,” then keep the main sentence short.";
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  const room = rooms.find((item) => item.id === activeRoomId);
  room.messages.push({ from: "user", text });
  room.messages.push({ from: "coach", text: makeCoachReply(text, room) });
  chatInput.value = "";
  renderRooms();
}

function addRoom() {
  const count = rooms.length + 1;
  const room = {
    id: `room-${Date.now()}`,
    name: `Window ${count}`,
    mood: "supportive",
    messages: [
      { from: "coach", text: "New practice window is ready. Pick any topic and I'll help you sound natural." }
    ]
  };
  rooms.push(room);
  activeRoomId = room.id;
  renderRooms();
}

function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt = null;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

$("sampleButton").addEventListener("click", () => {
  const sample = samples[Math.floor(Math.random() * samples.length)];
  sourceText.value = sample.zh;
  generateSpokenEnglish();
});

$("translateButton").addEventListener("click", generateSpokenEnglish);
$("speakButton").addEventListener("click", () => speak());
$("loopButton").addEventListener("click", startLoop);
$("compareAccentButton").addEventListener("click", compareAccent);
$("recordButton").addEventListener("click", () => {
  if (!recognition) setupRecognition();
  if (recognition) {
    recognition.lang = accentSelect.value;
    recognition.start();
    analysisBox.innerHTML = "<strong>正在听你跟读</strong><span>读完后可以按停止，或等待浏览器自动结束。</span>";
  } else {
    startRecordingFallback().catch((error) => {
      analysisBox.innerHTML = `<strong>录音没有开始</strong><span>${error.message}。请确认浏览器允许麦克风权限。</span>`;
    });
  }
});
$("stopRecordButton").addEventListener("click", () => {
  if (recognition) recognition.stop();
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
});
$("sendChatButton").addEventListener("click", sendChat);
$("newRoomButton").addEventListener("click", addRoom);
$("installButton").addEventListener("click", installApp);

roomTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-room]");
  if (!button) return;
  activeRoomId = button.dataset.room;
  renderRooms();
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendChat();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  navigator.clipboard.writeText($(button.dataset.copy).textContent);
  button.textContent = "已复制";
  setTimeout(() => (button.textContent = "复制"), 900);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

sourceText.value = samples[0].zh;
generateSpokenEnglish();
setupRecognition();
renderRooms();
