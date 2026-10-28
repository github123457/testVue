'use strict'

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const BAOBIAO_PATH = path.resolve(__dirname, '../../../baobiao.html')
const html = fs.readFileSync(BAOBIAO_PATH, 'utf8')

function inlineScript (source) {
  const matched = source.match(/<script>([\s\S]*?)<\/script>/i)
  return matched ? matched[1] : ''
}

function runInlineScript (source, overrides) {
  overrides = overrides || {}
  const rows = []
  const elements = new Map()
  const children = []

  const tbodyEl = {
    id: 'tableBody',
    children: [],
    appendChild (tr) { this.children.push(tr) }
  }
  const genTimeEl = { id: 'genTime', textContent: '' }

  const document = {
    getElementById (id) {
      if (id === 'tableBody') return tbodyEl
      if (id === 'genTime') return genTimeEl
      if (!elements.has(id)) {
        elements.set(id, { id, textContent: '', innerHTML: '' })
      }
      return elements.get(id)
    },
    createElement (tag) {
      const el = {
        tagName: tag,
        innerHTML: '',
        children: [],
        appendChild (c) { this.children.push(c) }
      }
      children.push(el)
      return el
    }
  }

  const fakeDate = overrides.date || new Date('2026-06-15T10:30:45')
  function FakeDate (arg) {
    if (arg !== undefined) return new Date(arg)
    return fakeDate
  }
  FakeDate.now = function () { return fakeDate.getTime() }
  FakeDate.prototype = Date.prototype

  const context = vm.createContext({
    document,
    Date: FakeDate,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  })
  vm.runInContext(source, context)
  return { elements, tbodyEl, children, genTimeEl }
}

const vm = require('node:vm')

test('baobiao.html 位于仓库根目录且为纯静态实现', () => {
  assert.ok(fs.existsSync(BAOBIAO_PATH), 'baobiao.html 应存在于仓库根目录')
  assert.match(html, /<title>数据报表<\/title>/)
  assert.doesNotMatch(html, /<script[^>]+\bsrc=/i, '不允许引入外部脚本')
  assert.doesNotMatch(html, /<link[^>]+\bhref=["']https?:/i, '不允许引入外部样式')
})

test('页面包含报表标题、汇总卡片和数据表格', () => {
  assert.match(html, /id=["']reportTitle["']/, '应有报表标题')
  assert.match(html, /销售数据报表/, '标题文字应包含"销售数据报表"')
  assert.match(html, /id=["']summaryCards["']/, '应有汇总卡片区域')
  assert.match(html, /id=["']dataTable["']/, '应有数据表格')
  assert.match(html, /<th>月份<\/th>/, '表格应含月份列')
  assert.match(html, /<th>销售额<\/th>/, '表格应含销售额列')
  assert.match(html, /<th>订单数<\/th>/, '表格应含订单数列')
  assert.match(html, /<th>占比<\/th>/, '表格应含占比列')
})

test('汇总卡片展示总销售额、订单数、客单价和退款率', () => {
  assert.match(html, /总销售额/)
  assert.match(html, /订单数/)
  assert.match(html, /客单价/)
  assert.match(html, /退款率/)
  assert.match(html, /id=["']totalSales["']/)
  assert.match(html, /id=["']totalOrders["']/)
  assert.match(html, /id=["']avgPrice["']/)
  assert.match(html, /id=["']refundRate["']/)
})

test('内联脚本动态填充表格行', () => {
  const script = inlineScript(html)
  assert.ok(script.trim(), '页面应包含内联脚本')
  assert.match(script, /getElementById\s*\(\s*['"]tableBody['"]\s*\)/, '脚本应获取 tableBody')
  assert.match(script, /createElement\s*\(\s*['"]tr['"]\s*\)/, '脚本应创建 tr 元素')

  const { tbodyEl, genTimeEl } = runInlineScript(script)
  assert.ok(tbodyEl.children.length > 0, '表格应填充数据行')

  const firstRow = tbodyEl.children[0]
  assert.match(firstRow.innerHTML, /1月/, '首行应包含1月')
  assert.match(firstRow.innerHTML, /¥/, '行内应包含金额符号')

  const totalSales = tbodyEl.children.reduce(function (sum, tr) {
    const m = tr.innerHTML.match(/¥([\d,]+)/)
    return sum + (m ? parseInt(m[1].replace(/,/g, ''), 10) : 0)
  }, 0)
  assert.ok(totalSales > 0, '各月销售额合计应大于 0')

  assert.ok(genTimeEl.textContent, '应填充生成时间')
  assert.match(genTimeEl.textContent, /2026-06-15/, '生成时间应使用当前日期')
})

test('表格行数与数据条数一致且占比之和约等于 100%', () => {
  const script = inlineScript(html)
  const { tbodyEl } = runInlineScript(script)

  const dataCount = 6
  assert.strictEqual(tbodyEl.children.length, dataCount, '应生成 6 行数据')

  let pctSum = 0
  tbodyEl.children.forEach(function (tr) {
    const m = tr.innerHTML.match(/>([\d.]+)%<\/span>/)
    if (m) pctSum += parseFloat(m[1])
  })
  assert.ok(Math.abs(pctSum - 100) < 1, '各月占比之和应接近 100%，实际为 ' + pctSum)
})
