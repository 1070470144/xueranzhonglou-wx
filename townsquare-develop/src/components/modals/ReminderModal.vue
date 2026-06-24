<template>
  <Modal
    v-if="modals.reminder && availableReminders.length && players[playerIndex]"
    @close="toggleModal('reminder')"
  >
    <h3>{{ $t("modals.chooseReminder") }}</h3>
    <ul class="reminders">
      <li
        v-for="reminder in availableReminders"
        class="reminder"
        :class="[reminder.role]"
        :key="
          reminder.role + ' ' + reminder.name + ' ' + (reminder.image || '')
        "
        @click="addReminder(reminder)"
      >
        <span
          class="icon"
          :style="{
            backgroundImage: `url(${displayReminderImage(reminder)})`,
          }"
        ></span>
        <span class="text">{{ reminder.name }}</span>
      </li>
    </ul>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapMutations, mapState } from "vuex";
import { reminderIconImage } from "../../utils/roleIcon";

/**
 * Helper function that maps a reminder name with a role-based object that provides necessary visual data.
 * @param role The role for which the reminder should be generated
 * @return {function(*): {image: string|string[]|string|*, role: *, name: *, imageAlt: string|*}}
 */
const mapReminder =
  ({ id, image, imageAlt }) =>
  (name) => ({
    role: id,
    image,
    imageAlt,
    name,
  });

const smallTokenFields = [
  "smallTokens",
  "tokenImages",
  "tokens",
  "smallToken",
  "tokenImage",
  "tokenUrl",
];

const smallTokenImageFields = [
  "image",
  "url",
  "fileId",
  "fileID",
  "path",
  "src",
  "thumbnail",
  "tempFilePath",
];

const tokenName = (token, role, index, total) => {
  if (token && typeof token === "object") {
    const name = token.name || token.label || token.text || token.title;
    if (name) return String(name);
  }
  const baseName = role.name || role.displayName || role.id || "Token";
  return total > 1 ? `${baseName} ${index + 1}` : baseName;
};

const tokenImage = (token) => {
  if (!token) return "";
  if (typeof token === "string") return token.trim();
  if (typeof token !== "object") return "";
  const image = smallTokenImageFields
    .map((field) => token[field])
    .find(Boolean);
  return image ? String(image).trim() : "";
};

const roleSmallTokens = (role) => {
  const tokens = [];
  smallTokenFields.forEach((field) => {
    const value = role[field];
    if (!value) return;
    if (Array.isArray(value)) {
      tokens.push(...value);
    } else {
      tokens.push(value);
    }
  });
  return tokens;
};

const mapSmallTokenReminders = (role) => {
  const seenSmallTokenImages = new Set();
  const tokens = roleSmallTokens(role).reduce((result, token) => {
    const image = tokenImage(token);
    if (!image || seenSmallTokenImages.has(image)) return result;
    seenSmallTokenImages.add(image);
    result.push({ token, image });
    return result;
  }, []);

  return tokens.map(({ token, image }, index) => ({
    role: role.id,
    image,
    imageAlt: role.imageAlt,
    name: tokenName(token, role, index, tokens.length),
    isSmallToken: true,
  }));
};

export default {
  components: { Modal },
  props: ["playerIndex"],
  computed: {
    availableReminders() {
      let reminders = [];
      const { players, bluffs } = this.$store.state.players;
      this.$store.state.roles.forEach((role) => {
        // add reminders from player roles
        if (players.some((p) => p.role.id === role.id)) {
          reminders = [
            ...reminders,
            ...(role.reminders || []).map(mapReminder(role)),
            ...mapSmallTokenReminders(role),
          ];
        }
        // add reminders from bluff/other roles
        else if (bluffs.some((bluff) => bluff.id === role.id)) {
          reminders = [
            ...reminders,
            ...(role.reminders || []).map(mapReminder(role)),
            ...mapSmallTokenReminders(role),
          ];
        }
        // add global reminders
        if (role.remindersGlobal && role.remindersGlobal.length) {
          reminders = [
            ...reminders,
            ...role.remindersGlobal.map(mapReminder(role)),
          ];
        }
      });
      // add fabled reminders
      this.$store.state.players.fabled.forEach((role) => {
        reminders = [
          ...reminders,
          ...(role.reminders || []).map(mapReminder(role)),
          ...mapSmallTokenReminders(role),
        ];
      });

      // add out of script traveler reminders
      this.$store.state.otherTravelers.forEach((role) => {
        if (players.some((p) => p.role.id === role.id)) {
          reminders = [
            ...reminders,
            ...(role.reminders || []).map(mapReminder(role)),
            ...mapSmallTokenReminders(role),
          ];
        }
      });

      reminders.push({ role: "good", name: this.$t("common.good") });
      reminders.push({ role: "evil", name: this.$t("common.evil") });
      reminders.push({ role: "custom", name: this.$t("common.customNote") });
      return reminders;
    },
    ...mapState(["modals", "grimoire"]),
    ...mapState("players", ["players"]),
  },
  methods: {
    displayReminderImage(reminder) {
      return reminderIconImage(reminder, this.grimoire.isImageOptIn);
    },
    addReminder(reminder) {
      const player = this.$store.state.players.players[this.playerIndex];
      let value;
      if (reminder.role === "custom") {
        const name = prompt(this.$t("modals.promptCustomReminder"));
        if (!name) return;
        value = [...player.reminders, { role: "custom", name }];
      } else {
        value = [...player.reminders, reminder];
      }
      this.$store.commit("players/update", {
        player,
        property: "reminders",
        value,
      });
      this.$store.commit("toggleModal", "reminder");
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
ul.reminders .reminder {
  background: url("../../assets/token1.png") center center;
  background-size: 100%;
  width: 14vh;
  height: 14vh;
  max-width: 100px;
  max-height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1%;

  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  line-height: 100%;
  transition: transform 500ms ease;

  .icon {
    position: absolute;
    top: 3%;
    width: 100%;
    height: 100%;
    background-size: 100%;
    background-position: center 30%;
    background-repeat: no-repeat;
  }

  .text {
    color: black;
    font-size: 65%;
    font-weight: bold;
    text-align: center;
    top: 28%;
    width: 80%;
    line-height: 1;
    text-shadow:
      0 1px 1px #f6dfbd,
      0 -1px 1px #f6dfbd,
      1px 0 1px #f6dfbd,
      -1px 0 1px #f6dfbd;
  }

  &:hover {
    transform: scale(1.2);
  }
}
</style>
