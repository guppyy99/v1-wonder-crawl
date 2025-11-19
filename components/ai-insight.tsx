"use client"

import { useEffect, useMemo, useState } from "react"
import { Sparkles, RefreshCw } from "lucide-react"
import { getKeywordColor } from "./keyword-selector"
import { calculateMonthlyGrowth } from "@/lib/csv-parser"
import type { KeywordData, KeywordInfo } from "@/lib/types"

interface PreviousMonthData {
  month: string
  volume: number
}

interface KeywordMetrics {
  keyword: string
  growth: number
  volume: number
  previousMonths: PreviousMonthData[]
}

interface ApiKeywordInsight {
  keyword: string
  category?: string
  reason: string
  strategy: string
}

interface InsightViewState {
  comparison: string
  keywordInsights: Array<ApiKeywordInsight & { metrics: KeywordMetrics }>
}

interface AIInsightProps {
  selectedYear: number
  selectedMonth: number
  keywordData: KeywordData
  selectedKeywords: string[]
}

function buildPreviousMonths(
  keywordInfo: KeywordInfo | undefined,
  selectedYear: number,
  selectedMonth: number,
  range = 6
): PreviousMonthData[] {
  const result: PreviousMonthData[] = []

  for (let i = range - 1; i >= 0; i--) {
    const targetDate = new Date(selectedYear, selectedMonth - 1)
    targetDate.setMonth(targetDate.getMonth() - i)

    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    const formatted = `${targetDate.getFullYear()}.${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    const volume = keywordInfo?.monthlyData[monthKey] || 0

    result.push({ month: formatted, volume })
  }

  return result
}

function summarizeCategory(category?: string) {
  if (category === 'insurance') return '보험'
  if (category === 'sidejob') return '부업·N잡'
  return '기타'
}

export function AIInsight({ selectedYear, selectedMonth, keywordData, selectedKeywords }: AIInsightProps) {
  const [insight, setInsight] = useState<InsightViewState | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  const keywordSignature = useMemo(() => selectedKeywords.join('|'), [selectedKeywords])

  useEffect(() => {
    setHasGenerated(false)
    setInsight(null)
    setErrorMessage("")
  }, [selectedYear, selectedMonth, keywordSignature])

  const prepareKeywordPayload = (): KeywordMetrics[] => {
    if (selectedKeywords.length === 0) return []
    const growthData = calculateMonthlyGrowth(keywordData, selectedYear, selectedMonth)
    const growthMap = new Map(growthData.map((item) => [item.keyword, item]))

    return selectedKeywords.slice(0, 3).map((keyword) => {
      const metrics = growthMap.get(keyword)
      const keywordInfo = keywordData[keyword]

      if (!metrics || !keywordInfo) return null

      return {
        keyword,
        growth: metrics.growth,
        volume: metrics.volume,
        previousMonths: buildPreviousMonths(keywordInfo, selectedYear, selectedMonth),
      }
    }).filter((item): item is KeywordMetrics => item !== null)
  }

  const generateInsight = async () => {
    if (selectedKeywords.length === 0) {
      setErrorMessage('AI 인사이트를 생성하려면 키워드를 최소 1개 이상 선택해주세요.')
      return
    }

    const keywordPayload = prepareKeywordPayload()

    if (keywordPayload.length === 0) {
      setErrorMessage(`${selectedMonth}월에 대한 데이터가 있는 키워드를 선택해주세요.`)
      return
    }

    setLoading(true)
    setHasGenerated(true)
    setErrorMessage("")

    try {
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywordPayload,
          year: selectedYear,
          month: selectedMonth,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'AI 인사이트 생성에 실패했습니다.')
      }

      const data: { comparison?: string; keywordInsights?: ApiKeywordInsight[] } = await response.json()
      const keywordMap = new Map((data.keywordInsights || []).map((item) => [item.keyword, item]))

      const orderedInsights = keywordPayload.map((payload) => {
        const ai = keywordMap.get(payload.keyword)
        return {
          keyword: payload.keyword,
          category: ai?.category,
          reason: ai?.reason || '이 키워드에 대한 분석 문장을 확보하지 못했습니다.',
          strategy: ai?.strategy || 'Wonder와 연결된 전략 제안이 수신되지 않았습니다.',
          metrics: payload,
        }
      })

      setInsight({
        comparison: data.comparison || '선택한 키워드들의 상대적인 포지션을 강조하는 비교 문장이 필요합니다.',
        keywordInsights: orderedInsights,
      })
    } catch (error: any) {
      console.error('❌ AI 인사이트 생성 오류:', error)
      setErrorMessage(error.message || 'AI 인사이트 생성 중 문제가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getKeywordDisplayColor = (keyword: string) => {
    const idx = selectedKeywords.indexOf(keyword)
    return getKeywordColor(idx === -1 ? 0 : idx).chart
  }

  const withAlpha = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '')
    if (normalized.length !== 6) return hex
    const alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${normalized}${alphaHex}`
  }

  const gridCols = insight?.keywordInsights.length === 3
    ? 'md:grid-cols-3'
    : insight?.keywordInsights.length === 2
    ? 'md:grid-cols-2'
    : 'md:grid-cols-1'

  return (
    <div className="mt-6 flex justify-center">
      <div className="w-full max-w-[1200px] rounded-3xl bg-white/90 p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">선택 키워드</span>
            {selectedKeywords.length > 0 ? (
              selectedKeywords.slice(0, 3).map((keyword) => {
                const keywordColor = getKeywordDisplayColor(keyword)
                return (
                  <span
                    key={keyword}
                    className="rounded-full border px-3 py-1 text-xs font-medium"
                    style={{
                      color: keywordColor,
                      borderColor: withAlpha(keywordColor, 0.4),
                      backgroundColor: withAlpha(keywordColor, 0.08),
                    }}
                  >
                    {keyword}
                  </span>
                )
              })
            ) : (
              <span className="text-gray-400">키워드를 선택하면 AI가 비교 인사이트를 생성해요.</span>
            )}
          </div>

          {!hasGenerated ? (
            <button
              onClick={generateInsight}
              disabled={loading || selectedKeywords.length === 0}
              className="group relative flex w-full items-center justify-center gap-2 rounded-2xl px-8 py-4 text-white font-semibold shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#F2B0ED] to-[#CAB2F4] opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#E85DD7] to-[#9D7DE8] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Sparkles className="h-5 w-5 relative z-10" />
              <span className="relative z-10">
                {selectedKeywords.length === 0
                  ? '키워드를 선택해주세요'
                  : `${selectedKeywords.length}개 키워드 AI 인사이트 생성`}
              </span>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {selectedYear}년 {selectedMonth}월 · 최대 3개 키워드 비교
                </p>
                <button
                  onClick={() => {
                    setHasGenerated(false)
                    setInsight(null)
                    setErrorMessage("")
                  }}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  다시 생성
                </button>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-5 text-center">
                <p className="text-xs font-semibold text-purple-500 tracking-[0.3em] mb-2">KEYWORDS INSIGHT</p>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">선택 키워드 정량 비교</h4>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 text-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    AI가 비교 인사이트를 정리하는 중...
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line text-center">
                    {insight?.comparison || '비교 문장을 불러오지 못했습니다.'}
                  </p>
                )}
              </div>

              {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
              )}

              {!errorMessage && insight && (
                <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>
                  {insight.keywordInsights.map((item) => {
                    const keywordColor = getKeywordDisplayColor(item.keyword)
                    return (
                      <div
                        key={item.keyword}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0px_8px_20px_rgba(149,128,255,0.08)]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-lg font-semibold" style={{ color: keywordColor }}>
                            {item.keyword}
                          </h5>
                          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            {summarizeCategory(item.category)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                          검색량 {item.metrics.volume.toLocaleString()}건 · 평균 대비 {item.metrics.growth >= 0 ? '+' : ''}
                          {item.metrics.growth.toFixed(1)}%
                        </p>
                        <div className="space-y-2 text-sm text-gray-700">
                          <div>
                            <p className="font-semibold text-gray-900">상승/하락 이유</p>
                            <p className="leading-relaxed">{item.reason}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Wonder 마케팅 전략</p>
                            <p className="leading-relaxed">{item.strategy}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {!hasGenerated && errorMessage && (
            <p className="text-sm text-red-500 text-center">{errorMessage}</p>
          )}

          <p className="text-xs text-gray-400 text-center">
            중복 선택 포함 최대 3개의 키워드까지 AI 비교 인사이트를 제공합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
