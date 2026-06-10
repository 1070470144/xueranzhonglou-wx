<template>
  <transition name="modal-fade">
    <div class="modal-backdrop" @click="close">
      <div
        class="modal"
        :class="{ maximized: isMaximized }"
        role="dialog"
        aria-labelledby="modalTitle"
        aria-describedby="modalDescription"
        @click.stop=""
      >
        <div class="top-right-buttons">
          <font-awesome-icon
            @click="isMaximized = !isMaximized"
            class="top-right-button"
            :icon="['fas', isMaximized ? 'window-minimize' : 'window-maximize']"
          />
          <font-awesome-icon
            @click="close"
            class="top-right-button"
            icon="times-circle"
          />
        </div>
        <div class="slot">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  data: function () {
    return {
      isMaximized: false,
    };
  },
  methods: {
    close() {
      this.$emit("close");
    },
  },
};
</script>

<style lang="scss">
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: radial-gradient(
      circle at 50% 12%,
      rgba(96, 24, 20, 0.18),
      transparent 32%
    ),
    rgba(9, 7, 6, 0.58);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5em;
  z-index: 100;
  backdrop-filter: blur(2px);
}

.modal {
  --modal-panel: rgba(12, 9, 8, 0.78);
  --modal-surface: rgba(18, 15, 13, 0.86);
  --modal-line: #3d2e26;

  display: flex;
  flex-direction: column;
  min-width: min(22em, calc(100vw - 3em));
  max-height: calc(100vh - 3em);
  max-width: min(80vw, calc(100vw - 3em));
  padding: 0;
  color: #dcc4a1;
  border: 2px solid var(--modal-line);
  border-radius: 2px;
  background: var(--modal-panel);
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.62),
    inset 0 1px 0 rgba(255, 236, 190, 0.05);
  backdrop-filter: blur(4px);
  font-family: "STKaiti", "KaiTi", "STSong", "SimSun", serif;
  overflow: hidden;

  .vote-history &,
  .night-reference &,
  .characters & {
    overflow: hidden;
  }

  .roles &,
  .characters & {
    max-height: 100%;
    max-width: 60%;
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
    justify-content: center;
    line-height: 100%;
  }

  h3 {
    margin: 0 2.4em 0.7em 0;
    color: #fff8e7;
    font-size: 1.28em;
    line-height: 1.18;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  }

  label {
    color: #c0a88a;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  input,
  select,
  textarea {
    color: #f7f0df;
    border: 1px solid rgba(124, 94, 70, 0.88);
    border-radius: 2px;
    background: rgba(5, 4, 4, 0.62);
    box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.58);
    font-family: inherit;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: rgba(212, 175, 55, 0.82);
    box-shadow:
      0 0 0 1px rgba(212, 175, 55, 0.32),
      inset 0 1px 4px rgba(0, 0, 0, 0.58);
  }

  > .top-right-buttons {
    position: absolute;
    z-index: 100;
    top: 0.72em;
    right: 0.78em;
    display: flex;
    gap: 0.28em;
    > .top-right-button {
      cursor: pointer;
      width: 1.18em;
      color: #dcc4a1;
      &:hover {
        color: #fff8e7;
      }
    }
  }

  > .slot {
    position: initial;
    max-height: calc(100vh - 3.3em);
    padding: 1em;
    overflow: auto;
    background: radial-gradient(
        circle at 50% 0%,
        rgba(92, 26, 22, 0.16),
        transparent 34%
      ),
      var(--modal-surface);
  }
}

@media (max-width: 640px) {
  .modal > .top-right-buttons {
    top: 0.5em;
    right: 0.5em;
    gap: 0.42em;

    > .top-right-button {
      width: 1.75em;
      min-width: 1.75em;
      height: 1.75em;
      padding: 0.18em;
    }
  }
}

.maximized {
  background: rgba(12, 9, 8, 0.95);
  padding: 0;
  border-radius: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-content: center;
  justify-content: center;
  .roles &,
  .characters & {
    max-width: 100%;
    padding: 10px;
  }
}

.modal-fade-enter,
.modal-fade-leave-active {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
</style>
