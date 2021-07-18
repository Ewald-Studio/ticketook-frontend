import Vue from 'vue'
import VueRouter from 'vue-router'

import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/monitor/:zone_id',
    name: 'monitor',
    props: true,
    component: () => import(/* webpackChunkName: "monitor" */ '../views/Monitor.vue')
  },
  {
    path: '/operator',
    name: 'operator',
    component: () => import(/* webpackChunkName: "about" */ '../views/Operator.vue')
  },
  {
    path: '/terminal',
    name: 'terminal',
    component: () => import(/* webpackChunkName: "terminal" */ '../views/Terminal.vue')
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
