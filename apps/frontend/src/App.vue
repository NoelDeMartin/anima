<template>
  <AppLayout>
    <template v-if="$solid.isLoggedIn()">
      <AppSettings />
      <Home />
    </template>
    <Landing v-else />
  </AppLayout>
</template>
