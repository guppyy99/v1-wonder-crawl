export interface KeywordInfo {
  malePercent: number
  femalePercent: number
  ageGroups: {
    "12세 이하": number
    "13~19세": number
    "20~24세": number
    "25~29세": number
    "30~39세": number
    "40~49세": number
    "50세 이상": number
  }
  monthlyData: Record<string, number>
}

export type KeywordData = Record<string, KeywordInfo>
