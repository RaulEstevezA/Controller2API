/**
 * Presentation of the tool: icon and name, what it does, and how it treats the user's models.
 * Styled like the website's windows (personal_web_style layouts/tool-page.md, "Presentación").
 */
import { useI18n } from '../../i18n/useI18n.ts'
import './IntroPanel.css'

/** Window at the top of the page: the first thing a visitor reads. */
export function IntroPanel() {
  const { t } = useI18n()

  return (
    <section className="intro window" aria-labelledby="intro-title">
      <div className="intro__title">
        <h1 id="intro-title" className="intro__name">
          {/* Decorative: the accessible name of the title is the tool's name */}
          <img className="intro__icon" src={`${import.meta.env.BASE_URL}favicon.svg`} width="32" height="32" alt="" />
          Model2API
        </h1>
        <span className="intro__badge">{t.processedLocally}</span>
      </div>
      <p className="intro__subtitle">{t.tagline}</p>
      <p className="intro__description">{t.introDescription}</p>
      <div className="intro__privacy" role="note" aria-labelledby="privacy-title">
        <p id="privacy-title" className="intro__privacy-title">
          {t.privacyTitle}
        </p>
        <ul className="intro__privacy-list">
          {t.privacyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
