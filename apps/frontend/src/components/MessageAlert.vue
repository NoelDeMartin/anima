<template>
  <div
    role="alert"
    class="flex items-start gap-3 px-4 py-3 rounded-lg"
    :class="{
      'bg-yellow-50 text-yellow-800': type === 'warning',
      'bg-blue-50 text-blue-800': type === 'info',
      'bg-red-50 text-red-800': type === 'error',
    }"
  >
    <i-heroicons-exclamation-triangle v-if="type === 'warning'" class="size-5 text-yellow-600 shrink-0 mt-0.5" />
    <i-heroicons-information-circle v-if="type === 'info'" class="size-5 text-blue-600 shrink-0 mt-0.5" />
    <i-heroicons-exclamation-circle v-if="type === 'error'" class="size-5 text-red-600 shrink-0 mt-0.5" />
    <Markdown
      :text
      class="text-sm font-medium"
      :class="{
        'text-yellow-800 [&_a]:text-yellow-600!': type === 'warning',
        'text-blue-800 [&_a]:text-blue-600!': type === 'info',
        'text-red-800 [&_a]:text-red-600!': type === 'error',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { renderVNode } from '@aerogel/core';
import { computed, type VNode } from 'vue';

defineProps<{ type: 'warning' | 'info' | 'error' }>();


const slots = defineSlots<{ default?(): VNode[] }>();
const text = computed(() => slots.default?.().map(renderVNode).join('') ?? '');
</script>
