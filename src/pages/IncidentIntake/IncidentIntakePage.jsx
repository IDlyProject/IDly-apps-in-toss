import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Fingerprint,
  FileText,
  IdCard,
  Mail,
  MessageCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Wallet,
  X,
} from "lucide-react";

import AssistantRow from "@/pages/AccountAction/components/AssistantRow";
import PageBackground from "@/components/layouts/PageBackground";
import TextBubble from "@/pages/AccountAction/components/TextBubble";
import TopNavBar from "@/components/TopNavBar";
import { ROUTES } from "@/constants/routes";
import { analyzeIncident, getBreachTypes } from "@/api/idlyApi";

const MAX_TEXT_LENGTH = 2_000;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const DEFAULT_BREACH_TYPES = [
  { id: "card_payment_leak", nameKr: "카드/계좌 결제정보 유출", goldenTime: "immediate" },
  { id: "telecom_personal_info_leak", nameKr: "통신사 개인정보 유출", goldenTime: "hours" },
  { id: "account_password_leak", nameKr: "이메일/계정 비밀번호 유출", goldenTime: "flexible" },
  { id: "resident_id_leak", nameKr: "주민번호/신분증 유출", goldenTime: "registration" },
  { id: "smishing_phishing", nameKr: "스미싱/피싱 의심 문자·전화", goldenTime: "immediate" },
  { id: "id_card_loss", nameKr: "신분증 분실·유출", goldenTime: "immediate" },
];

const BREACH_TYPE_ICONS = {
  card_payment_leak: CreditCard,
  telecom_personal_info_leak: Smartphone,
  account_password_leak: Mail,
  resident_id_leak: Fingerprint,
  smishing_phishing: TriangleAlert,
  breach_alert_service: Search,
  id_card_loss: IdCard,
  credit_inquiry_block: ShieldCheck,
  sns_messenger_takeover: MessageCircle,
  crypto_exchange_leak: Wallet,
};

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFriendlyErrorMessage(error) {
  // fetch()가 서버에 아예 닿지 못하면 TypeError("Failed to fetch")를 던짐
  if (error instanceof TypeError) {
    return "서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.";
  }
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요.";
}

export default function IncidentIntakePage() {
  const navigate = useNavigate();

  const [breachTypes, setBreachTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState(null);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const didLoadBreachTypes = useRef(false);

  const selectableBreachTypes = breachTypes.length > 0 ? breachTypes : DEFAULT_BREACH_TYPES;
  const hasExternalAiInput = message.trim().length > 0 || image != null;
  const textLength = message.trim().length;
  const nearLimit = textLength > MAX_TEXT_LENGTH * 0.9;

  useEffect(() => {
    if (didLoadBreachTypes.current) return;
    didLoadBreachTypes.current = true;
    getBreachTypes()
      .then(setBreachTypes)
      .catch(() => {
        // 기본 유형 목록으로 대체
      });
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl != null) URL.revokeObjectURL(imagePreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(text) {
    setToast(text);
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }

  function handleImageChange(file) {
    if (imagePreviewUrl != null) URL.revokeObjectURL(imagePreviewUrl);

    if (file != null && file.size > MAX_IMAGE_SIZE) {
      showToast("이미지는 6MB 이하만 업로드할 수 있어요.");
      setImage(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current != null) fileInputRef.current.value = "";
      return;
    }

    setImage(file);
    setImagePreviewUrl(file == null ? null : URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    if (imagePreviewUrl != null) URL.revokeObjectURL(imagePreviewUrl);
    setImage(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current != null) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (isSubmitting) return;

    if (message.trim().length === 0 && image == null && selectedTypeId == null) {
      showToast("상황 설명, 캡처 이미지, 직접 선택 중 하나는 필요해요.");
      return;
    }
    if (message.trim().length > MAX_TEXT_LENGTH) {
      showToast(`상황 설명은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.`);
      return;
    }
    if (image != null && !consent) {
      showToast("이미지 분석을 위해 외부 AI 전송 동의가 필요해요.");
      return;
    }

    setIsSubmitting(true);

    const selectedType = selectableBreachTypes.find((type) => type.id === selectedTypeId) ?? null;
    const userText = [
      message.trim(),
      image == null ? "" : `첨부 이미지: ${image.name}`,
      selectedType == null ? "" : `직접 선택: ${selectedType.nameKr}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const result = await analyzeIncident({
        text: message,
        image,
        selectedTypeId,
        consentToExternalAI: consent,
      });
      navigate(ROUTES.CHAT, { state: { userText, result } });
    } catch (error) {
      showToast(getFriendlyErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageBackground variant="frost">
      <div className="relative flex h-dvh flex-col">
        <TopNavBar />

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6">
          <div className="pt-1">
            <AssistantRow showAvatar>
              <TextBubble text={"어떤 유출이 발생했나요?\n상황을 알려주시면 지금 바로 해야 할 행동을 알려드릴게요."} />
            </AssistantRow>
          </div>

          <div
            className="mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
            style={{ borderRadius: "16px" }}
          >
            {image == null ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#c9d3ea] bg-[#f7f9ff] px-4 py-6 text-center transition-colors active:bg-[#eef2ff]"
                style={{ borderRadius: "12px" }}
              >
                <FileText size={26} strokeWidth={2} className="text-[#08257e]" />
                <strong className="text-[14px] font-bold text-[#191f28]">문자 · 알림 캡처 첨부하기</strong>
                <span className="text-[12px] font-medium leading-relaxed text-[#6b7684]">
                  받은 문자/이메일 스크린샷을 그대로 올려주세요
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-[#e5e8eb] bg-[#f8faff] p-2.5">
                <img
                  src={imagePreviewUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  style={{ borderRadius: "8px" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-[#191f28]">{image.name}</p>
                  <p className="text-[12px] font-medium text-[#6b7684]">{formatFileSize(image.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="첨부 이미지 삭제"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#6b7684] shadow-[0_1px_2px_rgba(16,24,46,0.08)] transition-colors active:bg-[#f2f4f8]"
                  style={{ borderRadius: "9999px" }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
            />

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${
                hasExternalAiInput ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0">
                <label className="flex items-start gap-2 rounded-xl border border-[#ffe1a6] bg-[#fff8e7] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#08257e]"
                  />
                  <span className="text-[12px] leading-relaxed text-[#191f28]">
                    <b>{image != null ? "[필수]" : "[선택]"} 외부 AI 분석 동의</b>
                    <br />
                    동의하면 입력한 내용{image != null ? "과 이미지" : ""}이 AI 분석을 위해 외부 AI
                    서비스로 전송될 수 있어요.
                  </span>
                </label>
              </div>
            </div>

            <div className="my-4 flex items-center gap-2">
              <span className="h-px flex-1 bg-[#e5e8eb]" />
              <b className="text-[10px] font-bold text-[#6b7684]">또는</b>
              <span className="h-px flex-1 bg-[#e5e8eb]" />
            </div>

            <div className="mb-2 flex items-baseline justify-between">
              <label className="text-[14px] font-bold text-[#191f28]" htmlFor="incident-message">
                텍스트로 설명하기
              </label>
              <span className={`text-[11px] font-medium ${nearLimit ? "text-[#ee4e4e]" : "text-[#94a3b8]"}`}>
                {textLength.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
              </span>
            </div>
            <textarea
              id="incident-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={MAX_TEXT_LENGTH}
              placeholder="예: 신한카드에서 카드정보 유출 안내 문자를 받았어요."
              rows={4}
              className="w-full resize-none rounded-xl border border-[#d1d6db] bg-white p-3 text-[14px] leading-relaxed text-[#191f28] outline-none transition-colors focus:border-[#08257e] focus-visible:ring-2 focus-visible:ring-[#08257e]/15"
              style={{ borderRadius: "12px" }}
            />
          </div>

          <p className="mb-3 mt-7 px-1 text-[13px] font-bold text-[#191f28]">또는 유형을 직접 선택하세요</p>

          <div className="grid grid-cols-2 gap-2">
            {selectableBreachTypes.map((type) => {
              const selected = selectedTypeId === type.id;
              const Icon = BREACH_TYPE_ICONS[type.id] ?? ShieldAlert;

              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedTypeId((current) => (current === type.id ? null : type.id))}
                  className={`relative flex min-h-[60px] items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-colors ${
                    selected
                      ? "border-[#08257e] bg-[#eff3ff]"
                      : "border-[#e5e8eb] bg-white active:bg-[#f8faff]"
                  }`}
                  style={{ borderRadius: "16px" }}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selected ? "bg-[#08257e]" : "bg-[#eef1f7]"
                    }`}
                    style={{ borderRadius: "8px" }}
                  >
                    <Icon size={16} className={selected ? "text-white" : "text-[#4e5968]"} />
                  </span>
                  <strong className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-[#191f28]">
                    {type.nameKr}
                  </strong>
                  {selected && (
                    <span
                      className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#08257e] text-white"
                      style={{ borderRadius: "9999px" }}
                    >
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none" aria-hidden="true">
                        <path
                          d="M1 3.5L3.2 5.7L8 1"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <div
            className={`pointer-events-none absolute inset-x-4 -top-3 flex -translate-y-full justify-center transition-all duration-200 ease-out ${
              toast ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div
              className="rounded-full bg-[#191f28]/92 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(16,24,46,0.16)]"
              style={{ borderRadius: "9999px" }}
            >
              {toast}
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex w-full items-center justify-center rounded-full bg-[#08257e] py-3.5 text-[15px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
            style={{ borderRadius: "9999px" }}
          >
            {isSubmitting ? "분석 중" : "유출·대응 시작하기"}
          </button>
        </div>
      </div>
    </PageBackground>
  );
}
