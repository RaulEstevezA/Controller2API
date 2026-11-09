/**
 * Root component: composes the screen of the tool. It holds no domain rules; those live in `core/`.
 */
import { AppHeader } from './components/layout/AppHeader.tsx'
import './App.css'

/** The whole tool, in a single screen (personal_web_style `layouts/tool-page.md`). */
function App() {
  return (
    <div className="app">
      <AppHeader />
      <main className="app__main">Model2API</main>
    </div>
  )
}

export default App
