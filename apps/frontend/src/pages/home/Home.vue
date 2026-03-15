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
      <div class="flex flex-col items-center max-w-[300px] w-full gap-2 mt-4 bg-white p-6 rounded-2xl">
        <template v-if="loggingIn">
          <SolidLogin layout="vertical" class="w-full" />
          <Button variant="link" @click="loggingIn = false" class="w-full">
            {{ $t('home.logInCancel') }}
          </Button>
        </template>
        <template v-else>
          <Button @click="loggingIn = true" class="w-full">
            {{ $t('home.logInWithSolid') }}
          </Button>
          <Button variant="secondary" href="https://noeldemartin.com/tasks/raising-an-agent" class="w-full">
            <i-heroicons-information-circle class="size-5 mr-1" />
            <span>{{ $t('home.learnMore') }}</span>
          </Button>
          <Button variant="secondary" href="https://github.com/noeldemartin/anima" class="w-full">
            <i-simple-icons-github class="size-4 mr-1" />
            <span>{{ $t('home.sourceCode') }}</span>
          </Button>
        </template>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const loggingIn = ref(false);
</script>
