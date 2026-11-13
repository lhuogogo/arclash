import getSystem from '@/utils/get-system'
const OS = getSystem()

// default theme setting
export const defaultTheme = {
  primary_color: '#007AFF',
  secondary_color: '#FC9B76',
  primary_text: '#000000',
  secondary_text: '#3C3C4399',
  info_color: '#007AFF',
  error_color: '#FF3B30',
  warning_color: '#FF9500',
  success_color: '#06943D',
  background_color: '#F5F5F5',
  font_family: `-apple-system, BlinkMacSystemFont,"Microsoft YaHei UI", "Microsoft YaHei", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji"${
    OS === 'windows' ? ', twemoji mozilla' : ''
  }`,
}

// dark mode
// ArClash skin: neutral dark grey base with a single cyan accent.
// Orange is reserved for status only, never decoration.
// Measured values, see docs/视觉风格定调.md §3.
export const defaultDarkTheme = {
  ...defaultTheme,
  primary_color: '#19B4E2',
  secondary_color: '#9A9A9A',
  primary_text: '#FFFFFF',
  background_color: '#2D2E2E',
  secondary_text: '#9A9A9A',
  info_color: '#19B4E2',
  error_color: '#FF6018',
  warning_color: '#FF6018',
  success_color: '#19B4E2',
}
