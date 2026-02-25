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
      path: '/movies',
      name: 'movies',
      component: () => import('../views/MoviesView.vue'),
    },
    {
      path: '/concerts',
      name: 'concerts',
      component: () => import('../views/ConcertsView.vue'),
    },
    {
      path: '/theatre',
      name: 'theatre',
      component: () => import('../views/TheatreView.vue'),
    },
    {
      path: '/standups',
      name: 'standups',
      component: () => import('../views/StandupsView.vue'),
    },
    {
      path: '/nft',
      name: 'nft',
      component: () => import('../views/NFTView.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/EventsView.vue'),
    },
  ],
})

export default router
