import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useUserStore } from './stores/user'
import { setAuthUserId } from './services/api'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Keep the API client's x-user-id header in sync with the user store.
// This is the one seam that changes in Stage 4 when LINE login ships.
const userStore = useUserStore()
setAuthUserId(userStore.user?.id ?? null)
watch(
  () => userStore.user?.id ?? null,
  (id) => setAuthUserId(id),
)

app.mount('#app')
