'use client'

import React, { useState, useMemo, useEffect, Fragment } from 'react'
import {
  AlertTriangle, Layers, User, HelpCircle, Menu,
  Search, ChevronDown, ChevronRight, Edit3, MoreHorizontal,
  CornerDownRight, RefreshCw, CheckCircle2, X, Upload,
  Play, LayoutGrid, CalendarDays, ClipboardList,
  Building2, BarChart3, Settings, Calendar, ArrowRight,
  MoveRight, Check, FileSpreadsheet, RotateCcw, Filter, Info
} from 'lucide-react'

// --- UTILS ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

function formatDayLabel(dateStr: string): string {
  const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return dateStr
  const [, d, m, y] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  return `${weekdays[date.getDay()]}, ${dateStr}`
}

// --- TYPES ---
export type PlanningStatus = 'auto' | 'planned' | 'override'
export type MissedHandling = 'jump' | 'replan'

export interface AreaCategory {
  key: string
  name: string
  frequency: string
  date: string | null
  status: PlanningStatus
  overridden: boolean
}

export interface Area {
  id: string
  name: string
  gebaeude: string
  stockwerk: string
  flaechentyp: string
  frequencies: { label: string; highest?: boolean }[]
  firstExecutionDay: string
  missedHandling: MissedHandling
  nextFixed: string
  categories: AreaCategory[]
  manualMods: number
}

export interface AreaGroup {
  flaechentyp: string
  areas: Area[]
}

const MISSED_HANDLING_LABEL: Record<string, string> = {
  jump: 'Auf nächstes Datum springen',
  replan: 'Neu planen',
}

// --- MOCK DATA ---
const INITIAL_GROUPS: AreaGroup[] = [
  {
    flaechentyp: 'Büro',
    areas: [
      {
        id: 'buero-1',
        name: 'Büro 1',
        gebaeude: 'Hauptgebäude A',
        stockwerk: '1. OG',
        flaechentyp: 'Büro',
        frequencies: [{ label: '@1xM', highest: true }, { label: '@1xJ' }],
        firstExecutionDay: '01.07.2026',
        missedHandling: 'jump',
        nextFixed: '01.07.2026',
        manualMods: 1,
        categories: [
          { key: 'grund', name: 'Grundreinigung', frequency: '1xJ', date: '01.01.2026', status: 'planned', overridden: false },
          { key: 'zwischen', name: 'Zwischenreinigung', frequency: '4xJ', date: '01.07.2026', status: 'auto', overridden: false },
          { key: 'maschinell', name: 'maschinelle Reinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false },
          { key: 'desinf', name: 'Desinfektion', frequency: '1xM', date: '05.06.2026', status: 'override', overridden: true },
        ],
      },
      {
        id: 'buero-2',
        name: 'Büro 2',
        gebaeude: 'Hauptgebäude A',
        stockwerk: '1. OG',
        flaechentyp: 'Büro',
        frequencies: [{ label: '@1xM', highest: true }],
        firstExecutionDay: '01.07.2026',
        missedHandling: 'replan',
        nextFixed: '15.07.2026',
        manualMods: 0,
        categories: [
          { key: 'grund', name: 'Grundreinigung', frequency: '1xJ', date: '01.01.2026', status: 'planned', overridden: false },
          { key: 'maschinell', name: 'maschinelle Reinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false },
          { key: 'desinf', name: 'Desinfektion', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false },
        ],
      },
    ],
  },
  {
    flaechentyp: 'Flur & Erschliessung',
    areas: [
      {
        id: 'flur-eg',
        name: 'Empfangshalle & Flur EG',
        gebaeude: 'Hauptgebäude A',
        stockwerk: 'EG',
        flaechentyp: 'Flur & Erschliessung',
        frequencies: [{ label: '@2xM', highest: true }, { label: '@1xM' }],
        firstExecutionDay: '01.06.2026',
        missedHandling: 'jump',
        nextFixed: '01.06.2026',
        manualMods: 2,
        categories: [
          { key: 'kristall', name: 'Kristallisierung', frequency: '1xJ', date: '15.03.2026', status: 'override', overridden: true },
          { key: 'glas', name: 'Glas- & Rahmenreinigung', frequency: '2xM', date: '01.06.2026', status: 'auto', overridden: false },
          { key: 'boden', name: 'Bodenbeschichtung', frequency: '1xM', date: '10.06.2026', status: 'override', overridden: true },
        ],
      },
      {
        id: 'flur-1og',
        name: 'Flur 1. Obergeschoss',
        gebaeude: 'Hauptgebäude A',
        stockwerk: '1. OG',
        flaechentyp: 'Flur & Erschliessung',
        frequencies: [{ label: '@1xM', highest: true }],
        firstExecutionDay: '01.06.2026',
        missedHandling: 'replan',
        nextFixed: '01.06.2026',
        manualMods: 0,
        categories: [
          { key: 'glas', name: 'Glas- & Rahmenreinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false },
          { key: 'unterhalt', name: 'Intensivreinigung', frequency: '4xJ', date: '01.08.2026', status: 'planned', overridden: false },
        ],
      },
    ],
  },
  {
    flaechentyp: 'Sanitärbereich',
    areas: [
      {
        id: 'sanitaer-101',
        name: 'Sanitär H-101 (Herren)',
        gebaeude: 'Nebengebäude B',
        stockwerk: 'EG',
        flaechentyp: 'Sanitärbereich',
        frequencies: [{ label: '@2xM', highest: true }],
        firstExecutionDay: '01.06.2026',
        missedHandling: 'jump',
        nextFixed: '01.06.2026',
        manualMods: 0,
        categories: [
          { key: 'entkalkung', name: 'Grundentkalkung', frequency: '2xM', date: '01.06.2026', status: 'auto', overridden: false },
          { key: 'fliesen', name: 'Fliesen-Dampfreinigung', frequency: '1xM', date: '15.06.2026', status: 'planned', overridden: false },
        ],
      },
      {
        id: 'sanitaer-102',
        name: 'Sanitär D-102 (Damen)',
        gebaeude: 'Nebengebäude B',
        stockwerk: 'EG',
        flaechentyp: 'Sanitärbereich',
        frequencies: [{ label: '@2xM', highest: true }],
        firstExecutionDay: '01.06.2026',
        missedHandling: 'jump',
        nextFixed: '05.06.2026',
        manualMods: 1,
        categories: [
          { key: 'entkalkung', name: 'Grundentkalkung', frequency: '2xM', date: '05.06.2026', status: 'override', overridden: true },
          { key: 'fliesen', name: 'Fliesen-Dampfreinigung', frequency: '1xM', date: '15.06.2026', status: 'planned', overridden: false },
        ],
      },
    ],
  },
]

// --- UI BADGES & PILLS ---
function FreqHighPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
      {label} <span className="font-normal text-blue-100">· Häufigste</span>
    </span>
  )
}

function FreqLowPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      {label}
    </span>
  )
}

function OverrideBadge({ label = 'Übersteuert' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-300">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {label}
    </span>
  )
}

// --- LAYOUT COMPONENTS ---
function Sidebar() {
  const items = [
    { icon: LayoutGrid, label: 'Übersicht' },
    { icon: CalendarDays, label: 'Monatsplanung' },
    { icon: ClipboardList, label: 'Aufträge' },
    { icon: Building2, label: 'Objekte' },
    { icon: BarChart3, label: 'Auswertungen' },
  ]
  const [active, setActive] = useState('Monatsplanung')

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 bg-slate-900 py-3 z-10">
      {items.map(({ icon: Icon, label }) => (
        <button
          key={label}
          onClick={() => setActive(label)}
          className={cn(
            'group relative inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
            active === label ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
          title={label}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
      <div className="mt-auto">
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" title="Einstellungen">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </aside>
  )
}

function TopHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-amber-500 px-4 text-white shadow-xs z-20 relative">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-sm font-black tracking-tight">s</div>
        <h1 className="text-base font-semibold tracking-tight">Monatsplanung</h1>
      </div>
      <div className="flex items-center gap-1">
        {[AlertTriangle, Layers, User, HelpCircle, Menu].map((Icon, i) => (
          <button key={i} className="flex h-9 w-9 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/15">
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </header>
  )
}

// --- FILTER BAR ---
interface FilterBarProps {
  search: string
  onSearch: (v: string) => void
  gebaeude: string
  onGebaeude: (v: string) => void
  stockwerk: string
  onStockwerk: (v: string) => void
  flaechentyp: string
  onFlaechentyp: (v: string) => void
  frequenz: string
  onFrequenz: (v: string) => void
  kategorie: string
  onKategorie: (v: string) => void
  onlyManualMods: boolean
  onToggleManualMods: () => void
  onResetFilters: () => void
}

function FilterBar({
  search, onSearch,
  gebaeude, onGebaeude,
  stockwerk, onStockwerk,
  flaechentyp, onFlaechentyp,
  frequenz, onFrequenz,
  kategorie, onKategorie,
  onlyManualMods, onToggleManualMods,
  onResetFilters
}: FilterBarProps) {
  const isFiltered = search || gebaeude !== 'all' || stockwerk !== 'all' || flaechentyp !== 'all' || frequenz !== 'all' || kategorie !== 'all' || onlyManualMods

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-6 py-3 shadow-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Fläche suchen..."
          className="h-9 w-52 rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <select value={gebaeude} onChange={(e) => onGebaeude(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
        <option value="all">Gebäude: Alle</option>
        <option value="Hauptgebäude A">Hauptgebäude A</option>
        <option value="Nebengebäude B">Nebengebäude B</option>
      </select>

      <select value={stockwerk} onChange={(e) => onStockwerk(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
        <option value="all">Stockwerk: Alle</option>
        <option value="EG">Erdgeschoss (EG)</option>
        <option value="1. OG">1. Obergeschoss</option>
      </select>

      <select value={flaechentyp} onChange={(e) => onFlaechentyp(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
        <option value="all">Flächentyp: Alle</option>
        <option value="Büro">Büro</option>
        <option value="Flur & Erschliessung">Flur &amp; Erschliessung</option>
        <option value="Sanitärbereich">Sanitärbereich</option>
      </select>

      <select value={frequenz} onChange={(e) => onFrequenz(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
        <option value="all">Frequenz: Alle</option>
        <option value="1xM">1x Pro Monat (1xM)</option>
        <option value="2xM">2x Pro Monat (2xM)</option>
        <option value="4xJ">4x Pro Jahr (4xJ)</option>
        <option value="1xJ">1x Pro Jahr (1xJ)</option>
      </select>

      <select value={kategorie} onChange={(e) => onKategorie(e.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
        <option value="all">Kategorie: Alle</option>
        <option value="Grundreinigung">Grundreinigung</option>
        <option value="Zwischenreinigung">Zwischenreinigung</option>
        <option value="maschinelle Reinigung">maschinelle Reinigung</option>
        <option value="Desinfektion">Desinfektion</option>
        <option value="Kristallisierung">Kristallisierung</option>
        <option value="Grundentkalkung">Grundentkalkung</option>
      </select>

      <button
        onClick={onToggleManualMods}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-all',
          onlyManualMods
            ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-xs ring-2 ring-amber-200'
            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        )}
      >
        <AlertTriangle className={cn('h-4 w-4', onlyManualMods ? 'text-amber-600' : 'text-slate-400')} />
        Nur manuelle Änderungen
        {onlyManualMods && <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">Aktiv</span>}
      </button>

      {isFiltered && (
        <button onClick={onResetFilters} className="inline-flex h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <X className="h-3.5 w-3.5" /> Filter zurücksetzen
        </button>
      )}
    </div>
  )
}

function BulkActionBar({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 transition-all animate-in slide-in-from-bottom-4">
      <div className="pointer-events-auto flex w-full max-w-4xl flex-wrap items-center gap-3 rounded-xl bg-[#0A2540] px-4 py-3 shadow-2xl ring-1 ring-white/10">
        <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white shadow-xs">
          {count} {count === 1 ? 'Fläche' : 'Flächen'} ausgewählt
        </span>
        <select className="rounded-md border border-white/30 bg-[#0A2540] px-3 py-2 text-sm text-white outline-none focus:border-white/60 focus:ring-2 focus:ring-blue-500/50">
          <option value="">Aktion wählen</option>
          <option value="startdate">Startdatum anpassen</option>
          <option value="delete">Konfiguration löschen</option>
          <option value="reset">Auf Standard zurücksetzen</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onClear} className="inline-flex items-center gap-1 rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" /> Abbrechen
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-xs">
            Anwenden
          </button>
        </div>
      </div>
    </div>
  )
}

// --- ROW DETAIL DRAWER ---
function RowDetail({ area, onShift }: { area: Area; onShift: (catName: string, catFreq: string, date: string) => void }) {
  const [timeframe, setTimeframe] = useState('12 Monate')

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 p-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* Top bar with buttons only (no paragraph) */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Detailkonfiguration für {area.name}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50">
              <Settings className="h-3.5 w-3.5 text-slate-500" /> Kategorie konfigurieren
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Auf automatische Planung zurücksetzen
            </button>
          </div>
        </div>

        {/* Timeframe Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
            {['3 Monate', '6 Monate', '12 Monate', '24 Monate'].map((t) => (
              <button key={t} onClick={() => setTimeframe(t)} className={cn('px-3 py-1 text-xs font-medium transition-colors', timeframe === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                {t}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{area.categories.length} Kategorien zugewiesen</span>
        </div>

        {/* Categories Grid */}
        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {area.categories.map((cat) => (
              <div key={cat.key} className={cn('flex flex-col justify-between rounded-lg border p-3.5 transition-all', cat.overridden ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 bg-white hover:border-slate-300')}>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">{cat.frequency}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">{cat.date ?? 'Nicht geplant'}</span>
                    {cat.overridden && <OverrideBadge label="Manuell übersteuert" />}
                  </div>
                </div>
                {cat.date && (
                  <button onClick={() => onShift(cat.name, cat.frequency, cat.date!)} className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50/50 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/80">
                    <MoveRight className="h-3.5 w-3.5" /> Termin verschieben
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- MATRIX TABLE ---
function MatrixTable({
  groups, selectedIds, expandedId, collapsedGroups,
  onToggleSelect, onToggleExpand, onToggleGroup, onEditCell
}: any) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full min-w-[950px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="w-10 px-3 py-3" />
            <th className="min-w-[220px] px-3 py-3">Fläche &amp; Standort</th>
            <th className="px-3 py-3">Erster Ausführungstag</th>
            <th className="px-3 py-3">Umgang mit nicht ausgeführt</th>
            <th className="px-3 py-3">Nächste fixe Reinigung</th>
            <th className="px-3 py-3 min-w-[320px]">Geplante Kategorien &amp; Termine</th>
            <th className="px-3 py-3 text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group: AreaGroup) => {
            const collapsed = collapsedGroups.includes(group.flaechentyp)

            return (
              <Fragment key={group.flaechentyp}>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  <td colSpan={7} className="px-3 py-2.5">
                    <button onClick={() => onToggleGroup(group.flaechentyp)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-blue-700">
                      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {group.flaechentyp}
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {group.areas.length} Fläche{group.areas.length === 1 ? '' : 'n'}
                      </span>
                    </button>
                  </td>
                </tr>
                {!collapsed &&
                  group.areas.map((area) => {
                    const expanded = expandedId === area.id
                    const selected = selectedIds.includes(area.id)

                    return (
                      <Fragment key={area.id}>
                        <tr onClick={() => onToggleExpand(area.id)} className={cn('cursor-pointer border-b border-slate-100 transition-colors', expanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/80', selected ? 'bg-blue-50/50' : '')}>
                          <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(area.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          </td>
                          <td className="px-2 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 text-slate-400">{expanded ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4" />}</span>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{area.name}</div>
                                <div className="text-xs text-slate-500">{area.gebaeude} · {area.stockwerk}</div>
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {area.frequencies.map((f) => f.highest ? <FreqHighPill key={f.label} label={f.label} /> : <FreqLowPill key={f.label} label={f.label} />)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => onEditCell(area, 'Erster Ausführungstag', '', area.firstExecutionDay)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-xs hover:bg-slate-50">
                              {area.firstExecutionDay} <Edit3 className="h-3 w-3 text-slate-400" />
                            </button>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                              {area.missedHandling === 'jump' ? <CornerDownRight className="h-3.5 w-3.5 text-slate-400" /> : <RefreshCw className="h-3.5 w-3.5 text-slate-400" />}
                              {MISSED_HANDLING_LABEL[area.missedHandling]}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top"><span className="font-mono text-xs text-slate-700">{area.nextFixed}</span></td>
                          
                          <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-1.5">
                              {area.categories.map((cat) => (
                                <button
                                  key={cat.key}
                                  onClick={() => onEditCell(area, cat.name, cat.frequency, cat.date!)}
                                  className={cn(
                                    'group inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all',
                                    cat.overridden
                                      ? 'border-amber-300 bg-amber-50 text-amber-900 font-medium'
                                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                                  )}
                                  title={`${cat.name} (${cat.frequency})`}
                                >
                                  <span className="font-semibold">{cat.name}:</span>
                                  <span className="font-mono">{cat.date}</span>
                                  {cat.overridden && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                                </button>
                              ))}
                            </div>
                          </td>

                          <td className="px-3 py-3 align-top text-right" onClick={(e) => e.stopPropagation()}>
                            <button className="h-8 w-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 inline-flex justify-center items-center">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={7} className="p-0">
                              <RowDetail area={area} onShift={(catName, catFreq, date) => onEditCell(area, catName, catFreq, date)} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// --- DATE VIEW (STRUCTURED LIKE SCREENSHOT image_a90a50.png) ---
function DateView({ groups, onMoveEntry }: { groups: AreaGroup[]; onMoveEntry: (area: Area, catName: string, catFreq: string, date: string) => void }) {
  // Flatten all category dates and group chronologically by Month (e.g. "06.2026")
  const groupedByMonth = useMemo(() => {
    const flatList: { area: Area; category: AreaCategory; monthKey: string }[] = []

    groups.forEach((g) => {
      g.areas.forEach((a) => {
        a.categories.forEach((c) => {
          if (c.date) {
            const parts = c.date.split('.')
            const monthKey = parts.length === 3 ? `${parts[1]}.${parts[2]}` : 'Unbekannt'
            flatList.push({ area: a, category: c, monthKey })
          }
        })
      })
    })

    // Sort by date chronologically
    flatList.sort((a, b) => {
      const parse = (d: string) => d.split('.').reverse().join('-')
      return parse(a.category.date!).localeCompare(parse(b.category.date!))
    })

    // Grouping
    const res: { monthKey: string; items: typeof flatList }[] = []
    flatList.forEach((item) => {
      let g = res.find((x) => x.monthKey === item.monthKey)
      if (!g) {
        g = { monthKey: item.monthKey, items: [] }
        res.push(g)
      }
      g.items.push(item)
    })

    return res
  }, [groups])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Calendar className="h-4 w-4 text-slate-400" /> Chronologische Übersicht aller geplanten Reinigungen
      </div>

      <div className="space-y-8">
        {groupedByMonth.map((group) => (
          <div key={group.monthKey} className="space-y-3">
            {/* MONTH DIVIDER HEADER LIKE SCREENSHOT image_a90a50.png */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">{group.monthKey}</span>
              <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {group.items.length} Termine
              </span>
              <div className="h-px flex-1 bg-slate-200/80" />
            </div>

            {/* CARDS LIST MATCHING SCREENSHOT image_a90a50.png */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(({ area, category }, idx) => (
                <div key={idx} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatDayLabel(category.date!)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {area.name} · {area.flaechentyp}
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-800">
                      {category.name}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                        {category.frequency}
                      </span>
                      {category.overridden && <OverrideBadge label="Manuell übersteuert" />}
                    </div>
                  </div>

                  <button
                    onClick={() => onMoveEntry(area, category.name, category.frequency, category.date!)}
                    className="mt-4 w-full rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    Verschieben
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- SHIFT MODAL WITH DYNAMIC PREVIEW ---
export interface ShiftContext { areaId: string; areaName: string; categoryName: string; categoryFreq: string; currentDate: string }

const RadioRow = ({ checked, onChange, title, hint }: any) => (
  <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-all', checked ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:bg-slate-50')}>
    <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white')}>
      {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
    </span>
    <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
    <span>
      <span className="block text-sm font-medium text-slate-900">{title}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
    </span>
  </label>
)

function ShiftModal({ context, onClose, onSave }: { context: ShiftContext; onClose: () => void; onSave: (newDate: string) => void }) {
  const [newDate, setNewDate] = useState(context.currentDate)
  const [followMode, setFollowMode] = useState<'only' | 'all'>('only')
  const [categoryScope, setCategoryScope] = useState<'this' | 'sameFreq' | 'related'>('this')

  const toIso = (de: string) => de.match(/^(\d{2})\.(\d{2})\.(\d{4})$/) ? `${RegExp.$3}-${RegExp.$2}-${RegExp.$1}` : ''

  const followUpDates = useMemo(() => {
    if (followMode !== 'all') return []
    const parseDE = (s: string) => {
      const [d, m, y] = s.split('.').map(Number)
      return new Date(y, m - 1, d)
    }
    const formatDE = (dt: Date) => {
      const d = String(dt.getDate()).padStart(2, '0')
      const m = String(dt.getMonth() + 1).padStart(2, '0')
      const y = dt.getFullYear()
      return `${d}.${m}.${y}`
    }

    const baseOld = parseDE(context.currentDate)
    const baseNew = parseDE(newDate)

    return [1, 2, 3].map((offset) => {
      const oldDt = new Date(baseOld)
      oldDt.setMonth(oldDt.getMonth() + offset)

      const newDt = new Date(baseNew)
      newDt.setMonth(newDt.getMonth() + offset)

      return {
        label: `Folgetermin ${offset}`,
        oldDate: formatDE(oldDt),
        newDate: formatDE(newDt),
      }
    })
  }, [followMode, context.currentDate, newDate])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Reinigungstermin anpassen</h3>
            <p className="text-sm text-slate-500">{context.categoryName} ({context.areaName})</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 overflow-y-auto p-6 lg:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">1. Neuen Termin wählen</h4>
              <div className="relative max-w-xs">
                <input
                  type="date"
                  value={toIso(newDate)}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-')
                    if (y && m && d) setNewDate(`${d}.${m}.${y}`)
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">2. Folgetermine</h4>
              <div className="flex flex-col gap-2">
                <RadioRow checked={followMode === 'only'} onChange={() => setFollowMode('only')} title="Nur dieser Termin" />
                <RadioRow checked={followMode === 'all'} onChange={() => setFollowMode('all')} title="Auch alle Folgetermine" />
              </div>
              {followMode === 'all' && (
                <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  <Info className="h-4 w-4 shrink-0" />
                  Folgetermine ab {newDate} werden neu geplant.
                </div>
              )}
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold text-slate-900">3. Betroffene Kategorien und Frequenzen</h4>
              <div className="flex flex-col gap-2">
                <RadioRow checked={categoryScope === 'this'} onChange={() => setCategoryScope('this')} title="Nur Termin dieser Kategorie ändern" />
                <RadioRow checked={categoryScope === 'sameFreq'} onChange={() => setCategoryScope('sameFreq')} title="Auch Termine von Kategorien mit gleichem Datum und gleicher Frequenz ändern" />
                <RadioRow checked={categoryScope === 'related'} onChange={() => setCategoryScope('related')} title="Termine von allen zusammenhängenden Kategorien ändern" />
              </div>
            </section>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="mb-3 text-xs font-bold tracking-wider uppercase text-slate-500">VORSCHAU — BETROFFENE TERMINE</h4>
            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="text-xs font-semibold text-slate-800">{context.categoryName} ({context.categoryFreq})</div>
                <div className="mt-1 flex items-center gap-2 font-mono text-xs">
                  <span className="line-through text-slate-400">{context.currentDate}</span>
                  <ArrowRight className="h-3 w-3 text-amber-500" />
                  <span className="font-bold text-amber-700">{newDate}</span>
                </div>
              </div>

              {followMode === 'all' &&
                followUpDates.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                    <div className="mt-1 flex items-center gap-2 font-mono text-xs">
                      <span className="line-through text-slate-400">{item.oldDate}</span>
                      <ArrowRight className="h-3 w-3 text-amber-500" />
                      <span className="font-bold text-amber-700">{item.newDate}</span>
                    </div>
                  </div>
                ))}
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Abbrechen
          </button>
          <button onClick={() => onSave(newDate)} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700">
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}

function CsvModal({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState<string | null>(null)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">CSV Upload</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="my-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <Upload className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">CSV-Datei hierher ziehen</p>
          <label className="mt-3 cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Datei auswählen
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          </label>
        </div>
        {fileName && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <FileSpreadsheet className="h-4 w-4" /> <span className="font-medium">{fileName}</span> <Check className="ml-auto h-4 w-4" />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Abbrechen</button>
          <button onClick={onClose} disabled={!fileName} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Importieren</button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN APP ---
export default function FacilityApp() {
  const [groups, setGroups] = useState<AreaGroup[]>(INITIAL_GROUPS)

  // Filters State
  const [search, setSearch] = useState('')
  const [gebaeude, setGebaeude] = useState('all')
  const [stockwerk, setStockwerk] = useState('all')
  const [flaechentyp, setFlaechentyp] = useState('all')
  const [frequenz, setFrequenz] = useState('all')
  const [kategorie, setKategorie] = useState('all')
  const [onlyManualMods, setOnlyManualMods] = useState(false)

  // Layout State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedId, setExpandedId] = useState<string | null>('buero-1')
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [shiftContext, setShiftContext] = useState<ShiftContext | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [view, setView] = useState<'matrix' | 'date'>('matrix')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  const resetFilters = () => {
    setSearch('')
    setGebaeude('all')
    setStockwerk('all')
    setFlaechentyp('all')
    setFrequenz('all')
    setKategorie('all')
    setOnlyManualMods(false)
  }

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase()

    return groups.map((g) => {
      if (flaechentyp !== 'all' && g.flaechentyp !== flaechentyp) {
        return { ...g, areas: [] }
      }

      const filteredAreas = g.areas.filter((a) => {
        if (term && !a.name.toLowerCase().includes(term) && !a.flaechentyp.toLowerCase().includes(term)) return false
        if (gebaeude !== 'all' && a.gebaeude !== gebaeude) return false
        if (stockwerk !== 'all' && a.stockwerk !== stockwerk) return false
        if (onlyManualMods && a.manualMods === 0 && !a.categories.some((c) => c.overridden)) return false
        if (frequenz !== 'all' && !a.frequencies.some((f) => f.label.includes(frequenz)) && !a.categories.some((c) => c.frequency === frequenz)) return false
        if (kategorie !== 'all' && !a.categories.some((c) => c.name.toLowerCase().includes(kategorie.toLowerCase()))) return false

        return true
      })

      return { ...g, areas: filteredAreas }
    }).filter((g) => g.areas.length > 0)
  }, [groups, search, gebaeude, stockwerk, flaechentyp, frequenz, kategorie, onlyManualMods])

  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))
  const toggleGroup = (name: string) => setCollapsedGroups((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])

  const openShift = (area: Area, categoryName: string, categoryFreq: string, currentDate: string) =>
    setShiftContext({ areaId: area.id, areaName: area.name, categoryName, categoryFreq, currentDate })

  const saveShift = (newDate: string) => {
    if (!shiftContext) return
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        areas: group.areas.map((area) => {
          if (area.id !== shiftContext.areaId) return area
          const next = { ...area, manualMods: area.manualMods + 1 }
          next.categories = area.categories.map((c) => {
            if (c.name === shiftContext.categoryName) {
              return { ...c, date: newDate, status: 'override', overridden: true }
            }
            return c
          })
          return next
        }),
      }))
    )
    setShiftContext(null)
    showToast('Termin angepasst — Manuelles Override gesetzt.')
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-slate-900">
      <TopHeader />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
            <div className="flex items-center gap-3 text-sm">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Monatsplanung</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setCsvOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" /> CSV Upload
              </button>
              <button onClick={() => showToast('Monatsplanung wird neu berechnet...')} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700">
                <Play className="h-3.5 w-3.5" /> Planung ausführen
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar
            search={search} onSearch={setSearch}
            gebaeude={gebaeude} onGebaeude={setGebaeude}
            stockwerk={stockwerk} onStockwerk={setStockwerk}
            flaechentyp={flaechentyp} onFlaechentyp={setFlaechentyp}
            frequenz={frequenz} onFrequenz={setFrequenz}
            kategorie={kategorie} onKategorie={setKategorie}
            onlyManualMods={onlyManualMods} onToggleManualMods={() => setOnlyManualMods(!onlyManualMods)}
            onResetFilters={resetFilters}
          />

          {/* View Switcher Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2">
            <span className="text-xs font-medium text-slate-500">
              {filteredGroups.reduce((acc, g) => acc + g.areas.length, 0)} Flächen gefunden
            </span>
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
              <button onClick={() => setView('matrix')} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors", view === 'matrix' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>
                <LayoutGrid className="h-3.5 w-3.5" /> Matrixansicht
              </button>
              <button onClick={() => setView('date')} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors", view === 'date' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>
                <CalendarDays className="h-3.5 w-3.5" /> Datumsansicht
              </button>
            </div>
          </div>

          {/* Main Display Area */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            {filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white">
                <Filter className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Keine Flächen für die gewählten Filter gefunden</p>
                <button onClick={resetFilters} className="mt-3 text-xs font-semibold text-blue-600 hover:underline">Filter zurücksetzen</button>
              </div>
            ) : view === 'matrix' ? (
              <MatrixTable
                groups={filteredGroups} selectedIds={selectedIds} expandedId={expandedId} collapsedGroups={collapsedGroups}
                onToggleSelect={toggleSelect} onToggleExpand={toggleExpand} onToggleGroup={toggleGroup} onEditCell={openShift}
              />
            ) : (
              <DateView groups={filteredGroups} onMoveEntry={openShift} />
            )}
            <div className="h-24" aria-hidden />
          </div>
        </main>
      </div>

      <BulkActionBar count={selectedIds.length} onClear={() => setSelectedIds([])} />

      {shiftContext && <ShiftModal context={shiftContext} onClose={() => setShiftContext(null)} onSave={saveShift} />}
      {csvOpen && <CsvModal onClose={() => setCsvOpen(false)} />}

      {toast && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {toast}
          </div>
        </div>
      )}
    </div>
  )
}