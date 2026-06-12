function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildIceServers(env = process.env) {
  const stunUrls = splitList(
    env.VUE_APP_VOICE_STUN_URLS || "stun:stun.l.google.com:19302",
  );
  const turnUrls = splitList(env.VUE_APP_VOICE_TURN_URLS);
  const iceServers = [];

  if (stunUrls.length) {
    iceServers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
  }

  if (turnUrls.length) {
    const turnServer = {
      urls: turnUrls.length === 1 ? turnUrls[0] : turnUrls,
    };
    if (env.VUE_APP_VOICE_TURN_USERNAME) {
      turnServer.username = env.VUE_APP_VOICE_TURN_USERNAME;
    }
    if (env.VUE_APP_VOICE_TURN_CREDENTIAL) {
      turnServer.credential = env.VUE_APP_VOICE_TURN_CREDENTIAL;
    }
    iceServers.push(turnServer);
  }

  return iceServers;
}

const ICE_SERVERS = buildIceServers();
const RESTART_DELAY_FAILED_MS = 500;
const RESTART_DELAY_DISCONNECTED_MS = 3000;

export function normalizeVoiceError(error) {
  const name = error && error.name;
  const message = error && error.message ? error.message : String(error || "");
  if (
    name === "NotAllowedError" ||
    name === "PermissionDeniedError" ||
    /permission denied|not allowed|denied/i.test(message)
  ) {
    return "microphone_permission_denied";
  }
  return message || "unknown_error";
}

export class VoicePeerManager {
  constructor({ sendSignal, onStatus, onSpeakingChange } = {}) {
    this.sendSignal = sendSignal || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onSpeakingChange = onSpeakingChange || (() => {});
    this.ownId = "";
    this.channelId = "";
    this.localStream = null;
    this.localStreamPromise = null;
    this.streamGeneration = 0;
    this.peers = new Map();
    this.peerPromises = new Map();
    this.restartTimers = new Map();
    this.memberIds = new Set();
    this.enabled = false;
    this.micEnabled = false;
    this.canSpeak = true;
    this.pendingSignals = [];
    this.listenVolume = 1;
    this.audioContext = null;
    this.analyser = null;
    this.analyserBuffer = null;
    this.audioUnlockHandler = null;
    this.speaking = false;
    this.speakingAboveSince = 0;
    this.speakingBelowSince = 0;
    this.speakingTimer = null;
    this.syncQueue = Promise.resolve();
  }

  // sync 可能被多个 watcher 同时触发（进房瞬间 enabled/频道/成员一起变化），
  // 串行执行避免并发创建重复的 RTCPeerConnection 导致信令交叉。
  sync(payload) {
    const run = this.syncQueue.then(() => this.runSync(payload));
    this.syncQueue = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async runSync({
    ownId,
    channelId,
    members = [],
    enabled,
    micEnabled,
    canSpeak,
  } = {}) {
    const nextChannelId = channelId || "main";
    const channelChanged = !!this.channelId && this.channelId !== nextChannelId;
    this.ownId = ownId || this.ownId;
    this.channelId = nextChannelId;
    this.enabled = !!enabled;
    this.canSpeak = canSpeak !== false;
    this.micEnabled = !!micEnabled && this.canSpeak;

    if (!this.enabled || !this.ownId) {
      this.pendingSignals = [];
      this.closePeers();
      this.stopLocalStream();
      return;
    }

    if (channelChanged) {
      this.closePeers();
      this.pendingSignals = this.pendingSignals.filter(
        ({ signal }) =>
          !signal || !signal.channelId || signal.channelId === this.channelId,
      );
    }

    await this.ensureLocalStream();
    this.applyMicrophoneState();

    const targetIds = members
      .map((member) => member && member.id)
      .filter((id) => id && id !== this.ownId);
    this.memberIds = new Set(targetIds);
    this.peers.forEach((peer, peerId) => {
      if (!targetIds.includes(peerId)) this.closePeer(peerId);
    });

    await Promise.all(
      targetIds.map((peerId) =>
        this.ensurePeer(peerId, this.shouldInitiate(peerId)),
      ),
    );
    await this.flushPendingSignals();
  }

  async handleSignal({ fromId, signal } = {}) {
    if (!fromId || !signal) return;
    if (this.ownId && fromId === this.ownId) return;
    if (!this.canProcessSignal(fromId, signal)) {
      this.queueSignal({ fromId, signal });
      return;
    }
    await this.processSignal({ fromId, signal });
  }

  canProcessSignal(fromId, signal) {
    return (
      this.enabled &&
      !!fromId &&
      !!signal &&
      (!signal.channelId || signal.channelId === this.channelId) &&
      this.memberIds.has(fromId)
    );
  }

  queueSignal(payload) {
    const signalChannelId = payload.signal && payload.signal.channelId;
    if (
      signalChannelId &&
      this.channelId &&
      signalChannelId !== this.channelId &&
      (!this.enabled || !this.memberIds.has(payload.fromId))
    ) {
      return;
    }
    this.pendingSignals.push(payload);
    if (this.pendingSignals.length > 100) this.pendingSignals.shift();
  }

  async flushPendingSignals() {
    if (!this.pendingSignals.length) return;
    const pending = this.pendingSignals;
    this.pendingSignals = [];
    for (const payload of pending) {
      if (this.canProcessSignal(payload.fromId, payload.signal)) {
        await this.processSignal(payload);
      } else {
        this.queueSignal(payload);
      }
    }
  }

  async processSignal({ fromId, signal }) {
    const peer = await this.ensurePeer(fromId, false);
    if (signal.type === "offer") {
      if (peer.pc.signalingState !== "stable") {
        // 信令冲突：回滚本地未完成的协商，接受对方的 offer
        try {
          await peer.pc.setLocalDescription({ type: "rollback" });
        } catch (error) {
          this.schedulePeerRestart(fromId, RESTART_DELAY_FAILED_MS);
          return;
        }
      }
      await peer.pc.setRemoteDescription(signal.description);
      await this.flushPeerCandidates(peer);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      this.sendSignal({
        toId: fromId,
        signal: {
          type: "answer",
          channelId: this.channelId,
          description: peer.pc.localDescription,
        },
      });
      return;
    }
    if (signal.type === "answer") {
      if (peer.pc.signalingState !== "have-local-offer") {
        // answer 落在了错误的信令状态上，说明连接已经错乱；
        // 若尚未连通则重建，避免留下一个永远无声的连接。
        if (peer.pc.connectionState !== "connected") {
          this.schedulePeerRestart(fromId, RESTART_DELAY_FAILED_MS);
        }
        return;
      }
      await peer.pc.setRemoteDescription(signal.description);
      await this.flushPeerCandidates(peer);
      return;
    }
    if (signal.type === "candidate" && signal.candidate) {
      await this.addIceCandidate(peer, signal.candidate);
    }
  }

  ensureLocalStream() {
    if (this.localStream) return Promise.resolve(this.localStream);
    if (this.localStreamPromise) return this.localStreamPromise;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("microphone_not_supported"));
    }
    const generation = this.streamGeneration;
    this.localStreamPromise = navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        if (generation !== this.streamGeneration) {
          // 等待授权期间语音被关闭，释放麦克风
          stream.getTracks().forEach((track) => track.stop());
          throw new Error("voice_disabled");
        }
        this.localStream = stream;
        this.applyMicrophoneState();
        this.startSpeakingDetection();
        return stream;
      })
      .finally(() => {
        this.localStreamPromise = null;
      });
    return this.localStreamPromise;
  }

  applyMicrophoneState() {
    if (!this.localStream) return;
    const active = this.enabled && this.micEnabled && this.canSpeak;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = active;
    });
    if (!active) this.setSpeaking(false);
  }

  setListenVolume(value) {
    const number = Number(value);
    this.listenVolume = Number.isFinite(number)
      ? Math.min(1, Math.max(0, number))
      : 1;
    this.peers.forEach((peer) => {
      if (peer.audio) peer.audio.volume = this.listenVolume;
    });
  }

  startSpeakingDetection() {
    if (this.analyser || !this.localStream) return;
    const AudioContextCtor =
      typeof window !== "undefined" &&
      (window.AudioContext || window.webkitAudioContext);
    if (!AudioContextCtor) return;
    try {
      this.audioContext = new AudioContextCtor();
      const source = this.audioContext.createMediaStreamSource(
        this.localStream,
      );
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      this.analyserBuffer = new Uint8Array(this.analyser.fftSize);
      this.speakingTimer = window.setInterval(
        () => this.sampleSpeakingLevel(),
        50,
      );
    } catch (error) {
      this.stopSpeakingDetection();
    }
  }

  sampleSpeakingLevel(now = Date.now()) {
    if (!this.analyser || !this.analyserBuffer) return;
    if (!(this.enabled && this.micEnabled && this.canSpeak)) {
      this.setSpeaking(false);
      return;
    }

    this.analyser.getByteTimeDomainData(this.analyserBuffer);
    let total = 0;
    for (let index = 0; index < this.analyserBuffer.length; index += 1) {
      const centered = (this.analyserBuffer[index] - 128) / 128;
      total += centered * centered;
    }
    const level = Math.sqrt(total / this.analyserBuffer.length);
    const isLoud = level > 0.06;

    if (isLoud) {
      this.speakingBelowSince = 0;
      if (!this.speakingAboveSince) this.speakingAboveSince = now;
      if (!this.speaking && now - this.speakingAboveSince >= 150) {
        this.setSpeaking(true);
      }
      return;
    }

    this.speakingAboveSince = 0;
    if (!this.speakingBelowSince) this.speakingBelowSince = now;
    if (this.speaking && now - this.speakingBelowSince >= 500) {
      this.setSpeaking(false);
    }
  }

  setSpeaking(value) {
    const nextValue = !!value;
    if (this.speaking === nextValue) return;
    this.speaking = nextValue;
    this.onSpeakingChange(nextValue);
  }

  stopSpeakingDetection() {
    if (this.speakingTimer && typeof window !== "undefined") {
      window.clearInterval(this.speakingTimer);
    }
    this.speakingTimer = null;
    if (this.audioContext && this.audioContext.close) {
      const closeResult = this.audioContext.close();
      if (closeResult && closeResult.catch) closeResult.catch(() => {});
    }
    this.audioContext = null;
    this.analyser = null;
    this.analyserBuffer = null;
    this.speakingAboveSince = 0;
    this.speakingBelowSince = 0;
    this.setSpeaking(false);
  }

  // 同一对端的并发创建（sync 与信令处理可能同时到达）必须复用同一个
  // RTCPeerConnection，否则 answer/candidate 会落在被覆盖的连接上。
  async ensurePeer(peerId, initiate) {
    const existing = this.peers.get(peerId);
    if (existing) {
      if (initiate) await this.createOffer(peerId);
      return existing;
    }
    const pending = this.peerPromises.get(peerId);
    if (pending) {
      const peer = await pending;
      if (initiate && peer) await this.createOffer(peerId);
      return peer;
    }
    const creation = this.createPeer(peerId, initiate);
    this.peerPromises.set(peerId, creation);
    try {
      return await creation;
    } finally {
      this.peerPromises.delete(peerId);
    }
  }

  async createPeer(peerId, initiate) {
    await this.ensureLocalStream();
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer = {
      id: peerId,
      pc,
      audio: null,
      offered: false,
      pendingCandidates: [],
    };
    this.peers.set(peerId, peer);

    this.localStream
      .getTracks()
      .forEach((track) => pc.addTrack(track, this.localStream));
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.sendSignal({
        toId: peerId,
        signal: {
          type: "candidate",
          channelId: this.channelId,
          candidate: event.candidate,
        },
      });
    };
    pc.ontrack = (event) => this.attachRemoteStream(peer, event.streams[0]);
    pc.onconnectionstatechange = () => {
      if (this.peers.get(peerId) !== peer) return;
      this.onStatus({ peerId, state: pc.connectionState });
      if (pc.connectionState === "connected") {
        this.cancelPeerRestart(peerId);
        return;
      }
      if (["failed", "closed"].includes(pc.connectionState)) {
        this.schedulePeerRestart(peerId, RESTART_DELAY_FAILED_MS);
      } else if (pc.connectionState === "disconnected") {
        // disconnected 常是瞬时抖动，给一个恢复窗口再重建
        this.schedulePeerRestart(peerId, RESTART_DELAY_DISCONNECTED_MS);
      }
    };

    if (initiate) await this.createOffer(peerId);
    return peer;
  }

  schedulePeerRestart(peerId, delayMs) {
    if (typeof setTimeout !== "function") return;
    if (this.restartTimers.has(peerId)) return;
    const timer = setTimeout(() => {
      this.restartTimers.delete(peerId);
      const restart = this.restartPeer(peerId);
      if (restart && restart.catch) restart.catch(() => {});
    }, delayMs);
    this.restartTimers.set(peerId, timer);
  }

  cancelPeerRestart(peerId) {
    if (!this.restartTimers.has(peerId)) return;
    clearTimeout(this.restartTimers.get(peerId));
    this.restartTimers.delete(peerId);
  }

  async restartPeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer && ["connected", "connecting"].includes(peer.pc.connectionState)) {
      return;
    }
    this.closePeer(peerId);
    if (!this.enabled || !this.memberIds.has(peerId)) return;
    await this.ensurePeer(peerId, this.shouldInitiate(peerId));
  }

  async createOffer(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer || peer.offered) return;
    peer.offered = true;
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    this.sendSignal({
      toId: peerId,
      signal: {
        type: "offer",
        channelId: this.channelId,
        description: peer.pc.localDescription,
      },
    });
  }

  attachRemoteStream(peer, stream) {
    if (!stream || typeof document === "undefined") return;
    if (!peer.audio) {
      peer.audio = document.createElement("audio");
      peer.audio.autoplay = true;
      peer.audio.playsInline = true;
      peer.audio.volume = this.listenVolume;
      peer.audio.dataset.voicePeer = peer.id;
      document.body.appendChild(peer.audio);
    }
    peer.audio.srcObject = stream;
    this.playPeerAudio(peer);
  }

  playPeerAudio(peer) {
    if (!peer.audio || !peer.audio.play) return;
    const playResult = peer.audio.play();
    if (playResult && playResult.catch) {
      // 浏览器自动播放策略拦截时，等待下一次用户交互后重试
      playResult.catch(() => this.registerAudioUnlock());
    }
  }

  registerAudioUnlock() {
    if (this.audioUnlockHandler) return;
    if (typeof document === "undefined" || !document.addEventListener) return;
    const handler = () => this.unlockAudio();
    this.audioUnlockHandler = handler;
    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("keydown", handler, true);
  }

  removeAudioUnlock() {
    if (!this.audioUnlockHandler) return;
    if (typeof document !== "undefined" && document.removeEventListener) {
      document.removeEventListener(
        "pointerdown",
        this.audioUnlockHandler,
        true,
      );
      document.removeEventListener("keydown", this.audioUnlockHandler, true);
    }
    this.audioUnlockHandler = null;
  }

  unlockAudio() {
    this.removeAudioUnlock();
    if (this.audioContext && this.audioContext.resume) {
      const resumeResult = this.audioContext.resume();
      if (resumeResult && resumeResult.catch) resumeResult.catch(() => {});
    }
    this.peers.forEach((peer) => {
      if (peer.audio && peer.audio.paused !== false) this.playPeerAudio(peer);
    });
  }

  async addIceCandidate(peer, candidate) {
    if (!peer.pc.remoteDescription) {
      peer.pendingCandidates.push(candidate);
      return;
    }
    try {
      await peer.pc.addIceCandidate(candidate);
    } catch (error) {
      // 连接重建后残留的旧 candidate，忽略
    }
  }

  async flushPeerCandidates(peer) {
    if (!peer.pendingCandidates.length) return;
    const candidates = peer.pendingCandidates;
    peer.pendingCandidates = [];
    for (const candidate of candidates) {
      try {
        await peer.pc.addIceCandidate(candidate);
      } catch (error) {
        // 忽略过期 candidate
      }
    }
  }

  shouldInitiate(peerId) {
    return String(this.ownId).localeCompare(String(peerId)) < 0;
  }

  closePeer(peerId) {
    this.cancelPeerRestart(peerId);
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (peer.audio && peer.audio.parentNode) {
      peer.audio.parentNode.removeChild(peer.audio);
    }
    peer.pc.close();
    this.peers.delete(peerId);
  }

  closePeers() {
    Array.from(this.peers.keys()).forEach((peerId) => this.closePeer(peerId));
    this.restartTimers.forEach((timer) => clearTimeout(timer));
    this.restartTimers.clear();
  }

  stopLocalStream() {
    this.streamGeneration += 1;
    if (!this.localStream) return;
    this.stopSpeakingDetection();
    this.localStream.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  destroy() {
    this.closePeers();
    this.removeAudioUnlock();
    this.stopSpeakingDetection();
    this.stopLocalStream();
  }
}

export default VoicePeerManager;
