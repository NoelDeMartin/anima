<template>
  <Form :form @submit="submit" class="flex flex-col gap-2 w-full">
    <Input
      name="email"
      type="email"
      :label="$t('home.email')"
      label-class="sr-only"
      :placeholder="$t('home.email')"
      class="w-full"
    />
    <Input
      name="password"
      type="password"
      :label="$t('home.password')"
      label-class="sr-only"
      :placeholder="$t('home.password')"
      class="w-full"
    />
    <p v-if="errorMessage" class="text-xs text-red-500 text-center">
      {{ errorMessage }}
    </p>
    <Button submit :disabled="loading" class="w-full">
      {{ $t('home.logIn') }}
    </Button>
    <div class="flex flex-col">
      <Button variant="link" @click="$emit('loginExternal')" class="w-full">
        {{ $t('home.logInExternal') }}
      </Button>
      <Button variant="link" @click="$emit('cancel')" class="w-full">
        {{ $t('home.logInCancel') }}
      </Button>
    </div>
  </Form>
</template>

<script setup lang="ts">
import { env, requiredStringInput, useForm } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { Solid } from '@aerogel/plugin-solid';
import { ref } from 'vue';

import AI from '@/services/AI';
import { chatRoute } from '@/utils/chats';

defineEmits<{ loginExternal: []; cancel: [] }>();

const loading = ref(false);
const errorMessage = ref<string | null>(null);
const form = useForm({
  email: requiredStringInput(''),
  password: requiredStringInput(''),
});

async function submit() {
  try {
    loading.value = true;
    errorMessage.value = null;

    await Solid.login(env('VITE_BACKEND_URL'), {
      skipProfile: true,
      authenticator: 'anima-managed',
      extra: { email: form.email, password: form.password },
    });

    await Router.push(AI.chatsList[0] ? chatRoute(AI.chatsList[0].url) : { name: 'chats.index' });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>
