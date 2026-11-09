/**
 * Static checks of every generated project, for every built-in example and stack: the files a project
 * imports exist, the contract it ships is the contract of the API, and every resource is wired in.
 * Running the projects with their real tools is the job of verification/ (Docker).
 */
import { describe, expect, it } from 'vitest'
import { FRAMEWORKS, databasesFor, type ProjectSettings } from '../compatibility/stack.ts'
import { openApiYaml } from '../openapi/build.ts'
import { example } from '../test/fixtures.ts'
import { findGenerator, generateProject } from './registry.ts'

const EXAMPLES = ['store', 'library', 'catalog'] as const

/** Every stack a framework offers, with the first database of each persistence. */
function stacks(): Partial<ProjectSettings>[] {
  const result: Partial<ProjectSettings>[] = []
  for (const framework of FRAMEWORKS) {
    if (!findGenerator(framework.id)) continue
    for (const architecture of framework.architectures) {
      for (const persistence of framework.persistence) {
        for (const auth of framework.auth) {
          result.push({
            framework: framework.id,
            architecture,
            persistence: persistence.id,
            database: databasesFor(framework.id, persistence.id)[0] ?? null,
            auth,
          })
        }
      }
    }
  }
  return result
}

/** Python modules a project imports from itself (`from app.x.y import …`, `from tests.helpers import …`). */
function pythonImports(content: string): string[] {
  return [...content.matchAll(/^from ((?:app|tests)(?:\.\w+)*) import/gm)].map((match) => match[1])
}

describe('generated projects', () => {
  for (const settings of stacks()) {
    const label = Object.values(settings).join(' / ')
    it(`imports only files it contains: ${label}`, () => {
      for (const id of EXAMPLES) {
        const { spec, settings: resolved } = example(id, settings)
        const files = generateProject(spec, resolved)
        const paths = new Set(files.map((file) => file.path))
        for (const file of files.filter((item) => item.path.endsWith('.py'))) {
          for (const module of pythonImports(file.content)) {
            const path = module.replace(/\./g, '/')
            expect(paths.has(`${path}.py`) || paths.has(`${path}/__init__.py`), `${id}: ${file.path} imports ${module}`).toBe(true)
          }
        }
      }
    })
  }

  it('ships the contract of the API and wires every resource', () => {
    for (const id of EXAMPLES) {
      const { spec, settings } = example(id, { framework: 'fastapi' })
      const files = generateProject(spec, settings)
      expect(files.find((file) => file.path === 'openapi.yaml')!.content).toBe(openApiYaml(spec, findGenerator('fastapi')!.serverUrl))
      const main = files.find((file) => file.path === 'app/main.py')!.content
      for (const resource of spec.resources)
        expect(main).toContain(`include_router(${resource.name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_router)`)
      expect(files.map((file) => file.path)).toEqual([...files.map((file) => file.path)].sort((a, b) => a.localeCompare(b)))
    }
  })

  it('keeps secrets out of the project: only placeholders in .env.example', () => {
    const { spec, settings } = example('store', { framework: 'fastapi', auth: 'jwt', persistence: 'sqlalchemy', database: 'postgresql' })
    const env = generateProject(spec, settings).find((file) => file.path === '.env.example')!.content
    expect(env).toMatch(/^JWT_SECRET=$/m)
    expect(env).toContain('change-me')
  })
})
