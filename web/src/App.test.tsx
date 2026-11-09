// @vitest-environment jsdom
/**
 * Interface tests of the whole screen: what a visitor sees when the tool opens.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.tsx'

afterEach(cleanup)

describe('App', () => {
  it('shows the name of the tool', () => {
    render(<App />)
    expect(screen.getByText('Model2API')).toBeTruthy()
  })
})
