import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/record',
      name: 'record',
      component: () => import('../views/RecordView.vue'),
    },
    {
      path: '/balance',
      name: 'balance',
      component: () => import('../views/BalanceSheetView.vue'),
    },
    {
      path: '/report',
      name: 'report',
      component: () => import('../views/ReportView.vue'),
    },
    {
      path: '/savings',
      name: 'savings',
      component: () => import('../views/SavingsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/records',
      name: 'records',
      component: () => import('../views/RecordsView.vue'),
    },
    {
      path: '/reports/history',
      name: 'reports-history',
      component: () => import('../views/HistoryReportsView.vue'),
    },
    {
      path: '/reports/classify/:reportId',
      name: 'reports-classify',
      component: () => import('../views/ClassificationDetailView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboard.vue'),
    },
  ],
})

export default router
