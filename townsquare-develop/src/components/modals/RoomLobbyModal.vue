<template>
  <Modal
    :class="[
      'room-lobby',
      {
        'room-lobby-list':
          mode === 'list' || mode === 'create' || mode === 'join',
      },
    ]"
    v-if="modals.roomLobby"
    @close="close"
  >
    <div
      v-if="mode !== 'list' && mode !== 'create' && mode !== 'join'"
      class="room-toolbar"
    >
      <button
        v-if="mode !== 'list' && mode !== 'join'"
        type="button"
        class="button icon-button"
        @click="backToList"
      >
        <font-awesome-icon icon="undo" />
      </button>
      <span v-else></span>
      <div class="room-heading">
        <h3>{{ title }}</h3>
        <small v-if="mode === 'list'">{{ $t("room.availableRooms") }}</small>
      </div>
      <div class="room-actions">
        <button
          v-if="!session.sessionId && mode === 'list'"
          type="button"
          class="button demon create-button"
          @click="showCreate"
        >
          <font-awesome-icon icon="plus-circle" />
          <span>{{ $t("room.showCreate") }}</span>
        </button>
        <button
          v-else
          type="button"
          class="button icon-button"
          @click="refresh"
        >
          <font-awesome-icon icon="sync-alt" />
        </button>
      </div>
    </div>

    <p v-if="room.error && mode !== 'create'" class="room-error">
      {{ errorText }}
    </p>

    <section
      v-if="mode === 'list' || mode === 'create' || mode === 'join'"
      class="room-section room-hall"
    >
      <div class="hall-topline">
        <span>钟楼大厅</span>
        <strong>血染钟楼</strong>
        <span>{{ $t("room.availableRooms") }} {{ filteredRooms.length }}</span>
      </div>

      <div class="hall-bottom-bar">
        <div class="hall-search">
          <input
            v-model="roomSearch"
            type="search"
            :placeholder="$t('room.searchPlaceholder')"
          />
        </div>
        <div class="hall-footer-actions">
          <button
            v-if="!session.sessionId"
            type="button"
            class="button demon create-button"
            @click="showCreate"
          >
            <font-awesome-icon icon="plus-circle" />
            <span>{{ $t("room.showCreate") }}</span>
          </button>
          <button
            type="button"
            class="button icon-button hall-refresh"
            @click="refresh"
          >
            <font-awesome-icon icon="sync-alt" />
          </button>
        </div>
      </div>

      <div class="hall-board">
        <div class="room-notice-list room-list-column room-preview-panel">
          <div class="room-register-bar">
            <span>房间</span>
            <span class="room-filter-heading">
              <div class="hall-filter-select" @click.stop>
                <button
                  type="button"
                  class="hall-filter-trigger"
                  :aria-label="$t('room.visibility')"
                  :aria-expanded="showVisibilityMenu ? 'true' : 'false'"
                  @click="toggleVisibilityMenu"
                >
                  <span>{{ visibilityLabel }}</span>
                  <font-awesome-icon icon="chevron-down" />
                </button>
                <div v-if="showVisibilityMenu" class="room-filter-menu">
                  <button
                    v-for="option in visibilityOptions"
                    :key="option.value"
                    type="button"
                    :class="{ active: visibilityFilter === option.value }"
                    @click="setVisibilityFilter(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </span>
            <span>剧本</span>
            <span>说书人</span>
            <span>{{ $t("room.note") }}</span>
            <span>看客</span>
            <span :title="$t('room.status')">阶段</span>
            <span>标签</span>
          </div>
          <ul v-if="filteredRooms.length" class="room-list">
            <li
              v-for="item in pagedRooms"
              :key="item.id"
              class="room-row-card"
              :class="{ active: previewRoom && previewRoom.id === item.id }"
              @click="selectPreviewRoom(item)"
            >
              <div class="room-row-main">
                <strong class="room-name">{{ item.name }}</strong>
              </div>
              <span
                class="room-language-stamp"
                :class="{ private: item.isPrivate }"
              >
                {{ item.isPrivate ? $t("room.private") : $t("room.public") }}
              </span>
              <div class="room-script-cell">
                <strong>{{ item.scriptName || $t("room.noScript") }}</strong>
                <span>{{ item.hostName || $t("room.defaultHostName") }}</span>
              </div>
              <span class="room-host">{{
                item.hostName || $t("room.defaultHostName")
              }}</span>
              <span class="room-note-cell" :title="item.note">{{
                item.note || "-"
              }}</span>
              <div class="room-row-meta">
                <span class="room-count"
                  ><font-awesome-icon icon="user-friends" />
                  {{ item.playerCount }}/{{ item.maxPlayers }}</span
                >
                <span class="room-status" :class="item.status || 'waiting'">{{
                  statusText(item.status)
                }}</span>
                <button
                  type="button"
                  class="button join-button"
                  @click.stop="selectRoom(item)"
                >
                  {{ $t("room.join") }}
                </button>
              </div>
            </li>
          </ul>
          <div v-else class="hall-empty-row room-empty-illustration">
            {{ $t("room.empty") }}
          </div>
          <div v-if="filteredRooms.length" class="room-pagination">
            <button
              type="button"
              class="button pagination-prev"
              :disabled="currentPage <= 1"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            <div class="pagination-pages">
              <button
                v-for="page in totalPages"
                :key="page"
                type="button"
                class="button page-button"
                :class="{ active: page === currentPage }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
            </div>
            <button
              type="button"
              class="button pagination-next"
              :disabled="currentPage >= totalPages"
              @click="goToPage(currentPage + 1)"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="mode === 'create'"
      class="room-submodal-layer"
      @click.self="backToList"
    >
      <section class="room-section room-form create-room-form" @click.stop>
        <div class="create-room-title">
          <h3>{{ title }}</h3>
          <button
            type="button"
            class="button icon-button create-room-close"
            :aria-label="$t('common.close')"
            @click="backToList"
          >
            <font-awesome-icon icon="times-circle" />
          </button>
        </div>
        <p v-if="room.error" class="room-error create-room-error">
          {{ errorText }}
        </p>
        <div class="create-room-scroll">
          <div class="create-field-grid">
            <div class="create-basic-row">
              <div class="field-block create-name-field">
                <label>{{ $t("room.name") }}</label>
                <input
                  :value="createForm.name"
                  type="text"
                  @input="updateCreate('name', $event.target.value)"
                />
              </div>
              <div class="field-block create-host-field">
                <label>{{ $t("room.hostName") }}</label>
                <input
                  v-if="!hostDisplayName"
                  :value="createForm.hostName"
                  type="text"
                  @input="updateCreate('hostName', $event.target.value)"
                />
                <div v-else class="readonly-field">{{ hostDisplayName }}</div>
              </div>
            </div>
            <div class="field-block create-player-count-field">
              <label>{{ $t("room.players") }}</label>
              <input
                :value="createForm.maxPlayers"
                type="number"
                :min="1"
                :max="20"
                step="1"
                @input="updateCreate('maxPlayers', $event.target.value)"
                @blur="
                  updateCreate(
                    'maxPlayers',
                    normalizeMaxPlayers(createForm.maxPlayers),
                  )
                "
              />
            </div>
            <div class="field-block create-visibility-field">
              <label>{{ $t("room.visibility") }}</label>
              <div class="segmented-control">
                <button
                  type="button"
                  :class="{ active: createForm.visibility !== 'private' }"
                  @click="updateCreate('visibility', 'public')"
                >
                  {{ $t("room.public") }}
                </button>
                <button
                  type="button"
                  :class="{ active: createForm.visibility === 'private' }"
                  @click="updateCreate('visibility', 'private')"
                >
                  {{ $t("room.private") }}
                </button>
              </div>
            </div>
            <div class="field-block create-note-field">
              <label>{{ $t("room.note") }}</label>
              <input
                :value="createForm.note"
                type="text"
                maxlength="80"
                @input="updateCreate('note', $event.target.value)"
              />
            </div>
            <template v-if="createForm.visibility === 'private'">
              <div class="field-block create-password-field">
                <label>{{ $t("room.password") }}</label>
                <input
                  :value="createForm.password"
                  type="password"
                  @input="updateCreate('password', $event.target.value)"
                />
              </div>
            </template>
          </div>
          <div class="room-script-row script-card create-script-card">
            <span>
              <small>{{ $t("room.script") }}</small>
              <strong>{{ currentScriptName }}</strong>
            </span>
            <button
              type="button"
              class="button create-script-action"
              @click="chooseScript"
            >
              <font-awesome-icon icon="theater-masks" />
              {{ $t("room.chooseScript") }}
            </button>
          </div>
        </div>
        <div class="create-room-footer">
          <button
            type="button"
            class="button demon primary-action create-primary-action"
            @click="createRoom"
          >
            {{ $t("room.createRoom") }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="mode === 'join' && selectedRoom"
      class="room-submodal-layer"
      @click.self="backToList"
    >
      <section
        class="room-section room-form create-room-form join-room-form"
        @click.stop
      >
        <div class="create-room-title">
          <h3>{{ $t("room.joinRoom", { name: selectedRoom.name }) }}</h3>
          <button
            type="button"
            class="button icon-button create-room-close"
            :aria-label="$t('common.close')"
            @click="backToList"
          >
            <font-awesome-icon icon="times-circle" />
          </button>
        </div>
        <div class="create-room-scroll join-room-scroll">
          <div class="selected-room-card">
            <strong>{{ selectedRoom.name }}</strong>
            <span
              >{{ selectedRoom.playerCount }}/{{ selectedRoom.maxPlayers }} -
              {{ selectedRoom.scriptName }}</span
            >
            <em :class="{ private: selectedRoom.isPrivate }">
              {{
                selectedRoom.isPrivate ? $t("room.private") : $t("room.public")
              }}
            </em>
          </div>
          <div class="field-block featured-field">
            <label>{{ $t("room.playerName") }}</label>
            <input
              :value="joinForm.playerName"
              type="text"
              @input="updateJoin('playerName', $event.target.value)"
            />
          </div>
          <template v-if="selectedRoom.isPrivate">
            <div class="field-block">
              <label>{{ $t("room.password") }}</label>
              <input
                :value="joinForm.password"
                type="password"
                @input="updateJoin('password', $event.target.value)"
              />
            </div>
          </template>
        </div>
        <div class="create-room-footer join-room-footer">
          <button
            type="button"
            class="button demon primary-action create-primary-action"
            @click="joinRoom"
          >
            {{ $t("room.join") }}
          </button>
        </div>
      </section>
    </div>

    <section
      v-if="mode === 'manage' && room.current"
      class="room-section room-form"
    >
      <div class="selected-room-card manage-card">
        <strong>{{ room.current.name }}</strong>
        <span
          >{{ room.current.playerCount }}/{{ room.current.maxPlayers }} -
          {{ room.current.scriptName }}</span
        >
        <em :class="{ private: room.current.isPrivate }">
          {{ room.current.isPrivate ? $t("room.private") : $t("room.public") }}
        </em>
      </div>
      <template v-if="room.isHost">
        <div class="field-block featured-field">
          <label>{{ $t("room.name") }}</label>
          <input
            :value="createForm.name"
            type="text"
            @input="updateCreate('name', $event.target.value)"
          />
        </div>
        <div class="field-block">
          <label>{{ $t("room.visibility") }}</label>
          <div class="segmented-control">
            <button
              type="button"
              :class="{ active: createForm.visibility !== 'private' }"
              @click="updateCreate('visibility', 'public')"
            >
              {{ $t("room.public") }}
            </button>
            <button
              type="button"
              :class="{ active: createForm.visibility === 'private' }"
              @click="updateCreate('visibility', 'private')"
            >
              {{ $t("room.private") }}
            </button>
          </div>
        </div>
        <template v-if="createForm.visibility === 'private'">
          <div class="field-block">
            <label>{{ $t("room.password") }}</label>
            <input
              :value="createForm.password"
              type="password"
              @input="updateCreate('password', $event.target.value)"
            />
          </div>
        </template>
        <div class="room-script-row script-card">
          <span>
            <small>{{ $t("room.currentScript") }}</small>
            <strong>{{ currentScriptName }}</strong>
          </span>
          <button type="button" class="button" @click="chooseScript">
            <font-awesome-icon icon="theater-masks" />
            {{ $t("room.chooseScript") }}
          </button>
        </div>
        <button
          type="button"
          class="button demon primary-action"
          @click="updateRoom"
        >
          {{ $t("room.save") }}
        </button>

        <h4>{{ $t("room.connectedPlayers") }}</h4>
        <ul class="room-list compact">
          <li v-for="player in room.players" :key="player.id">
            <span>{{ player.name }}</span>
            <button type="button" class="button" @click="kick(player.id)">
              {{ $t("room.kick") }}
            </button>
          </li>
        </ul>
      </template>
    </section>
  </Modal>
</template>

<script>
import { mapState } from "vuex";
import { getAuthSession } from "@/services/auth";
import Modal from "./Modal";

export default {
  components: { Modal },
  data() {
    return {
      mode: "list",
      selectedRoom: null,
      selectedPreviewRoom: null,
      currentPage: 1,
      roomsPerPage: 50,
      roomSearch: "",
      visibilityFilter: "all",
      showVisibilityMenu: false,
      authUser: null,
    };
  },
  computed: {
    ...mapState(["modals", "session", "room", "edition"]),
    createForm() {
      return this.room.createForm;
    },
    joinForm() {
      return this.room.joinForm;
    },
    title() {
      if (this.mode === "create") return this.$t("room.create");
      if (this.mode === "join") return this.$t("room.join");
      if (this.mode === "manage") return this.$t("room.manage");
      return this.$t("room.title");
    },
    currentScriptName() {
      return this.edition.name || this.edition.id || this.$t("room.noScript");
    },
    hostDisplayName() {
      const user = this.authUser;
      return user && (user.nickname || user.username || user.email || "");
    },
    guestHostName() {
      return (this.createForm.hostName || "").trim();
    },
    createHostName() {
      return this.hostDisplayName || this.guestHostName;
    },
    filteredRooms() {
      return this.room.list.filter((item) => this.filterRoom(item));
    },
    visibilityOptions() {
      return [
        { value: "all", label: this.$t("room.all") },
        { value: "public", label: this.$t("room.public") },
        { value: "private", label: this.$t("room.private") },
      ];
    },
    visibilityLabel() {
      const option = this.visibilityOptions.find(
        (item) => item.value === this.visibilityFilter,
      );
      return option ? option.label : this.$t("room.all");
    },
    totalPages() {
      return Math.max(
        1,
        Math.ceil(this.filteredRooms.length / this.roomsPerPage),
      );
    },
    pagedRooms() {
      const start = (this.currentPage - 1) * this.roomsPerPage;
      return this.filteredRooms.slice(start, start + this.roomsPerPage);
    },
    previewRoom() {
      if (
        this.selectedPreviewRoom &&
        this.filteredRooms.some(
          (item) => item.id === this.selectedPreviewRoom.id,
        )
      ) {
        return this.selectedPreviewRoom;
      }
      return this.filteredRooms[0] || null;
    },
    errorText() {
      const key = this.room.error ? `room.errors.${this.room.error}` : "";
      return key ? this.$t(key) : "";
    },
  },
  mounted() {
    this.refreshAuthUser();
    window.addEventListener("townsquare-auth-change", this.refreshAuthUser);
    document.addEventListener("click", this.closeVisibilityMenu);
  },
  beforeDestroy() {
    window.removeEventListener("townsquare-auth-change", this.refreshAuthUser);
    document.removeEventListener("click", this.closeVisibilityMenu);
  },
  watch: {
    "modals.roomLobby"(visible) {
      if (!visible) return;
      this.refreshAuthUser();
      this.mode = this.session.sessionId ? "manage" : "list";
      this.refresh();
    },
    "room.current"(current) {
      if (!current) return;
      this.mode = "manage";
      this.$store.commit("room/updateCreateForm", {
        name: current.name,
        note: current.note || "",
        maxPlayers: current.maxPlayers || this.createForm.maxPlayers,
        visibility: current.visibility || "public",
      });
      if (this.modals.roomLobby) this.$store.commit("toggleModal", "roomLobby");
      if (!this.modals.roomControl)
        this.$store.commit("toggleModal", "roomControl");
    },
    roomSearch() {
      this.goToPage(1);
    },
    visibilityFilter() {
      this.closeVisibilityMenu();
      this.goToPage(1);
    },
    totalPages(total) {
      if (this.currentPage > total) this.goToPage(total);
    },
  },
  methods: {
    refreshAuthUser() {
      this.authUser = getAuthSession().user;
    },
    toggleVisibilityMenu() {
      this.showVisibilityMenu = !this.showVisibilityMenu;
    },
    closeVisibilityMenu() {
      this.showVisibilityMenu = false;
    },
    setVisibilityFilter(value) {
      this.visibilityFilter = value;
    },
    filterRoom(item) {
      if (this.visibilityFilter === "public" && item.isPrivate) return false;
      if (this.visibilityFilter === "private" && !item.isPrivate) return false;
      const needle = this.roomSearch.trim().toLocaleLowerCase();
      if (!needle) return true;
      return [item.name, item.hostName, item.scriptName, item.note].some(
        (value) =>
          String(value || "")
            .toLocaleLowerCase()
            .includes(needle),
      );
    },
    statusText(status) {
      return this.$t(status === "playing" ? "room.playing" : "room.waiting");
    },
    close() {
      this.$store.commit("toggleModal", "roomLobby");
    },
    refresh() {
      this.$store.commit("room/requestList");
    },
    goToPage(page) {
      this.currentPage = Math.min(Math.max(1, page), this.totalPages);
    },
    backToList() {
      this.selectedRoom = null;
      this.mode = this.session.sessionId ? "manage" : "list";
    },
    showCreate() {
      this.mode = "create";
    },
    selectRoom(room) {
      this.selectedRoom = room;
      this.selectPreviewRoom(room);
      this.mode = "join";
      this.$store.commit("room/updateJoinForm", { roomId: room.id });
    },
    selectPreviewRoom(room) {
      this.selectedPreviewRoom = room;
    },
    chooseScript() {
      this.$store.commit("openModalOverlay", "edition");
    },
    updateCreate(field, value) {
      this.$store.commit("room/updateCreateForm", { [field]: value });
    },
    normalizeMaxPlayers(value) {
      const parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed)) return 10;
      return Math.min(20, Math.max(1, parsed));
    },
    updateJoin(field, value) {
      this.$store.commit("room/updateJoinForm", { [field]: value });
    },
    createRoom() {
      if (!this.room.createForm.name.trim()) {
        this.$store.commit("room/setError", "invalid_room_name");
        return;
      }
      if (!this.createHostName.trim()) {
        this.$store.commit("room/setError", "invalid_host_name");
        return;
      }
      if (
        this.room.createForm.visibility === "private" &&
        !this.room.createForm.password.trim()
      ) {
        this.$store.commit("room/setError", "password_required");
        return;
      }
      this.$store.commit("room/create", {
        ...this.room.createForm,
        hostName: this.createHostName,
        maxPlayers: this.normalizeMaxPlayers(this.room.createForm.maxPlayers),
        status: "waiting",
      });
    },
    joinRoom() {
      this.$store.commit("room/join", this.room.joinForm);
    },
    updateRoom() {
      this.$store.commit("room/update", this.room.createForm);
    },
    kick(playerId) {
      if (confirm(this.$t("room.confirmKick"))) {
        this.$store.commit("room/kick", playerId);
      }
    },
  },
};
</script>

<style lang="scss">
.room-lobby {
  .modal {
    width: min(1180px, 98vw);
    max-width: 98vw;
    color: #f8eed8;
    border: 1px solid rgba(139, 84, 48, 0.75);
    border-radius: 4px;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(118, 20, 24, 0.3),
        transparent 24%
      ),
      linear-gradient(180deg, rgba(28, 16, 13, 0.98), rgba(13, 9, 8, 0.98)),
      #0d0908;
    box-shadow:
      0 18px 58px rgba(0, 0, 0, 0.72),
      inset 0 1px 0 rgba(255, 222, 150, 0.08);
  }
  .room-toolbar {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) max-content;
    gap: 0.9em;
    align-items: center;
    padding: 0.12em 78px 0.55em 0;
    border-bottom: 1px solid rgba(229, 191, 114, 0.24);
  }
  .room-heading {
    min-width: 0;
    text-align: center;
    h3 {
      margin: 0;
      line-height: 1.1;
      color: #fff8e8;
      font-size: 1.22em;
      font-weight: 700;
    }
    small {
      display: block;
      margin-top: 0.2em;
      opacity: 0.72;
    }
  }
  .button {
    white-space: nowrap;
    border-radius: 6px;
  }
  .icon-button {
    width: 40px;
    min-width: 40px;
    height: 38px;
    padding-left: 0;
    padding-right: 0;
    text-align: center;
  }
  .create-button {
    display: inline-flex;
    gap: 0.35em;
    align-items: center;
    justify-content: center;
    max-width: 10em;
    overflow: hidden;
  }
  .room-actions {
    justify-self: end;
    max-width: 10em;
    z-index: 1;
  }
  .create-button span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .room-section {
    margin: 0.45em 0 0;
  }
  .room-error {
    margin: 0.75em 0 0;
    color: #ffb0b0;
    border: 1px solid rgba(206, 1, 0, 0.45);
    background: rgba(206, 1, 0, 0.16);
    padding: 0.45em 0.65em;
    border-radius: 6px;
  }
  .room-hall {
    display: grid;
    grid-template-rows: auto minmax(24em, 1fr) auto;
    gap: 0;
    min-height: min(76vh, 44em);
  }
  .hall-topline {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1em;
    align-items: center;
    min-height: 3.35em;
    padding: 0 0.95em;
    border-bottom: 1px solid rgba(139, 84, 48, 0.72);
    background: radial-gradient(
        circle at 50% 0%,
        rgba(130, 24, 26, 0.36),
        transparent 32%
      ),
      rgba(16, 10, 9, 0.86);
    color: #b99b6b;
    font-size: 0.9em;
  }
  .hall-topline strong {
    color: #d4b117;
    font-size: 1.85em;
    line-height: 1;
  }
  .hall-topline strong::first-letter {
    color: #e0c438;
  }
  .hall-topline span:last-child {
    justify-self: end;
  }
  .hall-title-tools {
    display: inline-flex;
    gap: 0.7em;
    align-items: center;
  }
  .hall-title-tools em {
    font-style: normal;
  }
  .hall-filter-select {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-width: 0;
    color: #dcc4a1;
  }
  .hall-filter-trigger {
    display: inline-flex;
    gap: 0.32em;
    align-items: center;
    justify-content: center;
    height: 1em;
    margin: 0;
    padding: 0;
    color: inherit;
    border: 0;
    background: transparent;
    font: inherit;
    font-weight: inherit;
    letter-spacing: inherit;
    line-height: 1;
    cursor: pointer;
  }
  .hall-filter-trigger span {
    min-width: 0;
    white-space: nowrap;
  }
  .room-filter-heading {
    position: relative;
    display: flex;
    height: 100%;
    align-self: stretch;
    align-items: center;
    justify-content: center;
    overflow: visible;
  }
  .room-filter-heading .hall-filter-select {
    width: auto;
    max-width: none;
    color: inherit;
    line-height: 1;
  }
  .hall-filter-trigger:focus {
    outline: none;
    box-shadow: none;
  }
  .hall-filter-trigger svg {
    position: static;
    width: 0.58em;
    height: 0.58em;
    color: currentColor;
  }
  .room-filter-menu {
    position: absolute;
    top: calc(100% + 0.6em);
    left: 50%;
    z-index: 5;
    display: grid;
    min-width: 4.2em;
    padding: 0.22em 0;
    border: 1px solid #3d2e26;
    background: #f7f0df;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55);
    transform: translateX(-50%);
  }
  .room-filter-menu button {
    min-height: 1.8em;
    padding: 0 0.6em;
    color: #a38c71;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 0.9em;
    letter-spacing: 0;
    text-align: left;
    cursor: pointer;
  }
  .room-filter-menu button:hover,
  .room-filter-menu button.active {
    color: #7a2f25;
    background: rgba(122, 47, 37, 0.08);
  }
  .room-empty {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    align-items: center;
    justify-content: center;
    min-height: 9em;
    color: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
  }
  .room-empty svg {
    opacity: 0.72;
  }
  .hall-controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 238px 40px;
    gap: 0.6em;
    align-items: center;
    padding: 0.5em 0.65em;
    border: 1px solid rgba(229, 191, 114, 0.2);
    border-radius: 3px;
    background: rgba(8, 5, 5, 0.62);
  }
  .hall-refresh {
    height: 36px;
  }
  .compact-control {
    grid-template-columns: repeat(3, 1fr);
  }
  .hall-board,
  .room-lobby-grid {
    display: block;
    min-height: 0;
  }
  .room-notice-list,
  .room-list-column,
  .room-preview-panel {
    min-width: 0;
  }
  .hall-board {
    display: block;
    padding: 0;
    border-left: 1px solid rgba(139, 84, 48, 0.72);
    border-right: 1px solid rgba(139, 84, 48, 0.72);
    background: rgba(11, 8, 7, 0.84);
    box-shadow: inset 0 1px 0 rgba(255, 241, 202, 0.06);
  }
  .room-notice-list,
  .room-list-column {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  .room-register-bar {
    display: grid;
    grid-template-columns:
      minmax(7.8em, 1fr) 6.5em minmax(10em, 1.25fr) minmax(7.4em, 0.9fr)
      minmax(8em, 1fr) 4.9em 5.4em 6.2em;
    gap: 0;
    align-items: stretch;
    min-height: 2.35em;
    padding: 0 0.65em;
    color: #d5ad73;
    font-size: 0.82em;
    border-bottom: 1px solid rgba(139, 84, 48, 0.68);
    background: #090605;
  }
  .room-register-bar > span {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    line-height: 1;
    min-width: 0;
    padding: 0 0.55em;
    text-align: center;
  }
  .room-register-bar > span:nth-child(1),
  .room-register-bar > span:nth-child(3),
  .room-register-bar > span:nth-child(4),
  .room-register-bar > span:nth-child(5) {
    justify-content: flex-start;
    text-align: left;
  }
  .room-register-bar > span + span {
    border-left: 1px solid rgba(139, 84, 48, 0.32);
  }
  .room-register-bar > span:nth-child(2),
  .room-register-bar > span:nth-child(6),
  .room-register-bar > span:nth-child(7),
  .room-register-bar > span:nth-child(8) {
    text-align: center;
  }
  .room-list {
    display: block;
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: min(64vh, 36em);
    overflow-y: auto;
    padding-right: 0;
  }
  .room-row-card {
    display: grid;
    grid-template-columns:
      minmax(7.8em, 1fr) 6.5em minmax(10em, 1.25fr) minmax(7.4em, 0.9fr)
      minmax(8em, 1fr) 4.9em 5.4em 6.2em;
    gap: 0;
    align-items: center;
    min-height: 3.7em;
    margin-bottom: 0;
    padding: 0 0.65em;
    border: 0;
    border-radius: 0;
    border-bottom: 1px solid rgba(139, 84, 48, 0.28);
    background: rgba(10, 7, 6, 0.62);
    box-shadow: none;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }
  .room-row-card:nth-child(even) {
    background: rgba(18, 11, 9, 0.62);
  }
  .room-row-card:hover,
  .room-row-card.active {
    background: rgba(45, 19, 16, 0.76);
  }
  .room-row-card:hover {
    transform: none;
  }
  .room-row-main {
    display: grid;
    gap: 0;
    min-width: 0;
    padding: 0 0.55em;
  }
  .room-row-meta {
    display: contents;
  }
  .room-row-card > * {
    min-width: 0;
  }
  .room-row-card > * + * {
    border-left: 1px solid rgba(139, 84, 48, 0.26);
  }
  .room-list {
    &.compact li {
      grid-template-columns: 1fr auto;
      min-height: 2.7em;
      border-left-color: rgba(255, 255, 255, 0.2);
    }
  }
  .room-name,
  .room-host,
  .room-note-cell,
  .room-script,
  .room-script-cell strong,
  .room-script-cell span,
  .room-row-kicker {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-name {
    color: #d8bb82;
    font-size: 0.88em;
    font-weight: 700;
    line-height: 1.15;
    text-align: center;
    padding: 0.42em 0.75em;
    border: 1px solid #3d2e26;
    border-radius: 2px;
    background: #1d1816;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.8);
  }
  .room-language-stamp {
    justify-self: center;
    min-width: 2.3em;
    padding: 0.12em 0.38em;
    color: #8b2620;
    text-align: center;
    font-size: 0.68em;
    font-weight: 900;
    border: 2px solid #8b2620;
    border-radius: 2px;
    background: rgba(139, 38, 32, 0.1);
    transform: rotate(-3deg);
  }
  .room-language-stamp:not(.private) {
    color: #3b5998;
    border-color: #3b5998;
    background: rgba(59, 89, 152, 0.1);
    transform: rotate(2deg);
  }
  .room-script-cell {
    display: grid;
    gap: 0.18em;
    padding: 0 0.75em;
  }
  .room-script-cell strong {
    color: #d4af37;
    font-size: 0.9em;
    font-weight: 700;
  }
  .room-script-cell span {
    color: #7a6a58;
    font-size: 0.72em;
  }
  .room-row-kicker {
    color: #f0c56e;
    font-size: 0.78em;
  }
  .room-host,
  .room-script {
    color: rgba(247, 240, 223, 0.72);
    font-size: 0.85em;
  }
  .room-host {
    padding: 0 0.75em;
    color: #c0a88a;
    text-align: center;
  }
  .room-note-cell {
    padding: 0 0.75em;
    color: #a99172;
    font-size: 0.82em;
    text-align: left;
  }
  .room-count {
    display: inline-flex;
    gap: 0.28em;
    align-items: center;
    justify-content: center;
    align-self: center;
    min-width: 4.9em;
    padding: 0 0.45em;
    color: #dcc4a1;
    font-weight: 700;
    opacity: 0.9;
  }
  .room-status {
    align-self: center;
    justify-self: center;
    min-width: 4.4em;
    padding: 0.12em 0.48em;
    text-align: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #8e7d6b;
    font-size: 0.82em;
  }
  .room-status.playing {
    color: #e8d3b9;
    font-weight: 700;
  }
  .room-badge {
    min-width: 4.2em;
    padding: 0.16em 0.5em;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 999px;
    background: rgba(31, 101, 255, 0.18);
    color: #dfe8ff;
    font-size: 0.82em;
  }
  .room-badge.private {
    border-color: rgba(219, 72, 72, 0.6);
    background: rgba(206, 1, 0, 0.18);
    color: #ffd9d9;
  }
  .join-button {
    min-width: 5.8em;
    align-self: center;
    justify-self: center;
    min-height: 1.7em;
    padding: 0 0.55em;
    color: #ffd94a;
    border: 1px solid #8b6508;
    border-radius: 2px;
    background: #2a1c09;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.6);
    font-size: 0.72em;
    font-weight: 700;
  }
  .hall-bottom-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 0.75em;
    align-items: center;
    min-height: 4.2em;
    padding: 0.62em 0.9em;
    border: 1px solid rgba(139, 84, 48, 0.72);
    background: rgba(9, 6, 5, 0.92);
  }
  .hall-search {
    display: grid;
    grid-template-columns: minmax(14em, 1fr) 15em;
    gap: 0.65em;
    align-items: center;
  }
  .hall-footer-actions {
    display: flex;
    gap: 0.45em;
    align-items: center;
    justify-content: flex-end;
  }
  .hall-empty-row {
    display: grid;
    place-items: center;
    min-height: 24em;
    color: rgba(248, 238, 216, 0.58);
    font-size: 1.1em;
  }
  .room-pagination {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) max-content;
    gap: 0.35em;
    align-items: center;
    min-height: 2.7em;
    padding: 0.45em;
    border-top: 1px solid rgba(139, 84, 48, 0.42);
    background: rgba(9, 6, 5, 0.72);
  }
  .pagination-pages {
    display: flex;
    gap: 0.35em;
    justify-content: center;
    min-width: 0;
    overflow-x: auto;
  }
  .pagination-prev {
    justify-self: start;
  }
  .pagination-next {
    justify-self: end;
  }
  .room-pagination .button {
    min-width: 2.2em;
    min-height: 1.9em;
    padding: 0 0.55em;
    color: #c0a88a;
    border: 1px solid #3d2e26;
    border-radius: 2px;
    background: #1d1816;
  }
  .room-pagination .button.active {
    color: #fff8e7;
    border-color: #d4af37;
    background: #5c4204;
  }
  .room-pagination .button:disabled {
    opacity: 0.38;
    cursor: default;
  }
  .room-preview-panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 1.18em;
    border: 1px solid rgba(229, 191, 114, 0.22);
    border-radius: 8px;
    background: linear-gradient(
        180deg,
        rgba(104, 28, 42, 0.28),
        transparent 45%
      ),
      radial-gradient(
        circle at 76% 12%,
        rgba(229, 191, 114, 0.1),
        transparent 28%
      ),
      rgba(7, 10, 18, 0.7);
    box-shadow:
      inset 0 1px 0 rgba(255, 241, 202, 0.09),
      inset 0 0 0 1px rgba(255, 255, 255, 0.025);
  }
  .preview-overline {
    margin-bottom: 0.45em;
    color: #f0c56e;
    font-size: 0.82em;
  }
  .preview-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75em;
    margin-bottom: 0.95em;
  }
  .preview-title-row h4 {
    margin: 0;
    color: #fff8e8;
    font-size: 1.42em;
    text-align: left;
    line-height: 1.15;
  }
  .preview-details {
    display: grid;
    gap: 0;
    margin: 0 0 1.05em;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
  .preview-details div {
    display: grid;
    grid-template-columns: 5em minmax(0, 1fr);
    gap: 0.6em;
    align-items: baseline;
    padding: 0.56em 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
  .preview-details dt {
    color: rgba(247, 240, 223, 0.62);
  }
  .preview-details dd {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .preview-join {
    width: 100%;
    min-height: 2.55em;
  }
  .hall-empty-state {
    display: grid;
    justify-items: center;
    gap: 0.55em;
    min-height: 20em;
    padding: 2.2em 1em;
    border: 1px solid rgba(229, 191, 114, 0.15);
    border-radius: 8px;
    background: radial-gradient(
        circle at 50% 38%,
        rgba(229, 191, 114, 0.1),
        transparent 30%
      ),
      rgba(2, 5, 10, 0.5);
  }
  .hall-empty-state strong {
    color: #fff8e8;
    font-size: 1.28em;
  }
  .hall-empty-state p {
    margin: 0 0 0.35em;
    color: rgba(248, 238, 216, 0.58);
  }
  .room-empty-illustration {
    flex: 1;
    min-height: 15em;
    border: 0;
    background: transparent;
  }
  .compact-empty {
    min-height: 15em;
  }
  .table-icon {
    width: 7em;
    height: 5em;
    margin-bottom: 0.75em;
  }
  .table-icon i {
    position: absolute;
    left: 1.55em;
    right: 1.55em;
    bottom: 0.35em;
    height: 1.1em;
    border: 2px solid rgba(210, 222, 255, 0.5);
    border-radius: 3px;
  }
  .table-icon span {
    position: absolute;
    width: 0.9em;
    height: 1.25em;
    border: 2px solid rgba(210, 222, 255, 0.42);
    border-radius: 3px;
  }
  .table-icon span:nth-child(1) {
    left: 1em;
    top: 1.2em;
    transform: rotate(-14deg);
  }
  .table-icon span:nth-child(2) {
    left: 2.7em;
    top: 0.65em;
    transform: rotate(-7deg);
  }
  .table-icon span:nth-child(3) {
    right: 2.7em;
    top: 0.65em;
    transform: rotate(7deg);
  }
  .table-icon span:nth-child(4) {
    right: 1em;
    top: 1.2em;
    transform: rotate(14deg);
  }
  .readonly-field {
    display: block;
    width: 100%;
    color: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.22);
    padding: 0.45em 0.55em;
  }
  .room-form {
    display: grid;
    gap: 0.85em;
    padding: 0.85em;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.055);
  }
  .field-block {
    min-width: 0;
  }
  .featured-field input {
    font-size: 1.05em;
    min-height: 2.5em;
  }
  .segmented-control {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35em;
    padding: 0.25em;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.28);
  }
  .segmented-control button {
    min-height: 2.35em;
    color: rgba(255, 255, 255, 0.76);
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }
  .segmented-control button.active {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.18);
    background: rgba(31, 101, 255, 0.35);
  }
  .room-script-row {
    display: flex;
    gap: 0.75em;
    align-items: center;
    justify-content: space-between;
    margin: 0;
  }
  .script-card,
  .selected-room-card {
    padding: 0.7em;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.26);
  }
  .room-script-row span {
    display: flex;
    flex-direction: column;
    gap: 0.12em;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .room-script-row small {
    opacity: 0.68;
  }
  .room-script-row strong {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .selected-room-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.18em 0.65em;
    align-items: center;
  }
  .selected-room-card strong,
  .selected-room-card span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .selected-room-card span {
    color: rgba(247, 240, 223, 0.72);
    font-size: 0.88em;
  }
  .selected-room-card em {
    grid-row: 1 / span 2;
    grid-column: 2;
    min-width: 4.2em;
    padding: 0.16em 0.5em;
    text-align: center;
    font-style: normal;
    font-size: 0.82em;
    border-radius: 999px;
    border: 1px solid rgba(31, 101, 255, 0.48);
    background: rgba(31, 101, 255, 0.16);
  }
  .selected-room-card em.private {
    border-color: rgba(219, 72, 72, 0.6);
    background: rgba(206, 1, 0, 0.18);
  }
  .manage-card {
    margin-bottom: 0.1em;
  }
  .form-title {
    margin: 0;
    color: #ffffff;
    font-size: 1.05em;
    line-height: 1.2;
  }
  .primary-action {
    width: 100%;
    margin-top: 0;
    min-height: 2.55em;
  }
  .join-room-form {
    grid-template-rows: auto auto auto;
    height: auto;
    min-height: 0;
  }
  .create-room-form.join-room-form {
    grid-template-rows: auto auto auto;
    height: auto;
    min-height: 0;
    max-height: calc(100vh - 7em);
  }
  .join-room-scroll {
    grid-row: 2;
    overflow: visible;
    padding-bottom: 0;
  }
  .join-room-form .selected-room-card {
    padding: 0.72em 0.78em;
    color: #f7f0df;
    border-width: 0 0 1px;
    border-color: #3d2e26;
    border-radius: 0;
    background: rgba(18, 15, 13, 0.86);
  }
  .join-room-form .selected-room-card span {
    color: rgba(247, 240, 223, 0.72);
  }
  .join-room-form .field-block {
    display: grid;
    gap: 0.35em;
    padding: 0.72em 0.78em;
    border-bottom: 1px solid rgba(61, 46, 38, 0.78);
    background: rgba(18, 15, 13, 0.72);
  }
  .join-room-form label {
    margin: 0;
    color: #c0a88a;
    font-weight: 700;
    letter-spacing: 0.12em;
    line-height: 1;
  }
  .join-room-form input {
    min-height: 2.45em;
    color: #f7f0df;
    border: 1px solid rgba(124, 94, 70, 0.88);
    border-radius: 2px;
    background: rgba(5, 4, 4, 0.62);
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.48);
  }
  .join-room-form input:focus {
    border-color: rgba(212, 175, 55, 0.78);
    box-shadow:
      0 0 0 2px rgba(212, 175, 55, 0.14),
      inset 0 1px 4px rgba(0, 0, 0, 0.48);
  }
  .join-room-form .primary-action {
    justify-self: end;
    width: auto;
    min-width: 11em;
    min-height: 2.55em;
    margin: 0;
    padding: 0 1.4em;
    border-color: #d4af37;
    border-radius: 2px;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
    color: #fff8e7;
  }
  .join-room-footer {
    grid-row: 3;
    justify-content: center;
  }
  .join-room-footer .create-primary-action {
    min-width: 8.5em;
    min-height: 2.1em;
    height: 2.1em;
    padding: 0 1.2em;
    line-height: 2.1em;
  }
  .room-submodal-layer {
    position: absolute;
    inset: 0;
    z-index: 8;
    display: grid;
    place-items: center;
    padding: 1.25em;
    background: radial-gradient(
        circle at 50% 18%,
        rgba(92, 26, 22, 0.18),
        transparent 34%
      ),
      rgba(3, 2, 2, 0.48);
    backdrop-filter: blur(1px);
  }
  .create-room-form {
    --create-form-panel: rgba(12, 9, 8, 0.72);
    --create-form-surface: rgba(18, 15, 13, 0.86);
    --create-form-line: #3d2e26;

    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    width: min(560px, calc(100vw - 2.5em));
    height: min(620px, calc(100vh - 7em));
    max-height: calc(100vh - 7em);
    gap: 0;
    padding: 0;
    overflow: hidden;
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    border-radius: 2px;
    background: var(--create-form-panel);
    box-shadow:
      0 18px 54px rgba(0, 0, 0, 0.62),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
    backdrop-filter: blur(4px);
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  }
  .create-room-scroll {
    grid-row: 3;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 0.35em;
    scrollbar-width: thin;
  }
  .create-room-footer {
    grid-row: 4;
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: flex-end;
    padding: 0.72em 0.78em 0.78em;
    border-top: 1px solid #3d2e26;
    background: rgba(18, 15, 14, 0.92);
    box-shadow: 0 -10px 18px rgba(0, 0, 0, 0.24);
  }
  .create-room-title {
    grid-row: 1;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3.2em;
    padding: 0.45em 0.65em;
    border-bottom: 1px solid #3d2e26;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 36%
      ),
      rgba(18, 14, 12, 0.9);
  }
  .create-room-title h3 {
    margin: 0;
    color: #fff8e7;
    font-size: 1.25em;
    letter-spacing: 0.12em;
    line-height: 1;
    text-align: center;
  }
  .create-room-title .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    min-width: 1.5em;
    height: 1.5em;
    padding: 0;
    color: #dcc4a1;
    border: 0;
    border-radius: 50%;
    background: transparent;
    box-shadow: none;
    font-size: 1.05em;
    line-height: 1;
  }
  .create-room-close {
    position: absolute;
    right: 0.65em;
    top: 50%;
    transform: translateY(-50%);
  }
  .create-room-close:hover {
    color: #fff8e7;
    background: transparent;
    box-shadow: none;
  }
  .create-room-error {
    grid-row: 2;
    margin: 0;
    border-width: 0 0 1px;
    border-radius: 0;
  }
  .create-field-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 7em minmax(13em, 0.9fr);
    border: 1px solid #3d2e26;
    border-width: 0 0 1px;
    background: var(--create-form-surface);
  }
  .create-basic-row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-bottom: 1px solid rgba(61, 46, 38, 0.78);
  }
  .create-field-grid .field-block {
    display: grid;
    align-content: end;
    min-height: 4.45em;
    padding: 0.62em 0.78em;
    border-top: 1px solid rgba(61, 46, 38, 0.78);
  }
  .create-field-grid .field-block:nth-child(1) {
    border-top: 0;
  }
  .create-basic-row .field-block {
    align-content: center;
    grid-template-rows: max-content 2.5em;
    gap: 0.34em;
    min-height: 5.1em;
    border-top: 0;
  }
  .create-basic-row .field-block label {
    margin: 0;
    line-height: 1;
  }
  .create-basic-row .field-block input,
  .create-basic-row .readonly-field {
    height: 2.5em;
    min-height: 2.5em;
  }
  .create-basic-row .readonly-field {
    display: flex;
    align-items: center;
  }
  .create-name-field {
    min-height: 5.1em;
    background: radial-gradient(
        circle at 20% 0%,
        rgba(92, 26, 22, 0.18),
        transparent 32%
      ),
      rgba(18, 15, 13, 0.82);
  }
  .create-host-field {
    border-left: 1px solid rgba(61, 46, 38, 0.78);
  }
  .create-visibility-field {
    border-left: 1px solid rgba(61, 46, 38, 0.78);
  }
  .create-player-count-field {
    border-left: 1px solid rgba(61, 46, 38, 0.78);
  }
  .create-password-field {
    grid-column: 1 / -1;
  }
  .create-note-field {
    grid-column: 1 / -1;
  }
  .create-room-form label {
    color: #c0a88a;
    font-size: 0.86em;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  .create-room-form input,
  .create-room-form .readonly-field {
    min-height: 2.45em;
    color: #f7f0df;
    border: 1px solid rgba(124, 94, 70, 0.88);
    border-radius: 2px;
    background: rgba(5, 4, 4, 0.62);
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.58);
    font-family: inherit;
  }
  .create-name-field input {
    min-height: 2.5em;
    color: #fff8e7;
  }
  .create-player-count-field input {
    text-align: center;
    font-weight: 700;
  }
  .create-room-form input:focus {
    border-color: rgba(212, 175, 55, 0.82);
    box-shadow:
      0 0 0 1px rgba(212, 175, 55, 0.32),
      inset 0 1px 4px rgba(0, 0, 0, 0.58);
  }
  .create-room-form .segmented-control {
    gap: 0;
    padding: 0;
    overflow: hidden;
    border-color: rgba(124, 94, 70, 0.88);
    border-radius: 2px;
    background: rgba(5, 4, 4, 0.62);
  }
  .create-room-form .segmented-control button {
    min-height: 2.45em;
    color: #b8a082;
    border: 0;
    border-radius: 0;
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.1em;
  }
  .create-room-form .segmented-control button + button {
    border-left: 1px solid rgba(124, 94, 70, 0.72);
  }
  .create-room-form .segmented-control button.active {
    color: #fff8e7;
    border-color: transparent;
    background: linear-gradient(#8a2721, #581612 54%, #2d0c09);
    box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.14);
  }
  .create-script-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    grid-template-rows: max-content max-content;
    gap: 0.55em 0.75em;
    min-height: 5.25em;
    padding: 0.68em 0.78em;
    align-items: end;
    color: #dcc4a1;
    border: 0;
    border-bottom: 1px solid #3d2e26;
    border-radius: 0;
    background: rgba(18, 15, 14, 0.84);
  }
  .create-script-card > span {
    grid-column: 1 / -1;
  }
  .create-script-card small {
    color: #a99172;
    opacity: 1;
  }
  .create-script-card strong {
    color: #f7f0df;
    font-size: 1.05em;
  }
  .create-script-action {
    margin-left: auto;
    grid-column: 2;
    grid-row: 2;
    justify-self: end;
    align-self: end;
    min-width: 7.8em;
    min-height: 2.1em;
    color: #fff8e7;
    border: 1px solid #8b6508;
    border-radius: 2px;
    background: #2a1c09;
    font-family: inherit;
    font-weight: 700;
  }
  .create-primary-action {
    width: auto;
    min-width: 11em;
    min-height: 2.55em;
    margin: 0;
    justify-self: end;
    color: #fff8e7;
    border: 1px solid #d4af37;
    border-radius: 2px;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.8),
      inset 0 1px 1px rgba(255, 255, 255, 0.2);
    font-family: inherit;
    font-weight: 700;
    letter-spacing: 0.12em;
  }
  label {
    display: block;
    margin: 0 0 0.25em;
    color: rgba(247, 240, 223, 0.76);
    font-size: 0.88em;
  }
  input,
  select {
    display: block;
    width: 100%;
    margin: 0;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.34);
    padding: 0.45em 0.55em;
  }
  input:focus,
  select:focus {
    outline: none;
    border-color: rgba(31, 101, 255, 0.85);
    box-shadow: 0 0 0 2px rgba(31, 101, 255, 0.22);
  }
  .room-lobby .create-room-form {
    gap: 0;
  }
}

.room-lobby-list {
  --hall-glass-panel: rgba(12, 9, 8, 0.68);
  --hall-glass-surface: rgba(18, 14, 12, 0.62);
  --hall-glass-core: rgba(18, 14, 12, 0.78);

  &.modal-backdrop,
  .modal-backdrop {
    align-items: center;
    justify-content: center;
    padding: 1.5em;
    background: radial-gradient(
        circle at 50% 12%,
        rgba(96, 24, 20, 0.18),
        transparent 32%
      ),
      rgba(9, 7, 6, 0.56);
  }
  .modal {
    width: min(1100px, calc(100vw - 3em));
    max-width: min(1100px, calc(100vw - 3em));
    max-height: calc(100vh - 3em);
    height: calc(100vh - 3em);
    padding: 0;
    border: 0;
    border-radius: 0;
    background: var(--hall-glass-panel);
    box-shadow: 0 22px 70px rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(3px);
    position: relative;
  }
  .modal > .top-right-buttons {
    top: 0.62em;
    right: 0.62em;
    z-index: 20;
    display: flex;
    gap: 0.28em;
  }
  .modal > .top-right-buttons > .top-right-button {
    width: 1.15em;
    color: #dcc4a1;
  }
  .modal > .top-right-buttons > .top-right-button:first-child {
    display: none;
  }
  .modal > .top-right-buttons > .top-right-button:hover {
    color: #fff8e7;
  }
  .modal > .slot {
    width: 100%;
  }
  .room-toolbar {
    display: none;
  }
  .room-section {
    margin: 0;
  }
  .room-hall {
    min-height: 100%;
    height: 100%;
    grid-template-rows: 4.25em auto minmax(0, 1fr);
    color: #dcc4a1;
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  }
  .hall-topline {
    min-height: 4.25em;
    padding: 0 1em 0.75em;
    align-items: end;
    border-bottom: 3px double #4a3b32;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.26),
        transparent 28%
      ),
      transparent;
    color: #b8a082;
  }
  .hall-topline strong {
    color: #d4af37;
    font-size: 2.2em;
    line-height: 1;
    letter-spacing: 0.2em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  }
  .hall-topline span:first-child {
    font-size: 1.05em;
    font-weight: 700;
    letter-spacing: 0.14em;
  }
  .hall-topline span:last-child {
    padding-bottom: 0.15em;
    font-size: 0.88em;
    letter-spacing: 0.08em;
  }
  .hall-board {
    min-height: 0;
    margin-top: 0.25em;
    overflow: hidden;
    border: 2px solid #3d2e26;
    border-radius: 2px;
    background: var(--hall-glass-core);
    box-shadow:
      0 0 20px rgba(0, 0, 0, 0.78),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
    backdrop-filter: blur(5px);
  }
  .room-notice-list,
  .room-list-column,
  .room-preview-panel {
    height: 100%;
    display: block;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .room-register-bar,
  .room-row-card {
    grid-template-columns: 15% 8% 17% 13% 16% 7% 10% 14%;
  }
  .room-register-bar > span:nth-child(2) {
    padding-left: 0.5em;
    padding-right: 0.5em;
  }
  .room-register-bar {
    min-height: 2.75em;
    padding: 0 0.5em;
    color: #c0a88a;
    font-size: 0.88em;
    font-weight: 700;
    letter-spacing: 0.14em;
    border-bottom: 1px solid #3d2e26;
    background: #120f0e;
  }
  .room-list {
    max-height: calc(100vh - 17em);
    background: rgba(18, 15, 13, 0.72);
  }
  .room-row-card {
    min-height: 3.9em;
    padding: 0.45em 0.5em;
    border-bottom-color: #261d19;
    background: #151211;
  }
  .room-row-card:nth-child(even) {
    background: #110e0d;
  }
  .room-row-card:hover,
  .room-row-card.active {
    background: #201b19;
  }
  .hall-empty-row {
    min-height: calc(100vh - 19.8em);
    background: rgba(18, 15, 13, 0.68);
  }
  .room-pagination {
    border-top-color: #3d2e26;
    background: rgba(18, 15, 14, 0.84);
  }
  .hall-bottom-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    grid-template-areas: "search actions";
    gap: 0.65em 0.9em;
    min-height: 3.85em;
    margin: 0.75em 0;
    padding: 0.75em;
    border: 1px solid #3d2e26;
    border-radius: 2px;
    background: var(--hall-glass-surface);
    box-shadow:
      0 4px 14px rgba(0, 0, 0, 0.62),
      inset 0 1px 0 rgba(255, 236, 190, 0.04);
    backdrop-filter: blur(4px);
  }
  .hall-search {
    grid-area: search;
    grid-template-columns: minmax(18em, 1fr);
    max-width: 42em;
  }
  .hall-footer-actions {
    grid-area: actions;
  }
  .hall-footer-actions .create-button {
    min-width: 6.5em;
    min-height: 2.2em;
    border-radius: 2px;
    border: 1px solid #d4af37;
    background: linear-gradient(#b8860b, #946b07 48%, #5c4204);
    color: #fff8e7;
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.8),
      inset 0 1px 1px rgba(255, 255, 255, 0.2);
  }
}

@media (max-width: 640px) {
  .room-lobby {
    .modal {
      max-width: calc(100vw - 16px);
    }
    .room-toolbar {
      grid-template-columns: 34px minmax(0, 1fr) 42px;
      padding-right: 64px;
      gap: 0.45em;
    }
    .room-heading h3 {
      font-size: 1.18em;
    }
    .room-heading small {
      font-size: 0.72em;
    }
    .room-actions {
      max-width: 42px;
    }
    .create-button span {
      display: none;
    }
    .hall-topline {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 0.15em;
      padding: 0.6em 0.55em;
    }
    .hall-topline strong,
    .hall-topline span:last-child {
      justify-self: center;
    }
    .hall-board {
      border-left: 0;
      border-right: 0;
    }
    .hall-refresh {
      height: 36px;
    }
    .hall-bottom-bar {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.55em;
      padding: 0.55em;
      margin: 0.55em 0;
    }
    .hall-search {
      grid-template-columns: minmax(0, 1fr);
    }
    .room-submodal-layer {
      padding: 0.8em;
      place-items: start center;
    }
    .create-room-form {
      width: min(100%, calc(100vw - 1.6em));
      height: calc(100vh - 2.8em);
      max-height: calc(100vh - 2.8em);
      overflow: hidden;
    }
    .create-room-title {
      grid-template-columns: 36px minmax(0, 1fr) 36px;
      min-height: 3em;
      padding: 0.4em 0.55em;
    }
    .create-room-title h3 {
      font-size: 1.1em;
    }
    .create-room-title .icon-button {
      width: 32px;
      min-width: 32px;
      height: 32px;
    }
    .create-field-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .create-basic-row {
      grid-template-columns: minmax(0, 1fr);
    }
    .create-field-grid .field-block {
      min-height: 4.7em;
      padding: 0.7em 0.65em;
    }
    .create-name-field {
      min-height: 5.8em;
    }
    .create-visibility-field,
    .create-host-field,
    .create-player-count-field,
    .create-note-field,
    .create-password-field {
      border-left: 0;
    }
    .create-script-card {
      display: grid;
      gap: 0.25em;
      align-items: start;
      padding: 0.75em 0.65em;
    }
    .create-primary-action {
      width: auto;
      min-width: 0;
      justify-self: stretch;
    }
    .create-room-footer {
      padding: 0.75em 0.65em;
    }
    .create-room-footer .create-primary-action {
      width: 100%;
    }
    .join-room-footer .create-primary-action {
      width: auto;
      min-width: 8.5em;
      height: 2.1em;
      min-height: 2.1em;
    }
    .room-notice-list,
    .room-list-column {
      padding: 0;
    }
    .room-register-bar {
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.3em;
      padding: 0.48em 0.55em;
      overflow-x: auto;
    }
    .room-filter-heading {
      justify-self: center;
    }
    .hall-filter-trigger {
      font-size: 0.9em;
    }
    .room-filter-menu {
      min-width: 4.8em;
    }
    .room-list {
      max-height: min(42vh, 22em);
    }
    .room-row-card {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.35em;
      min-height: 0;
      padding: 0.65em 0.55em;
      border-bottom: 1px solid rgba(139, 84, 48, 0.32);
    }
    .room-row-card > * + * {
      border-left: 0;
    }
    .room-name {
      text-align: left;
      border: 0;
      padding: 0;
      background: transparent;
    }
    .room-language-stamp {
      justify-self: start;
    }
    .room-script-cell,
    .room-host,
    .room-note-cell {
      padding: 0;
      text-align: left;
    }
    .room-row-meta {
      display: grid;
      grid-column: auto;
      grid-row: auto;
      grid-template-columns: auto auto minmax(4.3em, max-content);
      grid-template-rows: auto;
      justify-items: stretch;
      align-items: center;
    }
    .room-count {
      min-width: 0;
      justify-content: flex-start;
    }
    .join-button {
      min-width: 4.3em;
      justify-self: end;
    }
    .hall-empty-state {
      min-height: 16em;
      padding: 1.6em 0.9em;
      text-align: center;
    }
    .room-script-row,
    .selected-room-card {
      align-items: stretch;
    }
    .room-script-row {
      flex-direction: column;
    }
    .selected-room-card {
      grid-template-columns: minmax(0, 1fr);
    }
    .selected-room-card em {
      grid-row: auto;
      grid-column: auto;
      justify-self: start;
    }
  }
}
</style>
