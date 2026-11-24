const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const test = require('node:test')

const options = { semi: false, singleQuote: true }
const bad = 'const value=1\n'
const hash = (source) => createHash('sha256').update(source).digest('hex')
const status = async (source, baselineHash) => {
  const { formatStatus } = await import('../scripts/check-format.mjs')
  return formatStatus(source, 'fixture.js', baselineHash, options)
}

test('format gate accepts properly formatted new files', async () => {
  assert.equal(await status('const value = 1\n'), 'formatted')
})
test('format gate rejects unformatted new files', async () => {
  assert.equal(await status(bad), 'invalid')
})
test('format gate defers only an unchanged legacy file', async () => {
  assert.equal(await status(bad, hash(bad)), 'legacy')
})
test('format gate rejects changed legacy files', async () => {
  assert.equal(await status('const value=2\n', hash(bad)), 'invalid')
})
test('format gate handles Windows checkout endings consistently', async () => {
  assert.equal(await status(bad.replace(/\n/g, '\r\n'), hash(bad)), 'legacy')
})
test('format gate rejects syntax errors even with a matching legacy hash', async () => {
  const invalid = 'const = ;\n'
  assert.equal(await status(invalid, hash(invalid)), 'invalid')
})
