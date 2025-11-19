import type { KeywordData, KeywordInfo } from "./types"

/**
 * 월 형식을 변환합니다 (21-Nov → 2021-11)
 */
function convertMonthFormat(monthStr: string): string {
  if (!monthStr) return ''
  
  // 이미 YYYY-MM 형식이면 그대로 반환
  if (monthStr.match(/^\d{4}-\d{2}$/)) {
    return monthStr
  }
  
  const monthMap: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  }
  
  // 21-Nov, 22-Jan, 25-Oct 등의 형식 처리
  const parts = monthStr.split('-')
  if (parts.length === 2) {
    const year = parts[0]
    const monthName = parts[1]
    const monthNum = monthMap[monthName]
    
    if (monthNum && year) {
      // 21 → 2021, 25 → 2025
      const fullYear = parseInt(year) >= 50 ? `19${year}` : `20${year}`
      return `${fullYear}-${monthNum}`
    }
  }
  
  return monthStr
}

/**
 * CSV 파일을 파싱하여 KeywordData 형식으로 변환합니다.
 */
export async function parseCSV(): Promise<KeywordData> {
  try {
    const response = await fetch('/date-set-calendar.csv')
    const text = await response.text()
    
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      throw new Error('CSV 파일이 비어있습니다')
    }
    
    // 헤더 파싱 (쉼표로 분리, 하지만 값 안에 쉼표가 있을 수 있으므로 주의)
    const headers: string[] = []
    let currentHeader = ''
    let inQuotes = false
    
    for (let char of lines[0]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        headers.push(currentHeader.trim())
        currentHeader = ''
      } else {
        currentHeader += char
      }
    }
    headers.push(currentHeader.trim()) // 마지막 헤더 추가
    
    // 월별 데이터 컬럼 시작 인덱스 찾기 (2021-11, 2022-01 등)
    const monthStartIndex = headers.findIndex(h => {
      const trimmed = h.trim()
      // YYYY-MM 패턴 찾기
      return /^\d{4}-\d{2}$/.test(trimmed) ||
             // 또는 21-Nov, 22-Jan 같은 패턴 (하위 호환성)
             /^\d{2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(trimmed)
    })
    
    console.log('CSV 헤더 샘플:', headers.slice(0, 15))
    console.log('월별 데이터 시작 인덱스:', monthStartIndex, '컬럼:', headers[monthStartIndex])
    
    if (monthStartIndex === -1) {
      console.error('헤더 전체:', headers)
      throw new Error('월별 데이터 컬럼을 찾을 수 없습니다')
    }
    
    const keywordData: KeywordData = {}
    
    // 헤더를 제외한 각 라인 처리
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // CSV 파싱 (쉼표로 분리, 하지만 값 안에 쉼표가 있을 수 있으므로 주의)
      const values: string[] = []
      let currentValue = ''
      let inQuotes = false
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim())
          currentValue = ''
        } else {
          currentValue += char
        }
      }
      values.push(currentValue.trim()) // 마지막 값 추가
      
      const keyword = values[0]
      
      if (!keyword) continue
      
      const malePercent = parseFloat(values[1]) || 0
      const femalePercent = parseFloat(values[2]) || 0
      
      // 연령대별 데이터 (인덱스 4부터 시작: 12세 이하, 13~19세, 20~24세, 25~29세, 30~39세, 40~49세, 50세 이상)
      const ageGroups = {
        "12세 이하": parseFloat(values[4]) || 0,
        "13~19세": parseFloat(values[5]) || 0,
        "20~24세": parseFloat(values[6]) || 0,
        "25~29세": parseFloat(values[7]) || 0,
        "30~39세": parseFloat(values[8]) || 0,
        "40~49세": parseFloat(values[9]) || 0,
        "50세 이상": parseFloat(values[10]) || 0,
      }
      
      // 월별 데이터 (인덱스 11부터 시작: 2021-11, 2021-12, ...)
      const monthlyData: Record<string, number> = {}
      for (let j = monthStartIndex; j < headers.length && j < values.length; j++) {
        if (!headers[j]) continue
        
        const originalMonthKey = headers[j].trim()
        const monthKey = convertMonthFormat(originalMonthKey)
        const valueStr = values[j]?.trim() || '0'
        const value = parseInt(valueStr) || 0
        
        // 월 키가 유효하고 값이 숫자인 경우 저장 (0도 포함)
        if (monthKey && !isNaN(parseInt(valueStr))) {
          monthlyData[monthKey] = value
        }
      }
      
      keywordData[keyword] = {
        malePercent,
        femalePercent,
        ageGroups,
        monthlyData,
      }
    }
    
    return keywordData
  } catch (error) {
    console.error('CSV 파싱 중 오류 발생:', error)
    return {}
  }
}

/**
 * 특정 월의 평균 대비 상승폭을 계산합니다.
 */
export function calculateMonthlyGrowth(
  keywordData: KeywordData,
  year: number,
  month: number
): Array<{ keyword: string; growth: number; volume: number }> {
  const results: Array<{ keyword: string; growth: number; volume: number }> = []
  
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  
  Object.entries(keywordData).forEach(([keyword, data]) => {
    const currentValue = data.monthlyData[monthKey]
    if (!currentValue) return
    
    // 전체 기간의 평균 계산
    const allValues = Object.values(data.monthlyData).filter(v => v > 0)
    if (allValues.length === 0) return
    
    const average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    
    // 평균 대비 상승폭 계산
    const growth = ((currentValue - average) / average) * 100
    
    results.push({
      keyword,
      growth,
      volume: currentValue,
    })
  })
  
  // 상승폭이 큰 순서로 정렬
  return results.sort((a, b) => b.growth - a.growth)
}

/**
 * 이전 달 대비 상승폭을 계산합니다.
 */
export function calculatePreviousMonthGrowth(
  data: KeywordInfo,
  year: number,
  month: number
): { growth: number; volume: number } {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`
  const currentValue = data.monthlyData[monthKey] || 0
  
  // 이전 달 키 계산
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear = year - 1
  }
  
  const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  const previousValue = data.monthlyData[prevMonthKey] || 0
  
  if (previousValue === 0) {
    return { growth: 0, volume: currentValue }
  }
  
  const growth = ((currentValue - previousValue) / previousValue) * 100
  
  return { growth, volume: currentValue }
}

