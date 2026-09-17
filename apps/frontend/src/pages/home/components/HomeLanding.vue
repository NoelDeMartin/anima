<template>
  <Button @click="$emit('login')" class="w-full">
    {{ $t('home.logIn') }}
  </Button>
  <Button v-if="env('VITE_MANAGED_POD')" variant="secondary" route="register" class="w-full">
    {{ $t('home.register') }}
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

<script setup lang="ts">
import { env } from '@aerogel/core';

defineEmits<{ login: [] }>();
</script>
