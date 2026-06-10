<template>
  <Modal class="script-modal" v-if="modals.edition" @close="close">
    <template v-if="view === 'gallery'">
      <h3>{{ $t("modals.chooseScript") }}</h3>
      <div class="search-row">
        <font-awesome-icon icon="search" />
        <input
          v-model="searchText"
          type="search"
          :placeholder="$t('modals.searchScripts')"
          @input="queueSearch"
        />
        <button
          type="button"
          class="refresh-button"
          :disabled="loading"
          :title="galleryText('refresh')"
          @click="refreshGalleryScripts"
        >
          <font-awesome-icon icon="sync-alt" :spin="refreshing" />
        </button>
      </div>
      <div
        class="script-list"
        @scroll="handleScriptListScroll"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div v-if="pullDistance > 0" class="state-line pull-state">
          {{
            pullDistance >= pullRefreshThreshold
              ? galleryText("releaseToRefresh")
              : galleryText("pullToRefresh")
          }}
        </div>
        <div v-if="loading && !galleryScripts.length" class="state-line">
          <font-awesome-icon icon="spinner" spin />
          {{ $t("modals.loadingScripts") }}
        </div>
        <div
          v-else-if="error && !galleryScripts.length"
          class="state-line error"
        >
          {{ error }}
        </div>
        <button
          v-else
          v-for="script in galleryScripts"
          :key="script.id || script._id"
          type="button"
          class="script-card"
          @click="applyGalleryScript(script)"
        >
          <span class="script-cover" :style="scriptCoverStyle(script)">
            <font-awesome-icon
              v-if="!getScriptImage(script)"
              icon="theater-masks"
            />
          </span>
          <span class="script-content">
            <span class="script-title">{{ script.title || script.name }}</span>
            <span class="script-author">{{
              script.author || $t("modals.unknownAuthor")
            }}</span>
            <span v-if="script.description" class="script-description">
              {{ script.description }}
            </span>
            <span class="script-meta">{{ getScriptMeta(script) }}</span>
          </span>
        </button>
        <div
          v-if="loading && galleryScripts.length"
          class="state-line more-state"
        >
          <font-awesome-icon icon="spinner" spin />
          {{ $t("modals.loadingScripts") }}
        </div>
        <button
          v-else-if="!loading && !error && hasMore && galleryScripts.length"
          type="button"
          class="state-line load-more-button"
          @click="loadNextGalleryPage"
        >
          {{ galleryText("loadMore") }}
        </button>
        <div
          v-if="error && galleryScripts.length"
          class="state-line error more-state"
        >
          {{ error }}
        </div>
        <div
          v-if="!loading && !error && !galleryScripts.length"
          class="state-line"
        >
          {{ $t("modals.noScriptsFound") }}
        </div>
      </div>
      <div class="button-group">
        <div class="button" @click="view = 'custom'">
          <font-awesome-icon icon="file-upload" />
          {{ $t("common.customScriptCharacters") }}
        </div>
      </div>
    </template>

    <template v-else>
      <div class="custom">
        <h3>{{ $t("modals.loadCustomTitle") }}</h3>
        {{ $t("modals.loadCustomDescription") }}
        <a href="https://script.bloodontheclocktower.com/" target="_blank">{{
          $t("modals.scriptTool")
        }}</a>
        <template v-if="$i18n.locale === 'en-US'">
          and then upload the generated "custom-list.json" either directly here
          or provide a URL to such a hosted JSON file. </template
        ><br />
        <br />
        {{ $t("modals.customCharactersDescription") }}
        <a
          href="https://github.com/bra1n/townsquare#custom-characters"
          target="_blank"
          >{{ $t("modals.documentation") }}</a
        >
        {{ $t("modals.customCharactersSuffix") }}
        <b>{{ $t("modals.trustWarning") }}</b>
        <h3>{{ $t("modals.popularScripts") }}</h3>
        <ul class="scripts">
          <li
            v-for="(script, index) in scripts"
            :key="index"
            @click="handleURL(script[1])"
          >
            {{ script[0] }}
          </li>
        </ul>
        <input
          type="file"
          ref="upload"
          accept="application/json"
          @change="handleUpload"
        />
        <div class="button-group">
          <div class="button" @click="openUpload">
            <font-awesome-icon icon="file-upload" />
            {{ $t("common.uploadJson") }}
          </div>
          <div class="button" @click="promptURL">
            <font-awesome-icon icon="link" /> {{ $t("common.enterUrl") }}
          </div>
          <div class="button" @click="readFromClipboard">
            <font-awesome-icon icon="clipboard" />
            {{ $t("modals.useClipboard") }}
          </div>
          <div class="button" @click="view = 'gallery'">
            <font-awesome-icon icon="undo" /> {{ $t("common.back") }}
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import {
  getScriptDetail,
  getScriptList,
  searchScripts,
} from "@/services/scripts";

export default {
  components: {
    Modal,
  },
  data: function () {
    return {
      view: "gallery",
      searchText: "",
      loading: false,
      refreshing: false,
      pendingRefresh: false,
      error: "",
      galleryScripts: [],
      page: 1,
      pageSize: 20,
      totalScripts: 0,
      hasMore: true,
      searchTimer: null,
      touchStartY: 0,
      pullDistance: 0,
      pullRefreshThreshold: 54,
      scripts: [
        [
          "Deadly Penance Day",
          "https://gist.githubusercontent.com/bra1n/0337cc44c6fd2c44f7589256ed5486d2/raw/16be38fa3c01aaf49827303ac80577bdb52c0b25/penanceday.json",
        ],
        [
          "Catfishing 11.1",
          "https://gist.githubusercontent.com/bra1n/8a5ec41a7bbf945f6b7dfc1cef72b569/raw/a312ab93c2f302e0ef83c8b65a4e8e82760fda3a/catfishing.json",
        ],
        [
          "On Thin Ice (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/8dacd9f2abc6f428331ea1213ab153f5/raw/0cacbcaf8ed9bddae0cca25a9ada97e9958d868b/on-thin-ice.json",
        ],
        [
          "Race To The Bottom (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/63e1354cb3dc9d4032bcd0623dc48888/raw/5acb0eedcc0a67a64a99c7e0e6271de0b7b2e1b2/race-to-the-bottom.json",
        ],
        [
          "Frankenstein's Mayor by Ted (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/32c52b422cc01b934a4291eeb81dbcee/raw/5bf770693bbf7aff5e86601c82ca4af3222f4ba6/Frankensteins_Mayor_by_Ted.json",
        ],
        [
          "Vigormortis High School (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/1f65bd4a999524719d5dabe98c3c2d27/raw/22bbec6bf56a51a7459e5ae41ed47e41971c5445/VigormortisHighSchool.json",
        ],
      ],
    };
  },
  computed: mapState(["modals"]),
  watch: {
    "modals.edition"(visible) {
      if (visible) {
        this.view = "gallery";
        this.refreshGalleryScripts();
      }
    },
  },
  beforeDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  methods: {
    close() {
      this.closeModal("edition");
    },
    galleryText(key) {
      const zh = {
        refresh: "刷新",
        loadMore: "加载更多",
        pullToRefresh: "下拉刷新",
        releaseToRefresh: "松开刷新",
      };
      const en = {
        refresh: "Refresh",
        loadMore: "Load more",
        pullToRefresh: "Pull to refresh",
        releaseToRefresh: "Release to refresh",
      };
      return (this.$i18n.locale === "en-US" ? en : zh)[key] || key;
    },
    async loadGalleryScripts() {
      if (this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const keyword = this.searchText.trim();
        const res = keyword
          ? await searchScripts({
              keyword,
              page: this.page,
              pageSize: this.pageSize,
            })
          : await getScriptList({ page: this.page, pageSize: this.pageSize });
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("modals.loadScriptsFailed"),
          );
        }
        const list = (res.data.list || []).map((script) => ({
          ...script,
          id: script.id || script._id,
        }));
        this.galleryScripts = list;
        this.totalScripts = Number(res.data.total) || list.length;
        this.hasMore = this.galleryScripts.length < this.totalScripts;
      } catch (error) {
        this.galleryScripts = [];
        this.error = this.resolveScriptError(error);
      } finally {
        this.loading = false;
        this.refreshing = false;
        if (this.pendingRefresh) {
          this.pendingRefresh = false;
          this.$nextTick(this.refreshGalleryScripts);
        }
      }
    },
    async refreshGalleryScripts() {
      if (this.loading) {
        this.pendingRefresh = true;
        return;
      }
      this.page = 1;
      this.totalScripts = 0;
      this.hasMore = true;
      this.refreshing = true;
      await this.loadGalleryScripts();
    },
    queueSearch() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(this.refreshGalleryScripts, 300);
    },
    async loadNextGalleryPage() {
      if (this.loading || !this.hasMore) return;
      this.page += 1;
      this.loading = true;
      this.error = "";
      try {
        const keyword = this.searchText.trim();
        const res = keyword
          ? await searchScripts({
              keyword,
              page: this.page,
              pageSize: this.pageSize,
            })
          : await getScriptList({ page: this.page, pageSize: this.pageSize });
        if (!res || !res.success || !res.data) {
          throw new Error(
            (res && res.message) || this.$t("modals.loadScriptsFailed"),
          );
        }
        const list = (res.data.list || []).map((script) => ({
          ...script,
          id: script.id || script._id,
        }));
        this.galleryScripts = this.galleryScripts.concat(list);
        this.totalScripts =
          Number(res.data.total) || this.galleryScripts.length;
        this.hasMore =
          this.galleryScripts.length < this.totalScripts && list.length > 0;
      } catch (error) {
        this.page = Math.max(1, this.page - 1);
        this.error = this.resolveScriptError(error);
      } finally {
        this.loading = false;
      }
    },
    handleScriptListScroll(event) {
      const el = event.currentTarget;
      if (!el || this.loading || !this.hasMore) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        this.loadNextGalleryPage();
      }
    },
    handleTouchStart(event) {
      const el = event.currentTarget;
      if (!el || el.scrollTop > 0 || this.loading) return;
      this.touchStartY = event.touches[0].clientY;
      this.pullDistance = 0;
    },
    handleTouchMove(event) {
      if (!this.touchStartY || this.loading) return;
      const el = event.currentTarget;
      if (!el || el.scrollTop > 0) return;
      const distance = event.touches[0].clientY - this.touchStartY;
      this.pullDistance = Math.max(0, Math.min(80, distance));
    },
    async handleTouchEnd() {
      if (this.pullDistance >= this.pullRefreshThreshold) {
        await this.refreshGalleryScripts();
      }
      this.touchStartY = 0;
      this.pullDistance = 0;
    },
    getScriptImage(script) {
      const images = script.images || script.thumbnails || [];
      if (script.thumbnail) return script.thumbnail;
      if (!Array.isArray(images) || !images.length) return "";
      const image = images[0];
      if (typeof image === "string") return image;
      return image.url || image.fileId || image.fileID || "";
    },
    scriptCoverStyle(script) {
      const image = this.getScriptImage(script);
      return image ? { backgroundImage: `url(${image})` } : {};
    },
    getScriptMeta(script) {
      const parts = [];
      if (script.version) parts.push(`v${script.version}`);
      if (script.likes || script.likes === 0) {
        parts.push(this.$t("modals.scriptLikes", { count: script.likes }));
      }
      if (script.views || script.views === 0) {
        parts.push(this.$t("modals.scriptViews", { count: script.views }));
      }
      return parts.join(" · ");
    },
    async applyGalleryScript(script) {
      if (!script || !(script.id || script._id)) return;
      this.loading = true;
      this.error = "";
      try {
        const res = await getScriptDetail(script.id || script._id);
        if (!res || !res.success || !res.data || !res.data.script) {
          throw new Error(
            (res && res.message) || this.$t("modals.loadScriptFailed"),
          );
        }
        const roles = this.extractScriptRoles(res.data.script);
        this.parseRoles(roles);
      } catch (error) {
        this.error = this.resolveScriptError(error);
      } finally {
        this.loading = false;
      }
    },
    extractScriptRoles(script) {
      const roles = this.findScriptRoleArray(script);
      if (!Array.isArray(roles)) {
        throw new Error(this.$t("modals.scriptJsonMissing"));
      }
      return roles;
    },
    findScriptRoleArray(value, depth = 0) {
      if (!value || depth > 3) return null;
      if (Array.isArray(value)) return value;

      if (typeof value === "string") {
        try {
          return this.findScriptRoleArray(JSON.parse(value), depth + 1);
        } catch (error) {
          return null;
        }
      }

      if (typeof value !== "object") return null;

      const candidates = [
        value.content,
        value.characters,
        value.roles,
        value.jsonData,
        value.data,
        value.script,
      ];
      for (const candidate of candidates) {
        const roles = this.findScriptRoleArray(candidate, depth + 1);
        if (Array.isArray(roles)) return roles;
      }
      return null;
    },
    resolveScriptError(error) {
      const message = String((error && error.message) || error || "");
      if (/uniCloud web config is not configured/.test(message)) {
        return this.$t("login.missingUniCloudConfig");
      }
      if (/failed to fetch|network|timeout/i.test(message)) {
        return this.$t("login.networkError");
      }
      return (
        message.replace(/^\[script-service\]:\s*/, "") ||
        this.$t("modals.loadScriptsFailed")
      );
    },
    openUpload() {
      this.$refs.upload.click();
    },
    handleUpload() {
      const file = this.$refs.upload.files[0];
      if (file && file.size) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          try {
            const roles = JSON.parse(reader.result);
            this.parseRoles(roles);
          } catch (e) {
            alert(this.$t("modals.errorReadCustom", { message: e.message }));
          }
          this.$refs.upload.value = "";
        });
        reader.readAsText(file);
      }
    },
    promptURL() {
      const url = prompt(this.$t("modals.promptCustomUrl"));
      if (url) {
        this.handleURL(url);
      }
    },
    async handleURL(url) {
      const res = await fetch(url);
      if (res && res.json) {
        try {
          const script = await res.json();
          this.parseRoles(script);
        } catch (e) {
          alert(this.$t("modals.errorLoadCustom", { message: e.message }));
        }
      }
    },
    async readFromClipboard() {
      const text = await navigator.clipboard.readText();
      try {
        const roles = JSON.parse(text);
        this.parseRoles(roles);
      } catch (e) {
        alert(this.$t("modals.errorReadCustom", { message: e.message }));
      }
    },
    parseRoles(roles) {
      if (!roles || !roles.length) return;
      roles = roles.map((role) =>
        typeof role === "string" ? { id: role } : role,
      );
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit(
        "setEdition",
        Object.assign({}, meta, { id: "custom" }),
      );
      if (roles.some((role) => this.$store.state.fabled.has(role.id || role))) {
        const fabled = [];
        roles.forEach((role) => {
          if (this.$store.state.fabled.has(role.id || role)) {
            fabled.push(this.$store.state.fabled.get(role.id || role));
          }
        });
        this.$store.commit("players/setFabled", { fabled });
      }
      this.view = "gallery";
    },
    ...mapMutations(["closeModal", "toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.script-modal {
  &.modal-backdrop,
  .modal-backdrop {
    z-index: 120;
    background: rgba(0, 0, 0, 0.34);
  }

  ::v-deep .modal {
    width: min(1010px, calc(100vw - 2em));
    max-width: min(1010px, calc(100vw - 2em));
    min-height: min(430px, calc(100vh - 2em));
    max-height: min(82vh, 620px);
    padding: 0.65em;
    color: #dcc4a1;
    border: 2px solid #3d2e26;
    border-radius: 2px;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.22),
        transparent 28%
      ),
      linear-gradient(180deg, rgba(24, 18, 15, 0.96), rgba(9, 7, 6, 0.96)),
      #120f0e;
    box-shadow:
      0 22px 58px rgba(0, 0, 0, 0.72),
      inset 0 1px 0 rgba(255, 236, 190, 0.05);
    font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
    font-size: 0.9em;
  }

  ::v-deep .modal > .top-right-buttons {
    top: 0.55em;
    right: 0.55em;
    display: flex;
    gap: 0.28em;
  }

  ::v-deep .modal > .top-right-buttons > .top-right-button {
    width: 1.15em;
    color: #dcc4a1;
  }

  ::v-deep .modal > .slot {
    min-height: 0;
  }

  h3 {
    min-height: 3.2em;
    margin: 0 2.8em 0.58em;
    padding: 0.72em 0 0.45em;
    color: #d4af37;
    border-bottom: 3px double #4a3b32;
    font-size: 1.16em;
    letter-spacing: 0.08em;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  }
}

.search-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  align-items: center;
  gap: 0.42em;
  width: auto;
  max-width: none;
  min-height: 2.45em;
  margin: 0 0 0.62em;
  padding: 0.36em 0.5em;
  background: rgba(18, 15, 13, 0.72);
  border: 1px solid #3d2e26;
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.04);

  input {
    min-width: 0;
    color: #fff8e7;
    background: transparent;
    border: 0;
    outline: 0;
    font: inherit;
  }
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9em;
  height: 1.8em;
  color: #dcc4a1;
  background: #1d1816;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}

.script-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15em, 18em));
  gap: 0.55em;
  align-content: start;
  justify-content: start;
  width: auto;
  max-width: none;
  min-height: 14em;
  max-height: min(46vh, 330px);
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 0 0.62em;
  padding: 0.55em;
  border: 1px solid #3d2e26;
  background: rgba(18, 15, 13, 0.58);
}

.script-card {
  display: grid;
  grid-template-columns: 3.8em minmax(0, 1fr);
  align-items: center;
  gap: 0.48em;
  width: 100%;
  min-height: 5.2em;
  color: #dcc4a1;
  background: rgba(16, 13, 11, 0.7);
  border: 1px solid #3d2e26;
  border-radius: 2px;
  cursor: pointer;
  padding: 0.45em;
  text-align: left;
  overflow: hidden;
  transition:
    background 160ms,
    color 160ms;

  &:nth-child(even) {
    background: rgba(12, 9, 8, 0.7);
  }

  &:hover {
    color: #fff8e7;
    background: #201b19;
  }
}

.script-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.15em;
  height: 3.15em;
  color: rgba(255, 248, 231, 0.72);
  background: linear-gradient(
    145deg,
    rgba($townsfolk, 0.7),
    rgba($demon, 0.62)
  );
  background-position: center;
  background-size: cover;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  font-size: 130%;
}

.script-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.script-title {
  display: block;
  margin-bottom: 0.12em;
  color: #fff8e7;
  font-weight: bold;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-author,
.script-meta {
  display: block;
  color: #b8a082;
  font-size: 72%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-description {
  display: -webkit-box;
  margin: 0.25em 0;
  color: #c0a88a;
  font-size: 76%;
  line-height: 1.25;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.script-meta {
  margin-top: auto;
}

.state-line {
  grid-column: 1 / -1;
  padding: 1.2em 0.6em;
  text-align: center;
  color: #c0a88a;
}

.pull-state,
.more-state {
  padding: 10px 8px;
}

.load-more-button {
  width: 100%;
  background: #1d1816;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    border-color: #6b4a18;
  }
}

.error {
  color: $demon;
}

ul.editions .edition {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  padding-top: 15%;
  background-position: center center;
  background-size: 100% auto;
  background-repeat: no-repeat;
  width: 30%;
  margin: 5px;
  font-size: 120%;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  &:hover {
    color: red;
  }
}

.custom {
  text-align: center;
  color: #dcc4a1;
  input[type="file"] {
    display: none;
  }
  .scripts {
    list-style-type: disc;
    font-size: 120%;
    cursor: pointer;
    display: block;
    width: 50%;
    text-align: left;
    margin: 10px auto;
    li:hover {
      color: #d4af37;
    }
  }
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
  justify-content: center;
}

.button-group .button {
  min-height: 1.62em;
  margin: 0;
  padding: 0.16em 0.52em;
  color: #fff8e7;
  border: 1px solid #8b6508;
  border-radius: 2px;
  background: linear-gradient(#8b6508, #5c4204);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.06);
  font-size: 0.82em;
}

@media (max-width: 640px) {
  .script-modal {
    ::v-deep .modal {
      width: calc(100vw - 1em);
      max-width: calc(100vw - 1em);
      min-height: min(430px, calc(100vh - 1em));
      padding: 0.5em;
    }

    h3 {
      margin-left: 2.6em;
      margin-right: 2.6em;
      min-height: 2.8em;
      font-size: 1.05em;
    }
  }

  .script-card {
    grid-template-columns: 3.35em minmax(0, 1fr);
    min-height: 3.85em;
    padding: 0.35em 0.45em;
  }

  .script-cover {
    width: 2.9em;
    height: 2.9em;
  }
}
</style>
