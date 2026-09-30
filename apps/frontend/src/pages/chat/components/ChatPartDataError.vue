<template>
  <p class="text-red-500">{{ part.data }}</p>
</template>

<script setup lang="ts">
import type { AnimaDataErrorPart } from '@anima/core';

defineProps<{ part: AnimaDataErrorPart }>();
</script>
