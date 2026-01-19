/**
 * 思维导图节点图标配置
 * 使用程序化方式动态导入本地图标资源
 */

interface IconItem {
  name: string
  icon: string
}

interface IconGroup {
  name: string
  type: string
  list: IconItem[]
}

// 定义图标类型映射关系
const iconTypeMap: Record<string, { name: string, pattern: RegExp }> = {
  level: { name: '优先级', pattern: /icon_important_(\d+)\.png$/ },
  process: { name: '进度条', pattern: /icon_step_(\d+)\.png$/ },
  emoji: { name: '笔记', pattern: /icon_emoji_(\d+)\.png$/ },
  mark: { name: '标记', pattern: /icon_symbol_(\d+)\.png$/ },
  ga: { name: 'GA专用', pattern: /icon_ga_(\d+)\.png$/ },
  people: { name: '人员', pattern: /icon_people_(\d+)\.png$/ },
}

// 使用 Vite 的 import.meta.glob 动态导入所有图标
const iconModules = import.meta.glob<string>(
  '../assets/img/icons/**/*.png',
  { eager: true, import: 'default' },
)

/**
 * 处理图标模块，按类型分组
 */
function processIconModules(): IconGroup[] {
  const groups: Record<string, IconItem[]> = {}

  // 初始化分组
  Object.keys(iconTypeMap).forEach((type) => {
    groups[type] = []
  })

  // 遍历所有导入的图标文件
  Object.entries(iconModules).forEach(([path, url]) => {
    // 提取文件名：../assets/img/icons/emoji/icon_emoji_1.png -> emoji/icon_emoji_1.png
    const matchFolder = path.match(/icons\/(\w+)\/(.+)$/)
    if (!matchFolder)
      return

    const [, folder, filename] = matchFolder
    const typeConfig = iconTypeMap[folder]

    if (!typeConfig)
      return

    // 使用正则提取图标编号
    const match = filename.match(typeConfig.pattern)
    if (!match)
      return

    const iconNumber = match[1]

    groups[folder].push({
      name: iconNumber,
      icon: url as string,
    })
  })

  // 对每个分组的图标按编号排序
  Object.keys(groups).forEach((type) => {
    groups[type].sort((a, b) => {
      const numA = Number.parseInt(a.name, 10)
      const numB = Number.parseInt(b.name, 10)
      return numA - numB
    })
  })

  // 转换为最终格式
  return Object.entries(iconTypeMap).map(([type, config]) => ({
    name: config.name,
    type,
    list: groups[type] || [],
  }))
}

// 导出图标配置
const iconConfig = processIconModules()

export default iconConfig
