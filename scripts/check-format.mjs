import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import * as prettier from 'prettier'

export async function formatStatus(source, file, baselineHash, options = {}) {
  const normalized = source.replace(/\r\n/g, '\n')
  try {
    if (await prettier.check(normalized, { ...options, filepath: file })) return 'formatted'
    const hash = createHash('sha256').update(normalized).digest('hex')
    return baselineHash === hash ? 'legacy' : 'invalid'
  } catch {
    return 'invalid'
  }
}

async function main() {
  const baseline = JSON.parse(readFileSync('.format-baseline.json', 'utf8'))
  const paths = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      encoding: 'utf8',
    },
  )
    .split('\0')
    .filter(Boolean)
  const failures = []
  let checked = 0
  let legacy = 0

  for (const file of new Set(paths)) {
    if (!existsSync(file)) continue
    const info = await prettier.getFileInfo(file, { ignorePath: '.prettierignore' })
    if (info.ignored || !info.inferredParser) continue
    checked++
    const options = (await prettier.resolveConfig(file)) ?? {}
    const status = await formatStatus(
      readFileSync(file, 'utf8'),
      file,
      baseline.files[file],
      options,
    )
    if (status === 'legacy') legacy++
    if (status === 'invalid') failures.push(file)
  }

  console.log(`Format: ${checked} files checked; ${legacy} unchanged legacy files deferred.`)
  if (failures.length) {
    console.error('Format these files with prettier --write; do not refresh the legacy baseline:')
    for (const file of failures) console.error(`  ${file}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
