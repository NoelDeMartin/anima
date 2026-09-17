<template>
  <SolidLogin layout="vertical" class="w-full" />
  <Button variant="link" @click="$emit('cancel')" class="w-full">
    {{ $t('home.logInCancel') }}
  </Button>
</template>

<script setup lang="ts">
defineEmits<{ cancel: [] }>();
</script>
