const path = require('path')
const fs = require('fs')

// 将 traversalWorker.js 复制到 dist 目录
const sourceFile = path.resolve(__dirname, '../src/utils/traversalWorker.js')
const targetDir = path.resolve(__dirname, '../dist')
const targetFile = path.join(targetDir, 'traversalWorker.js')

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

// 复制文件
try {
  fs.copyFileSync(sourceFile, targetFile)
  console.log(`✓ Worker file copied to: ${targetFile}`)
} catch (error) {
  console.error(`✗ Failed to copy worker file:`, error)
  process.exit(1)
}
