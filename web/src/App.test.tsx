// @vitest-environment jsdom
/**
 * Interface tests of the whole screen: what a visitor sees when the tool opens.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18nProvider.tsx'

afterEach(cleanup)

function renderApp() {
  return render(
    <I18nProvider>
      <App />
    </I18nProvider>,
  )
}

describe('App', () => {
  it('presents the tool with its name as the main heading', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'Model2API' })).toBeTruthy()
    expect(screen.getByRole('note', { name: 'Your models stay on your computer' })).toBeTruthy()
  })

  it('links the name in the header to the website', () => {
    renderApp()
    expect(screen.getByRole('link', { name: 'Raúl Estévez' }).getAttribute('href')).toBe('https://raulesteveza.github.io/')
  })

  it('changes the language of the page and stores it for the whole site', () => {
    localStorage.setItem('lang', 'en')
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'ES' }))
    expect(screen.getByRole('button', { name: 'ES' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('group', { name: 'Idioma' })).toBeTruthy()
    expect(screen.getByText('Procesado en local')).toBeTruthy()
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem('lang')).toBe('es')
  })
})
