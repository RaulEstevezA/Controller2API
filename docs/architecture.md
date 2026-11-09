# Architecture

Model2API turns data models into the code of a REST API. Everything runs locally in the browser; there is no backend. The user's code is read by hand-written parsers and is never executed, and every proposal comes from explicit, deterministic rules that can be explained.

```text
Input text ──► Importer ──► Model ──► Analysis ──► Proposal ──► API design ──► Generator ──► files ──► Export
                                         │             ▲            │   │
                                    pending        reconcile    user edits   └──► OpenAPI contract
                                    decisions    (input edited)  (undo/redo)
```

Every stage has a language-neutral input and output. A new input format, framework, architecture or database is a new module registered next to the existing ones; it never changes the stages around it.

| Stage | Input | Output | Folder |
|---|---|---|---|
| Importing | Text in a supported format | `Model` | `web/src/core/importers/` |
| Analysis | `Model` | Identifiers, relations, constraints and pending decisions, each with its reason | `web/src/core/analysis/` |
| Proposal | `Model` + analysis | `ApiDesign` with the confidence of each proposal | `web/src/core/design/` |
| Editing | `ApiDesign` + a user action | A new `ApiDesign` | `web/src/core/design/` |
| Validation | `ApiDesign` | Errors and warnings (duplicate routes, undeclared parameters, missing models) | `web/src/core/validation/` |
| Compatibility | Selected stack | The options that work together, and why the others do not | `web/src/core/compatibility/` |
| Contract | `ApiDesign` | OpenAPI document | `web/src/core/openapi/` |
| Generation | `ApiDesign` + settings | Project files | `web/src/core/generators/` |
| Export | Project files | ZIP, single file, OpenAPI file | `web/src/core/export/` |

## Folders

```text
.github/workflows/          CI and publication to raulesteveza.github.io/tools/Model2API/
docs/                       Project documentation (architecture, decisions, formats, how to add a generator)
web/                        The web application (React + TypeScript + Vite)
├── public/                 Static files served as they are (favicon)
└── src/
    ├── core/               No React and no browser APIs: pure TypeScript, tested in Node
    │   ├── model/          Normalized model: entities, fields, types, keys, relations, enums,
    │   │                   constraints, defaults, and where each fact came from in the input
    │   ├── importers/      One importer per format and the importer registry
    │   │   ├── code/       Python, TypeScript, JavaScript, Java, C#, Kotlin, Dart
    │   │   ├── schema/     JSON Schema, OpenAPI, exchange formats of the other tools
    │   │   └── data/       JSON documents
    │   ├── analysis/       Rules that read the model and raise pending decisions
    │   ├── api/            The API design: resources, endpoints, parameters, bodies,
    │   │                   responses, errors, security, pagination, filters, sorting
    │   ├── design/         Proposal from the model, immutable edits, business endpoints,
    │   │                   reconciliation when the input changes
    │   ├── validation/     Consistency checks on an API design
    │   ├── compatibility/  Language × framework × architecture × persistence × auth matrix
    │   ├── openapi/        OpenAPI contract built from the design, independent of frameworks
    │   ├── generators/     Generator registry
    │   │   ├── common/     Generator contract, file tree, code writer, TODO markers
    │   │   ├── languages/  What frameworks of one language share: type mapping, naming,
    │   │   │               imports, dependency files (python/, typescript/, java/)
    │   │   └── frameworks/ One generator per framework (fastapi/, django-rest/, express/,
    │   │                   nestjs/, spring-boot/), each with its architectures and persistence
    │   ├── export/         ZIP writer and file downloads as plain data
    │   ├── project/        Model2API project files: versioned format, save and open
    │   └── interop/        Models received from Mapper, Model2DB and other tools
    ├── app/                Interface logic without React: workspace state, history, pending decisions
    ├── hooks/              React state on top of app/ (undo/redo, preferences, startup, handoff)
    ├── components/         React components, one CSS file each (BEM names)
    │   ├── layout/         Header, introduction, links and footer shared by every tool
    │   ├── common/         Pane, code editor, badges, tabs and other building blocks
    │   ├── models/         Input and the detected models
    │   ├── endpoints/      Resources and endpoints, editable
    │   └── project/        Settings, file tree, code view and export
    ├── i18n/               English and Spanish texts, including every reason and note
    ├── examples/           Built-in examples with invented data, also used as test fixtures
    └── styles/tokens/      Design tokens copied from personal_web_style
verification/               Builds, runs and calls the generated projects with their real tools
├── scenarios/              Example + stack combinations to verify
└── runners/                One runner per language toolchain (Python, Node, Java)
```

## Patterns

- **Registry** for every variable case: importers (`importers/registry.ts`), generators (`generators/registry.ts`). Adding a format or a framework is a new module and one line in its registry.
- **Strategy** for interchangeable algorithms inside a generator: architecture (layered, modular, hexagonal), persistence (each ORM or ODM, or none) and authentication (none, JWT, API key). A framework generator composes the strategies it supports; the compatibility matrix decides which ones are offered.
- **Composition over inheritance.** Frameworks of the same language reuse `generators/languages/<language>/` by calling it, not by extending a base generator.
- **Immutable values.** Edits return a new design; undo and redo keep the previous values.

## Principles

- **The core has no interface code.** Everything under `core/` runs in Node and is covered by tests. Components only call it. External dependencies (storage, clipboard, clock) are passed in.
- **No invented decisions.** What the input declares is kept as it is. A proposal the rules are not sure about stays pending, is never applied on its own, and the generated code leaves a `TODO` in its place.
- **Business logic is marked, not invented.** Non-CRUD endpoints get the full structure and a clearly marked place for the developer's logic.
- **No needless layers.** A generator writes only the layers the chosen architecture needs.
- **Verified means verified.** A stack combination is shown as verified only when `verification/` has built, run and called a generated project with it.
- **Local first.** Inputs stay in memory. Only preferences are stored, plus the workspace when the user turns on "Remember in this browser".

## Interface

The page follows the tool layout of personal_web_style (`layouts/tool-page.md`): presentation window, workspace, links and footer, in a single screen.
