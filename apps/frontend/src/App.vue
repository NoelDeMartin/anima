<template>
  <AppLayout>
    <template v-if="$auth.loggedIn">
      <AppSettings />
      <Home />
    </template>
    <Landing v-else />
  </AppLayout>
</template>
