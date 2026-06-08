<template>
  <div class="user-nfts-view">
    <div class="container">
      <div class="page-header">
        <h2 class="page-title">NFT коллекция</h2>
        <p class="page-subtitle">Пользователь: {{ username }}</p>
      </div>

      <section class="list-card">
        <p v-if="loading" class="status">Загружаем NFT...</p>
        <p v-else-if="error" class="status error">{{ error }}</p>

        <div v-else-if="nfts.length > 0" class="nfts-grid">
          <article v-for="nft in nfts" :key="nft.id" class="nft-card">
            <img
              v-if="nft.image_url"
              :src="nft.image_url"
              :alt="`NFT ${nft.id}`"
              class="nft-image"
            />
            <div v-else class="nft-image placeholder">NFT</div>
            <div class="nft-content">
              <p class="nft-title">NFT #{{ nft.id }}</p>
              <p class="nft-meta">Редкость: {{ nft.rarity }}</p>
              <p class="nft-meta">Статус: {{ nft.mint_status }}</p>
              <p class="nft-meta" v-if="nft.token_id_onchain !== null">Token ID: {{ nft.token_id_onchain }}</p>
            </div>
          </article>
        </div>

        <p v-else class="status">У пользователя пока нет NFT</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiService, type NftListItem } from '@/services/api'

const route = useRoute()
const username = String(route.params.username || '')

const nfts = ref<NftListItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadNfts = async () => {
  if (!username) {
    error.value = 'Некорректный username'
    return
  }

  loading.value = true
  error.value = null

  try {
    nfts.value = await apiService.getUserNfts(username)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить NFT'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadNfts()
})
</script>

<style scoped>
.user-nfts-view {
  min-height: calc(100vh - 80px);
  background: radial-gradient(circle at 8% 0%, rgba(90, 74, 255, 0.25), transparent 32%),
    radial-gradient(circle at 90% 18%, rgba(22, 201, 255, 0.16), transparent 32%),
    linear-gradient(180deg, #0a0f22 0%, #070b19 56%, #060810 100%);
  padding: 2rem 0;
}

.container {
  width: min(1240px, 92vw);
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

.nfts-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.nft-card {
  border: 1px solid rgba(167, 179, 235, 0.22);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(8, 13, 27, 0.8);
}

.nft-image {
  width: 100%;
  height: 170px;
  object-fit: cover;
  display: block;
}

.nft-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d6defd;
  background: rgba(255, 255, 255, 0.03);
}

.nft-content {
  padding: 0.75rem;
}

.nft-title {
  margin: 0;
  color: #eff3ff;
  font-weight: 700;
}

.nft-meta {
  margin: 0.25rem 0 0;
  color: #a8b5de;
  font-size: 0.88rem;
}

.status {
  color: #a8b5de;
}

.status.error {
  color: #ffb4b4;
}
</style>
