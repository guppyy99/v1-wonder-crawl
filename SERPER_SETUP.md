# Serper API 설정 가이드

## 🔍 Serper API란?

Serper API는 Google 검색 결과를 프로그래밍 방식으로 가져올 수 있는 서비스입니다.

**이 프로젝트에서의 역할**:
- AI 인사이트 생성 시 **실제 웹 검색 수행**
- 키워드 관련 **최신 뉴스/이슈** 자동 수집
- GPT-5가 실제 정보를 기반으로 분석

## 🎯 왜 필요한가?

### Serper API 없이 (기본)
```
검색량이 5,367,700건으로 평균 대비 461% 상승했습니다.
여름 시즌의 영향으로 분석됩니다.
```

### Serper API 사용 시 (실제 검색 기반)
```
검색량이 5,367,700건으로 평균 대비 461% 상승했습니다.
7월 14일 도미노피자 '반값 세일' 이벤트와 배달앱 쿠폰 중복 사용이
SNS에서 화제가 되며 검색 폭증이 발생했습니다.
8월 여름 휴가 시즌에 맞춘 패밀리 세트 프로모션과 
인스타그램 마케팅 강화를 권장합니다.
```

## 📋 설정 방법

### 1. Serper API 키 발급

1. **https://serper.dev** 접속
2. **Sign Up** (Google 계정으로 간편 가입)
3. **Dashboard** 에서 API Key 복사

**무료 플랜**:
- ✅ 2,500 검색/월
- ✅ 신용카드 불필요
- ✅ 충분한 사용량

### 2. 환경 변수 설정

#### 로컬 개발 (.env.local)

```bash
OPENAI_API_KEY=sk-proj-xxxxx
SERPER_API_KEY=your-serper-api-key-here
```

#### Vercel 배포

1. Vercel 프로젝트 > **Settings**
2. **Environment Variables**
3. 두 개의 변수 추가:
   - `OPENAI_API_KEY`: OpenAI 키
   - `SERPER_API_KEY`: Serper 키
4. **Redeploy**

### 3. 확인

```bash
# 개발 서버 재시작
npm run dev

# 브라우저에서 http://localhost:3000
# 월 선택 → AI 인사이트 확인
# 더 구체적이고 실제 정보 기반 인사이트 생성됨
```

## 🆓 무료 사용량

| 플랜 | 검색 횟수/월 | 비용 |
|------|-------------|------|
| Free | 2,500 | $0 |
| Starter | 10,000 | $50 |
| Pro | 100,000 | $200 |

**우리 사용량 예상**:
- 월 선택 1회 = 검색 1회
- 월 30일 × 월 변경 10회 = 300회/월
- **Free 플랜으로 충분!** ✅

## 🔐 보안

- API 키는 서버에서만 사용
- 클라이언트에 노출되지 않음
- `.env.local`은 Git에서 제외됨

## ❓ 선택사항

Serper API는 **선택사항**입니다:

**Serper 없이**: 
- 기본 AI 인사이트 작동
- CSV 데이터만 활용

**Serper 사용 시**:
- 실제 웹 검색 결과 활용
- 더 정확하고 구체적인 분석
- 최신 이슈/뉴스 반영

## 🚀 대안

Serper 대신 사용할 수 있는 다른 검색 API:

1. **SerpAPI** (https://serpapi.com)
   - 무료: 100 검색/월
   - 더 다양한 기능

2. **Brave Search API** (https://brave.com/search/api/)
   - 무료: 2,000 검색/월
   - 프라이버시 중심

3. **Tavily API** (https://tavily.com)
   - AI 에이전트 특화
   - 검색 결과 자동 요약

## 📝 요약

1. **필수**: `OPENAI_API_KEY`
2. **선택**: `SERPER_API_KEY` (더 나은 인사이트)
3. 무료 플랜으로 충분
4. 3분이면 설정 완료

