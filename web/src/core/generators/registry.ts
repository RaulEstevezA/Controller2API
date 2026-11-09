/**
 * Registry of the framework generators (Registry pattern). To support a new framework, write its
 * generator (common/types.ts), add it to `GENERATORS` and describe its options in compatibility/stack.ts.
 */
import type { ApiSpec } from '../api/spec.ts'
import type { FrameworkId, ProjectSettings } from '../compatibility/stack.ts'
import { openApiYaml } from '../openapi/build.ts'
import type { GeneratedFile, Generator } from './common/types.ts'
import { expressGenerator } from './frameworks/express/index.ts'
import { fastApiGenerator } from './frameworks/fastapi/index.ts'

const GENERATORS: Partial<Record<FrameworkId, Generator>> = {
  fastapi: fastApiGenerator,
  express: expressGenerator,
}

/** The generator of a framework, or undefined while it is not written. */
export function findGenerator(framework: FrameworkId): Generator | undefined {
  return GENERATORS[framework]
}

/**
 * Writes the project of a resolved API with the chosen framework.
 *
 * @param spec The resolved API.
 * @param settings The project settings, already normalized.
 * @returns The files sorted by path, the OpenAPI contract included; empty when the framework has no generator.
 */
export function generateProject(spec: ApiSpec, settings: ProjectSettings): GeneratedFile[] {
  const generator = findGenerator(settings.framework)
  if (!generator) return []
  const openApi = openApiYaml(spec, generator.serverUrl)
  return generator.generate({ spec, settings, openApi }).sort((a, b) => a.path.localeCompare(b.path))
}
