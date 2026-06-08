<template>
  <div class="social-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">{{ pageTitle }}</h2>
        <p class="page-subtitle">Ваши {{ pageTitle.toLowerCase() }}</p>
      </div>

      <section class="list-card">
        <p v-if="loading" class="status">Загрузка...</p>
        <p v-else-if="error" class="status error">{{ error }}</p>

        <div v-else-if="users.length > 0" class="list-grid">
          <article v-for="user in users" :key="user.id" class="user-row">
            <div>
              <p class="name">{{ user.username }}</p>
              <p class="id">ID: {{ user.id }}</p>
            </div>
            <button class="open-btn" @click="openProfile(user.id)">Профиль</button>
          </article>
        </div>

        <p v-else class="status">Список пуст</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService, type UserShort } from '@/services/api'

const route = useRoute()
const router = useRouter()

const users = ref<UserShort[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const mode = computed<'followers' | 'following'>(() => {
  return route.name === 'following' ? 'following' : 'followers'
})

const pageTitle = computed(() => (mode.value === 'followers' ? 'Подписчики' : 'Подписки'))

const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    users.value =
      mode.value === 'followers'
        ? await apiService.getMyFollowers()
        : await apiService.getMyFollowing()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить список'
  } finally {
    loading.value = false
  }
}

const openProfile = (userId: number) => {
  router.push(`/users/${userId}`)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.social-view {
  min-height: calc(100vh - 80px);
  background: radial-gradient(circle at 8% 0%, rgba(90, 74, 255, 0.25), transparent 32%),
    radial-gradient(circle at 90% 18%, rgba(22, 201, 255, 0.16), transparent 32%),
    linear-gradient(180deg, #0a0f22 0%, #070b19 56%, #060810 100%);
  padding: 2rem 0;
}

.container {
  width: min(1000px, 92vw);
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 1.4rem;
}

.page-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f4f7ff;
  margin: 0;
}

.page-subtitle {
  color: #a8b5de;
  margin-top: 0.5rem;
}

.list-card {
  border: 1px solid rgba(167, 179, 235, 0.22);
  background: rgba(12, 17, 34, 0.85);
  border-radius: 16px;
  padding: 1rem;
}

.list-grid {
  display: grid;
  gap: 0.7rem;
}

.user-row {
  border: 1px solid rgba(167, 179, 235, 0.22);
  border-radius: 12px;
  padding: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.name {
  color: #eff3ff;
  margin: 0;
  font-weight: 700;
}

.id {
  color: #a8b5de;
  margin: 0.2rem 0 0;
  font-size: 0.9rem;
}

.open-btn {
  border: none;
  border-radius: 10px;
  background: rgba(125, 77, 255, 0.9);
  color: #fff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.status {
  color: #a8b5de;
}

.status.error {
  color: #ffb4b4;
}
</style>
