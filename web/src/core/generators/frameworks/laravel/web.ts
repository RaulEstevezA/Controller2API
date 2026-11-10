/**
 * Services, controllers, responses and routes of the Laravel project.
 *
 * The service of a resource holds its rules: items that must exist, keys that must not repeat, references
 * that must point to stored items, and the values the server fills (keys, timestamps, defaults). Business
 * endpoints get a method that answers 501 with a TODO where their logic goes.
 *
 * The controller only translates HTTP to service calls: parameters, bodies and status codes. Protection is
 * declared on the routes.
 */
import { alwaysInResponse, PAGE_SIZE, shapeFields } from '../../../openapi/build.ts'
import type { SpecEndpoint, SpecField, SpecResource } from '../../../api/spec.ts'
import type { JsonValue } from '../../common/samples.ts'
import type { GeneratedFile } from '../../common/types.ts'
import { fileText, lines } from '../../common/text.ts'
import { PhpImports, phpClass, phpDoc, phpHeader, phpLiteral, phpName, phpString } from '../../languages/php/php.ts'
import { classPath, innerObject, keyField, keyType, names, qualified, referencedResources, type LaravelContext } from './context.ts'
import { requestClass } from './requests.ts'

/** The timestamp the server writes: UTC, ISO 8601 with milliseconds, as JavaScript's toISOString. */
const NOW = "now()->utc()->format('Y-m-d\\TH:i:s.v\\Z')"

/** PHP statements that check every reference of a set of values, nested objects included. */
function referenceChecks(
  context: LaravelContext,
  resource: SpecResource,
  fields: SpecField[],
  source: string,
  label: string,
  depth: number,
): string[] {
  const checks: string[] = []
  for (const field of fields) {
    const value = `${source}[${phpString(field.wire)}]`
    const where = label ? `${label}.${field.wire}` : field.wire
    if (field.reference) {
      const repository = field.reference === resource.name ? '$this->repository' : `$this->${phpName(field.reference)}Repository`
      if (field.type.kind === 'array')
        checks.push(
          `foreach (${value} ?? [] as $key) {`,
          `    $this->require(${repository}, $key, ${phpString(where)}, ${phpString(field.reference)});`,
          '}',
        )
      else checks.push(`$this->require(${repository}, ${value} ?? null, ${phpString(where)}, ${phpString(field.reference)});`)
      continue
    }
    const inner = innerObject(field.type)
    const object = inner ? context.spec.objects.find((item) => item.name === inner) : undefined
    if (!object || depth > 3) continue
    const variable = `$item${depth}`
    const nested = referenceChecks(context, resource, object.fields, variable, where, depth + 1)
    if (nested.length === 0) continue
    if (field.type.kind === 'array') checks.push(`foreach (${value} ?? [] as ${variable}) {`, ...nested.map((line) => `    ${line}`), '}')
    else if (field.type.kind === 'object')
      checks.push(`if (is_array(${value} ?? null)) {`, `    ${variable} = ${value};`, ...nested.map((line) => `    ${line}`), '}')
  }
  return checks
}

/** Assignments of the values the server gives read-only fields in an operation. */
function serverValues(resource: SpecResource, operation: 'create' | 'replace' | 'update'): string[] {
  const result: string[] = []
  for (const field of resource.fields) {
    if (field.access !== 'readOnly' || field.server === 'key') continue
    const target = `$item[${phpString(field.wire)}]`
    if (field.server === 'updated') result.push(`${target} = $now;`)
    else if (field.server === 'created' && operation === 'create') result.push(`${target} = $now;`)
    else if (field.server === 'default' && operation === 'create')
      result.push(`${target} = ${phpLiteral((field.defaultValue ?? null) as JsonValue)};`)
    else if (field.server === 'pending' && operation === 'create')
      result.push(`// TODO: ${field.todo ?? `fill "${field.name}"`}`, `${target} = null;`)
  }
  return result
}

function usesNow(resource: SpecResource, operation: 'create' | 'replace' | 'update'): boolean {
  return resource.fields.some(
    (field) => field.access === 'readOnly' && (field.server === 'updated' || (field.server === 'created' && operation === 'create')),
  )
}

export function serviceFile(context: LaravelContext, resource: SpecResource): GeneratedFile {
  const namespace = context.layout.resource(resource, 'service')
  const name = names(resource)
  const key = keyType(resource)
  const keyWire = keyField(resource).wire
  const imports = new PhpImports(namespace).add(
    qualified(context, resource, 'repository', name.repository),
    'App\\Exceptions\\ApiException',
  )
  const needs = referencedResources(context, resource)
  for (const target of needs) imports.add(qualified(context, target, 'repository', names(target).repository))
  const checks = referenceChecks(context, resource, resource.fields, '$values', '', 0)
  const hasChecks = checks.length > 0 && resource.endpoints.some((endpoint) => endpoint.input !== 'none')
  const clientKey = resource.key.generated === null
  const kept = resource.fields.filter((field) => field.access === 'readOnly').map((field) => phpString(field.wire))
  const methods: string[] = [
    lines(
      '    /** @return array<string, mixed> */',
      `    private function find(${key} $key): array`,
      '    {',
      `        return $this->repository->get($key) ?? throw ApiException::notFound(${phpString(resource.singular)});`,
      '    }',
    ),
  ]
  if (hasChecks)
    methods.push(
      lines(
        '    /** A reference must point to a stored item. */',
        '    private function require(object $repository, mixed $key, string $field, string $model): void',
        '    {',
        '        if ($key !== null && $repository->get($key) === null) {',
        '            throw ApiException::invalid($field, "No {$model} has this key");',
        '        }',
        '    }',
        '',
        '    /** @param array<string, mixed> $values */',
        '    private function checkReferences(array $values): void',
        '    {',
        checks.map((line) => `        ${line}`),
        '    }',
      ),
    )
  const check = hasChecks && '        $this->checkReferences($values);'
  const now = (operation: 'create' | 'replace' | 'update') => usesNow(resource, operation) && `        $now = ${NOW};`
  const fill = (operation: 'create' | 'replace' | 'update') => serverValues(resource, operation).map((line) => `        ${line}`)
  for (const endpoint of resource.endpoints) {
    const fn = phpName(endpoint.name)
    switch (endpoint.operation) {
      case 'list':
        imports.add('App\\Support\\ListQuery', 'App\\Support\\ListResult')
        methods.push(
          lines(
            `    /** ${endpoint.summary}. */`,
            `    public function ${fn}(ListQuery $query): ListResult`,
            '    {',
            '        return $this->repository->list($query);',
            '    }',
          ),
        )
        break
      case 'get':
        methods.push(
          lines(
            `    /** @return array<string, mixed> ${endpoint.summary}. */`,
            `    public function ${fn}(${key} $key): array`,
            '    {',
            '        return $this->find($key);',
            '    }',
          ),
        )
        break
      case 'create':
        methods.push(
          lines(
            '    /**',
            `     * ${endpoint.summary}.`,
            '     *',
            '     * @param  array<string, mixed>  $values',
            '     * @return array<string, mixed>',
            '     */',
            `    public function ${fn}(array $values): array`,
            '    {',
            clientKey && [
              `        if (isset($values[${phpString(keyWire)}]) && $this->repository->get($values[${phpString(keyWire)}]) !== null) {`,
              `            throw ApiException::conflict(${phpString(`A ${resource.singular} with this key already exists`)});`,
              '        }',
            ],
            check,
            '        $item = $values;',
            now('create'),
            fill('create'),
            '',
            '        return $this->repository->add($item);',
            '    }',
          ),
        )
        break
      case 'replace':
        methods.push(
          lines(
            '    /**',
            `     * ${endpoint.summary}: every field the client may send takes the value of the body.`,
            '     *',
            '     * @param  array<string, mixed>  $values',
            '     * @return array<string, mixed>',
            '     */',
            `    public function ${fn}(${key} $key, array $values): array`,
            '    {',
            '        $current = $this->find($key);',
            clientKey && [
              `        if (($values[${phpString(keyWire)}] ?? null) !== $key) {`,
              `            throw ApiException::invalid(${phpString(keyWire)}, 'The key cannot change');`,
              '        }',
            ],
            check,
            '        // What the server keeps (key, timestamps) stays; the rest is what the body says',
            `        $item = [...array_intersect_key($current, array_flip(self::SERVER_FIELDS)), ...$values];`,
            now('replace'),
            fill('replace'),
            '',
            '        return $this->repository->save($key, $item);',
            '    }',
          ),
        )
        break
      case 'update': {
        const changesKey = clientKey && keyField(resource).access !== 'readOnly'
        methods.push(
          lines(
            '    /**',
            `     * ${endpoint.summary}: only the fields in the body change.`,
            '     *',
            '     * @param  array<string, mixed>  $values',
            '     * @return array<string, mixed>',
            '     */',
            `    public function ${fn}(${key} $key, array $values): array`,
            '    {',
            '        $current = $this->find($key);',
            changesKey && [
              `        if (array_key_exists(${phpString(keyWire)}, $values) && $values[${phpString(keyWire)}] !== $key) {`,
              `            throw ApiException::invalid(${phpString(keyWire)}, 'The key cannot change');`,
              '        }',
            ],
            check,
            '        $item = [...$current, ...$values];',
            now('update'),
            fill('update'),
            '',
            '        return $this->repository->save($key, $item);',
            '    }',
          ),
        )
        break
      }
      case 'delete':
        methods.push(
          lines(
            `    /** ${endpoint.summary}. */`,
            `    public function ${fn}(${key} $key): void`,
            '    {',
            '        $this->find($key);',
            '        $this->repository->delete($key);',
            '    }',
          ),
        )
        break
      case 'custom': {
        imports.add('App\\Exceptions\\NotImplementedException')
        const hasKey = endpoint.pathParams.some((param) => param.name === resource.key.param)
        const params = [hasKey ? `${key} $key` : null, endpoint.input !== 'none' ? 'array $values' : null].filter(Boolean)
        const returns = endpoint.output === 'none' ? 'void' : 'array'
        methods.push(
          lines(
            '    /**',
            `     * ${endpoint.summary}.`,
            endpoint.input !== 'none' && ['     *', '     * @param  array<string, mixed>  $values'],
            endpoint.output === 'list' && ['     *', '     * @return list<array<string, mixed>>'],
            endpoint.output === 'resource' && ['     *', '     * @return array<string, mixed>'],
            '     */',
            `    public function ${fn}(${params.join(', ')}): ${returns}`,
            '    {',
            hasKey && '        $this->find($key);',
            `        // TODO: write the logic of "${endpoint.summary}" (${endpoint.method} ${endpoint.path}).`,
            `        throw new NotImplementedException(${phpString(`${endpoint.summary} is not written yet`)});`,
            '    }',
          ),
        )
        break
      }
    }
  }
  const replaces = resource.endpoints.some((endpoint) => endpoint.operation === 'replace')
  const constructorParams = [
    `        private readonly ${name.repository} $repository,`,
    ...needs.map((target) => `        private readonly ${names(target).repository} $${phpName(target.name)}Repository,`),
  ]
  const content = lines(
    ...phpHeader(namespace, imports),
    phpDoc(`Rules of ${resource.plural}: what each operation checks and changes.`),
    `final class ${name.service}`,
    '{',
    replaces && [
      '    /** Fields only the server writes, kept when an item is replaced */',
      `    private const SERVER_FIELDS = [${kept.join(', ')}];`,
      '',
    ],
    '    public function __construct(',
    constructorParams,
    '    ) {',
    '    }',
    '',
    methods.join('\n\n'),
    '}',
  )
  return { path: classPath(namespace, name.service), content: fileText(content) }
}

/** The response of a resource: the fields clients read, an optional one only when it has a value. */
export function resourceFile(context: LaravelContext, resource: SpecResource): GeneratedFile {
  const namespace = context.layout.resource(resource, 'resource')
  const name = names(resource)
  const imports = new PhpImports(namespace).add('Illuminate\\Http\\Request', 'Illuminate\\Http\\Resources\\Json\\JsonResource')
  const entries = shapeFields(resource.fields, 'read').map((field) => {
    const wire = phpString(field.wire)
    // Objects and maps are JSON objects even when empty
    const object = !field.reference && (field.type.kind === 'object' || field.type.kind === 'map')
    const value = object ? `self::object($item[${wire}] ?? null)` : `$item[${wire}] ?? null`
    return alwaysInResponse(field)
      ? `            ${wire} => ${value},`
      : `            ${wire} => $this->when(isset($item[${wire}]), fn () => ${value}),`
  })
  const objects = shapeFields(resource.fields, 'read').some(
    (field) => !field.reference && (field.type.kind === 'object' || field.type.kind === 'map'),
  )
  const content = lines(
    ...phpHeader(namespace, imports),
    phpDoc(`${article(resource.singular)} as the API returns it: everything but what clients only send.`),
    `final class ${name.resource} extends JsonResource`,
    '{',
    '    /** @return array<string, mixed> */',
    '    public function toArray(Request $request): array',
    '    {',
    '        $item = $this->resource;',
    '',
    '        return [',
    entries,
    '        ];',
    '    }',
    '',
    '    /**',
    '     * @param  array<string, mixed>  $item',
    '     * @return array<string, mixed>',
    '     */',
    '    public static function one(array $item): array',
    '    {',
    '        return (new self($item))->resolve();',
    '    }',
    '',
    '    /**',
    '     * @param  list<array<string, mixed>>  $items',
    '     * @return list<array<string, mixed>>',
    '     */',
    '    public static function many(array $items): array',
    '    {',
    '        return array_map(self::one(...), $items);',
    '    }',
    objects && [
      '',
      '    /** An empty array is an empty JSON object here, not a list. */',
      '    private static function object(mixed $value): mixed',
      '    {',
      '        return $value === [] ? new \\stdClass() : $value;',
      '    }',
    ],
    '}',
  )
  return { path: classPath(namespace, name.resource), content: fileText(content) }
}

function article(text: string): string {
  const word = /^[aeiou]/i.test(text) ? `An ${text}` : `A ${text}`
  return word
}

/** The rule and the conversion of a query value: query strings are text, so numbers and booleans are read. */
function queryValue(context: LaravelContext, field: SpecField, imports: PhpImports): { rules: string[]; read: (value: string) => string } {
  const target = field.reference ? context.spec.resources.find((item) => item.name === field.reference) : undefined
  const type = target ? target.key.type : field.type
  if (type.kind === 'enum') {
    const item = context.spec.enums.find((entry) => entry.name === type.name)!
    imports.add('Illuminate\\Validation\\Rule')
    const integer = item.valueType === 'integer'
    return {
      rules: [`Rule::in([${item.values.map((value) => (integer ? String(value) : phpString(String(value)))).join(', ')}])`],
      read: (value) => (integer ? `(int) ${value}` : value),
    }
  }
  if (type.kind === 'scalar') {
    if (type.scalar === 'integer') return { rules: ["'integer'"], read: (value) => `(int) ${value}` }
    if (type.scalar === 'float' || type.scalar === 'decimal') return { rules: ["'numeric'"], read: (value) => `(float) ${value}` }
    if (type.scalar === 'boolean') return { rules: ["'in:true,false'"], read: (value) => `${value} === 'true'` }
    if (type.scalar === 'uuid') return { rules: ["'uuid'"], read: (value) => value }
    if (type.scalar === 'date') return { rules: ["'date_format:Y-m-d'"], read: (value) => value }
  }
  return { rules: ["'string'"], read: (value) => value }
}

/** The statement that reads the key of a path, with its type: a malformed key is a 400. */
function keyRead(resource: SpecResource, param: string): string {
  const variable = `$${phpName(param)}`
  if (resource.key.type.scalar === 'integer') return `$key = $this->integerKey(${variable}, ${phpString(param)});`
  if (resource.key.type.scalar === 'uuid') return `$key = $this->uuidKey(${variable}, ${phpString(param)});`
  return `$key = ${variable};`
}

export function controllerFile(context: LaravelContext, resource: SpecResource): GeneratedFile {
  const namespace = context.layout.resource(resource, 'controller')
  const name = names(resource)
  const imports = new PhpImports(namespace).add(
    'App\\Http\\Controllers\\Controller',
    'Symfony\\Component\\HttpFoundation\\Response',
    qualified(context, resource, 'service', name.service),
    qualified(context, resource, 'resource', name.resource),
  )
  const keyParam = resource.key.param
  const methods = resource.endpoints.map((endpoint) => {
    const fn = phpName(endpoint.name)
    const params: string[] = []
    const body: string[] = []
    const hasKey = endpoint.pathParams.some((param) => param.name === keyParam)
    if (endpoint.input !== 'none') {
      const request = requestClass(context, resource, endpoint.input === 'partial' ? 'update' : 'create')
      imports.add(request)
      params.push(`${request.slice(request.lastIndexOf('\\') + 1)} $request`)
    }
    if (endpoint.operation === 'list') {
      imports.add('Illuminate\\Http\\Request')
      params.push('Request $request')
    }
    for (const param of endpoint.pathParams) params.push(`string $${phpName(param.name)}`)
    if (hasKey) body.push(keyRead(resource, keyParam))
    if (endpoint.input !== 'none') body.push('$values = $request->values();')
    const status = endpoint.status
    switch (endpoint.operation) {
      case 'list': {
        imports.add('App\\Support\\ListQuery')
        const rules: string[] = []
        if (endpoint.pagination) {
          rules.push("'page' => ['sometimes', 'integer', 'min:1'],", `'size' => ['sometimes', 'integer', 'min:1', 'max:${PAGE_SIZE.max}'],`)
        }
        const reads: string[] = []
        for (const wire of endpoint.filters) {
          const field = resource.fields.find((item) => item.wire === wire)!
          const { rules: filterRules, read } = queryValue(context, field, imports)
          rules.push(`${phpString(wire)} => ['sometimes', ${filterRules.join(', ')}],`)
          reads.push(
            `if (array_key_exists(${phpString(wire)}, $query)) {`,
            `    $filters[${phpString(wire)}] = ${read(`$query[${phpString(wire)}]`)};`,
            '}',
          )
        }
        if (endpoint.sort.length > 0) {
          imports.add('Illuminate\\Validation\\Rule')
          rules.push(
            `'sort' => ['sometimes', Rule::in([${endpoint.sort.flatMap((wire) => [phpString(wire), phpString(`-${wire}`)]).join(', ')}])],`,
          )
        }
        body.push(
          rules.length > 0 ? ['$query = $request->validate([', ...rules.map((rule) => `    ${rule}`), ']);'].join('\n') : '$query = [];',
        )
        body.push('$filters = [];', ...reads)
        const sort = endpoint.sort.length > 0 ? "$query['sort'] ?? null" : 'null'
        if (endpoint.pagination) {
          body.push(
            "$page = (int) ($query['page'] ?? 1);",
            `$size = (int) ($query['size'] ?? ${PAGE_SIZE.default});`,
            `$result = $this->service->${fn}(ListQuery::of($filters, ${sort}, ($page - 1) * $size, $size));`,
            '',
            `return response()->json(['items' => ${name.resource}::many($result->items), 'total' => $result->total, 'page' => $page, 'size' => $size], ${status});`,
          )
        } else {
          body.push(
            `$result = $this->service->${fn}(ListQuery::of($filters, ${sort}));`,
            '',
            `return response()->json(${name.resource}::many($result->items), ${status});`,
          )
        }
        if (rules.length === 0) body.splice(body.indexOf('$query = [];'), 1)
        break
      }
      case 'get':
        body.push('', `return response()->json(${name.resource}::one($this->service->${fn}($key)), ${status});`)
        break
      case 'create':
        body.push('', `return response()->json(${name.resource}::one($this->service->${fn}($values)), ${status});`)
        break
      case 'replace':
      case 'update':
        body.push('', `return response()->json(${name.resource}::one($this->service->${fn}($key, $values)), ${status});`)
        break
      case 'delete':
        body.push(`$this->service->${fn}($key);`, '', `return response()->noContent(${status});`)
        break
      case 'custom': {
        const call = `$this->service->${fn}(${[hasKey ? '$key' : null, endpoint.input !== 'none' ? '$values' : null].filter(Boolean).join(', ')})`
        if (endpoint.output === 'none' || status === 204) body.push(`${call};`, '', `return response()->noContent(${status});`)
        else if (endpoint.output === 'list') body.push('', `return response()->json(${name.resource}::many(${call}), ${status});`)
        else body.push('', `return response()->json(${name.resource}::one(${call}), ${status});`)
        break
      }
    }
    const code = body
    return lines(
      `    /** ${endpoint.summary}. */`,
      `    public function ${fn}(${params.join(', ')}): Response`,
      '    {',
      code.flatMap((line) => line.split('\n')).map((line) => (line === '' ? '' : `        ${line}`)),
      '    }',
    )
  })
  const content = lines(
    ...phpHeader(namespace, imports),
    phpDoc(`Routes of ${resource.plural}: HTTP in, service calls, HTTP out.`),
    `final class ${name.controller} extends Controller`,
    '{',
    `    public function __construct(private readonly ${name.service} $service)`,
    '    {',
    '    }',
    '',
    methods.join('\n\n'),
    '}',
  )
  return { path: classPath(namespace, name.controller), content: fileText(content) }
}

/** The base controller: reading keys from paths with their type. */
export function baseControllerFile(): GeneratedFile {
  const namespace = 'App\\Http\\Controllers'
  const content = lines(
    ...phpHeader(namespace, new PhpImports(namespace).add('App\\Exceptions\\ApiException', 'Illuminate\\Support\\Str')),
    phpDoc('Base of the controllers: the key in a path, read with its type. A malformed key is a 400, not a missing item.'),
    'abstract class Controller',
    '{',
    '    protected function integerKey(string $value, string $name): int',
    '    {',
    "        if (preg_match('/^-?\\d+$/', $value) !== 1) {",
    "            throw ApiException::invalid($name, 'Must be a whole number');",
    '        }',
    '',
    '        return (int) $value;',
    '    }',
    '',
    '    protected function uuidKey(string $value, string $name): string',
    '    {',
    '        if (! Str::isUuid($value)) {',
    "            throw ApiException::invalid($name, 'Must be a UUID');",
    '        }',
    '',
    '        return $value;',
    '    }',
    '}',
  )
  return { path: 'app/Http/Controllers/Controller.php', content: fileText(content) }
}

/** The middleware that protects an endpoint, or null for a public one. */
function guard(context: LaravelContext, endpoint: SpecEndpoint): string | null {
  if (endpoint.access === 'public' || context.settings.auth === 'none') return null
  if (context.settings.auth === 'apiKey') return 'api.key'
  return endpoint.access === 'roles' ? `token:${endpoint.roles.join(',')}` : 'token'
}

export function routesFile(context: LaravelContext): GeneratedFile {
  const imports = new Set<string>(['Illuminate\\Support\\Facades\\Route'])
  const blocks = context.spec.resources.map((resource) => {
    const name = names(resource)
    imports.add(qualified(context, resource, 'controller', name.controller))
    const routes = resource.endpoints.map((endpoint) => {
      const protection = guard(context, endpoint)
      const route = `Route::${endpoint.method.toLowerCase()}(${phpString(endpoint.path)}, [${name.controller}::class, ${phpString(phpName(endpoint.name))}])`
      return `${route}${protection ? `->middleware(${phpString(protection)})` : ''};`
    })
    return lines(`// ${phpClass(resource.plural)}`, routes)
  })
  const content = lines(
    '<?php',
    '',
    [...imports].sort().map((name) => `use ${name};`),
    '',
    '// Every route of the API, with its protection. The contract is in openapi.yaml.',
    '',
    blocks.join('\n\n'),
  )
  return { path: 'routes/api.php', content: fileText(content) }
}
