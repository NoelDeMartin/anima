<template>
  <div class="fixed z-10 top-4 right-4 flex flex-row items-center gap-2">
    <ErrorLogs />
    <Button @click="$ui.modal(SettingsModal)" variant="ghost" size="icon" :title="$t('settings.title')">
      <i-heroicons-cog-6-tooth class="size-6" />
      <span class="sr-only">{{ $t('settings.title') }}</span>
    </Button>
  </div>
</template>

<script setup lang="ts">
import { SettingsModal } from '@aerogel/core';
</script>
