<template>
  <h2>Model: {{ $auth.model }}</h2>
  <ul>
    <li v-for="(message, index) in $ai.messages" :key="index" class="flex flex-row gap-2">
      [{{ message.author }}]: <Markdown>{{ message.content }}</Markdown>
    </li>
  </ul>
  <Form :form @submit="($ai.sendMessage(form.message), form.reset())">
    <TextArea label="Message" name="message" @keydown.ctrl.enter="form.submit()" />
    <Button submit>Send</Button>
  </Form>
</template>

<script setup lang="ts">
import { requiredStringInput, useForm } from '@aerogel/core';

const form = useForm({ message: requiredStringInput() });
</script>
