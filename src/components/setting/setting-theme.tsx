import { MenuItem, Select } from '@mui/material'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogRef } from '@/components/base'
import { useVerge } from '@/hooks/use-verge'
import { supportedLanguages } from '@/services/i18n'

import { ArkSegmented } from './mods/ark-segmented'
import { GuardState } from './mods/guard-state'
import { LayoutViewer } from './mods/layout-viewer'
import { SettingItem, SettingList } from './mods/setting-comp'

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ru: 'Русский',
  zh: '简体中文',
  fa: 'فارسی',
  tt: 'Татар',
  id: 'Bahasa Indonesia',
  ar: 'العربية',
  ko: '한국어',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  jp: '日本語',
  zhtw: '繁體中文',
  pt: 'Português',
}

interface Props {
  onError?: (err: Error) => void
}

/**
 * 主题: how the app looks and reads. Split out of the basic section so
 * appearance has one home; the language row joined it (user, 11-13).
 */
const SettingTheme = ({ onError }: Props) => {
  const { t } = useTranslation()
  const { verge, mutateVerge, patchVerge } = useVerge()

  const { theme_mode, language } = verge ?? {}

  const layoutRef = useRef<DialogRef>(null)

  const onChangeData = (patch: any) => {
    mutateVerge({ ...verge, ...patch }, false)
  }

  // supportedLanguages is a plain string[] of codes — entries() would turn the
  // codes into array indexes and the config never learned a language (real bug
  // found in the 11-14 review). Restored from the pre-regroup basic page.
  const languageOptions = supportedLanguages.map((code) => ({
    code,
    label: LANGUAGE_LABELS[code] ?? code,
  }))

  return (
    <SettingList title={t('settings.sections.theme.title')}>
      <LayoutViewer ref={layoutRef} />

      <SettingItem
        label={t('settings.components.verge.basic.fields.themeMode')}
      >
        <GuardState
          value={theme_mode}
          onCatch={onError}
          onChange={(e) => onChangeData({ theme_mode: e })}
          onGuard={(e) => patchVerge({ theme_mode: e })}
        >
          <ArkSegmented
            options={[
              { value: 'light', label: t('settings.sections.appearance.light') },
              { value: 'dark', label: t('settings.sections.appearance.dark') },
              { value: 'system', label: t('settings.sections.appearance.system') },
            ]}
          />
        </GuardState>
      </SettingItem>

      <SettingItem
        onClick={() => layoutRef.current?.open()}
        label={t('settings.components.verge.basic.fields.layoutSetting')}
      />

      <SettingItem label={t('settings.components.verge.basic.fields.language')}>
        <GuardState
          value={language ?? 'en'}
          onCatch={onError}
          onFormat={(e: any) => e.target.value}
          onChange={(e) => onChangeData({ language: e })}
          onGuard={(e) => patchVerge({ language: e })}
        >
          <Select size="small" sx={{ width: 110, '> div': { py: '7.5px' } }}>
            {languageOptions.map(({ code, label }) => (
              <MenuItem key={code} value={code}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </GuardState>
      </SettingItem>
    </SettingList>
  )
}

export default SettingTheme
