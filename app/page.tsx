"use client"

import { useState, useEffect } from "react"
import { CalendarHeader } from "@/components/calendar-header"
import { AIInsight } from "@/components/ai-insight"
import { KeywordSelector } from "@/components/keyword-selector"
import { TrendChart } from "@/components/trend-chart"
import { Footer } from "@/components/footer"
import { parseCSV, calculateMonthlyGrowth } from "@/lib/csv-parser"
import type { KeywordData } from "@/lib/types"

export default function Page() {
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedMonth, setSelectedMonth] = useState(10)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<"6" | "12" | "24">("12")
  const [keywordData, setKeywordData] = useState<KeywordData>({})
  const [topKeywords, setTopKeywords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // CSV 데이터 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const data = await parseCSV()
      setKeywordData(data)
      setLoading(false)
    }
    loadData()
  }, [])

  // 선택된 월의 상위 키워드 계산
  useEffect(() => {
    if (Object.keys(keywordData).length > 0) {
      console.log(`키워드 재정렬: ${selectedYear}년 ${selectedMonth}월 기준`)
      
      const growthData = calculateMonthlyGrowth(keywordData, selectedYear, selectedMonth)
      
      console.log('상위 5개 키워드:', growthData.slice(0, 5).map(
        (item, idx) => `${idx + 1}. ${item.keyword} (+${item.growth.toFixed(1)}%)`
      ))
      
      const top = growthData.slice(0, 20).map(item => item.keyword)
      setTopKeywords(top)
      
      // 월이 변경될 때마다 상위 2개로 초기화
      if (top.length >= 2) {
        setSelectedKeywords([top[0], top[1]])
      }
    }
  }, [keywordData, selectedYear, selectedMonth])

  const handleKeywordToggle = (keyword: string) => {
    setSelectedKeywords((prev) => {
      if (prev.includes(keyword)) {
        return prev.filter((k) => k !== keyword)
      } else {
        return [...prev, keyword]
      }
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] p-6 md:p-8 lg:p-12">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-800 border-r-transparent mb-4" />
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] p-6 md:p-8 lg:p-12">
      <div className="mx-auto max-w-[1600px]">
        <h1 className="mb-8 text-3xl font-light text-gray-800">
          Wonder <span className="font-semibold">검색 트렌드 캘린더</span>
        </h1>

        <CalendarHeader
          year={selectedYear}
          month={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />

        <AIInsight 
          selectedYear={selectedYear}
          selectedMonth={selectedMonth} 
          keywordData={keywordData} 
        />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <KeywordSelector
            keywords={topKeywords}
            selectedKeywords={selectedKeywords}
            onKeywordToggle={handleKeywordToggle}
            keywordData={keywordData}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />

          <TrendChart
            selectedKeywords={selectedKeywords}
            keywordData={keywordData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </div>

        <Footer />
      </div>
    </main>
  )
}
