/** The deploy step that gives each page its own index.html must list every route in src/App.tsx. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('every page gets a copy of index.html, so a direct link answers 200, not 404', () => {
  const routes = [...readFileSync('src/App.tsx', 'utf8').matchAll(/path: '([a-z-]+)'/g)].map(
    (m) => m[1],
  )
  const workflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8')
  const copied = workflow.match(/for page in ([a-z -]+); do/)?.[1].split(' ') ?? []
  assert.deepEqual([...copied].sort(), [...routes].sort())
})
