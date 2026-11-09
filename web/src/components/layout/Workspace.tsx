/**
 * Workspace: the models and their endpoints side by side, and the generated project under them, at full
 * width. Below 1100px one part at a time, chosen with tabs (personal_web_style RESPONSIVE_GUIDE.md).
 */
import { useState } from 'react'
import { WORKSPACE_PARTS, type WorkspacePart } from '../../app/workspaceParts.ts'
import { useI18n } from '../../i18n/useI18n.ts'
import { Pane } from '../common/Pane.tsx'
import { onTabListKeyDown } from '../common/tabKeys.ts'
import './Workspace.css'

/** Models → Endpoints → Project, with the tabs that show one part at a time on narrow screens. */
export function Workspace() {
  const { t } = useI18n()
  const [part, setPart] = useState<WorkspacePart>('models')

  return (
    <>
      <div
        className="workspace__tabs"
        role="tablist"
        aria-label={t.workspaceLabel}
        onKeyDown={(event) => onTabListKeyDown(event, (index) => setPart(WORKSPACE_PARTS[index]))}
      >
        {WORKSPACE_PARTS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={part === id}
            tabIndex={part === id ? 0 : -1}
            className="workspace__tab"
            onClick={() => setPart(id)}
          >
            {t.workspaceParts[id]}
          </button>
        ))}
      </div>
      <div className="workspace" data-part={part}>
        <div className="workspace__top">
          <Pane title={t.workspaceParts.models}>
            <p className="pane-empty">{t.modelsEmpty}</p>
          </Pane>
          <Pane title={t.workspaceParts.endpoints}>
            <p className="pane-empty">{t.endpointsEmpty}</p>
          </Pane>
        </div>
        <div className="workspace__project">
          <Pane title={t.workspaceParts.project}>
            <p className="pane-empty">{t.projectEmpty}</p>
          </Pane>
        </div>
      </div>
    </>
  )
}
