import type { Ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { CaseXmindInfo } from '@/api/mind/types'
import { computed, h, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElButton, ElMessage, ElNotification } from 'element-plus'
import { useIntervalFn, useToggle } from '@vueuse/core'
import * as MIND_API from '@/api/mind'
import { useMindStore } from '@/store/mind'
import { ERROR_CODE } from '@/api/request/config'

export enum MindNodeTaskStatusEnum {
  /** 失败 */
  FAILED = -1,
  /** 待研判 */
  PENDING,
  /** 研判中 */
  IN_PROGRESS,
  /** 成功 */
  COMPLETED,
  /** 成功 */
  ALL_COMPLETED,
}
/**
 * 锁状态枚举
 */
export enum LockMode {
  /** 预览模式 */
  PREVIEW = 'preview',
  /** 编辑模式 */
  EDIT = 'edit',
}

export enum MindMapSaveType {
  MANUAL = 'manual',
  AUTO = 'auto',
  EXIT = 'exit',
}

const CASE_JUDGE_ROUTE_NAME = 'CaseJudge'

/**
 * 锁信息接口
 */
export interface LockInfo {
  /** 是否持有锁 */
  hasLock: boolean
  /** 锁获取时间 */
  acquireTime?: number
}

export interface UseMindMapLockOptions {
  /** 内容加载回调（支持异步，等待脑图渲染完成） */
  onContentLoad?: (content: CaseXmindInfo) => void | Promise<void>
}

interface PollingController {
  start: () => void
  stop: () => void
  isActive: Ref<boolean>
}

interface RunSaveOptions {
  showSuccessMessage?: boolean
  successMessage?: string
  failureMessage?: string
  updateRouterQuery?: boolean
  onSuccess?: () => void
  errorLogPrefix?: string
}

interface SaveBehavior {
  showSuccessMessage: boolean
  successMessage?: string
  failureMessage?: string
  updateRouterQuery: boolean
  errorLogPrefix: string
}

interface SaveOptions {
  type?: MindMapSaveType
}

interface CleanupOptions {
  /** 是否需要在释放锁前尝试保存未提交的更改 */
  persistUnsaved?: boolean
}

type ToggleHandler = (value?: boolean) => boolean

function createToggleState(initial = false) {
  const [state, setState] = useToggle(initial)
  return { state, setState }
}

function getValidMindMapId(value: unknown): string | null {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0)
    return null
  return String(numericValue)
}

class MindMapLockController {
  private readonly router: ReturnType<typeof useRouter>
  private readonly mindStore: ReturnType<typeof useMindStore>
  private readonly storeMode: Ref<'edit' | 'readonly'>
  private readonly caseXmindInfoId: Ref<string | null | undefined>
  private readonly lastCaseXmindActionId: Ref<CaseXmindInfo['lastCaseXmindActionId'] | undefined>

  private readonly onContentLoad?: (content: CaseXmindInfo) => void

  private readonly mode = ref<LockMode>(LockMode.PREVIEW)
  private readonly lockInfo = ref<LockInfo>({ hasLock: false })
  private readonly lastUpdateTime = ref('')
  private readonly hiddenStartTime = ref<number | null>(null)
  private readonly currentContent = ref('')
  private readonly activeMindMapId = ref<string | null>(null)

  private readonly isEditMode = computed(() => this.mode.value === LockMode.EDIT)
  private readonly isPreviewMode = computed(() => this.mode.value === LockMode.PREVIEW)

  private readonly hasUnsavedChangesState: Ref<boolean>
  private readonly setHasUnsavedChangesState: ToggleHandler
  private readonly isSavingState: Ref<boolean>
  private readonly setIsSavingState: ToggleHandler
  private readonly isInitializingState: Ref<boolean>
  private readonly setIsInitializingState: ToggleHandler
  private readonly isGlobalLoadingState: Ref<boolean>
  private readonly setIsGlobalLoadingState: ToggleHandler
  private readonly isTransitioningToEditModeState: Ref<boolean>
  private readonly setIsTransitioningToEditModeState: ToggleHandler
  private readonly isAcquiringLockState: Ref<boolean>
  private readonly setIsAcquiringLockState: ToggleHandler

  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null
  private pendingSavePromise: Promise<void> | null = null
  private cleanupPromise: Promise<void> | null = null
  private updateNotification: ReturnType<typeof ElNotification> | null = null

  private previewPollingController!: PollingController
  private editPollingController!: PollingController
  private analysisPollingController!: PollingController
  private isPreviewPollingActive!: Ref<boolean>

  private startPreviewPolling!: () => void
  private stopPreviewPolling!: () => void
  private startEditPolling!: () => void
  private stopEditPolling!: () => void
  private startAnalysisPolling!: () => void
  private stopAnalysisPolling!: () => void

  constructor(
    private readonly mindMapId: Ref<string>,
    options: UseMindMapLockOptions,
  ) {
    this.router = useRouter()
    this.mindStore = useMindStore()
    const storeRefs = storeToRefs(this.mindStore)
    this.storeMode = storeRefs.mode as Ref<'edit' | 'readonly'>
    this.caseXmindInfoId = storeRefs.caseXmindInfoId as Ref<string | null | undefined>
    this.lastCaseXmindActionId = storeRefs.lastCaseXmindActionId as Ref<CaseXmindInfo['lastCaseXmindActionId'] | undefined>

    this.onContentLoad = options.onContentLoad

    const unsavedToggle = createToggleState(false)
    this.hasUnsavedChangesState = unsavedToggle.state
    this.setHasUnsavedChangesState = unsavedToggle.setState

    const savingToggle = createToggleState(false)
    this.isSavingState = savingToggle.state
    this.setIsSavingState = savingToggle.setState

    const initializingToggle = createToggleState(false)
    this.isInitializingState = initializingToggle.state
    this.setIsInitializingState = initializingToggle.setState

    const globalLoadingToggle = createToggleState(false)
    this.isGlobalLoadingState = globalLoadingToggle.state
    this.setIsGlobalLoadingState = globalLoadingToggle.setState

    const transitioningToggle = createToggleState(false)
    this.isTransitioningToEditModeState = transitioningToggle.state
    this.setIsTransitioningToEditModeState = transitioningToggle.setState

    const acquiringToggle = createToggleState(false)
    this.isAcquiringLockState = acquiringToggle.state
    this.setIsAcquiringLockState = acquiringToggle.setState

    const initialMindMapId = getValidMindMapId(this.mindMapId.value)
    this.activeMindMapId.value = initialMindMapId
    this.caseXmindInfoId.value = this.activeMindMapId.value
    this.syncStoreMode(this.mode.value)

    this.previewPollingController = this.createPollingController({
      task: this.checkUpdateTime,
      interval: 10000,
      label: '预览模式轮询',
      runImmediatelyOnStart: true,
    })
    this.editPollingController = this.createPollingController({
      task: this.maintainLock,
      interval: 3000,
      label: '编辑模式轮询',
      runImmediatelyOnStart: true,
    })
    this.analysisPollingController = this.createPollingController({
      task: this.checkAnalysisStatus,
      interval: 2000,
      label: '研判状态轮询',
      runImmediatelyOnStart: false,
    })

    this.isPreviewPollingActive = this.previewPollingController.isActive
    this.startPreviewPolling = this.previewPollingController.start
    this.stopPreviewPolling = this.previewPollingController.stop

    this.startEditPolling = this.editPollingController.start
    this.stopEditPolling = this.editPollingController.stop

    this.startAnalysisPolling = this.analysisPollingController.start
    this.stopAnalysisPolling = this.analysisPollingController.stop

    this.registerBeforeUnloadGuard()
    this.setupRouteQuerySync()
    this.setupAnalysisWatcher()
  }

  /** 对外暴露状态与方法 */
  public expose() {
    return {
      // 状态
      mode: this.mode,
      lockInfo: this.lockInfo,
      hasUnsavedChangesState: this.hasUnsavedChangesState,
      isEditMode: this.isEditMode,
      isPreviewMode: this.isPreviewMode,
      isSavingState: this.isSavingState,
      currentContent: this.currentContent,
      lastCaseXmindActionId: this.lastCaseXmindActionId,
      activeMindMapId: this.activeMindMapId,
      isGlobalLoadingState: this.isGlobalLoadingState,

      // 方法
      enterEditMode: this.enterEditMode,
      exitEditMode: this.exitEditMode,
      save: this.save,
      markContentChanged: this.markContentChanged,
      refresh: this.refresh,

      // 工具方法
      cleanup: this.cleanup,
    }
  }

  /** 刷新脑图数据（重新调用 getById 接口并更新脑图） */
  public readonly refresh = async () => {
    const id = this.requireMindMapId('刷新脑图')
    if (!id)
      return

    try {
      await this.loadMindMap(id)
      // 刷新成功，通知已在点击刷新按钮时关闭，这里不需要再次关闭
    }
    catch (error: any) {
      console.error('[useMindMapLock] 刷新脑图失败:', error)
      if (!error.handled) {
        ElMessage.error('刷新思维导图失败')
      }
    }
  }

  /** 关闭更新提示 */
  private closeUpdateNotification() {
    if (this.updateNotification) {
      this.updateNotification.close()
      this.updateNotification = null
    }
  }

  /** 显示更新提示 */
  private showUpdateNotification() {
    // 如果提示已存在，则不重复显示
    if (this.updateNotification) {
      return
    }

    this.updateNotification = ElNotification({
      title: '研判脑图有更新',
      message: h('div', { style: 'display: flex; align-items: center; gap: 12px; justify-content: space-between;' }, [
        h('span', '研判脑图已被更新，建议刷新查看最新内容'),
        h(ElButton, {
          type: 'primary',
          size: 'small',
          text: true,
          onClick: () => {
            // 点击刷新按钮时，立即关闭通知
            this.closeUpdateNotification()
            // 然后执行刷新操作
            void this.refresh()
          },
        }, { default: () => '刷新' }),
      ]),
      type: 'info',
      duration: 0, // 默认不自动关闭，用户可手动关闭
      showClose: true, // 显示关闭按钮，允许用户手动关闭
      onClose: () => {
        this.updateNotification = null
      },
    })
  }

  private analysisWatcherStop: (() => void) | null = null

  private setupAnalysisWatcher() {
    // 如果已经存在 watch，先停止它
    if (this.analysisWatcherStop) {
      this.analysisWatcherStop()
      this.analysisWatcherStop = null
    }

    this.analysisWatcherStop = watch(
      () => this.mindStore.analysisState,
      async (state) => {
        if (state === 'preparing') {
          // 停止其他轮询
          this.stopPreviewPolling()
          this.stopEditPolling()

          // 如果在编辑模式，退出编辑模式（不保存，释放锁）
          if (this.isEditMode.value) {
            try {
              // 强制退出，不保存
              await this.transitionToPreview({ releaseLock: true, reload: false, startPreviewPolling: false })
              this.removeLastActionIdFromRouter({ removeMode: true })
            }
            catch (error) {
              console.error('[useMindMapLock] 研判前退出编辑模式失败:', error)
            }
          }

          this.mindStore.setAnalysisState('ready')
        }
        else if (state === 'polling') {
          this.mindStore.setIsLoadFailed(false)
          this.startAnalysisPolling()
        }
        else if (state === 'idle') {
          this.stopAnalysisPolling()
          // 研判结束或中断，重新初始化
          if (this.activeMindMapId.value) {
            await this.init(this.activeMindMapId.value)
          }
        }
      },
    )
  }

  private readonly checkAnalysisStatus = async () => {
    const id = this.requireMindMapId('检测研判状态')
    if (!id)
      return

    try {
      await MIND_API.getUpdateTimeById(id, { hideError: true })
      // 如果接口成功，说明研判完成（或脑图已生成）
      this.mindStore.setAnalysisState('idle')
    }
    catch (error: any) {
      // 忽略 MIND_MAP_NOT_FOUND 错误，继续轮询
      const errno = Number(error?.data?.errno || error?.errno || error?.code || error?.response?.data?.errno)
      if (errno === ERROR_CODE.MIND_MAP_NOT_FOUND) {
        return
      }
      // 其他错误也暂时忽略，继续轮询直到成功? 或者根据业务需求处理
      console.warn('[useMindMapLock] 研判状态轮询出错:', error)
    }
  }

  /** 初始化工作：根据当前 ID 启动预览模式并注册监听 */
  public bootstrap() {
    if (this.activeMindMapId.value)
      void this.init(this.activeMindMapId.value)
    else
      console.warn('[useMindMapLock] mindMapId 无效，等待有效ID后再初始化')
  }

  /** mindMapId 更新时重新加载数据并重建轮询 */
  public readonly handleMindMapIdChange = async (newId: string) => {
    await this.cleanup()
    this.activeMindMapId.value = getValidMindMapId(newId)
    this.caseXmindInfoId.value = this.activeMindMapId.value
    if (this.activeMindMapId.value)
      await this.init(this.activeMindMapId.value)
  }

  /** 保存入口：统一根据类型封装 consumer actions 与提示 */
  public readonly save = async (options?: SaveOptions) => {
    const saveType = options?.type ?? MindMapSaveType.MANUAL

    if (this.pendingSavePromise)
      await this.pendingSavePromise

    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    const behavior = this.getSaveBehavior(saveType)

    try {
      await this.runSave({
        showSuccessMessage: behavior.showSuccessMessage,
        successMessage: behavior.successMessage,
        failureMessage: behavior.failureMessage,
        updateRouterQuery: behavior.updateRouterQuery,
        errorLogPrefix: behavior.errorLogPrefix,
      })
    }
    catch (error) {
      if (process.env.NODE_ENV !== 'production')
        console.warn(error)
    }
  }

  /** 自动保存触发器：变更内容后延迟触发保存 */
  public readonly markContentChanged = () => {
    if (!this.isEditMode.value || this.isInitializingState.value)
      return

    this.setHasUnsavedChangesState(true)

    if (this.autoSaveTimer)
      clearTimeout(this.autoSaveTimer)

    this.autoSaveTimer = setTimeout(() => {
      void this.performAutoSave()
    }, 30000)
  }

  /** 进入编辑模式：尝试获取锁并加载最新内容 */
  public readonly enterEditMode = async () => {
    if (this.isTransitioningToEditModeState.value)
      return false

    // 研判中禁止进入编辑模式
    if (this.mindStore.analysisState !== 'idle') {
      return false
    }

    this.setIsTransitioningToEditModeState(true)
    this.setIsGlobalLoadingState(true)
    let previewPollingPausedForEdit = false

    try {
      this.setIsInitializingState(true)

      const id = this.requireMindMapId('进入编辑模式')
      if (!id) {
        this.setIsInitializingState(false)
        return false
      }

      if (this.isPreviewPollingActive.value) {
        this.stopPreviewPolling()
        previewPollingPausedForEdit = true
      }

      this.setIsAcquiringLockState(true)
      const acquired = await MIND_API.acquireLock(id)
      this.setIsAcquiringLockState(false)

      if (!acquired) {
        ElMessage.warning('有人正在编辑')
        if (previewPollingPausedForEdit)
          this.startPreviewPolling()
        this.setIsInitializingState(false)
        return false
      }

      // 加载脑图内容（会等待 onContentLoad 完成，即等待脑图渲染完成）
      const contentRes = await this.loadMindMap(id)
      this.syncRouterLastActionId(contentRes.lastCaseXmindActionId)


      this.setMode(LockMode.EDIT)
      this.lockInfo.value = { hasLock: true, acquireTime: Date.now() }
      this.setHasUnsavedChangesState(false)

      this.stopPreviewPolling()
      this.startEditPolling()

      // 所有加载完成（脑图渲染 + 业务操作列表），关闭 loading
      this.setIsInitializingState(false)
      console.log('[useMindMapLock] 进入编辑模式完成')

      return true
    }
    catch (error: any) {
      if (previewPollingPausedForEdit)
        this.startPreviewPolling()

      console.error('[useMindMapLock] 进入编辑模式失败:', error)
      if (!error.handled) {
        ElMessage.error('进入编辑模式失败，请重试')
      }
      this.setIsInitializingState(false)
      this.setIsAcquiringLockState(false)
      return false
    }
    finally {
      this.setIsTransitioningToEditModeState(false)
      this.setIsGlobalLoadingState(false)
    }
  }

  /** 退出编辑模式（保存 + 释放锁） */
  public readonly exitEditMode = async () => {
    this.setIsGlobalLoadingState(true)
    try {
      await this.save({ type: MindMapSaveType.EXIT })
      await this.transitionToPreview({ releaseLock: true, reload: true })

      // 清理路由参数中的 lastCaseXmindActionId
      this.removeLastActionIdFromRouter({ removeMode: true })
    }
    catch (error) {
      console.error('[useMindMapLock] 退出编辑模式失败:', error)
      ElMessage.error('退出编辑模式失败')
    }
    finally {
      this.setIsGlobalLoadingState(false)
    }
  }

  /** 强制退出编辑模式（不保存） */
  public readonly forceExitEditMode = async () => {
    await this.transitionToPreview({ reload: true })

    // 清理路由参数中的 lastCaseXmindActionId
    this.removeLastActionIdFromRouter({ removeMode: true })
  }

  /** 初始化脑图：加载初始内容并开始预览轮询 */
  public readonly init = async (targetMindMapId: string | null = this.activeMindMapId.value) => {
    if (!targetMindMapId) {
      console.warn('[useMindMapLock] mindMapId 无效，跳过初始化')
      return
    }

    try {
      // 正在研判中跳过初始化
      if (this.mindStore.analysisState === 'polling') {
        this.startAnalysisPolling()
        return
      }

      await this.loadMindMap(targetMindMapId)
      this.startPreviewPolling()
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }
    catch (error: any) {
      console.error('[useMindMapLock] 初始化失败:', error)
    }
  }

  /** 释放资源：停止轮询、保存未提交变更并释放锁 */
  public readonly cleanup = async (options: CleanupOptions = {}) => {
    if (this.cleanupPromise)
      return this.cleanupPromise

    const { persistUnsaved = true } = options

    this.cleanupPromise = (async () => {
      this.stopPreviewPolling()
      this.stopEditPolling()
      this.stopAnalysisPolling()

      // 清理 analysisState watch
      if (this.analysisWatcherStop) {
        this.analysisWatcherStop()
        this.analysisWatcherStop = null
      }

      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
        this.autoSaveTimer = null
      }

      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      window.removeEventListener('beforeunload', this.handleBeforeUnload)

      // 关闭更新提示
      this.closeUpdateNotification()

      const shouldPersistChanges
        = persistUnsaved
          && this.isEditMode.value
          && (this.hasUnsavedChangesState.value || Boolean(this.pendingSavePromise))

      if (shouldPersistChanges) {
        try {
          await (this.pendingSavePromise || this.performAutoSave())
        }
        catch (error) {
          console.error('[useMindMapLock] 清理时保存失败:', error)
        }
      }
      else if (this.pendingSavePromise) {
        try {
          await this.pendingSavePromise
        }
        catch (error) {
          console.error('[useMindMapLock] 等待进行中的保存失败:', error)
        }
      }

      if (this.isEditMode.value || this.lockInfo.value.hasLock)
        await this.transitionToPreview({ releaseLock: true, startPreviewPolling: false })

      this.mindStore.resetMindMeta()
    })()

    try {
      await this.cleanupPromise
    }
    finally {
      this.cleanupPromise = null
    }
  }

  /** 同步当前模式到全局 store */
  private syncStoreMode(lockModeValue: LockMode) {
    this.storeMode.value = lockModeValue === LockMode.EDIT ? 'edit' : 'readonly'
  }

  /** 设置本地模式并同步 store */
  private setMode(lockModeValue: LockMode) {
    this.mode.value = lockModeValue
    this.syncStoreMode(lockModeValue)
  }

  /** 校验是否存在有效的脑图 ID */
  private requireMindMapId(action: string): string | null {
    const id = this.activeMindMapId.value
    if (!id) {
      console.warn(`[useMindMapLock] mindMapId 无效，无法${action}`)
      return null
    }
    return id
  }

  /** 统一创建轮询控制器（start/stop/isActive） */
  private createPollingController(options: {
    task: () => void | Promise<void>
    interval: number
    label: string
    runImmediatelyOnStart?: boolean
  }): PollingController {
    const { pause, resume, isActive } = useIntervalFn(options.task, options.interval, { immediate: false })

    const start = () => {
      if (isActive.value) {
        // console.warn(`[useMindMapLock] ${options.label}已在运行`)
        return
      }

      if (options.runImmediatelyOnStart)
        options.task()

      resume()
      console.log(`[useMindMapLock] ${options.label}已启动`)
    }

    const stop = () => {
      if (!isActive.value)
        return

      pause()
      console.log(`[useMindMapLock] ${options.label}已停止`)
    }

    return { start, stop, isActive }
  }

  /** 轮询检查最新更新时间，提示用户刷新 */
  private readonly checkUpdateTime = async () => {
    if (this.isEditMode.value || this.isTransitioningToEditModeState.value)
      return

    const id = this.requireMindMapId('检测更新时间')
    if (!id)
      return

    try {
      const res = await MIND_API.getUpdateTimeById(id, { hideError: true })
      // 如果检测到更新（存在上一次更新时间且与当前不一致）
      if (this.lastUpdateTime.value && this.lastUpdateTime.value !== res.updateTime) {
        // 如果提示不存在，则显示（如果之前被关闭了，这里会重新显示）
        if (!this.updateNotification) {
          this.showUpdateNotification()
        }
        // 如果提示已存在，关闭旧的并显示新的（确保提示内容是最新的）
        else {
          this.closeUpdateNotification()
          this.showUpdateNotification()
        }
      }

      // 更新最后更新时间（无论是否显示 notification，都要更新，以便下次检测）
      this.lastUpdateTime.value = res.updateTime
    }
    catch (error) {
      console.error('[useMindMapLock] 检测更新时间失败:', error)
    }
  }

  /** 轮询续约锁，失效时强制回退 */
  private readonly maintainLock = async () => {
    if (this.isAcquiringLockState.value)
      return

    const id = this.requireMindMapId('维持锁')
    if (!id)
      return

    this.setIsAcquiringLockState(true)
    try {
      const res = await MIND_API.acquireLock(id)
      if (!res) {
        ElMessage.warning('有人在编辑，已退出编辑模式')
        await this.forceExitEditMode()
      }
    }
    catch (error) {
      console.error('[useMindMapLock] 维持锁失败:', error)
    }
    finally {
      this.setIsAcquiringLockState(false)
    }
  }

  /** 执行自动保存，复用 runSave 逻辑 */
  private readonly performAutoSave = async () => {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
      this.autoSaveTimer = null
    }

    if (!this.hasUnsavedChangesState.value)
      return this.pendingSavePromise

    if (this.pendingSavePromise)
      return this.pendingSavePromise

    await this.save({ type: MindMapSaveType.AUTO })
  }

  /** 核心保存实现，封装 Promise 串行与 actionId 兜底 */
  private readonly runSave = async ({
    showSuccessMessage = false,
    successMessage = '保存成功',
    failureMessage,
    updateRouterQuery = false,
    onSuccess,
    errorLogPrefix = '[useMindMapLock] 保存失败:',
  }: RunSaveOptions = {}) => {
    const id = this.requireMindMapId('保存脑图')
    if (!id)
      return

    const savePromise = (async () => {
      try {
        this.setIsSavingState(true)

        const res = await MIND_API.save({
          id,
          content: this.currentContent.value,
        })

        this.setHasUnsavedChangesState(false)
        if (res.lastCaseXmindActionId) {
          this.lastCaseXmindActionId.value = res.lastCaseXmindActionId
          if (updateRouterQuery)
            this.syncRouterLastActionId(res.lastCaseXmindActionId)
        }

        onSuccess?.()

        if (showSuccessMessage)
          ElMessage.success(successMessage)
      }
      catch (error) {
        console.error(errorLogPrefix, error)
        if (failureMessage)
          ElMessage.error(failureMessage)
        throw error
      }
      finally {
        this.setIsSavingState(false)
      }
    })()

    this.pendingSavePromise = savePromise

    try {
      await savePromise
    }
    finally {
      this.pendingSavePromise = null
    }
  }

  private getSaveBehavior(type: MindMapSaveType): SaveBehavior {
    switch (type) {
      case MindMapSaveType.AUTO:
        return {
          showSuccessMessage: false,
          failureMessage: '自动保存失败，请手动保存',
          updateRouterQuery: false,
          errorLogPrefix: '[useMindMapLock] 自动保存失败:',
        }
      case MindMapSaveType.EXIT:
        return {
          showSuccessMessage: false,
          updateRouterQuery: true,
          errorLogPrefix: '[useMindMapLock] 退出前保存失败:',
        }
      default:
        return {
          showSuccessMessage: true,
          successMessage: '保存成功',
          failureMessage: '保存失败，请重试',
          updateRouterQuery: true,
          errorLogPrefix: '[useMindMapLock] 手动保存失败:',
        }
    }
  }

  /** 切回预览模式，可选释放锁/重启轮询 */
  private readonly transitionToPreview = async ({
    releaseLock = false,
    startPreviewPolling = true,
    reload = false,
  }: { releaseLock?: boolean, startPreviewPolling?: boolean, reload?: boolean } = {}) => {
    if (releaseLock && this.lockInfo.value.hasLock) {
      const id = this.requireMindMapId('释放锁')
      if (id) {
        try {
          await MIND_API.releaseLock(id)
        }
        catch (error) {
          console.error('[useMindMapLock] 释放锁失败:', error)
        }
      }
    }

    this.setMode(LockMode.PREVIEW)
    this.lockInfo.value = { hasLock: false }
    this.setHasUnsavedChangesState(false)
    this.hiddenStartTime.value = null

    this.stopEditPolling()

    if (reload)
      await this.refreshMindMapAfterExit()

    if (startPreviewPolling)
      this.startPreviewPolling()
  }

  /** 退出编辑模式后刷新脑图，确保预览数据与时间戳最新 */
  private readonly refreshMindMapAfterExit = async () => {
    const id = this.requireMindMapId('刷新脑图')
    if (!id)
      return

    try {
      await this.loadMindMap(id)
    }
    catch (error: any) {
      console.error('[useMindMapLock] 刷新脑图失败:', error)
      if (!error.handled) {
        ElMessage.error('刷新思维导图失败')
      }
    }
  }

  /** 处理页面可见性变化，控制轮询与超时 */
  private readonly handleVisibilityChange = () => {
    const isHidden = document.visibilityState === 'hidden'

    if (isHidden) {
      if (this.isEditMode.value) {
        // this.stopEditPolling()
        this.hiddenStartTime.value = Date.now()
      }
      else if (this.isPreviewMode.value) {
        this.stopPreviewPolling()
      }
      return
    }

    if (this.isEditMode.value) {
      if (this.hiddenStartTime.value) {
        const hiddenDuration = Date.now() - this.hiddenStartTime.value
        const FIVE_MINUTES = 5 * 60 * 1000

        if (hiddenDuration > FIVE_MINUTES) {
          this.stopEditPolling()
          this.handleHiddenTimeout()
        }
        else {
          this.hiddenStartTime.value = null
          this.startEditPolling()
        }
      }
      else {
        this.startEditPolling()
      }
    }
    else if (this.isPreviewMode.value) {
      this.startPreviewPolling()
    }
  }

  /** 页面长时间隐藏后的超时处理 */
  private readonly handleHiddenTimeout = async () => {
    if (this.hasUnsavedChangesState.value) {
      await this.performAutoSave()
      ElMessage.info('页面长时间不可见，已自动保存并退出编辑模式')
    }
    else {
      ElMessage.info('页面长时间不可见，已自动退出编辑模式')
    }

    await this.transitionToPreview({ releaseLock: true, reload: true })

    // 清理路由参数中的 lastCaseXmindActionId
    this.removeLastActionIdFromRouter()
  }

  /** beforeunload 拦截，避免未保存内容意外关闭 */
  private readonly handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.isEditMode.value && this.hasUnsavedChangesState.value) {
      event.preventDefault()
      event.returnValue = ''
      return ''
    }
  }

  /** 根据未保存状态动态注册 beforeunload */
  private registerBeforeUnloadGuard() {
    watch(this.hasUnsavedChangesState, (val) => {
      if (val)
        window.addEventListener('beforeunload', this.handleBeforeUnload)
      else
        window.removeEventListener('beforeunload', this.handleBeforeUnload)
    })
  }

  /** 仅在案件研判路由上保留脑图相关 query */
  private setupRouteQuerySync() {
    watch(
      () => this.router.currentRoute.value,
      (route) => {
        if (!this.isJudgeRoute(route))
          this.removeLastActionIdFromRouter({ removeMode: true, route })
      },
      { immediate: true },
    )
  }

  private isJudgeRoute(route: RouteLocationNormalizedLoaded = this.router.currentRoute.value) {
    return route?.name === CASE_JUDGE_ROUTE_NAME
  }

  /** 拉取脑图详情并更新本地 state/store */
  private readonly loadMindMap = async (targetId: string): Promise<CaseXmindInfo> => {
    try {
      const res = await MIND_API.getById(targetId, { hideError: true })
      this.currentContent.value = res.content
      this.lastCaseXmindActionId.value = res.lastCaseXmindActionId
      this.lastUpdateTime.value = res.updateTime || ''
      this.caseXmindInfoId.value = targetId
      this.mindStore.setIsLoadFailed(false)
      // 如果之前是研判中，获取成功意味着研判完成
      if (this.mindStore.analysisState === 'polling') {
        this.mindStore.setAnalysisState('idle')
      }

      // 等待内容加载回调完成（支持异步，等待脑图渲染）
      await this.onContentLoad?.(res)

      return res
    }
    catch (error: any) {
      const errno = Number(error?.data?.errno || error?.errno || error?.code || error?.response?.data?.errno)
      if (errno === ERROR_CODE.MIND_MAP_NOT_FOUND) {
        if (this.mindStore.analysisState === 'polling') {
          // 研判中，忽略错误
          // eslint-disable-next-line no-throw-literal
          throw { ...error, handled: true }
        }
        else {
          // 18888 视为"未生成"，自动进入轮询等待状态
          this.mindStore.setAnalysisState('polling')

          if (this.lockInfo.value.hasLock) {
            // 如果在编辑模式下，释放锁并退出编辑状态
            this.forceExitEditMode()
          }
          // eslint-disable-next-line no-throw-literal
          throw { ...error, handled: true }
        }
      }
      // For other errors during initial load, show the failure component
      this.mindStore.setIsLoadFailed(true)
      throw error
    }
  }

  /** 将最新 actionId 写入路由 query */
  private syncRouterLastActionId(actionId?: string) {
    if (!actionId || !this.isJudgeRoute())
      return

    this.router.replace({
      query: {
        ...this.router.currentRoute.value.query,
        lastCaseXmindActionId: String(actionId),
      },
    })
  }

  /** 从路由 query 中移除 lastCaseXmindActionId，并在需要时移除 mode */
  private removeLastActionIdFromRouter({
    removeMode = true,
    route,
  }: { removeMode?: boolean, route?: RouteLocationNormalizedLoaded } = {}) {
    const targetRoute = route ?? this.router.currentRoute.value
    const currentQuery = { ...targetRoute.query }
    let hasMutated = false

    if (currentQuery.lastCaseXmindActionId !== undefined) {
      delete currentQuery.lastCaseXmindActionId
      hasMutated = true
    }

    if (removeMode) {
      const modeParam = currentQuery.mode
      if (Array.isArray(modeParam)) {
        const filtered = modeParam.filter(item => item !== 'edit')
        if (filtered.length !== modeParam.length) {
          hasMutated = true
          if (filtered.length)
            currentQuery.mode = filtered
          else
            delete currentQuery.mode
        }
      }
      else if (modeParam === 'edit') {
        delete currentQuery.mode
        hasMutated = true
      }
    }

    if (!hasMutated)
      return

    const location = targetRoute.name
      ? {
          name: targetRoute.name as string,
          params: { ...targetRoute.params },
          query: currentQuery,
        }
      : {
          path: targetRoute.path,
          query: currentQuery,
        }

    this.router.replace(location)

    console.log(`[useMindMapLock] 已清理路由参数 lastCaseXmindActionId${removeMode ? ' 和 mode' : ''}`)
  }

}

/**
 * 思维导图锁状态管理 Composable
 */
export function useMindMapLock(
  mindMapId: Ref<string>,
  optionsOrOnContentLoad?: UseMindMapLockOptions | ((content: CaseXmindInfo) => void),
) {
  const options: UseMindMapLockOptions = typeof optionsOrOnContentLoad === 'function'
    ? { onContentLoad: optionsOrOnContentLoad }
    : optionsOrOnContentLoad || {}

  const controller = new MindMapLockController(mindMapId, options)

  controller.bootstrap()

  watch(mindMapId, (newId) => {
    void controller.handleMindMapIdChange(newId)
  })

  onBeforeUnmount(() => {
    void controller.cleanup()
  })

  return controller.expose()
}
