/**
 * 常量配置文件
 */

import mindMapImg from '../assets/img/structures/mindMap.jpg'
import fishboneImg from '../assets/img/structures/fishbone.jpg'
import timelineImg from '../assets/img/structures/timeline.jpg'
import fishbone2Img from '../assets/img/structures/fishbone2.jpg'
import timeline2Img from '../assets/img/structures/timeline2.jpg'
import rightFishboneImg from '../assets/img/structures/rightFishbone.jpg'
import rightFishbone2Img from '../assets/img/structures/rightFishbone2.jpg'
import logicalStructureImg from '../assets/img/structures/logicalStructure.jpg'
import verticalTimelineImg from '../assets/img/structures/verticalTimeline.jpg'
import verticalTimeline2Img from '../assets/img/structures/verticalTimeline2.jpg'
import verticalTimeline3Img from '../assets/img/structures/verticalTimeline3.jpg'
import catalogOrganizationImg from '../assets/img/structures/catalogOrganization.jpg'
import logicalStructureLeftImg from '../assets/img/structures/logicalStructureLeft.jpg'
import organizationStructureImg from '../assets/img/structures/organizationStructure.jpg'

// 布局结构图片映射
export const layoutImgMap: Record<string, string> = {
  logicalStructure: logicalStructureImg,
  logicalStructureLeft: logicalStructureLeftImg,
  mindMap: mindMapImg,
  organizationStructure: organizationStructureImg,
  catalogOrganization: catalogOrganizationImg,
  timeline: timelineImg,
  timeline2: timeline2Img,
  fishbone: fishboneImg,
  fishbone2: fishbone2Img,
  rightFishbone: rightFishboneImg,
  rightFishbone2: rightFishbone2Img,
  verticalTimeline: verticalTimelineImg,
  verticalTimeline2: verticalTimeline2Img,
  verticalTimeline3: verticalTimeline3Img,
}

// 字号
export const fontSizeList: number[] = [10, 12, 14, 16, 18, 24, 32, 48]

// 圆角
export const borderRadiusList: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// 线宽
export const lineWidthList: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// 行高
export const lineHeightList: number[] = [1, 1.2, 1.5, 2, 2.5, 3]

// 公式列表
export const formulaList: string[] = [
  'a^2',
  'a_2',
  'a^{2+2}',
  'a_{i,j}',
  'x_2^3',
  '\\overbrace{1+2+\\cdots+100}',
  '\\sum_{k=1}^N k^2',
  '\\lim_{n \\to \\infty}x_n',
  '\\int_{-N}^{N} e^x\\, dx',
  '\\sqrt{3}',
  '\\sqrt[n]{3}',
  '\\sin\\theta',
  '\\log X',
  '\\log_{10}',
  '\\log_\\alpha X',
  '\\lim_{t\\to n}T',
  '\\frac{1}{2}=0.5',
  '\\binom{n}{k}',
  '\\begin{matrix}x & y \\\\z & v\\end{matrix}',
  '\\begin{cases}3x + 5y +  z \\\\7x - 2y + 4z \\\\-6x + 3y + 2z\\end{cases}',
]

// 支持某种连线类型的结构
export const supportLineStyleLayoutsMap: Record<string, string[]> = {
  curve: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'verticalTimeline',
    'organizationStructure',
  ],
  curve2: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'verticalTimeline',
    'organizationStructure',
  ],
  direct: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
    'organizationStructure',
    'verticalTimeline',
  ],
  brace: [
    'logicalStructure',
    'logicalStructureLeft',
    'mindMap',
  ],
}

// 直线模式支持设置圆角的结构
export const supportLineRadiusLayouts: string[] = [
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'verticalTimeline',
]

// 支持只显示底边直线风格的结构
export const supportNodeUseLineStyleLayouts: string[] = [
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'catalogOrganization',
  'organizationStructure',
]

// 支持曲线模式下，根节点样式和其他节点样式保持一致的结构
export const supportRootLineKeepSameInCurveLayouts: string[] = [
  'logicalStructure',
  'logicalStructureLeft',
  'mindMap',
  'organizationStructure',
]

// 彩虹线条配置
interface RainbowLinesOption {
  value: string
  list?: string[]
}

export const rainbowLinesOptions: RainbowLinesOption[] = [
  {
    value: 'close',
  },
  {
    value: 'colors1',
    list: [
      'rgb(255, 213, 73)',
      'rgb(255, 136, 126)',
      'rgb(107, 225, 141)',
      'rgb(151, 171, 255)',
      'rgb(129, 220, 242)',
      'rgb(255, 163, 125)',
      'rgb(152, 132, 234)',
    ],
  },
  {
    value: 'colors2',
    list: [
      'rgb(248, 93, 93)',
      'rgb(255, 151, 84)',
      'rgb(255, 214, 69)',
      'rgb(73, 205, 140)',
      'rgb(64, 192, 255)',
      'rgb(84, 110, 214)',
      'rgb(164, 93, 220)',
    ],
  },
  {
    value: 'colors3',
    list: [
      'rgb(140, 240, 231)',
      'rgb(74, 210, 255)',
      'rgb(65, 168, 243)',
      'rgb(49, 128, 205)',
      'rgb(188, 226, 132)',
      'rgb(113, 215, 123)',
      'rgb(120, 191, 109)',
    ],
  },
  {
    value: 'colors4',
    list: [
      'rgb(169, 98, 99)',
      'rgb(245, 125, 123)',
      'rgb(254, 183, 168)',
      'rgb(251, 218, 171)',
      'rgb(138, 163, 181)',
      'rgb(131, 127, 161)',
      'rgb(84, 83, 140)',
    ],
  },
  {
    value: 'colors5',
    list: [
      'rgb(255, 229, 142)',
      'rgb(254, 158, 41)',
      'rgb(248, 119, 44)',
      'rgb(232, 82, 80)',
      'rgb(182, 66, 98)',
      'rgb(99, 54, 99)',
      'rgb(65, 40, 82)',
    ],
  },
  {
    value: 'colors6',
    list: [
      'rgb(171, 227, 209)',
      'rgb(107, 201, 196)',
      'rgb(55, 170, 169)',
      'rgb(18, 135, 131)',
      'rgb(74, 139, 166)',
      'rgb(75, 105, 150)',
      'rgb(57, 75, 133)',
    ],
  },
]
