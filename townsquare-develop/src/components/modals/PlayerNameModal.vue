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

.player-name-modal {
  ::v-deep .modal {
    width: min(390px, calc(100vw - 3em));
  }
}

h3 {
  margin-bottom: 0.85em;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.55em;
  min-width: min(300px, calc(100vw - 5em));
}

label,
small {
  color: #c0a88a;
}

small {
  color: rgba(220, 196, 161, 0.78);
}

input {
  min-height: 2.45em;
  padding: 0.48em 0.58em;
  border: 1px solid rgba(124, 94, 70, 0.88);
  border-radius: 2px;
  background: rgba(5, 4, 4, 0.62);
  color: #f7f0df;
  font: inherit;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
  margin-top: 0.5em;
}

button.button {
  cursor: pointer;
}
</style>
