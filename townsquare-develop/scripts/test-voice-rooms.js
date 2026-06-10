const assert = require("assert");

const voiceRooms = require("../server/voiceRooms");

function memberIds(snapshot, channelId) {
  const channel = snapshot.channels.find(item => item.id === channelId);
  return channel ? channel.memberIds.slice().sort() : [];
}

function createThreePersonVoiceState() {
  const state = voiceRooms.createVoiceState({ hostName: "Storyteller", now: 1000 });
  voiceRooms.registerParticipant(state, {
    id: "host",
    name: "Storyteller",
    isHost: true,
    now: 1000
  });
  voiceRooms.registerParticipant(state, { id: "p1", name: "Alice", now: 1001 });
  voiceRooms.registerParticipant(state, { id: "p2", name: "Bob", now: 1002 });
  return state;
}

{
  const state = createThreePersonVoiceState();
  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(memberIds(snapshot, "main"), ["host", "p1", "p2"]);
  assert.strictEqual(snapshot.muteAll, false);
  assert.strictEqual(snapshot.recall, null);
}

{
  const state = createThreePersonVoiceState();
  const invite = voiceRooms.createInvite(state, {
    fromId: "p1",
    invitedIds: ["p2"],
    now: 1100
  });
  voiceRooms.respondInvite(state, {
    participantId: "p2",
    inviteId: invite.id,
    accept: true,
    now: 1110
  });

  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(memberIds(snapshot, "main"), ["host"]);
  assert.deepStrictEqual(memberIds(snapshot, invite.channelId), ["p1", "p2"]);
  assert.strictEqual(
    snapshot.participants.find(item => item.id === "p1").currentChannelId,
    invite.channelId
  );
  assert.strictEqual(
    snapshot.participants.find(item => item.id === "p2").currentChannelId,
    invite.channelId
  );
}

{
  const state = createThreePersonVoiceState();
  const invite = voiceRooms.createInvite(state, {
    fromId: "p1",
    invitedIds: ["p2"],
    now: 1320
  });
  voiceRooms.respondInvite(state, {
    participantId: "p2",
    inviteId: invite.id,
    accept: false,
    now: 1330
  });

  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(
    snapshot.channels.map(channel => channel.id),
    ["main"]
  );
  assert.deepStrictEqual(memberIds(snapshot, "main"), ["host", "p1", "p2"]);
  assert.strictEqual(
    snapshot.participants.find(item => item.id === "p1").currentChannelId,
    "main"
  );
}

{
  const state = createThreePersonVoiceState();
  const invite = voiceRooms.createInvite(state, {
    fromId: "p1",
    invitedIds: ["p2"],
    now: 1340
  });
  voiceRooms.respondInvite(state, {
    participantId: "p2",
    inviteId: invite.id,
    accept: true,
    now: 1350
  });
  voiceRooms.unregisterParticipant(state, "p2");

  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(
    snapshot.channels.map(channel => channel.id),
    ["main"]
  );
  assert.deepStrictEqual(memberIds(snapshot, "main"), ["host", "p1"]);
  assert.strictEqual(
    snapshot.participants.find(item => item.id === "p1").currentChannelId,
    "main"
  );
}

{
  const state = createThreePersonVoiceState();
  const invite = voiceRooms.createInvite(state, {
    fromId: "p1",
    invitedIds: ["p2"],
    now: 1200
  });

  assert.throws(
    () => voiceRooms.joinChannel(state, { participantId: "p2", channelId: invite.channelId }),
    /not_channel_member/
  );

  voiceRooms.joinChannel(state, { participantId: "host", channelId: invite.channelId });
  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(memberIds(snapshot, invite.channelId), ["host", "p1"]);
  assert.strictEqual(
    snapshot.channels.find(item => item.id === invite.channelId).storytellerPresent,
    true
  );
}

{
  const state = createThreePersonVoiceState();
  voiceRooms.setMuteAll(state, { byId: "host", value: true });
  assert.strictEqual(voiceRooms.canSpeak(state, "host"), true);
  assert.strictEqual(voiceRooms.canSpeak(state, "p1"), false);
  assert.throws(
    () => voiceRooms.setMuteAll(state, { byId: "p1", value: false }),
    /host_only/
  );
}

{
  const state = createThreePersonVoiceState();
  const invite = voiceRooms.createInvite(state, {
    fromId: "p1",
    invitedIds: ["p2"],
    now: 1300
  });
  voiceRooms.respondInvite(state, {
    participantId: "p2",
    inviteId: invite.id,
    accept: true,
    now: 1310
  });
  voiceRooms.startRecall(state, { byId: "host", now: 1400, delayMs: 3000 });
  assert.throws(
    () => voiceRooms.createInvite(state, { fromId: "p2", invitedIds: ["p1"], now: 1401 }),
    /recall_in_progress/
  );
  voiceRooms.executeRecall(state, { byId: "host", now: 4400 });

  const snapshot = voiceRooms.summarize(state);
  assert.deepStrictEqual(memberIds(snapshot, "main"), ["host", "p1", "p2"]);
  assert.deepStrictEqual(
    snapshot.channels.map(channel => channel.id),
    ["main"]
  );
  assert.deepStrictEqual(snapshot.invitations, []);
  assert.strictEqual(snapshot.recall, null);
}

console.log("voice room state tests passed");
