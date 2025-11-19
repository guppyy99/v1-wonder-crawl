"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react"
import { useState } from "react"

interface CalendarHeaderProps {
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
}

const months = [
  { value: 1, label: "1월" },
  { value: 2, label: "2월" },
  { value: 3, label: "3월" },
  { value: 4, label: "4월" },
  { value: 5, label: "5월" },
  { value: 6, label: "6월" },
  { value: 7, label: "7월" },
  { value: 8, label: "8월" },
  { value: 9, label: "9월" },
  { value: 10, label: "10월" },
  { value: 11, label: "11월" },
  { value: 12, label: "12월" },
]

export function CalendarHeader({ year, month, onYearChange, onMonthChange }: CalendarHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const currentDate = new Date()
  const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`
  const formattedTime = `오후 ${currentDate.getHours() % 12 || 12}:${String(currentDate.getMinutes()).padStart(2, "0")}`

  const handleRefresh = () => {
    setIsRefreshing(true)
    // 페이지 새로고침
    window.location.reload()
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center gap-6">
        {/* 지출 캘린더 */}
        <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">지출 캘린더</h2>
        
        <div className="h-6 w-px bg-gray-300" />
        
        {/* 연도 선택 */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-800">{year}</span>
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100"
              onClick={() => onYearChange(year - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full hover:bg-gray-100"
              onClick={() => onYearChange(year + 1)}
              disabled={year >= 2025}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* 월 선택 */}
        <div className="flex flex-1 gap-1.5">
          {months.map((m) => (
            <button
              key={m.value}
              onClick={() => onMonthChange(m.value)}
              className={`flex h-7 flex-1 max-w-[60px] items-center justify-center rounded-full text-xs font-medium transition-all ${
                month === m.value ? "bg-gray-800 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {m.value}월
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-300" />

        {/* 날짜/시간 */}
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formattedDate} {formattedTime}
        </span>

        <div className="h-6 w-px bg-gray-300" />

        {/* 데이터 업데이트 버튼 */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50 whitespace-nowrap"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          데이터 업데이트
        </button>
      </div>
    </div>
  )
}
