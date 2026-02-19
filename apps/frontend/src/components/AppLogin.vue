<template>
  <i-svg-spinners-180-ring v-if="$auth.loading" />
  <div v-else class="flex flex-col gap-4 items-center justify-center">
    <h1>Hello, {{ $auth.user ? ($auth.user.name ?? $auth.user.webId) : 'Guest' }}!</h1>

    <Button v-if="$auth.user" type="button" @click="$auth.logout()">Logout</Button>
    <Form :form v-else @submit="$auth.login(form.loginUrl)" class="flex gap-2">
      <Input name="loginUrl" aria-label="Login URL" />
      <Button submit>Login</Button>
    </Form>
  </div>
</template>

<script setup lang="ts">
import { requiredStringInput, useForm } from '@aerogel/core';

const form = useForm({ loginUrl: requiredStringInput() });
</script>
