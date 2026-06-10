<template>
  <Modal class="web-login" v-if="modals.login" @close="close">
    <h3>{{ $t("login.title") }}</h3>
    <div class="login-body">
      <div v-if="qrCode" class="qr-wrap">
        <img :src="qrCode" :alt="$t('login.qrAlt')" />
      </div>
      <div v-else class="qr-placeholder">
        <font-awesome-icon icon="spinner" spin />
      </div>
      <p>{{ statusText }}</p>
      <small v-if="expireSeconds > 0">
        {{ $t("login.expiresIn", { seconds: expireSeconds }) }}
      </small>
      <small v-if="error" class="error">{{ error }}</small>
    </div>
    <div class="button-group">
      <div class="button townsfolk" @click="restart">
        <font-awesome-icon icon="sync-alt" /> {{ $t("login.refresh") }}
      </div>
    </div>
  </Modal>
</template>

<script>
import QRCode from "qrcode";
import Modal from "./Modal";
import { mapMutations, mapState } from "vuex";
import {
  createWebLoginTicket,
  pollWebLoginTicket,
  setAuthSession
} from "@/services/auth";

export default {
  components: {
    Modal
  },
  computed: {
    statusText() {
      if (this.error) return this.$t("login.failed");
      if (this.pollFailures > 0) return this.$t("login.retrying");
      if (this.status === "approved") return this.$t("login.approved");
      if (this.status === "expired") return this.$t("login.expired");
      return this.$t("login.pending");
    },
    ...mapState(["modals"])
  },
  data() {
    return {
      ticket: "",
      qrCode: "",
      expireTime: 0,
      expireSeconds: 0,
      status: "pending",
      error: "",
      pollFailures: 0,
      pollTimer: null,
      countdownTimer: null
    };
  },
  watch: {
    "modals.login"(visible) {
      if (visible) this.restart();
      else this.stopTimers();
    }
  },
  beforeDestroy() {
    this.stopTimers();
  },
  methods: {
    async restart() {
      this.stopTimers();
      this.ticket = "";
      this.qrCode = "";
      this.expireTime = 0;
      this.expireSeconds = 0;
      this.status = "pending";
      this.error = "";
      this.pollFailures = 0;
      try {
        const res = await createWebLoginTicket();
        if (!res || !res.success || !res.data) {
          throw new Error((res && res.message) || this.$t("login.createFailed"));
        }
        this.ticket = res.data.ticket;
        this.expireTime = res.data.expireTime || 0;
        this.expireSeconds = this.getExpireSeconds();
        this.qrCode = await QRCode.toDataURL(res.data.payload, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: "M"
        });
        this.startTimers();
      } catch (error) {
        this.error = this.resolveError(error);
      }
    },
    startTimers() {
      this.pollTimer = setInterval(this.poll, 2000);
      this.countdownTimer = setInterval(() => {
        this.expireSeconds = this.getExpireSeconds();
        if (this.expireSeconds <= 0 && this.status === "pending") {
          this.status = "expired";
          this.stopTimers();
        }
      }, 1000);
      this.poll();
    },
    stopTimers() {
      if (this.pollTimer) clearInterval(this.pollTimer);
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.pollTimer = null;
      this.countdownTimer = null;
    },
    async poll() {
      if (!this.ticket || this.status !== "pending") return;
      try {
        const res = await pollWebLoginTicket(this.ticket);
        if (!res || !res.success || !res.data) {
          throw new Error((res && res.message) || this.$t("login.pollFailed"));
        }
        this.pollFailures = 0;
        this.status = res.data.status || "pending";
        if (this.status === "approved" && res.data.token) {
          setAuthSession(res.data.token, res.data.user);
          window.dispatchEvent(new Event("townsquare-auth-change"));
          this.stopTimers();
          setTimeout(() => this.close(), 500);
        } else if (this.status !== "pending") {
          this.stopTimers();
        }
      } catch (error) {
        if (this.shouldRetryPoll(error)) {
          this.pollFailures += 1;
          return;
        }
        this.error = this.resolveError(error);
        this.stopTimers();
      }
    },
    shouldRetryPoll(error) {
      const message = String((error && error.message) || error || "");
      return this.pollFailures < 3 && /failed to fetch|network|timeout/i.test(message);
    },
    getExpireSeconds() {
      if (!this.expireTime) return 0;
      return Math.max(0, Math.ceil((this.expireTime - Date.now()) / 1000));
    },
    resolveError(error) {
      const message = String((error && error.message) || error || "");
      if (/uniCloud web config is not configured/.test(message)) {
        return this.$t("login.missingUniCloudConfig");
      }
      if (message === "uniCloud Web SDK is not loaded") {
        return this.$t("login.missingUniCloudSdk");
      }
      if (/failed to fetch|network|timeout/i.test(message)) {
        return this.$t("login.networkError");
      }
      return message.replace(/^\[auth-service\]:\s*/, "") || this.$t("login.networkError");
    },
    close() {
      this.stopTimers();
      this.toggleModal("login");
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.web-login {
  ::v-deep .modal {
    width: min(360px, calc(100vw - 3em));
  }
}

h3 {
  margin-bottom: 0.85em;
  text-align: center;
}

.login-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  text-align: center;
}

.qr-wrap,
.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 230px;
  height: 230px;
  max-width: 100%;
  padding: 0.32em;
  border: 1px solid #3d2e26;
  border-radius: 2px;
  background: rgba(18, 15, 13, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 236, 190, 0.05), 0 8px 22px rgba(0, 0, 0, 0.48);
}

.qr-wrap img {
  display: block;
  width: 220px;
  height: 220px;
  border: 0.24em solid #f7f0df;
  background: #f7f0df;
}

.qr-placeholder {
  color: #d4af37;
  font-size: 40px;
}

p {
  margin: 0.9em 0 0.3em;
  color: #fff8e7;
}

small {
  display: block;
  color: #c0a88a;
}

.error {
  color: $demon;
}

.button-group {
  margin-top: 0.95em;
}
</style>
