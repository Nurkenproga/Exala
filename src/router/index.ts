import { createRouter, createWebHistory } from 'vue-router'
import { authService } from '@/services/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => (authService.isAuthenticated() ? '/movies' : '/register')
    },
    {
      path: '/events',
      redirect: '/movies',
    },
    {
      path: '/events/:type/:id',
      name: 'event-detail',
      component: () => import('../views/EventDetailView.vue'),
    },
    {
      path: '/movies',
      name: 'movies',
      component: () => import('../views/MoviesView.vue'),
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('../views/MapView.vue'),
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
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users/:userId',
      name: 'user-profile',
      component: () => import('../views/UserProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/users/:username/nfts',
      name: 'user-nfts',
      component: () => import('../views/UserNftsView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchView.vue'),
    },
    {
      path: '/community',
      name: 'community',
      component: () => import('../views/SocialHubView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/followers',
      name: 'followers',
      redirect: '/community?tab=followers',
      meta: { requiresAuth: true },
    },
    {
      path: '/following',
      name: 'following',
      redirect: '/community?tab=following',
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
  ],
})

router.beforeEach((to) => {
  const isAuth = authService.isAuthenticated()

  if (!isAuth && authService.getToken()) {
    authService.clearTokens()
  }

  if (to.meta.requiresAuth && !isAuth) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && isAuth && !authService.isAuthDisabled()) {
    return { name: 'movies' }
  }

  return true
})

export default router
