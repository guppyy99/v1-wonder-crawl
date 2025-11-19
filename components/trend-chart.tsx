"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ChevronDown } from "lucide-react"
import { getKeywordColor } from "./keyword-selector"
import type { KeywordData } from "@/lib/types"

interface TrendChartProps {
  selectedKeywords: string[]
  keywordData: KeywordData
  timeRange: "6" | "12" | "24"
  onTimeRangeChange: (range: "6" | "12" | "24") => void
  selectedMonth: number
  selectedYear: number
}

// 키워드의 인덱스를 찾기 위한 헬퍼 함수
function getKeywordIndex(keyword: string, allKeywords: string[]): number {
  return allKeywords.indexOf(keyword)
}

export function TrendChart({ selectedKeywords, keywordData, timeRange, onTimeRangeChange, selectedYear, selectedMonth }: TrendChartProps) {
  const [tooltipData, setTooltipData] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  // 전체 키워드 목록 (색상 인덱스를 유지하기 위해)
  const allKeywords = Object.keys(keywordData)

  // Prepare chart data
  const prepareChartData = () => {
    const months = Number.parseInt(timeRange)
    const endDate = new Date(selectedYear, selectedMonth - 1) // 선택된 년/월
    const data = []

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`

      const dataPoint: any = { month: monthLabel, fullDate: monthKey }

      selectedKeywords.forEach((keyword) => {
        const value = keywordData[keyword]?.monthlyData[monthKey] || 0
        dataPoint[keyword] = value
      })

      data.push(dataPoint)
    }

    return data
  }

  const chartData = prepareChartData()

  // Calculate gender percentages for selected keywords
  const calculateGenderStats = () => {
    let totalMale = 0
    let totalFemale = 0

    selectedKeywords.forEach((keyword) => {
      const data = keywordData[keyword]
      if (data) {
        totalMale += data.malePercent
        totalFemale += data.femalePercent
      }
    })

    const count = selectedKeywords.length
    return {
      male: count > 0 ? (totalMale / count).toFixed(1) : "0.0",
      female: count > 0 ? (totalFemale / count).toFixed(1) : "0.0",
    }
  }

  const genderStats = calculateGenderStats()

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload
      
      // 첫 번째 키워드 정보 (대표로 표시)
      const firstKeyword = selectedKeywords[0]
      const keywordInfo = keywordData[firstKeyword]

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg max-w-xs">
          <div className="mb-3 border-b border-gray-100 pb-2">
            <p className="text-xs font-medium text-gray-500">{data.month}</p>
          </div>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              const keywordIdx = getKeywordIndex(entry.name, allKeywords)
              const color = getKeywordColor(keywordIdx).chart
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{entry.value.toLocaleString()}</span>
                </div>
              )
            })}
          </div>

          {keywordInfo && (
            <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">{firstKeyword} 상세 정보</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">남성</span>
                <span className="font-semibold text-blue-600">{keywordInfo.malePercent.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">여성</span>
                <span className="font-semibold text-pink-600">{keywordInfo.femalePercent.toFixed(1)}%</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-1.5">연령대별</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {Object.entries(keywordInfo.ageGroups).map(([age, percent]) => (
                    <div key={age} className="flex justify-between text-xs">
                      <span className="text-gray-600">{age}</span>
                      <span className="font-medium text-gray-800">{percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
    return null
  }

  if (selectedKeywords.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-gray-500">키워드를 선택해주세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="mb-2 text-base font-medium text-gray-800 flex flex-wrap items-center gap-1">
            {selectedKeywords.map((keyword, idx) => {
              const keywordIdx = getKeywordIndex(keyword, allKeywords)
              const color = getKeywordColor(keywordIdx).chart
              return (
                <span key={keyword}>
                  <span style={{ color }}>'{keyword}'</span>
                  {idx < selectedKeywords.length - 1 && <span className="text-gray-400">, </span>}
                </span>
              )
            })}{" "}
            <span className="text-gray-700">검색량 추이</span>
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-gray-600">남성</span>
              <span className="font-semibold text-blue-600">{genderStats.male}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
              <span className="text-gray-600">여성</span>
              <span className="font-semibold text-pink-600">{genderStats.female}%</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => {
              const ranges: Array<"6" | "12" | "24"> = ["6", "12", "24"]
              const currentIndex = ranges.indexOf(timeRange)
              const nextIndex = (currentIndex + 1) % ranges.length
              onTimeRangeChange(ranges[nextIndex])
            }}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronDown className="h-4 w-4" />
            {timeRange}개월
          </button>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              {selectedKeywords.map((keyword) => {
                const keywordIdx = getKeywordIndex(keyword, allKeywords)
                const color = getKeywordColor(keywordIdx).chart
                const gradientId = `gradient-${keyword.replace(/\s/g, '-')}`
                return (
                  <linearGradient key={keyword} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: "#999", fontSize: 11 }} 
              axisLine={{ stroke: "#e5e5e5" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: "#999", fontSize: 12 }}
              axisLine={{ stroke: "#e5e5e5" }}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                return value.toString()
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ddd", strokeWidth: 1 }} />
            {selectedKeywords.map((keyword) => {
              const keywordIdx = getKeywordIndex(keyword, allKeywords)
              const color = getKeywordColor(keywordIdx).chart
              const gradientId = `gradient-${keyword.replace(/\s/g, '-')}`
              return (
                <Area
                  key={keyword}
                  type="monotone"
                  dataKey={keyword}
                  stroke={color}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 6, fill: color }}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
