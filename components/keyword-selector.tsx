"use client"

import { useState } from "react"
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"
import type { KeywordData } from "@/lib/types"

interface KeywordSelectorProps {
  keywords: string[]
  selectedKeywords: string[]
  onKeywordToggle: (keyword: string) => void
  keywordData: KeywordData
  selectedYear: number
  selectedMonth: number
  limitReached?: boolean
  limitShake?: boolean
}

// 평균 대비 상승률 계산 (메인 페이지와 동일한 로직)
function calculateGrowthRate(
  data: KeywordData[string],
  year: number,
  month: number
): { growth: number; volume: number } {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const currentValue = data.monthlyData[monthKey] || 0
  
  // 전체 기간의 평균 계산
  const allValues = Object.values(data.monthlyData).filter(v => v > 0)
  if (allValues.length === 0) return { growth: 0, volume: 0 }
  
  const average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
  
  // 평균 대비 상승폭 계산
  const growth = ((currentValue - average) / average) * 100
  
  return { growth, volume: currentValue }
}

// 키워드 선택 순서에 고정된 팔레트 (1: 보라, 2: 주황, 3: 초록)
const COLOR_PALETTE = [
  { bgClass: "bg-[#8B7FD8]", hoverClass: "hover:bg-[#7a6fc7]", chart: "#8B7FD8" },
  { bgClass: "bg-[#FF8C42]", hoverClass: "hover:bg-[#e67b31]", chart: "#FF8C42" },
  { bgClass: "bg-[#7ED957]", hoverClass: "hover:bg-[#6ec847]", chart: "#7ED957" },
]

export const getKeywordColor = (index: number) => {
  if (index < 0) {
    return COLOR_PALETTE[0]
  }
  return COLOR_PALETTE[index] ?? COLOR_PALETTE[COLOR_PALETTE.length - 1]
}

export function KeywordSelector({
  keywords,
  selectedKeywords,
  onKeywordToggle,
  keywordData,
  selectedYear,
  selectedMonth,
  limitReached = false,
  limitShake = false
}: KeywordSelectorProps) {
  const [showAll, setShowAll] = useState(false)
  const displayKeywords = showAll ? keywords : keywords.slice(0, 10)

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-transform ${
        limitShake ? 'keyword-limit-shake' : ''
      }`}
    >
      <h3 className="mb-4 text-lg font-medium text-gray-700 text-center">Keyword</h3>
      <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2">
        {displayKeywords.map((keyword, index) => {
          const isSelected = selectedKeywords.includes(keyword)
          const selectionIndex = selectedKeywords.indexOf(keyword)
          const colorScheme = isSelected ? getKeywordColor(selectionIndex) : null
          const keywordInfo = keywordData[keyword]
          
          let growthData = { growth: 0, volume: 0 }
          if (keywordInfo) {
            growthData = calculateGrowthRate(keywordInfo, selectedYear, selectedMonth)
          }

          return (
            <button
              key={keyword}
              onClick={() => onKeywordToggle(keyword)}
              className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-all ${
                isSelected && colorScheme
                  ? `${colorScheme.bgClass} ${colorScheme.hoverClass} text-white shadow-sm`
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">{keyword}</span>
                <div className="flex items-center gap-2 text-xs">
                  {growthData.growth > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : growthData.growth < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : null}
                  <span className={isSelected ? "text-white" : "text-gray-500"}>
                    {growthData.growth > 0 ? '+' : ''}{Math.round(growthData.growth)}%
                  </span>
                </div>
              </div>
              {isSelected && (
                <div className="mt-1 text-xs opacity-90">
                  {growthData.volume.toLocaleString()}건
                </div>
              )}
            </button>
          )
        })}
        
        {keywords.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 hover:bg-gray-100"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? '접기' : `더보기 (${keywords.length - 10}개)`}
          </button>
        )}
      </div>
      <p
        className={`mt-4 text-center text-xs ${
          limitReached ? 'text-purple-600 font-semibold animate-in zoom-in duration-300' : 'text-gray-400'
        }`}
      >
        {limitReached ? '최대 3개의 키워드를 선택했습니다.' : 'AI 인사이트 비교는 최대 3개의 키워드로 진행돼요.'}
      </p>
    </div>
  )
}
