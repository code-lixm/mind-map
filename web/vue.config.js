const path = require('path')
const crypto = require('crypto')

// Node.js 17+ (OpenSSL 3) removed support for the legacy md4 hash that webpack
// 4/terser-webpack-plugin still request. Fall back to md5 so builds don't crash.
const originalCreateHash = crypto.createHash
try {
  originalCreateHash('md4')
} catch (error) {
  crypto.createHash = (algorithm, options) => {
    const safeAlgorithm = algorithm === 'md4' ? 'md5' : algorithm
    return originalCreateHash.call(crypto, safeAlgorithm, options)
  }
}
const isDev = process.env.NODE_ENV === 'development'
const isLibrary = process.env.NODE_ENV === 'library'

const WebpackDynamicPublicPathPlugin = require('webpack-dynamic-public-path')

module.exports = {
  publicPath: isDev ? '' : './dist',
  outputDir: '../dist',
  lintOnSave: false,
  productionSourceMap: false,
  filenameHashing: false,
  transpileDependencies: ['yjs', 'lib0', 'quill', 'simple-mind-map'],
  chainWebpack: config => {
    // 移除 preload 插件
    config.plugins.delete('preload')
    // 移除 prefetch 插件
    config.plugins.delete('prefetch')
    // 支持运行时设置public path
    if (!isDev) {
      config
        .plugin('dynamicPublicPathPlugin')
        .use(WebpackDynamicPublicPathPlugin, [
          { externalPublicPath: 'window.externalPublicPath' }
        ])
    }
    // 给插入html页面内的js和css添加hash参数
    if (!isLibrary) {
      config.plugin('html').tap(args => {
        args[0].hash = true
        return args
      })
    }
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/'),
        'simple-mind-map': path.resolve(__dirname, '../simple-mind-map')
      },
      modules: [
        'node_modules',
        path.resolve(__dirname, '../simple-mind-map')
      ]
    }
  },
  devServer: {
    proxy: {
      '^/api/v3/': {
        target: 'http://ark.cn-beijing.volces.com',
        changeOrigin: true
      }
    }
  }
}
