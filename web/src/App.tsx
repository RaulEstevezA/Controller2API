/**
 * Root component: composes the screen of the tool. It holds no domain rules; those live in `core/`.
 */
import { AppFooter } from './components/layout/AppFooter.tsx'
import { AppHeader } from './components/layout/AppHeader.tsx'
import { IntroPanel } from './components/layout/IntroPanel.tsx'
import { LinksPanel } from './components/layout/LinksPanel.tsx'
import { Workspace } from './components/layout/Workspace.tsx'
import './App.css'

/** The whole tool, in a single screen (personal_web_style `layouts/tool-page.md`). */
function App() {
  return (
    <div className="app">
      <AppHeader />
      <main className="app__main">
        <IntroPanel />
        <Workspace />
        <LinksPanel />
      </main>
      <AppFooter />
    </div>
  )
}

export default App
