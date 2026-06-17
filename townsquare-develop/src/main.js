import Vue from "vue";
import App from "./App";
import store from "./store";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { installI18n } from "./i18n";

const faIcons = [
  "AddressCard",
  "Bell",
  "BookOpen",
  "BookDead",
  "BroadcastTower",
  "Chair",
  "CheckSquare",
  "ChevronDown",
  "CloudMoon",
  "Cog",
  "Copy",
  "Clipboard",
  "Comments",
  "Dice",
  "Download",
  "Dragon",
  "ExchangeAlt",
  "ExclamationTriangle",
  "FileCode",
  "FileUpload",
  "HandPaper",
  "HandPointRight",
  "Heartbeat",
  "Image",
  "Link",
  "Magic",
  "MinusCircle",
  "PeopleArrows",
  "PaperPlane",
  "PlusCircle",
  "Question",
  "Random",
  "RedoAlt",
  "Search",
  "SearchMinus",
  "SearchPlus",
  "Skull",
  "Spinner",
  "Square",
  "StepBackward",
  "StepForward",
  "SyncAlt",
  "TheaterMasks",
  "Times",
  "TimesCircle",
  "Tools",
  "Trophy",
  "TrashAlt",
  "Undo",
  "User",
  "UserEdit",
  "UserFriends",
  "Users",
  "VenusMars",
  "VolumeUp",
  "VolumeMute",
  "VoteYea",
  "WindowMaximize",
  "WindowMinimize",
];
const fabIcons = ["Github", "Discord"];
library.add(
  ...faIcons.map((i) => fas["fa" + i]),
  ...fabIcons.map((i) => fab["fa" + i]),
);
Vue.component("font-awesome-icon", FontAwesomeIcon);
installI18n();
Vue.config.productionTip = false;

const app = new Vue({
  render: (h) => h(App),
  store,
}).$mount("#app");

window.__townsquareApp = app;
