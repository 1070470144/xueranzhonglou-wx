const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

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
  constructor({ sendSignal, onStatus } = {}) {
    this.sendSignal = sendSignal || (() => {});
    this.onStatus = onStatus || (() => {});
    this.ownId = "";
    this.channelId = "";
    this.localStream = null;
    this.peers = new Map();
    this.memberIds = new Set();
    this.enabled = false;
    this.micEnabled = false;
    this.canSpeak = true;
    this.pendingSignals = [];
  }

  async sync({
    ownId,
    channelId,
    members = [],
    enabled,
    micEnabled,
    canSpeak,
  }) {
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
      if (peer.pc.signalingState !== "have-local-offer") return;
      await peer.pc.setRemoteDescription(signal.description);
      await this.flushPeerCandidates(peer);
      return;
    }
    if (signal.type === "candidate" && signal.candidate) {
      await this.addIceCandidate(peer, signal.candidate);
    }
  }

  async ensureLocalStream() {
    if (this.localStream) return this.localStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("microphone_not_supported");
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    this.applyMicrophoneState();
    return this.localStream;
  }

  applyMicrophoneState() {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = this.enabled && this.micEnabled && this.canSpeak;
    });
  }

  async ensurePeer(peerId, initiate) {
    if (this.peers.has(peerId)) return this.peers.get(peerId);
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
      this.onStatus({ peerId, state: pc.connectionState });
      if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
        this.closePeer(peerId);
      }
    };

    if (initiate) await this.createOffer(peerId);
    return peer;
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
      peer.audio.dataset.voicePeer = peer.id;
      document.body.appendChild(peer.audio);
    }
    peer.audio.srcObject = stream;
    const playResult = peer.audio.play && peer.audio.play();
    if (playResult && playResult.catch) playResult.catch(() => {});
  }

  async addIceCandidate(peer, candidate) {
    if (!peer.pc.remoteDescription) {
      peer.pendingCandidates.push(candidate);
      return;
    }
    await peer.pc.addIceCandidate(candidate);
  }

  async flushPeerCandidates(peer) {
    if (!peer.pendingCandidates.length) return;
    const candidates = peer.pendingCandidates;
    peer.pendingCandidates = [];
    for (const candidate of candidates) {
      await peer.pc.addIceCandidate(candidate);
    }
  }

  shouldInitiate(peerId) {
    return String(this.ownId).localeCompare(String(peerId)) < 0;
  }

  closePeer(peerId) {
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
  }

  stopLocalStream() {
    if (!this.localStream) return;
    this.localStream.getTracks().forEach((track) => track.stop());
    this.localStream = null;
  }

  destroy() {
    this.closePeers();
    this.stopLocalStream();
  }
}

export default VoicePeerManager;
