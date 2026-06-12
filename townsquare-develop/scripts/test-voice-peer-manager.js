const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

function createFakeTrack() {
  return {
    kind: "audio",
    enabled: false,
    stopped: false,
    onended: null,
    stop() {
      this.stopped = true;
    },
  };
}

function loadVoicePeerManager({ playRejects = false } = {}) {
  const sourcePath = path.join(__dirname, "..", "src", "services", "voicePeer.js");
  const fakeTrack = createFakeTrack();
  const fakeTracks = [fakeTrack];
  const mediaRequests = [];
  const createdAudioElements = [];
  FakeRTCPeerConnection.instances = [];
  const source = fs
    .readFileSync(sourcePath, "utf8")
    .replace(/export function buildIceServers/, "function buildIceServers")
    .replace(/export function normalizeVoiceError/, "function normalizeVoiceError")
    .replace(/export class VoicePeerManager/, "class VoicePeerManager")
    .replace(/export default VoicePeerManager;\s*$/, "")
    .concat("\nmodule.exports = { VoicePeerManager, normalizeVoiceError };\n");
  const sandbox = {
    module: { exports: {} },
    exports: {},
    process: { env: {} },
    setTimeout,
    clearTimeout,
    navigator: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          const track =
            mediaRequests.length === 0 ? fakeTrack : createFakeTrack();
          if (track !== fakeTrack) fakeTracks.push(track);
          mediaRequests.push(constraints);
          return {
            getTracks: () => [track],
            getAudioTracks: () => [track],
          };
        },
      },
    },
    RTCPeerConnection: FakeRTCPeerConnection,
    document: {
      createElement: () => {
        const element = {
          autoplay: false,
          playsInline: false,
          dataset: {},
          parentNode: null,
          playCalls: 0,
          play() {
            this.playCalls += 1;
            return playRejects
              ? Promise.reject(new Error("play blocked"))
              : Promise.resolve();
          },
        };
        createdAudioElements.push(element);
        return element;
      },
      body: {
        appendChild(element) {
          element.parentNode = this;
        },
        removeChild(element) {
          element.parentNode = null;
        },
      },
    },
  };
  vm.runInNewContext(source, sandbox, { filename: sourcePath });
  return {
    ...sandbox.module.exports,
    createdPeerConnections: FakeRTCPeerConnection.instances,
    fakeTrack,
    fakeTracks,
    mediaRequests,
    createdAudioElements,
  };
}

class FakeRTCPeerConnection {
  constructor() {
    this.signalingState = "stable";
    this.connectionState = "new";
    this.remoteDescription = null;
    this.localDescription = null;
    this.candidates = [];
    this.senders = [];
    FakeRTCPeerConnection.instances.push(this);
  }

  addTrack(track) {
    const sender = {
      track,
      replaceTrackCalls: [],
      async replaceTrack(nextTrack) {
        this.replaceTrackCalls.push(nextTrack);
        this.track = nextTrack;
      },
    };
    this.senders.push(sender);
    return sender;
  }

  getSenders() {
    return this.senders;
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description;
    this.signalingState =
      description.type === "offer" ? "have-remote-offer" : "stable";
  }

  async createAnswer() {
    return { type: "answer", sdp: "answer-sdp" };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
    this.signalingState = description.type === "offer" ? "have-local-offer" : "stable";
  }

  async createOffer() {
    return { type: "offer", sdp: "offer-sdp" };
  }

  async addIceCandidate(candidate) {
    if (!this.remoteDescription) throw new Error("missing remote description");
    this.candidates.push(candidate);
  }

  close() {
    this.connectionState = "closed";
  }
}
FakeRTCPeerConnection.instances = [];

async function testEarlyOfferIsAnsweredAfterMemberSync() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "offer",
      channelId: "main",
      description: { type: "offer", sdp: "early-offer" },
    },
  });

  await manager.sync({
    ownId: "player-3",
    channelId: "main",
    members: [{ id: "player-2" }, { id: "player-3" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  assert.strictEqual(sentSignals.length, 1);
  assert.strictEqual(sentSignals[0].toId, "player-2");
  assert.strictEqual(sentSignals[0].signal.type, "answer");
}

async function testRepeatedSyncKeepsOnePeerAndOneOffer() {
  const { VoicePeerManager, createdPeerConnections } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });
  const syncPayload = {
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  };

  await manager.sync(syncPayload);
  await manager.sync(syncPayload);
  await manager.sync(syncPayload);

  assert.strictEqual(manager.peers.size, 1);
  assert.strictEqual(createdPeerConnections.length, 1);
  assert.strictEqual(
    sentSignals.filter((item) => item.signal.type === "offer").length,
    1,
  );
}

async function testChannelSwitchRecreatesPeerForSameMember() {
  const { VoicePeerManager, createdPeerConnections } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.sync({
    ownId: "player-1",
    channelId: "room-a",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  const firstPeer = manager.peers.get("player-2");

  await manager.sync({
    ownId: "player-1",
    channelId: "room-b",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  const secondPeer = manager.peers.get("player-2");

  assert.notStrictEqual(secondPeer, firstPeer);
  assert.strictEqual(firstPeer.pc.connectionState, "closed");
  assert.strictEqual(createdPeerConnections.length, 2);
  assert.strictEqual(
    sentSignals.filter((item) => item.signal.type === "offer").length,
    2,
  );
  assert.strictEqual(sentSignals[1].signal.channelId, "room-b");
}

async function testNextChannelOfferArrivingDuringSwitchIsQueued() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.sync({
    ownId: "player-3",
    channelId: "room-a",
    members: [{ id: "player-2" }, { id: "player-3" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "offer",
      channelId: "room-b",
      description: { type: "offer", sdp: "room-b-offer" },
    },
  });
  assert.strictEqual(manager.pendingSignals.length, 1);

  await manager.sync({
    ownId: "player-3",
    channelId: "room-b",
    members: [{ id: "player-2" }, { id: "player-3" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  assert.strictEqual(manager.pendingSignals.length, 0);
  assert.strictEqual(sentSignals.length, 1);
  assert.strictEqual(sentSignals[0].toId, "player-2");
  assert.strictEqual(sentSignals[0].signal.type, "answer");
  assert.strictEqual(sentSignals[0].signal.channelId, "room-b");
}

async function testTwoManagersCompleteOfferAnswerHandshake() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const signalQueue = [];
  const managers = {};
  managers["player-1"] = new VoicePeerManager({
    sendSignal: (payload) => signalQueue.push({ fromId: "player-1", payload }),
  });
  managers["player-2"] = new VoicePeerManager({
    sendSignal: (payload) => signalQueue.push({ fromId: "player-2", payload }),
  });
  const members = [{ id: "player-1" }, { id: "player-2" }];

  await managers["player-1"].sync({
    ownId: "player-1",
    channelId: "main",
    members,
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  await managers["player-2"].sync({
    ownId: "player-2",
    channelId: "main",
    members,
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  while (signalQueue.length) {
    const { fromId, payload } = signalQueue.shift();
    await managers[payload.toId].handleSignal({
      fromId,
      signal: payload.signal,
    });
  }

  assert.strictEqual(managers["player-1"].peers.size, 1);
  assert.strictEqual(managers["player-2"].peers.size, 1);
  assert.strictEqual(
    managers["player-1"].peers.get("player-2").pc.signalingState,
    "stable",
  );
  assert.strictEqual(
    managers["player-2"].peers.get("player-1").pc.signalingState,
    "stable",
  );
}

async function testMicrophoneUsesEchoSafeConstraints() {
  const { VoicePeerManager, mediaRequests } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  assert.strictEqual(mediaRequests.length, 1);
  assert.strictEqual(mediaRequests[0].audio.echoCancellation, true);
  assert.strictEqual(mediaRequests[0].audio.noiseSuppression, true);
  assert.strictEqual(mediaRequests[0].audio.autoGainControl, true);
}

async function testMicrophoneTrackFollowsMuteAndSpeakPermission() {
  const { VoicePeerManager, fakeTrack } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: false,
    canSpeak: true,
  });
  assert.strictEqual(fakeTrack.enabled, false);

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  assert.strictEqual(fakeTrack.enabled, true);

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: false,
  });
  assert.strictEqual(fakeTrack.enabled, false);
}

async function testExistingVoiceBehavior() {
  const { VoicePeerManager, normalizeVoiceError } = loadVoicePeerManager();
  assert.strictEqual(
    normalizeVoiceError(new Error("Permission denied")),
    "microphone_permission_denied",
    "browser permission denied errors should use a stable translation key",
  );

  assert.strictEqual(
    normalizeVoiceError({
      name: "NotAllowedError",
      message: "The request is not allowed",
    }),
    "microphone_permission_denied",
    "NotAllowedError should use the microphone permission translation key",
  );

  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.sync({
    ownId: "b",
    channelId: "private-c",
    members: [{ id: "b" }, { id: "c" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  await manager.handleSignal({
    fromId: "a",
    signal: {
      type: "answer",
      channelId: "private-a",
      description: { type: "answer", sdp: "old-answer" },
    },
  });

  assert.strictEqual(
    manager.peers.has("a"),
    false,
    "stale signals from a previous private room should be ignored",
  );

  await manager.handleSignal({
    fromId: "c",
    signal: {
      type: "answer",
      channelId: "private-c",
      description: { type: "answer", sdp: "unexpected-answer" },
    },
  });

  assert.strictEqual(
    manager.peers.has("c"),
    true,
    "current-channel peers should remain tracked",
  );

  const offerSignal = sentSignals.find(
    (item) => item.signal && item.signal.type === "offer",
  );
  assert(offerSignal, "initiating peers should send an offer");
  assert.strictEqual(
    offerSignal.signal.channelId,
    "private-c",
    "voice signals should carry their channel id",
  );
  manager.destroy();
}

async function testSignalQueueDropsStaleChannelsAndCapsPendingSignals() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });
  manager.channelId = "private-current";

  await manager.handleSignal({
    fromId: "player-old",
    signal: {
      type: "offer",
      channelId: "private-old",
      description: { type: "offer", sdp: "old-room-offer" },
    },
  });
  assert.strictEqual(manager.pendingSignals.length, 0);

  for (let i = 0; i < 105; i += 1) {
    await manager.handleSignal({
      fromId: `player-${i}`,
      signal: {
        type: "offer",
        channelId: "private-current",
        description: { type: "offer", sdp: `offer-${i}` },
      },
    });
  }

  assert.strictEqual(manager.pendingSignals.length, 100);
  assert.strictEqual(manager.pendingSignals[0].fromId, "player-5");
  assert.strictEqual(manager.pendingSignals[99].fromId, "player-104");
}

async function testEarlyCandidateWaitsForRemoteDescription() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "candidate",
      channelId: "main",
      candidate: { candidate: "candidate-before-offer" },
    },
  });
  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "offer",
      channelId: "main",
      description: { type: "offer", sdp: "offer-after-candidate" },
    },
  });

  const peer = manager.peers.get("player-2");
  assert.strictEqual(peer.pc.candidates.length, 1);
  assert.strictEqual(peer.pc.candidates[0].candidate, "candidate-before-offer");
}

async function testEarlyCandidateWaitsForRemoteAnswer() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const peer = manager.peers.get("player-2");
  assert(sentSignals.some((item) => item.signal.type === "offer"));
  assert.strictEqual(peer.pc.signalingState, "have-local-offer");

  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "candidate",
      channelId: "main",
      candidate: { candidate: "candidate-before-answer" },
    },
  });
  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "answer",
      channelId: "main",
      description: { type: "answer", sdp: "answer-after-candidate" },
    },
  });

  assert.strictEqual(peer.pc.candidates.length, 1);
  assert.strictEqual(peer.pc.candidates[0].candidate, "candidate-before-answer");
  assert.strictEqual(peer.pc.signalingState, "stable");
}

async function testRemoteStreamCreatesAudioAndStartsPlayback() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });
  const remoteStream = { id: "remote-stream" };

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const peer = manager.peers.get("player-2");
  peer.pc.ontrack({ streams: [remoteStream] });

  assert.strictEqual(createdAudioElements.length, 1);
  assert.strictEqual(createdAudioElements[0].srcObject, remoteStream);
  assert.strictEqual(createdAudioElements[0].autoplay, true);
  assert.strictEqual(createdAudioElements[0].playsInline, true);
  assert.strictEqual(createdAudioElements[0].dataset.voicePeer, "player-2");
  assert.strictEqual(createdAudioElements[0].playCalls, 1);
}

async function testListenVolumeAppliesToExistingAndFutureAudio() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  manager.setListenVolume(0.35);
  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  manager.peers.get("player-2").pc.ontrack({ streams: [{ id: "remote-stream" }] });

  assert.strictEqual(createdAudioElements[0].volume, 0.35);
  manager.setListenVolume(0.8);
  assert.strictEqual(createdAudioElements[0].volume, 0.8);
}

async function testSpeakingDetectionApiIsWired() {
  const sourcePath = path.join(__dirname, "..", "src", "services", "voicePeer.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  [
    "onSpeakingChange",
    "startSpeakingDetection",
    "stopSpeakingDetection",
    "sampleSpeakingLevel",
    "setSpeaking(false)",
  ].forEach((needle) => assert(source.includes(needle), `voice peer missing ${needle}`));
}

async function testRepeatedRemoteTracksReuseAudioElement() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });
  const firstStream = { id: "first-stream" };
  const secondStream = { id: "second-stream" };

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const peer = manager.peers.get("player-2");
  peer.pc.ontrack({ streams: [firstStream] });
  peer.pc.ontrack({ streams: [secondStream] });

  assert.strictEqual(createdAudioElements.length, 1);
  assert.strictEqual(createdAudioElements[0].srcObject, secondStream);
  assert.strictEqual(createdAudioElements[0].playCalls, 2);
}

async function testRemotePlaybackFailureDoesNotBreakPeer() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager({
    playRejects: true,
  });
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const peer = manager.peers.get("player-2");
  peer.pc.ontrack({ streams: [{ id: "remote-stream" }] });
  await Promise.resolve();

  assert.strictEqual(createdAudioElements.length, 1);
  assert.strictEqual(createdAudioElements[0].playCalls, 1);
  assert.strictEqual(manager.peers.has("player-2"), true);
}

async function testVisibilityRestoreReplaysRemoteAudio() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  manager.peers.get("player-2").pc.ontrack({ streams: [{ id: "remote-stream" }] });
  manager.replayRemoteAudio();

  assert.strictEqual(createdAudioElements[0].playCalls, 2);
}

async function testEndedMicrophoneTrackRefreshesStreamAndReplacesSenders() {
  const {
    VoicePeerManager,
    fakeTrack,
    fakeTracks,
    mediaRequests,
    createdPeerConnections,
  } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const sender = createdPeerConnections[0].getSenders()[0];
  assert.strictEqual(sender.track, fakeTrack);

  fakeTrack.onended();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.strictEqual(mediaRequests.length, 2);
  assert.strictEqual(fakeTracks.length, 2);
  assert.strictEqual(sender.track, fakeTracks[1]);
  assert.strictEqual(fakeTracks[1].enabled, true);
  assert.strictEqual(sender.replaceTrackCalls[0], fakeTracks[1]);
}

async function testRepeatedConnectionFailuresEmitPermanentStatus() {
  const { VoicePeerManager, createdPeerConnections } = loadVoicePeerManager();
  const statuses = [];
  const manager = new VoicePeerManager({
    sendSignal: () => {},
    onStatus: (status) => statuses.push(status),
  });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  for (let index = 0; index < 5; index += 1) {
    const pc = createdPeerConnections[createdPeerConnections.length - 1];
    pc.connectionState = "failed";
    pc.onconnectionstatechange();
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  assert(
    statuses.some(
      (status) =>
        status.peerId === "player-2" &&
        status.state === "failed_permanent" &&
        status.reason === "voice_connection_failed",
    ),
    "repeated failed peer restarts should emit a permanent failure status",
  );
}

async function testLeavingChannelClosesPeerAndRemovesAudio() {
  const { VoicePeerManager, createdAudioElements } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  const peer = manager.peers.get("player-2");
  peer.pc.ontrack({ streams: [{ id: "remote-stream" }] });
  assert.strictEqual(createdAudioElements[0].parentNode !== null, true);

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  assert.strictEqual(manager.peers.has("player-2"), false);
  assert.strictEqual(peer.pc.connectionState, "closed");
  assert.strictEqual(createdAudioElements[0].parentNode, null);
}

async function testDisablingVoiceStopsStreamAndClearsPendingSignals() {
  const { VoicePeerManager, fakeTrack } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  await manager.handleSignal({
    fromId: "player-2",
    signal: {
      type: "offer",
      channelId: "main",
      description: { type: "offer", sdp: "queued-offer" },
    },
  });
  assert.strictEqual(manager.pendingSignals.length, 1);

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: false,
    micEnabled: false,
    canSpeak: false,
  });

  assert.strictEqual(manager.pendingSignals.length, 0);
  assert.strictEqual(manager.localStream, null);
  assert.strictEqual(fakeTrack.stopped, true);
}

async function testSelfSignalsAreIgnoredInsteadOfQueued() {
  const { VoicePeerManager } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });

  await manager.handleSignal({
    fromId: "player-1",
    signal: {
      type: "offer",
      channelId: "main",
      description: { type: "offer", sdp: "self-offer" },
    },
  });

  assert.strictEqual(manager.pendingSignals.length, 0);
  assert.strictEqual(manager.peers.has("player-1"), false);
}

async function testReenablingVoiceCreatesFreshLocalStream() {
  const { VoicePeerManager, fakeTracks, mediaRequests } = loadVoicePeerManager();
  const manager = new VoicePeerManager({ sendSignal: () => {} });
  const enabledPayload = {
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  };

  await manager.sync(enabledPayload);
  await manager.sync({
    ...enabledPayload,
    enabled: false,
    micEnabled: false,
  });
  await manager.sync(enabledPayload);

  assert.strictEqual(mediaRequests.length, 2);
  assert.strictEqual(fakeTracks.length, 2);
  assert.strictEqual(fakeTracks[0].stopped, true);
  assert.strictEqual(fakeTracks[1].stopped, false);
  assert.strictEqual(fakeTracks[1].enabled, true);
}

async function testConcurrentSyncsCreateSinglePeerConnection() {
  const { VoicePeerManager, createdPeerConnections } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });
  const syncPayload = {
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  };

  // 进房瞬间多个 watcher 同时触发 sync，不能创建重复连接
  await Promise.all([
    manager.sync(syncPayload),
    manager.sync(syncPayload),
    manager.sync(syncPayload),
  ]);

  assert.strictEqual(manager.peers.size, 1);
  assert.strictEqual(createdPeerConnections.length, 1);
  assert.strictEqual(
    sentSignals.filter((item) => item.signal.type === "offer").length,
    1,
  );
}

async function testFailedConnectionIsAutomaticallyRestarted() {
  const { VoicePeerManager, createdPeerConnections } = loadVoicePeerManager();
  const sentSignals = [];
  const manager = new VoicePeerManager({
    sendSignal: (payload) => sentSignals.push(payload),
  });

  await manager.sync({
    ownId: "player-1",
    channelId: "main",
    members: [{ id: "player-1" }, { id: "player-2" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true,
  });
  assert.strictEqual(createdPeerConnections.length, 1);

  const firstPc = createdPeerConnections[0];
  firstPc.connectionState = "failed";
  firstPc.onconnectionstatechange();

  await new Promise((resolve) => setTimeout(resolve, 700));

  assert.strictEqual(createdPeerConnections.length, 2);
  assert.strictEqual(
    manager.peers.get("player-2").pc,
    createdPeerConnections[1],
  );
  assert.strictEqual(
    sentSignals.filter((item) => item.signal.type === "offer").length,
    2,
  );
}

async function run() {
  await testExistingVoiceBehavior();
  await testMicrophoneUsesEchoSafeConstraints();
  await testMicrophoneTrackFollowsMuteAndSpeakPermission();
  await testEarlyOfferIsAnsweredAfterMemberSync();
  await testRepeatedSyncKeepsOnePeerAndOneOffer();
  await testChannelSwitchRecreatesPeerForSameMember();
  await testNextChannelOfferArrivingDuringSwitchIsQueued();
  await testTwoManagersCompleteOfferAnswerHandshake();
  await testSignalQueueDropsStaleChannelsAndCapsPendingSignals();
  await testEarlyCandidateWaitsForRemoteDescription();
  await testEarlyCandidateWaitsForRemoteAnswer();
  await testRemoteStreamCreatesAudioAndStartsPlayback();
  await testListenVolumeAppliesToExistingAndFutureAudio();
  await testSpeakingDetectionApiIsWired();
  await testRepeatedRemoteTracksReuseAudioElement();
  await testRemotePlaybackFailureDoesNotBreakPeer();
  await testVisibilityRestoreReplaysRemoteAudio();
  await testEndedMicrophoneTrackRefreshesStreamAndReplacesSenders();
  await testRepeatedConnectionFailuresEmitPermanentStatus();
  await testLeavingChannelClosesPeerAndRemovesAudio();
  await testDisablingVoiceStopsStreamAndClearsPendingSignals();
  await testSelfSignalsAreIgnoredInsteadOfQueued();
  await testReenablingVoiceCreatesFreshLocalStream();
  await testConcurrentSyncsCreateSinglePeerConnection();
  await testFailedConnectionIsAutomaticallyRestarted();
}

run()
  .then(() => {
    console.log("voice peer manager tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
