// Global theme context — Dark / Light / Read mode
export type ThemeMode = 'dark' | 'light' | 'read'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('festag_theme') as ThemeMode) || 'dark'
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem('festag_theme', mode)
  applyTheme(mode)
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
}

// CSS variables per theme — applied to :root via data-theme
export const THEMES = {
  dark: {
    bg: '#0E0F0E',
    surface: '#161917',
    card: '#1C1F1C',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    text: '#F4F5F4',
    textSec: '#7A8780',
    textMut: '#3E4642',
    btnPrim: '#FFFFFF',
    btnPrimText: '#0E0F0E',
    btnSec: 'rgba(255,255,255,0.07)',
    btnSecText: '#F4F5F4',
    btnSecBorder: 'rgba(255,255,255,0.1)',
    inp: 'rgba(255,255,255,0.05)',
    inpBorder: 'rgba(255,255,255,0.1)',
    inpFocus: 'rgba(255,255,255,0.09)',
    inpFocusBorder: 'rgba(255,255,255,0.35)',
    glow: 'rgba(255,255,255,0.05)',
    sidebarBg: 'rgba(22,25,23,0.96)',
    sidebarBorder: 'rgba(255,255,255,0.07)',
    navOn: 'rgba(255,255,255,0.1)',
    navOnText: '#FFFFFF',
    navOffText: '#4A5450',
  },
  light: {
    bg: '#F8F9F8',
    surface: '#FFFFFF',
    card: '#F1F3F1',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.18)',
    text: '#0F120F',
    textSec: '#4A5450',
    textMut: '#9AA49E',
    btnPrim: '#323635',
    btnPrimText: '#FFFFFF',
    btnSec: '#FFFFFF',
    btnSecText: '#323635',
    btnSecBorder: 'rgba(0,0,0,0.12)',
    inp: '#FFFFFF',
    inpBorder: 'rgba(0,0,0,0.12)',
    inpFocus: '#FFFFFF',
    inpFocusBorder: '#323635',
    glow: 'rgba(50,54,53,0.07)',
    sidebarBg: 'rgba(255,255,255,0.92)',
    sidebarBorder: 'rgba(255,255,255,0.95)',
    navOn: '#F1F3F1',
    navOnText: '#0F120F',
    navOffText: '#64748B',
  },
  read: {
    bg: '#F5F0E8',
    surface: '#FDFAF4',
    card: '#EDE8DE',
    border: 'rgba(0,0,0,0.07)',
    borderStrong: 'rgba(0,0,0,0.14)',
    text: '#2C2416',
    textSec: '#6B5E47',
    textMut: '#A09278',
    btnPrim: '#2C2416',
    btnPrimText: '#FDFAF4',
    btnSec: '#FDFAF4',
    btnSecText: '#2C2416',
    btnSecBorder: 'rgba(0,0,0,0.1)',
    inp: '#FDFAF4',
    inpBorder: 'rgba(0,0,0,0.1)',
    inpFocus: '#FFFFFF',
    inpFocusBorder: '#2C2416',
    glow: 'rgba(44,36,22,0.06)',
    sidebarBg: 'rgba(253,250,244,0.94)',
    sidebarBorder: 'rgba(0,0,0,0.06)',
    navOn: '#EDE8DE',
    navOnText: '#2C2416',
    navOffText: '#8B7355',
  }
}
