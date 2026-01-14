/**
 * MindMap 插件注册
 * 集中管理 simple-mind-map 的插件导入和注册
 */

import MindMap from 'simple-mind-map'

// 主题插件
import Themes from 'simple-mind-map-plugin-themes'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import Select from 'simple-mind-map/src/plugins/Select.js'
import Formula from 'simple-mind-map/src/plugins/Formula.js'
// 插件导入（从 simple-mind-map 内部路径）
// 注意：这些插件可能不在公开 API 中，需要从源码路径引入
import MiniMap from 'simple-mind-map/src/plugins/MiniMap.js'
import Painter from 'simple-mind-map/src/plugins/Painter.js'
import RichText from 'simple-mind-map/src/plugins/RichText.js'
import ExportPDF from 'simple-mind-map/src/plugins/ExportPDF.js'
import SearchPlugin from 'simple-mind-map/src/plugins/Search.js'
import Watermark from 'simple-mind-map/src/plugins/Watermark.js'
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame.js'
import TouchEvent from 'simple-mind-map/src/plugins/TouchEvent.js'
import Demonstrate from 'simple-mind-map/src/plugins/Demonstrate.js'
import ExportXMind from 'simple-mind-map/src/plugins/ExportXMind.js'
import RainbowLines from 'simple-mind-map/src/plugins/RainbowLines.js'
import ScrollbarPlugin from 'simple-mind-map/src/plugins/Scrollbar.js'
import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust.js'
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine.js'
import MindMapLayoutPro from 'simple-mind-map/src/plugins/MindMapLayoutPro.js'
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'

import NodeBase64ImageStorage from 'simple-mind-map/src/plugins/NodeBase64ImageStorage.js'

/**
 * 注册所有插件
 */
export function registerAllPlugins() {
  // 注册核心插件
  MindMap.usePlugin(MiniMap)
    .usePlugin(Watermark)
    .usePlugin(Drag)
    .usePlugin(KeyboardNavigation)
    .usePlugin(ExportPDF)
    .usePlugin(ExportXMind)
    .usePlugin(Export)
    .usePlugin(Select)
    .usePlugin(AssociativeLine)
    .usePlugin(NodeImgAdjust)
    .usePlugin(TouchEvent)
    .usePlugin(SearchPlugin)
    .usePlugin(Painter)
    .usePlugin(Formula)
    .usePlugin(RainbowLines)
    .usePlugin(ScrollbarPlugin)
    .usePlugin(Demonstrate)
    .usePlugin(OuterFrame)
    .usePlugin(MindMapLayoutPro)
    .usePlugin(NodeBase64ImageStorage)

  // 注册主题
  Themes.init(MindMap)

  // 扩展主题列表（如果存在）
  if (typeof window !== 'undefined' && (window as any).MoreThemes) {
    (window as any).MoreThemes.init(MindMap)
  }
}

/**
 * 注册富文本插件（可选）
 */
export function registerRichTextPlugin() {
  MindMap.usePlugin(RichText)
}

/**
 * 注册滚动条插件（可选）
 */
export function registerScrollbarPlugin() {
  MindMap.usePlugin(ScrollbarPlugin)
}
