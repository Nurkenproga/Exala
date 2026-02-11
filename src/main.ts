import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useWalletStore } from './stores/wallet'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Инициализируем wallet store для проверки существующего подключения
const walletStore = useWalletStore()
walletStore.init()
