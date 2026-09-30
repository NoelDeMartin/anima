<template>
  <Details
    v-if="streaming || part.text.trim()"
    class="mb-1"
    summary-class="text-xs py-1.5 bg-gray-100 hover:bg-gray-200 ml-0"
    content-class="pl-0 pt-1"
  >
    <template #label>
      <span>{{ streaming ? $t('chat.reasoning.streaming') : $t('chat.reasoning.done') }}</span>
    </template>
    <Markdown :text="part.text" class="text-sm text-gray-500 border-l-2 border-gray-200 pl-3 max-w-full" />
  </Details>
</template>

<script setup lang="ts">
import type { ReasoningUIPart } from 'ai';
import { computed } from 'vue';

const { part } = defineProps<{ part: ReasoningUIPart }>();
const streaming = computed(() => part.state === 'streaming');
</script>
