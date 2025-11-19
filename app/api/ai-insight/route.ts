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

  // 예외 노이즈
  const negative = ['제시카 알바', '쉐어하우스 웹드라마']
  if (negative.some((p) => raw.includes(p))) return 'unknown'

  // 보험 토큰
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

  // 알바/부업 토큰
  const sidejobTokens = [
    '알바',
    '아르바이트',
    '단기알바',
    '일당 아르바이트',
    '알바천국',
    '알바몬',
    '쿠팡 알바',
    '대리운전',
    '입주청소',
    '포장이사',
    '반포장이사',
    '맘시터',
    '재택 알바',
    '앱테크',
    '디지털 노마드',
    '소자본 창업',
    '부동산 경매',
    '크몽',
    '숨고',
    '티스토리',
    '워드프레스',
    '블로그 체험단',
    '유튜브 수익',
    '영상 편집',
    '영상 편집 프로그램',
    '네이버 스마트스토어',
    '쿠팡 파트너스',
    '쿠팡파트너스',
  ]

  // 세금/연금/대출(지출 압박) → 부업 니즈로 분류
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
    '소액 대출',
    '프리랜서 대출',
    '학자금대출',
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
**원더 핵심 USP**
- 스마트폰 하나로 보험을 설계하고, 가입이 완료되면 수수료를 내가 가져가는 플랫폼
- 기존에는 설계사가 가져가던 보험 수수료를 내 추가 소득으로 전환하는 구조
- 자격증 취득 → 상품 설계 → 가입 진행 → 정산까지 원스톱 프로세스
- 보험 설계·가입에 필요한 교육 자료를 무료로 제공
- 점포 임대료·재고·인건비 같은 고정비와 리스크 없이 시작 가능한 부업
- 설계가 처음인 사람도 전문 매니저의 1:1 지원으로 시작할 수 있음
`

/**
 * ────────────────────────────────────────────────
 * 보험 키워드용 프롬프트 (풍성한 3~5문장)
 * ────────────────────────────────────────────────
 */
function buildInsurancePrompt(p: any) {
  return `
당신은 원더(Wonder)의 **보험 상품 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

아래는 해당 키워드의 실제 검색 데이터입니다.

- 키워드: ${p.keyword}
- 시점: ${p.year}년 ${p.month}월
- 검색량: ${p.volume.toLocaleString()}건
- 평균 대비: ${p.growth > 0 ? '+' : ''}${p.growth.toFixed(1)}%
- 전월 대비: ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

${
  p.webSearchResults
    ? `웹 검색 결과(이슈/뉴스/콘텐츠 흐름 요약):\n${p.webSearchResults}`
    : '웹 검색 결과는 제공되지 않았습니다.'
}

# 작성 지침 (보험 키워드용)

- 답변은 **3~5문장**으로 작성합니다.
- **첫 문장**은 반드시 다음 형식으로 시작합니다:
  - "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승' : '하락'}했습니다."
- 이어지는 1~2문장에서는,
  - 해당 보험 키워드 검색이 **왜 이 시점에** 늘었는지 설명합니다.
  - 예: 보험 만기/갱신 시즌, 출산·결혼·이사 등 라이프 이벤트, 건강검진·질병 이슈, 제도 개편·언론 보도, 경기 불안 등.
- 마지막 1~2문장에서는,
  - 이 보험 니즈를 원더와 연결해 **실행 가능한 마케팅 액션**을 제안합니다.
  - 예: "만기 리모델링" / "보장 리체크" / "특정 연령대 자녀·부모를 겨냥한 설계 캠페인" 등 보험 상품 활용 방향과
  - "설계사는 수수료를 가져가지만, 원더에서는 내가 설계하고 수수료도 가져간다"는 메시지를 자연스럽게 섞어 작성합니다.
  - 시즈널 타이밍(만기·건강검진·세금 납부 월 등)에 맞춰 어떤 카피·소재를 쓰면 좋을지도 한 문장으로 제안합니다.

# 출력 예시 톤 (참고용)

예)
"검색량이 5,367,700건으로 평균 대비 461% 상승했습니다. 해당 시기는 부가세 신고·납부가 집중되는 구간이라, 사업자와 프리랜서가 세금 지출 압박을 강하게 체감한 영향이 큰 것으로 보입니다. 이때는 기존 보장 상태를 다시 점검하고, 예상치 못한 의료비·질병 리스크를 대비하려는 보험 니즈가 함께 튀어오르기 쉽습니다. 원더에서는 스마트폰으로 내 보장을 직접 설계하고, 가입 시 발생하는 수수료를 설계사가 아니라 내가 가져갈 수 있다는 점을 강조해 '세금 나가는 달에, 보험 수수료는 내가 가져오는 구조'라는 메시지로 커뮤니케이션하는 것이 효과적입니다."
`
}

/**
 * ────────────────────────────────────────────────
 * 부업 키워드용 프롬프트 (풍성한 3~5문장)
 * ────────────────────────────────────────────────
 */
function buildSideJobPrompt(p: any) {
  return `
당신은 원더(Wonder)의 **부업/N잡 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

아래는 해당 키워드의 실제 검색 데이터입니다.

- 키워드: ${p.keyword}
- 시점: ${p.year}년 ${p.month}월
- 검색량: ${p.volume.toLocaleString()}건
- 평균 대비: ${p.growth > 0 ? '+' : ''}${p.growth.toFixed(1)}%
- 전월 대비: ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

${
  p.webSearchResults
    ? `웹 검색 결과(이슈/뉴스/콘텐츠 흐름 요약):\n${p.webSearchResults}`
    : '웹 검색 결과는 제공되지 않았습니다.'
}

# 작성 지침 (부업 키워드용)

- 답변은 **3~5문장**으로 작성합니다.
- **첫 문장**은 반드시 다음 형식으로 시작합니다:
  - "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승' : '하락'}했습니다."
- 이어지는 1~2문장에서는,
  - 왜 이 시점에 사람들이 ${p.keyword} 같은 **부업/알바/재택/앱테크/세금·대출 관련 키워드**를 더 많이 찾는지 설명합니다.
  - 예: 경기 침체, 생활비·대출·세금 등 고정지출 상승, 실직·소득 감소, 명절·교육비·이사 시즌 등.
- 마지막 1~2문장에서는,
  - 이 부업 니즈를 **원더 보험 부업**으로 어떻게 연결할지 구체적으로 제안합니다.
  - "시간·장소 제약이 큰 시급 알바"와 "리스크·고정비 없는 보험 부업"의 차이,
  - 스마트폰만 있으면 설계부터 가입, 수수료 정산까지 가능한 구조,
  - 기존 부업 대비 장점(법적 안정성, 교육 지원, 장기적인 소득원 등)을 활용해 카피 방향을 제시합니다.
  - 특히 "돈이 나가는 달(세금/대출/등록금 등)에, 내 통장을 채워주는 보조 소득" 같은 프레이밍을 한 문장 안에 녹여주세요.

# 출력 예시 톤 (참고용)

예)
"검색량이 49,500건으로 평균 대비 3,987.5% 상승했습니다. 최근 경기 침체와 생활비·대출·세금 등 고정지출 부담이 커지면서, 당장 현금을 만들 수 있는 단기·일당 위주의 아르바이트를 찾는 수요가 급격히 늘어난 것으로 보입니다. 하지만 시급 알바는 몸값을 시간 단위로만 교환하기 때문에, 장기적인 소득 구조를 만들기 어렵다는 한계가 있습니다. 원더 보험 부업은 점포·재고·인건비 없이 스마트폰으로 설계하고, 가입 시 발생하는 수수료가 그대로 내 소득이 되는 구조라 '지출이 몰리는 달마다 나를 지켜주는 보조 소득' 포지셔닝이 가능합니다."
`
}

/**
 * ────────────────────────────────────────────────
 * unknown 키워드용 프롬프트 (풍성한 3~5문장)
 * ────────────────────────────────────────────────
 */
function buildGenericPrompt(p: any) {
  return `
당신은 원더(Wonder)의 **통합 마케팅 전략 컨설턴트**입니다.

${WONDER_BASE}

아래는 해당 키워드의 실제 검색 데이터입니다.

- 키워드: ${p.keyword}
- 시점: ${p.year}년 ${p.month}월
- 검색량: ${p.volume.toLocaleString()}건
- 평균 대비: ${p.growth > 0 ? '+' : ''}${p.growth.toFixed(1)}%
- 전월 대비: ${p.monthOverMonth}%

최근 6개월 추이:
${p.trendText || '데이터 없음'}

${
  p.webSearchResults
    ? `웹 검색 결과(이슈/뉴스/콘텐츠 흐름 요약):\n${p.webSearchResults}`
    : '웹 검색 결과는 제공되지 않았습니다.'
}

# 작성 지침 (unknown/혼합 키워드용)

- 답변은 **3~5문장**으로 작성합니다.
- **첫 문장**은 반드시 다음 형식으로 시작합니다:
  - "검색량이 ${p.volume.toLocaleString()}건으로 평균 대비 ${p.growth.toFixed(
    1,
  )}% ${p.growth >= 0 ? '상승' : '하락'}했습니다."
- 두 번째 문장에서는,
  - 이 키워드가 **보험 니즈에 더 가까운지**, **부업/추가 소득 니즈에 더 가까운지** 간단히 판별하고 이유를 설명합니다.
  - 예: "연금·세금·대출·실업 관련이면 부업/소득 니즈에 가깝다", "보장·위험·질병·여행·운전자라면 보험 니즈에 가깝다" 등.
- 나머지 1~3문장에서는,
  - 그렇게 판별한 방향(보험 or 부업)에 맞춰 원더의 USP를 활용한 마케팅 액션을 제안합니다.
  - 보험 방향이면: 보장 리모델링, 만기·갱신·라이프 이벤트와 연계한 상담·설계 소재를 제안.
  - 부업 방향이면: 지출·부채·세금·생활비 압박을 줄이는 보조 소득, 스마트폰 기반 부업, 리스크·고정비 없는 구조를 강조.
  - 타겟의 상황(직장인, 자영업자, 프리랜서, 30~40대 가장 등)이 자연스럽게 떠오르도록 한 문장에 녹여주세요.

# 출력 예시 톤 (참고용)

예)
"검색량이 12,300건으로 평균 대비 185% 상승했습니다. 키워드 성격상 직접적인 보험 상품보다는, 세금·소득·재무 구조에 대한 불안에서 출발한 부업 니즈에 조금 더 가깝게 보입니다. 특히 고정지출이 커지는 시기에 단기적인 알바나 소액 재테크보다, 안정적인 보조 소득원을 찾으려는 30~40대 직장인·자영업자 비중이 높을 가능성이 큽니다. 이들에게는 스마트폰으로 보험을 직접 설계하고, 가입 시 설계사가 아닌 본인이 수수료를 가져가는 원더 부업을 '세금 나가는 달마다 내 통장을 방어하는 두 번째 엔진'으로 포지셔닝하는 메시지가 유효합니다."
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content:
            '당신은 보험/부업 마케팅 전략을 만드는 전문가입니다. 검색 데이터와 경제·생활 맥락을 바탕으로, 짧지만 밀도 높은 3~5문장의 인사이트를 한국어로 작성합니다.',
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
