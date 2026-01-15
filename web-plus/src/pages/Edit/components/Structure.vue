<script setup lang="ts">
import type { LocaleTextProvider } from '../types'
import { computed, inject, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Sidebar from './Sidebar.vue'
import { layoutImgMap } from '@/config/constant'
import { useEditorState } from '@/composables/useEditorState'
import { layoutGroupList as layoutGroupListConfig } from '@/config'

interface Props {
  mindMap: any
}

const props = defineProps<Props>()

const localeText = inject<LocaleTextProvider>('localeText')!
const editorStore = useEditorState()
const { isDark, activeSidebar } = storeToRefs(editorStore)
const { setActiveSidebar } = editorStore

const sidebar = ref<InstanceType<typeof Sidebar> | null>(null)
const layout = ref('')

const layoutGroupList = computed(() => {
  // 直接使用中文配置
  return layoutGroupListConfig.map((group: any) => {
    const list = [...group.list].filter((item: string) => {
      return !['rightFishbone', 'rightFishbone2'].includes(item)
    })
    return {
      name: group.name,
      list,
    }
  })
})

watch(activeSidebar, (val) => {
  if (val === 'structure') {
    layout.value = props.mindMap.getLayout()
    sidebar.value.show = true
  }
  else {
    sidebar.value.show = false
  }
})

function useLayout(layoutType: string) {
  layout.value = layoutType
  props.mindMap.setLayout(layoutType)
}
</script>

<template>
  <Sidebar
    ref="sidebar"
    :title="localeText('strusture.title')"
    @update:active-sidebar="setActiveSidebar"
  >
    <div class="layoutGroupList" :class="{ isDark }">
      <div
        v-for="group in layoutGroupList"
        :key="group.name"
        class="laytouGroup"
      >
        <div class="groupName">
          {{ group.name }}
        </div>
        <div class="layoutList">
          <div
            v-for="item in group.list"
            :key="item"
            class="layoutItem"
            :class="{ active: item === layout }"
            @click="useLayout(item)"
          >
            <img :src="layoutImgMap[item]" alt="">
          </div>
        </div>
      </div>
    </div>
  </Sidebar>
</template>

<style lang="scss" scoped>
.layoutGroupList {
  width: 100%;
  padding: 20px;
  overflow-x: hidden;

  &.isDark {
    .laytouGroup {
      .groupName {
        color: #fff;
      }
    }
  }

  .laytouGroup {
    width: 100%;
    margin-bottom: 12px;

    .groupName {
      font-weight: 500;
      color: #303133;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .layoutList {
      width: 100%;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;

      .layoutItem {
        width: calc(50% - 6px);
        height: 70px;
        cursor: pointer;
        border: 1px solid #e9e9e9;
        transition: all 0.2s;
        overflow: hidden;
        margin-bottom: 0;
        padding: 5px;
        border-radius: 5px;
        box-sizing: border-box;

        &:hover {
          box-shadow:
            0 1px 2px -2px rgba(0, 0, 0, 0.16),
            0 3px 6px 0 rgba(0, 0, 0, 0.12),
            0 5px 12px 4px rgba(0, 0, 0, 0.09);
        }

        &.active {
          border: 1px solid var(--el-color-primary);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
  }
}
</style>
