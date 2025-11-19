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

  // 엔터/콘텐츠로 거의 확실한 것들은 일단 unknown으로
  const negative = ['제시카 알바', '쉐어하우스 웹드라마']
  if (negative.some((p) => raw.includes(p))) return 'unknown'

  const insuranceTokens = [
    '보험',
    '여행자보험',
    '운전자보험',
    '펫보험',
    '주택화재보험',
    '이혼보험',
    '태아보험',
    '암보험',
    '치아보험',
    '종신보험',
    '연금 저축 보험',
  ]

  const sidejobTokens = [
    '알바',
    '아르바이트',
    '단기알바',
    '일당',
    '알바천국',
    '알바몬',
    '쿠팡',
    '대리운전',
    '입주청소',
    '포장이사',
    '반포장이사',
    '맘시터',
    '재택',
    '앱테크',
    '디지털 노마드',
    '소자본 창업',
    '경매',
    '크몽',
    '숨고',
    '티스토리',
    '워드프레스',
    '블로그',
    '유튜브',
    '영상',
    '스마트스토어',
    '쿠팡 파트너스',
  ]

  const financeTokens = [
    '4대보험',
    '국민연금',
    '건보료',
    '실업급여',
    '퇴직금',
    '퇴직연금',
    '연말정산',
    '종합소득세',
    '부가세',
    '재산세',
    '자동차세',
    '취득세',
    '양도소득세',
    '증여세',
    '상속세',
    '주택담보대출',
    '전세자금대출',
    '신용대출',
    '마이너스통장',
    '햇살론',
    '개인회생',
    '대출',
    '원리금',
  ]

  if (insuranceTokens.some((t) => raw.includes(t))) return 'insurance'
  if (sidejobTokens.some((t) => raw.includes(t))) return 'sidejob'
  if (financeTokens.some((t) => raw.includes(t))) return 'sidejob'

  return 'unknown'
}

/**
 * ────────────────────────────────────────────────
 * 원더 USP 공통 블록
 * ────────────────────────────────────────────────
 */
const WONDER_BASE = `
원더 핵심 USP:
- 스마트폰으로 보험을 직접 설계하고, 가입 시 발생하는 수수료를 설계사가 아닌 내가 가져가는 플랫폼
- 자격증 취득 → 설계 → 가입 → 정산까지 원스톱
- 보험 설계·가입에 필요한 교육 자료 무료 제공
- 점포, 재고, 인건비 같은 고정비 없이 시작
- 초보자도 가능한 전문 매니저의 1:1 지원
`

/**
 * ────────────────────────────────────────────────
 * 보험 키워드 프롬프트 (3~5문장 보고서 톤)
 * ────────────────────────────────────────────────
 */
function buildInsurancePrompt(p: any) {
  return `
당신은 원더(Wonder)의 보험 상품 마케팅 전략 컨설턴트입니다.

${WONDER_BASE}

검색 데이터:
키워드: ${p.keyword}
시점: ${p.year}년 ${p.month}월
검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

웹 검색 요약:
${p.webSearchResults || '관련 이슈 없음'}

작성 규칙:
1. 반드시 첫 문장은 “검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승했습니다' : '하락했습니다'}.”로 시작합니다.

2. 웹 검색 결과가 실제 보험/재무와 무관하고, 웹드라마·예능·영화·아이돌·배우 등 엔터테인먼트 콘텐츠가 중심이라면,
   - 두 번째 문장에서 "다만 웹 검색 결과를 보면 실제 보험 관련 키워드라기보다는 동명의 웹드라마/엔터테인먼트 콘텐츠로 보입니다."라고 명시합니다.
   - 그 다음 한두 문장에서는, "키워드 자체가 주는 이미지나 상징(예: 쉐어하우스=공유, 함께 살기)을 차용해 보험/부업 캠페인의 콘셉트로 활용할 수 있는 아이디어"만 간단히 제안합니다.
   - 이 경우에는 보험 상품/보장 니즈를 억지로 끌어오지 말고, "브랜디드 콘텐츠/세계관 차용" 정도로 가볍게 연결하세요.

3. 반대로 웹 검색 결과에서 제도 개편, 사고/질병, 만기/갱신, 보험사 상품, 의료비·보장 등의 이슈가 보인다면,
   - 두 번째~세 번째 문장에서는 그 이슈를 근거로 왜 이 보험 키워드가 상승했는지 설명합니다.
   - 예: "최근 ○○ 사고/질병 관련 보도가 반복되면서, △△ 보장에 대한 불안이 커진 영향으로 보입니다."

4. 마지막 문장(또는 두 문장)은 원더의 구조와 연결해 실전적인 메시지와 예시 카피를 제시합니다.
   - 예시: "예를 들면, '갱신 보험료는 줄이고, 설계 수수료는 내가 가져가는 운전자보험 리모델링' 같은 메시지로 접근할 수 있습니다."

형식:
- 불릿포인트, 이모지 없이 문단형 3~5문장으로 작성합니다.
`
}

/**
 * ────────────────────────────────────────────────
 * 부업 키워드 프롬프트 (3~5문장 보고서 톤)
 * ────────────────────────────────────────────────
 */
function buildSideJobPrompt(p: any) {
  return `
당신은 원더(Wonder)의 부업·N잡 마케팅 전략 컨설턴트입니다.

${WONDER_BASE}

검색 데이터:
키워드: ${p.keyword}
시점: ${p.year}년 ${p.month}월
검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

웹 검색 요약:
${p.webSearchResults || '관련 이슈 없음'}

작성 규칙:
1. 첫 문장은 반드시 “검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승했습니다' : '하락했습니다'}.”로 시작합니다.

2. 만약 웹 검색 결과가 단기 알바, 플랫폼 노동, 시급, 시급 알바 후기, 앱테크, 재택부업, 실업·경기 불안 등과 직접 연관된 경우라면,
   - 두 번째 문장에서 연초 세금·대출 상환·등록금·명절·물가 상승 등과 결합해 왜 추가 소득 니즈가 튀었는지 설명합니다.
   - 세 번째 문장에서는 기존 부업(시급 알바, 배달, 앱테크 등)의 시간·체력·불안정성 한계를 짚어줍니다.
   - 네 번째 이후로는 원더 보험 부업이 "리스크·고정비 없이 시작 가능한 구조"라는 점을 강조하고, 적어도 한 개 이상의 예시 카피를 따옴표로 제시합니다.
     예: "예를 들어, '시급 알바 대신, 가입만 되어도 수수료가 들어오는 두 번째 월급을 만들어 보세요.'처럼 제안할 수 있습니다."

3. 반대로 웹 검색 결과가 웹드라마, 예능, 영화, 아이돌 콘텐츠 등과 주로 연관되어 실제 부업/수익과 거리가 멀다면,
   - 두 번째 문장에서 "다만 웹 검색 결과를 보면 실제 부업이나 추가 소득과 직접적인 관련이 있는 키워드라기보다는, 동명의 웹드라마/엔터테인먼트 콘텐츠로 보입니다."라고 먼저 짚어줍니다.
   - 그 다음 문장에서, 키워드가 주는 이미지나 상황(예: '알바 브이로그'라면 MZ의 일상·노동 감성)을 활용해 원더의 브랜디드 콘텐츠나 스토리텔링 소재로 전환할 수 있는 아이디어를 제안합니다.
   - 이 경우에도 마지막에는 한 줄 정도의 예시 카피를 따옴표로 제시합니다.
     예: "예를 들면, '브이로그에서 시급 대신, 보험 수수료가 찍히는 하루를 보여주는 콘텐츠'처럼 활용할 수 있습니다."

형식:
- 불릿포인트, 이모지 없이 문단형 3~5문장으로 작성합니다.
`
}

/**
 * ────────────────────────────────────────────────
 * unknown 키워드 프롬프트 (3~5문장 보고서 톤)
 * ────────────────────────────────────────────────
 */
function buildGenericPrompt(p: any) {
  return `
당신은 원더(Wonder)의 통합 마케팅 전략 컨설턴트입니다.

${WONDER_BASE}

검색 데이터:
키워드: ${p.keyword}
시점: ${p.year}년 ${p.month}월
검색량: ${p.volume.toLocaleString()}건 / 평균 대비 ${p.growth.toFixed(1)}% / 전월 대비 ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

웹 검색 요약:
${p.webSearchResults || '관련 이슈 없음'}

작성 규칙:
1. 첫 문장은 “검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승했습니다' : '하락했습니다'}.”로 시작합니다.

2. 두 번째 문장에서는,
   - 웹 검색 결과와 키워드 성격을 기반으로 이 키워드가 보험 니즈에 가까운지, 부업/추가 소득 니즈에 가까운지, 아니면 웹드라마·예능 등 엔터테인먼트에 가까운지를 판단해 설명합니다.
   - 엔터테인먼트 비중이 높다면 "실제 보험/부업 키워드라기보다는 동명의 웹드라마/콘텐츠로 보인다"는 점을 분명히 적어줍니다.

3. 세 번째 이후 문장에서는,
   - 보험/부업 방향으로 연결 가능한 경우: 그 방향에서 원더 USP와 연결한 메시지와 예시 카피를 제안합니다.
   - 엔터테인먼트 방향인 경우:
     - 키워드가 상징하는 이미지·세계관(청춘, 공유주거, 경쟁, 서바이벌 등)을 간단히 해석하고,
     - 이를 활용해 "원더 보험 부업을 브랜디드 웹드라마/콘텐츠 콘셉트로 녹여낼 수 있는 아이디어"를 한두 문장으로 제안합니다.
     - 마지막에는 한 개 이상의 예시 카피를 따옴표로 제시합니다.
       예: "예를 들어, '같이 사는 집은 쉐어하우스, 같이 버는 수수료는 원더에서'와 같은 식으로 활용할 수 있습니다."

형식:
- 불릿포인트, 이모지 없이 문단형 3~5문장으로 작성합니다.
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

    const webSearchResults = await searchWeb(keyword, year, month)

    const trendText =
      previousMonths
        .map((m: any) => `${m.month}: ${m.volume.toLocaleString()}건`)
        .join(', ') || ''

    const prevMonth = previousMonths[previousMonths.length - 2]
    const prevVol = prevMonth?.volume || 0
    const monthOverMonth =
      prevVol > 0 ? (((volume - prevVol) / prevVol) * 100).toFixed(1) : '0'

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            '당신은 보험/부업 데이터를 해석하는 시니어 전략 컨설턴트입니다. 불릿포인트와 이모지를 사용하지 말고, 한국어 문단 3~5문장으로만 답변하세요.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
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
      { status: 500 },
    )
  }
}
