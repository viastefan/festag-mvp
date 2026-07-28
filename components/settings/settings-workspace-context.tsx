'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type SettingsWorkspaceApi = {
  savedLabel: string
  setSavedLabel: (label: string) => void
  clearSavedLabel: () => void
}

const SettingsWorkspaceContext = createContext<SettingsWorkspaceApi | null>(null)

export function SettingsWorkspaceProvider({ children }: { children: ReactNode }) {
  const [savedLabel, setSavedLabelState] = useState('')
  const setSavedLabel = useCallback((label: string) => {
    setSavedLabelState(label)
  }, [])
  const clearSavedLabel = useCallback(() => {
    setSavedLabelState('')
  }, [])
  const value = useMemo(
    () => ({ savedLabel, setSavedLabel, clearSavedLabel }),
    [savedLabel, setSavedLabel, clearSavedLabel],
  )
  return (
    <SettingsWorkspaceContext.Provider value={value}>
      {children}
    </SettingsWorkspaceContext.Provider>
  )
}

export function useSettingsWorkspace() {
  return useContext(SettingsWorkspaceContext)
}
