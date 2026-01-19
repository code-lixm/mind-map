<template>
  <div class="imgUploadContainer">
    <div class="imgUploadPanel">
      <div class="upBtn" v-if="!value">
        <label
          for="imgUploadInput"
          class="imgUploadInputArea"
          @dragenter.stop.prevent
          @dragover.stop.prevent
          @drop.stop.prevent="onDrop"
          >点击此处选择图片、或拖动图片到此</label
        >
        <input
          type="file"
          accept="image/*"
          id="imgUploadInput"
          @change="onImgUploadInputChange"
        />
      </div>
      <div v-if="value" class="uploadInfoBox">
        <div
          class="previewBox"
          :style="{ backgroundImage: `url('${value}')` }"
        ></div>
        <span class="delBtn el-icon-close" @click="deleteImg"></span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  model: {
    prop: 'value',
    event: 'change'
  },
  props: {
    value: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      file: null
    }
  },
  methods: {
    // 图片选择事件
    onImgUploadInputChange(e) {
      let file = e.target.files[0]
      this.selectImg(file)
    },

    // 拖动上传图片
    onDrop(e) {
      let dt = e.dataTransfer
      let file = dt.files && dt.files[0]
      this.selectImg(file)
    },

    // 选择图片
    selectImg(file) {
      this.file = file
      let fr = new FileReader()
      fr.readAsDataURL(file)
      fr.onload = e => {
        this.$emit('change', e.target.result)
      }
    },

    // 获取图片大小
    getSize() {
      return new Promise(resolve => {
        let img = new Image()
        img.src = this.value
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height
          })
        }
        img.onerror = () => {
          resolve({
            width: 0,
            height: 0
          })
        }
      })
    },

    // 删除图片
    deleteImg() {
      this.$emit('change', '')
      this.file = null
    }
  }
}
</script>

<style lang="scss" scoped>
.imgUploadContainer {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 1000;

  .imgUploadPanel {
    position: relative;
    width: 100%;
    font-size: 22px;
    white-space: nowrap;
    color: #909090;
    cursor: default;
    user-select: none;

    .title {
      margin-bottom: 15px;
      font-size: 22px;
      font-weight: 700;
      color: hsla(218, 9%, 51%, 0.8);
    }

    .closeBtn {
      position: absolute;
      right: 25px;
      top: 32px;
      cursor: pointer;
    }

    .imgUploadInputArea {
      display: block;
      width: 100%;
      height: 200px;
      font-size: 20px;
      color: rgba(51, 51, 51, 0.4);
      background-color: hsla(0, 0%, 87%, 0.6);
      border: none;
      outline: none;
      cursor: pointer;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      white-space: normal;
      padding: 10px;
    }

    #imgUploadInput {
      display: none;
    }

    .uploadInfoBox {
      position: relative;
      width: 100%;
      height: 200px;
      background-color: hsla(0, 0%, 87%, 0.6);

      .previewBox {
        width: 100%;
        height: 100%;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }

      .delBtn {
        position: absolute;
        right: 0px;
        top: 0px;
        cursor: pointer;
        width: 20px;
        height: 20px;
        background-color: #fff;
      }
    }
  }
}
</style>
