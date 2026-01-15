import exampleData from 'simple-mind-map/example/exampleData'
import { simpleDeepClone } from 'simple-mind-map/src/utils/index'
import { useMainStore } from '@/store'

const SIMPLE_MIND_MAP_DATA = 'SIMPLE_MIND_MAP_DATA'
const SIMPLE_MIND_MAP_CONFIG = 'SIMPLE_MIND_MAP_CONFIG'
const SIMPLE_MIND_MAP_LANG = 'SIMPLE_MIND_MAP_LANG'
const SIMPLE_MIND_MAP_LOCAL_CONFIG = 'SIMPLE_MIND_MAP_LOCAL_CONFIG'

let mindMapData: any = null

// 事件总线（用于替代 Vue.prototype.$bus）
let eventBus: any = null

// 初始化事件总线
export function initEventBus(bus: any) {
  eventBus = bus
}

// 获取缓存的思维导图数据
export const getData = () => {
  // 接管模式
  if ((window as any).takeOverApp) {
    mindMapData = (window as any).takeOverAppMethods.getMindMapData()
    return mindMapData
  }
  // 操作本地文件模式
  const store = useMainStore()
  if (store.isHandleLocalFile) {
    // 注意：如果需要在 Vue 3 中处理本地文件，需要提供替代方案
    // 这里暂时返回 localStorage 数据
    const localData = localStorage.getItem(SIMPLE_MIND_MAP_DATA)
    if (localData === null) {
      return simpleDeepClone(exampleData)
    } else {
      try {
        return JSON.parse(localData)
      } catch (error) {
        return simpleDeepClone(exampleData)
      }
    }
  }
  const localData = localStorage.getItem(SIMPLE_MIND_MAP_DATA)
  if (localData === null) {
    return simpleDeepClone(exampleData)
  } else {
    try {
      return JSON.parse(localData)
    } catch (error) {
      return simpleDeepClone(exampleData)
    }
  }
}

// 存储思维导图数据
export const storeData = (data: any) => {
  try {
    let originData: any = null
    if ((window as any).takeOverApp) {
      originData = mindMapData
    } else {
      originData = getData()
    }
    if (!originData) {
      originData = {}
    }
    originData = {
      ...originData,
      ...data
    }
    if ((window as any).takeOverApp) {
      mindMapData = originData
      ;(window as any).takeOverAppMethods.saveMindMapData(originData)
      return
    }
    // 使用事件总线替代 Vue.prototype.$bus
    if (eventBus) {
      eventBus.emit('write_local_file', originData)
    }
    const store = useMainStore()
    if (store.isHandleLocalFile) {
      return
    }
    localStorage.setItem(SIMPLE_MIND_MAP_DATA, JSON.stringify(originData))
  } catch (error) {
    console.log(error)
    if (eventBus) {
      eventBus.emit('localStorageExceeded')
    }
  }
}

// 获取思维导图配置数据
export const getConfig = () => {
  if ((window as any).takeOverApp) {
    return (window as any).takeOverAppMethods.getMindMapConfig()
  }
  const config = localStorage.getItem(SIMPLE_MIND_MAP_CONFIG)
  if (config) {
    return JSON.parse(config)
  }
  return null
}

// 存储思维导图配置数据
export const storeConfig = (config: any) => {
  try {
    if ((window as any).takeOverApp) {
      ;(window as any).takeOverAppMethods.saveMindMapConfig(config)
      return
    }
    localStorage.setItem(SIMPLE_MIND_MAP_CONFIG, JSON.stringify(config))
  } catch (error) {
    console.log(error)
  }
}

// 存储语言
export const storeLang = (lang: string) => {
  if ((window as any).takeOverApp) {
    ;(window as any).takeOverAppMethods.saveLanguage(lang)
    return
  }
  localStorage.setItem(SIMPLE_MIND_MAP_LANG, lang)
}

// 获取存储的语言
export const getLang = () => {
  if ((window as any).takeOverApp) {
    return (window as any).takeOverAppMethods.getLanguage() || 'zh'
  }
  const lang = localStorage.getItem(SIMPLE_MIND_MAP_LANG)
  if (lang) {
    return lang
  }
  storeLang('zh')
  return 'zh'
}

// 存储本地配置
export const storeLocalConfig = (config: any) => {
  if ((window as any).takeOverApp) {
    return (window as any).takeOverAppMethods.saveLocalConfig(config)
  }
  localStorage.setItem(SIMPLE_MIND_MAP_LOCAL_CONFIG, JSON.stringify(config))
}

// 获取本地配置
export const getLocalConfig = () => {
  if ((window as any).takeOverApp) {
    return (window as any).takeOverAppMethods.getLocalConfig()
  }
  const config = localStorage.getItem(SIMPLE_MIND_MAP_LOCAL_CONFIG)
  if (config) {
    return JSON.parse(config)
  }
  return null
}
