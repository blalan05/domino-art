import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue') },
    { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { auth: true } },
    { path: '/colors', name: 'colors', component: () => import('@/views/ColorsView.vue'), meta: { auth: true } },
    { path: '/projects/:id', name: 'project', component: () => import('@/views/ProjectView.vue') },
    { path: '/wall/:id?', name: 'wall', component: () => import('@/views/WallPlannerView.vue') },
    { path: '/floor/:id?', name: 'floor', component: () => import('@/views/FloorPlanView.vue') },
    { path: '/share/:token', name: 'share', component: () => import('@/views/ShareView.vue') },
    { path: '/discover', name: 'discover', component: () => import('@/views/DiscoverView.vue') },
    { path: '/@:handle', name: 'artist', component: () => import('@/views/ArtistView.vue') },
    { path: '/preview/:id?', name: 'preview3d', component: () => import('@/views/Preview3DView.vue') },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.user && to.meta.auth) {
    try {
      await auth.bootstrap();
    } catch {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
    if (!auth.user) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }
  }
  return true;
});

export { router };
