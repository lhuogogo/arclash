import { ChevronRightRounded } from '@mui/icons-material'
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import React, { ReactNode, useState } from 'react'

import isAsyncFunction from '@/utils/is-async-function'

interface ItemProps {
  label: ReactNode
  /** Visible asterisk note under the title; replaces hover-only tooltips. */
  note?: ReactNode
  extra?: ReactNode
  children?: ReactNode
  secondary?: ReactNode
  onClick?: () => void | Promise<any>
}

export const SettingItem: React.FC<ItemProps> = ({
  label,
  note,
  extra,
  children,
  secondary,
  onClick,
}) => {
  const clickable = !!onClick

  const primary = (
    <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
      {/* 方舟化：粗体标题带下缘短线，线与文字同宽 */}
      <Box
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: 0.5,
          pb: '6px',
          borderBottom: '1px solid var(--ark-border)',
        }}
      >
        {label}
      </Box>
      {extra ? extra : null}
    </Box>
  )

  const noteNode = note ? (
    <Box
      sx={{
        mt: '7px',
        fontSize: 12,
        lineHeight: 1.5,
        color: 'var(--ark-text-2)',
        '&::before': {
          content: '"*"',
          color: 'var(--ark-text-3)',
          mr: '2px',
        },
      }}
    >
      {note}
    </Box>
  ) : null

  const [isLoading, setIsLoading] = useState(false)
  const handleClick = () => {
    if (onClick) {
      if (isAsyncFunction(onClick)) {
        setIsLoading(true)
        onClick()!.finally(() => setIsLoading(false))
      } else {
        onClick()
      }
    }
  }

  return clickable ? (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick} disabled={isLoading}>
        <ListItemText
          primary={primary}
          secondary={
            <>
              {noteNode}
              {secondary}
            </>
          }
        />
        {isLoading ? (
          <CircularProgress color="inherit" size={20} />
        ) : (
          <ChevronRightRounded />
        )}
      </ListItemButton>
    </ListItem>
  ) : (
    <ListItem sx={{ pt: '14px', pb: '12px' }}>
      <ListItemText
        primary={primary}
        secondary={
          <>
            {noteNode}
            {secondary}
          </>
        }
      />
      {children}
    </ListItem>
  )
}

export const SettingList: React.FC<{
  title: string
  children: ReactNode
}> = ({ title, children }) => (
  <List>
    {/* 方舟化：深色横幅标题条 */}
    <Box
      sx={{
        backgroundColor: 'var(--ark-banner)',
        border: '1px solid var(--ark-divider)',
        padding: '8px 16px',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 2,
        color: 'var(--ark-text, #fff)',
        mb: '6px',
      }}
    >
      {title}
    </Box>

    {children}
  </List>
)
