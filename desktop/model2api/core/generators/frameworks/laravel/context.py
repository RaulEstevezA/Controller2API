"""Shared context of the Laravel generator: the namespace of each class for the chosen architecture (Strategy
pattern: layered groups classes by kind, as Laravel does; modular keeps one folder per resource), and the names of
each resource's classes, table and columns. Mirrors web/src/core/generators/frameworks/laravel/context.ts.
"""

import re
from dataclasses import dataclass

from ...languages.php.php import php_class, php_name, php_snake

_LAYERED = {
    "controller": "App\\Http\\Controllers",
    "request": "App\\Http\\Requests",
    "resource": "App\\Http\\Resources",
    "service": "App\\Services",
    "repository": "App\\Repositories",
    "model": "App\\Models",
}


class _Layered:
    def resource(self, resource: dict, kind: str) -> str:
        return _LAYERED[kind]

    def enums(self) -> str:
        return "App\\Enums"


class _Modular:
    def resource(self, resource: dict, kind: str) -> str:
        return f"App\\Modules\\{php_class(resource['name'])}"

    def enums(self) -> str:
        return "App\\Modules\\Shared"


@dataclass
class LaravelContext:
    spec: dict
    settings: dict
    layout: object
    pending: bool
    eloquent: bool


def create_context(spec: dict, settings: dict) -> LaravelContext:
    return LaravelContext(
        spec=spec,
        settings=settings,
        layout=_Modular() if settings["architecture"] == "modular" else _Layered(),
        pending=settings["persistence"] == "none",
        eloquent=settings["persistence"] == "eloquent",
    )


_APP = re.compile(r"^App(\\|$)")


def class_path(namespace: str, name: str) -> str:
    """Path of the file of a class, from its namespace (PSR-4: App\\ is app/)."""
    folder = _APP.sub(lambda match: "app" + match.group(1), namespace)
    return f"{'/'.join(folder.split(chr(92)))}/{name}.php"


def names(resource: dict) -> dict:
    """Names of a resource's classes, table and variables."""
    type_name = php_class(resource["name"])
    return {
        "type": type_name,
        "controller": f"{type_name}Controller",
        "store": f"Store{type_name}Request",
        "update": f"Update{type_name}Request",
        "resource": f"{type_name}Resource",
        "service": f"{type_name}Service",
        "repository": f"{type_name}Repository",
        "memory": f"InMemory{type_name}Repository",
        "pendingRepository": f"Pending{type_name}Repository",
        "eloquentRepository": f"Eloquent{type_name}Repository",
        "model": type_name,
        "one": php_name(resource["name"]),
        "table": php_snake(resource["plural"].replace(" ", "_")),
    }


def qualified(context: LaravelContext, resource: dict, kind: str, name: str) -> str:
    """The fully qualified name of a resource's class."""
    return f"{context.layout.resource(resource, kind)}\\{name}"


def column(field: dict) -> str:
    """The column of a field: its JSON name in snake_case (customerId → customer_id)."""
    return php_snake(field["wire"])


def key_field(resource: dict) -> dict:
    return next(field for field in resource["fields"] if field["name"] == resource["key"]["field"])


def key_type(resource: dict) -> str:
    """The PHP type of the key: whole numbers are int, the rest text."""
    return "int" if resource["key"]["type"]["scalar"] == "integer" else "string"


def inner_object(type_ref: dict) -> str | None:
    """The embedded object a type holds, directly or as the items of a list or map."""
    if type_ref["kind"] == "object":
        return type_ref["name"]
    if type_ref["kind"] == "array":
        return inner_object(type_ref["items"])
    if type_ref["kind"] == "map":
        return inner_object(type_ref["value"])
    return None


def referenced_resources(context: LaravelContext, resource: dict) -> list[dict]:
    """Resources a resource refers to, directly or inside its embedded objects, other than itself."""
    found: set[str] = set()

    def visit(fields: list[dict], seen: frozenset[str]) -> None:
        for field in fields:
            if field.get("reference"):
                found.add(field["reference"])
            inner = inner_object(field["type"])
            if inner and inner not in seen:
                spec_object = next((item for item in context.spec["objects"] if item["name"] == inner), None)
                if spec_object:
                    visit(spec_object["fields"], seen | {inner})

    visit(resource["fields"], frozenset())
    found.discard(resource["name"])
    return [item for item in context.spec["resources"] if item["name"] in found]


_VOWEL_START = re.compile(r"^[aeiou]", re.IGNORECASE)


def article(text: str) -> str:
    return f"an {text}" if _VOWEL_START.match(text) else f"a {text}"


def capitalize(text: str) -> str:
    return text[:1].upper() + text[1:]
