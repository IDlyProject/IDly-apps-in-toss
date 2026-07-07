import type { ActionItem, BreachType, Provider, SpecialistReferral } from "./types.js";

export const breachTypes: BreachType[] = [
  {
    id: "card_payment_leak",
    nameKr: "카드/계좌 결제정보 유출",
    goldenTime: "immediate",
    triggerKeywords: ["카드", "계좌", "결제정보", "이상거래", "부정사용", "지급정지", "분실신고"],
    requiresProviderSelection: true,
  },
  {
    id: "telecom_personal_info_leak",
    nameKr: "통신사 개인정보 유출",
    goldenTime: "hours",
    triggerKeywords: ["통신사", "유심", "usim", "명의도용", "가입자식별번호", "skt", "kt", "lg유플러스"],
    requiresProviderSelection: true,
  },
  {
    id: "account_password_leak",
    nameKr: "이메일/계정 비밀번호 유출",
    goldenTime: "flexible",
    triggerKeywords: ["비밀번호", "로그인", "계정", "이메일", "2단계", "보안알림", "네이버", "구글", "카카오"],
    requiresProviderSelection: true,
  },
  {
    id: "resident_id_leak",
    nameKr: "주민번호/신분증 유출",
    goldenTime: "registration",
    triggerKeywords: ["주민등록번호", "주민번호", "신분증", "개인정보", "사본", "노출"],
    requiresProviderSelection: false,
  },
  {
    id: "smishing_phishing",
    nameKr: "스미싱/피싱 의심 문자·전화",
    goldenTime: "immediate",
    triggerKeywords: ["스미싱", "피싱", "택배", "환급금", "정부지원금", "링크", "url", "발신번호", "클릭"],
    requiresProviderSelection: false,
  },
  {
    id: "breach_alert_service",
    nameKr: "유출확인 서비스 알림",
    goldenTime: "flexible",
    triggerKeywords: ["털린 내 정보", "다크웹", "유출확인", "정보 발견", "e프라이버시", "개인정보포털"],
    requiresProviderSelection: false,
  },
  {
    id: "id_card_loss",
    nameKr: "신분증 분실·유출",
    goldenTime: "immediate",
    triggerKeywords: ["주민등록증", "운전면허증", "신분증 사진", "신분증 분실", "면허증"],
    requiresProviderSelection: false,
  },
  {
    id: "credit_inquiry_block",
    nameKr: "신용정보 조회차단",
    goldenTime: "immediate",
    triggerKeywords: ["신용조회", "명의도용 대출", "대출", "nice", "kcb", "코리아크레딧뷰로"],
    requiresProviderSelection: false,
  },
  {
    id: "sns_messenger_takeover",
    nameKr: "SNS/메신저 계정 탈취",
    goldenTime: "immediate",
    triggerKeywords: ["카카오톡", "카톡", "인스타그램", "페이스북", "해킹", "비정상 로그인", "메신저", "송금요청"],
    requiresProviderSelection: true,
  },
  {
    id: "crypto_exchange_leak",
    nameKr: "가상자산 거래소 계정 유출/해킹",
    goldenTime: "immediate",
    triggerKeywords: ["업비트", "빗썸", "코인원", "거래소", "출금", "api키", "가상자산", "코인"],
    requiresProviderSelection: true,
  },
];

export const providers: Provider[] = [
  { id: "shinhan_card", breachTypeId: "card_payment_leak", name: "신한카드", aliases: ["신한카드", "shinhan"], category: "card" },
  { id: "kb_card", breachTypeId: "card_payment_leak", name: "KB국민카드", aliases: ["국민카드", "kb카드", "kb국민카드"], category: "card" },
  { id: "samsung_card", breachTypeId: "card_payment_leak", name: "삼성카드", aliases: ["삼성카드"], category: "card" },
  { id: "hyundai_card", breachTypeId: "card_payment_leak", name: "현대카드", aliases: ["현대카드"], category: "card" },
  { id: "lotte_card", breachTypeId: "card_payment_leak", name: "롯데카드", aliases: ["롯데카드"], category: "card" },
  { id: "woori_card", breachTypeId: "card_payment_leak", name: "우리카드", aliases: ["우리카드"], category: "card" },
  { id: "hana_card", breachTypeId: "card_payment_leak", name: "하나카드", aliases: ["하나카드"], category: "card" },
  { id: "bc_card", breachTypeId: "card_payment_leak", name: "비씨카드", aliases: ["비씨카드", "bc카드"], category: "card" },
  { id: "crefia", breachTypeId: "card_payment_leak", name: "여신금융협회", aliases: ["여신금융협회", "crefia"], category: "government" },

  { id: "skt", breachTypeId: "telecom_personal_info_leak", name: "SKT", aliases: ["skt", "sk텔레콤", "t world", "티월드"], category: "telecom" },
  { id: "kt", breachTypeId: "telecom_personal_info_leak", name: "KT", aliases: ["kt", "케이티"], category: "telecom" },
  { id: "lguplus", breachTypeId: "telecom_personal_info_leak", name: "LG유플러스", aliases: ["lg유플러스", "u+", "유플러스"], category: "telecom" },
  { id: "msafer", breachTypeId: "telecom_personal_info_leak", name: "엠세이퍼", aliases: ["msafer", "엠세이퍼"], category: "government" },

  { id: "privacy_portal", breachTypeId: "resident_id_leak", name: "개인정보 포털", aliases: ["privacy.go.kr", "개인정보포털"], category: "government" },
  { id: "kisa", breachTypeId: "smishing_phishing", name: "KISA 118", aliases: ["kisa", "118"], category: "government" },
  { id: "police_ecrm", breachTypeId: "smishing_phishing", name: "경찰청 사이버수사국", aliases: ["경찰", "ecrm"], category: "government" },
  { id: "nice", breachTypeId: "credit_inquiry_block", name: "NICE평가정보", aliases: ["nice", "나이스"], category: "credit_bureau" },
  { id: "kcb", breachTypeId: "credit_inquiry_block", name: "KCB", aliases: ["kcb", "코리아크레딧뷰로"], category: "credit_bureau" },
  { id: "upbit", breachTypeId: "crypto_exchange_leak", name: "업비트", aliases: ["업비트", "upbit"], category: "exchange" },
  { id: "bithumb", breachTypeId: "crypto_exchange_leak", name: "빗썸", aliases: ["빗썸", "bithumb"], category: "exchange" },

  // 이메일/계정 비밀번호 유출
  { id: "naver_account", breachTypeId: "account_password_leak", name: "네이버", aliases: ["네이버", "naver", "네이버 메일"], category: "platform" },
  { id: "kakao_account", breachTypeId: "account_password_leak", name: "카카오(다음)", aliases: ["카카오", "kakao", "다음", "daum"], category: "platform" },
  { id: "google_account", breachTypeId: "account_password_leak", name: "구글", aliases: ["구글", "google", "gmail", "지메일"], category: "platform" },
  { id: "apple_account", breachTypeId: "account_password_leak", name: "애플", aliases: ["애플", "apple", "icloud", "아이클라우드"], category: "platform" },

  // SNS/메신저 계정 탈취
  { id: "kakaotalk", breachTypeId: "sns_messenger_takeover", name: "카카오톡", aliases: ["카카오톡", "카톡", "kakaotalk"], category: "platform" },
  { id: "instagram", breachTypeId: "sns_messenger_takeover", name: "인스타그램", aliases: ["인스타그램", "인스타", "instagram"], category: "platform" },
  { id: "facebook", breachTypeId: "sns_messenger_takeover", name: "페이스북", aliases: ["페이스북", "facebook", "fb"], category: "platform" },
  { id: "twitter_x", breachTypeId: "sns_messenger_takeover", name: "트위터/X", aliases: ["트위터", "x", "twitter"], category: "platform" },
];

export const actionItems: ActionItem[] = [
  { id: "act_card_shinhan_freeze", breachTypeId: "card_payment_leak", providerId: "shinhan_card", priority: 1, title: "신한카드 분실·도난 신고", description: "부정 사용 전 즉시 정지가 핵심이에요.", actionType: "tel", value: "1544-7200" },
  { id: "act_card_kb_freeze", breachTypeId: "card_payment_leak", providerId: "kb_card", priority: 1, title: "KB국민카드 분실·도난 신고", description: "카드를 먼저 정지해 추가 피해를 막으세요.", actionType: "tel", value: "1588-1688" },
  { id: "act_card_samsung_freeze", breachTypeId: "card_payment_leak", providerId: "samsung_card", priority: 1, title: "삼성카드 분실·도난 신고", description: "부정 사용 전 즉시 정지가 핵심이에요.", actionType: "tel", value: "1588-8700" },
  { id: "act_card_hyundai_freeze", breachTypeId: "card_payment_leak", providerId: "hyundai_card", priority: 1, title: "현대카드 분실·도난 신고", description: "카드를 먼저 정지해 추가 피해를 막으세요.", actionType: "tel", value: "1577-6000" },
  { id: "act_card_crefia_bulk", breachTypeId: "card_payment_leak", providerId: "crefia", priority: 2, title: "여러 카드 동시 분실 시 통합 신고", description: "카드 한 곳에 신고해도 다른 회사에 전파될 수 있어요.", actionType: "copy", value: "https://customer.crefia.or.kr" },

  { id: "act_telecom_msafer_block", breachTypeId: "telecom_personal_info_leak", providerId: "msafer", priority: 1, title: "명의도용 가입제한 신청", description: "새 휴대폰 회선이 내 명의로 개통되는 걸 먼저 막으세요.", actionType: "copy", value: "https://www.msafer.or.kr" },
  { id: "act_telecom_skt_call", breachTypeId: "telecom_personal_info_leak", providerId: "skt", priority: 2, title: "SKT 고객센터 연결", description: "유심보호서비스와 명의도용 가능성을 문의하세요.", actionType: "tel", value: "1599-0011" },
  { id: "act_telecom_kt_call", breachTypeId: "telecom_personal_info_leak", providerId: "kt", priority: 2, title: "KT 고객센터 연결", description: "유심보호서비스와 명의도용 가능성을 문의하세요.", actionType: "tel", value: "1588-0010" },
  { id: "act_telecom_lgu_call", breachTypeId: "telecom_personal_info_leak", providerId: "lguplus", priority: 2, title: "LG유플러스 고객센터 연결", description: "유심보호서비스와 명의도용 가능성을 문의하세요.", actionType: "tel", value: "1544-0010" },

  // 네이버 계정 복구
  { id: "act_naver_pw_reset", breachTypeId: "account_password_leak", providerId: "naver_account", priority: 1, title: "네이버 비밀번호 재설정", description: "비밀번호를 모르거나 변경된 경우 본인 인증으로 재설정하세요.", actionType: "copy", value: "https://nid.naver.com/user2/help/myInfoHelpPage" },
  { id: "act_naver_sessions", breachTypeId: "account_password_leak", providerId: "naver_account", priority: 2, title: "다른 기기 로그인 기록 확인·차단", description: "내 모르게 로그인된 기기를 확인하고 즉시 로그아웃하세요.", actionType: "copy", value: "https://nid.naver.com/user2/help/loginHistory" },
  { id: "act_naver_2fa", breachTypeId: "account_password_leak", providerId: "naver_account", priority: 3, title: "2단계 인증 설정", description: "OTP 앱을 등록해두면 비밀번호 탈취만으로는 로그인이 불가해요.", actionType: "copy", value: "https://nid.naver.com/user2/help/security" },

  // 카카오 계정 복구
  { id: "act_kakao_pw_reset", breachTypeId: "account_password_leak", providerId: "kakao_account", priority: 1, title: "카카오 비밀번호 재설정", description: "이메일 또는 전화번호 인증으로 비밀번호를 바꾸세요.", actionType: "copy", value: "https://accounts.kakao.com/login/find_account" },
  { id: "act_kakao_sessions", breachTypeId: "account_password_leak", providerId: "kakao_account", priority: 2, title: "연결된 기기 전체 로그아웃", description: "카카오계정 보안 설정에서 모든 기기 연결을 해제하세요.", actionType: "copy", value: "https://accounts.kakao.com/weblogin/account_info" },
  { id: "act_kakao_2fa", breachTypeId: "account_password_leak", providerId: "kakao_account", priority: 3, title: "카카오 2단계 인증 설정", description: "보안 설정에서 추가 인증 수단을 등록해 두세요.", actionType: "copy", value: "https://accounts.kakao.com/weblogin/account_info" },

  // 구글 계정 복구
  { id: "act_google_recovery", breachTypeId: "account_password_leak", providerId: "google_account", priority: 1, title: "구글 계정 복구", description: "이메일·전화번호가 변경됐어도 본인 확인으로 복구할 수 있어요.", actionType: "copy", value: "https://accounts.google.com/signin/recovery" },
  { id: "act_google_sessions", breachTypeId: "account_password_leak", providerId: "google_account", priority: 2, title: "다른 기기 로그인 전체 종료", description: "보안 점검에서 낯선 기기를 찾아 로그아웃하세요.", actionType: "copy", value: "https://myaccount.google.com/security-checkup" },
  { id: "act_google_2fa", breachTypeId: "account_password_leak", providerId: "google_account", priority: 3, title: "2단계 인증 설정", description: "Google Authenticator나 패스키를 등록하면 비밀번호 유출에도 안전해요.", actionType: "copy", value: "https://myaccount.google.com/signinoptions/two-step-verification" },

  // 애플 계정 복구
  { id: "act_apple_recovery", breachTypeId: "account_password_leak", providerId: "apple_account", priority: 1, title: "Apple ID 비밀번호 재설정", description: "iforgot.apple.com에서 본인 인증으로 바꾸세요.", actionType: "copy", value: "https://iforgot.apple.com" },
  { id: "act_apple_sessions", breachTypeId: "account_password_leak", providerId: "apple_account", priority: 2, title: "연결된 기기 확인·제거", description: "Apple ID 설정에서 낯선 기기를 제거하세요.", actionType: "copy", value: "https://appleid.apple.com" },
  { id: "act_apple_2fa", breachTypeId: "account_password_leak", providerId: "apple_account", priority: 3, title: "2단계 인증 확인", description: "Apple ID는 기본적으로 2단계 인증이 켜져 있는지 확인하세요.", actionType: "copy", value: "https://appleid.apple.com" },

  { id: "act_resident_privacy_portal", breachTypeId: "resident_id_leak", providerId: "privacy_portal", priority: 1, title: "개인정보 포털에서 노출 신고", description: "주민번호·신분증 노출은 공식 신고부터 시작하세요.", actionType: "copy", value: "https://www.privacy.go.kr" },
  { id: "act_resident_fss_register", breachTypeId: "resident_id_leak", providerId: null, priority: 2, title: "금감원 개인정보노출자 등록", description: "금융권 명의도용 사고 예방에 필요해요.", actionType: "copy", value: "https://pd.fss.or.kr" },
  { id: "act_resident_credit_block", breachTypeId: "resident_id_leak", providerId: null, priority: 3, title: "신용정보 조회차단 같이 진행", description: "명의도용 대출 위험을 낮추는 핵심 조치예요.", actionType: "copy", value: "https://www.credit4u.or.kr" },

  { id: "act_smishing_kisa_118", breachTypeId: "smishing_phishing", providerId: "kisa", priority: 1, title: "KISA 118 상담 신고", description: "링크를 눌렀거나 피해가 의심되면 바로 상담하세요.", actionType: "tel", value: "118" },
  { id: "act_smishing_police_ecrm", breachTypeId: "smishing_phishing", providerId: "police_ecrm", priority: 2, title: "경찰청 사이버범죄 신고", description: "금전 피해가 있으면 신고 기록을 남기세요.", actionType: "copy", value: "https://ecrm.police.go.kr" },

  { id: "act_alert_change_password", breachTypeId: "breach_alert_service", providerId: null, priority: 1, title: "해당 계정 비밀번호 변경", description: "유출 알림에 나온 서비스부터 먼저 바꾸세요.", actionType: "copy", value: "https://www.privacy.go.kr" },
  { id: "act_idcard_reissue_gov24", breachTypeId: "id_card_loss", providerId: null, priority: 1, title: "주민등록증 재발급 신청", description: "신분증 사진 유출이면 재발급과 조회차단을 같이 진행하세요.", actionType: "copy", value: "https://www.gov.kr" },
  { id: "act_idcard_driving_reissue", breachTypeId: "id_card_loss", providerId: null, priority: 2, title: "운전면허증 재발급 신청", description: "운전면허증 유출이면 안전운전 통합민원에서 확인하세요.", actionType: "copy", value: "https://www.safedriving.or.kr" },
  { id: "act_credit_nice_block", breachTypeId: "credit_inquiry_block", providerId: "nice", priority: 1, title: "NICE 신용정보 조회제한", description: "명의도용 대출 가능성을 먼저 낮추세요.", actionType: "copy", value: "https://www.credit.co.kr" },
  { id: "act_credit_kcb_block", breachTypeId: "credit_inquiry_block", providerId: "kcb", priority: 2, title: "KCB 신용정보 조회제한", description: "NICE와 함께 신청하는 것을 권장해요.", actionType: "copy", value: "https://www.allcredit.co.kr" },
  // 카카오톡 탈취 대응
  { id: "act_kakao_pw_change", breachTypeId: "sns_messenger_takeover", providerId: "kakaotalk", priority: 1, title: "카카오 비밀번호 즉시 변경", description: "카카오계정 비밀번호부터 바꿔 공격자 접근을 차단하세요.", actionType: "copy", value: "https://accounts.kakao.com/login/find_account" },
  { id: "act_kakao_devices_out", breachTypeId: "sns_messenger_takeover", providerId: "kakaotalk", priority: 2, title: "연결 기기 전체 로그아웃", description: "카카오계정 보안 설정에서 모든 기기 연결을 끊으세요.", actionType: "copy", value: "https://accounts.kakao.com/weblogin/account_info" },
  { id: "act_kakao_warn", breachTypeId: "sns_messenger_takeover", providerId: "kakaotalk", priority: 3, title: "지인에게 공지 문구 복사·발송", description: "다른 채널(문자 등)로 즉시 알려 2차 피해를 막으세요.", actionType: "copy", value: "제 카카오톡이 해킹됐어요. 저한테 온 송금 요청이나 링크는 절대 누르지 말아주세요." },

  // 인스타그램 탈취 대응
  { id: "act_insta_hacked", breachTypeId: "sns_messenger_takeover", providerId: "instagram", priority: 1, title: "인스타그램 해킹 신고", description: "이메일·전화번호가 바뀌어 접근이 안 될 때는 공식 복구 경로를 이용하세요.", actionType: "copy", value: "https://www.instagram.com/hacked" },
  { id: "act_insta_pw_reset", breachTypeId: "sns_messenger_takeover", providerId: "instagram", priority: 2, title: "비밀번호 재설정", description: "로그인이 가능하다면 즉시 비밀번호를 변경하세요.", actionType: "copy", value: "https://www.instagram.com/accounts/password/reset" },
  { id: "act_insta_warn", breachTypeId: "sns_messenger_takeover", providerId: "instagram", priority: 3, title: "지인에게 공지 문구 복사·발송", description: "DM으로 온 링크·송금 요청에 응하지 말라고 알려주세요.", actionType: "copy", value: "제 인스타그램 계정이 해킹됐어요. 저한테 온 DM 링크나 요청은 무시해 주세요." },

  // 페이스북 탈취 대응
  { id: "act_fb_hacked", breachTypeId: "sns_messenger_takeover", providerId: "facebook", priority: 1, title: "페이스북 해킹 신고·계정 복구", description: "facebook.com/hacked에서 단계별 복구 안내를 받으세요.", actionType: "copy", value: "https://www.facebook.com/hacked" },
  { id: "act_fb_sessions", breachTypeId: "sns_messenger_takeover", providerId: "facebook", priority: 2, title: "다른 기기 로그인 전체 종료", description: "보안 설정에서 내 모르게 로그인된 기기를 종료하세요.", actionType: "copy", value: "https://www.facebook.com/settings?tab=security" },
  { id: "act_fb_warn", breachTypeId: "sns_messenger_takeover", providerId: "facebook", priority: 3, title: "지인에게 공지 문구 복사·발송", description: "메신저로 온 이상한 링크·송금 요청을 무시하도록 알려주세요.", actionType: "copy", value: "제 페이스북 계정이 해킹됐어요. 저한테 온 메시지 링크나 요청은 무시해 주세요." },

  // 트위터/X 탈취 대응
  { id: "act_twitter_pw_reset", breachTypeId: "sns_messenger_takeover", providerId: "twitter_x", priority: 1, title: "트위터/X 비밀번호 재설정", description: "로그인이 안 되면 이메일·전화번호로 비밀번호를 재설정하세요.", actionType: "copy", value: "https://twitter.com/account/begin_password_reset" },
  { id: "act_twitter_sessions", breachTypeId: "sns_messenger_takeover", providerId: "twitter_x", priority: 2, title: "연결된 앱·기기 접근 권한 해제", description: "설정 > 보안에서 낯선 앱과 기기를 모두 제거하세요.", actionType: "copy", value: "https://twitter.com/settings/connected_apps" },
  { id: "act_twitter_warn", breachTypeId: "sns_messenger_takeover", providerId: "twitter_x", priority: 3, title: "지인에게 공지 문구 복사·발송", description: "팔로워에게 내 계정에서 온 DM이나 링크를 무시하도록 알려주세요.", actionType: "copy", value: "제 트위터/X 계정이 해킹됐어요. 저한테 온 DM이나 링크는 클릭하지 말아주세요." },
  { id: "act_exchange_upbit_support", breachTypeId: "crypto_exchange_leak", providerId: "upbit", priority: 1, title: "업비트 고객센터 긴급 문의", description: "전화 상담이 없어요. 1:1 문의 링크를 복사해 접수하세요.", actionType: "copy", value: "https://support.upbit.com" },
  { id: "act_exchange_bithumb_support", breachTypeId: "crypto_exchange_leak", providerId: "bithumb", priority: 1, title: "빗썸 고객센터 긴급 문의", description: "전화 상담보다 1:1 문의 접수가 공식 경로예요.", actionType: "copy", value: "https://support.bithumb.com" },
  { id: "act_exchange_police_report", breachTypeId: "crypto_exchange_leak", providerId: null, priority: 2, title: "경찰청 사이버범죄 신고", description: "자산 이동 피해는 형사 사안으로 신고 기록이 필요해요.", actionType: "copy", value: "https://ecrm.police.go.kr" },

  // account_password_leak — 플랫폼 미지정 시 fallback
  { id: "act_account_breach_check", breachTypeId: "account_password_leak", providerId: null, priority: 1, title: "털린 내 정보 찾기 서비스", description: "어떤 계정이 유출됐는지 먼저 확인하세요.", actionType: "copy", value: "https://kidc.eprivacy.go.kr" },

  // sns_messenger_takeover — 플랫폼 미지정 시 fallback
  { id: "act_sns_kisa_report", breachTypeId: "sns_messenger_takeover", providerId: null, priority: 1, title: "KISA 118 해킹 피해 상담·신고", description: "계정 탈취 피해 상담과 신고를 동시에 진행할 수 있어요.", actionType: "tel", value: "118" },
];

export const specialistReferrals: SpecialistReferral[] = [
  {
    title: "여성긴급전화 1366",
    description: "24시간 상담 가능, 전국 어디서나 국번 없이 1366",
    actionType: "tel",
    value: "1366",
  },
  {
    title: "디지털성범죄피해자지원센터",
    description: "촬영물 삭제지원, 상담, 수사연계까지 함께 도와줘요.",
    actionType: "tel",
    value: "02-735-8994",
  },
  {
    title: "112 긴급 신고",
    description: "신체 안전이 위협받는 긴급 상황이면 바로 신고하세요.",
    actionType: "tel",
    value: "112",
  },
];
