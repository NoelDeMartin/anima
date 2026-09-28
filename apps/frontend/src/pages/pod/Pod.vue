<template>
  <GuestLayout>
    <h2 class="text-2xl font-bold tracking-tight text-gray-900 leading-tight">{{ $t('pod.title') }}</h2>
    <p class="text-sm text-gray-700 text-center">{{ $t('pod.description') }}</p>
    <code class="w-full text-xs text-center break-all bg-white border border-gray-200 rounded px-3 py-2">
      {{ podUrl }}
    </code>
    <Button route="home" class="w-full mt-2">
      {{ $t('pod.open') }}
    </Button>
  </GuestLayout>
</template>

<script setup lang="ts">
import { env } from '@aerogel/core';

const podUrl = `${env('VITE_BACKEND_URL')}/pod/`;
</script>
