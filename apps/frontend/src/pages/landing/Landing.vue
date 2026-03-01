<template>
  <main class="flex flex-col gap-8 p-8 h-screen w-screen items-center justify-center">
    <h1>Welcome to Ànima</h1>
    <SolidLogin v-if="env('VITE_SPA_MODE')" />
    <i-svg-spinners-180-ring v-else-if="$auth.loading" class="size-10" />
    <Form v-else :form @submit="$auth.login(form.loginUrl)" class="flex gap-2">
      <Input name="loginUrl" aria-label="Login URL" />
      <Button submit>Login</Button>
      <Button v-if="$app.development" @click="devLogin">Dev Login</Button>
    </Form>
  </main>
</template>

<script setup lang="ts">
import { env } from '@/lib/env';
import Auth from '@/services/Auth';
import { requiredStringInput, useForm } from '@aerogel/core';

const form = useForm({ loginUrl: requiredStringInput() });

async function devLogin() {
  await Auth.login('http://localhost:3000');
}
</script>
