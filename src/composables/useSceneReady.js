import { onBeforeUnmount } from 'vue'

export function useSceneReady(emit) {
  let ready = false
  let disposed = false

  onBeforeUnmount(() => {
    disposed = true
  })

  function emitProgress(progress, label) {
    if (!disposed) emit('progress', { progress, label })
  }

  function markReady() {
    if (ready || disposed) return
    ready = true
    emit('ready')
  }

  function markError(message) {
    if (!disposed) emit('error', message || '场景初始化失败，请刷新重试')
  }

  function isDisposed() {
    return disposed
  }

  return { emitProgress, markReady, markError, isDisposed }
}
