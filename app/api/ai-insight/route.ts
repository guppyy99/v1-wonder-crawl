import { NextResponse } from 'next/server'

/**
 * Serper API를 통해 실제 웹 검색 결과를 가져옵니다
 */
async function searchWeb(keyword: string, year: number, month: number): Promise<string> {
  const serperApiKey = process.env.SERPER_API_KEY
  
  if (!serperApiKey) {
    return '' // Serper API 키가 없으면 검색 건너뛰기
  }
  
  try {
    // 검색 쿼리: "키워드 2025년 7월" 형식
    const searchQuery = `${keyword} ${year}년 ${month}월 트렌드 이슈`
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: 'kr', // 한국 검색 결과
        hl: 'ko', // 한국어
        num: 5,   // 상위 5개 결과
      }),
    })
    
    if (!response.ok) {
      console.error('Serper API 오류:', response.statusText)
      return ''
    }
    
    const data = await response.json()
    
    // 검색 결과 요약
    const searchResults = data.organic?.slice(0, 5).map((item: any, idx: number) => 
      `${idx + 1}. ${item.title}\n${item.snippet || ''}`
    ).join('\n\n') || ''
    
    return searchResults
  } catch (error) {
    console.error('웹 검색 중 오류:', error)
    return ''
  }
}

export async function POST(request: Request) {
  try {
    const { keyword, growth, volume, year, month, monthlyData, previousMonths } = await request.json()
    
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }
    
    // 실제 웹 검색 수행
    const webSearchResults = await searchWeb(keyword, year, month)
    
    // 월별 검색량 추이 문자열 생성
    const trendText = previousMonths?.map((m: any) => `${m.month}: ${m.volume.toLocaleString()}건`).join(', ') || ''
    
    // 전월 대비 변화율 계산
    const prevMonthVolume = previousMonths?.[previousMonths.length - 2]?.volume || 0
    const monthOverMonth = prevMonthVolume > 0 
      ? ((volume - prevMonthVolume) / prevMonthVolume * 100).toFixed(1)
      : '0'
    
    const prompt = `당신은 마케팅 전략 컨설턴트입니다. 기업이 활용할 수 있는 실질적인 인사이트를 제공하세요.

# 실제 검색 데이터 분석

**키워드**: "${keyword}"
**시점**: ${year}년 ${month}월
**검색량**: ${volume.toLocaleString()}건
**평균 대비**: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}%
**전월 대비**: ${monthOverMonth}%

**최근 6개월 추이**:
${trendText}

${webSearchResults ? `\n# 실제 웹 검색 결과 (네이버/구글 최신 정보)\n\n${webSearchResults}\n` : ''}

# 분석 요구사항

위의 **실제 검색 데이터**${webSearchResults ? '와 **웹 검색 결과**' : ''}를 종합하여 **보험/부업 관리 관점**에서 다음을 **2-3문장**으로 작성:

1. **키워드 트렌드와 원더와의 연관성**
   - 키워드에 왜 이런 변화가 발생했는지
   - ${webSearchResults ? '웹 검색에서 발견한 실제 이슈/이벤트' : '보험, 지출 관점, 사회적 이벤트'}
   
2. **원더 마케팅 액션**
   - 이 키워드 트렌드를 활용한 원더 커뮤니케이션 전략
   - 타겟 고객층 (연령대, 관심사)
   - 메시징 방향 (지출이 나가는 순간, 소득 관점, 상품에 대한 니즈 + 수수료도 내꺼 등)
   - 광고 채널 및 시기 (데이터의 근거한)
   
3. **다음 달 예상 및 대응**
   - 트렌드 지속 여부
   - 선제적 마케팅 준비사항

# 답변 형식 (보험/부업 커뮤니케이션 중심)

검색량이 ${volume.toLocaleString()}건으로 평균 대비 ${Math.abs(Math.round(growth))}% 상승했습니다. [검색어 기반 키워드 상승 원인 분석 1문장]. [원더와 연결한 구체적 마케팅 액션 1-2문장].

# 예시

{부가세}검색량이 5,367,700건으로 평균 대비 461% 상승했습니다. 해당 시기에 부가세 납부가 있어 상승된 것으로 보입니다. 이는, 해당 시즌은 돈이 나가는 시즌임을 의미하며, 해당 시즌에는 '세금 지출'을 소구한 메시지를 담는 것이 효과적입니다. '부가세 신고 시기마다 지출 압박을 줄일 수 있는 보조 소득 마련', '세금 나가는 달 대비, 안정적인 부업 수입 확보'와 같은 메시지를 제안드립니다.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [
          {
            role: 'system',
            content: `당신은 원더(Wonder) 서비스 마케팅 전략 컨설턴트입니다.

# 원더 서비스 특성

**핵심 USP**:
1. 핸드폰으로 간편하게 보험을 설계하고, 가입하면 수수료도 내가 받을 수 있는 플랫폼
2. 본래 보험이란 설계사를 통해 가입해, 설계사가 내 보험 가입 수수료를 받아가는 구조지만, 원더는 내가 설계부터 가입, 그리고 수수료도 받아갈 수 있음
3. 자격증→설계→가입→정산까지 원스톱 간편 프로세스
4. 보험 설계, 가입에 필요한 보험 자격증 교육 자료 무료 제공
5. 리스크·고정비 없는 부담 없이 할 수 있는 부업
6. 설계에 자신이 없어도 전문 매니저의 1:1 설계·운영 지원

**타겟 고객**:
- 추가 소득이 필요한 주부, 직장인
- 보험 만기일이 다가오는 40대
- 부업, N잡에 관심이 많은 타겟군

# 역할

검색 키워드 트렌드를 분석하여:
1. 해당 키워드의 추이가 내려가거나, 올라간 이유가 원더 서비스와 어떻게 연결되는지
2. 원더의 주요 USP와의 상관관계
3. 원더 마케팅에 활용할 수 있는 구체적 액션
4. 타겟 고객 공략 방안

# 답변 스타일

- 보험 시즈널 특성 혹은 지출이 많아지는 특성 관점에서 분석
- 원더 서비스 특성과 연결된 마케팅 액션 제시
- 구체적 숫자 기반, 2-3문장
- 해당 시점에 실행 가능한 전략 중심으로 작성`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        reasoning_effort: 'medium',
        verbosity: 'medium',
        max_tokens: 600,
      }),
    })
    
    if (!response.ok) {
      // OpenAI API의 실제 에러 응답 읽기
      let errorMessage = `OpenAI API 오류: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        console.error('❌ OpenAI API 에러 응답:', errorData)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        if (errorData.error?.code) {
          errorMessage = `[${errorData.error.code}] ${errorMessage}`
        }
      } catch (e) {
        const errorText = await response.text()
        console.error('❌ OpenAI API 에러 텍스트:', errorText)
        errorMessage = errorText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    console.log('✅ OpenAI 응답 성공:', data)
    
    const insight = data.choices[0]?.message?.content || '인사이트를 생성할 수 없습니다.'
    
    return NextResponse.json({ insight })
  } catch (error: any) {
    console.error('❌ AI 인사이트 생성 중 오류:', error)
    console.error('에러 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // 로컬 개발 환경에서 더 상세한 에러 정보 제공
    const isDevelopment = process.env.NODE_ENV === 'development'
    const errorDetails = isDevelopment ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : undefined
    
    return NextResponse.json(
      { 
        error: `AI 인사이트 생성 실패: ${error.message || '알 수 없는 오류'}`,
        ...(errorDetails && { details: errorDetails })
      },
      { status: 500 }
    )
  }
}

