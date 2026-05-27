'use client'

export type LanguageMode = 'de' | 'en'

export const LANGUAGE_STORAGE_KEY = 'festag_language'
export const LANGUAGE_EVENT = 'festag-language'

export function isLanguageMode(value: unknown): value is LanguageMode {
  return value === 'de' || value === 'en'
}

export function getLanguageMode(): LanguageMode {
  if (typeof window === 'undefined') return 'de'
  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isLanguageMode(saved) ? saved : 'de'
}

export function applyLanguageMode(mode: LanguageMode) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = mode
  document.documentElement.setAttribute('data-language', mode)
}

export function setLanguageMode(mode: LanguageMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, mode)
  applyLanguageMode(mode)
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: mode }))
}
