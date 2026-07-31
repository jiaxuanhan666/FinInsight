import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/variables.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Route guard: redirect to login if not initialized
router.beforeEach(async (to, _from, next) => {
  if (to.name === 'login') {
    next()
    return
  }
  // Check if user UUID exists
  const uuid = localStorage.getItem('fininsight_uuid')
  if (!uuid) {
    next('/login')
    return
  }
  next()
})

app.mount('#app')
