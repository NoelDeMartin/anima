<template>
  <aside v-if="$solid.isLoggedIn()" class="flex flex-col gap-2 border-r border-gray-200 bg-gray-50 p-4 w-64">
    <div class="flex items-center gap-2">
      <SolidAvatar class="size-12" />
      {{ $solid.user?.name ?? 'Anonymous' }}
      <Button variant="ghost" @click="$solid.logout()" class="hover:bg-gray-100" title="Logout">
        <i-material-symbols-logout class="size-6" />
        <span class="sr-only">Logout</span>
      </Button>
    </div>

    <div class="mt-4 flex flex-col gap-2 flex-1 overflow-y-auto">
      <div class="flex items-center justify-between mb-2">
        <h2 id="recent-chats" class="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Chats</h2>
        <Button class="p-1 h-auto" variant="ghost" @click="$ai.startChat()" title="New Chat">
          <i-material-symbols-add class="size-5" />

          <span class="sr-only">New Chat</span>
        </Button>
      </div>
      <div v-if="$ai.chatsList.length === 0" class="text-sm text-gray-400 italic">No chats yet</div>
      <ul v-else aria-labelledby="recent-chats">
        <li
          v-for="chat in chats"
          :key="chat.id"
          class="group flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors"
          :class="{ 'bg-gray-200 font-semibold': $ai.selectedChatId === chat.id }"
        >
          <button class="truncate text-left grow" @click="$ai.selectChat(chat.id)">
            {{ chat.title }}
          </button>
          <Button
            class="hidden group-hover:flex shrink-0 p-1 h-auto text-gray-500 hover:text-gray-900"
            variant="ghost"
            @click="$ui.modal(EditChatModal, { chat })"
            title="Edit"
          >
            <i-material-symbols-edit class="size-4" />
          </Button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import EditChatModal from '@/components/modals/EditChatModal.vue';
import AI from '@/services/AI';
import { arraySorted } from '@noeldemartin/utils';
import { computed } from 'vue';

const chats = computed(() => arraySorted(AI.chatsList, 'updatedAt', 'desc'));
</script>
