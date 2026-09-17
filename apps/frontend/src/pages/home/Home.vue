<template>
  <main class="flex flex-col justify-center items-center w-full min-h-screen relative overflow-hidden bg-primary">
    <div class="relative z-10 flex flex-col justify-center items-center w-full">
      <h1 class="text-7xl font-bold tracking-tight text-white leading-tight">
        {{ $t('home.title') }}
      </h1>
      <div
        class="text-xs whitespace-nowrap font-medium tracking-wide text-pink-500 border border-pink-200 bg-white rounded-full px-4 py-1.5 mb-6 uppercase"
      >
        {{ $t('home.workInProgress') }}
      </div>
      <div class="flex flex-col items-center max-w-75 w-full gap-2 mt-4 bg-white p-6 rounded-2xl">
        <HomeManagedLogin
          v-if="loggingIn === 'managed'"
          @login-external="loggingIn = 'external'"
          @cancel="loggingIn = false"
        />
        <HomeExternalLogin v-else-if="loggingIn === 'external'" @cancel="loggingIn = false" />
        <HomeLanding v-else @login="loggingIn = env('VITE_MANAGED_POD') ? 'managed' : 'external'" />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { env } from '@aerogel/core';
import { ref } from 'vue';

const loggingIn = ref<'managed' | 'external' | false>(false);
</script>
