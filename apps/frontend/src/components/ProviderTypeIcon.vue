<template>
  <i-simple-icons-ollama v-if="providerType === 'ollama'" class="size-4" />
  <i-simple-icons-google v-else-if="providerType === 'google'" class="size-4" />
  <i-simple-icons-anthropic v-else-if="providerType === 'anthropic'" class="size-4" />
  <i-simple-icons-openai v-else-if="providerType === 'openai'" class="size-4" />
  <i-simple-icons-googlechrome v-else-if="providerType === 'browser' && $browser.name === 'chrome'" class="size-4" />
  <i-simple-icons-microsoftedge v-else-if="providerType === 'browser' && $browser.name === 'edge'" class="size-4" />
  <i-mdi-web v-else-if="providerType === 'browser'" class="size-4" />
  <span v-else class="uppercase">{{ providerType?.[0] }}</span>
</template>

<script setup lang="ts">
import type { ProviderType } from '@anima/core';

defineProps<{ providerType: ProviderType }>();
</script>
