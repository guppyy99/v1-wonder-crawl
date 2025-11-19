import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs' // edge X

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/* ───────────────────────────────
 * Serper 검색
 * ─────────────────────────────── */
async function searchWeb(keyword: string, year: number, month: number): Promise<string> {
  const serperApiKey = process.env.SERPER_API_KEY
  if (!serperApiKey) return ''

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: `${keyword} ${year}년 ${month}월 이슈`,
        gl: 'kr',
        hl: 'ko',
        num: 5,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()

    return (
      data.organic
        ?.slice(0, 5)
        ?.map((item: any, idx: number) => `${idx + 1}. ${item.title}\n${item.snippet || ''}`)
        .join('\n\n') || ''
    )
  } catch (e) {
    console.error('Serper API error:', e)
    return ''
  }
}

/* ───────────────────────────────
 * 키워드 분류
 * ─────────────────────────────── */
type Category = 'insurance' | 'sidejob' | 'unknown'

function classifyKeyword(keyword: string): Category {
  const raw = keyword.trim().toLowerCase()

  const negative = ['제시카 알바', '쉐어하우스 웹드라마']
  if (negative.some((n) => raw.includes(n))) return 'unknown'

  const insurance = [
    '보험','여행자보험','운전자보험','펫보험','주택화재보험','이혼보험',
    '태아보험','암보험','치아보험','종신보험','연금 저축 보험'
  ]

  const sidejob = [
    '알바','아르바이트','단기알바','일당','알바천국','알바몬','쿠팡','대리운전',
    '입주청소','포장이사','반포장이사','맘시터','재택','앱테크','디지털 노마드',
    '소자본 창업','경매','크몽','숨고','티스토리','워드프레스','블로그','유튜브',
    '영상','스마트스토어','쿠팡 파트너스'
  ]

  const finance = [
    '4대보험','국민연금','건보료','실업급여','퇴직금','퇴직연금',
    '연말정산','종합소득세','부가세','자동차세','취득세','양도소득세','증여세','상속세',
    '주택담보대출','전세자금대출','신용대출','마이너스통장','햇살론','개인회생','대출'
  ]

  if (insurance.some(i => raw.includes(i))) return 'insurance'
  if (sidejob.some(s => raw.includes(s))) return 'sidejob'
  if (finance.some(f => raw.includes(f))) return 'sidejob'

  return 'unknown'
}

/* ───────────────────────────────
 * 원더 USP
 * ─────────────────────────────── */
const WONDER_BASE = `
원더 핵심 USP:
- 스마트폰으로 보험을 직접 설계하고, 가입 시 수수료를 내가 가져가는 구조
- 자격증 취득 → 설계 → 가입 → 정산까지 원스톱
- 무료 교육자료 제공 + 전문 매니저 1:1 지원
- 점포·고정비·재고 없이 가능한 안전한 부업
`

/* ───────────────────────────────
 * 프롬프트 생성기
 * ─────────────────────────────── */
function insurancePrompt(p: any) {
  return `
당신은 원더(Wonder)의 보험 전략 컨설턴트입니다.

${WONDER_BASE}

검색데이터:
- 키워드: ${p.keyword}
- 검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%
- 추이: ${p.trendText}

웹검색 요약:
${p.webSearchResults || '관련 자료 없음'}

작성 규칙:
1) 첫 문장은 "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1
  )}% ${p.growth >= 0 ? '상승' : '하락'}했습니다." 로 시작.
2) 웹검색이 보험과 무관하면 “실제 보험이 아닌 동명의 콘텐츠로 보입니다.”라고 명시.
3) 보험 관련 이슈라면 상승 원인 → 사회/제도/리스크 설명.
4) 마지막 문장은 반드시 원더 USP 기반 제안 + 예시 카피 포함.
5) 3~5문장, 불릿·이모지 금지.
`
}

function sidejobPrompt(p: any) {
  return `
당신은 원더(Wonder)의 부업 전략 컨설턴트입니다.

${WONDER_BASE}

검색데이터:
- 키워드: ${p.keyword}
- 검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%
- 추이: ${p.trendText}

웹검색 요약:
${p.webSearchResults || '관련 자료 없음'}

작성 규칙:
1) 첫 문장은 동일하게 시작.
2) 웹검색이 부업과 무관한 엔터테인먼트면 “실제 부업과 관련 없는 콘텐츠로 보입니다.” 명시.
3) 부업 관련이면 경기/지출/세금 요인 기반 상승 원인 설명.
4) 기존 부업의 한계 → 원더 부업의 구조적 강점 설명.
5) 예시 카피 필수.
`
}

function unknownPrompt(p: any) {
  return `
당신은 원더(Wonder)의 통합 전략 컨설턴트입니다.

${WONDER_BASE}

검색데이터:
- 키워드: ${p.keyword}
- 검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%
- 추이: ${p.trendText}

웹검색 요약:
${p.webSearchResults || '관련 자료 없음'}

작성 규칙:
1) 시작 문장 동일.
2) 키워드가 보험/부업/엔터 중 무엇에 가까운지 웹검색 근거로 판단.
3) 엔터테인먼트면 “동명의 콘텐츠로 보입니다.” 명시 + 이미지 차용 방식으로 원더 연결.
4) 마지막 문장 카피 포함.
5) 3~5문장 보고서 톤.
`
}

/* ───────────────────────────────
 * POST Handler
 * ─────────────────────────────── */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { keyword, growth, volume, year, month, previousMonths = [] } = body

    const webSearchResults = await searchWeb(keyword, year, month)

    const trendText =
      previousMonths.map((m: any) => `${m.month}: ${m.volume.toLocaleString()}건`).join(', ') || ''

    const prev = previousMonths[previousMonths.length - 2]
    const prevVol = prev?.volume || 0
    const mom = prevVol > 0 ? (((volume - prevVol) / prevVol) * 100).toFixed(1) : '0'

    const category = classifyKeyword(keyword)

    const params = {
      keyword,
      growth,
      volume,
      year,
      month,
      trendText,
      webSearchResults,
      monthOverMonth: mom,
    }

    const prompt =
      category === 'insurance'
        ? insurancePrompt(params)
        : category === 'sidejob'
        ? sidejobPrompt(params)
        : unknownPrompt(params)

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1',
      messages: [
        {
          role: 'system',
          content:
            '당신은 보험과 부업 데이터를 해석하는 시니어 전략 컨설턴트입니다. 불릿포인트와 이모지를 사용하지 말고, 한국어 분석형 3~5문장으로 작성하세요.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
      top_p: 1,
      frequency_penalty: 0.2,
    })

    const insight =
      completion.choices?.[0]?.message?.content ||
      '인사이트 생성 실패'

    return NextResponse.json({ insight, category })
  } catch (err: any) {
    console.error('ChatCompletion Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
