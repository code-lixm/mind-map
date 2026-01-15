import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Edit',
    component: () => import('./pages/Edit/Index.vue')
  },
  {
    path: '/index',
    redirect: '/'
  },
  {
    path: '/doc/zh',
    component: () => import('./pages/Doc.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
