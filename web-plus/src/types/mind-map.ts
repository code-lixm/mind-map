/**
 * MindMap 组件类型定义
 */

// ============== 基础数据结构 ==============

/**
 * 思维导图节点数据
 */
export interface MindMapNodeData {
  /** 节点数据 */
  data: {
    /** 节点文本内容 */
    text: string
    /** 是否展开子节点 */
    expand?: boolean
    /** 是否激活 */
    isActive?: boolean
    /** 图片 URL */
    image?: string
    /** 图片标题 */
    imageTitle?: string
    /** 图片大小 */
    imageSize?: {
      width: number
      height: number
    }
    /** 图标列表 */
    icon?: string[]
    /** 标签 */
    tag?: string[]
    /** 超链接 */
    hyperlink?: string
    /** 超链接标题 */
    hyperlinkTitle?: string
    /** 备注 */
    note?: string
    /** 关联线ID列表 */
    associativeLineTargets?: string[]
    /** 关联线文本 */
    associativeLineText?: string
    /** 外框 */
    outerFrame?: boolean
    /** 生成摘要 */
    generalization?: MindMapNodeData[]
    /** 富文本模式 */
    richText?: boolean
    /** 重置节点样式 */
    resetRichText?: boolean
    /** 自定义节点样式 */
    [key: string]: unknown
  }
  /** 子节点列表 */
  children?: MindMapNodeData[]
}

/**
 * 思维导图完整数据
 */
export interface MindMapFullData {
  /** 根节点数据 */
  root: MindMapNodeData
  /** 主题 */
  theme?: {
    /** 主题名称 */
    template?: string
    /** 主题配置 */
    config?: Record<string, unknown>
  }
  /** 布局 */
  layout?: string
  /** 配置 */
  config?: Record<string, unknown>
  /** 视图数据 */
  view?: MindMapViewData
}

/**
 * 视图数据（缩放、平移等）
 */
export interface MindMapViewData {
  /** 变换信息 */
  transform: {
    /** 缩放比例 */
    scaleX: number
    scaleY: number
    /** 平移距离 */
    translateX: number
    translateY: number
  }
  /** 状态 */
  state: {
    /** 缩放值 */
    scale: number
    /** x 偏移 */
    x: number
    /** y 偏移 */
    y: number
  }
}

// ============== 组件 Props ==============

/**
 * MindMapViewer 组件 Props（预览模式 - 简化版）
 */
export interface MindMapViewerProps {
  /** 思维导图数据（受控模式） */
  modelValue?: MindMapFullData | null
  /** 是否使用暗色模式 */
  useDark?: boolean
  /** 自定义文案 */
  localeText?: Partial<LocaleText>
  /** 是否禅模式（隐藏工具栏） */
  isZenMode?: boolean
}

/**
 * MindMapEditor 组件 Props（编辑模式 - 完整版）
 */
export interface MindMapEditorProps {
  /** 思维导图数据（受控模式） */
  modelValue?: MindMapFullData | null
  /** 默认数据（非受控模式） */
  defaultData?: MindMapFullData
  /** 是否只读 */
  readonly?: boolean
  /** 是否启用 AI 功能 */
  enableAi?: boolean
  /** 是否使用暗色模式 */
  useDark?: boolean
  /** 自定义文案 */
  localeText?: Partial<LocaleText>
  /** 是否禅模式（隐藏工具栏） */
  isZenMode?: boolean
  /** 是否开启节点富文本 */
  openNodeRichText?: boolean
  /** 是否显示滚动条 */
  isShowScrollbar?: boolean
  /** 是否开启拖拽导入 */
  enableDragImport?: boolean
  /** 鼠标行为（左键选择右键拖拽） */
  useLeftKeySelectionRightKeyDrag?: boolean
}

// ============== 组件 Emits ==============

/**
 * MindMapViewer 组件 Emits（预览模式 - 简化版）
 */
export interface MindMapViewerEmits {
  (event: 'update:modelValue', data: MindMapFullData): void
  (event: 'ready', mindMap: MindMapInstance): void
  (event: 'error', error: unknown): void
  (event: 'view-change', data: unknown): void
}

/**
 * MindMapEditor 组件 Emits（编辑模式 - 完整版）
 */
export interface MindMapEditorEmits {
  (event: 'update:modelValue', data: MindMapFullData): void
  (event: 'ready', mindMap: MindMapInstance): void
  (event: 'error', error: unknown): void
  (event: 'command', commandName: string, payload?: unknown): void
  (event: 'data-change', data: MindMapFullData): void
  (event: 'view-change', data: unknown): void
}

// ============== MindMap 实例类型 ==============

/**
 * MindMap 实例类型别名（方便导入使用）
 */
export type MindMap = MindMapInstance

/**
 * MindMap 实例类型（简化版，完整类型需要参考 simple-mind-map 包）
 */
export interface MindMapInstance {
  /** 渲染器 */
  renderer: {
    /** 重新渲染 */
    reRender: () => void
    /** 开始文本编辑 */
    startTextEdit: () => void
    /** 结束文本编辑 */
    endTextEdit: () => void
    /** 将根节点移动到画布中心 */
    setRootNodeCenter: () => void
    /** 复制节点 */
    copy: () => void
    /** 剪切节点 */
    cut: () => void
    /** 粘贴节点 */
    paste: () => void
    /** 文本编辑器 */
    textEdit: {
      hideEditTextBox: () => void
      [key: string]: unknown
    }
    /** 通过uid查找节点 */
    findNodeByUid: (uid: string) => MindMapNode | null
    /** 将节点移动到画布中心 */
    moveNodeToCenter: (node: MindMapNode) => void
    clearAllNodeHighlight: () => void
    [key: string]: unknown
  }
  /** 视图 */
  view: {
    /** 重置视图 */
    reset: () => void
    /** 适应画布 */
    fit: () => void
    [key: string]: any
  }
  /** 导出插件 */
  export?: {
    /** 导出为图片 */
    png: (name?: string, options?: unknown) => Promise<void>
    /** 导出为 SVG */
    svg: (name?: string, options?: unknown) => Promise<void>
    /** 导出为 JSON */
    json: (name?: string) => void
    /** 导出为 PDF */
    pdf: (name?: string) => Promise<void>
    [key: string]: unknown
  }
  /** 小地图插件 */
  miniMap?: {
    [key: string]: unknown
  }
  /** 关联线插件 */
  associativeLine?: {
    /** 从激活节点创建关联线 */
    createLineFromActiveNode: () => void
    /** 获取样式配置 */
    getStyleConfig: (node: any, toNode: any) => Record<string, any>
    /** 更新激活线条样式 */
    updateActiveLineStyle: () => void
    [key: string]: unknown
  }
  /** 格式刷插件 */
  painter?: {
    /** 开启格式刷 */
    startPainter: () => void
    [key: string]: any
  }
  /** 搜索插件 */
  search?: {
    [key: string]: any
  }
  /** 水印插件 */
  watermark?: {
    [key: string]: any
  }
  /** 销毁实例 */
  destroy: () => void
  /** 重新调整大小 */
  resize: () => void
  /** 获取数据 */
  getData: (withConfig?: boolean) => MindMapFullData
  /** 设置节点数据 */
  setData: (data: MindMapFullData | MindMapNodeData) => void
  /** 设置完整数据（节点+布局+主题+视图） */
  setFullData?: (data: MindMapFullData) => void
  /** 执行命令 */
  execCommand: (command: string, ...args: unknown[]) => void
  /** 监听事件 */
  on: (event: string, handler: (...args: unknown[]) => void) => void
  /** 移除监听 */
  off: (event: string, handler: (...args: unknown[]) => void) => void
  /** 获取布局 */
  getLayout: () => string
  /** 设置布局 */
  setLayout: (layout: string) => void
  /** 获取主题 */
  getTheme: () => string
  /** 设置主题 */
  setTheme: (theme: string) => void
  /** 获取主题配置 */
  getThemeConfig: (key?: string) => any
  /** 设置主题配置 */
  setThemeConfig: (config: Record<string, any>, notRender?: boolean) => void
  /** 获取自定义主题配置 */
  getCustomThemeConfig: () => Record<string, any>
  /** 获取配置 */
  getConfig: (key?: string) => any
  /** 更新配置 */
  updateConfig: (config: Record<string, any>) => void
  /** 渲染 */
  render: () => void
  /** 添加自定义内容到节点 */
  addCustomContentToNode: (node: any, content: any[]) => void
  /** 从节点移除自定义内容 */
  removeCustomContentFromNode: (node: any) => void
  /** 扩展形状列表 */
  extendShapeList: Array<{ name: string, nameShow: string, path: string }>
  /** 彩虹线条 */
  rainbowLines?: {
    /** 获取颜色列表 */
    getColorsList: () => string[]
    /** 更新彩虹线条配置 */
    updateRainLinesConfig: (config: any) => void
    [key: string]: any
  }
  /** 视口检测器 */
  viewportDetector?: ViewportDetectorPlugin
  [key: string]: any
}

// ============== 配置相关 ==============

/**
 * 本地配置
 */
export interface LocalConfig {
  /** 是否禅模式 */
  isZenMode: boolean
  /** 是否开启节点富文本 */
  openNodeRichText: boolean
  /** 鼠标行为 */
  useLeftKeySelectionRightKeyDrag: boolean
  /** 是否显示滚动条 */
  isShowScrollbar: boolean
  /** 是否暗色模式 */
  isDark: boolean
  /** 是否开启 AI 功能 */
  enableAi: boolean
  /** 是否启用拖拽导入 */
  enableDragImport?: boolean
}

/**
 * AI 配置
 */
export interface AiConfig {
  /** API 地址 */
  api: string
  /** API Key */
  key: string
  /** 模型 */
  model: string
  /** 端口 */
  port: string | number
  /** 请求方法 */
  method: string
}

// ============== 文案相关 ==============

/**
 * LocaleText Provider 类型
 * 支持函数调用和属性访问两种方式
 */
export type LocaleTextProvider = ((path: string) => string | undefined) & LocaleText & {
  value: LocaleText
}

/**
 * 组件内文案字典
 */
export interface LocaleText {
  // 基础样式
  baseStyle: {
    title: string
    background: string
    color: string
    image: string
    imageRepeat: string
    imagePosition: string
    imageSize: string
    line: string
    width: string
    style: string
    lineRadius: string
    lineOfOutline: string
    showArrow: string
    nodePadding: string
    nodeMargin: string
    horizontal: string
    vertical: string
    maximumWidth: string
    maximumHeight: string
    icon: string
    size: string
    level2Node: string
    belowLevel2Node: string
    nodeBorderType: string
    nodeUseLineStyle: string
    associativeLine: string
    associativeLineWidth: string
    associativeLineColor: string
    associativeLineActiveWidth: string
    associativeLineActiveColor: string
    rootStyle: string
    associativeLineText: string
    fontFamily: string
    fontSize: string
    rootLineStartPos: string
    center: string
    edge: string
    rainbowLines: string
    notUseRainbowLines: string
    outerFramePadding: string
    associativeLineStyle: string
    builtInBackgroundImage: string
    [key: string]: string
  }
  // 设置
  setting: {
    title: string
    openPerformance: string
    enableFreeDrag: string
    isEnableNodeRichText: string
    mousewheelAction: string
    zoomView: string
    moveViewUpDown: string
    mousewheelZoomActionReverse: string
    mousewheelZoomActionReverse1: string
    mousewheelZoomActionReverse2: string
    createNewNodeBehavior: string
    default: string
    notActive: string
    activeOnly: string
    openRealtimeRenderOnNodeTextEdit: string
    isShowScrollbar: string
    isUseHandDrawnLikeStyle: string
    isUseMomentum: string
    openBlankMode: string
    watermark: string
    showWatermark: string
    watermarkDefaultText: string
    onlyExport: string
    watermarkText: string
    watermarkTextColor: string
    watermarkLineSpacing: string
    watermarkTextSpacing: string
    watermarkAngle: string
    watermarkTextOpacity: string
    watermarkTextFontSize: string
    belowNode: string
    alwaysShowExpandBtn: string
    enableAutoEnterTextEditWhenKeydown: string
    enableInheritAncestorLineStyle: string
    confirm: string
    cancel: string
    changeRichTextTip: string
    changeRichTextTip2: string
    changeRichTextTip3: string
    enableDragImport: string
    imgTextMargin: string
    textContentMargin: string
    enableAi: string
    [key: string]: string
  }
  // 颜色
  color: {
    moreColor: string
    [key: string]: string
  }
  // 右键菜单
  contextmenu: {
    insertSiblingNode: string
    insertChildNode: string
    insertParentNode: string
    insertSummary: string
    moveUpNode: string
    moveDownNode: string
    deleteNode: string
    deleteCurrentNode: string
    copyNode: string
    cutNode: string
    pasteNode: string
    backCenter: string
    expandAll: string
    unExpandAll: string
    expandTo: string
    arrangeLayout: string
    level1: string
    level2: string
    level3: string
    level4: string
    level5: string
    level6: string
    zenMode: string
    fitCanvas: string
    removeImage: string
    removeHyperlink: string
    removeNote: string
    removeCustomStyles: string
    removeAllNodeCustomStyles: string
    exportNodeToPng: string
    copyToClipboard: string
    copyToSmm: string
    copyToJson: string
    copyToMarkdown: string
    copyToTxt: string
    copyToPng: string
    copySuccess: string
    copyFail: string
    number: string
    expandNodeChild: string
    unExpandNodeChild: string
    addToDo: string
    removeToDo: string
    aiCreate: string
    modifyNodeLink: string
    linkToNode: string
    removeNodeLink: string
    [key: string]: string
  }
  // 统计
  count: {
    words: string
    nodes: string
    [key: string]: string
  }
  // 对话框
  dialog: {
    cancel: string
    confirm: string
    [key: string]: string
  }
  // 导出
  export: {
    title: string
    filename: string
    include: string
    dedicatedFile: string
    jsonFile: string
    imageFile: string
    svgFile: string
    pdfFile: string
    markdownFile: string
    isTransparent: string
    transformingDomToImages: string
    notifyTitle: string
    notifyMessage: string
    paddingX: string
    paddingY: string
    useMultiPageExport: string
    defaultFileName: string
    addFooterText: string
    addFooterTextPlaceholder: string
    desc: string
    options: string
    isFitBg: string
    format: string
    confirm: string
    [key: string]: string
  }
  // 全屏
  fullscreen: {
    fullscreenShow: string
    fullscreenEdit: string
    [key: string]: string
  }
  // 演示
  demonstrate: {
    demonstrate: string
    [key: string]: string
  }
  // 导入
  import: {
    title: string
    selectFile: string
    support: string
    file: string
    pleaseSelect: string
    maxFileNum: string
    notSelectTip: string
    fileContentError: string
    importSuccess: string
    fileParsingFailed: string
    xmindCanvasSelectDialogTitle: string
    mdImportDialogTitle: string
    mdPlaceholder: string
    mdEmptyTip: string
    [key: string]: string
  }
  // 导航工具栏
  navigatorToolbar: {
    openMiniMap: string
    closeMiniMap: string
    readonly: string
    edit: string
    backToRoot: string
    changeSourceCodeEdit: string
    shortcutKeys: string
    ai: string
    downloadClient: string
    site: string
    current: string
    downloadDesc: string
    [key: string]: string
  }
  // 节点超链接
  nodeHyperlink: {
    title: string
    link: string
    name: string
    [key: string]: string
  }
  // 节点图标
  nodeIcon: {
    title: string
    [key: string]: string
  }
  // 节点图片
  nodeImage: {
    title: string
    imgTitle: string
    [key: string]: string
  }
  // 节点备注
  nodeNote: {
    title: string
    [key: string]: string
  }
  // 节点标签
  nodeTag: {
    title: string
    addTip: string
    [key: string]: string
  }
  // 大纲
  outline: {
    title: string
    nodeDefaultText: string
    print: string
    fullscreen: string
    [key: string]: string
  }
  // 缩放
  scale: {
    zoomIn: string
    zoomOut: string
    [key: string]: string
  }
  // 快捷键
  shortcutKey: {
    title: string
    [key: string]: string
  }
  // 结构
  strusture: {
    title: string
    [key: string]: string
  }
  // 样式
  style: {
    title: string
    normal: string
    active: string
    text: string
    fontFamily: string
    fontSize: string
    color: string
    addFontWeight: string
    italic: string
    textDecoration: string
    none: string
    underline: string
    lineThrough: string
    overline: string
    border: string
    style: string
    width: string
    borderRadius: string
    background: string
    shape: string
    line: string
    nodePadding: string
    horizontal: string
    vertical: string
    gradientStyle: string
    startColor: string
    endColor: string
    arrowDir: string
    arrowDirStart: string
    arrowDirEnd: string
    direction: string
    selectNodeTip: string
    openLineFlow: string
    lineFlowDuration: string
    forward: string
    reverse: string
    img: string
    placement: string
    top: string
    bottom: string
    left: string
    right: string
    tag: string
    [key: string]: string
  }
  // 主题
  theme: {
    title: string
    classics: string
    dark: string
    simple: string
    coverTip: string
    tip: string
    cover: string
    reserve: string
    [key: string]: string
  }
  // 工具栏
  toolbar: {
    undo: string
    redo: string
    insertSiblingNode: string
    insertChildNode: string
    deleteNode: string
    image: string
    icon: string
    link: string
    note: string
    tag: string
    summary: string
    displayOutline: string
    baseStyle: string
    theme: string
    strusture: string
    newFile: string
    openFile: string
    saveAs: string
    import: string
    export: string
    shortcutKey: string
    associativeLine: string
    painter: string
    formula: string
    attachment: string
    outerFrame: string
    more: string
    selectFileTip: string
    notSupportTip: string
    tip: string
    editingLocalFileTipFront: string
    editingLocalFileTipEnd: string
    fileContentError: string
    fileOpenFailed: string
    defaultFileName: string
    creatingTip: string
    directory: string
    newFileTip: string
    openFileTip: string
    ai: string
    [key: string]: string
  }
  // 编辑器
  edit: {
    newFeatureNoticeTitle: string
    newFeatureNoticeMessage: string
    root: string
    splitByWrap: string
    tip: string
    yes: string
    no: string
    exportError: string
    dragTip: string
    deleteNodeImgTip: string
    autoOpenNodeRichTextTip: string
    localStorageExceededTip: string
    withBg: string
    tryTipTitle: string
    tryTipDesc: string
    downBaidu: string
    downGithub: string
    [key: string]: string
  }
  // 鼠标操作
  mouseAction: {
    tip1: string
    tip2: string
    [key: string]: string
  }
  // 搜索
  search: {
    searchPlaceholder: string
    replacePlaceholder: string
    replace: string
    replaceAll: string
    cancel: string
    noResult: string
    [key: string]: string
  }
  // 节点图标侧边栏
  nodeIconSidebar: {
    title: string
    icon: string
    sticker: string
    [key: string]: string
  }
  // 公式侧边栏
  formulaSidebar: {
    title: string
    placeholder: string
    confirm: string
    common: string
    tip: string
    [key: string]: string
  }
  // 富文本工具栏
  richTextToolbar: {
    bold: string
    italic: string
    underline: string
    strike: string
    fontFamily: string
    fontSize: string
    color: string
    backgroundColor: string
    removeFormat: string
    textAlign: string
    [key: string]: string
  }
  // 其他
  other: {
    loading: string
    [key: string]: string
  }
  // 源码编辑
  sourceCodeEdit: {
    sourceCodeTip: string
    format: string
    copy: string
    confirm: string
    close: string
    formatErrorTip: string
    copyTip: string
    formatTip: string
    [key: string]: string
  }
  // 附件
  attachment: {
    deleteAttachment: string
    tip: string
    [key: string]: string
  }
  // 标注
  annotation: {
    mark: string
    show: string
    type: string
    color: string
    lineWidth: string
    padding: string
    animate: string
    [key: string]: string
  }
  // 节点外框
  nodeOuterFrame: {
    nodeOuterFrameStyle: string
    outerFrameSetting: string
    deleteOuterFrame: string
    boxStyle: string
    boxColor: string
    fillColor: string
    outerFrameText: string
    deleteOuterFrameText: string
    fontFamily: string
    color: string
    fontSize: string
    radius: string
    fontBold: string
    italic: string
    lineHeight: string
    textFillRadius: string
    textFill: string
    textAlign: string
    left: string
    center: string
    right: string
    paddingX: string
    paddingY: string
    [key: string]: string
  }
  // 节点标签样式
  nodeTagStyle: {
    placeholder: string
    delete: string
    [key: string]: string
  }
  // AI
  ai: {
    chatTitle: string
    clearRecords: string
    connectFailedTitle: string
    connectFailedTip: string
    connectFailedCheckTip1: string
    connectFailedCheckTip2: string
    connectFailedCheckTip3: string
    connectFailedCheckTip4: string
    baiduNetdisk: string
    createMindMapTitle: string
    createTip: string
    importantTip: string
    wantModifyAiConfigTip: string
    modifyAIConfiguration: string
    chatInputPlaceholder: string
    send: string
    stopGenerating: string
    generationFailed: string
    aiGenerationSuccess: string
    stoppedGenerating: string
    AIConfiguration: string
    VolcanoArkLargeModelConfiguration: string
    configTip: string
    course: string
    inferenceAccessPoint: string
    mindMappingClientConfiguration: string
    port: string
    cancel: string
    confirm: string
    close: string
    configSaveSuccessTip: string
    apiValidateTip: string
    keyValidateTip: string
    modelValidateTip: string
    portValidateTip: string
    methodValidateTip: string
    noInputTip: string
    connectSuccessful: string
    connectFailed: string
    connectionDetection: string
    configurationMissing: string
    aiCreateMsgPrefix: string
    aiCreateMsgPostfix: string
    aiCreatePartMsgPrefix: string
    aiCreatePartMsgCenter: string
    aiCreatePartMsgPostfix: string
    aiCreatePartMsgHelp: string
    aiCreatePart: string
    [key: string]: string
  }
  // 备注
  note: {
    title: string
    [key: string]: string
  }
  // 节点链接
  nodeLink: {
    linkToNode: string
    addReturn: string
    tip1: string
    tip2: string
    tip3: string
    tip4: string
    tip5: string
    [key: string]: string
  }
  // 回到视图
  backToView: {
    buttonText: string
    [key: string]: string
  }
  // 允许扩展
  [key: string]: any
}

// ============== 插件相关 ==============

/**
 * 插件注册选项
 */
export interface MindMapPluginOptions {
  /** 是否启用小地图 */
  enableMiniMap?: boolean
  /** 是否启用水印 */
  enableWatermark?: boolean
  /** 是否启用富文本 */
  enableRichText?: boolean
  /** 是否启用滚动条 */
  enableScrollbar?: boolean
  /** 是否启用关联线 */
  enableAssociativeLine?: boolean
  // ... 其他插件配置
}

// ============== 主题相关 ==============

/**
 * 主题配置
 */
export interface MindMapTheme {
  /** 主题名称 */
  name: string
  /** 主题显示名称 */
  displayName: string
  /** 主题配置 */
  config?: Record<string, unknown>
}

/**
 * 扩展主题组
 */
export interface ExtendThemeGroup {
  /** 组名 */
  name: string
  /** 主题列表 */
  list: MindMapTheme[]
}

/**
 * 主题组（包含主题列表）
 */
export interface ThemeGroup {
  /** 组名 */
  name: string
  /** 主题列表 */
  list: Array<{
    name: string
    value: string
    dark: boolean
    img?: string
  }>
}

// ============== 工具类型 ==============

/**
 * 事件总线类型（mitt 实例）
 */
export interface EventBus {
  /** 监听事件 */
  on: (event: string, handler: (...args: any[]) => void) => void
  /** 移除监听 */
  off: (event: string, handler: (...args: any[]) => void) => void
  /** 触发事件 */
  emit: (event: string, ...args: any[]) => void
  /** 清除所有监听 */
  all?: Map<string, Array<(...args: any[]) => void>>
}

/**
 * 暗色模式响应式引用类型
 */
export type IsDark = import('vue').Ref<boolean>

/**
 * 树节点数据（大纲模式）
 */
export interface OutlineTreeNode {
  /** 节点唯一标识 */
  uid: string
  /** 节点显示文本 */
  label: string
  /** 原始文本缓存（用于比较是否修改） */
  textCache: string
  /** 节点数据 */
  data: {
    /** 节点文本内容 */
    text: string
    /** 节点唯一标识 */
    uid: string
    /** 是否富文本 */
    richText?: boolean
    /** 是否激活 */
    isActive?: boolean
    /** 其他自定义数据 */
    [key: string]: unknown
  }
  /** 子节点列表 */
  children?: OutlineTreeNode[]
  /** 是否根节点 */
  root?: boolean
}

/**
 * 思维导图节点实例类型（来自 simple-mind-map）
 */
export interface MindMapNode {
  /** 节点唯一标识 */
  uid: string
  /** 节点数据 */
  nodeData: {
    data: {
      isActive?: boolean
      uid?: string
      icon?: string[]
      associativeLineStyle?: Record<string, any>
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  /** 是否根节点 */
  isRoot: boolean
  /** 是否概括节点 */
  isGeneralization: boolean
  /** 父节点 */
  parent: {
    children: MindMapNode[]
    [key: string]: any
  }
  /** 设置节点文本 */
  setText: (text: string, richText?: boolean) => void
  /** 获取节点数据 */
  getData: (key: string) => any
  /** 设置节点数据 */
  setData: (data: Record<string, any>) => void
  /** 设置样式 */
  setStyle: (prop: string, value: any) => void
  /** 设置多个样式 */
  setStyles: (styles: Record<string, any>) => void
  /** 获取样式 */
  getStyle: (prop: string, includeInherit?: boolean) => any
  /** 设置图标 */
  setIcon: (icons: string[]) => void
  /** 获取图片 URL */
  getImageUrl: () => string | null
  /** 获取节点矩形信息 */
  getRect: () => { x: number, y: number, width: number, height: number }
  /** 设置超链接 */
  setHyperlink: (url: string, title?: string) => void
  /** 设置备注 */
  setNote: (note: string) => void
  /** 其他属性和方法 */
  [key: string]: unknown
}

// ============== 视口检测相关 ==============

/**
 * 视口可见性信息
 */
export interface ViewportVisibility {
  /** 状态: 完全可见 | 部分可见 | 不可见 */
  status: 'fully_visible' | 'partially_visible' | 'invisible'
  /** 是否完全可见 */
  isFullyVisible: boolean
  /** 是否部分可见 */
  isPartiallyVisible: boolean
  /** 是否不可见 */
  isInvisible: boolean
  /** 可见比例 (0-1) */
  visibleRatio: number
  /** 可见区域面积 */
  visibleArea: number
  /** 各方向溢出值 */
  overflow: {
    left: number
    top: number
    right: number
    bottom: number
  }
  /** 溢出的方向列表 */
  directions: string[]
  /** 根节点是否可见 */
  rootVisible: boolean
  /** 思维导图边界 */
  mindMapBounds: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
    centerX: number
    centerY: number
  }
  /** 视口边界 */
  viewportBounds: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
    centerX: number
    centerY: number
  }
  /** 可见区域边界 */
  visibleBounds: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }
}

/**
 * 视口检测器插件
 */
export interface ViewportDetectorPlugin {
  /** 是否启用 */
  enabled: boolean
  /** 启用插件 */
  enable: () => void
  /** 禁用插件 */
  disable: () => void
  /** 切换启用状态 */
  toggle: () => boolean
  /** 是否已启用 */
  isEnabled: () => boolean
  /** 手动触发检测并 emit 事件 */
  emitCheck: () => ViewportVisibility
  /** 检测可见性 */
  check: () => ViewportVisibility
  /** 获取可见性信息 */
  getVisibility: () => ViewportVisibility
  /** 是否在视口内 */
  isInViewport: () => boolean
  /** 是否完全在视口内 */
  isFullyInViewport: () => boolean
  /** 获取溢出方向 */
  getOverflowDirections: () => string[]
  /** 回到视图中心 */
  backToCenter: () => void
  /** 检查节点是否在视口内 */
  isNodeInViewport: (node: MindMapNode) => boolean
  /** 获取可见节点 */
  getVisibleNodes: () => MindMapNode[]
  /** 获取不可见节点 */
  getInvisibleNodes: () => MindMapNode[]
}

// ============== 同步相关 ==============

export interface ConsumeActionCache {
  id: string
  status: number
}

export interface ReplaceTreeDataMessage {
  type: string
}
