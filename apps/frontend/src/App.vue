<template>
  <main class="flex flex-col gap-8 p-8 h-screen w-screen items-center justify-center">
    <div v-if="pong" class="relative size-40 rounded-full bg-green-500">
      <div class="absolute inset-0 size-40 rounded-full bg-green-500 animate-ping" />
    </div>
    <div v-else-if="pong === null" class="size-40 rounded-full bg-gray-500" />
    <div v-else class="size-40 rounded-full bg-red-500" />
  </main>
</template>

<script setup lang="ts">
import api from '@/lib/api';
import { onMounted, ref } from 'vue';

const pong = ref<boolean | null>(null);

onMounted(async () => {
  const { data } = await api.ping.get();

  pong.value = !!data?.pong;
});
</script>
