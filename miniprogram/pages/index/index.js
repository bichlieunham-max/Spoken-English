const recorderManager = wx.getRecorderManager();
const innerAudioContext = wx.createInnerAudioContext();

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
  casual: "What I mean is, {text}.",
  work: "What I'd like to say is that {text}.",
  travel: "Could you help me with this? {text}.",
  study: "I want to explain it like this: {text}.",
  history: "From my understanding, {text}.",
  comfort: "I hear you. Honestly, {text}."
};

Page({
  data: {
    sourceText: samples[0].zh,
    spokenText: samples[0].casual,
    scenarioIndex: 0,
    accentIndex: 0,
    rateIndex: 2,
    scenarioOptions: [
      { key: "casual", label: "日常聊天" },
      { key: "work", label: "工作沟通" },
      { key: "travel", label: "旅行问路" },
      { key: "study", label: "课堂讨论" },
      { key: "history", label: "历史文化" },
      { key: "comfort", label: "情绪支持" }
    ],
    accentOptions: [
      { key: "en-US", label: "美式" },
      { key: "en-GB", label: "英式" }
    ],
    rateOptions: [
      { key: 0.65, label: "0.65x" },
      { key: 0.8, label: "0.8x" },
      { key: 1, label: "1.0x" },
      { key: 1.15, label: "1.15x" }
    ],
    currentScenario: { key: "casual", label: "日常聊天" },
    currentAccent: { key: "en-US", label: "美式" },
    currentRate: { key: 1, label: "1.0x" },
    tips: [],
    recordState: "待录音",
    recordPath: "",
    analysisText: "建议先听原句，再录下自己的跟读，回放时检查重音、连读和小词弱读。",
    chatInput: "",
    activeRoomId: "daily",
    rooms: [
      {
        id: "daily",
        name: "Daily chat",
        messages: [
          { id: "m1", from: "coach", text: "Hi! Tell me about your day in simple English. I'll help you sound natural." }
        ]
      },
      {
        id: "history",
        name: "History",
        messages: [
          { id: "m2", from: "coach", text: "Let's talk about world history. Try one sentence and I'll polish it." }
        ]
      }
    ],
    activeMessages: [],
    lastMessageId: "m1"
  },

  onLoad() {
    recorderManager.onStop((res) => {
      this.setData({
        recordPath: res.tempFilePath,
        recordState: "已录音",
        analysisText: "录音已完成。请点击回放，对照原句检查：重音词是否更响，to/of/and 是否轻读，want to / kind of 是否连起来。自动评分可接云函数或后端语音识别。"
      });
    });

    recorderManager.onError((err) => {
      this.setData({
        recordState: "录音失败",
        analysisText: `录音没有完成：${err.errMsg}`
      });
    });

    this.generateSpoken();
    this.syncActiveMessages();
  },

  onSourceInput(event) {
    this.setData({ sourceText: event.detail.value });
  },

  onScenarioChange(event) {
    const scenarioIndex = Number(event.detail.value);
    this.setData({
      scenarioIndex,
      currentScenario: this.data.scenarioOptions[scenarioIndex]
    });
    this.generateSpoken();
  },

  onAccentChange(event) {
    const accentIndex = Number(event.detail.value);
    this.setData({
      accentIndex,
      currentAccent: this.data.accentOptions[accentIndex]
    });
  },

  onRateChange(event) {
    const rateIndex = Number(event.detail.value);
    this.setData({
      rateIndex,
      currentRate: this.data.rateOptions[rateIndex]
    });
  },

  useSample() {
    const sample = samples[Math.floor(Math.random() * samples.length)];
    this.setData({ sourceText: sample.zh });
    this.generateSpoken();
  },

  generateSpoken() {
    const scenario = this.data.currentScenario.key;
    const sourceText = this.data.sourceText.trim();
    const match = samples.find((item) => item.zh === sourceText);
    const cleaned = sourceText.replace(/[。！？；，]/g, " ").replace(/\s+/g, " ").trim();
    const spokenText = match
      ? match[scenario]
      : fallbackByScenario[scenario].replace("{text}", cleaned || "I'd like to practice speaking English today");

    this.setData({
      spokenText,
      tips: this.buildTips(spokenText)
    });
  },

  buildTips(text) {
    const lower = text.toLowerCase();
    const tips = [];

    if (/\b(want to|going to|kind of|out of|a bit|lot of)\b/.test(lower)) {
      tips.push({
        kind: "linking",
        title: "连读：读成一个声音块",
        body: "want to 可练成 wanna，kind of 可弱化成 kinda。慢速读清楚后再连起来。"
      });
    }

    if (/\b(to|for|of|and|that|can|could|you)\b/.test(lower)) {
      tips.push({
        kind: "reduction",
        title: "略读：小词轻轻带过",
        body: "to、for、of、and 常更轻更短，把力量留给表达意思的重音词。"
      });
    }

    if (/\b(could you|would you|did you|catch that)\b/.test(lower)) {
      tips.push({
        kind: "assimilation",
        title: "同化：相邻音会合并",
        body: "could you 可接近 /kʊdʒə/，did you 可接近 /dɪdʒə/。"
      });
    }

    if (/\b(tired|bit|today|practice|about|better)\b/.test(lower)) {
      tips.push({
        kind: "voicing",
        title: "浊化：美式 T/D 更轻",
        body: "美式 about it、better 中的 t 常接近轻快的 d，英式一般更清楚保留 t。"
      });
    }

    return tips.length
      ? tips
      : [{ kind: "linking", title: "节奏：先找重音词", body: "先读清楚信息词，再把小词轻轻带过。" }];
  },

  speakText() {
    wx.showToast({
      title: "小程序朗读需接入TTS",
      icon: "none"
    });
  },

  startRecord() {
    wx.authorize({
      scope: "scope.record",
      success: () => {
        recorderManager.start({
          duration: 60000,
          sampleRate: 16000,
          numberOfChannels: 1,
          encodeBitRate: 48000,
          format: "mp3"
        });
        this.setData({
          recordState: "录音中",
          analysisText: "正在录音。读完后点击停止，再回放对照原句。"
        });
      },
      fail: () => {
        wx.openSetting();
      }
    });
  },

  stopRecord() {
    recorderManager.stop();
  },

  playRecord() {
    if (!this.data.recordPath) return;
    innerAudioContext.src = this.data.recordPath;
    innerAudioContext.play();
  },

  switchRoom(event) {
    this.setData({ activeRoomId: event.currentTarget.dataset.id });
    this.syncActiveMessages();
  },

  newRoom() {
    const next = this.data.rooms.length + 1;
    const room = {
      id: `room-${Date.now()}`,
      name: `Window ${next}`,
      messages: [
        { id: `m-${Date.now()}`, from: "coach", text: "New practice window is ready. Pick any topic and I'll help you sound natural." }
      ]
    };
    this.setData({
      rooms: [...this.data.rooms, room],
      activeRoomId: room.id
    });
    this.syncActiveMessages();
  },

  onChatInput(event) {
    this.setData({ chatInput: event.detail.value });
  },

  sendChat() {
    const text = this.data.chatInput.trim();
    if (!text) return;

    const rooms = this.data.rooms.map((room) => {
      if (room.id !== this.data.activeRoomId) return room;
      const now = Date.now();
      return {
        ...room,
        messages: [
          ...room.messages,
          { id: `u-${now}`, from: "user", text },
          { id: `c-${now}`, from: "coach", text: this.makeCoachReply(text, room) }
        ]
      };
    });

    this.setData({ rooms, chatInput: "" });
    this.syncActiveMessages();
  },

  makeCoachReply(text, room) {
    const lower = text.toLowerCase();
    const emotion = /(tired|sad|nervous|worried|stress|afraid|bad)/.test(lower);
    const history = /(history|war|empire|king|britain|america|china|ancient|culture)/.test(lower) || room.id === "history";

    if (emotion) {
      return "That makes sense. A natural way to say it is: “I'm feeling a bit overwhelmed, but I'm trying to keep going.”";
    }
    if (history) {
      return "Nice topic. Try: “I'm curious about how ordinary people lived during that period.”";
    }
    if (/\?/.test(text)) {
      return "Good question. You could say: “Could you walk me through that a little?”";
    }
    return "Nice. To sound more conversational, try adding: “Honestly,” “I guess,” or “The way I see it,” then keep the sentence short.";
  },

  syncActiveMessages() {
    const room = this.data.rooms.find((item) => item.id === this.data.activeRoomId) || this.data.rooms[0];
    const last = room.messages[room.messages.length - 1];
    this.setData({
      activeMessages: room.messages,
      lastMessageId: last ? last.id : ""
    });
  }
});
