<template>
  <div class="flex grow isolate">
    <ChatSettings />
    <ChatSideBar />
    <div class="flex flex-col grow h-screen overflow-hidden">
      <header>
        <div class="mx-auto w-full max-w-6xl px-8 py-4 flex flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            @click="$ai.sidebar = !$ai.sidebar"
            :title="$t('sidebar.toggle')"
            class="md:hidden"
          >
            <i-tabler-layout-sidebar-filled class="size-6" />
            <span class="sr-only">{{ $t('sidebar.toggle') }}</span>
          </Button>
          <h1 class="font-bold tracking-tight leading-tight text-primary text-2xl">Ànima</h1>
        </div>
      </header>
      <ChatConversation :chat />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnimaChat } from '@anima/core';

defineProps<{ chat?: AnimaChat }>();
</script>
