<template>
  <Markdown :text="part.text" class="max-w-full" />
</template>

<script setup lang="ts">
import type { TextUIPart } from 'ai';

defineProps<{ part: TextUIPart }>();
</script>
