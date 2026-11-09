/**
 * Interface texts in English and Spanish.
 *
 * `en` defines the shape of the texts; `es` must have exactly the same keys, which the `Messages` type
 * checks. To add a text, add it to both. Texts that depend on a value are functions.
 */

import type { WorkspacePart } from '../app/workspaceParts.ts'

/** Languages of the interface, in the order the language switcher shows them. */
export const languages = ['en', 'es'] as const

export type Language = (typeof languages)[number]

const en = {
  languageLabel: 'Language',
  processedLocally: 'Processed locally',
  tagline: 'Turn data models into the code of a REST API you can run',
  introDescription:
    'Paste or open your models: classes and DTOs in Python, TypeScript, JavaScript, Java, C#, Kotlin or Dart, JSON, JSON Schema or OpenAPI. Model2API proposes the resources and endpoints of the API, explains each proposal and waits for you where it is not sure. Choose the framework (FastAPI, Django REST Framework, Express, NestJS or Spring Boot), the architecture, the persistence and the authentication, then copy each file or download the whole project, with its tests, its OpenAPI contract and a README to run it.',
  privacyTitle: 'Your models stay on your computer',
  privacyPoints: [
    'Nothing you paste or open is sent to a server.',
    'Your code is analyzed, never run.',
    'Nothing is saved unless you choose to.',
  ],
  linksLabel: 'Downloads and links',
  downloadDesktop: 'Download for desktop',
  downloadFor: (platform: string) => `Download for ${platform}`,
  otherPlatforms: 'Other platforms',
  otherArchitecture: (architecture: string) => `${architecture} version`,
  downloadNote: 'Desktop version for Windows, macOS and Linux. It is not signed, so the first time your system will show a warning.',
  howToOpen: 'How to open it',
  howToOpenUrl: 'https://github.com/RaulEstevezA/Model2API/blob/main/desktop/README_en.md#opening-it-the-first-time',
  sourceCode: 'Source code',
  allTools: 'All tools',
  license: 'MIT License',
  workspaceLabel: 'Workspace',
  workspaceParts: { models: 'Models', endpoints: 'Endpoints', project: 'Project' } satisfies Record<WorkspacePart, string>,
  modelsEmpty: 'The models you paste or open will appear here.',
  endpointsEmpty: 'The proposed resources and endpoints will appear here once the models are read.',
  projectEmpty: 'The files of the generated project will appear here.',
}

/** Every text of the interface in one language. */
export type Messages = typeof en

const es: Messages = {
  languageLabel: 'Idioma',
  processedLocally: 'Procesado en local',
  tagline: 'Convierte modelos de datos en el código de una API REST que puedes ejecutar',
  introDescription:
    'Pega o abre tus modelos: clases y DTOs en Python, TypeScript, JavaScript, Java, C#, Kotlin o Dart, JSON, JSON Schema u OpenAPI. Model2API propone los recursos y endpoints de la API, explica cada propuesta y te espera donde no está seguro. Elige el framework (FastAPI, Django REST Framework, Express, NestJS o Spring Boot), la arquitectura, la persistencia y la autenticación, y copia cada archivo o descarga el proyecto completo, con sus pruebas, su contrato OpenAPI y un README para ejecutarlo.',
  privacyTitle: 'Tus modelos se quedan en tu equipo',
  privacyPoints: [
    'Nada de lo que pegas o abres se envía a un servidor.',
    'Tu código se analiza, nunca se ejecuta.',
    'No se guarda nada salvo que tú lo decidas.',
  ],
  linksLabel: 'Descargas y enlaces',
  downloadDesktop: 'Descargar para escritorio',
  downloadFor: (platform) => `Descargar para ${platform}`,
  otherPlatforms: 'Otras plataformas',
  otherArchitecture: (architecture) => `Versión ${architecture}`,
  downloadNote: 'Versión de escritorio para Windows, macOS y Linux. No está firmada, así que la primera vez el sistema mostrará un aviso.',
  howToOpen: 'Cómo abrirla',
  howToOpenUrl: 'https://github.com/RaulEstevezA/Model2API/blob/main/desktop/README_es.md#abrirla-la-primera-vez',
  sourceCode: 'Código fuente',
  allTools: 'Todas las herramientas',
  license: 'Licencia MIT',
  workspaceLabel: 'Área de trabajo',
  workspaceParts: { models: 'Modelos', endpoints: 'Endpoints', project: 'Proyecto' },
  modelsEmpty: 'Los modelos que pegues o abras aparecerán aquí.',
  endpointsEmpty: 'Los recursos y endpoints propuestos aparecerán aquí cuando se lean los modelos.',
  projectEmpty: 'Los archivos del proyecto generado aparecerán aquí.',
}

/** Texts by language. */
export const messages: Record<Language, Messages> = { en, es }
