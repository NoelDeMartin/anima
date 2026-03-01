<template>
  <AppLayout>
    <template v-if="$auth.isLoggedIn()">
      <AppSettings />
      <Home />
    </template>
    <Landing v-else />
  </AppLayout>
</template>
