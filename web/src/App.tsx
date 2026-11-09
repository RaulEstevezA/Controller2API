/**
 * Root component: holds the state of the screen (the input, and what is derived from it) and composes the
 * panes. It holds no domain rules; those live in `core/`, and the interface logic in `app/`.
 */
import { useDeferredValue, useMemo, useState } from 'react'
import { EMPTY_INPUT, readInput, type InputState } from './app/workspace.ts'
import type { WorkspacePart } from './app/workspaceParts.ts'
import { AppFooter } from './components/layout/AppFooter.tsx'
import { AppHeader } from './components/layout/AppHeader.tsx'
import { IntroPanel } from './components/layout/IntroPanel.tsx'
import { LinksPanel } from './components/layout/LinksPanel.tsx'
import { Workspace } from './components/layout/Workspace.tsx'
import { Pane } from './components/common/Pane.tsx'
import { ModelsPane } from './components/models/ModelsPane.tsx'
import { EndpointsPane } from './components/endpoints/EndpointsPane.tsx'
import { resolveApi } from './core/api/spec.ts'
import { pendingDecisions } from './core/design/edit.ts'
import { findExample, type ExampleId } from './examples/index.ts'
import { useApiDesign } from './hooks/useApiDesign.ts'
import { useProjectSettings } from './hooks/useProjectSettings.ts'
import { useUndoShortcuts } from './hooks/useUndoShortcuts.ts'
import { useI18n } from './i18n/useI18n.ts'
import './App.css'

/** The whole tool, in a single screen (personal_web_style `layouts/tool-page.md`). */
function App() {
  const { t } = useI18n()
  const [input, setInput] = useState<InputState>(EMPTY_INPUT)
  const [part, setPart] = useState<WorkspacePart>('models')

  // Large inputs are read after the keystroke is painted, so typing stays smooth
  const deferredInput = useDeferredValue(input)
  const read = useMemo(() => readInput(deferredInput), [deferredInput])
  const inputError = input.text.trim() !== '' && (!read.format || (read.outcome !== null && !read.outcome.ok))
  const schema = read.outcome?.ok ? read.outcome.schema : null

  const [settings, updateSettings] = useProjectSettings()
  const designState = useApiDesign(schema)
  const { design } = designState
  useUndoShortcuts(designState.history)
  const spec = useMemo(() => (schema && design ? resolveApi(schema, design, settings) : null), [schema, design, settings])
  const pending = design ? pendingDecisions(design).length : 0

  function loadExample(id: ExampleId) {
    const example = findExample(id)
    if (!example) return
    if (input.text.trim() !== '' && !window.confirm(t.confirmReplace)) return
    // A different set of models: the decisions made on the previous ones do not apply
    designState.load(null)
    setInput({ text: example.text, format: example.format })
    updateSettings({ name: example.project })
    setPart('endpoints')
  }

  return (
    <div className="app">
      <AppHeader />
      <main className="app__main">
        <IntroPanel onExample={loadExample} />
        <Workspace
          part={part}
          errors={{ models: inputError }}
          counts={{ endpoints: pending + (spec?.issues.filter((issue) => issue.severity === 'error').length ?? 0) }}
          panes={{
            models: <ModelsPane input={input} read={read} onChange={setInput} />,
            endpoints: (
              <EndpointsPane schema={schema} design={design} settings={settings} issues={spec?.issues ?? []} state={designState} />
            ),
            project: (
              <Pane title={t.workspaceParts.project}>
                <p className="pane-empty">{t.projectEmpty}</p>
              </Pane>
            ),
          }}
        />
        <LinksPanel />
      </main>
      <AppFooter />
    </div>
  )
}

export default App
