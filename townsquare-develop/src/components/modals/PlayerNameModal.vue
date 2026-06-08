<template>
  <Modal class="player-name-modal" v-if="modals.playerName" @close="close">
    <h3>{{ $t("playerName.title") }}</h3>
    <form @submit.prevent="save">
      <label for="player-name-input">{{ $t("playerName.label") }}</label>
      <input
        id="player-name-input"
        ref="input"
        v-model="name"
        type="text"
        maxlength="30"
        autocomplete="nickname"
      />
      <small>{{ $t("playerName.hint") }}</small>
      <div class="button-group">
        <button type="button" class="button" @click="close">
          {{ $t("common.cancel") }}
        </button>
        <button type="submit" class="button townsfolk">
          {{ $t("common.ok") }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";

export default {
  components: {
    Modal
  },
  computed: {
    currentSeatName() {
      const seat = this.players[this.session.claimedSeat];
      return seat && seat.name ? seat.name : "";
    },
    ...mapState(["modals", "session"]),
    ...mapState("players", ["players"])
  },
  data() {
    return {
      name: ""
    };
  },
  watch: {
    "modals.playerName"(visible) {
      if (!visible) return;
      this.name = this.session.playerName || this.currentSeatName;
      this.$nextTick(() => {
        if (this.$refs.input) this.$refs.input.focus();
      });
    }
  },
  methods: {
    save() {
      const name = this.name.trim().substr(0, 30);
      if (!name) return;
      this.$store.commit("session/setPlayerName", name);
      this.close();
    },
    close() {
      this.toggleModal("playerName");
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

h3 {
  margin: 0 40px 12px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 280px;
}

label,
small {
  color: white;
}

input {
  color: white;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 8px;
  font: inherit;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

button.button {
  border: 0;
  color: white;
  cursor: pointer;
}
</style>
