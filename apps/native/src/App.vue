<template>
  <main class="flex flex-col gap-8 p-8 h-screen w-screen items-center justify-center">
    <p v-if="errorMessage" class="text-red-500">
      {{ errorMessage }}
    </p>
    <button type="button" class="size-40 rounded-full bg-gray-500 text-white" @click="toggle()">
      {{ loading ? 'Loading...' : serverProcess ? 'Stop Server' : 'Start Server' }}
    </button>
  </main>
</template>

<script setup lang="ts">
import { Command, type Child } from '@tauri-apps/plugin-shell';
import { ref } from 'vue';

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const serverProcess = ref<Child | null>(null);

async function startServer() {
  serverProcess.value = await Command.sidecar('binaries/backend').spawn();
}

async function stopServer() {
  await serverProcess.value?.kill();

  serverProcess.value = null;
}

async function toggle() {
  loading.value = true;
  errorMessage.value = null;

  try {
    await (serverProcess.value ? stopServer() : startServer());
  } catch (error) {
    console.error(error);

    errorMessage.value = error instanceof Error ? error.message : 'Something went wrong';
  } finally {
    loading.value = false;
  }
}
</script>
