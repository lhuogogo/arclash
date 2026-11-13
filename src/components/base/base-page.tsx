import { Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import React, { ReactNode } from 'react'

import { BaseErrorBoundary } from './base-error-boundary'

interface Props {
  title?: React.ReactNode // the page title
  /** Latin subtitle rendered next to the title, e.g. PROXIES */
  subtitle?: React.ReactNode
  header?: React.ReactNode // something behind title
  contentStyle?: React.CSSProperties
  children?: ReactNode
  full?: boolean
}

/**
 * Page shell shared by every inner page.
 *
 * The header was a 58px bar with a 20px title. It is now the compact v6 head:
 * 15px/800 title with 3px tracking, an uppercase 9px Latin subtitle, and a
 * bottom rule. Height is driven by the content plus padding rather than a
 * fixed 58px, which is what lets the main view show more rows.
 *
 * Sizes come from prototype/v6.html `.pg-head` / `.pg-title` / `.pg-sub` / `.en`.
 */
export const BasePage: React.FC<Props> = (props) => {
  const { title, subtitle, header, contentStyle, full, children } = props
  const theme = useTheme()

  const isDark = theme.palette.mode === 'dark'

  return (
    <BaseErrorBoundary>
      <div className="base-page">
        <header
          className="base-page__head"
          data-tauri-drag-region="true"
          style={{ userSelect: 'none' }}
        >
          <Typography
            className="base-page__title"
            sx={{ fontSize: '15px', fontWeight: 800, letterSpacing: '3px' }}
            data-tauri-drag-region="true"
          >
            {title}
          </Typography>

          {subtitle ? (
            <span className="base-page__subtitle">{subtitle}</span>
          ) : null}

          {header}
        </header>

        <div
          className={full ? 'base-container no-padding' : 'base-container'}
          style={{ backgroundColor: isDark ? '#2d2e2e' : '#ffffff' }}
        >
          <section
            style={{
              backgroundColor: isDark ? '#2d2e2e' : 'var(--background-color)',
            }}
          >
            <div className="base-content" style={contentStyle}>
              {children}
            </div>
          </section>
        </div>
      </div>
    </BaseErrorBoundary>
  )
}
