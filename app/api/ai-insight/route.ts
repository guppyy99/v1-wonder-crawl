import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * ────────────────────────────────────────────────
 * Serper 웹검색
 * ────────────────────────────────────────────────
 */
async function searchWeb(keyword: string, year: number, month: number): Promise<string> {
  const serperApiKey = process.env.SERPER_API_KEY
  if (!serperApiKey) return ''

  try {
    const query = `${keyword} ${year}년 ${month}월 트렌드 이슈`
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, gl: 'kr', hl: 'ko', num: 5 }),
    })

    if (!response.ok) return ''
    const data = await response.json()

    return (
      data.organic
        ?.slice(0, 5)
        ?.map((item: any, idx: number) => `${idx + 1}. ${item.title}\n${item.snippet || ''}`)
        .join('\n\n') || ''
    )
  } catch (err) {
    console.error('Serper API 오류:', err)
    return ''
  }
}

/**
 * ────────────────────────────────────────────────
 * 키워드 분류 (보험 / 부업 / 기타)
 * ────────────────────────────────────────────────
 */
type KeywordCategory = 'insurance' | 'sidejob' | 'unknown'

function classifyKeyword(keyword: string): KeywordCategory {
  const raw = keyword.trim()
  const k = raw.toLowerCase()

  // 예외 노이즈
  const negative = ['제시카 알바', '쉐어하우스 웹드라마']
  if (negative.some((p) => raw.includes(p))) return 'unknown'

  // 보험 토큰
  const insuranceTokens = [
    '보험', '여행자보험', '운전자보험', '펫보험', '주택화재보험', '이혼보험',
    '태아보험', '암보험', '치아보험', '종신보험', '연금 저축 보험'
  ]

  // 알바/부업 토큰
  const sidejobTokens = [
    '알바', '아르바이트', '단기알바', '일당 아르바이트', '알바천국', '알바몬',
    '쿠팡 알바', '대리운전', '입주청소', '포장이사', '반포장이사', '맘시터',
    '재택 알바', '앱테크', '디지털 노마드', '소자본 창업', '부동산 경매',
    '크몽', '숨고', '티스토리', '워드프레스', '블로그 체험단',
    '유튜브 수익', '영상 편집', '영상 편집 프로그램',
    '네이버 스마트스토어', '쿠팡 파트너스', '쿠팡파트너스'
  ]

  // 세금/연금/대출(지출 압박) → 부업 니즈로 분류
  const financeTokens = [
    '4대보험', '국민연금', '건보료', '실업급여', '퇴직금', '퇴직연금',
    '연말정산', '종합소득세', '부가세', '재산세', '자동차세',
    '취득세', '양도소득세', '증여세', '상속세',
    '주택담보대출', '전세자금대출', '신용대출', '마이너스통장',
    '햇살론', '개인회생', '소액 대출', '프리랜서 대출', '학자금대출',
  ]

  if (insuranceTokens.some((p) => raw.includes(p))) return 'insurance'
  if (sidejobTokens.some((p) => raw.includes(p))) return 'sidejob'
  if (financeTokens.some((p) => raw.includes(p))) return 'sidejob'

  return 'unknown'
}

/**
 * ────────────────────────────────────────────────
 * 원더 USP 공통 블록
 * ────────────────────────────────────────────────
 */
const WONDER_BASE = `
**원더 핵심 USP**:
- 핸드폰으로 간편하게 보험을 설계하고, 가입하면 수수료도 내가 가져가는 플랫폼
- 설계사에게 주던 보험 수수료를 내가 직접 가져가는 구조
- 자격증 → 설계 → 가입 → 정산까지 원스톱
- 보험 설계·가입에 필요한 교육자료 무료 제공
- 리스크·고정비 없이 가능한 부업
- 초보도 가능한 1:1 매니저 지원
`

/**
 * ────────────────────────────────────────────────
 * 보험 키워드용 프롬프트
 * ────────────────────────────────────────────────
 */
function buildInsurancePrompt(p: any) {
  return `
당신은 원더(Wonder)의 **보험 상품 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

# 검색 데이터
- **키워드**: ${p.keyword}
- **시점**: ${p.year}년 ${p.month}월
- **검색량**: ${p.volume.toLocaleString()}건
- **평균 대비**: ${p.growth > 0 ? '+' : ''}${p.growth.toFixed(1)}%
- **전월 대비**: ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText}

${p.webSearchResults ? `웹 검색 결과:\n${p.webSearchResults}` : ''}

# 작성 지침 (보험 키워드)
- 해당 보험 키워드가 상승한 이유(만기, 출산, 제도변경, 사회이슈 등)를 1문장
- 그 보험 상품/보장을 원더에서 직접 설계하고 수수료를 가져갈 수 있다는 혜택을 1–2문장
- 전체 2–3문장

# 출력 형식 (예시 구조)
검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 X% 상승했습니다. [보험 니즈 상승 원인]. [원더에서 직접 설계·가입하고 수수료를 가져가는 액션].
`
}

/**
 * ────────────────────────────────────────────────
 * 부업 키워드용 프롬프트
 * ────────────────────────────────────────────────
 */
function buildSideJobPrompt(p: any) {
  return `
당신은 원더(Wonder)의 **부업/N잡 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

# 검색 데이터
- **키워드**: ${p.keyword}
- **시점**: ${p.year}년 ${p.month}월
- **검색량**: ${p.volume.toLocaleString()}건
- **평균 대비**: ${p.growth > 0 ? '+' : ''}${p.growth.toFixed(1)}%
- **전월 대비**: ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText}

${p.webSearchResults ? `웹 검색 결과:\n${p.webSearchResults}` : ''}

# 작성 지침 (부업 키워드)
- 지출/경제/대출/세금 등으로 인해 해당 부업 키워드 검색이 증가한 배경을 1문장
- 그 타겟에게 원더를 "리스크·고정비 없이 가능한 보험 부업"으로 제안하는 액션 1–2문장
- 전체 2–3문장

# 출력 형식 (예시 구조)
검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 X% 상승했습니다. [부업 검색 증가 원인]. [원더 부업으로 연결하는 커뮤니케이션].
`
}

/**
 * ────────────────────────────────────────────────
 * unknown 키워드용 프롬프트
 * ────────────────────────────────────────────────
 */
function buildGenericPrompt(p: any) {
  return `
당신은 원더(Wonder)의 **통합 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

# 검색 데이터
- **키워드**: ${p.keyword}
- **검색량**: ${p.volume.toLocaleString()}건

최근 6개월 추이:
${p.trendText}

${p.webSearchResults ? `웹 검색 결과:\n${p.webSearchResults}` : ''}

# 작성 지침
- 이 키워드가 보험/부업 중 어느 쪽 니즈에 가까운지 1문장
- 해당 방향에서 원더를 자연스럽게 연결하는 actionable 제안 1–2문장
- 전체 2–3문장
`
}

/**
 * ────────────────────────────────────────────────
 * POST Handler
 * ────────────────────────────────────────────────
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      keyword,
      growth,
      volume,
      year,
      month,
      previousMonths = [],
    } = body

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key가 없습니다.' }, { status: 500 })
    }

    // 웹 검색
    const webSearchResults = await searchWeb(keyword, year, month)

    // 추이 텍스트
    const trendText =
      previousMonths
        .map((m: any) => `${m.month}: ${m.volume.toLocaleString()}건`)
        .join(', ') || ''

    const prevMonth = previousMonths[previousMonths.length - 2]
    const prevVol = prevMonth?.volume || 0
    const monthOverMonth =
      prevVol > 0 ? (((volume - prevVol) / prevVol) * 100).toFixed(1) : '0'

    // 분류
    const category = classifyKeyword(keyword)

    const params = {
      keyword,
      growth,
      volume,
      year,
      month,
      previousMonths,
      monthOverMonth,
      trendText,
      webSearchResults,
    }

    const prompt =
      category === 'insurance'
        ? buildInsurancePrompt(params)
        : category === 'sidejob'
        ? buildSideJobPrompt(params)
        : buildGenericPrompt(params)

    // gpt-5.1-chat-latest 호출
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat-latest',
      messages: [
        { role: 'system', content: '당신은 보험/부업 마케팅 전략을 만드는 전문가입니다.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
    })

    const insight =
      completion.choices?.[0]?.message?.content ||
      '인사이트 생성 실패: 응답 없음'

    return NextResponse.json({ insight, category })
  } catch (err: any) {
    console.error('AI 인사이트 생성 오류:', err)
    return NextResponse.json(
      { error: err.message || '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
