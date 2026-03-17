<template>
  <li class="relative flex items-center gap-2 border-b border-gray-200 px-4 py-2">
    <ProviderTypeIcon :provider-type="provider.type" />
    <Button variant="link" @click="$ui.modal(EditProviderModal, { provider })" class="truncate text-gray-900">
      <span class="absolute inset-0" />
      {{ provider.name }}
    </Button>
  </li>
</template>

<script setup lang="ts">
import EditProviderModal from '@/components/modals/EditProviderModal.vue';
import type { AIProvider } from '@anima/core';
import { stringToStudlyCase } from '@noeldemartin/utils';

defineProps<{ provider: AIProvider }>();
</script>
