import { callUniCloudFunction, getAuthSession } from "@/services/auth";

function alignmentByTeam(team) {
  if (team === "minion" || team === "demon") return "evil";
  if (team) return "good";
  return "unknown";
}

function safeUserId(user) {
  return user && (user.id || user._id || user.uid || user.userId || user.openid || "");
}

export function buildGameRecordSnapshot({ players, edition, session, winner }) {
  const { token, user } = getAuthSession();
  const storytellerUserId = safeUserId(user);
  const endTime = Date.now();
  const startTime = Number(session && session.gameStartedAt) || endTime;
  const normalizedWinner = ["good", "evil", "unknown"].includes(winner)
    ? winner
    : "unknown";

  return {
    token,
    source: "townsquare-web",
    sessionId: (session && session.sessionId) || "",
    winner: normalizedWinner,
    storyteller: {
      userId: storytellerUserId,
      nickname: (user && (user.nickname || user.email || user.username)) || ""
    },
    script: {
      id: (edition && edition.id) || "custom",
      name: (edition && edition.name) || "自定义剧本",
      author: (edition && edition.author) || "",
      isOfficial: !!(edition && edition.isOfficial)
    },
    startTime,
    endTime,
    duration: Math.max(0, endTime - startTime),
    playerCount: Array.isArray(players) ? players.length : 0,
    players: (players || []).map((player, index) => {
      const role = player.role || {};
      const playerUser = player.user || player.authUser || {};
      const userId = player.userId || safeUserId(playerUser);
      const alignment = alignmentByTeam(role.team);
      return {
        seatIndex: index,
        name: player.name || "",
        userId,
        nickname: player.nickname || playerUser.nickname || "",
        roleId: role.id || "",
        roleName: role.name || "",
        team: role.team || "",
        alignment,
        won:
          normalizedWinner === "unknown" || alignment === "unknown"
            ? null
            : alignment === normalizedWinner,
        isLoggedIn: !!userId
      };
    })
  };
}

export async function saveGameRecord(payload) {
  return callUniCloudFunction("game-record-service", "saveGameRecord", payload);
}
