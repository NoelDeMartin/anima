<template>
  <GuestLayout>
    <HomeManagedLogin
      v-if="loggingIn === 'managed'"
      @login-external="loggingIn = 'external'"
      @cancel="loggingIn = false"
    />
    <HomeExternalLogin v-else-if="loggingIn === 'external'" @cancel="loggingIn = false" />
    <HomeLanding v-else @login="loggingIn = env('VITE_MANAGED_POD') ? 'managed' : 'external'" />
  </GuestLayout>
</template>

<script setup lang="ts">
import { env } from '@aerogel/core';
import { ref } from 'vue';

const loggingIn = ref<'managed' | 'external' | false>(false);
</script>
