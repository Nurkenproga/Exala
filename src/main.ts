import './assets/main.css'
import 'leaflet/dist/leaflet.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useWalletStore } from './stores/wallet'
import { useAuthStore } from './stores/auth'
import { useNftTasksStore } from './stores/nftTasks'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

const walletStore = useWalletStore()
walletStore.init()
const authStore = useAuthStore()
authStore.init()
const nftTasksStore = useNftTasksStore()
nftTasksStore.init()
