/**
 * AI 工具类
 * 用于处理 AI 聊天请求
 */

import type {
  AiEndCallback,
  AiErrorCallback,
  AiInitOptions,
  AiOptions,
  AiProgressCallback,
  AiRequestData,
} from './ai.d'

class Ai {
  private options: AiOptions
  private baseData: {
    api?: string
    method?: string
    headers?: {
      Authorization?: string
    }
    data?: {
      model?: string
      stream?: boolean
    }
  } = {}

  private controller: AbortController | null = null
  private currentChunk = ''
  private content = ''

  constructor(options: AiOptions = { port: '' }) {
    this.options = options
  }

  init(type = 'huoshan', options: AiInitOptions) {
    // 火山引擎接口
    if (type === 'huoshan') {
      this.baseData = {
        api: options.api,
        method: options.method,
        headers: {
          Authorization: `Bearer ${options.key}`,
        },
        data: {
          model: options.model,
          stream: true,
        },
      }
    }
  }

  async request(
    data: AiRequestData,
    progress: AiProgressCallback = () => {},
    end: AiEndCallback = () => {},
    err: AiErrorCallback = () => {},
  ) {
    try {
      this.content = ''
      const res = await this.postMsg(data)
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await res.read()
        if (done) {
          return
        }
        // 拿到当前切片的数据
        const text = decoder.decode(value)
        // 处理切片数据
        const chunk = this.handleChunkData(text)
        // 判断是否有不完整切片，如果有，合并下一次处理，没有则获取数据
        if (this.currentChunk) {
          continue
        }
        let isEnd = false
        const list = chunk
          .split('\n')
          .filter((item) => {
            isEnd = item.includes('[DONE]')
            return !!item && !isEnd
          })
          .map((item) => {
            return JSON.parse(item.replace(/^data:/, ''))
          })
        list.forEach((item: any) => {
          this.content += item.choices
            .map((item2: any) => {
              return item2.delta.content
            })
            .join('')
        })
        progress(this.content)
        if (isEnd) {
          end(this.content)
        }
      }
    }
    catch (error) {
      console.log(error)
      // 手动停止请求不需要触发错误回调
      if (!(error && (error as Error).name === 'AbortError')) {
        err(error)
      }
    }
  }

  private async postMsg(data: AiRequestData): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    this.controller = new AbortController()
    const res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
      signal: this.controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.baseData,
        data: {
          ...this.baseData.data,
          ...data,
        },
      }),
    })
    if (res.status && res.status !== 200) {
      throw new Error('请求失败')
    }
    if (!res.body) {
      throw new Error('响应体为空')
    }
    return res.body.getReader()
  }

  private handleChunkData(chunk: string): string {
    chunk = chunk.trim()
    // 如果存在上一个切片
    if (this.currentChunk) {
      chunk = this.currentChunk + chunk
      this.currentChunk = ''
    }
    // 如果存在done,认为是完整切片且是最后一个切片
    if (chunk.includes('[DONE]')) {
      return chunk
    }
    // 最后一个字符串不为}，则默认切片不完整，保存与下次拼接使用（这种方法不严谨，但已经能解决大部分场景的问题）
    if (chunk[chunk.length - 1] !== '}') {
      this.currentChunk = chunk
    }
    return chunk
  }

  stop() {
    if (this.controller) {
      this.controller.abort()
      this.controller = new AbortController()
    }
  }
}

export default Ai
