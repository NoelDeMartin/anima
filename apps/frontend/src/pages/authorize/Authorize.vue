<template>
  <GuestLayout>
    <p v-if="state === 'loading'" class="text-sm text-gray-500">{{ $t('authorize.loading') }}</p>
    <template v-else-if="state === 'error'">
      <p class="text-sm text-red-500 text-center">{{ errorMessage }}</p>
      <Button variant="link" route="home" class="w-full text-center">
        {{ $t('authorize.goHome') }}
      </Button>
    </template>
    <template v-else>
      <div class="flex flex-col items-center gap-2 text-center mb-2">
        <img v-if="client?.logoUrl" :src="client.logoUrl" alt="" class="size-12 rounded" />
        <p class="text-sm text-gray-700">
          <a
            v-if="client?.url"
            :href="client.url"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold underline"
            >{{ clientName }}</a
          >
          <strong v-else>{{ clientName }}</strong>
          {{ $t('authorize.request') }}
        </p>
        <p v-if="client?.id" class="text-xs text-gray-500 break-all">{{ client.id }}</p>
      </div>
      <Form v-if="state === 'login'" :form @submit="submitLogin" class="flex flex-col gap-2 w-full">
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
        <p v-if="errorMessage" class="text-xs text-red-500 text-center">{{ errorMessage }}</p>
        <Button submit :disabled="submitting" class="w-full">
          {{ $t('authorize.logIn') }}
        </Button>
        <Button variant="link" :disabled="submitting" class="w-full" @click="submitChoice('cancel')">
          {{ $t('ui.cancel') }}
        </Button>
      </Form>
      <div v-else class="flex flex-col gap-2 w-full">
        <p v-if="errorMessage" class="text-xs text-red-500 text-center">{{ errorMessage }}</p>
        <Button :disabled="submitting" class="w-full" @click="submitChoice('consent')">
          {{ $t('authorize.allow') }}
        </Button>
        <Button variant="secondary" :disabled="submitting" class="w-full" @click="submitChoice('cancel')">
          {{ $t('authorize.deny') }}
        </Button>
      </div>
    </template>
  </GuestLayout>
</template>

<script setup lang="ts">
import { env, translate, useForm } from '@aerogel/core';
import { Solid } from '@aerogel/plugin-solid';
import { computed, onMounted, ref } from 'vue';
import { z } from 'zod';

import api from '@/lib/api';

type AuthorizationDetails = NonNullable<Awaited<ReturnType<typeof api.pod.authorize.get>>['data']>;

const state = ref<'loading' | 'login' | 'consent' | 'error'>('loading');
const client = ref<AuthorizationDetails['client'] | null>(null);
const submitting = ref(false);
const errorMessage = ref<string | null>(null);
const clientName = computed(() => client.value?.name ?? client.value?.id ?? translate('authorize.unknownApp'));
const form = useForm({
  email: z.string(),
  password: z.string(),
});

function errorMessageFrom(error: { value: unknown } | null): string {
  const value = error?.value as { message?: string } | string | undefined;

  return (
    (typeof value === 'object' && value?.message) ||
    (typeof value === 'string' && value) ||
    translate('authorize.unknownError')
  );
}

function showError(error: { value: unknown } | null) {
  errorMessage.value = errorMessageFrom(error);

  if (state.value === 'loading') {
    state.value = 'error';
  }
}

async function continueAuthorization(step: 'login' | 'consent' | 'cancel') {
  const { data, error } = await {
    login: () => api.pod.authorize.login.post(),
    consent: () => api.pod.authorize.consent.post(),
    cancel: () => api.pod.authorize.cancel.post(),
  }[step]();

  if (data) {
    window.location.assign(data.location);

    return;
  }

  submitting.value = false;

  if (error?.status === 401) {
    state.value = 'login';

    return;
  }

  showError(error);
}

async function submitChoice(choice: 'consent' | 'cancel') {
  submitting.value = true;
  errorMessage.value = null;

  await continueAuthorization(choice);
}

async function load() {
  state.value = 'loading';

  const { data, error } = await api.pod.authorize.get();

  if (error || !data) {
    showError(error);

    return;
  }

  client.value = data.client;

  if (!data.loggedIn) {
    state.value = 'login';

    return;
  }

  if (data.prompt === 'login') {
    await continueAuthorization('login');

    return;
  }

  state.value = 'consent';
}

async function submitLogin() {
  try {
    submitting.value = true;
    errorMessage.value = null;

    await Solid.login(env('VITE_BACKEND_URL'), {
      skipProfile: true,
      authenticator: 'anima-managed',
      extra: { email: form.email, password: form.password },
    });

    await load();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : translate('authorize.loginFailed');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => load());
</script>
