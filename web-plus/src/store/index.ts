import { defineStore } from 'pinia'
import { storeLocalConfig } from '@/api'

export const useMainStore = defineStore('main', {
  state: () => ({
    isHandleLocalFile: false,
    localConfig: {
      isZenMode: false,
      openNodeRichText: true,
      useLeftKeySelectionRightKeyDrag: false,
      isShowScrollbar: false,
      isDark: false,
      enableAi: true
    },
    activeSidebar: '',
    isOutlineEdit: false,
    isReadonly: false,
    isSourceCodeEdit: false,
    extraTextOnExport: '',
    isDragOutlineTreeNode: false,
    aiConfig: {
      api: 'http://ark.cn-beijing.volces.com/api/v3/chat/completions',
      key: '',
      model: '',
      port: 3456,
      method: 'POST'
    },
    extendThemeGroupList: [] as any[],
    bgList: [] as any[]
  }),
  actions: {
    setIsHandleLocalFile(data: boolean) {
      this.isHandleLocalFile = data
    },
    setLocalConfig(data: any) {
      const aiConfigKeys = Object.keys(this.aiConfig)
      Object.keys(data).forEach(key => {
        if (aiConfigKeys.includes(key)) {
          (this.aiConfig as any)[key] = data[key]
        } else {
          (this.localConfig as any)[key] = data[key]
        }
      })
      storeLocalConfig({
        ...this.localConfig,
        ...this.aiConfig
      })
    },
    setActiveSidebar(data: string) {
      this.activeSidebar = data
    },
    setIsOutlineEdit(data: boolean) {
      this.isOutlineEdit = data
    },
    setIsReadonly(data: boolean) {
      this.isReadonly = data
    },
    setIsSourceCodeEdit(data: boolean) {
      this.isSourceCodeEdit = data
    },
    setExtraTextOnExport(data: string) {
      this.extraTextOnExport = data
    },
    setIsDragOutlineTreeNode(data: boolean) {
      this.isDragOutlineTreeNode = data
    },
    setExtendThemeGroupList(data: any[]) {
      this.extendThemeGroupList = data
    },
    setBgList(data: any[]) {
      this.bgList = data
    }
  }
})
