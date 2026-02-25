import { readonly, ref } from 'vue';

export function useLoading(options: { threshold?: number } = {}) {
  const { threshold = 300 } = options;
  const loading = ref(false);

  async function run<T>(callback: Promise<T> | (() => Promise<T>)) {
    const timeoutId = setTimeout(() => (loading.value = true), threshold);

    try {
      const result = await (typeof callback === 'function' ? callback() : callback);

      return result;
    } finally {
      clearTimeout(timeoutId);
      loading.value = false;
    }
  }

  return { loading: readonly(loading), run };
}
