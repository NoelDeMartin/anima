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
  </aside>
</template>
