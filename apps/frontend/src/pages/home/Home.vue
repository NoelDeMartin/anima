<template>
  <div class="flex h-screen flex-row">
    <HomeSideBar />
    <HomeChat v-if="$ai.chat" :chat="$ai.chat" />
  </div>
</template>
