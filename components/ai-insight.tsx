"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { calculateMonthlyGrowth } from "@/lib/csv-parser"
import type { KeywordData } from "@/lib/types"

interface AIInsightProps {
  selectedYear: number
  selectedMonth: number
  keywordData: KeywordData
}

export function AIInsight({ selectedYear, selectedMonth, keywordData }: AIInsightProps) {
  const [insight, setInsight] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [topKeyword, setTopKeyword] = useState<string>("")
  const [hasGenerated, setHasGenerated] = useState(false)

  // 월이 변경되면 인사이트 리셋
  useEffect(() => {
    setHasGenerated(false)
    setInsight("")
    setTopKeyword("")
  }, [selectedYear, selectedMonth])

  const generateInsight = async () => {
    if (Object.keys(keywordData).length === 0) return

    setLoading(true)
    setHasGenerated(true)
    
    // 해당 월의 상승폭이 가장 큰 키워드 찾기
    const growthData = calculateMonthlyGrowth(keywordData, selectedYear, selectedMonth)
    
    if (growthData.length === 0) {
      setInsight("해당 월의 데이터가 없습니다.")
      setLoading(false)
      return
    }

    const top = growthData[0]
    setTopKeyword(top.keyword)

    // 최근 6개월 데이터 추출
    const keywordInfo = keywordData[top.keyword]
    const previousMonths = []
    
    if (keywordInfo) {
      for (let i = 5; i >= 0; i--) {
        const targetDate = new Date(selectedYear, selectedMonth - 1)
        targetDate.setMonth(targetDate.getMonth() - i)
        
        const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
        const volume = keywordInfo.monthlyData[monthKey] || 0
        
        previousMonths.push({
          month: `${targetDate.getFullYear()}.${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
          volume: volume
        })
      }
    }

    try {
      // GPT API 호출 (실제 검색 데이터 포함)
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: top.keyword,
          growth: top.growth,
          volume: top.volume,
          year: selectedYear,
          month: selectedMonth,
          previousMonths: previousMonths,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ AI 인사이트 성공:', data)
        setInsight(data.insight)
      } else {
        const errorData = await response.json()
        console.error('❌ AI API 호출 실패:', response.status, errorData)
        
        // API 호출 실패 시 에러 메시지 표시
        setInsight(
          `⚠️ AI 인사이트 생성 실패: ${errorData.error || '알 수 없는 오류'}. 환경변수(OPENAI_API_KEY)를 확인해주세요.`
        )
      }
    } catch (error: any) {
      console.error('❌ AI 인사이트 생성 중 네트워크 오류:', error)
      // 오류 발생 시 에러 메시지 표시
      setInsight(
        `⚠️ 네트워크 오류: ${error.message}. API 서버 연결을 확인해주세요.`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 flex justify-center">
      <div 
        className={`relative overflow-hidden transition-all duration-700 ease-in-out ${
          hasGenerated 
            ? 'w-full rounded-full' 
            : 'w-auto rounded-full'
        }`}
      >
        {!hasGenerated ? (
          // 인사이트 생성 버튼
          <button
            onClick={generateInsight}
            disabled={loading || Object.keys(keywordData).length === 0}
            className="group relative flex items-center gap-2 rounded-full px-8 py-3.5 text-white font-semibold shadow-md hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
          >
            {/* 기본 그라데이션 (부드러운 색상) */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#F2B0ED] to-[#CAB2F4] transition-opacity duration-500"
            />
            
            {/* 호버 그라데이션 (쨍한 색상) */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-[#E85DD7] to-[#9D7DE8] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
            
            <Sparkles className="h-5 w-5 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">{selectedMonth}월 인사이트 생성</span>
          </button>
        ) : (
          // 인사이트 결과 표시 (버튼에서 확장되는 애니메이션)
          <div className="w-full bg-white px-6 py-5 relative rounded-full">
            {/* 그라데이션 테두리 */}
            <div className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#F2B0ED] to-[#CAB2F4]">
              <div className="h-full w-full rounded-full bg-white" />
            </div>
            
            <div 
              className={`relative flex flex-col items-center gap-3 transition-opacity duration-500 ${
                loading ? 'opacity-100' : 'opacity-100'
              }`}
            >
              {loading ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-300">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                  <p className="text-sm text-gray-600">AI 인사이트 생성 중...</p>
                </div>
              ) : (
                <div className="text-center animate-in fade-in duration-700 max-w-4xl mx-auto">
                  <p className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
                    "{topKeyword}" 상승폭 가장 높음
                  </p>
                  <div className="text-left space-y-3">
                    {insight.split('. ').map((sentence, idx) => {
                      if (!sentence.trim()) return null
                      
                      // 첫 문장은 강조
                      if (idx === 0) {
                        return (
                          <p key={idx} className="text-base font-semibold text-gray-900 leading-relaxed">
                            📊 {sentence.trim()}.
                          </p>
                        )
                      }
                      
                      return (
                        <p key={idx} className="text-sm leading-relaxed text-gray-700 pl-6">
                          • {sentence.trim()}{sentence.endsWith('.') ? '' : '.'}
                        </p>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setHasGenerated(false)
                      setInsight("")
                      setTopKeyword("")
                    }}
                    className="mt-6 text-xs text-purple-600 hover:text-purple-700 underline transition-colors duration-200"
                  >
                    다시 생성
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
