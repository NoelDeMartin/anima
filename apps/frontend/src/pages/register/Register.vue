<template>
  <main class="flex flex-col justify-center items-center w-full min-h-screen relative overflow-hidden bg-primary">
    <div class="relative z-10 flex flex-col justify-center items-center w-full">
      <h1 class="text-7xl font-bold tracking-tight text-white leading-tight">
        <RouterLink to="/">{{ $t('home.title') }}</RouterLink>
      </h1>
      <div class="flex flex-col items-center max-w-75 w-full gap-2 mt-4 bg-white p-6 rounded-2xl">
        <h2 class="text-2xl font-bold tracking-tight text-gray-900 leading-tight">Sign up</h2>
        <Form :form @submit="submit" class="flex flex-col items-center max-w-75 w-full gap-2 mt-4 bg-white rounded-2xl">
          <Input
            name="email"
            type="email"
            :label="$t('home.email')"
            label-class="sr-only"
            :placeholder="$t('home.email')"
            class="w-full"
          />
          <Input
            name="username"
            :label="$t('home.username')"
            label-class="sr-only"
            :placeholder="$t('home.username')"
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
          <div v-if="$anima.native" class="flex w-full gap-2 items-center">
            <Input
              name="storageRoot"
              :label="$t('home.storageRoot')"
              label-class="sr-only"
              :placeholder="$t('home.storageRootPlaceholder')"
              class="w-full flex-1"
            />
            <Button type="button" variant="secondary" class="shrink-0" :disabled="pickingFolder" @click="pickFolder">
              {{ $t('home.browse') }}
            </Button>
          </div>
          <p v-if="errorMessage" class="text-xs text-red-500 text-center">
            {{ errorMessage }}
          </p>
          <Button submit class="w-full mt-4" :disabled="loading">
            {{ $t('home.register') }}
          </Button>
        </Form>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Errors, env, requiredStringInput, stringInput, useForm } from '@aerogel/core';
import { translate } from '@aerogel/core';
import { Router } from '@aerogel/plugin-routing';
import { Solid } from '@aerogel/plugin-solid';
import { ref } from 'vue';

import api from '@/lib/api';
import AI from '@/services/AI';
import Anima from '@/services/Anima';
import { chatRoute } from '@/utils/chats';

const form = useForm({
  email: requiredStringInput(),
  username: requiredStringInput(),
  password: requiredStringInput(),
  storageRoot: stringInput(),
});

const pickingFolder = ref(false);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

async function pickFolder() {
  try {
    pickingFolder.value = true;
    const { data, error } = await api.native['pick-folder'].post();

    if (error) {
      errorMessage.value = error.value?.message ?? translate('home.registerFailed');

      return;
    }

    if (data?.path) {
      form.storageRoot = data.path;
    }
  } catch (error) {
    Errors.report(error);
  } finally {
    pickingFolder.value = false;
  }
}

async function submit() {
  try {
    loading.value = true;
    errorMessage.value = null;
    const { error } = await api.signup.post({
      email: form.email,
      username: form.username,
      password: form.password,
      storageRoot: Anima.native && form.storageRoot ? form.storageRoot : undefined,
    });

    if (error) {
      errorMessage.value = error.value?.message ?? translate('home.registerFailed');

      return;
    }

    await Solid.login(env('VITE_BACKEND_URL'), {
      skipProfile: true,
      authenticator: 'anima-managed',
      extra: { email: form.email, password: form.password },
    });

    await Router.push(AI.chatsList[0] ? chatRoute(AI.chatsList[0].url) : { name: 'chats.index' });
  } catch (error) {
    Errors.report(error);
    errorMessage.value = translate('home.registerFailed');
  } finally {
    loading.value = false;
  }
}
</script>
