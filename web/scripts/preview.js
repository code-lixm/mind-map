const express = require('express')
const path = require('path')
const fs = require('fs')

const app = express()
const port = process.env.PORT || 8080
// 构建输出目录（相对于 web 目录，即项目根目录的 dist）
const distPath = path.resolve(__dirname, '../../dist')
// 项目根目录（用于服务根目录的 index.html）
const rootPath = path.resolve(__dirname, '../../')

// 检查 dist 目录是否存在
if (!fs.existsSync(distPath)) {
  console.error(`\n✗ Error: dist directory not found at ${distPath}`)
  console.error('  Please run "npm run build" first to create the dist directory.\n')
  process.exit(1)
}

// 静态文件服务
// 1. 服务 dist 目录下的静态资源（CSS、JS、图片等）
//    通过 /dist 路径访问，例如 /dist/css/app.css
app.use('/dist', express.static(distPath))
// 2. 服务根目录的静态文件（如 index.html、favicon 等）
app.use(express.static(rootPath))

// 支持 SPA 路由，所有路由都返回 index.html
// 注意：copy.js 会将 dist/index.html 复制到根目录，所以优先使用根目录的 index.html
const rootIndexPath = path.join(rootPath, 'index.html')
const distIndexPath = path.join(distPath, 'index.html')

app.get('*', (req, res) => {
  // 优先使用根目录的 index.html（copy.js 复制后的），如果不存在则使用 dist/index.html
  if (fs.existsSync(rootIndexPath)) {
    res.sendFile(rootIndexPath)
  } else if (fs.existsSync(distIndexPath)) {
    res.sendFile(distIndexPath)
  } else {
    res.status(404).send('index.html not found. Please run "npm run build" first.')
  }
})

app.listen(port, () => {
  console.log(`\n✓ Preview server running at:`)
  console.log(`  http://localhost:${port}\n`)
  console.log('Press Ctrl+C to stop the server\n')
})
