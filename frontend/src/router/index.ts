import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import RestaurantPage from '../pages/RestaurantPage.vue'
import CartPage from '../pages/CartPage.vue'
import OrderSuccessPage from '../pages/OrderSuccessPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import ProfilePage from '../pages/ProfilePage.vue'
import OrdersPage from '../pages/OrdersPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomePage },
    { path: '/restaurant/:id', component: RestaurantPage },
    { path: '/cart', component: CartPage },
    { path: '/order/:id', component: OrderSuccessPage },
    { path: '/login', component: LoginPage },
    { path: '/profile', component: ProfilePage },
    { path: '/orders', component: OrdersPage },
  ],
})
