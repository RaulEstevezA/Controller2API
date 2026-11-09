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
  it('shows the name of the tool', () => {
    renderApp()
    expect(screen.getByText('Model2API')).toBeTruthy()
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
    expect(document.documentElement.lang).toBe('es')
    expect(localStorage.getItem('lang')).toBe('es')
  })
})
