const assert = require("assert");
const fs = require("fs");
const path = require("path");

const voicePeerPath = path.join(__dirname, "../src/services/voicePeer.js");
const envExamplePath = path.join(__dirname, "../.env.example");
const deployDocPath = path.join(__dirname, "../docs/coturn-deployment.md");
const dockerfilePath = path.join(__dirname, "../Dockerfile");
const composePath = path.join(__dirname, "../docker-compose.yml");

assert(fs.existsSync(voicePeerPath), "voicePeer service should exist");
assert(fs.existsSync(envExamplePath), ".env.example should exist");
assert(fs.existsSync(deployDocPath), "coturn deployment doc should exist");
assert(fs.existsSync(dockerfilePath), "Dockerfile should exist");
assert(fs.existsSync(composePath), "docker-compose.yml should exist");

const voicePeerSource = fs.readFileSync(voicePeerPath, "utf8");
const envExampleSource = fs.readFileSync(envExamplePath, "utf8");
const deployDocSource = fs.readFileSync(deployDocPath, "utf8");
const dockerfileSource = fs.readFileSync(dockerfilePath, "utf8");
const composeSource = fs.readFileSync(composePath, "utf8");

assert(
  /export function buildIceServers/.test(voicePeerSource),
  "voicePeer should export buildIceServers for configurable STUN/TURN"
);

[
  "VUE_APP_VOICE_STUN_URLS",
  "VUE_APP_VOICE_TURN_URLS",
  "VUE_APP_VOICE_TURN_USERNAME",
  "VUE_APP_VOICE_TURN_CREDENTIAL",
].forEach((needle) => {
  assert(
    voicePeerSource.includes(needle),
    `voicePeer should read ${needle}`
  );
  assert(
    envExampleSource.includes(needle),
    `.env.example should document ${needle}`
  );
  assert(dockerfileSource.includes(`ARG ${needle}`), `Dockerfile missing ARG ${needle}`);
  assert(dockerfileSource.includes(`ENV ${needle}=$${needle}`), `Dockerfile missing ENV ${needle}`);
  assert(composeSource.includes(`${needle}:`), `docker-compose.yml missing build arg ${needle}`);
});

assert(
  /const ICE_SERVERS = buildIceServers\(\)/.test(voicePeerSource),
  "RTCPeerConnection should use buildIceServers output"
);

assert(
  /new RTCPeerConnection\(\{\s*iceServers:\s*ICE_SERVERS\s*\}\)/.test(
    voicePeerSource
  ),
  "VoicePeerManager should keep passing ICE_SERVERS to RTCPeerConnection"
);

[
  "turn.xuerantools.org",
  "3478",
  "5349",
  "49160-49260",
  "external-ip",
  "fingerprint",
  "lt-cred-mech",
  "Cloudflare",
  "DNS only",
  "/opt/townsquare/config/townsquare.env",
  "docker run -d",
].forEach((needle) => {
  assert(
    deployDocSource.includes(needle),
    `coturn deployment doc should mention ${needle}`
  );
});

console.log("voice ICE configuration source checks passed");
