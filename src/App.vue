<script setup lang="ts">
import { RouterView } from 'vue-router'
import EventsHeader from './components/EventsHeader.vue'
</script>

<template>
  <div id="app">
    <EventsHeader />
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  width: 100%;
}
</style>
