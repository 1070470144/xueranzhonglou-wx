<template>
  <Modal
    class="vote-history"
    v-if="modals.voteHistory && (session.voteHistory.length || !session.isSpectator)"
    @close="toggleModal('voteHistory')"
  >
    <font-awesome-icon
      @click="clearVoteHistory"
      icon="trash-alt"
      class="clear"
      :title="$t('modals.clearVoteHistory')"
      v-if="session.isSpectator"
    />

    <h3>{{ $t("modals.voteHistory") }}</h3>

    <template v-if="!session.isSpectator">
      <div class="options">
        <div class="option" @click="setRecordVoteHistory">
          <font-awesome-icon
            :icon="[
              'fas',
              session.isVoteHistoryAllowed ? 'check-square' : 'square',
            ]"
          />
          {{ $t("modals.accessibleToPlayers") }}
        </div>
        <div class="option" @click="clearVoteHistory">
          <font-awesome-icon icon="trash-alt" />
          {{ $t("modals.clearForEveryone") }}
        </div>
      </div>
    </template>
    <table>
      <thead>
        <tr>
          <td>{{ $t("modals.time") }}</td>
          <td>{{ $t("modals.nominator") }}</td>
          <td>{{ $t("modals.nominee") }}</td>
          <td>{{ $t("modals.type") }}</td>
          <td>{{ $t("modals.votes") }}</td>
          <td>{{ $t("modals.majority") }}</td>
          <td>
            <font-awesome-icon icon="user-friends" />
            {{ $t("modals.voters") }}
          </td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(vote, index) in session.voteHistory" :key="index">
          <td>
            {{ vote.timestamp.getHours().toString().padStart(2, "0") }}:{{
              vote.timestamp.getMinutes().toString().padStart(2, "0")
            }}
          </td>
          <td>{{ vote.nominator }}</td>
          <td>{{ vote.nominee }}</td>
          <td>{{ vote.type }}</td>
          <td>
            {{ vote.votes.length }}
            <font-awesome-icon icon="hand-paper" />
          </td>
          <td>
            {{ vote.majority }}
            <font-awesome-icon
              :icon="[
                'fas',
                vote.votes.length >= vote.majority ? 'check-square' : 'square',
              ]"
            />
          </td>
          <td>
            {{ vote.votes.join(", ") }}
          </td>
        </tr>
      </tbody>
    </table>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapMutations, mapState } from "vuex";

export default {
  components: {
    Modal,
  },
  computed: {
    ...mapState(["session", "modals"]),
  },
  methods: {
    clearVoteHistory() {
      this.$store.commit("session/clearVoteHistory");
    },
    setRecordVoteHistory() {
      this.$store.commit(
        "session/setVoteHistoryAllowed",
        !this.session.isVoteHistoryAllowed,
      );
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.clear {
  position: absolute;
  left: 1em;
  top: 0.82em;
  cursor: pointer;
  color: #dcc4a1;
  &:hover {
    color: #fff8e7;
  }
}

.options {
  display: flex;
  justify-content: center;
  align-items: center;
  justify-content: center;
  align-content: center;
  gap: 0.6em;
  margin-bottom: 0.8em;
}

.option {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  min-height: 2em;
  padding: 0 0.62em;
  color: #dcc4a1;
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.86);
  text-decoration: none;
  margin: 0;
  &:hover {
    color: #fff8e7;
    border-color: #d4af37;
    cursor: pointer;
  }
}

h3 {
  margin: 0 2.4em 0.8em 1.5em;
  svg {
    vertical-align: middle;
  }
}

table {
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.86);
  margin-left: auto;
  margin-right: auto;
}

tr + tr {
  border-top: 1px solid rgba(61, 46, 38, 0.72);
}

td {
  padding: 0.48em 0.62em;
  color: rgba(247, 240, 223, 0.86);
  vertical-align: top;
}

thead td {
  color: #c0a88a;
  font-weight: bold;
  border-bottom: 1px solid #3d2e26;
  text-align: center;
  background: rgba(5, 4, 4, 0.38);
}

tbody {
  td:nth-child(2) {
    color: $townsfolk;
  }
  td:nth-child(3) {
    color: $demon;
  }
  td:nth-child(5) {
    text-align: center;
  }
  td:nth-child(6) {
    text-align: center;
  }
}
</style>
