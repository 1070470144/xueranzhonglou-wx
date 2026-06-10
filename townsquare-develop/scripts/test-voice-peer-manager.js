const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sourcePath = path.join(__dirname, "../src/services/voicePeer.js");
const source = fs
  .readFileSync(sourcePath, "utf8")
  .replace("export class VoicePeerManager", "class VoicePeerManager")
  .replace("export default VoicePeerManager;", "module.exports = { VoicePeerManager };");

const fakeTrack = {
  enabled: false,
  stop() {}
};
const fakeStream = {
  getAudioTracks: () => [fakeTrack],
  getTracks: () => [fakeTrack]
};

class FakeRTCPeerConnection {
  constructor() {
    this.signalingState = "stable";
    this.connectionState = "new";
    this.localDescription = null;
    this.remoteDescription = null;
    this.remoteDescriptions = [];
    FakeRTCPeerConnection.instances.push(this);
  }

  addTrack() {}

  async createOffer() {
    return { type: "offer", sdp: "offer" };
  }

  async createAnswer() {
    return { type: "answer", sdp: "answer" };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
    if (description.type === "offer") this.signalingState = "have-local-offer";
    if (description.type === "answer") this.signalingState = "stable";
  }

  async setRemoteDescription(description) {
    if (description.type === "answer" && this.signalingState !== "have-local-offer") {
      throw new Error("Called in wrong state: stable");
    }
    this.remoteDescription = description;
    this.remoteDescriptions.push(description);
    if (description.type === "offer") this.signalingState = "have-remote-offer";
    if (description.type === "answer") this.signalingState = "stable";
  }

  async addIceCandidate() {}

  close() {
    this.signalingState = "closed";
    this.connectionState = "closed";
  }
}
FakeRTCPeerConnection.instances = [];

const sandbox = {
  module: { exports: {} },
  navigator: {
    mediaDevices: {
      getUserMedia: async () => fakeStream
    }
  },
  RTCPeerConnection: FakeRTCPeerConnection
};
vm.runInNewContext(source, sandbox, { filename: sourcePath });
const { VoicePeerManager } = sandbox.module.exports;

(async () => {
  const sentSignals = [];
  const manager = new VoicePeerManager({ sendSignal: payload => sentSignals.push(payload) });

  await manager.sync({
    ownId: "b",
    channelId: "private-c",
    members: [{ id: "b" }, { id: "c" }],
    enabled: true,
    micEnabled: true,
    canSpeak: true
  });

  await manager.handleSignal({
    fromId: "a",
    signal: {
      type: "answer",
      channelId: "private-a",
      description: { type: "answer", sdp: "old-answer" }
    }
  });

  assert.strictEqual(manager.peers.has("a"), false, "stale signals from a previous private room should be ignored");

  await manager.handleSignal({
    fromId: "c",
    signal: {
      type: "answer",
      channelId: "private-c",
      description: { type: "answer", sdp: "unexpected-answer" }
    }
  });

  assert.strictEqual(manager.peers.has("c"), true, "current-channel peers should remain tracked");

  const offerSignal = sentSignals.find(item => item.signal && item.signal.type === "offer");
  assert(offerSignal, "initiating peers should send an offer");
  assert.strictEqual(offerSignal.signal.channelId, "private-c", "voice signals should carry their channel id");

  manager.destroy();
  console.log("voice peer manager tests passed");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
