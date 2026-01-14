/**
 * 将示例主题格式转换为默认主题格式
 * @param {Object} exampleTheme - 示例主题配置对象，包含 properties 字段
 * @returns {Object} 转换后的默认主题格式
 */
export function convertExampleThemeToDefault(exampleTheme) {
  const props = exampleTheme.properties || {}
  const defaultTheme = {
    // 节点内边距（使用 root-padding 作为默认值）
    paddingX: props['root-padding']?.[1] || 15,
    paddingY: props['root-padding']?.[0] || 5,
    // 图片显示的最大宽度
    imgMaxWidth: 350,
    // 图片显示的最大高度
    imgMaxHeight: 200,
    // icon的大小
    iconSize: 20,
    // 连线的粗细
    lineWidth: props['connect-width'] || 1,
    // 连线的颜色
    lineColor: props['connect-color'] || '#549688',
    // 连线样式
    lineDasharray: 'none',
    // 连线是否开启流动效果
    lineFlow: false,
    // 流动效果一个周期的时间
    lineFlowDuration: 1,
    // 流动方向是否是从父节点到子节点
    lineFlowForward: true,
    // 连线风格
    lineStyle: convertConnectType(props['connect-type']) || 'straight',
    // 曲线连接时，根节点和其他节点的连接线样式保持统一
    rootLineKeepSameInCurve: true,
    // 曲线连接时，根节点和其他节点的连线起始位置保持统一
    rootLineStartPositionKeepSameInCurve: false,
    // 直线连接时，连线的圆角大小
    lineRadius: props['connect-radius'] || 5,
    // 连线是否显示标记
    showLineMarker: false,
    // 概要连线的粗细
    generalizationLineWidth: props['generalize-connect-width'] || props['connect-width'] || 1,
    // 概要连线的颜色
    generalizationLineColor: props['generalize-connect-color'] || props['connect-color'] || '#549688',
    // 概要曲线距节点的距离
    generalizationLineMargin: props['generalize-margin']?.[1] || 0,
    // 概要节点距节点的距离
    generalizationNodeMargin: props['generalize-margin']?.[0] || 20,
    // 关联线默认状态的粗细
    associativeLineWidth: 2,
    // 关联线默认状态的颜色
    associativeLineColor: props['connect-color'] || 'rgb(51, 51, 51)',
    // 关联线激活状态的粗细
    associativeLineActiveWidth: 8,
    // 关联线激活状态的颜色
    associativeLineActiveColor: 'rgba(2, 167, 240, 1)',
    // 关联线样式
    associativeLineDasharray: '6,4',
    // 关联线文字颜色
    associativeLineTextColor: props['connect-color'] || 'rgb(51, 51, 51)',
    // 关联线文字大小
    associativeLineTextFontSize: 14,
    // 关联线文字行高
    associativeLineTextLineHeight: props['line-height'] || 1.2,
    // 关联线文字字体
    associativeLineTextFontFamily: props['root-font-family'] || '微软雅黑, Microsoft YaHei',
    // 背景颜色
    backgroundColor: props['background'] || '#fafafa',
    // 背景图片
    backgroundImage: 'none',
    // 背景重复
    backgroundRepeat: 'no-repeat',
    // 设置背景图像的起始位置
    backgroundPosition: 'center center',
    // 设置背景图片大小
    backgroundSize: 'cover',
    // 节点使用只有底边横线的样式
    nodeUseLineStyle: false,
    // 根节点样式
    root: convertNodeStyle(props, 'root'),
    // 二级节点样式
    second: convertNodeStyle(props, 'main'),
    // 三级及以下节点样式
    node: convertNodeStyle(props, 'sub'),
    // 概要节点样式
    generalization: convertNodeStyle(props, 'generalize')
  }

  return defaultTheme
}

/**
 * 转换节点样式
 * @param {Object} props - 属性对象
 * @param {String} prefix - 前缀 (root, main, sub, generalize)
 * @returns {Object} 节点样式对象
 */
function convertNodeStyle(props, prefix) {
  const padding = props[`${prefix}-padding`] || [5, 15]
  const margin = props[`${prefix}-margin`]

  // 处理 margin，可能是数字或数组
  let marginX = 50
  let marginY = 0
  if (Array.isArray(margin)) {
    marginY = margin[0] || 0
    marginX = margin[1] || 50
  } else if (typeof margin === 'number') {
    marginX = margin
    marginY = prefix === 'root' ? 30 : prefix === 'main' ? 40 : 0
  } else if (prefix === 'root') {
    marginX = 50
    marginY = 30
  } else if (prefix === 'main') {
    marginX = 100
    marginY = 40
  }

  const shape = convertShape(props[`${prefix}-shape`])
  const fontWeight = props[`${prefix}-font-weight`] || (prefix === 'root' ? 'bold' : 'normal')

  return {
    shape: shape,
    marginX: marginX,
    marginY: marginY,
    fillColor: props[`${prefix}-background`] || (prefix === 'root' ? '#549688' : prefix === 'main' ? '#fff' : 'transparent'),
    fontFamily: props[`${prefix}-font-family`] || '微软雅黑, Microsoft YaHei',
    color: props[`${prefix}-color`] || (prefix === 'root' ? '#fff' : '#565656'),
    fontSize: props[`${prefix}-font-size`] || (prefix === 'root' ? 16 : prefix === 'main' ? 16 : 14),
    fontWeight: fontWeight,
    fontStyle: 'normal',
    borderColor: props[`${prefix}-stroke`] || (prefix === 'root' ? 'transparent' : prefix === 'main' ? '#549688' : 'transparent'),
    borderWidth: props[`${prefix}-stroke-width`] || (prefix === 'root' ? 0 : prefix === 'main' ? 1 : 0),
    borderDasharray: 'none',
    borderRadius: props[`${prefix}-radius`] || 5,
    textDecoration: 'none',
    gradientStyle: false,
    startColor: props[`${prefix}-background`] || '#549688',
    endColor: '#fff',
    startDir: [0, 0],
    endDir: [1, 0],
    lineMarkerDir: 'end',
    hoverRectColor: '',
    hoverRectRadius: props[`${prefix}-radius`] || 5,
    textAlign: 'left',
    imgPlacement: 'top',
    tagPlacement: 'right',
    // 节点特定的 padding
    paddingX: padding[1] || padding[0] || 15,
    paddingY: padding[0] || 5
  }
}

/**
 * 转换形状
 * @param {String} shape - 形状值
 * @returns {String} 转换后的形状
 */
function convertShape(shape) {
  if (!shape || shape === 'default') {
    return 'rectangle'
  }
  // 可以根据需要添加更多映射
  const shapeMap = {
    'default': 'rectangle',
    'rectangle': 'rectangle',
    'diamond': 'diamond',
    'parallelogram': 'parallelogram',
    'roundedRectangle': 'roundedRectangle',
    'octagonalRectangle': 'octagonalRectangle',
    'outerTriangularRectangle': 'outerTriangularRectangle',
    'innerTriangularRectangle': 'innerTriangularRectangle',
    'ellipse': 'ellipse',
    'circle': 'circle'
  }
  return shapeMap[shape] || 'rectangle'
}

/**
 * 转换连接类型
 * @param {String} connectType - 连接类型
 * @returns {String} 转换后的连线风格
 */
function convertConnectType(connectType) {
  if (!connectType) {
    return 'straight'
  }
  // mind-round-angle 可能对应 straight 或 curve
  // 根据实际需求调整
  const typeMap = {
    'mind-round-angle': 'straight', // 圆角直线
    'mind-arc': 'curve2', // 圆弧
    'curve': 'curve',
    'straight': 'straight',
    'direct': 'direct'
  }
  return typeMap[connectType] || 'straight'
}
