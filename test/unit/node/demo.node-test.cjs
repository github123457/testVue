'use strict'

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const DEMO_PATH = path.resolve(__dirname, '../../../demo.html')
const html = fs.readFileSync(DEMO_PATH, 'utf8')

function inlineScript (source) {
  const matched = source.match(/<script>([\s\S]*?)<\/script>/i)
  return matched ? matched[1] : ''
}

function runInlineScript (source) {
  const alerts = []
  const elements = new Map()
  const document = {
    getElementById (id) {
      if (!elements.has(id)) {
        elements.set(id, {
          id,
          handlers: {},
          addEventListener (type, handler) {
            this.handlers[type] = handler
          },
          fire (type) {
            if (this.handlers[type]) this.handlers[type]()
          }
        })
      }
      return elements.get(id)
    }
  }
  const context = vm.createContext({ document, alert: message => alerts.push(message) })
  vm.runInContext(source, context)
  return { alerts, elements, document }
}

test('demo.html 位于仓库根目录且为纯原生实现', () => {
  assert.ok(fs.existsSync(DEMO_PATH), 'demo.html 应存在于仓库根目录')
  assert.match(html, /<title>AutoWonder 测试页<\/title>/)
  assert.doesNotMatch(html, /<script[^>]+\bsrc=/i, '不允许引入外部脚本')
  assert.doesNotMatch(html, /<link[^>]+\bhref=["']https?:/i, '不允许引入外部样式')
})

test('页面包含居中文字、下方按钮和内联美化样式', () => {
  assert.match(html, /Hello, AutoWonder!/, '应显示问候文字')
  assert.match(html, />\s*点击我\s*</, '按钮文字应为“点击我”')
  assert.ok(
    html.indexOf('Hello, AutoWonder!') < html.indexOf('点击我'),
    '按钮应位于文字下方'
  )
  const style = (html.match(/<style>([\s\S]*?)<\/style>/i) || [])[1] || ''
  assert.match(style, /font-size:\s*24px/, '文字字号 24px')
  assert.match(style, /text-align:\s*center|align-items:\s*center/, '内容居中')
  assert.match(style, /border-radius:/, '按钮圆角')
  assert.match(style, /background:/, '按钮背景色')
})

test('点击按钮弹出“按钮被点击了！”', () => {
  const script = inlineScript(html)
  assert.ok(script.trim(), '页面应包含内联脚本')
  const { alerts, elements } = runInlineScript(script)
  const buttonId = (script.match(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/) || [])[1]
  assert.ok(buttonId, '脚本应通过 getElementById 绑定按钮')
  assert.match(html, new RegExp(`id=["']${buttonId}["']`), '脚本绑定的 id 必须真实存在于页面')
  elements.get(buttonId).fire('click')
  assert.deepStrictEqual(alerts, ['按钮被点击了！'])
})

test('非点击事件不弹出提示，重复点击仍走同一提示', () => {
  const { alerts, elements } = runInlineScript(inlineScript(html))
  const buttonId = inlineScript(html).match(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/)[1]
  const button = elements.get(buttonId)
  button.fire('keydown')
  assert.deepStrictEqual(alerts, [], '未点击时不应弹出提示')
  button.fire('click')
  button.fire('click')
  assert.deepStrictEqual(alerts, ['按钮被点击了！', '按钮被点击了！'], '每次点击都提示一次')
})
