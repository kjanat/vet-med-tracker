"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

export interface HistoryFilters {
  animalId?: string
  regimenId?: string
  caregiverId?: string
  type: "all" | "scheduled" | "prn"
  view: "list" | "calendar"
  from: string // ISO date
  to: string // ISO date
}

export function useHistoryFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters = useMemo((): HistoryFilters => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    return {
      animalId: searchParams.get("animalId") || undefined,
      regimenId: searchParams.get("regimenId") || undefined,
      caregiverId: searchParams.get("caregiverId") || undefined,
      type: (searchParams.get("type") as "all" | "scheduled" | "prn") || "all",
      view: (searchParams.get("view") as "list" | "calendar") || "list",
      from: searchParams.get("from") || thirtyDaysAgo.toISOString().split("T")[0],
      to: searchParams.get("to") || now.toISOString().split("T")[0],
    }
  }, [searchParams])

  const setFilter = useCallback(
    (key: keyof HistoryFilters, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === undefined || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }

      // Use shallow routing to avoid full reload
      router.push(`/history?${params.toString()}`, { scroll: false })

      // Fire instrumentation event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("history_filter_change", {
            detail: { key, value, filters: { ...filters, [key]: value } },
          }),
        )
      }
    },
    [router, searchParams, filters],
  )

  const setFilters = useCallback(
    (newFilters: Partial<HistoryFilters>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key)
        } else {
          params.set(key, value.toString())
        }
      })

      router.push(`/history?${params.toString()}`, { scroll: false })
    },
    [router, searchParams],
  )

  return { filters, setFilter, setFilters }
}
