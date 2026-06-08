<template>
  <div class="social-hub-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">Сообщество</h2>
        <p class="page-subtitle">Найдите друзей, смотрите профили и собирайте свою VibeChain-сеть</p>
      </div>

      <section class="community-hero">
        <div>
          <span class="eyebrow">Social hub</span>
          <h3>{{ currentTabTitle }}</h3>
          <p>{{ currentTabDescription }}</p>
        </div>
        <div class="community-stats">
          <div v-for="item in heroStats" :key="item.label" class="stat-chip">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <section class="hub-panel">
        <div class="tabs">
          <button class="tab-btn" :class="{ active: tab === 'people' }" @click="setTab('people')">
            <span>Люди</span>
            <small>поиск</small>
          </button>
          <button class="tab-btn" :class="{ active: tab === 'followers' }" @click="setTab('followers')">
            <span>Подписчики</span>
            <small>{{ followersCount }}</small>
          </button>
          <button class="tab-btn" :class="{ active: tab === 'following' }" @click="setTab('following')">
            <span>Подписки</span>
            <small>{{ followingIds.size }}</small>
          </button>
        </div>

        <div v-if="tab === 'people'" class="search-card">
          <div>
            <h3>Поиск участников</h3>
            <p>Введите никнейм и откройте профиль или подпишитесь прямо отсюда.</p>
          </div>
          <div class="search-row">
            <input
              v-model.trim="query"
              class="search-input"
              type="text"
              placeholder="Например: Romina"
              @keyup.enter="runPeopleSearch"
            />
            <button class="search-btn" :disabled="loading" @click="runPeopleSearch">
              {{ loading ? 'Ищем...' : 'Найти' }}
            </button>
          </div>
        </div>

        <p v-if="error" class="error-note">{{ error }}</p>

        <div v-if="tab === 'people'" class="list-grid">
          <article v-for="person in peopleResults" :key="person.id" class="user-card">
            <div class="user-main">
              <div class="user-avatar">{{ getInitial(person.username) }}</div>
              <div>
                <p class="name">{{ person.username }}</p>
                <p class="id">ID: {{ person.id }}</p>
              </div>
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

          <div v-if="!loading && !searched" class="empty-state">
            <span>⌕</span>
            <h3>Начните с поиска</h3>
            <p>Найдите участника по никнейму, чтобы открыть профиль или подписаться.</p>
          </div>

          <div v-if="!loading && searched && peopleResults.length === 0" class="empty-state">
            <span>0</span>
            <h3>Пользователи не найдены</h3>
            <p>Проверьте никнейм или попробуйте другой запрос.</p>
          </div>
        </div>

        <div v-if="tab !== 'people'" class="list-grid">
          <article v-for="person in listUsers" :key="person.id" class="user-card">
            <div class="user-main">
              <div class="user-avatar">{{ getInitial(person.username) }}</div>
              <div>
                <p class="name">{{ person.username }}</p>
                <p class="id">ID: {{ person.id }}</p>
              </div>
            </div>
            <button class="open-btn" @click="openUser(person.id)">Профиль</button>
          </article>

          <div v-if="!loading && listUsers.length === 0" class="empty-state">
            <span>—</span>
            <h3>{{ tab === 'followers' ? 'Пока нет подписчиков' : 'Пока нет подписок' }}</h3>
            <p>{{ tab === 'followers' ? 'Когда на вас подпишутся, люди появятся здесь.' : 'Найдите людей во вкладке поиска и подпишитесь на них.' }}</p>
          </div>
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
const followersCount = ref(0)
const followLoadingId = ref<number | null>(null)
const myUserId = ref<number | null>(null)

const currentTabTitle = computed(() => {
  if (tab.value === 'followers') return 'Кто следит за вами'
  if (tab.value === 'following') return 'Ваш круг'
  return 'Поиск участников'
})

const currentTabDescription = computed(() => {
  if (tab.value === 'followers') return 'Смотрите людей, которые подписались на ваш профиль.'
  if (tab.value === 'following') return 'Быстрый доступ к профилям людей, на которых вы подписаны.'
  return 'Найдите участника по никнейму и добавьте его в свою социальную сеть.'
})

const heroStats = computed(() => {
  if (tab.value === 'followers') {
    return [
      { label: 'подписчиков', value: followersCount.value },
      { label: 'подписок', value: followingIds.value.size },
    ]
  }

  if (tab.value === 'following') {
    return [
      { label: 'подписок', value: listUsers.value.length },
      { label: 'подписчиков', value: followersCount.value },
    ]
  }

  return [
    { label: 'найдено', value: peopleResults.value.length },
    { label: 'подписок', value: followingIds.value.size },
  ]
})

const getInitial = (username: string) => username.trim().charAt(0).toUpperCase() || 'V'

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
  const [ownProfile, following, followers] = await Promise.all([
    apiService.getMyProfile(),
    apiService.getMyFollowing(),
    apiService.getMyFollowers(),
  ])
  myUserId.value = ownProfile.id
  followingIds.value = new Set(following.map((item) => item.id))
  followersCount.value = followers.length
  if (tab.value === 'following') {
    listUsers.value = following
  } else if (tab.value === 'followers') {
    listUsers.value = followers
  }
}

const loadListTab = async (mode: 'followers' | 'following') => {
  loading.value = true
  error.value = null

  try {
    listUsers.value = mode === 'followers' ? await apiService.getMyFollowers() : await apiService.getMyFollowing()
    if (mode === 'followers') {
      followersCount.value = listUsers.value.length
    }
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
  width: min(1180px, 92vw);
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

.community-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  margin-bottom: 1rem;
  border: 1px solid rgba(167, 179, 235, 0.16);
  border-radius: 28px;
  padding: 1.45rem;
  background:
    radial-gradient(circle at 14% 0%, rgba(125, 77, 255, 0.2), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
    rgba(8, 12, 27, 0.86);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
}

.eyebrow {
  color: #91a4d4;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.community-hero h3 {
  margin: 0.25rem 0;
  color: #f5f7ff;
  font-size: clamp(1.7rem, 4vw, 2.7rem);
}

.community-hero p {
  max-width: 620px;
  margin: 0;
  color: #aebdf0;
}

.community-stats {
  display: flex;
  gap: 0.7rem;
}

.stat-chip {
  min-width: 7rem;
  border-radius: 18px;
  padding: 0.85rem;
  background: rgba(255, 255, 255, 0.055);
}

.stat-chip strong {
  display: block;
  color: #f7f9ff;
  font-size: 1.35rem;
}

.stat-chip span {
  color: #91a4d4;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.hub-panel {
  border: 1px solid rgba(167, 179, 235, 0.16);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.022)),
    rgba(8, 12, 27, 0.82);
  border-radius: 28px;
  padding: 1.2rem;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.24);
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.tab-btn {
  border: 1px solid rgba(167, 179, 235, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.045);
  color: #d6defd;
  font-weight: 600;
  padding: 0.8rem;
  cursor: pointer;
  text-align: left;
}

.tab-btn span,
.tab-btn small {
  display: block;
}

.tab-btn small {
  margin-top: 0.2rem;
  color: #91a4d4;
  font-size: 0.76rem;
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(125, 77, 255, 0.78), rgba(59, 125, 255, 0.56));
  border-color: transparent;
  color: #fff;
}

.tab-btn.active small {
  color: rgba(255, 255, 255, 0.76);
}

.search-card {
  display: grid;
  grid-template-columns: minmax(240px, 0.55fr) minmax(0, 1fr);
  align-items: end;
  gap: 1rem;
  margin-bottom: 1rem;
  border-radius: 22px;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
}

.search-card h3 {
  margin: 0 0 0.25rem;
  color: #f3f7ff;
}

.search-card p {
  margin: 0;
  color: #91a4d4;
}

.search-row {
  display: flex;
  gap: 0.6rem;
}

.search-input {
  flex: 1;
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 16px;
  padding: 0.86rem 1rem;
  background: rgba(7, 11, 24, 0.72);
  color: #eff3ff;
}

.search-btn {
  border: none;
  border-radius: 16px;
  padding: 0.86rem 1.2rem;
  background: linear-gradient(135deg, #7d4dff, #3f7cff);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.list-grid {
  display: grid;
  gap: 0.7rem;
}

.user-card {
  border: 1px solid rgba(167, 179, 235, 0.15);
  border-radius: 20px;
  padding: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  background: rgba(255, 255, 255, 0.045);
}

.user-main {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.user-avatar {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 16px;
  background: linear-gradient(135deg, #7d4dff, #20b8ff);
  color: #fff;
  font-weight: 900;
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.open-btn {
  border: none;
  border-radius: 999px;
  background: rgba(125, 77, 255, 0.9);
  color: #fff;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
}

.follow-btn {
  border: 1px solid rgba(167, 179, 235, 0.35);
  border-radius: 999px;
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

.empty-state {
  display: grid;
  place-items: center;
  min-height: 12rem;
  border: 1px dashed rgba(167, 179, 235, 0.2);
  border-radius: 22px;
  padding: 1.5rem;
  color: #a8b5de;
  text-align: center;
}

.empty-state span {
  color: #f3f7ff;
  font-size: 2rem;
  font-weight: 900;
}

.empty-state h3 {
  margin: 0.4rem 0 0.2rem;
  color: #f3f7ff;
}

.empty-state p {
  max-width: 420px;
  margin: 0;
}

@media (max-width: 740px) {
  .community-hero,
  .search-card,
  .user-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-hero {
    display: flex;
  }

  .community-stats,
  .actions-inline {
    width: 100%;
  }

  .tabs,
  .search-card {
    grid-template-columns: 1fr;
  }

  .search-row {
    flex-direction: column;
  }
}
</style>
