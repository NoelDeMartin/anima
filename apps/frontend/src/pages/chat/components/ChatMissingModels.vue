<script setup lang="ts">
import { SettingsModal } from '@aerogel/core';
</script>

<template>
  <div
    class="px-8 w-full h-(--textarea-height) flex flex-col gap-4 items-center justify-center bg-gray-100 rounded-lg shrink-0"
  >
    <p class="text-gray-500">{{ $t('chat.missingModels') }}</p>
    <Button @click="$ui.modal(SettingsModal)">{{ $t('chat.configureModels') }}</Button>
  </div>
</template>
