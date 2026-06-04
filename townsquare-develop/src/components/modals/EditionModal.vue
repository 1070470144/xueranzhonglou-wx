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
      </div>
      <div class="script-list">
        <div v-if="loading" class="state-line">
          <font-awesome-icon icon="spinner" spin /> {{ $t("modals.loadingScripts") }}
        </div>
        <div v-else-if="error" class="state-line error">{{ error }}</div>
        <button
          v-else
          v-for="script in galleryScripts"
          :key="script.id || script._id"
          type="button"
          class="script-card"
          @click="applyGalleryScript(script)"
        >
          <span class="script-cover" :style="scriptCoverStyle(script)">
            <font-awesome-icon v-if="!getScriptImage(script)" icon="theater-masks" />
          </span>
          <span class="script-content">
            <span class="script-title">{{ script.title || script.name }}</span>
            <span class="script-author">{{ script.author || $t("modals.unknownAuthor") }}</span>
            <span v-if="script.description" class="script-description">
              {{ script.description }}
            </span>
            <span class="script-meta">{{ getScriptMeta(script) }}</span>
          </span>
        </button>
        <div v-if="!loading && !error && !galleryScripts.length" class="state-line">
          {{ $t("modals.noScriptsFound") }}
        </div>
      </div>
      <div class="button-group">
        <div class="button" @click="view = 'custom'">
          <font-awesome-icon icon="file-upload" /> {{ $t("common.customScriptCharacters") }}
        </div>
      </div>
    </template>

    <template v-else>
      <div class="custom">
        <h3>{{ $t("modals.loadCustomTitle") }}</h3>
        {{ $t("modals.loadCustomDescription") }}
        <a href="https://script.bloodontheclocktower.com/" target="_blank"
          >{{ $t("modals.scriptTool") }}</a
        >
        <template v-if="$i18n.locale === 'en-US'">
          and then upload the generated "custom-list.json" either directly here or
          provide a URL to such a hosted JSON file.
        </template><br />
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
            <font-awesome-icon icon="file-upload" /> {{ $t("common.uploadJson") }}
          </div>
          <div class="button" @click="promptURL">
            <font-awesome-icon icon="link" /> {{ $t("common.enterUrl") }}
          </div>
          <div class="button" @click="readFromClipboard">
            <font-awesome-icon icon="clipboard" /> {{ $t("modals.useClipboard") }}
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
  searchScripts
} from "@/services/scripts";

export default {
  components: {
    Modal
  },
  data: function() {
    return {
      view: "gallery",
      searchText: "",
      loading: false,
      error: "",
      galleryScripts: [],
      searchTimer: null,
      scripts: [
        [
          "Deadly Penance Day",
          "https://gist.githubusercontent.com/bra1n/0337cc44c6fd2c44f7589256ed5486d2/raw/16be38fa3c01aaf49827303ac80577bdb52c0b25/penanceday.json"
        ],
        [
          "Catfishing 11.1",
          "https://gist.githubusercontent.com/bra1n/8a5ec41a7bbf945f6b7dfc1cef72b569/raw/a312ab93c2f302e0ef83c8b65a4e8e82760fda3a/catfishing.json"
        ],
        [
          "On Thin Ice (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/8dacd9f2abc6f428331ea1213ab153f5/raw/0cacbcaf8ed9bddae0cca25a9ada97e9958d868b/on-thin-ice.json"
        ],
        [
          "Race To The Bottom (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/63e1354cb3dc9d4032bcd0623dc48888/raw/5acb0eedcc0a67a64a99c7e0e6271de0b7b2e1b2/race-to-the-bottom.json"
        ],
        [
          "Frankenstein's Mayor by Ted (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/32c52b422cc01b934a4291eeb81dbcee/raw/5bf770693bbf7aff5e86601c82ca4af3222f4ba6/Frankensteins_Mayor_by_Ted.json"
        ],
        [
          "Vigormortis High School (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/1f65bd4a999524719d5dabe98c3c2d27/raw/22bbec6bf56a51a7459e5ae41ed47e41971c5445/VigormortisHighSchool.json"
        ]
      ]
    };
  },
  computed: mapState(["modals"]),
  watch: {
    "modals.edition"(visible) {
      if (visible) {
        this.view = "gallery";
        this.loadGalleryScripts();
      }
    }
  },
  beforeDestroy() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  },
  methods: {
    close() {
      this.toggleModal("edition");
    },
    async loadGalleryScripts() {
      this.loading = true;
      this.error = "";
      try {
        const keyword = this.searchText.trim();
        const res = keyword
          ? await searchScripts({ keyword })
          : await getScriptList();
        if (!res || !res.success || !res.data) {
          throw new Error((res && res.message) || this.$t("modals.loadScriptsFailed"));
        }
        this.galleryScripts = (res.data.list || []).map(script => ({
          ...script,
          id: script.id || script._id
        }));
      } catch (error) {
        this.galleryScripts = [];
        this.error = this.resolveScriptError(error);
      } finally {
        this.loading = false;
      }
    },
    queueSearch() {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(this.loadGalleryScripts, 300);
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
          throw new Error((res && res.message) || this.$t("modals.loadScriptFailed"));
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
        value.script
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
      return message.replace(/^\[script-service\]:\s*/, "") || this.$t("modals.loadScriptsFailed");
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
      roles = roles.map(role => (typeof role === "string" ? { id: role } : role));
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit("setEdition", Object.assign({}, meta, { id: "custom" }));
      if (roles.some(role => this.$store.state.fabled.has(role.id || role))) {
        const fabled = [];
        roles.forEach(role => {
          if (this.$store.state.fabled.has(role.id || role)) {
            fabled.push(this.$store.state.fabled.get(role.id || role));
          }
        });
        this.$store.commit("players/setFabled", { fabled });
      }
      this.view = "gallery";
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.script-modal {
  h3 {
    margin-top: 0;
    text-align: center;
  }
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 420px;
  max-width: 70vw;
  margin: 0 auto 10px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.35);

  input {
    flex: 1;
    min-width: 0;
    color: white;
    background: transparent;
    border: 0;
    outline: 0;
  }
}

.script-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
  width: 720px;
  max-width: 74vw;
  max-height: 430px;
  overflow-y: auto;
  margin: 0 auto 10px;
  padding: 2px;
}

.script-card {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 126px;
  color: white;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  cursor: pointer;
  padding: 8px;
  text-align: left;
  overflow: hidden;
  transition: border-color 160ms, background 160ms, transform 160ms;

  &:hover {
    background: rgba(0, 0, 0, 0.62);
    border-color: rgba($townsfolk, 0.85);
    transform: translateY(-1px);
  }
}

.script-cover {
  display: flex;
  flex: 0 0 76px;
  align-items: center;
  justify-content: center;
  min-height: 108px;
  margin-right: 10px;
  color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(145deg, rgba($townsfolk, 0.7), rgba($demon, 0.62));
  background-position: center;
  background-size: cover;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  font-size: 160%;
}

.script-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.script-title {
  display: block;
  margin-bottom: 2px;
  font-weight: bold;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-author,
.script-meta {
  display: block;
  color: rgba(255, 255, 255, 0.68);
  font-size: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.script-description {
  display: -webkit-box;
  margin: 6px 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 78%;
  line-height: 1.25;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.script-meta {
  margin-top: auto;
}

.state-line {
  padding: 18px 8px;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
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
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000, 0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  &:hover {
    color: red;
  }
}

.custom {
  text-align: center;
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
      color: red;
    }
  }
}
</style>
