<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNftTasksStore, type NftNotification } from '@/stores/nftTasks'

const router = useRouter()
const nftTasksStore = useNftTasksStore()

const openNotification = async (notification: NftNotification) => {
  if (!notification.actionRoute) return
  nftTasksStore.dismissNotification(notification.id)
  await router.push(notification.actionRoute)
}

</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="nft-toast" tag="aside" class="nft-notifications" aria-live="polite">
      <article
        v-for="notification in nftTasksStore.notifications"
        :key="notification.id"
        class="nft-notification"
        :class="`is-${notification.kind}`"
      >
        <div class="notification-mark" aria-hidden="true">
          {{ notification.kind === 'success' ? 'NFT' : notification.kind === 'error' ? '!' : '...' }}
        </div>

        <div class="notification-copy">
          <strong>{{ notification.title }}</strong>
          <p>{{ notification.message }}</p>
          <button
            v-if="notification.actionRoute"
            type="button"
            class="notification-action"
            @click="openNotification(notification)"
          >
            {{ notification.actionLabel }}
          </button>
        </div>

        <button
          type="button"
          class="notification-close"
          aria-label="Закрыть уведомление"
          @click="nftTasksStore.dismissNotification(notification.id)"
        >
          ×
        </button>
      </article>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.nft-notifications {
  position: fixed;
  z-index: 1200;
  top: 96px;
  left: 24px;
  width: min(390px, calc(100vw - 32px));
  display: grid;
  gap: 12px;
  pointer-events: none;
}

.nft-notification {
  position: relative;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 28px;
  gap: 13px;
  align-items: start;
  padding: 16px;
  overflow: hidden;
  color: #f7f8ff;
  background:
    linear-gradient(135deg, rgba(28, 32, 55, 0.97), rgba(10, 16, 32, 0.98)),
    #0d1222;
  border: 1px solid rgba(137, 153, 207, 0.27);
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.nft-notification::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, #8b5cff, #3ebeff);
}

.nft-notification.is-success::before {
  background: linear-gradient(180deg, #71f4c2, #42a7ff);
}

.nft-notification.is-error::before {
  background: linear-gradient(180deg, #ff6d91, #b849e8);
}

.notification-mark {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #eef3ff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  background: linear-gradient(145deg, rgba(127, 82, 255, 0.9), rgba(43, 159, 255, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.is-success .notification-mark {
  color: #081b19;
  background: linear-gradient(145deg, #79f3c4, #55b7ff);
}

.is-error .notification-mark {
  background: linear-gradient(145deg, #ff668d, #ae46e6);
}

.notification-copy {
  min-width: 0;
}

.notification-copy strong {
  display: block;
  margin: 1px 0 5px;
  font-size: 1rem;
}

.notification-copy p {
  margin: 0;
  color: #aeb9db;
  font-size: 0.87rem;
  line-height: 1.45;
}

.notification-action {
  margin-top: 11px;
  padding: 0;
  border: 0;
  color: #91bfff;
  background: transparent;
  font: inherit;
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
}

.notification-action:hover {
  color: #c2d9ff;
}

.notification-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  color: #7885a8;
  background: transparent;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.notification-close:hover {
  color: #f4f6ff;
}

.nft-toast-enter-active,
.nft-toast-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.nft-toast-enter-from,
.nft-toast-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

@media (max-width: 720px) {
  .nft-notifications {
    top: 82px;
    left: 16px;
  }
}
</style>
