import { createRouter, createWebHistory } from 'vue-router'
import EventsView from '../views/EventsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/events'
    },
    {
      path: '/events',
      name: 'events',
      component: EventsView,
    },
    {
      path: '/nft',
      name: 'nft',
      component: () => import('../views/NFTView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      // TODO: Создать ProfileView компонент
      component: () => import('../views/EventsView.vue'),
    },
  ],
})

export default router
