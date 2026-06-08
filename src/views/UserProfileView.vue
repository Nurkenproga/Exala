<template>
  <div class="profile-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Профиль пользователя</h2>
        <p class="page-subtitle">Публичная информация пользователя</p>
      </div>

      <section class="profile-card">
        <div v-if="loading" class="status">Загружаем профиль...</div>
        <div v-else-if="error" class="status error">{{ error }}</div>
        <div v-else-if="profile" class="rows">
          <div class="row">
            <span class="label">ID</span>
            <span class="value">{{ profile.id }}</span>
          </div>
          <div class="row">
            <span class="label">Логин</span>
            <span class="value">{{ profile.username }}</span>
          </div>
          <div class="row">
            <span class="label">Уровень</span>
            <span class="value">{{ profile.explorer_level }}</span>
          </div>
          <div class="row">
            <span class="label">Очки</span>
            <span class="value">{{ profile.explorer_points }}</span>
          </div>
          <div class="row">
            <span class="label">Посещено</span>
            <span class="value">{{ visitedEventsCount }}</span>
          </div>
          <div class="row">
            <span class="label">NFT</span>
            <span class="value">{{ profile.nft_count }}</span>
          </div>
          <div class="row">
            <span class="label">Подписчики</span>
            <span class="value">{{ profile.followers_count }}</span>
          </div>
          <div class="row">
            <span class="label">Подписки</span>
            <span class="value">{{ profile.following_count }}</span>
          </div>
          <div class="actions">
            <button
              class="follow-btn secondary"
              @click="openUserNfts"
            >
              NFT пользователя
            </button>
          </div>
          <div class="actions" v-if="!isOwnProfile">
            <button
              class="follow-btn"
              :class="{ danger: isFollowing }"
              :disabled="followLoading"
              @click="toggleFollow"
            >
              {{ followLoading ? 'Обработка...' : isFollowing ? 'Отписаться' : 'Подписаться' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService, type PublicProfile } from '@/services/api'

const route = useRoute()
const router = useRouter()
const profile = ref<PublicProfile | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const followLoading = ref(false)
const isFollowing = ref(false)

const visitedEventsCount = computed(() => {
  if (!profile.value) return 0
  return Math.max(profile.value.events_attended, profile.value.nft_count)
})
const myUserId = ref<number | null>(null)

const isOwnProfile = computed(() => {
  if (!profile.value || myUserId.value === null) return false
  return profile.value.id === myUserId.value
})

const loadProfile = async () => {
  const userId = Number(route.params.userId)
  if (!Number.isFinite(userId)) {
    error.value = 'Некорректный user id'
    return
  }

  loading.value = true
  error.value = null

  try {
    const [publicProfile, ownProfile, following] = await Promise.all([
      apiService.getUserProfile(userId),
      apiService.getMyProfile(),
      apiService.getMyFollowing(),
    ])

    profile.value = publicProfile
    myUserId.value = ownProfile.id
    isFollowing.value = following.some((item) => item.id === publicProfile.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить профиль'
  } finally {
    loading.value = false
  }
}

const toggleFollow = async () => {
  if (!profile.value || isOwnProfile.value) return

  followLoading.value = true
  error.value = null

  try {
    if (isFollowing.value) {
      await apiService.unfollowUser(profile.value.username)
      profile.value.followers_count = Math.max(0, profile.value.followers_count - 1)
      isFollowing.value = false
    } else {
      await apiService.followUser(profile.value.username)
      profile.value.followers_count += 1
      isFollowing.value = true
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось изменить подписку'
  } finally {
    followLoading.value = false
  }
}

const openUserNfts = () => {
  if (!profile.value) return
  router.push(`/users/${encodeURIComponent(profile.value.username)}/nfts`)
}

onMounted(() => {
  loadProfile()
})

watch(
  () => route.params.userId,
  () => {
    loadProfile()
  }
)
</script>

<style scoped>
.profile-view {
  min-height: calc(100vh - 80px);
  background: radial-gradient(circle at 8% 0%, rgba(90, 74, 255, 0.25), transparent 32%),
    radial-gradient(circle at 90% 18%, rgba(22, 201, 255, 0.16), transparent 32%),
    linear-gradient(180deg, #0a0f22 0%, #070b19 56%, #060810 100%);
  padding: 2rem 0;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #f4f7ff;
  margin: 0 0 0.5rem;
}

.page-subtitle {
  margin: 0;
  color: #a8b5de;
}

.profile-card {
  border-radius: 16px;
  padding: 1.25rem;
  border: 1px solid rgba(167, 179, 235, 0.22);
  background: rgba(12, 17, 34, 0.85);
}

.rows {
  display: grid;
  gap: 0.35rem;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid rgba(167, 179, 235, 0.22);
}

.row:last-child {
  border-bottom: none;
}

.label {
  color: #d6defd;
  font-weight: 600;
}

.value {
  color: #f4f7ff;
}

.status {
  color: #a8b5de;
}

.status.error {
  color: #ffb4b4;
}

.actions {
  margin-top: 1rem;
}

.follow-btn {
  border: none;
  border-radius: 10px;
  background: rgba(125, 77, 255, 0.9);
  color: #fff;
  padding: 0.6rem 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.follow-btn.danger {
  background: rgba(245, 86, 86, 0.9);
}

.follow-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(167, 179, 235, 0.35);
}

.follow-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
