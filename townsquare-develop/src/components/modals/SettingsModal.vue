<template>
  <Modal
    class="settings-modal"
    v-if="modals.settings"
    @close="toggleModal('settings')"
  >
    <section class="settings-shell">
      <aside class="settings-nav">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <font-awesome-icon :icon="section.icon" />
          <span>{{ section.label }}</span>
        </button>
      </aside>

      <div class="settings-content">
        <header class="settings-header">
          <h3>{{ $t("settings.title") }}</h3>
          <p>{{ activeSectionLabel }}</p>
        </header>

        <form
          v-if="activeSection === 'profile'"
          class="settings-form"
          @submit.prevent="saveProfile"
        >
          <div class="avatar-preview-row">
            <span class="avatar-preview">
              <img v-if="profileForm.avatarUrl" :src="profileForm.avatarUrl" />
              <font-awesome-icon v-else icon="user" />
            </span>
            <label>
              {{ $t("settings.profile.avatarUrl") }}
              <input
                v-model.trim="profileForm.avatarUrl"
                type="url"
                :placeholder="$t('settings.profile.avatarPlaceholder')"
              />
            </label>
          </div>
          <label>
            {{ $t("settings.profile.nickname") }}
            <input
              v-model.trim="profileForm.nickname"
              type="text"
              maxlength="80"
              :placeholder="$t('settings.profile.nicknamePlaceholder')"
            />
          </label>
          <div v-if="profileMessage" class="settings-message success">
            {{ profileMessage }}
          </div>
          <div v-if="profileError" class="settings-message error">
            {{ profileError }}
          </div>
          <button
            type="submit"
            class="button townsfolk"
            :disabled="profileSaving || !isLoggedIn"
          >
            <font-awesome-icon
              :icon="profileSaving ? 'spinner' : 'save'"
              :spin="profileSaving"
            />
            {{ $t("settings.actions.saveProfile") }}
          </button>
        </form>

        <form v-else class="settings-form" @submit.prevent="saveAiConfig">
          <label class="settings-checkbox">
            <input v-model="aiForm.enabled" type="checkbox" />
            <span>{{ $t("settings.ai.enabled") }}</span>
          </label>
          <label>
            {{ $t("settings.ai.provider") }}
            <input v-model.trim="aiForm.provider" type="text" />
          </label>
          <label>
            {{ $t("settings.ai.baseUrl") }}
            <input
              v-model.trim="aiForm.baseUrl"
              type="url"
              placeholder="https://api.openai.com/v1"
            />
          </label>
          <label>
            {{ $t("settings.ai.apiKey") }}
            <input
              v-model.trim="aiForm.apiKey"
              type="password"
              :placeholder="$t('settings.ai.apiKeyPlaceholder')"
            />
          </label>
          <label>
            {{ $t("settings.ai.chatModel") }}
            <input
              v-model.trim="aiForm.model"
              type="text"
              placeholder="gpt-4o-mini"
            />
          </label>
          <label>
            {{ $t("settings.ai.imageModel") }}
            <input
              v-model.trim="aiForm.imageModel"
              type="text"
              placeholder="gpt-image-2"
            />
          </label>
          <div v-if="aiMessage" class="settings-message success">
            {{ aiMessage }}
          </div>
          <div v-if="aiError" class="settings-message error">
            {{ aiError }}
          </div>
          <button
            type="submit"
            class="button townsfolk"
            :disabled="aiSaving || aiLoading || !isLoggedIn"
          >
            <font-awesome-icon
              :icon="aiSaving ? 'spinner' : 'save'"
              :spin="aiSaving"
            />
            {{ $t("settings.actions.saveAi") }}
          </button>
        </form>
      </div>
    </section>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import { getAuthSession, setAuthSession, updateProfile } from "@/services/auth";
import { getUserAiConfig, saveUserAiConfig } from "@/services/ai";

const defaultAiForm = () => ({
  enabled: false,
  provider: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  imageModel: "gpt-image-2",
  apiKey: "",
});

export default {
  components: { Modal },
  data() {
    return {
      activeSection: "profile",
      profileForm: {
        nickname: "",
        avatarUrl: "",
      },
      profileSaving: false,
      profileMessage: "",
      profileError: "",
      aiForm: defaultAiForm(),
      aiLoading: false,
      aiSaving: false,
      aiMessage: "",
      aiError: "",
    };
  },
  computed: {
    ...mapState(["modals"]),
    sections() {
      return [
        {
          key: "profile",
          icon: "user",
          label: this.$t("settings.profile.title"),
        },
        {
          key: "ai",
          icon: "magic",
          label: this.$t("settings.ai.title"),
        },
      ];
    },
    activeSectionLabel() {
      const section = this.sections.find(
        (item) => item.key === this.activeSection,
      );
      return section ? section.label : "";
    },
    isLoggedIn() {
      return !!getAuthSession().token;
    },
  },
  watch: {
    "modals.settings"(visible) {
      if (visible) this.loadSettings();
    },
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    resolveError(error, fallback) {
      return (
        (error && (error.message || error.errMsg || error.msg)) || fallback
      );
    },
    loadSettings() {
      const session = getAuthSession();
      const user = session.user || {};
      this.profileForm = {
        nickname: user.nickname || user.username || user.email || "",
        avatarUrl: user.avatarUrl || user.avatar || "",
      };
      this.profileMessage = "";
      this.profileError = "";
      this.aiMessage = "";
      this.aiError = "";
      if (session.token) this.loadAiConfig();
    },
    async loadAiConfig() {
      this.aiLoading = true;
      try {
        const res = await getUserAiConfig();
        if (!res || !res.success) {
          throw new Error(
            (res && res.message) || this.$t("settings.ai.loadFailed"),
          );
        }
        this.aiForm = {
          ...defaultAiForm(),
          ...((res.data && res.data.config) || {}),
        };
      } catch (error) {
        this.aiError = this.resolveError(
          error,
          this.$t("settings.ai.loadFailed"),
        );
      } finally {
        this.aiLoading = false;
      }
    },
    async saveProfile() {
      if (!this.isLoggedIn || this.profileSaving) return;
      this.profileSaving = true;
      this.profileMessage = "";
      this.profileError = "";
      try {
        const res = await updateProfile(this.profileForm);
        if (!res || !res.success) {
          throw new Error(
            (res && res.message) || this.$t("settings.profile.saveFailed"),
          );
        }
        const session = getAuthSession();
        const user = (res.data && res.data.user) || {
          ...(session.user || {}),
          ...this.profileForm,
        };
        setAuthSession(session.token, user);
        window.dispatchEvent(new Event("townsquare-auth-change"));
        this.profileMessage = this.$t("settings.profile.saved");
      } catch (error) {
        this.profileError = this.resolveError(
          error,
          this.$t("settings.profile.saveFailed"),
        );
      } finally {
        this.profileSaving = false;
      }
    },
    async saveAiConfig() {
      if (!this.isLoggedIn || this.aiSaving) return;
      this.aiSaving = true;
      this.aiMessage = "";
      this.aiError = "";
      try {
        const res = await saveUserAiConfig(this.aiForm);
        if (!res || !res.success) {
          throw new Error(
            (res && res.message) || this.$t("settings.ai.saveFailed"),
          );
        }
        this.aiForm = {
          ...defaultAiForm(),
          ...((res.data && res.data.config) || this.aiForm),
        };
        this.aiMessage = this.$t("settings.ai.saved");
      } catch (error) {
        this.aiError = this.resolveError(
          error,
          this.$t("settings.ai.saveFailed"),
        );
      } finally {
        this.aiSaving = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.settings-shell {
  width: min(54em, calc(100vw - 4em));
  min-height: min(34em, calc(100vh - 5em));
  display: grid;
  grid-template-columns: 11em minmax(0, 1fr);
  gap: 1em;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 0.45em;
  border-right: 1px solid rgba(124, 94, 70, 0.68);
  padding-right: 1em;
}

.settings-nav button {
  display: flex;
  align-items: center;
  gap: 0.55em;
  min-height: 2.5em;
  padding: 0.35em 0.6em;
  color: #dcc4a1;
  border: 1px solid rgba(124, 94, 70, 0.74);
  border-radius: 3px;
  background: rgba(5, 4, 4, 0.36);
  text-align: left;
  cursor: pointer;
}

.settings-nav button.active,
.settings-nav button:hover {
  color: #fff8e7;
  border-color: rgba(198, 156, 74, 0.82);
  background: rgba(83, 22, 24, 0.42);
}

.settings-content {
  min-width: 0;
}

.settings-header p {
  margin: -0.45em 0 1em;
  color: #bba382;
}

.settings-form {
  display: grid;
  gap: 0.85em;
}

.settings-form label {
  display: grid;
  gap: 0.35em;
}

.settings-form input {
  width: 100%;
  min-height: 2.35em;
  padding: 0.45em 0.65em;
  box-sizing: border-box;
}

.settings-checkbox {
  display: flex !important;
  grid-template-columns: none;
  align-items: center;
  gap: 0.55em !important;
}

.settings-checkbox input {
  width: auto;
  min-height: auto;
}

.avatar-preview-row {
  display: grid;
  grid-template-columns: 4.4em minmax(0, 1fr);
  gap: 0.8em;
  align-items: center;
}

.avatar-preview {
  width: 4.1em;
  height: 4.1em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(124, 94, 70, 0.88);
  border-radius: 4px;
  background: rgba(5, 4, 4, 0.5);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.settings-message {
  padding: 0.6em 0.75em;
  border-radius: 3px;
  border: 1px solid currentColor;
}

.settings-message.success {
  color: #9bd38e;
  background: rgba(44, 91, 48, 0.18);
}

.settings-message.error {
  color: #ffb1a8;
  background: rgba(118, 28, 26, 0.2);
}

@media (max-width: 720px) {
  .settings-shell {
    width: calc(100vw - 3.5em);
    grid-template-columns: 1fr;
  }

  .settings-nav {
    flex-direction: row;
    border-right: 0;
    border-bottom: 1px solid rgba(124, 94, 70, 0.68);
    padding-right: 0;
    padding-bottom: 0.75em;
  }

  .settings-nav button {
    flex: 1;
    justify-content: center;
  }
}
</style>
