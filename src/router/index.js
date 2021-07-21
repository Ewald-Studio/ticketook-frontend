import Vue from 'vue'
import VueRouter from 'vue-router'

import Home from '../views/Home.vue'
import Monitor from '../views/Monitor.vue'
import Operator from '../views/Operator.vue'
import Terminal from '../views/Terminal.vue'

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
    component: Monitor
  },
  {
    path: '/operator/:zone_id',
    name: 'operator',
    props: true,
    component: Operator
  },
  {
    path: '/terminal/:zone_id',
    name: 'terminal',
    props: true,
    component: Terminal
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
