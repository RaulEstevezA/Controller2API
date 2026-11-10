"""Services, controllers, responses and routes of the Laravel project. Mirrors
web/src/core/generators/frameworks/laravel/web.ts.

The service of a resource holds its rules: items that must exist, keys that must not repeat, references that must
point to stored items, and the values the server fills (keys, timestamps, defaults). Business endpoints get a method
that answers 501 with a TODO where their logic goes.

The controller only translates HTTP to service calls: parameters, bodies and status codes. Protection is declared
on the routes.
"""

import re

from ....js import coalesce, js_string, number_text
from ....openapi.build import PAGE_SIZE, always_in_response, shape_fields
from ...common.text import file_text, lines
from ...languages.php.php import PhpImports, php_class, php_doc, php_header, php_literal, php_name, php_string
from .context import (
    LaravelContext,
    class_path,
    inner_object,
    key_field,
    key_type,
    names,
    qualified,
    referenced_resources,
)
from .requests import request_class

# The timestamp the server writes: UTC, ISO 8601 with milliseconds, as JavaScript's toISOString
NOW = "now()->utc()->format('Y-m-d\\TH:i:s.v\\Z')"

_VOWEL_START = re.compile(r"^[aeiou]", re.IGNORECASE)


def _reference_checks(
    context: LaravelContext, resource: dict, fields: list[dict], source: str, label: str, depth: int
) -> list[str]:
    """PHP statements that check every reference of a set of values, nested objects included."""
    checks: list[str] = []
    for field in fields:
        value = f"{source}[{php_string(field['wire'])}]"
        where = f"{label}.{field['wire']}" if label else field["wire"]
        reference = field.get("reference")
        if reference:
            repository = (
                "$this->repository" if reference == resource["name"] else f"$this->{php_name(reference)}Repository"
            )
            if field["type"]["kind"] == "array":
                checks.extend(
                    [
                        f"foreach ({value} ?? [] as $key) {{",
                        f"    $this->require({repository}, $key, {php_string(where)}, {php_string(reference)});",
                        "}",
                    ]
                )
            else:
                checks.append(
                    f"$this->require({repository}, {value} ?? null, {php_string(where)}, {php_string(reference)});"
                )
            continue
        inner = inner_object(field["type"])
        spec_object = next((item for item in context.spec["objects"] if item["name"] == inner), None) if inner else None
        if not spec_object or depth > 3:
            continue
        variable = f"$item{depth}"
        nested = _reference_checks(context, resource, spec_object["fields"], variable, where, depth + 1)
        if not nested:
            continue
        if field["type"]["kind"] == "array":
            checks.extend([f"foreach ({value} ?? [] as {variable}) {{", *(f"    {line}" for line in nested), "}"])
        elif field["type"]["kind"] == "object":
            checks.extend(
                [
                    f"if (is_array({value} ?? null)) {{",
                    f"    {variable} = {value};",
                    *(f"    {line}" for line in nested),
                    "}",
                ]
            )
    return checks


def _server_values(resource: dict, operation: str) -> list[str]:
    """Assignments of the values the server gives read-only fields in an operation."""
    result: list[str] = []
    for field in resource["fields"]:
        server = field.get("server")
        if field["access"] != "readOnly" or server == "key":
            continue
        target = f"$item[{php_string(field['wire'])}]"
        if server == "updated":
            result.append(f"{target} = $now;")
        elif server == "created" and operation == "create":
            result.append(f"{target} = $now;")
        elif server == "default" and operation == "create":
            result.append(f"{target} = {php_literal(field.get('defaultValue'))};")
        elif server == "pending" and operation == "create":
            fallback = 'fill "' + field["name"] + '"'
            result.extend([f"// TODO: {coalesce(field.get('todo'), fallback)}", f"{target} = null;"])
    return result


def _uses_now(resource: dict, operation: str) -> bool:
    return any(
        field["access"] == "readOnly"
        and (field.get("server") == "updated" or (field.get("server") == "created" and operation == "create"))
        for field in resource["fields"]
    )


def service_file(context: LaravelContext, resource: dict) -> dict:
    namespace = context.layout.resource(resource, "service")
    name = names(resource)
    key = key_type(resource)
    key_wire = php_string(key_field(resource)["wire"])
    imports = PhpImports(namespace).add(
        qualified(context, resource, "repository", name["repository"]), "App\\Exceptions\\ApiException"
    )
    needs = referenced_resources(context, resource)
    for target in needs:
        imports.add(qualified(context, target, "repository", names(target)["repository"]))
    checks = _reference_checks(context, resource, resource["fields"], "$values", "", 0)
    has_checks = bool(checks) and any(endpoint["input"] != "none" for endpoint in resource["endpoints"])
    client_key = resource["key"].get("generated") is None
    kept = [php_string(field["wire"]) for field in resource["fields"] if field["access"] == "readOnly"]
    methods: list[str] = [
        lines(
            "    /** @return array<string, mixed> */",
            f"    private function find({key} $key): array",
            "    {",
            f"        return $this->repository->get($key) ?? throw ApiException::notFound({php_string(resource['singular'])});",
            "    }",
        )
    ]
    if has_checks:
        methods.append(
            lines(
                "    /** A reference must point to a stored item. */",
                "    private function require(object $repository, mixed $key, string $field, string $model): void",
                "    {",
                "        if ($key !== null && $repository->get($key) === null) {",
                '            throw ApiException::invalid($field, "No {$model} has this key");',
                "        }",
                "    }",
                "",
                "    /** @param array<string, mixed> $values */",
                "    private function checkReferences(array $values): void",
                "    {",
                [f"        {line}" for line in checks],
                "    }",
            )
        )
    check = has_checks and "        $this->checkReferences($values);"

    def now(operation: str):
        return _uses_now(resource, operation) and f"        $now = {NOW};"

    def fill(operation: str) -> list[str]:
        return [f"        {line}" for line in _server_values(resource, operation)]

    for endpoint in resource["endpoints"]:
        fn = php_name(endpoint["name"])
        operation = endpoint["operation"]
        summary = endpoint["summary"]
        if operation == "list":
            imports.add("App\\Support\\ListQuery", "App\\Support\\ListResult")
            methods.append(
                lines(
                    f"    /** {summary}. */",
                    f"    public function {fn}(ListQuery $query): ListResult",
                    "    {",
                    "        return $this->repository->list($query);",
                    "    }",
                )
            )
        elif operation == "get":
            methods.append(
                lines(
                    f"    /** @return array<string, mixed> {summary}. */",
                    f"    public function {fn}({key} $key): array",
                    "    {",
                    "        return $this->find($key);",
                    "    }",
                )
            )
        elif operation == "create":
            conflict = php_string(f"A {resource['singular']} with this key already exists")
            methods.append(
                lines(
                    "    /**",
                    f"     * {summary}.",
                    "     *",
                    "     * @param  array<string, mixed>  $values",
                    "     * @return array<string, mixed>",
                    "     */",
                    f"    public function {fn}(array $values): array",
                    "    {",
                    client_key
                    and [
                        f"        if (isset($values[{key_wire}]) && $this->repository->get($values[{key_wire}]) !== null) {{",
                        f"            throw ApiException::conflict({conflict});",
                        "        }",
                    ],
                    check,
                    "        $item = $values;",
                    now("create"),
                    fill("create"),
                    "",
                    "        return $this->repository->add($item);",
                    "    }",
                )
            )
        elif operation == "replace":
            methods.append(
                lines(
                    "    /**",
                    f"     * {summary}: every field the client may send takes the value of the body.",
                    "     *",
                    "     * @param  array<string, mixed>  $values",
                    "     * @return array<string, mixed>",
                    "     */",
                    f"    public function {fn}({key} $key, array $values): array",
                    "    {",
                    "        $current = $this->find($key);",
                    client_key
                    and [
                        f"        if (($values[{key_wire}] ?? null) !== $key) {{",
                        f"            throw ApiException::invalid({key_wire}, 'The key cannot change');",
                        "        }",
                    ],
                    check,
                    "        // What the server keeps (key, timestamps) stays; the rest is what the body says",
                    "        $item = [...array_intersect_key($current, array_flip(self::SERVER_FIELDS)), ...$values];",
                    now("replace"),
                    fill("replace"),
                    "",
                    "        return $this->repository->save($key, $item);",
                    "    }",
                )
            )
        elif operation == "update":
            changes_key = client_key and key_field(resource)["access"] != "readOnly"
            methods.append(
                lines(
                    "    /**",
                    f"     * {summary}: only the fields in the body change.",
                    "     *",
                    "     * @param  array<string, mixed>  $values",
                    "     * @return array<string, mixed>",
                    "     */",
                    f"    public function {fn}({key} $key, array $values): array",
                    "    {",
                    "        $current = $this->find($key);",
                    changes_key
                    and [
                        f"        if (array_key_exists({key_wire}, $values) && $values[{key_wire}] !== $key) {{",
                        f"            throw ApiException::invalid({key_wire}, 'The key cannot change');",
                        "        }",
                    ],
                    check,
                    "        $item = [...$current, ...$values];",
                    now("update"),
                    fill("update"),
                    "",
                    "        return $this->repository->save($key, $item);",
                    "    }",
                )
            )
        elif operation == "delete":
            methods.append(
                lines(
                    f"    /** {summary}. */",
                    f"    public function {fn}({key} $key): void",
                    "    {",
                    "        $this->find($key);",
                    "        $this->repository->delete($key);",
                    "    }",
                )
            )
        elif operation == "custom":
            imports.add("App\\Exceptions\\NotImplementedException")
            has_key = any(param["name"] == resource["key"]["param"] for param in endpoint["pathParams"])
            params = [
                param
                for param in (
                    f"{key} $key" if has_key else None,
                    "array $values" if endpoint["input"] != "none" else None,
                )
                if param
            ]
            returns = "void" if endpoint["output"] == "none" else "array"
            not_written = php_string(f"{summary} is not written yet")
            methods.append(
                lines(
                    "    /**",
                    f"     * {summary}.",
                    endpoint["input"] != "none" and ["     *", "     * @param  array<string, mixed>  $values"],
                    endpoint["output"] == "list" and ["     *", "     * @return list<array<string, mixed>>"],
                    endpoint["output"] == "resource" and ["     *", "     * @return array<string, mixed>"],
                    "     */",
                    f"    public function {fn}({', '.join(params)}): {returns}",
                    "    {",
                    has_key and "        $this->find($key);",
                    f'        // TODO: write the logic of "{summary}" ({endpoint["method"]} {endpoint["path"]}).',
                    f"        throw new NotImplementedException({not_written});",
                    "    }",
                )
            )
    replaces = any(endpoint["operation"] == "replace" for endpoint in resource["endpoints"])
    constructor_params = [
        f"        private readonly {name['repository']} $repository,",
        *(
            f"        private readonly {names(target)['repository']} ${php_name(target['name'])}Repository,"
            for target in needs
        ),
    ]
    content = lines(
        *php_header(namespace, imports),
        php_doc(f"Rules of {resource['plural']}: what each operation checks and changes."),
        f"final class {name['service']}",
        "{",
        replaces
        and [
            "    /** Fields only the server writes, kept when an item is replaced */",
            f"    private const SERVER_FIELDS = [{', '.join(kept)}];",
            "",
        ],
        "    public function __construct(",
        constructor_params,
        "    ) {",
        "    }",
        "",
        "\n\n".join(methods),
        "}",
    )
    return {"path": class_path(namespace, name["service"]), "content": file_text(content)}


def _is_object(field: dict) -> bool:
    return not field.get("reference") and field["type"]["kind"] in ("object", "map")


def resource_file(context: LaravelContext, resource: dict) -> dict:
    """The response of a resource: the fields clients read, an optional one only when it has a value."""
    namespace = context.layout.resource(resource, "resource")
    name = names(resource)
    imports = PhpImports(namespace).add("Illuminate\\Http\\Request", "Illuminate\\Http\\Resources\\Json\\JsonResource")
    fields = shape_fields(resource["fields"], "read")
    entries = []
    for field in fields:
        wire = php_string(field["wire"])
        # Objects and maps are JSON objects even when empty
        value = f"self::object($item[{wire}] ?? null)" if _is_object(field) else f"$item[{wire}] ?? null"
        if always_in_response(field):
            entries.append(f"            {wire} => {value},")
        else:
            entries.append(f"            {wire} => $this->when(isset($item[{wire}]), fn () => {value}),")
    singular = resource["singular"]
    described = f"An {singular}" if _VOWEL_START.match(singular) else f"A {singular}"
    content = lines(
        *php_header(namespace, imports),
        php_doc(f"{described} as the API returns it: everything but what clients only send."),
        f"final class {name['resource']} extends JsonResource",
        "{",
        "    /** @return array<string, mixed> */",
        "    public function toArray(Request $request): array",
        "    {",
        "        $item = $this->resource;",
        "",
        "        return [",
        entries,
        "        ];",
        "    }",
        "",
        "    /**",
        "     * @param  array<string, mixed>  $item",
        "     * @return array<string, mixed>",
        "     */",
        "    public static function one(array $item): array",
        "    {",
        "        return (new self($item))->resolve();",
        "    }",
        "",
        "    /**",
        "     * @param  list<array<string, mixed>>  $items",
        "     * @return list<array<string, mixed>>",
        "     */",
        "    public static function many(array $items): array",
        "    {",
        "        return array_map(self::one(...), $items);",
        "    }",
        any(_is_object(field) for field in fields)
        and [
            "",
            "    /** An empty array is an empty JSON object here, not a list. */",
            "    private static function object(mixed $value): mixed",
            "    {",
            "        return $value === [] ? new \\stdClass() : $value;",
            "    }",
        ],
        "}",
    )
    return {"path": class_path(namespace, name["resource"]), "content": file_text(content)}


def _query_value(context: LaravelContext, field: dict, imports: PhpImports) -> tuple[list[str], object]:
    """The rule and the conversion of a query value: query strings are text, so numbers and booleans are read."""
    target = (
        next((item for item in context.spec["resources"] if item["name"] == field["reference"]), None)
        if field.get("reference")
        else None
    )
    type_ref = target["key"]["type"] if target else field["type"]
    if type_ref["kind"] == "enum":
        item = next(entry for entry in context.spec["enums"] if entry["name"] == type_ref["name"])
        imports.add("Illuminate\\Validation\\Rule")
        integer = item["valueType"] == "integer"
        values = ", ".join(number_text(value) if integer else php_string(js_string(value)) for value in item["values"])
        return [f"Rule::in([{values}])"], (lambda value: f"(int) {value}") if integer else (lambda value: value)
    if type_ref["kind"] == "scalar":
        scalar = type_ref["scalar"]
        if scalar == "integer":
            return ["'integer'"], lambda value: f"(int) {value}"
        if scalar in ("float", "decimal"):
            return ["'numeric'"], lambda value: f"(float) {value}"
        if scalar == "boolean":
            return ["'in:true,false'"], lambda value: f"{value} === 'true'"
        if scalar == "uuid":
            return ["'uuid'"], lambda value: value
        if scalar == "date":
            return ["'date_format:Y-m-d'"], lambda value: value
    return ["'string'"], lambda value: value


def _key_read(resource: dict, param: str) -> str:
    """The statement that reads the key of a path, with its type: a malformed key is a 400."""
    variable = f"${php_name(param)}"
    scalar = resource["key"]["type"]["scalar"]
    if scalar == "integer":
        return f"$key = $this->integerKey({variable}, {php_string(param)});"
    if scalar == "uuid":
        return f"$key = $this->uuidKey({variable}, {php_string(param)});"
    return f"$key = {variable};"


def controller_file(context: LaravelContext, resource: dict) -> dict:
    namespace = context.layout.resource(resource, "controller")
    name = names(resource)
    response = name["resource"]
    imports = PhpImports(namespace).add(
        "App\\Http\\Controllers\\Controller",
        "Symfony\\Component\\HttpFoundation\\Response",
        qualified(context, resource, "service", name["service"]),
        qualified(context, resource, "resource", response),
    )
    key_param = resource["key"]["param"]
    methods = []
    for endpoint in resource["endpoints"]:
        fn = php_name(endpoint["name"])
        params: list[str] = []
        body: list[str] = []
        has_key = any(param["name"] == key_param for param in endpoint["pathParams"])
        if endpoint["input"] != "none":
            request = request_class(context, resource, "update" if endpoint["input"] == "partial" else "create")
            imports.add(request)
            params.append(f"{request[request.rfind(chr(92)) + 1 :]} $request")
        if endpoint["operation"] == "list":
            imports.add("Illuminate\\Http\\Request")
            params.append("Request $request")
        for param in endpoint["pathParams"]:
            params.append(f"string ${php_name(param['name'])}")
        if has_key:
            body.append(_key_read(resource, key_param))
        if endpoint["input"] != "none":
            body.append("$values = $request->values();")
        status = number_text(endpoint["status"])
        operation = endpoint["operation"]
        if operation == "list":
            imports.add("App\\Support\\ListQuery")
            rules: list[str] = []
            if endpoint.get("pagination"):
                rules.extend(
                    [
                        "'page' => ['sometimes', 'integer', 'min:1'],",
                        f"'size' => ['sometimes', 'integer', 'min:1', 'max:{number_text(PAGE_SIZE['max'])}'],",
                    ]
                )
            reads: list[str] = []
            for wire in endpoint["filters"]:
                field = next(item for item in resource["fields"] if item["wire"] == wire)
                filter_rules, read = _query_value(context, field, imports)
                rules.append(f"{php_string(wire)} => ['sometimes', {', '.join(filter_rules)}],")
                reads.extend(
                    [
                        f"if (array_key_exists({php_string(wire)}, $query)) {{",
                        f"    $filters[{php_string(wire)}] = {read(f'$query[{php_string(wire)}]')};",
                        "}",
                    ]
                )
            if endpoint["sort"]:
                imports.add("Illuminate\\Validation\\Rule")
                allowed = ", ".join(php_string(value) for wire in endpoint["sort"] for value in (wire, f"-{wire}"))
                rules.append(f"'sort' => ['sometimes', Rule::in([{allowed}])],")
            if rules:
                body.append("\n".join(["$query = $request->validate([", *(f"    {rule}" for rule in rules), "]);"]))
            body.extend(["$filters = [];", *reads])
            sort = "$query['sort'] ?? null" if endpoint["sort"] else "null"
            if endpoint.get("pagination"):
                body.extend(
                    [
                        "$page = (int) ($query['page'] ?? 1);",
                        f"$size = (int) ($query['size'] ?? {number_text(PAGE_SIZE['default'])});",
                        f"$result = $this->service->{fn}(ListQuery::of($filters, {sort}, ($page - 1) * $size, $size));",
                        "",
                        f"return response()->json(['items' => {response}::many($result->items), 'total' => $result->total, 'page' => $page, 'size' => $size], {status});",
                    ]
                )
            else:
                body.extend(
                    [
                        f"$result = $this->service->{fn}(ListQuery::of($filters, {sort}));",
                        "",
                        f"return response()->json({response}::many($result->items), {status});",
                    ]
                )
        elif operation == "get":
            body.extend(["", f"return response()->json({response}::one($this->service->{fn}($key)), {status});"])
        elif operation == "create":
            body.extend(["", f"return response()->json({response}::one($this->service->{fn}($values)), {status});"])
        elif operation in ("replace", "update"):
            body.extend(
                ["", f"return response()->json({response}::one($this->service->{fn}($key, $values)), {status});"]
            )
        elif operation == "delete":
            body.extend([f"$this->service->{fn}($key);", "", f"return response()->noContent({status});"])
        elif operation == "custom":
            arguments = [
                arg for arg in ("$key" if has_key else None, "$values" if endpoint["input"] != "none" else None) if arg
            ]
            call = f"$this->service->{fn}({', '.join(arguments)})"
            if endpoint["output"] == "none" or endpoint["status"] == 204:
                body.extend([f"{call};", "", f"return response()->noContent({status});"])
            elif endpoint["output"] == "list":
                body.extend(["", f"return response()->json({response}::many({call}), {status});"])
            else:
                body.extend(["", f"return response()->json({response}::one({call}), {status});"])
        code = [line for part in body for line in part.split("\n")]
        methods.append(
            lines(
                f"    /** {endpoint['summary']}. */",
                f"    public function {fn}({', '.join(params)}): Response",
                "    {",
                ["" if line == "" else f"        {line}" for line in code],
                "    }",
            )
        )
    content = lines(
        *php_header(namespace, imports),
        php_doc(f"Routes of {resource['plural']}: HTTP in, service calls, HTTP out."),
        f"final class {name['controller']} extends Controller",
        "{",
        f"    public function __construct(private readonly {name['service']} $service)",
        "    {",
        "    }",
        "",
        "\n\n".join(methods),
        "}",
    )
    return {"path": class_path(namespace, name["controller"]), "content": file_text(content)}


def base_controller_file() -> dict:
    """The base controller: reading keys from paths with their type."""
    namespace = "App\\Http\\Controllers"
    content = lines(
        *php_header(namespace, PhpImports(namespace).add("App\\Exceptions\\ApiException", "Illuminate\\Support\\Str")),
        php_doc(
            "Base of the controllers: the key in a path, read with its type. A malformed key is a 400, not a missing item."
        ),
        "abstract class Controller",
        "{",
        "    protected function integerKey(string $value, string $name): int",
        "    {",
        "        if (preg_match('/^-?\\d+$/', $value) !== 1) {",
        "            throw ApiException::invalid($name, 'Must be a whole number');",
        "        }",
        "",
        "        return (int) $value;",
        "    }",
        "",
        "    protected function uuidKey(string $value, string $name): string",
        "    {",
        "        if (! Str::isUuid($value)) {",
        "            throw ApiException::invalid($name, 'Must be a UUID');",
        "        }",
        "",
        "        return $value;",
        "    }",
        "}",
    )
    return {"path": "app/Http/Controllers/Controller.php", "content": file_text(content)}


def _guard(context: LaravelContext, endpoint: dict) -> str | None:
    """The middleware that protects an endpoint, or None for a public one."""
    auth = context.settings["auth"]
    if endpoint["access"] == "public" or auth == "none":
        return None
    if auth == "apiKey":
        return "api.key"
    return f"token:{','.join(endpoint['roles'])}" if endpoint["access"] == "roles" else "token"


def routes_file(context: LaravelContext) -> dict:
    imports = {"Illuminate\\Support\\Facades\\Route"}
    blocks = []
    for resource in context.spec["resources"]:
        name = names(resource)
        imports.add(qualified(context, resource, "controller", name["controller"]))
        routes = []
        for endpoint in resource["endpoints"]:
            protection = _guard(context, endpoint)
            route = (
                f"Route::{endpoint['method'].lower()}({php_string(endpoint['path'])}, "
                f"[{name['controller']}::class, {php_string(php_name(endpoint['name']))}])"
            )
            routes.append(f"{route}{f'->middleware({php_string(protection)})' if protection else ''};")
        blocks.append(lines(f"// {php_class(resource['plural'])}", routes))
    content = lines(
        "<?php",
        "",
        [f"use {name};" for name in sorted(imports)],
        "",
        "// Every route of the API, with its protection. The contract is in openapi.yaml.",
        "",
        "\n\n".join(blocks),
    )
    return {"path": "routes/api.php", "content": file_text(content)}
