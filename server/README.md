# IDly NestJS API

## Local setup

```bash
cp .env.example .env
npm run build:server
npm run start:server
```

The API listens on `http://127.0.0.1:3001` by default.

## Upstage API key

Put the key in `.env`, not in any `VITE_*` frontend variable.

```env
UPSTAGE_API_KEY=up_xxxxxxxxx
UPSTAGE_ENABLE_LIVE_CALLS=false
```

`UPSTAGE_ENABLE_LIVE_CALLS` defaults to `false`. Keep it off during ordinary local development. When it is `false`, `/chat/analyze` uses local keyword-based analysis and does not call Upstage.

To intentionally call Upstage:

```env
UPSTAGE_ENABLE_LIVE_CALLS=true
UPSTAGE_API_KEY=up_xxxxxxxxx
```

## Endpoints

```txt
GET  /health
GET  /breach-types
GET  /providers?breachTypeId=card_payment_leak
GET  /actions?breachTypeId=card_payment_leak
GET  /me/actions?userId=local-demo
POST /actions/:actionId/status
POST /chat/analyze
```

### Analyze text

```bash
curl -s -X POST http://127.0.0.1:3001/chat/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"신한카드에서 카드정보 유출 문자를 받았는데 뭐부터 해야돼?"}'
```

### Analyze image

```bash
curl -s -X POST http://127.0.0.1:3001/chat/analyze \
  -F 'text=이 캡처 봐줘' \
  -F 'consentToExternalAI=true' \
  -F 'image=@./sample.png'
```

Image upload requires `consentToExternalAI=true`. The server uses memory storage and does not write the original image to disk.

### Save action status

```bash
curl -s -X POST http://127.0.0.1:3001/actions/act_card_shinhan_freeze/status \
  -H 'Content-Type: application/json' \
  -d '{"userId":"local-demo","status":"done"}'
```

