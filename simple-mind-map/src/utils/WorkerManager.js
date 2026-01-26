// WorkerManager.js
// 管理 Web Worker 的创建和通信，用于处理耗时的数据操作

class WorkerManager {
  constructor() {
    this.worker = null
    this.callbacks = new Map() // 存储回调 id -> resolve/reject
    this.idCounter = 0
    // 支持通过全局配置指定 Worker URL
    this.workerUrl = null
    this.initWorker()
  }

  // 获取 Worker 文件的 URL
  getWorkerUrl() {
    // 0. 如果通过 setWorkerUrl 显式指定，优先使用
    if (this.workerUrl) {
      return this.workerUrl
    }

    // 1. 优先使用全局配置的 Worker URL（允许用户自定义）
    if (typeof window !== 'undefined' && window.simpleMindMapWorkerUrl) {
      return window.simpleMindMapWorkerUrl
    }

    // 1.1 优先使用外部 publicPath（适配 window.externalPublicPath）
    if (typeof window !== 'undefined' && window.externalPublicPath) {
      try {
        const baseUrl = new URL(window.externalPublicPath, window.location.href)
        return new URL('traversalWorker.js', baseUrl)
      } catch {
        // externalPublicPath 不可用，继续尝试其他方式
      }
    }

    // 2. 如果可用，尝试使用 document.baseURI 作为基础路径
    if (typeof document !== 'undefined' && document.baseURI) {
      try {
        return new URL('./traversalWorker.js', document.baseURI)
      } catch {
        // baseURI 不可用，继续尝试其他方式
      }
    }

    // 2. 如果支持 import.meta.url（ES 模块环境，如 Vite、原生 ES 模块），使用它
    // 注意：在 Webpack 构建环境中，import.meta 可能不被支持，这里使用 try-catch 包裹
    try {
      // 使用 Function 构造函数来动态访问 import.meta，避免 Webpack 静态分析
      const checkAndGetMetaUrl = new Function(`
        try {
          // 通过全局变量注入 import.meta.url（如果宿主环境提供）
          // 例如：window.__smmImportMetaUrl = import.meta.url
          if (typeof __smmImportMetaUrl !== "undefined") {
            return __smmImportMetaUrl
          }
          if (typeof __import_meta_url__ !== "undefined") {
            return __import_meta_url__
          }
          return null
        } catch {
          return null
        }
      `)
      const metaUrl = checkAndGetMetaUrl()
      if (metaUrl) {
        return new URL('./traversalWorker.js', metaUrl)
      }
    } catch {
      // import.meta.url 不可用，继续尝试其他方式
    }

    // 3. 尝试使用当前脚本的 src 作为基础路径（适用于直接引入库文件的场景）
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      try {
        const scriptUrl = new URL(document.currentScript.src, window.location.href)
        let workerUrl = new URL('traversalWorker.js', scriptUrl.href)
        if (scriptUrl.pathname.includes('/js/')) {
          workerUrl = new URL('../traversalWorker.js', scriptUrl.href)
        }
        return workerUrl
      } catch {
        // currentScript 不可用，继续尝试其他方式
      }
    }

    // 3. 尝试通过 script 标签找到库文件路径，然后推断 Worker 文件路径
    // 适用于 UMD 构建，Worker 文件在 dist/traversalWorker.js
    if (typeof document !== 'undefined') {
      const scripts = document.getElementsByTagName('script')
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src
        if (src && (src.includes('simpleMindMap') || src.includes('simple-mind-map'))) {
          try {
            // 获取脚本的基础 URL
            const scriptUrl = new URL(src, window.location.href)
            // 尝试同级目录 (dist/js/traversalWorker.js)
            let workerUrl = new URL('traversalWorker.js', scriptUrl.href)
            
            // 如果脚本在 js/ 目录下，可能需要向上查找 (dist/traversalWorker.js)
            // 这是一个简单的启发式检测
            if (scriptUrl.pathname.includes('/js/')) {
               workerUrl = new URL('../traversalWorker.js', scriptUrl.href)
            }
            return workerUrl
          } catch (e) {
            // URL 构造失败，继续尝试下一个脚本
            continue
          }
        }
      }
    }

    // 4. 如果都不行，返回 null（将使用主线程降级方案）
    return null
  }

  initWorker() {
    // 检查是否支持 Worker
    if (typeof Worker === 'undefined') {
      this.worker = null
      return
    }

    try {
      const workerUrl = this.getWorkerUrl()
      
      if (!workerUrl) {
        // 无法确定 Worker URL，禁用 Worker
        this.worker = null
        // 在开发环境输出调试信息（如果支持）
        try {
          // eslint-disable-next-line no-undef
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.debug('WorkerManager: Cannot determine worker URL, will use main thread fallback')
          }
        } catch {
          // process 不可用，忽略
        }
        return
      }

      this.prepareWorker(workerUrl)

      if (this.worker) {
        this.worker.onmessage = (e) => {
          const { id, result, error } = e.data
          if (this.callbacks.has(id)) {
            const { resolve, reject } = this.callbacks.get(id)
            if (error) {
              reject(error)
            } else {
              resolve(result)
            }
            this.callbacks.delete(id)
          }
        }

        this.worker.onerror = () => {
          console.error('Worker Error')
          // Worker 出错时，禁用 Worker 以便后续使用主线程降级
          this.worker = null
        }
      }
    } catch (error) {
      // Worker 初始化失败，将降级到主线程执行
      this.worker = null
      // 在开发环境输出警告（如果支持）
      try {
        // eslint-disable-next-line no-undef
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Web Worker 初始化失败，将降级到主线程执行:', error.message)
        }
      } catch {
        // process 不可用，忽略
      }
    }
  }

  // 预检查 Worker URL 并创建 Worker
  async prepareWorker(workerUrl) {
    const canUseWorker = await this.isWorkerUrlAvailable(workerUrl)
    if (!canUseWorker) {
      this.worker = null
      return
    }

    // 创建 Worker
    this.worker = new Worker(workerUrl, { type: 'module' })

    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data
      if (this.callbacks.has(id)) {
        const { resolve, reject } = this.callbacks.get(id)
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
        this.callbacks.delete(id)
      }
    }

    this.worker.onerror = () => {
      console.error('Worker Error')
      // Worker 出错时，禁用 Worker 以便后续使用主线程降级
      this.worker = null
    }
  }

  // 检查 Worker URL 是否可用，避免加载 HTML 导致 MIME 错误
  async isWorkerUrlAvailable(workerUrl) {
    try {
      const urlString = workerUrl instanceof URL ? workerUrl.toString() : String(workerUrl)

      if (urlString.startsWith('blob:') || urlString.startsWith('data:')) {
        return true
      }

      if (typeof fetch !== 'function') {
        return true
      }

      let res = null
      try {
        res = await fetch(urlString, { method: 'HEAD' })
      } catch {
        res = null
      }

      if (!res || res.status === 405) {
        try {
          res = await fetch(urlString, { method: 'GET', headers: { Range: 'bytes=0-0' } })
        } catch {
          return false
        }
      }

      if (!res || !res.ok) {
        return false
      }

      const contentType = (res.headers && res.headers.get && res.headers.get('content-type')) || ''
      if (!contentType) {
        return true
      }

      const lowerContentType = contentType.toLowerCase()
      if (lowerContentType.includes('text/html')) {
        return false
      }

      return (
        lowerContentType.includes('javascript') ||
        lowerContentType.includes('ecmascript') ||
        lowerContentType.includes('module')
      )
    } catch {
      return false
    }
  }

  // 设置 Worker URL（允许用户自定义）
  setWorkerUrl(url) {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.workerUrl = url
    this.initWorker()
  }

  // 发送任务到 Worker
  postTask(type, data, param) {
    if (!this.worker) {
      // 降级处理：如果在不支持 Worker 的环境中，或者 Worker 初始化失败
      console.debug('WorkerManager: Worker not available, operations will fallback to main thread')
      return Promise.reject(new Error('Worker not available'))
    }

    return new Promise((resolve, reject) => {
      const id = this.idCounter++
      this.callbacks.set(id, { resolve, reject })

      // 注意：发送给 Worker 的数据必须是可序列化的 (Structured Clone Algorithm)
      // 这里的 data 通常是 node.nodeData (纯数据)，而不是 node 实例 (包含 DOM 和方法)
      this.worker.postMessage({
        id,
        type,
        data,
        param
      })
    })
  }

  // 示例：统计节点数
  countNodes(rootData) {
    return this.postTask('COUNT_NODES', rootData)
  }

  // 示例：搜索节点
  searchNodes(rootData, searchText, searchType = 'text') {
    return this.postTask('FILTER_NODES', rootData, { searchText, searchType })
  }

  // 转换为Markdown
  transformToMarkdown(rootData) {
    return this.postTask('TRANSFORM_TO_MARKDOWN', rootData)
  }

  // 转换为Txt
  transformToTxt(rootData) {
    return this.postTask('TRANSFORM_TO_TXT', rootData)
  }

  // 销毁
  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.callbacks.clear()
  }
}

export default new WorkerManager()
