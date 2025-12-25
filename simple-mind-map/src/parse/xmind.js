import JSZip from 'jszip'
import xmlConvert from 'xml-js'
import { v4 as uuid } from 'uuid'
import { getTextFromHtml, isUndef } from '../utils/index'
import {
  getSummaryText,
  getSummaryText2,
  getRoot,
  getItemByName,
  getElementsByType,
  addSummaryData,
  handleNodeImageFromXmind,
  handleNodeImageToXmind,
  getXmindContentXmlData,
  parseNodeGeneralizationToXmind,
  buildXmindStyleMap,
  applyXmindStyleToNodeData,
  createTopicStyleFromNodeData
} from '../utils/xmind'

//  解析.xmind文件
const parseXmindFile = (file, handleMultiCanvas) => {
  return new Promise((resolve, reject) => {
    JSZip.loadAsync(file).then(
      async zip => {
        try {
          let content = ''
          let jsonFile = zip.files['content.json']
          let xmlFile = zip.files['content.xml'] || zip.files['/content.xml']
          if (jsonFile) {
            let json = await jsonFile.async('string')
            content = await transformXmind(json, zip.files, handleMultiCanvas)
          } else if (xmlFile) {
            let xml = await xmlFile.async('string')
            let json = xmlConvert.xml2json(xml)
            content = transformOldXmind(json)
          }
          if (content) {
            resolve(content)
          } else {
            reject(new Error('解析失败'))
          }
        } catch (error) {
          reject(error)
        }
      },
      e => {
        reject(e)
      }
    )
  })
}

const buildAssociativeLineRelationships = nodeDataList => {
  if (!Array.isArray(nodeDataList) || nodeDataList.length === 0) {
    return []
  }
  const existingIds = new Set()
  nodeDataList.forEach(item => {
    if (item && item.uid) {
      existingIds.add(item.uid)
    }
  })
  const relationships = []
  nodeDataList.forEach(item => {
    if (!item || !item.uid) return
    const targets = Array.isArray(item.associativeLineTargets)
      ? item.associativeLineTargets
      : []
    if (targets.length === 0) return
    const textMap =
      item.associativeLineText && typeof item.associativeLineText === 'object'
        ? item.associativeLineText
        : {}
    const appendedTargets = new Set()
    targets.forEach(targetId => {
      if (
        !targetId ||
        targetId === item.uid ||
        appendedTargets.has(targetId) ||
        !existingIds.has(targetId)
      ) {
        return
      }
      appendedTargets.add(targetId)
      const textValue = textMap[targetId]
      const hasEditedText =
        typeof textValue === 'string' && textValue.trim() !== ''
      const relationship = {
        id: uuid(),
        end1Id: item.uid,
        end2Id: targetId,
        titleUnedited: !hasEditedText
      }
      if (hasEditedText) {
        relationship.title = textValue
      }
      relationships.push(relationship)
    })
  })
  return relationships
}

const applyRelationshipsFromXmind = (relationships, idToNode) => {
  if (!Array.isArray(relationships) || relationships.length === 0) return
  relationships.forEach(item => {
    if (!item || !item.end1Id || !item.end2Id) return
    const fromNode = idToNode.get(item.end1Id)
    const toNode = idToNode.get(item.end2Id)
    if (
      !fromNode ||
      !toNode ||
      !fromNode.data ||
      !toNode.data ||
      !fromNode.data.uid ||
      !toNode.data.uid ||
      fromNode.data.uid === toNode.data.uid
    ) {
      return
    }
    if (!Array.isArray(fromNode.data.associativeLineTargets)) {
      fromNode.data.associativeLineTargets = []
    }
    const targetUid = toNode.data.uid
    if (!fromNode.data.associativeLineTargets.includes(targetUid)) {
      fromNode.data.associativeLineTargets.push(targetUid)
    }
    const hasCustomTitle =
      typeof item.title === 'string' && item.title.trim() && !item.titleUnedited
    if (hasCustomTitle) {
      if (!fromNode.data.associativeLineText) {
        fromNode.data.associativeLineText = {}
      }
      fromNode.data.associativeLineText[targetUid] = item.title.trim()
    }
  })
}

//  转换xmind数据
const transformXmind = async (content, files, handleMultiCanvas) => {
  content = JSON.parse(content)
  let data = null
  if (content.length > 1 && typeof handleMultiCanvas === 'function') {
    data = await handleMultiCanvas(content)
  }
  if (!data) {
    data = content[0]
  }
  const nodeTree = data.rootTopic
  const stylesMap = buildXmindStyleMap(data.styles)
  const newTree = {}
  const idToNode = new Map()
  const waitLoadImageList = []
  const walk = async (node, newNode) => {
    const nodeId = node.id || node.topicId
    newNode.data = {
      // 节点内容
      text: isUndef(node.title) ? '' : node.title,
      uid: nodeId
    }
    // 节点备注
    if (node.notes) {
      const notesData = node.notes.realHTML || node.notes.plain
      newNode.data.note = notesData ? notesData.content || '' : ''
    }
    // 超链接
    if (node.href && /^https?:\/\//.test(node.href)) {
      newNode.data.hyperlink = node.href
    }
    // 标签
    if (node.labels && node.labels.length > 0) {
      newNode.data.tag = node.labels
    }
    // 图片
    handleNodeImageFromXmind(node, newNode, waitLoadImageList, files)
    // 样式
    applyXmindStyleToNodeData(node, newNode.data, stylesMap)
    if (nodeId) {
      idToNode.set(nodeId, newNode)
    }
    // 概要
    const selfSummary = []
    const childrenSummary = []
    if (newNode._summary) {
      selfSummary.push(newNode._summary)
    }
    if (Array.isArray(node.summaries) && node.summaries.length > 0) {
      node.summaries.forEach(item => {
        addSummaryData(
          selfSummary,
          childrenSummary,
          () => {
            return getSummaryText(node, item.topicId)
          },
          item.range
        )
      })
    }
    newNode.data.generalization = selfSummary
    // 子节点
    newNode.children = []
    if (
      node.children &&
      node.children.attached &&
      node.children.attached.length > 0
    ) {
      node.children.attached.forEach((item, index) => {
        const newChild = {}
        newNode.children.push(newChild)
        if (childrenSummary[index]) {
          newChild._summary = childrenSummary[index]
        }
        walk(item, newChild)
      })
    }
  }
  walk(nodeTree, newTree)
  await Promise.all(waitLoadImageList)
  applyRelationshipsFromXmind(data.relationships, idToNode)
  return newTree
}

//  转换旧版xmind数据，xmind8
const transformOldXmind = content => {
  const data = JSON.parse(content)
  const elements = data.elements
  const root = getRoot(elements)
  const newTree = {}
  const walk = (node, newNode) => {
    const nodeElements = node.elements
    let nodeTitle = getItemByName(nodeElements, 'title')
    nodeTitle = nodeTitle && nodeTitle.elements && nodeTitle.elements[0].text
    // 节点内容
    newNode.data = {
      text: isUndef(nodeTitle) ? '' : nodeTitle
    }
    // 节点备注
    try {
      const notesElement = getItemByName(nodeElements, 'notes')
      if (notesElement) {
        newNode.data.note =
          notesElement.elements[0].elements[0].elements[0].text
      }
    } catch (error) {
      console.log(error)
    }
    // 超链接
    try {
      if (
        node.attributes &&
        node.attributes['xlink:href'] &&
        /^https?:\/\//.test(node.attributes['xlink:href'])
      ) {
        newNode.data.hyperlink = node.attributes['xlink:href']
      }
    } catch (error) {
      console.log(error)
    }
    // 标签
    try {
      const labelsElement = getItemByName(nodeElements, 'labels')
      if (labelsElement) {
        newNode.data.tag = labelsElement.elements.map(item => {
          return item.elements[0].text
        })
      }
    } catch (error) {
      console.log(error)
    }
    const childrenItem = getItemByName(nodeElements, 'children')
    // 概要
    const selfSummary = []
    const childrenSummary = []
    try {
      if (newNode._summary) {
        selfSummary.push(newNode._summary)
      }
      const summariesItem = getItemByName(nodeElements, 'summaries')
      if (
        summariesItem &&
        Array.isArray(summariesItem.elements) &&
        summariesItem.elements.length > 0
      ) {
        summariesItem.elements.forEach(item => {
          addSummaryData(
            selfSummary,
            childrenSummary,
            () => {
              return getSummaryText2(childrenItem, item.attributes['topic-id'])
            },
            item.attributes.range
          )
        })
      }
    } catch (error) {
      console.log(error)
    }
    newNode.data.generalization = selfSummary
    // 子节点
    newNode.children = []
    if (
      childrenItem &&
      childrenItem.elements &&
      childrenItem.elements.length > 0
    ) {
      const children = getElementsByType(childrenItem.elements, 'attached')
      ;(children || []).forEach((item, index) => {
        const newChild = {}
        newNode.children.push(newChild)
        if (childrenSummary[index]) {
          newChild._summary = childrenSummary[index]
        }
        walk(item, newChild)
      })
    }
  }
  walk(root, newTree)
  return newTree
}

// 数据转换为xmind文件
// 直接转换为最新版本的xmind文件 2023.09.11172
const transformToXmind = async (data, name) => {
  const id = 'simpleMindMap_' + Date.now()
  const imageList = []
  // 转换核心数据
  let newTree = {}
  let waitLoadImageList = []
  const nodeDataList = []
  let walk = async (node, newNode, isRoot) => {
    if (node && node.data) {
      nodeDataList.push(node.data)
    }
    let newData = {
      id: node.data.uid,
      structureClass: 'org.xmind.ui.logic.right',
      title: getTextFromHtml(node.data.text), // 节点文本
      children: {
        attached: []
      }
    }
    // 备注
    if (node.data.note !== undefined) {
      newData.notes = {
        realHTML: {
          content: node.data.note
        },
        plain: {
          content: node.data.note
        }
      }
    }
    // 超链接
    if (node.data.hyperlink !== undefined) {
      newData.href = node.data.hyperlink
    }
    // 标签
    if (node.data.tag !== undefined) {
      newData.labels = (node.data.tag || []).map(item => {
        return typeof item === 'object' && item !== null ? item.text : item
      })
    }
    // 图片
    handleNodeImageToXmind(node, newNode, waitLoadImageList, imageList)
    // 样式
    const topicStyle = createTopicStyleFromNodeData(node.data)
    if (topicStyle && topicStyle.properties) {
      newData.style = {
        properties: topicStyle.properties
      }
    }
    if (isRoot) {
      newData.class = 'topic'
      newNode.id = id
      newNode.class = 'sheet'
      newNode.title = name
      newNode.extensions = []
      newNode.topicPositioning = 'fixed'
      newNode.topicOverlapping = 'overlap'
      newNode.coreVersion = '2.100.0'
      newNode.rootTopic = {
        ...newData
      }
    } else {
      Object.keys(newData).forEach(key => {
        newNode[key] = newData[key]
      })
    }
    // 概要
    const { summary, summaries } = parseNodeGeneralizationToXmind(node)
    if (isRoot) {
      if (summaries.length > 0) {
        newNode.rootTopic.children.summary = summary
        newNode.rootTopic.summaries = summaries
      }
    } else {
      if (summaries.length > 0) {
        newNode.children.summary = summary
        newNode.summaries = summaries
      }
    }
    // 子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        let newChild = {}
        walk(child, newChild)
        newData.children.attached.push(newChild)
      })
    }
  }
  walk(data, newTree, true)
  await Promise.all(waitLoadImageList)
  newTree.relationships = buildAssociativeLineRelationships(nodeDataList)
  const contentData = [newTree]
  // 创建压缩包
  const zip = new JSZip()
  zip.file('content.json', JSON.stringify(contentData))
  zip.file(
    'metadata.json',
    `{"modifier":"","dataStructureVersion":"2","creator":{"name":"mind-map"},"layoutEngineVersion":"3","activeSheetId":"${id}"}`
  )
  zip.file('content.xml', getXmindContentXmlData())
  const manifestData = {
    'file-entries': {
      'content.json': {},
      'metadata.json': {},
      'Thumbnails/thumbnail.png': {}
    }
  }
  // 图片
  if (imageList.length > 0) {
    imageList.forEach(item => {
      manifestData['file-entries']['resources/' + item.name] = {}
      const img = zip.folder('resources')
      img.file(item.name, item.data, { base64: true })
    })
  }
  zip.file('manifest.json', JSON.stringify(manifestData))
  const zipData = await zip.generateAsync({ type: 'blob' })
  return zipData
}

export default {
  parseXmindFile,
  transformXmind,
  transformOldXmind,
  transformToXmind
}
