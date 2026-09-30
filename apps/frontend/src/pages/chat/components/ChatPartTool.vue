<template>
  <Details class="mb-1" summary-class="text-xs py-1.5 bg-gray-100 hover:bg-gray-200 ml-0" content-class="pl-0 pt-1">
    <template #label>
      <span>{{ label }}</span>
      <i-material-symbols-error v-if="part.errorText" class="size-4 ml-1 text-red-500" />
    </template>
    <div class="flex flex-col gap-1">
      <span v-if="part.errorText" class="text-xs bg-red-100 rounded-lg px-2.5 py-1.5 overflow-auto text-red-500">
        {{ part.errorText }}
      </span>
      <pre v-if="part.output" class="text-xs bg-gray-100 rounded-lg px-2.5 py-1.5 overflow-auto">{{
        JSON.stringify(part.output, null, 2)
      }}</pre>
    </div>
  </Details>
</template>

<script setup lang="ts">
import type { UIToolInvocation } from 'ai';

defineProps<{ label: string; part: UIToolInvocation<any> }>();
</script>
