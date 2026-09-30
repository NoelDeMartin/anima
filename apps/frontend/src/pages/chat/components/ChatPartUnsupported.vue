<template>
  <p class="text-red-500">{{ $t('chat.unsupportedPart', { type: part.type }) }}</p>
</template>

<script setup lang="ts">
import type { AnimaUIMessagePart } from '@anima/core';

defineProps<{ part: AnimaUIMessagePart }>();
</script>
