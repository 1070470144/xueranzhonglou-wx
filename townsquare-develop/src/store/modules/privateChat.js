import Vue from "vue";

const MAX_MESSAGES_PER_CONVERSATION = 200;

const getConversation = (state, targetId, targetName = "") => {
  if (!state.conversations[targetId]) {
    Vue.set(state.conversations, targetId, {
      targetId,
      targetName,
      messages: [],
      unread: 0,
    });
  } else if (targetName) {
    state.conversations[targetId].targetName = targetName;
  }
  return state.conversations[targetId];
};

const normalizeContent = (content) => String(content || "").trim();

const state = () => ({
  activeTargetId: "",
  conversations: {},
});

const getters = {
  totalUnread({ conversations }) {
    return Object.values(conversations).reduce(
      (total, conversation) => total + conversation.unread,
      0,
    );
  },
  conversationList({ conversations }) {
    return Object.values(conversations).sort((a, b) => {
      const aTime = a.messages.length
        ? a.messages[a.messages.length - 1].createdAt
        : 0;
      const bTime = b.messages.length
        ? b.messages[b.messages.length - 1].createdAt
        : 0;
      return bTime - aTime;
    });
  },
};

const mutations = {
  setActiveTarget(state, targetId) {
    state.activeTargetId = targetId || "";
    if (targetId && state.conversations[targetId]) {
      state.conversations[targetId].unread = 0;
    }
  },
  sendMessage(state, payload) {
    const content = normalizeContent(payload.content);
    if (!payload.toId || !content) return;
    const conversation = getConversation(state, payload.toId, payload.toName);
    conversation.messages.push({
      id: payload.id,
      fromId: payload.fromId,
      fromName: payload.fromName,
      toId: payload.toId,
      toName: payload.toName,
      content,
      createdAt: payload.createdAt,
      direction: "out",
    });
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.splice(
        0,
        conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION,
      );
    }
  },
  receiveMessage(state, payload) {
    const content = normalizeContent(payload.content);
    if (!payload.fromId || !content) return;
    const conversation = getConversation(
      state,
      payload.fromId,
      payload.fromName,
    );
    conversation.messages.push({
      id: payload.id,
      fromId: payload.fromId,
      fromName: payload.fromName,
      toId: payload.toId,
      toName: payload.toName,
      content,
      createdAt: payload.createdAt,
      direction: "in",
    });
    if (conversation.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conversation.messages.splice(
        0,
        conversation.messages.length - MAX_MESSAGES_PER_CONVERSATION,
      );
    }
    if (!payload.isOpen || state.activeTargetId !== payload.fromId) {
      conversation.unread += 1;
    }
  },
  clear(state) {
    state.activeTargetId = "";
    state.conversations = {};
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
};
