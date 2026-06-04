<template>
  <Modal class="announcement-modal" v-if="modals.announcement" @close="close">
    <section class="announcement-panel">
      <header class="announcement-header">
        <h3>{{ $t("announcements.title") }}</h3>
      </header>

      <div v-if="loading" class="state">
        <font-awesome-icon icon="spinner" spin /> {{ $t("announcements.loading") }}
      </div>
      <div v-else-if="error" class="state error">
        {{ error }}
      </div>
      <div v-else-if="!announcements.length" class="state">
        {{ $t("announcements.empty") }}
      </div>
      <article v-else-if="selectedAnnouncement" class="announcement-detail" :class="selectedAnnouncement.type">
        <button class="back-button" type="button" @click="selectedAnnouncement = null">
          <font-awesome-icon icon="undo" /> {{ $t("announcements.backToList") }}
        </button>
        <div class="card-head">
          <span class="type">{{ typeText(selectedAnnouncement.type) }}</span>
          <span v-if="selectedAnnouncement.version" class="item-version">
            {{ $t("announcements.applicableVersion", { version: selectedAnnouncement.version }) }}
          </span>
        </div>
        <h4>{{ selectedAnnouncement.title }}</h4>
        <p v-if="selectedAnnouncement.summary" class="summary">{{ selectedAnnouncement.summary }}</p>
        <div class="content">{{ selectedAnnouncement.content }}</div>
        <footer v-if="selectedAnnouncement.publishTime" class="time">
          {{ $t("announcements.publishedAt", { time: formatTime(selectedAnnouncement.publishTime) }) }}
        </footer>
      </article>
      <div v-else class="announcement-list">
        <article
          class="announcement-list-item"
          v-for="item in announcements"
          :key="item._id"
          :class="item.type"
          @click="selectedAnnouncement = item"
        >
          <div class="list-main">
            <div class="card-head">
              <span class="type">{{ typeText(item.type) }}</span>
              <span v-if="item.publishTime" class="time compact">
                {{ formatTime(item.publishTime) }}
              </span>
            </div>
            <h4>{{ item.title }}</h4>
            <p class="summary">{{ item.summary || shortContent(item.content) }}</p>
          </div>
          <font-awesome-icon class="detail-icon" icon="hand-point-right" />
        </article>
      </div>
    </section>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import { getPublicWebAnnouncements } from "@/services/announcements";

export default {
  components: { Modal },
  data() {
    return {
      announcements: [],
      selectedAnnouncement: null,
      loading: false,
      error: ""
    };
  },
  computed: mapState(["modals"]),
  watch: {
    "modals.announcement"(visible) {
      if (visible) this.loadAnnouncements();
    }
  },
  mounted() {
    if (this.modals.announcement) this.loadAnnouncements();
  },
  methods: {
    async loadAnnouncements() {
      this.loading = true;
      this.error = "";
      this.selectedAnnouncement = null;
      try {
        const res = await getPublicWebAnnouncements({ pageSize: 10 });
        if (!res || !res.success) {
          throw new Error((res && res.message) || this.$t("announcements.failed"));
        }
        this.announcements = (res.data && res.data.list) || [];
      } catch (error) {
        this.error = error.message || this.$t("announcements.failed");
      } finally {
        this.loading = false;
      }
    },
    close() {
      this.toggleModal("announcement");
    },
    typeText(type) {
      return this.$t(`announcements.types.${type || "notice"}`);
    },
    shortContent(content) {
      const text = String(content || "").trim().replace(/\s+/g, " ");
      return text.length > 72 ? `${text.slice(0, 72)}...` : text;
    },
    formatTime(value) {
      const date = new Date(Number(value));
      if (Number.isNaN(date.getTime())) return "";
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      return `${y}-${m}-${d} ${hh}:${mm}`;
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.announcement-panel {
  width: min(720px, 78vw);
  max-height: 72vh;
  overflow-y: auto;
  padding: 6px 6px 14px;
}

.announcement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-right: 76px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 30px;
    line-height: 1.2;
  }
}

.version,
.time,
.item-version {
  color: #c9c9c9;
  font-size: 15px;
}

.state {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #eee;
}

.error {
  color: $demon;
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announcement-list-item,
.announcement-detail {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);

  &.important {
    border-color: rgba(255, 89, 89, 0.62);
  }

  &.maintenance {
    border-color: rgba(255, 202, 87, 0.62);
  }

  &.update {
    border-color: rgba(82, 180, 255, 0.62);
  }
}

.announcement-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.13);
    border-color: rgba(255, 255, 255, 0.32);
  }
}

.list-main {
  min-width: 0;
  flex: 1;
}

.detail-icon {
  flex: 0 0 auto;
  color: #d8d8d8;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  margin: 0 0 12px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  cursor: pointer;
  font: inherit;

  &:hover {
    border-color: rgba(255, 255, 255, 0.42);
    background: rgba(255, 255, 255, 0.14);
  }
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.type {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.16);
  font-size: 14px;
}

h4 {
  margin: 0 0 8px;
  font-size: 22px;
  line-height: 1.25;
}

.summary {
  margin: 0 0 10px;
  color: #dedede;
  font-size: 16px;
}

.content {
  color: white;
  font-size: 17px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.time {
  margin-top: 12px;
}

.compact {
  margin-top: 0;
  white-space: nowrap;
}

@media (max-width: 700px) {
  ::v-deep .modal {
    width: calc(100vw - 20px);
    max-width: calc(100vw - 20px);
    max-height: calc(100dvh - 88px);
    padding: 10px;
    border-radius: 8px;
  }

  ::v-deep .modal > .top-right-buttons {
    top: 12px;
    right: 12px;

    .top-right-button {
      width: 22px;
    }
  }

  ::v-deep .modal > .slot {
    min-height: 0;
    width: 100%;
  }

  .announcement-panel {
    width: 100%;
    max-height: calc(100dvh - 118px);
    padding: 2px 0 4px;
  }

  .announcement-header {
    display: block;
    padding-right: 56px;
    margin-bottom: 10px;

    h3 {
      font-size: 22px;
    }
  }

  .version {
    display: block;
    margin-top: 4px;
    font-size: 13px;
  }

  .announcement-list {
    gap: 8px;
  }

  .announcement-list-item,
  .announcement-detail {
    padding: 10px;
    border-radius: 7px;
  }

  .announcement-list-item {
    gap: 10px;
  }

  .card-head {
    gap: 8px;
    margin-bottom: 6px;
  }

  .type {
    height: 22px;
    padding: 0 7px;
    font-size: 13px;
  }

  h4 {
    margin-bottom: 6px;
    font-size: 18px;
  }

  .summary {
    margin-bottom: 8px;
    font-size: 14px;
    line-height: 1.45;
  }

  .content {
    font-size: 15px;
    line-height: 1.55;
  }

  .version,
  .time,
  .item-version {
    font-size: 13px;
  }

  .detail-icon {
    width: 14px;
  }
}
</style>
