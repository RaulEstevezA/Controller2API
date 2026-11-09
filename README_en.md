# Model2API

Model2API turns data models into the code of a REST API you review before it is written, and then writes it: a project with its resources and endpoints, validation, error handling, persistence, authentication, tests, OpenAPI contract and a README to run it. Everything happens on your side, in the browser: what you paste or open is never sent anywhere, and code is analyzed, never run.

> [!IMPORTANT]
> Model2API is under development and not published yet. What already works is listed in the [changelog](./CHANGELOG.md); the rest of this page describes what the tool is being built to do.

```text
Paste or open the models  →  Review the proposed endpoints  →  Choose the framework and options  →  Download the project
```

## What it does

1. **Reads the models**: classes and DTOs in Python (dataclasses, Pydantic), TypeScript, JavaScript, Java (classes, records), C#, Kotlin and Dart, JSON, JSON Schema and OpenAPI, or models received from Api2Class, Mapper and Model2DB. What the input declares (required fields, lengths, ranges, formats, enums, defaults, keys, relations) is kept as it is.
2. **Proposes the API**: a resource per model with its operations (`GET /products`, `GET /products/{id}`, `POST`, `PUT`, `PATCH`, `DELETE`), each with its parameters, bodies, responses, status codes and errors.
3. **Explains every proposal and never decides an ambiguity**: what it is not sure about waits for you, and the generated code leaves a `TODO` where the decision goes.
4. **Lets you change everything**: turn endpoints on and off, edit routes, add business endpoints that are not CRUD, configure pagination, filters, sorting, validation and permissions, with undo and redo.
5. **Writes idiomatic code for the framework you choose**, with the architecture that fits it (layered, modular by feature, or clean / hexagonal where it makes sense) and no layers it does not need.
6. **Checks combinations**: only framework, persistence and authentication options that work together are offered, and a combination is shown as verified only after a generated project with it has been built, run and called.

## Frameworks

| Language | Frameworks |
|---|---|
| Python | FastAPI, Django REST Framework |
| TypeScript | Express, NestJS |
| Java | Spring Boot |

Generated projects are written in English. They are a starting point to review, not a promise of a production-ready service.

## Versions

- **Web**: React + TypeScript + Vite, in the browser.
- **Desktop**: Python + PySide6, the same tool as an installable app. Both versions pass the same cases in `shared/test-cases/`.

## Development

The web version lives in `web/`:

```bash
cd web
npm install
npm run dev      # development server
npm run check    # types, lint, format and tests
npm run build    # production build, served from /tools/Model2API/
```

How the code is organized, and why: [docs/architecture.md](./docs/architecture.md) and [docs/decisions.md](./docs/decisions.md).

## Suggestions

Ideas for improvements, bugs or a framework you would like Model2API to write for: write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Developer

**Raul Estevez**

- [Personal Website](https://raulesteveza.github.io/)
- [LinkedIn Profile](https://www.linkedin.com/in/raulesteveza/)

## License

[MIT](./LICENSE)
