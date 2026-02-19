<template>
  <main class="flex flex-col gap-8 p-8 h-screen w-screen items-center justify-center">
    <AppLogin />
    <AppChat v-if="$auth.user" />
  </main>
</template>
