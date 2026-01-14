/**
 * AI 工具类类型定义
 */

export interface AiOptions {
  /** 端口 */
  port: string | number
}

export interface AiInitOptions {
  /** API 地址 */
  api: string
  /** API Key */
  key: string
  /** 模型名称 */
  model: string
  /** 请求方法 */
  method: string
}

export interface AiRequestData {
  /** 消息列表 */
  messages: Array<{
    role: string
    content: string
  }>
}

export type AiProgressCallback = (content: string) => void
export type AiEndCallback = (content: string) => void
export type AiErrorCallback = (error: unknown) => void

declare class Ai {
  constructor(options?: AiOptions)

  /**
   * 初始化 AI 配置
   * @param type AI 类型（默认 'huoshan'）
   * @param options 配置选项
   */
  init(type: string, options: AiInitOptions): void

  /**
   * 发送请求
   * @param data 请求数据
   * @param progress 进度回调
   * @param end 结束回调
   * @param err 错误回调
   */
  request(
    data: AiRequestData,
    progress?: AiProgressCallback,
    end?: AiEndCallback,
    err?: AiErrorCallback
  ): Promise<void>

  /**
   * 停止请求
   */
  stop(): void
}

export default Ai
