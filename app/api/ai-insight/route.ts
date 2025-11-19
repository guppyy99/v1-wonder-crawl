import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/* ────────────────────────────────────────────────
 * SERPER 검색
 * ──────────────────────────────────────────────── */
async function searchWeb(keyword: string, year: number, month: number): Promise<string> {
  const key = process.env.SERPER_API_KEY
  if (!key) return ''

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': key,
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
        ?.map((it: any, idx: number) => `${idx + 1}. ${it.title}\n${it.snippet || ''}`)
        .join('\n\n') || ''
    )
  } catch (e) {
    console.error('Serper Error:', e)
    return ''
  }
}

/* ────────────────────────────────────────────────
 * 키워드 분류
 * ──────────────────────────────────────────────── */
type Category = 'insurance' | 'sidejob' | 'unknown'

function classifyKeyword(keyword: string): Category {
  const raw = keyword.trim().toLowerCase()

  const negative = ['제시카 알바', '쉐어하우스 웹드라마']
  if (negative.some((n) => raw.includes(n))) return 'unknown'

  const insurance = [
    '보험', '여행자보험', '운전자보험', '이혼보험', '태아보험', '암보험', '치아보험',
    '펫보험', '주택화재보험', '종신보험', '연금 저축 보험'
  ]

  const sidejob = [
    '알바','아르바이트','단기알바','일당','알바천국','알바몬','쿠팡','대리운전',
    '입주청소','포장이사','반포장이사','맘시터','재택','앱테크','디지털 노마드',
    '소자본 창업','경매','크몽','숨고','티스토리','워드프레스','블로그','유튜브',
    '영상','스마트스토어','쿠팡 파트너스'
  ]

  const finance = [
    '4대보험','국민연금','건보료','실업급여','퇴직금','퇴직연금','연말정산','종합소득세',
    '부가세','자동차세','취득세','양도소득세','증여세','상속세','주택담보대출','전세자금대출',
    '신용대출','마이너스통장','햇살론','개인회생','대출'
  ]

  if (insurance.some((i) => raw.includes(i))) return 'insurance'
  if (sidejob.some((s) => raw.includes(s))) return 'sidejob'
  if (finance.some((f) => raw.includes(f))) return 'sidejob'

  return 'unknown'
}

/* ────────────────────────────────────────────────
 * 공통 USP
 * ──────────────────────────────────────────────── */
const WONDER_BASE = `
원더 핵심 USP:
- 스마트폰으로 보험을 직접 설계하고, 가입 시 발생하는 수수료를 내가 가져가는 구조
- 자격증 취득 → 설계 → 가입 → 정산까지 원스톱 프로세스
- 교육자료 무료 제공 + 전문 매니저의 1:1 실전 지원
- 고정비·재고·점포 없이 가능한 리스크 없는 부업
`

/* ────────────────────────────────────────────────
 * 세부 프롬프트
 * ──────────────────────────────────────────────── */
function insurancePrompt(p: any) {
  return `
당신은 원더(Wonder)의 보험 전략 컨설턴트입니다.

${WONDER_BASE}

데이터:
키워드: ${p.keyword}
검색량: ${p.volume.toLocaleString()}건
평균 대비: ${p.growth.toFixed(1)}%
전월 대비: ${p.monthOverMonth}%
추이: ${p.trendText}

웹 검색 결과:
${p.webSearchResults || '관련 자료 없음'}

규칙:
1) 첫 문장은 반드시 "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(1)}% ${
    p.growth >= 0 ? '상승' : '하락'
  }했습니다."로 시작.
2) 웹검색이 보험과 무관하면 "실제 보험 관련이 아닌 동명의 콘텐츠로 보입니다."라고 명시.
3) 그 후 키워드가 주는 이미지·상징을 활용해 보험 콘텐츠화 아이디어 제시 OR
   보험 이슈 기반 원인 설명.
4) 마지막 1~2문장은 반드시 원더 USP와 연결된 실전 메시지 + 예시 카피.
5) 전체 3~5문장, 불릿·이모지 금지.
`
}

function sidejobPrompt(p: any) {
  return `
당신은 원더(Wonder)의 부업 전략 컨설턴트입니다.

${WONDER_BASE}

데이터:
키워드: ${p.keyword}
검색량: ${p.volume.toLocaleString()}건
평균 대비: ${p.growth.toFixed(1)}%
전월 대비: ${p.monthOverMonth}%
추이: ${p.trendText}

웹 검색 결과:
${p.webSearchResults || '관련 자료 없음'}

규칙:
1) 첫 문장은 반드시 "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(1)}% ${
    p.growth >= 0 ? '상승' : '하락'
  }했습니다."로 시작.
2) 웹검색이 부업과 무관하면 “실제 부업과 직접적 관련이 없는 콘텐츠로 보입니다.”라고 명시.
3) 관련 있는 경우: 경기·지출·세금·대출 등 경제적 요인을 기반으로 상승 원인 설명.
4) 그 다음 문장: 기존 부업(알바/배달/앱테크)의 구조적 한계 제시.
5) 마지막 문장: 원더를 대안으로 제시 + 예시 카피 1개 이상.
6) 전체 3~5문장, 보고서 톤.
`
}

function unknownPrompt(p: any) {
  return `
당신은 원더(Wonder)의 통합 전략 컨설턴트입니다.

${WONDER_BASE}

데이터:
키워드: ${p.keyword}
검색량: ${p.volume.toLocaleString()}건
평균 대비: ${p.growth.toFixed(1)}%
전월 대비: ${p.monthOverMonth}%
추이: ${p.trendText}

웹 검색 결과:
${p.webSearchResults || '관련 자료 없음'}

규칙:
1) 첫 문장: "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(1)}% ${
    p.growth >= 0 ? '상승' : '하락'
  }했습니다."
2) 웹검색 기반으로 보험/부업/엔터 중 어디에 더 가까운지 명확하게 판별.
3) 엔터테인먼트면 “동명의 콘텐츠로 보입니다.”라고 명시 후 → 이미지 활용한 캠페인 아이디어로 연결.
4) 마지막 문장 예시 카피 포함.
5) 문단 형태, 3~5문장.
`
}

/* ────────────────────────────────────────────────
 * POST Handler
 * ──────────────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { keyword, growth, volume, year, month, previousMonths = [] } = data

    const webSearchResults = await searchWeb(keyword, year, month)
    const trendText = previousMonths.map((m: any) => `${m.month}: ${m.volume.toLocaleString()}건`).join(', ')
    const prev = previousMonths[previousMonths.length - 2]
    const mom = prev ? (((volume - prev.volume) / prev.volume) * 100).toFixed(1) : '0'

    const category = classifyKeyword(keyword)

    const params = {
      keyword,
      growth,
      volume,
      year,
      month,
      monthOverMonth: mom,
      trendText,
      webSearchResults,
    }

    const prompt =
      category === 'insurance'
        ? insurancePrompt(params)
        : category === 'sidejob'
        ? sidejobPrompt(params)
        : unknownPrompt(params)

    const completion = await openai.responses.create({
      model: 'gpt-5.1',
      input: prompt,
      reasoning: { effort: 'high' },
      text: { verbosity: 'high' },
      max_output_tokens: 600,
    })

    const insight = completion.output_text || '인사이트 생성 실패'

    return NextResponse.json({ insight, category })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
