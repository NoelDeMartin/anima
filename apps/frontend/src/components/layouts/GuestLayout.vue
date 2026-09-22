<template>
  <main class="flex flex-col justify-center items-center w-full min-h-screen relative overflow-hidden bg-primary-50">
    <div class="relative z-10 flex flex-col justify-center items-center w-full">
      <h1>
        <span class="sr-only">
          {{ $t('app.name') }}
        </span>
        <i-app-anima-logo class="block h-32 w-72" />
      </h1>
      <div
        class="text-xs whitespace-nowrap font-medium tracking-wide text-pink-500 border border-pink-200 bg-white rounded-full px-4 py-1.5 mb-6 uppercase"
      >
        {{ $t('home.workInProgress') }}
      </div>
      <div class="flex flex-col items-center max-w-75 w-full gap-2">
        <slot />
      </div>
    </div>
  </main>
</template>
