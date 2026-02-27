<template>
  <Details
    :label
    class="mb-1"
    summary-class="text-xs py-1.5 bg-gray-100 hover:bg-gray-200 ml-0"
    content-class="pl-0 pt-0.5"
  >
    <pre class="text-xs bg-gray-100 rounded-lg px-2.5 py-1.5 overflow-auto">{{ JSON.stringify(data, null, 2) }}</pre>
  </Details>
</template>

<script setup lang="ts">
defineProps<{ label: string; data: unknown }>();
</script>
