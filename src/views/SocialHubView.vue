<template>
  <div class="social-hub-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Сообщество</h2>
        <p class="page-subtitle">Люди, подписчики и подписки</p>
      </div>

      <section class="hub-panel">
        <div class="tabs">
          <button class="tab-btn" :class="{ active: tab === 'people' }" @click="setTab('people')">Люди</button>
          <button class="tab-btn" :class="{ active: tab === 'followers' }" @click="setTab('followers')">Подписчики</button>
          <button class="tab-btn" :class="{ active: tab === 'following' }" @click="setTab('following')">Подписки</button>
        </div>

        <div v-if="tab === 'people'" class="search-row">
          <input
            v-model.trim="query"
            class="search-input"
            type="text"
            placeholder="Введите никнейм"
            @keyup.enter="runPeopleSearch"
          />
          <button class="search-btn" :disabled="loading" @click="runPeopleSearch">
            {{ loading ? 'Поиск...' : 'Найти' }}
          </button>
        </div>

        <p v-if="error" class="error-note">{{ error }}</p>

        <div v-if="tab === 'people'" class="list-grid">
          <article v-for="person in peopleResults" :key="person.id" class="user-row">
            <div>
              <p class="name">{{ person.username }}</p>
              <p class="id">ID: {{ person.id }}</p>
            </div>
            <div class="actions-inline">
              <button
                v-if="person.id !== myUserId"
                class="follow-btn"
                :class="{ danger: followingIds.has(person.id) }"
                :disabled="followLoadingId === person.id"
                @click="toggleFollow(person)"
              >
                {{ followLoadingId === person.id ? '...' : followingIds.has(person.id) ? 'Отписаться' : 'Подписаться' }}
              </button>
              <button class="open-btn" @click="openUser(person.id)">Профиль</button>
            </div>
          </article>

          <p v-if="!loading && searched && peopleResults.length === 0" class="empty-note">Пользователи не найдены</p>
        </div>

        <div v-if="tab !== 'people'" class="list-grid">
          <article v-for="person in listUsers" :key="person.id" class="user-row">
            <div>
              <p class="name">{{ person.username }}</p>
              <p class="id">ID: {{ person.id }}</p>
            </div>
            <button class="open-btn" @click="openUser(person.id)">Профиль</button>
          </article>

          <p v-if="!loading && listUsers.length === 0" class="empty-note">Список пуст</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiService, type UserShort } from '@/services/api'

const route = useRoute()
const router = useRouter()

const tab = ref<'people' | 'followers' | 'following'>('people')
const query = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref(false)

const peopleResults = ref<UserShort[]>([])
const listUsers = ref<UserShort[]>([])
const followingIds = ref<Set<number>>(new Set())
const followLoadingId = ref<number | null>(null)
const myUserId = ref<number | null>(null)

const syncTabFromRoute = () => {
  const value = String(route.query.tab || 'people')
  if (value === 'followers' || value === 'following' || value === 'people') {
    tab.value = value
  } else {
    tab.value = 'people'
  }
}

const setTab = (nextTab: 'people' | 'followers' | 'following') => {
  tab.value = nextTab
  error.value = null
  router.replace({ query: { ...route.query, tab: nextTab } })
  if (nextTab !== 'people') {
    loadListTab(nextTab)
  }
}

const loadBaseSocialState = async () => {
  const [ownProfile, following] = await Promise.all([apiService.getMyProfile(), apiService.getMyFollowing()])
  myUserId.value = ownProfile.id
  followingIds.value = new Set(following.map((item) => item.id))
  if (tab.value === 'following') {
    listUsers.value = following
  }
}

const loadListTab = async (mode: 'followers' | 'following') => {
  loading.value = true
  error.value = null

  try {
    listUsers.value = mode === 'followers' ? await apiService.getMyFollowers() : await apiService.getMyFollowing()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить список'
  } finally {
    loading.value = false
  }
}

const runPeopleSearch = async () => {
  const value = query.value.trim()
  if (!value) {
    error.value = 'Введите поисковый запрос'
    return
  }

  loading.value = true
  error.value = null
  searched.value = true

  try {
    peopleResults.value = await apiService.searchUsers(value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка поиска'
  } finally {
    loading.value = false
  }
}

const toggleFollow = async (person: UserShort) => {
  followLoadingId.value = person.id
  error.value = null

  try {
    if (followingIds.value.has(person.id)) {
      await apiService.unfollowUser(person.username)
      followingIds.value.delete(person.id)
    } else {
      await apiService.followUser(person.username)
      followingIds.value.add(person.id)
    }
    followingIds.value = new Set(followingIds.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось изменить подписку'
  } finally {
    followLoadingId.value = null
  }
}

const openUser = (userId: number) => {
  router.push(`/users/${userId}`)
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRoute()
    if (tab.value === 'followers' || tab.value === 'following') {
      loadListTab(tab.value)
    }
  },
)

onMounted(async () => {
  syncTabFromRoute()
  try {
    await loadBaseSocialState()
    if (tab.value === 'followers' || tab.value === 'following') {
      await loadListTab(tab.value)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить социальные данные'
  }
})
</script>

<style scoped>
.social-hub-view {
  min-height: calc(100vh - 80px);
  background: radial-gradient(circle at 8% 0%, rgba(90, 74, 255, 0.25), transparent 32%),
    radial-gradient(circle at 90% 18%, rgba(22, 201, 255, 0.16), transparent 32%),
    linear-gradient(180deg, #0a0f22 0%, #070b19 56%, #060810 100%);
  padding: 2rem 0;
}

.container {
  width: min(1100px, 92vw);
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

.hub-panel {
  border: 1px solid rgba(167, 179, 235, 0.26);
  background: rgba(12, 17, 34, 0.78);
  border-radius: 16px;
  padding: 1rem;
}

.tabs {
  display: flex;
  gap: 0.55rem;
  margin-bottom: 0.9rem;
}

.tab-btn {
  border: 1px solid rgba(167, 179, 235, 0.32);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: #d6defd;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
}

.tab-btn.active {
  background: linear-gradient(120deg, rgba(125, 77, 255, 0.95), rgba(81, 95, 255, 0.95));
  border-color: transparent;
  color: #fff;
}

.search-row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.8rem;
}

.search-input {
  flex: 1;
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 12px;
  padding: 0.72rem 0.9rem;
  background: rgba(255, 255, 255, 0.03);
  color: #eff3ff;
}

.search-btn {
  border: none;
  border-radius: 12px;
  padding: 0.72rem 1rem;
  background: #667eea;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
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
  background: rgba(255, 255, 255, 0.02);
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

.actions-inline {
  display: flex;
  gap: 0.5rem;
}

.open-btn {
  border: none;
  border-radius: 10px;
  background: rgba(125, 77, 255, 0.9);
  color: #fff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.follow-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #eff3ff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.follow-btn.danger {
  border-color: rgba(245, 86, 86, 0.45);
  color: #ffc9c9;
}

.error-note {
  margin: 0.4rem 0 0.8rem;
  color: #ffb4b4;
}

.empty-note {
  color: #a8b5de;
  text-align: center;
}

@media (max-width: 740px) {
  .user-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions-inline {
    width: 100%;
  }
}
</style>
