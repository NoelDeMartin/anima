<template>
  <AppLayout>
    <div class="flex h-screen flex-row">
      <AppSettings v-if="$solid.isLoggedIn()" />
      <AppSideBar v-if="$solid.isLoggedIn()" />
      <RouterView />
    </div>
  </AppLayout>
</template>
