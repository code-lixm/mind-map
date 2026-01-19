import type { EventBus } from '../types'

/**
 * 创建一个简单的事件总线，支持多参数透传
 */
export function createEventBus(): EventBus {
  const all = new Map<string, Array<(...args: any[]) => void>>()

  const bus: EventBus = {
    on(event, handler) {
      const handlers = all.get(event)
      if (handlers) {
        handlers.push(handler)
      }
      else {
        all.set(event, [handler])
      }
    },
    off(event, handler) {
      const handlers = all.get(event)
      if (!handlers)
        return

      const index = handlers.indexOf(handler)
      if (index !== -1)
        handlers.splice(index, 1)

      if (handlers.length === 0)
        all.delete(event)
    },
    emit(event, ...args) {
      const handlers = all.get(event)
      if (!handlers?.length)
        return

      handlers.slice().forEach((handler) => {
        handler(...args)
      })
    },
    all,
  }

  return bus
}
