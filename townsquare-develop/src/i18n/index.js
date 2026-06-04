import Vue from "vue";

export const DEFAULT_LOCALE = "zh-CN";
export const LOCALE_STORAGE_KEY = "townsquare.locale";

export const locales = [
  { code: "zh-CN", label: "中文" },
  { code: "en-US", label: "English" }
];

const messages = {
  "zh-CN": {
    app: {
      titlePublic: "染然钟楼 城镇广场",
      titleGrimoire: "染然钟楼 魔典"
    },
    common: {
      language: "语言",
      chinese: "中文",
      english: "English",
      customScript: "自定义剧本",
      customScriptCharacters: "自定义剧本 / 角色",
      customNote: "自定义标记",
      good: "好人",
      evil: "邪恶",
      close: "关闭",
      back: "返回",
      copyJson: "复制 JSON",
      loadState: "加载状态",
      uploadJson: "上传 JSON",
      enterUrl: "输入 URL"
    },
    menu: {
      recentNominations: "最近提名：{count}",
      sessionTitle: "本局还有 {count} 名其他玩家{latency}",
      latency: "（延迟 {ping}ms）",
      grimoire: "魔典",
      hide: "隐藏",
      show: "显示",
      switchToNight: "切换到夜晚",
      switchToDay: "切换到白天",
      nightOrder: "夜晚顺序",
      zoom: "缩放",
      backgroundImage: "背景图片",
      showCustomImages: "显示自定义图片",
      disableAnimations: "禁用动画",
      muteSounds: "静音",
      playing: "游玩中",
      hosting: "主持中",
      liveSession: "在线房间",
      host: "主持（说书人）",
      join: "加入（玩家）",
      delayTo: "到{target}的延迟",
      hostTarget: "主持",
      playersTarget: "玩家",
      copyPlayerLink: "复制玩家链接",
      sendCharacters: "发送角色",
      voteHistory: "投票记录",
      leaveSession: "离开房间",
      players: "玩家",
      add: "添加",
      randomize: "随机排序",
      removeAll: "全部移除",
      characters: "角色",
      selectEdition: "选择版本",
      chooseAssign: "选择并分配",
      addFabled: "添加传奇角色",
      help: "帮助",
      referenceSheet: "角色参考表",
      nightOrderSheet: "夜晚顺序表",
      gameStateJson: "游戏状态 JSON",
      joinDiscord: "加入 Discord",
      sourceCode: "源代码",
      promptBackground: "输入自定义背景 URL",
      promptHost: "输入本局频道编号 / 名称",
      promptJoin: "输入要加入的频道编号 / 名称",
      promptPlayerName: "玩家名称",
      confirmDistribute: "确定要把已分配的角色发送给所有已入座玩家吗？",
      confirmCustomImages:
        "确定允许自定义图片吗？恶意剧本作者可能通过这种方式追踪你的 IP 地址。",
      confirmLeave: "确定要离开当前在线游戏吗？",
      confirmRandomize: "确定要随机排列座位吗？",
      confirmClearPlayers: "确定要移除所有玩家吗？",
      confirmClearRoles: "确定要移除所有玩家角色吗？"
    },
    intro: {
      welcomePrefix: "欢迎来到（非官方）",
      title: "血染钟楼虚拟城镇广场与魔典",
      welcomeSuffix: "！",
      addPlayersPrefix: "请通过右上角的",
      menu: "菜单",
      addPlayersSuffix: "添加更多玩家，或按 [A] 添加。你也可以按 [J] 加入游戏房间。",
      footerPrefix: "本项目免费且开源，可在",
      github: "GitHub",
      footerSuffix:
        "查看。它与 The Pandemonium Institute 没有关联。\"Blood on the Clocktower\" 是 Steven Medway 和 The Pandemonium Institute 的商标。"
    },
    townInfo: {
      addMorePlayers: "请添加更多玩家！",
      byAuthor: "作者：{author}",
      nightPhase: "夜晚阶段"
    },
    vote: {
      nominated: "提名了",
      votesInFavor: "{count} 票赞成",
      majority: "多数票为 {count}",
      timePerPlayer: "每名玩家时间：",
      countdown: "倒计时",
      restart: "重新开始",
      start: "开始",
      pause: "暂停",
      resume: "继续",
      reset: "重置",
      markForExecution: "标记处决",
      clearMark: "清除标记",
      secondsBetweenVotes: "每票间隔 {seconds} 秒",
      handDown: "放下手",
      handUp: "举手",
      claimSeatToVote: "请先认领座位再投票。"
    },
    townSquare: {
      otherCharacters: "其他角色",
      demonBluffs: "恶魔伪装",
      fabled: "传奇角色",
      firstNight: "首夜",
      otherNights: "其他夜晚",
      confirmRemovePlayer: "确定要移除 {name} 吗？"
    },
    player: {
      handUp: "举手",
      handDown: "放下手",
      cancel: "取消",
      swapWithPlayer: "与该玩家交换座位",
      moveToSeat: "移动玩家到该座位",
      nominatePlayer: "提名该玩家",
      ghostVote: "亡魂票",
      changePronouns: "修改称谓",
      rename: "重命名",
      movePlayer: "移动玩家",
      swapSeats: "交换座位",
      remove: "移除",
      emptySeat: "清空座位",
      nomination: "提名",
      claimSeat: "认领座位",
      vacateSeat: "离开座位",
      seatOccupied: "座位已占用",
      promptPronouns: "玩家称谓",
      promptName: "玩家名称"
    },
    modals: {
      chooseEdition: "选择版本：",
      loadCustomTitle: "加载自定义剧本 / 角色",
      loadCustomDescription:
        "如需游玩自定义剧本，请在官方剧本工具中选择要使用的角色，然后在这里上传生成的 custom-list.json，或提供该 JSON 文件的 URL。",
      scriptTool: "剧本工具",
      customCharactersDescription: "如需游玩自定义角色，请阅读",
      documentation: "文档",
      customCharactersSuffix: "，了解如何编写自定义角色定义文件。",
      trustWarning: "只加载你信任来源的自定义 JSON 文件！",
      popularScripts: "热门自定义剧本：",
      useClipboard: "使用剪贴板中的 JSON",
      promptCustomUrl: "输入 custom-script.json 文件 URL",
      errorReadCustom: "读取自定义剧本失败：{message}",
      errorLoadCustom: "加载自定义剧本失败：{message}",
      selectCharacters: "为 {count} 名玩家选择角色：",
      setupWarning:
        "警告：已选择会改变游戏设置的角色！随机分配器不会处理这些角色的设置效果。",
      allowDuplicate: "允许重复角色",
      assignCharacters: "随机分配 {count} 个角色",
      shuffleCharacters: "随机选择角色",
      chooseFabled: "选择要加入游戏的传奇角色",
      chooseReminder: "选择一个提醒标记：",
      promptCustomReminder: "添加自定义提醒标记",
      chooseRoleFor: "为 {name} 选择新角色",
      bluffing: "伪装位",
      editionRoles: "当前版本角色",
      otherTravelers: "其他旅行者",
      showNightOrder: "显示夜晚顺序",
      showCharacterReference: "显示角色参考",
      characterReference: "角色参考",
      nightOrder: "夜晚顺序",
      firstNight: "首夜",
      otherNights: "其他夜晚",
      jinxed: "相克规则",
      minionInfo: "爪牙信息",
      demonInfo: "恶魔信息与伪装",
      minionReminder:
        "如果有多个爪牙，他们互相睁眼确认。展示“这是恶魔”卡，并指向恶魔。",
      demonReminder:
        "展示“这些是你的爪牙”卡，并指向每个爪牙。展示“这些角色不在场”卡，展示 3 个不在场的好人角色标记。",
      voteHistory: "投票记录",
      clearVoteHistory: "清空投票记录",
      accessibleToPlayers: "玩家可查看",
      clearForEveryone: "为所有人清空",
      time: "时间",
      nominator: "提名者",
      nominee: "被提名者",
      type: "类型",
      votes: "票数",
      majority: "多数票",
      voters: "投票者",
      currentGameState: "当前游戏状态",
      unableToParseJson: "无法解析 JSON：{message}",
      team: {
        townsfolk: "镇民",
        outsider: "外来者",
        minion: "爪牙",
        demon: "恶魔",
        traveler: "旅行者",
        fabled: "传奇角色"
      }
    },
    session: {
      missingCustomRoles:
        "本房间包含当前找不到的自定义角色。请先加载它们再加入！缺失角色：{roles}"
    }
  },
  "en-US": {
    app: {
      titlePublic: "Blood on the Clocktower Town Square",
      titleGrimoire: "Blood on the Clocktower Grimoire"
    },
    common: {
      language: "Language",
      chinese: "中文",
      english: "English",
      customScript: "Custom Script",
      customScriptCharacters: "Custom Script / Characters",
      customNote: "Custom note",
      good: "Good",
      evil: "Evil",
      close: "Close",
      back: "Back",
      copyJson: "Copy JSON",
      loadState: "Load State",
      uploadJson: "Upload JSON",
      enterUrl: "Enter URL"
    },
    menu: {
      recentNominations: "{count} recent {label}",
      sessionTitle: "{count} other players in this session{latency}",
      latency: " ({ping}ms latency)",
      nominationSingular: "nomination",
      nominationPlural: "nominations",
      grimoire: "Grimoire",
      hide: "Hide",
      show: "Show",
      switchToNight: "Switch to Night",
      switchToDay: "Switch to Day",
      nightOrder: "Night order",
      zoom: "Zoom",
      backgroundImage: "Background image",
      showCustomImages: "Show Custom Images",
      disableAnimations: "Disable Animations",
      muteSounds: "Mute Sounds",
      playing: "Playing",
      hosting: "Hosting",
      liveSession: "Live Session",
      host: "Host (Storyteller)",
      join: "Join (Player)",
      delayTo: "Delay to {target}",
      hostTarget: "host",
      playersTarget: "players",
      copyPlayerLink: "Copy player link",
      sendCharacters: "Send Characters",
      voteHistory: "Vote history",
      leaveSession: "Leave Session",
      players: "Players",
      add: "Add",
      randomize: "Randomize",
      removeAll: "Remove all",
      characters: "Characters",
      selectEdition: "Select Edition",
      chooseAssign: "Choose & Assign",
      addFabled: "Add Fabled",
      help: "Help",
      referenceSheet: "Reference Sheet",
      nightOrderSheet: "Night Order Sheet",
      gameStateJson: "Game State JSON",
      joinDiscord: "Join Discord",
      sourceCode: "Source code",
      promptBackground: "Enter custom background URL",
      promptHost: "Enter a channel number / name for your session",
      promptJoin: "Enter the channel number / name of the session you want to join",
      promptPlayerName: "Player name",
      confirmDistribute: "Do you want to distribute assigned characters to all SEATED players?",
      confirmCustomImages:
        "Are you sure you want to allow custom images? A malicious script file author might track your IP address this way.",
      confirmLeave: "Are you sure you want to leave the active live game?",
      confirmRandomize: "Are you sure you want to randomize seatings?",
      confirmClearPlayers: "Are you sure you want to remove all players?",
      confirmClearRoles: "Are you sure you want to remove all player roles?"
    },
    intro: {
      welcomePrefix: "Welcome to the (unofficial)",
      title: "Virtual Town Square and Grimoire",
      welcomeSuffix: " for Blood on the Clocktower!",
      addPlayersPrefix: "Please add more players through the",
      menu: "Menu",
      addPlayersSuffix:
        "on the top right or by pressing [A]. You can also join a game session by pressing [J].",
      footerPrefix: "This project is free and open source and can be found on",
      github: "GitHub",
      footerSuffix:
        ". It is not affiliated with The Pandemonium Institute. \"Blood on the Clocktower\" is a trademark of Steven Medway and The Pandemonium Institute."
    },
    townInfo: {
      addMorePlayers: "Please add more players!",
      byAuthor: "by {author}",
      nightPhase: "Night phase"
    },
    vote: {
      nominated: "nominated",
      votesInFavor: "{count} vote{plural} in favor",
      majority: "majority is {count}",
      timePerPlayer: "Time per player:",
      countdown: "Countdown",
      restart: "Restart",
      start: "Start",
      pause: "Pause",
      resume: "Resume",
      reset: "Reset",
      markForExecution: "Mark for execution",
      clearMark: "Clear mark",
      secondsBetweenVotes: "{seconds} seconds between votes",
      handDown: "Hand DOWN",
      handUp: "Hand UP",
      claimSeatToVote: "Please claim a seat to vote."
    },
    townSquare: {
      otherCharacters: "Other characters",
      demonBluffs: "Demon bluffs",
      fabled: "Fabled",
      firstNight: "First Night",
      otherNights: "Other Nights",
      confirmRemovePlayer: "Do you really want to remove {name}?"
    },
    player: {
      handUp: "Hand UP",
      handDown: "Hand DOWN",
      cancel: "Cancel",
      swapWithPlayer: "Swap seats with this player",
      moveToSeat: "Move player to this seat",
      nominatePlayer: "Nominate this player",
      ghostVote: "Ghost vote",
      changePronouns: "Change Pronouns",
      rename: "Rename",
      movePlayer: "Move player",
      swapSeats: "Swap seats",
      remove: "Remove",
      emptySeat: "Empty seat",
      nomination: "Nomination",
      claimSeat: "Claim seat",
      vacateSeat: "Vacate seat",
      seatOccupied: "Seat occupied",
      promptPronouns: "Player pronouns",
      promptName: "Player name"
    },
    modals: {
      chooseEdition: "Select an edition:",
      loadCustomTitle: "Load custom script / characters",
      loadCustomDescription:
        "To play with a custom script, you need to select the characters you want to play with in the official",
      scriptTool: "Script Tool",
      customCharactersDescription: "To play with custom characters, please read",
      documentation: "the documentation",
      customCharactersSuffix: "on how to write a custom character definition file.",
      trustWarning: "Only load custom JSON files from sources that you trust!",
      popularScripts: "Some popular custom scripts:",
      useClipboard: "Use JSON from Clipboard",
      promptCustomUrl: "Enter URL to a custom-script.json file",
      errorReadCustom: "Error reading custom script: {message}",
      errorLoadCustom: "Error loading custom script: {message}",
      selectCharacters: "Select the characters for {count} players:",
      setupWarning:
        "Warning: there are characters selected that modify the game setup! The randomizer does not account for these characters.",
      allowDuplicate: "Allow duplicate characters",
      assignCharacters: "Assign {count} characters randomly",
      shuffleCharacters: "Shuffle characters",
      chooseFabled: "Choose a fabled character to add to the game",
      chooseReminder: "Choose a reminder token:",
      promptCustomReminder: "Add a custom reminder note",
      chooseRoleFor: "Choose a new character for {name}",
      bluffing: "bluffing",
      editionRoles: "Edition Roles",
      otherTravelers: "Other Travelers",
      showNightOrder: "Show Night Order",
      showCharacterReference: "Show Character Reference",
      characterReference: "Character Reference",
      nightOrder: "Night Order",
      firstNight: "First Night",
      otherNights: "Other Nights",
      jinxed: "Jinxed",
      minionInfo: "Minion info",
      demonInfo: "Demon info & bluffs",
      minionReminder:
        "If more than one Minion, they all make eye contact with each other. Show the \"This is the Demon\" card. Point to the Demon.",
      demonReminder:
        "Show the \"These are your minions\" card. Point to each Minion. Show the \"These characters are not in play\" card. Show 3 character tokens of good characters not in play.",
      voteHistory: "Vote history",
      clearVoteHistory: "Clear vote history",
      accessibleToPlayers: "Accessible to players",
      clearForEveryone: "Clear for everyone",
      time: "Time",
      nominator: "Nominator",
      nominee: "Nominee",
      type: "Type",
      votes: "Votes",
      majority: "Majority",
      voters: "Voters",
      currentGameState: "Current Game State",
      unableToParseJson: "Unable to parse JSON: {message}",
      team: {
        townsfolk: "townsfolk",
        outsider: "outsider",
        minion: "minion",
        demon: "demon",
        traveler: "traveler",
        fabled: "fabled"
      }
    },
    session: {
      missingCustomRoles:
        "This session contains custom characters that can't be found. Please load them before joining! Missing roles: {roles}"
    }
  }
};

const getInitialLocale = () => {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return locales.some(({ code }) => code === stored) ? stored : DEFAULT_LOCALE;
};

export const i18nState = Vue.observable({
  locale: getInitialLocale()
});

const resolveMessage = (locale, key) =>
  key.split(".").reduce((value, part) => {
    if (value && Object.prototype.hasOwnProperty.call(value, part)) {
      return value[part];
    }
    return undefined;
  }, messages[locale]);

export const t = (key, params = {}) => {
  const template =
    resolveMessage(i18nState.locale, key) ||
    resolveMessage(DEFAULT_LOCALE, key) ||
    key;

  if (typeof template !== "string") return key;

  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
  );
};

export const setLocale = locale => {
  if (!locales.some(({ code }) => code === locale)) return;
  i18nState.locale = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};

export const installI18n = () => {
  Vue.prototype.$i18n = i18nState;
  Vue.prototype.$locales = locales;
  Vue.prototype.$t = t;
  Vue.prototype.$setLocale = setLocale;
};
