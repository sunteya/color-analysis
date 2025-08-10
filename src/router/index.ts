import { createRouter, createWebHistory } from 'vue-router'
import ColorPlotView from '../pages/ColorPlotView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ColorPlotView,
    },
  ],
})

export default router


