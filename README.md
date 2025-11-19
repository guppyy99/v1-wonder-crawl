# TEAZEN 검색 트렌드 캘린더

2년간 키워드 발행량을 토대로, **키워드 평균 대비 상승폭**이 가장 큰 키워드를 알려주는 대시보드

## 주요 기능

### 📅 월 선택 지면
- 연도와 월을 선택하여 해당 시점의 키워드 트렌드 확인
- 2021년 11월부터 2025년 10월까지의 데이터 지원

### 🤖 AI 인사이트 지면
- 선택된 월에 대한 AI 기반 인사이트 자동 생성
- GPT API를 통해 상승폭이 가장 큰 키워드 분석
- 검색량 급증 원인 및 트렌드 분석 제공

### 🏷️ 키워드 지면
- 선택된 월에 변동폭이 큰 키워드를 순서대로 나열
- 스크롤을 통해 더 많은 키워드 확인 가능
- 키워드별 고유한 색상 팔레트 적용
- 각 키워드별 상승률과 검색량 표시
- 다중 선택 가능

### 📊 검색량 추이 차트 지면
- 선택한 키워드의 검색량 추이를 시각화
- 6개월, 1년, 2년 단위로 조회 기간 선택 가능
- 차트에 마우스 오버 시 상세 정보 표시:
  - 해당 월의 정확한 검색량
  - 남성/여성 비율 (%)
  - 연령대별 추이
- 키워드별 차별화된 색상으로 구분

## 기술 스택

- **프레임워크**: Next.js 16 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **차트**: Recharts
- **AI**: OpenAI GPT-5 (최신 Reasoning 모델)
- **배포**: Vercel

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd v3-teazen-calender
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 필수: OpenAI API 키
OPENAI_API_KEY=your-openai-api-key-here

# 선택: Serper API 키 (실제 웹 검색 기반 인사이트)
SERPER_API_KEY=your-serper-api-key-here
```

#### API 키 발급 방법

**OpenAI API 키** (필수):
- [OpenAI 플랫폼](https://platform.openai.com/)에서 발급
- Settings > API Keys > Create new secret key

**Serper API 키** (선택):
- [Serper](https://serper.dev)에서 발급 (무료: 2,500 검색/월)
- 실제 Google 검색 결과를 기반으로 더 정확한 AI 인사이트 생성
- 최신 뉴스/이슈를 반영한 분석 제공

자세한 설정 방법은 [SERPER_SETUP.md](./SERPER_SETUP.md)를 참조하세요.

### 4. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 데이터 구조

CSV 파일(`date-set-calendar.csv`)의 헤더 구조:

```
키워드, 남성(%), 여성(%), 연령대별 특성, 12세 이하(%), 13~19세(%), 20~24세(%), 25~29세(%), 30~39세(%), 40~49세(%), 50세 이상(%), 2021-11, 2021-12, ..., 2025-10
```

- **키워드**: 검색어
- **성별 비율**: 남성/여성 검색 비율
- **연령대별 데이터**: 7개 연령대별 검색 비율
- **월별 검색량**: 2021년 11월부터 현재까지의 월별 검색량 데이터

## 프로젝트 구조

```
v3-teazen-calender/
├── app/
│   ├── api/
│   │   └── ai-insight/      # GPT API 엔드포인트
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 루트 레이아웃
│   └── page.tsx              # 메인 페이지
├── components/
│   ├── ai-insight.tsx        # AI 인사이트 컴포넌트
│   ├── calendar-header.tsx   # 월 선택 컴포넌트
│   ├── keyword-selector.tsx  # 키워드 선택 컴포넌트
│   ├── trend-chart.tsx       # 차트 컴포넌트
│   └── ui/                   # shadcn/ui 컴포넌트
├── lib/
│   ├── csv-parser.ts         # CSV 파싱 로직
│   ├── data.ts               # 데이터 관리
│   ├── types.ts              # TypeScript 타입 정의
│   └── utils.ts              # 유틸리티 함수
├── date-set-calendar.csv     # 키워드 데이터
└── package.json
```

## 주요 기능 상세

### 평균 대비 상승폭 계산

각 키워드의 전체 기간 평균 검색량을 계산하고, 선택된 월의 검색량과 비교하여 상승폭을 산출합니다.

```typescript
상승폭(%) = ((현재 월 검색량 - 평균 검색량) / 평균 검색량) × 100
```

### 색상 팔레트

키워드별로 고유한 색상이 자동으로 할당되며, 키워드 버튼과 차트에서 동일한 색상을 사용합니다:

- 보라: #8B7FD8
- 초록: #7ED957
- 주황: #FF8C42
- 청록: #2AC1BC
- 노랑: #FFB84D
- 빨강: #FF6B6B
- 라벤더: #A78BFA
- 민트: #34D399
- 핑크: #F472B6
- 골드: #FBBF24

## 배포

### Vercel로 배포

1. Vercel 계정 생성 및 로그인
2. 프로젝트 import
3. 환경 변수 설정 (`OPENAI_API_KEY`)
4. Deploy 버튼 클릭

## 폰트

프로젝트 전체에 **Pretendard** 폰트가 적용되어 있습니다.

## 개발자

FINFLOW DGM DYNK

