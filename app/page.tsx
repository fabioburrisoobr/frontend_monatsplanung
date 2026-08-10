'use client'

import React, { useState, useMemo, Fragment } from 'react'
import {
  AlertTriangle, Layers, User, HelpCircle, Menu,
  Search, ChevronDown, ChevronRight, Edit3,
  CornerDownRight, RefreshCw, CheckCircle2, X, Upload, Download,
  Play, LayoutGrid, CalendarDays, ClipboardList, SlidersHorizontal,
  Building2, BarChart3, Settings, Calendar, ArrowRight,
  MoveRight, Check, FileSpreadsheet, RotateCcw, Filter, Info, ExternalLink,
  Trash2, AlertCircle
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

export interface CategoryOccurrence {
  id: string
  label: string
  date: string
  overridden: boolean
}

export interface AreaCategory {
  key: string
  name: string
  frequency: string
  date: string | null
  status: PlanningStatus
  overridden: boolean
  occurrences: CategoryOccurrence[]
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

export interface VisibleColumns {
  firstExecutionDay: boolean
  missedHandling: boolean
  nextFixed: boolean
  categories: boolean
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
        firstExecutionDay: '01.01.2026',
        missedHandling: 'jump',
        nextFixed: '01.06.2026',
        manualMods: 1,
        categories: [
          {
            key: 'grund', name: 'Grundreinigung', frequency: '1xJ', date: '01.01.2026', status: 'planned', overridden: false,
            occurrences: [{ id: 'b1-g1', label: '1. Termin', date: '01.01.2026', overridden: false }]
          },
          {
            key: 'zwischen', name: 'Zwischenreinigung', frequency: '4xJ', date: '01.01.2026', status: 'auto', overridden: false,
            occurrences: [
              { id: 'b1-z1', label: '1. Termin', date: '01.01.2026', overridden: false },
              { id: 'b1-z2', label: '2. Termin', date: '01.04.2026', overridden: false },
              { id: 'b1-z3', label: '3. Termin', date: '01.07.2026', overridden: false },
              { id: 'b1-z4', label: '4. Termin', date: '01.10.2026', overridden: false },
            ]
          },
          {
            key: 'maschinell', name: 'maschinelle Reinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false,
            occurrences: [
              { id: 'b1-m1', label: '1. Termin', date: '01.06.2026', overridden: false },
              { id: 'b1-m2', label: '2. Termin', date: '01.07.2026', overridden: false },
              { id: 'b1-m3', label: '3. Termin', date: '01.08.2026', overridden: false },
              { id: 'b1-m4', label: '4. Termin', date: '01.09.2026', overridden: false },
            ]
          },
          {
            key: 'desinf', name: 'Desinfektion', frequency: '1xM', date: '05.06.2026', status: 'override', overridden: true,
            occurrences: [
              { id: 'b1-d1', label: '1. Termin', date: '05.06.2026', overridden: true },
              { id: 'b1-d2', label: '2. Termin', date: '01.07.2026', overridden: false },
            ]
          },
        ],
      },
      {
        id: 'buero-2',
        name: 'Büro 2',
        gebaeude: 'Hauptgebäude A',
        stockwerk: '1. OG',
        flaechentyp: 'Büro',
        frequencies: [{ label: '@1xM', highest: true }],
        firstExecutionDay: '01.01.2026',
        missedHandling: 'replan',
        nextFixed: '01.06.2026',
        manualMods: 0,
        categories: [
          { key: 'grund', name: 'Grundreinigung', frequency: '1xJ', date: '01.01.2026', status: 'planned', overridden: false, occurrences: [{ id: 'b2-g1', label: '1. Termin', date: '01.01.2026', overridden: false }] },
          { key: 'maschinell', name: 'maschinelle Reinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false, occurrences: [{ id: 'b2-m1', label: '1. Termin', date: '01.06.2026', overridden: false }] },
          { key: 'desinf', name: 'Desinfektion', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false, occurrences: [{ id: 'b2-d1', label: '1. Termin', date: '01.06.2026', overridden: false }] },
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
        firstExecutionDay: '01.01.2026',
        missedHandling: 'jump',
        nextFixed: '01.06.2026',
        manualMods: 2,
        categories: [
          { key: 'kristall', name: 'Kristallisierung', frequency: '1xJ', date: '15.03.2026', status: 'override', overridden: true, occurrences: [{ id: 'f1-k1', label: '1. Termin', date: '15.03.2026', overridden: true }] },
          { key: 'glas', name: 'Glas- & Rahmenreinigung', frequency: '2xM', date: '01.06.2026', status: 'auto', overridden: false, occurrences: [{ id: 'f1-gl1', label: '1. Termin', date: '01.06.2026', overridden: false }] },
          { key: 'boden', name: 'Bodenbeschichtung', frequency: '1xM', date: '10.06.2026', status: 'override', overridden: true, occurrences: [{ id: 'f1-b1', label: '1. Termin', date: '10.06.2026', overridden: true }] },
        ],
      },
      {
        id: 'flur-1og',
        name: 'Flur 1. Obergeschoss',
        gebaeude: 'Hauptgebäude A',
        stockwerk: '1. OG',
        flaechentyp: 'Flur & Erschliessung',
        frequencies: [{ label: '@1xM', highest: true }],
        firstExecutionDay: '01.01.2026',
        missedHandling: 'replan',
        nextFixed: '01.06.2026',
        manualMods: 0,
        categories: [
          { key: 'glas', name: 'Glas- & Rahmenreinigung', frequency: '1xM', date: '01.06.2026', status: 'auto', overridden: false, occurrences: [{ id: 'f2-gl1', label: '1. Termin', date: '01.06.2026', overridden: false }] },
          { key: 'unterhalt', name: 'Intensivreinigung', frequency: '4xJ', date: '01.08.2026', status: 'planned', overridden: false, occurrences: [{ id: 'f2-i1', label: '1. Termin', date: '01.08.2026', overridden: false }] },
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
        firstExecutionDay: '01.01.2026',
        missedHandling: 'jump',
        nextFixed: '01.06.2026',
        manualMods: 0,
        categories: [
          { key: 'entkalkung', name: 'Grundentkalkung', frequency: '2xM', date: '01.06.2026', status: 'auto', overridden: false, occurrences: [{ id: 's1-e1', label: '1. Termin', date: '01.06.2026', overridden: false }] },
          { key: 'fliesen', name: 'Fliesen-Dampfreinigung', frequency: '1xM', date: '15.06.2026', status: 'planned', overridden: false, occurrences: [{ id: 's1-f1', label: '1. Termin', date: '15.06.2026', overridden: false }] },
        ],
      },
      {
        id: 'sanitaer-102',
        name: 'Sanitär D-102 (Damen)',
        gebaeude: 'Nebengebäude B',
        stockwerk: 'EG',
        flaechentyp: 'Sanitärbereich',
        frequencies: [{ label: '@2xM', highest: true }],
        firstExecutionDay: '01.01.2026',
        missedHandling: 'jump',
        nextFixed: '05.06.2026',
        manualMods: 1,
        categories: [
          { key: 'entkalkung', name: 'Grundentkalkung', frequency: '2xM', date: '05.06.2026', status: 'override', overridden: true, occurrences: [{ id: 's2-e1', label: '1. Termin', date: '05.06.2026', overridden: true }] },
          { key: 'fliesen', name: 'Fliesen-Dampfreinigung', frequency: '1xM', date: '15.06.2026', status: 'planned', overridden: false, occurrences: [{ id: 's2-f1', label: '1. Termin', date: '15.06.2026', overridden: false }] },
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

// --- INTERACTIVE MISSED HANDLING CELL ---
function MissedHandlingCell({ value, onChange }: { value: MissedHandling; onChange: (v: MissedHandling) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="group inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
      >
        {value === 'jump' ? <CornerDownRight className="h-3.5 w-3.5 text-slate-500" /> : <RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
        <span className="font-medium">{MISSED_HANDLING_LABEL[value]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5">
            <button
              onClick={() => { onChange('jump'); setOpen(false) }}
              className={cn("group flex w-full flex-col text-left rounded-lg p-2 text-xs transition-colors hover:bg-slate-50", value === 'jump' ? "bg-blue-50/70 text-blue-900 font-semibold" : "text-slate-700")}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <CornerDownRight className="h-3.5 w-3.5 text-blue-600" />
                Auf nächstes Datum springen
              </div>
              <span className="mt-1 text-[11px] font-normal text-slate-500 leading-snug">
                Regelmässige Planung läuft weiter, verpasster Termin entfällt.
              </span>
            </button>

            <button
              onClick={() => { onChange('replan'); setOpen(false) }}
              className={cn("group flex w-full flex-col text-left rounded-lg p-2 text-xs transition-colors hover:bg-slate-50 mt-1", value === 'replan' ? "bg-blue-50/70 text-blue-900 font-semibold" : "text-slate-700")}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                Neu planen
              </div>
              <span className="mt-1 text-[11px] font-normal text-slate-500 leading-snug">
                Termin bleibt als Aufgabe stehen, bis er nachgeholt wurde.
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// --- COLUMN CONFIGURATOR DROPDOWN ---
function ColumnConfigurator({ visibleColumns, onToggleColumn }: { visibleColumns: VisibleColumns; onToggleColumn: (key: keyof VisibleColumns) => void }) {
  const [open, setOpen] = useState(false)
  const columnsList: { key: keyof VisibleColumns; label: string }[] = [
    { key: 'firstExecutionDay', label: 'Erster Ausführungstag' },
    { key: 'missedHandling', label: 'Verhalten bei Ausfall' },
    { key: 'nextFixed', label: 'Nächste fixe Reinigung' },
    { key: 'categories', label: 'Geplante Kategorien & Termine' },
  ]

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
        Spalten anpassen
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
            <div className="mb-2 text-xs font-bold text-slate-800 border-b border-slate-100 pb-1.5">
              Sichtbare Spalten
            </div>
            <div className="space-y-2">
              {columnsList.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={visibleColumns[col.key]}
                    onChange={() => onToggleColumn(col.key)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
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

// --- EMPTY STATE (ZUSTAND A - OHNE ICON) ---
function EmptyState({ onGenerate, staggerSchedule, setStaggerSchedule }: { onGenerate: () => void; staggerSchedule: boolean; setStaggerSchedule: (v: boolean) => void }) {
  return (
    <div className="mx-auto my-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-bold tracking-tight text-slate-900">
        Noch keine Monatsplanung für diese Wirtschaftseinheit erstellt
      </h3>
      
      <div className="mt-4 space-y-2.5 text-sm text-slate-600">
        <div className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-600">1</span>
          <span>Aktivieren Sie die automatische Monatsplanung für die benötigten Kategorien.</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-600">2</span>
          <span>Konfigurieren Sie passende monatliche und jährliche Reinigungsfrequenzen.</span>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-600">3</span>
          <span>Generieren Sie den Plan und prüfen Sie die Fläche/Kategorie-Übersicht.</span>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={staggerSchedule}
            onChange={(e) => setStaggerSchedule(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-semibold text-slate-900">
              Ausführungen automatisch über den Monat staffeln
            </span>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Sorgt für ein gleichmässiges Reinigungsaufkommen: Verteilt die Flächen eines Stockwerks sinnvoll auf verschiedene Wochentage und plant seltene Frequenzen (z. B. viermal oder einmal jährlich) gleichmässig über das Jahr. Deaktiviert: Nutzt direkt die hinterlegten Startdaten der Leistungen.
            </p>
          </div>
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Play className="h-4 w-4" /> Monatsplanung generieren
        </button>
      </div>
    </div>
  )
}

// --- RE-PLANNING WIZARD MODAL ---
function ReplanWizardModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [timeframe, setTimeframe] = useState<'sofort' | 'nextMonth'>('sofort')
  const [areaScope, setAreaScope] = useState<string>('Alle Flächentypen')
  const [resetOverrides, setResetOverrides] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Monatsplanung aktualisieren</h3>
            <p className="text-xs text-slate-500">Schritt {step} von 2: {step === 1 ? 'Zeitraum & Umfang wählen' : 'Vorschau der Änderungen'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">1. Gültig ab</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTimeframe('sofort')}
                    className={cn("rounded-xl border p-3 text-left transition-all", timeframe === 'sofort' ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:bg-slate-50")}
                  >
                    <div className="text-xs font-bold text-slate-900">Ab sofort</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Betrifft alle offenen Termine ab heute</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('nextMonth')}
                    className={cn("rounded-xl border p-3 text-left transition-all", timeframe === 'nextMonth' ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:bg-slate-50")}
                  >
                    <div className="text-xs font-bold text-slate-900">Ab nächstem Monat</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Planung für laufenden Monat unverändert lassen</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">2. Betroffene Flächentypen</label>
                <select
                  value={areaScope}
                  onChange={(e) => setAreaScope(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="Alle Flächentypen">Alle Flächentypen</option>
                  <option value="Büro">Büro</option>
                  <option value="Flur & Erschliessung">Flur &amp; Erschliessung</option>
                  <option value="Sanitärbereich">Sanitärbereich</option>
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resetOverrides}
                    onChange={(e) => setResetOverrides(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900">Manuelle Änderungen auf Standard zurücksetzen</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Standardmässig bleiben manuelle Terminverschiebungen geschützt.</p>
                  </div>
                </label>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
                <div className="font-bold mb-1">Zusammenfassung der Neuberechnung:</div>
                <ul className="list-disc pl-4 space-y-1 text-blue-800">
                  <li>12 Termine verschieben sich aufgrund geänderter Stammdaten.</li>
                  <li>{resetOverrides ? 'Zwei manuelle Änderungen werden überschrieben.' : 'Manuelle Übersteuerungen bleiben vollständig erhalten.'}</li>
                  <li>Berechnung erfolgt für: <span className="font-semibold">{areaScope}</span>.</li>
                </ul>
              </div>
              <p className="text-xs text-slate-500">
                Bitte bestätigen Sie die Ausführung. Dieser Vorgang aktualisiert die Monatsplanung sofort.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Abbrechen
          </button>
          {step === 1 ? (
            <button onClick={() => setStep(2)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
              Weiter zur Vorschau
            </button>
          ) : (
            <button onClick={onConfirm} className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700">
              Jetzt aktualisieren
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// --- DELETE CONFIRM MODAL ---
function DeleteConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [inputText, setInputText] = useState('')
  const isMatch = inputText.trim() === 'LÖSCHEN'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Gesamte Monatsplanung löschen</h3>
            <p className="text-xs text-slate-500">Dieser Vorgang kann nicht rückgängig gemacht werden</p>
          </div>
        </div>

        <div className="my-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Dadurch werden <strong className="text-slate-900">alle</strong> generierten Monatsplanungstermine sowie sämtliche manuellen Übersteuerungen für diese Wirtschaftseinheit unwiderruflich entfernt.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Geben Sie <span className="font-mono text-slate-900 uppercase">LÖSCHEN</span> ein, um zu bestätigen:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="LÖSCHEN"
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-200 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatch}
            className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-40 transition-all"
          >
            Endgültig löschen
          </button>
        </div>
      </div>
    </div>
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
        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <div className={cn("relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out", onlyManualMods ? "bg-blue-600" : "bg-slate-300")}>
          <span className={cn("pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out", onlyManualMods ? "translate-x-3" : "translate-x-0")} />
        </div>
        <span>Nur manuelle Änderungen</span>
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
function RowDetail({ area, visibleColumns, onShift }: { area: Area; visibleColumns: VisibleColumns; onShift: (catName: string, catFreq: string, date: string) => void }) {
  const [timeframe, setTimeframe] = useState('12 Monate')

  return (
    <div className="border-t border-slate-200 bg-slate-50/80 p-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Detailkonfiguration für {area.name}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="#kategorie-konfiguration"
              onClick={(e) => { e.preventDefault(); alert(`Navigiert zur Kategorie-Konfiguration für ${area.name}...`); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-600 shadow-xs hover:bg-blue-50 transition-colors"
            >
              Kategorie-Konfiguration <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> Auf automatische Planung zurücksetzen
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-2.5">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white">
            {['3 Monate', '6 Monate', '12 Monate', '24 Monate'].map((t) => (
              <button key={t} onClick={() => setTimeframe(t)} className={cn('px-3 py-1 text-xs font-medium transition-colors', timeframe === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50')}>
                {t}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">Alle zukünftigen Ausführungstermine</span>
        </div>

        <div className="p-5">
          <div className="space-y-6">
            {area.categories.map((cat) => (
              <div key={cat.key} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-medium text-slate-700">{cat.frequency}</span>
                  </div>
                  {cat.overridden && <OverrideBadge label="Manuelle Übersteuerung vorliegend" />}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {cat.occurrences.map((occ) => (
                    <div key={occ.id} className={cn("flex flex-col justify-between rounded-lg border p-3 transition-all", occ.overridden ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white")}>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500">{occ.label}</span>
                          {occ.overridden && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                        </div>
                        <div className="mt-1 font-mono text-xs font-bold text-slate-900">{occ.date}</div>
                      </div>
                      <button
                        onClick={() => onShift(cat.name, cat.frequency, occ.date)}
                        className="mt-3 inline-flex items-center justify-center gap-1 rounded border border-blue-200 bg-blue-50/60 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <MoveRight className="h-3 w-3" /> Verschieben
                      </button>
                    </div>
                  ))}
                </div>
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
  groups, selectedIds, expandedId, collapsedGroups, visibleColumns,
  onToggleSelect, onToggleExpand, onToggleGroup, onEditCell, onChangeMissedHandling
}: any) {
  const calcColSpan = 2 + (visibleColumns.firstExecutionDay ? 1 : 0) + (visibleColumns.missedHandling ? 1 : 0) + (visibleColumns.nextFixed ? 1 : 0) + (visibleColumns.categories ? 1 : 0)

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full min-w-[950px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="w-10 px-3 py-3" />
            <th className="min-w-[220px] px-3 py-3">Flächen</th>
            {visibleColumns.firstExecutionDay && <th className="px-3 py-3">Erster Ausführungstag</th>}
            {visibleColumns.missedHandling && <th className="px-3 py-3">Verhalten bei Ausfall</th>}
            {visibleColumns.nextFixed && <th className="px-3 py-3">Nächste fixe Reinigung</th>}
            {visibleColumns.categories && <th className="px-3 py-3 min-w-[320px]">Geplante Kategorien &amp; Termine</th>}
          </tr>
        </thead>
        <tbody>
          {groups.map((group: AreaGroup) => {
            const collapsed = collapsedGroups.includes(group.flaechentyp)

            const totalAreas = group.areas.length
            const totalMods = group.areas.reduce((acc, a) => acc + (a.manualMods || (a.categories.some(c => c.overridden) ? 1 : 0)), 0)
            const dates = group.areas.map(a => a.nextFixed).filter(Boolean)
            dates.sort((a, b) => a.split('.').reverse().join('-').localeCompare(b.split('.').reverse().join('-')))
            const nextCleaning = dates[0] || 'Keine'

            return (
              <Fragment key={group.flaechentyp}>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  <td colSpan={calcColSpan} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button onClick={() => onToggleGroup(group.flaechentyp)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-blue-700">
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {group.flaechentyp}
                      </button>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-slate-200/80 px-2.5 py-0.5 font-medium text-slate-700">
                          {totalAreas} {totalAreas === 1 ? 'Fläche' : 'Flächen'}
                        </span>
                        <span className="rounded-md bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-900 border border-amber-200/80">
                          {totalMods} {totalMods === 1 ? 'manuelle Änderung' : 'manuelle Änderungen'}
                        </span>
                        <span className="rounded-md bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 border border-blue-200/80">
                          Nächste Reinigung: <span className="font-mono font-bold">{nextCleaning}</span>
                        </span>
                      </div>
                    </div>
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

                          {visibleColumns.firstExecutionDay && (
                            <td className="px-3 py-3 align-top" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => onEditCell(area, 'Erster Ausführungstag', '', area.firstExecutionDay)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 shadow-2xs hover:bg-slate-50">
                                {area.firstExecutionDay} <Edit3 className="h-3 w-3 text-slate-400" />
                              </button>
                            </td>
                          )}

                          {visibleColumns.missedHandling && (
                            <td className="px-3 py-3 align-top">
                              <MissedHandlingCell value={area.missedHandling} onChange={(val) => onChangeMissedHandling(area.id, val)} />
                            </td>
                          )}

                          {visibleColumns.nextFixed && (
                            <td className="px-3 py-3 align-top"><span className="font-mono text-xs text-slate-700">{area.nextFixed}</span></td>
                          )}

                          {visibleColumns.categories && (
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
                          )}
                        </tr>

                        {expanded && (
                          <tr>
                            <td colSpan={calcColSpan} className="p-0">
                              <RowDetail area={area} visibleColumns={visibleColumns} onShift={(catName, catFreq, date) => onEditCell(area, catName, catFreq, date)} />
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

// --- DATE VIEW ---
function DateView({ groups, onMoveEntry }: { groups: AreaGroup[]; onMoveEntry: (area: Area, catName: string, catFreq: string, date: string) => void }) {
  const groupedByMonth = useMemo(() => {
    const flatList: { area: Area; category: AreaCategory; monthKey: string; date: string }[] = []

    groups.forEach((g) => {
      g.areas.forEach((a) => {
        a.categories.forEach((c) => {
          c.occurrences.forEach((occ) => {
            const parts = occ.date.split('.')
            const monthKey = parts.length === 3 ? `${parts[1]}.${parts[2]}` : 'Unbekannt'
            flatList.push({ area: a, category: c, monthKey, date: occ.date })
          })
        })
      })
    })

    flatList.sort((a, b) => a.date.split('.').reverse().join('-').localeCompare(b.date.split('.').reverse().join('-')))

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
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">{group.monthKey}</span>
              <span className="rounded-full bg-slate-200/70 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {group.items.length} Termine
              </span>
              <div className="h-px flex-1 bg-slate-200/80" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map(({ area, category, date }, idx) => (
                <div key={idx} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {formatDayLabel(date)}
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
                    onClick={() => onMoveEntry(area, category.name, category.frequency, date)}
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
                <RadioRow checked={followMode === 'only'} onChange={() => setFollowMode('only')} title="Nur diesen Termin anpassen" />
                <RadioRow checked={followMode === 'all'} onChange={() => setFollowMode('all')} title="Auch alle Folgetermine anpassen" />
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
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-mono">{context.currentDate}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="font-bold text-blue-600 font-mono">{newDate}</span>
                </div>
              </div>

              {followMode === 'all' &&
                followUpDates.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="text-xs font-semibold text-slate-700">{item.label}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-mono">{item.oldDate}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="font-bold text-blue-600 font-mono">{item.newDate}</span>
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

  // Empty State Settings
  const [staggerSchedule, setStaggerSchedule] = useState(true)

  // Modals State
  const [replanWizardOpen, setReplanWizardOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Filters State
  const [search, setSearch] = useState('')
  const [gebaeude, setGebaeude] = useState('all')
  const [stockwerk, setStockwerk] = useState('all')
  const [flaechentyp, setFlaechentyp] = useState('all')
  const [frequenz, setFrequenz] = useState('all')
  const [kategorie, setKategorie] = useState('all')
  const [onlyManualMods, setOnlyManualMods] = useState(false)

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    firstExecutionDay: true,
    missedHandling: true,
    nextFixed: true,
    categories: true,
  })

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

  const hasPlan = groups.length > 0 && groups.some((g) => g.areas.length > 0)

  const handleGeneratePlan = () => {
    setGroups(INITIAL_GROUPS)
    showToast('Monatsplanung erfolgreich generiert!')
  }

  const handleDeletePlan = () => {
    setGroups([])
    setDeleteModalOpen(false)
    showToast('Monatsplanung vollständig gelöscht.')
  }

  const handleConfirmReplan = () => {
    setReplanWizardOpen(false)
    showToast('Monatsplanung neu berechnet und aktualisiert.')
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

  const toggleColumn = (key: keyof VisibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const changeMissedHandling = (areaId: string, val: MissedHandling) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        areas: g.areas.map((a) => (a.id === areaId ? { ...a, missedHandling: val } : a)),
      }))
    )
    showToast(`Verhalten bei Ausfall angepasst: ${MISSED_HANDLING_LABEL[val]}`)
  }

  const handleExportCsv = () => {
    showToast('CSV-Export gestartet — Datei wird heruntergeladen...')
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
              const updatedOccurrences = c.occurrences.map((occ) => {
                if (occ.date === shiftContext.currentDate) {
                  return { ...occ, date: newDate, overridden: true }
                }
                return occ
              })
              return { ...c, date: newDate, status: 'override', overridden: true, occurrences: updatedOccurrences }
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
              {hasPlan && (
                <>
                  <button onClick={handleExportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                    <Download className="h-3.5 w-3.5" /> CSV Export
                  </button>
                  {/* LÖSCHEN BUTTON ZWISCHEN CSV EXPORT UND PLANUNG AKTUALISIEREN */}
                  <button onClick={() => setDeleteModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                    <Trash2 className="h-3.5 w-3.5 text-slate-500" /> Monatsplanung löschen
                  </button>
                </>
              )}

              {!hasPlan ? (
                <button onClick={handleGeneratePlan} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700">
                  <Play className="h-3.5 w-3.5" /> Monatsplanung generieren
                </button>
              ) : (
                <button onClick={() => setReplanWizardOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700">
                  <Play className="h-3.5 w-3.5" /> Planung aktualisieren
                </button>
              )}
            </div>
          </div>

          {hasPlan ? (
            <>
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

              {/* View Switcher & Column Configurator Bar */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-2">
                <span className="text-xs font-medium text-slate-500">
                  {filteredGroups.reduce((acc, g) => acc + g.areas.length, 0)} Flächen gefunden
                </span>
                <div className="flex items-center gap-2">
                  {view === 'matrix' && (
                    <ColumnConfigurator visibleColumns={visibleColumns} onToggleColumn={toggleColumn} />
                  )}
                  <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5">
                    <button onClick={() => setView('matrix')} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors", view === 'matrix' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>
                      <LayoutGrid className="h-3.5 w-3.5" /> Matrixansicht
                    </button>
                    <button onClick={() => setView('date')} className={cn("inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors", view === 'date' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900')}>
                      <CalendarDays className="h-3.5 w-3.5" /> Datumsansicht
                    </button>
                  </div>
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
                    groups={filteredGroups} selectedIds={selectedIds} expandedId={expandedId} collapsedGroups={collapsedGroups} visibleColumns={visibleColumns}
                    onToggleSelect={toggleSelect} onToggleExpand={toggleExpand} onToggleGroup={toggleGroup} onEditCell={openShift} onChangeMissedHandling={changeMissedHandling}
                  />
                ) : (
                  <DateView groups={filteredGroups} onMoveEntry={openShift} />
                )}
                <div className="h-24" aria-hidden />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <EmptyState onGenerate={handleGeneratePlan} staggerSchedule={staggerSchedule} setStaggerSchedule={setStaggerSchedule} />
            </div>
          )}
        </main>
      </div>

      {hasPlan && <BulkActionBar count={selectedIds.length} onClear={() => setSelectedIds([])} />}

      {/* MODALS */}
      {replanWizardOpen && <ReplanWizardModal onClose={() => setReplanWizardOpen(false)} onConfirm={handleConfirmReplan} />}
      {deleteModalOpen && <DeleteConfirmModal onClose={() => setDeleteModalOpen(false)} onConfirm={handleDeletePlan} />}
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