# IDly — 개인정보 유출·해킹 대응 AI 서비스

토스 앱 내에서 실행되는 Apps in Toss 미니앱이에요.

유출 문자·알림 캡처를 올리거나 상황을 텍스트로 설명하면, AI가 유출 유형을 분석해 지금 바로 실행할 수 있는 대응카드를 만들어줘요. 대응 항목의 완료 여부를 추적하는 현황 뷰도 제공해요.

## 주요 기능

- **유출 상황 분석**: 이미지(OCR) 또는 텍스트 입력 → 유출 유형 자동 감지
- **대응카드 생성**: 전화 연결·링크 복사 등 즉시 실행 가능한 액션 제공
- **대응 현황 추적**: 항목별 완료 여부 기록 및 조회
- **안전 위협 감지**: 스토킹·협박 등 감지 시 전문 상담 기관 연결

## 기술 스택

- **Frontend**: React + Vite + TDS Mobile (토스 디자인 시스템)
- **Backend**: NestJS
- **AI**: Upstage Document Parse (이미지 OCR) + Solar Pro3 (유출 분석)

## 시작하기

`.env.example`을 참고해 `.env` 파일을 만든 후 실행하세요.

```bash
npm install
npm run dev
```

서버를 별도로 실행해야 해요.

```bash
npm run server
```

## 배포

```bash
npm run build
npm run deploy
```

앱인토스 배포 API 키는 [앱인토스 콘솔](https://apps-in-toss.toss.im/) > 워크스페이스 > API 키 > 콘솔 API 키에서 발급받을 수 있어요.

## 참고 링크

- [앱인토스 콘솔](https://apps-in-toss.toss.im/)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)
