<template>
  <main>
    <h1>Server Status: {{ serverStatus }}</h1>
    <button @click="toggleServerStatus">Toggle Server Status</button>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import rpc from './lib/rpc';

const serverStatus = ref(false);

async function toggleServerStatus() {
  const status = await rpc().request.toggleServerStatus({});

  serverStatus.value = status ?? false;
}

onMounted(async () => {
  const status = await rpc().request.getServerStatus({});

  serverStatus.value = status ?? false;
});
</script>
