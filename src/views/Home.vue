<template>
  <div class="home">
    <!-- <img alt="Vue logo" src="../assets/logo.png"> -->
    <div id="nav">
      <router-link :to="{ name: 'monitor' }">Монитор</router-link> |
      <router-link :to="{ name: 'operator' }">Оператор</router-link> |
      <router-link :to="{ name: 'terminal' }">Терминал</router-link>
    </div>
  </div>
</template>

<script>
// @ is an alias to /src

export default {
  name: 'Home',
}
</script>

<style>
  #nav {
    text-align: center;
    padding: 1em;
  }
</style>