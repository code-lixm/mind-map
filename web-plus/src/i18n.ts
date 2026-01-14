import { createI18n } from 'vue-i18n'
import messages from './lang'

const i18n = createI18n({
  legacy: false,
  locale: 'zh_cn',
  fallbackLocale: 'zh_cn',
  messages
})

export default i18n
