<template>
  <div class="w-screen h-screen flex justify-center items-center">
    <Button @click="register"> Register </Button>
  </div>
</template>

<script setup lang="ts">
import api from '@/lib/api';

async function register() {
  await api.signup.post({
    email: 'alice@example.com',
    username: 'alice',
    password: 'secret',
  });
}
</script>
