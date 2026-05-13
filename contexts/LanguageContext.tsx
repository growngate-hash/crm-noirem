'use client'
import { createContext, useContext, useState } from 'react'

const translations = {
  en: {
    dashboard: 'Dashboard',
    contacts: 'Contacts',
    servicesInventory: 'Services & Inventory',
    vehicles: 'Vehicles',
    bookings: 'Bookings',
    finance: 'Finance',
    reports: 'Reports',
    settings: 'Settings',
    totalProfit: 'Total Profit',
    totalRevenue: 'Total Revenue',
    totalExpenses: 'Total Expenses',
    lowStockAlerts: 'Low Stock Alerts',
    revenueMTD: 'Revenue MTD',
    activeBookings: 'Active Bookings',
    avgOrderValue: 'Avg Order Value',
    csatScore: 'CSAT Score',
    recentBookings: 'Recent Bookings',
    activityFeed: 'Activity Feed',
    currentMonth: 'Current Month',
    addChart: 'Add Chart',
    allInStock: 'all items in stock',
    noBookingsYet: 'No bookings yet',
    noActivityYet: 'No activity yet',
    today: 'Today',
    thisWeek: 'This Week',
    thisQuarter: 'This Quarter',
    thisYear: 'This Year',
    comingSoon: 'Coming soon',
    last10: 'Last 10',
    client: 'Client',
    service: 'Service',
    vehicle: 'Vehicle',
    amount: 'Amount',
    status: 'Status',
  },
  es: {
    dashboard: 'Dashboard',
    contacts: 'Contactos',
    servicesInventory: 'Servicios e Inventario',
    vehicles: 'Vehículos',
    bookings: 'Reservas',
    finance: 'Finanzas',
    reports: 'Reportes',
    settings: 'Configuración',
    totalProfit: 'Ganancia Total',
    totalRevenue: 'Ingresos Totales',
    totalExpenses: 'Gastos Totales',
    lowStockAlerts: 'Stock Bajo',
    revenueMTD: 'Ingresos del Mes',
    activeBookings: 'Reservas Activas',
    avgOrderValue: 'Ticket Promedio',
    csatScore: 'Puntuación CSAT',
    recentBookings: 'Reservas Recientes',
    activityFeed: 'Actividad Reciente',
    currentMonth: 'Mes Actual',
    addChart: 'Agregar Gráfica',
    allInStock: 'todos en stock',
    noBookingsYet: 'Sin reservas aún',
    noActivityYet: 'Sin actividad aún',
    today: 'Hoy',
    thisWeek: 'Esta Semana',
    thisQuarter: 'Este Trimestre',
    thisYear: 'Este Año',
    comingSoon: 'Próximamente',
    last10: 'Últimas 10',
    client: 'Cliente',
    service: 'Servicio',
    vehicle: 'Vehículo',
    amount: 'Monto',
    status: 'Estado',
  },
}

type Lang = 'en' | 'es'
export type TranslationKey = keyof typeof translations.en

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: TranslationKey) => string
}

const LanguageContext = createContext<LangCtx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')
  const t = (key: TranslationKey): string => translations[lang][key] ?? key
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
