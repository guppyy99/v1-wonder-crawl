# 프로젝트 설정 가이드

## 1. 초기 설정

### 의존성 설치

```bash
pnpm install
```

### 환경 변수 설정

1. 프로젝트 루트에 `.env.local` 파일 생성:

```bash
cp .env.example .env.local
```

2. `.env.local` 파일을 열어 OpenAI API 키 입력:

```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

> **OpenAI API 키 발급 방법:**
> 1. [OpenAI Platform](https://platform.openai.com/) 접속
> 2. 로그인 후 Settings > API Keys로 이동
> 3. "Create new secret key" 클릭
> 4. 생성된 키를 복사하여 `.env.local`에 붙여넣기

## 2. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 http://localhost:3000 열기

## 3. 데이터 확인

프로젝트는 `date-set-calendar.csv` 파일에서 데이터를 불러옵니다.

### CSV 파일 형식

- 첫 번째 행: 헤더
- 각 행: 키워드 정보 및 월별 검색량 데이터
- 2021년 11월부터 2025년 10월까지의 데이터 포함

### 데이터 업데이트 방법

1. `date-set-calendar.csv` 파일을 편집
2. 헤더 구조 유지
3. 새로운 키워드 추가 또는 기존 데이터 수정
4. 페이지 새로고침 시 자동으로 반영

## 4. 프로덕션 빌드

```bash
pnpm build
pnpm start
```

## 5. Vercel 배포

### 5.1 Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel
```

### 5.2 Vercel 웹 대시보드 사용

1. [Vercel](https://vercel.com)에 로그인
2. "New Project" 클릭
3. Git 저장소 연결
4. 환경 변수 설정:
   - Key: `OPENAI_API_KEY`
   - Value: OpenAI API 키
5. "Deploy" 클릭

## 6. 문제 해결

### CSV 파일이 로드되지 않는 경우

- 브라우저 콘솔에서 에러 확인
- CSV 파일이 `/public` 폴더가 아닌 프로젝트 루트에 있는지 확인
- CSV 파일 인코딩이 UTF-8인지 확인

### AI 인사이트가 생성되지 않는 경우

- `.env.local` 파일에 `OPENAI_API_KEY`가 정확히 설정되어 있는지 확인
- OpenAI API 키가 유효한지 확인
- API 사용량 한도를 초과하지 않았는지 확인
- 브라우저 콘솔 및 터미널에서 에러 메시지 확인

### 차트가 표시되지 않는 경우

- 키워드를 선택했는지 확인
- 선택한 월에 해당 키워드의 데이터가 있는지 확인
- 브라우저의 개발자 도구에서 네트워크 탭 확인

### 빌드 에러 발생 시

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
pnpm install

# 캐시 클리어
rm -rf .next
pnpm build
```

## 7. 개발 팁

### 데이터 디버깅

브라우저 콘솔에서 데이터 확인:

```javascript
// 메인 페이지에서
console.log(keywordData)
```

### 새로운 키워드 색상 추가

`components/keyword-selector.tsx`의 `COLOR_PALETTE` 배열에 색상 추가:

```typescript
const COLOR_PALETTE = [
  // 기존 색상들...
  { bg: "bg-[#YOUR_COLOR]", hover: "hover:bg-[#YOUR_HOVER_COLOR]", chart: "#YOUR_COLOR" },
]
```

### API 응답 속도 개선

GPT API 호출 시간이 길다면:

1. `app/api/ai-insight/route.ts`에서 `max_tokens` 값 조정
2. 더 빠른 모델(`gpt-3.5-turbo`) 사용 고려

## 8. 성능 최적화

### 이미지 최적화

Next.js의 Image 컴포넌트 사용:

```typescript
import Image from 'next/image'
```

### 코드 스플리팅

대용량 컴포넌트는 동적 import 사용:

```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

## 9. 모니터링

### Vercel Analytics

Vercel에 배포하면 자동으로 Analytics가 활성화됩니다.

### 에러 추적

프로덕션 환경에서는 Sentry 등의 에러 추적 도구 사용 권장

## 10. 백업

### 데이터 백업

```bash
# CSV 파일 백업
cp date-set-calendar.csv date-set-calendar.backup.csv
```

### Git으로 버전 관리

```bash
git add .
git commit -m "데이터 업데이트: YYYY-MM-DD"
git push
```

