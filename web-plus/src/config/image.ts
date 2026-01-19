/**
 * 图标图片配置文件
 * 使用 judge-graph 的图标资源
 */

// ========== 图标资源（Icons） ==========
// 优先级图标
const levelModule = import.meta.glob<{ default: string }>('../assets/img/icons/level/*.png', { eager: true })
// GA专用图标
const gaModule = import.meta.glob<{ default: string }>('../assets/img/icons/ga/*.png', { eager: true })
// 笔记/表情图标
const emojiModule = import.meta.glob<{ default: string }>('../assets/img/icons/emoji/*.png', { eager: true })
// 进度图标
const processModule = import.meta.glob<{ default: string }>('../assets/img/icons/process/*.png', { eager: true })
// 标记图标
const markModule = import.meta.glob<{ default: string }>('../assets/img/icons/mark/*.png', { eager: true })
// 人员图标
const peopleModule = import.meta.glob<{ default: string }>('../assets/img/icons/people/*.png', { eager: true })

// ========== 贴图资源（Stickers） ==========
// 商务贴图
const businessModule = import.meta.glob<{ default: string }>('../assets/img/stickers/business/*.png', { eager: true })
// 教育贴图
const educationModule = import.meta.glob<{ default: string }>('../assets/img/stickers/education/*.png', { eager: true })
// 节日贴图
const festivalModule = import.meta.glob<{ default: string }>('../assets/img/stickers/festival/*.png', { eager: true })
// 食物贴图
const foodModule = import.meta.glob<{ default: string }>('../assets/img/stickers/food/*.png', { eager: true })
// 医疗贴图
const medicineModule = import.meta.glob<{ default: string }>('../assets/img/stickers/medicine/*.png', { eager: true })
// 工具贴图
const toolsModule = import.meta.glob<{ default: string }>('../assets/img/stickers/tools/*.png', { eager: true })
// 旅行贴图
const travelModule = import.meta.glob<{ default: string }>('../assets/img/stickers/travel/*.png', { eager: true })

const customSort = (a: string, b: string) => a.length - b.length

// ========== 转换为图标数组 ==========
const levelIcons = Object.keys(levelModule)
  .sort(customSort)
  .map(key => levelModule[key].default)

const gaIcons = Object.keys(gaModule)
  .sort(customSort)
  .map(key => gaModule[key].default)

const emojiIcons = Object.keys(emojiModule)
  .sort(customSort)
  .map(key => emojiModule[key].default)

const processIcons = Object.keys(processModule)
  .sort(customSort)
  .map(key => processModule[key].default)

const markIcons = Object.keys(markModule)
  .sort(customSort)
  .map(key => markModule[key].default)

const peopleIcons = Object.keys(peopleModule)
  .sort(customSort)
  .map(key => peopleModule[key].default)

// ========== 转换为贴图数组 ==========
const businessStickers = Object.keys(businessModule)
  .sort(customSort)
  .map(key => businessModule[key].default)

const educationStickers = Object.keys(educationModule)
  .sort(customSort)
  .map(key => educationModule[key].default)

const festivalStickers = Object.keys(festivalModule)
  .sort(customSort)
  .map(key => festivalModule[key].default)

const foodStickers = Object.keys(foodModule)
  .sort(customSort)
  .map(key => foodModule[key].default)

const medicineStickers = Object.keys(medicineModule)
  .sort(customSort)
  .map(key => medicineModule[key].default)

const toolsStickers = Object.keys(toolsModule)
  .sort(customSort)
  .map(key => toolsModule[key].default)

const travelStickers = Object.keys(travelModule)
  .sort(customSort)
  .map(key => travelModule[key].default)

// 转换为 NodeIconSidebar 所需的格式
function createImageList(name: string, urls: string[]) {
  return {
    name,
    list: urls.map(url => ({
      url,
      width: 100,
      height: 100,
    })),
  }
}

// ========== 导出配置 ==========
// 导出图标列表（用于图标标签页）
export const iconList = [
  createImageList('优先级', levelIcons),
  createImageList('GA专用', gaIcons),
  createImageList('笔记', emojiIcons),
  createImageList('人员', peopleIcons),
  createImageList('进度', processIcons),
  createImageList('标记', markIcons),
]

// 导出贴图列表（用于贴纸标签页）
export const stickerList = [
  createImageList('商务', businessStickers),
  createImageList('教育', educationStickers),
  createImageList('节日', festivalStickers),
  createImageList('食物', foodStickers),
  createImageList('医疗', medicineStickers),
  createImageList('工具', toolsStickers),
  createImageList('旅行', travelStickers),
]

// 默认导出（保持向后兼容，仅导出图标）
export default iconList
