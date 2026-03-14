<template>
  <aside v-if="$solid.isLoggedIn()" class="flex flex-col gap-2 border-r border-gray-200 bg-gray-50 w-64">
    <div class="flex items-center gap-2 px-4 pb-1 pt-3">
      <SolidAvatar class="size-12" />
      <span>{{ $solid.user?.name ?? $t('sidebar.anonymous') }}</span>
      <div class="grow" />
      <Button variant="ghost" @click="$solid.logout()" class="hover:bg-gray-100 -mr-2" :title="$t('sidebar.logout')">
        <i-material-symbols-logout class="size-5" />
        <span class="sr-only">{{ $t('sidebar.logout') }}</span>
      </Button>
    </div>

    <div class="flex flex-col gap-2 flex-1 overflow-y-auto">
      <div class="flex items-center justify-between px-4 py-1">
        <h2 id="recent-chats" class="font-semibold text-gray-500 uppercase tracking-wider">
          {{ $t('sidebar.recentChats') }}
        </h2>
        <Button class="hover:bg-gray-100 -mr-2" variant="ghost" route="chats.index" :title="$t('sidebar.newChat')">
          <i-material-symbols-add class="size-5" />
          <span class="sr-only">{{ $t('sidebar.newChat') }}</span>
        </Button>
      </div>
      <div v-if="$ai.chatsList.length === 0" class="text-sm text-gray-400 italic">{{ $t('sidebar.noChats') }}</div>
      <ul v-else aria-labelledby="recent-chats">
        <li
          v-for="chat in $ai.chatsList"
          :key="chat.url"
          class="relative group flex items-center justify-between text-sm hover:bg-gray-200 transition-colors"
          :class="{ 'bg-gray-200 font-semibold': $ai.selectedChatUrl === chat.url }"
        >
          <RouterLink class="truncate text-left grow px-4 py-2" :to="chatRoute(chat.url)">
            {{ chat.title }}
          </RouterLink>
          <Button
            class="absolute right-2 hidden group-hover:flex group-focus-within:flex text-gray-500 hover:text-gray-900"
            variant="ghost"
            @click="$ui.modal(EditChatModal, { chat })"
            :title="$t('sidebar.edit')"
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
import { chatRoute } from '@/utils/chats';
</script>
