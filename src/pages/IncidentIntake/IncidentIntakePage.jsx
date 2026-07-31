import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Fingerprint,
  IdCard,
  ListChecks,
  Mail,
  MessageCircle,
  MessageSquareText,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import AssistantRow from "@/pages/AccountAction/components/AssistantRow";
import { TossBannerAd } from "@/components/TossBannerAd";
import PageBackground from "@/components/layouts/PageBackground";
import TextBubble from "@/pages/AccountAction/components/TextBubble";
import TopNavBar from "@/components/TopNavBar";
import { ROUTES } from "@/constants/routes";
import { analyzeIncident, getBreachTypes } from "@/api/idlyApi";
import BreachTypeField from "./components/BreachTypeField";
import ImageCaptureField, { formatFileSize } from "./components/ImageCaptureField";
import IntakeFieldSheet from "./components/IntakeFieldSheet";
import IntakeSection from "./components/IntakeSection";
import TextDescriptionField from "./components/TextDescriptionField";
import ExternalAiConsentSheet from "./components/ExternalAiConsentSheet";

const INTAKE_SHEETS = {
  image: { icon: ScanLine, title: "문자·알림 캡처 첨부하기" },
  text: { icon: MessageSquareText, title: "텍스트로 설명하기" },
  type: { icon: ListChecks, title: "유형 직접 선택하기" },
};

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
  const [showConsentSheet, setShowConsentSheet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSheetKey, setActiveSheetKey] = useState("image");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState("field");
  const [consentStepMinHeight, setConsentStepMinHeight] = useState(null);
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const didLoadBreachTypes = useRef(false);
  const sheetBodyRef = useRef(null);

  const selectableBreachTypes = breachTypes.length > 0 ? breachTypes : DEFAULT_BREACH_TYPES;
  const hasExternalAiInput = message.trim().length > 0 || image != null;
  const textLength = message.trim().length;
  const nearLimit = textLength > MAX_TEXT_LENGTH * 0.9;
  const selectedType = selectableBreachTypes.find((type) => type.id === selectedTypeId) ?? null;

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

  function openSheet(key) {
    setActiveSheetKey(key);
    setSheetStep("field");
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
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
    // 이미지가 추가되면 전송 범위가 바뀌므로 동의를 다시 받아요.
    if (file != null) setConsent(false);
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
    if (hasExternalAiInput && !consent) {
      setShowConsentSheet(true);
      return;
    }

    await performSubmit();
  }

  async function performSubmit() {
    setIsSubmitting(true);

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

  function handleConsentAgree() {
    setConsent(true);
    setShowConsentSheet(false);
    void performSubmit();
  }

  function handleConsentClose() {
    setShowConsentSheet(false);
  }

  async function handleSheetSubmit() {
    if (isSubmitting) return;

    if (message.trim().length === 0 && image == null && selectedTypeId == null) {
      showToast("상황 설명, 캡처 이미지, 직접 선택 중 하나는 필요해요.");
      return;
    }
    if (message.trim().length > MAX_TEXT_LENGTH) {
      showToast(`상황 설명은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.`);
      return;
    }
    if (hasExternalAiInput && !consent) {
      setConsentStepMinHeight(sheetBodyRef.current?.offsetHeight ?? null);
      setSheetStep("consent");
      return;
    }

    await performSubmit();
  }

  function handleSheetConsentAgree() {
    setConsent(true);
    void performSubmit();
  }

  function handleSheetConsentCancel() {
    setSheetStep("field");
  }

  return (
    <PageBackground variant="flat">
      <div className="relative flex h-dvh flex-col">
        <TopNavBar />
        <TossBannerAd />

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6">
          <div className="flex h-full flex-col">
            <div className="shrink-0 pt-1">
              <AssistantRow showAvatar>
                <TextBubble text={"어떤 유출이 발생했나요?\n상황을 알려주시면 지금 바로 해야 할 행동을 알려드릴게요."} />
              </AssistantRow>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-2.5 py-6">
              <IntakeSection
                icon={ScanLine}
                label="문자·알림 캡처 첨부하기"
                summary={image != null ? `${image.name} · ${formatFileSize(image.size)}` : "받은 문자·이메일 스크린샷을 그대로 올려요"}
                filled={image != null}
                onClick={() => openSheet("image")}
              />

              <IntakeSection
                icon={MessageSquareText}
                label="텍스트로 설명하기"
                summary={textLength > 0 ? `${textLength.toLocaleString()}자 입력했어요` : "상황을 직접 입력해요"}
                filled={textLength > 0}
                onClick={() => openSheet("text")}
              />

              <IntakeSection
                icon={ListChecks}
                label="유형 직접 선택하기"
                summary={selectedType != null ? selectedType.nameKr : "10가지 유형 중에서 선택해요"}
                filled={selectedType != null}
                onClick={() => openSheet("type")}
              />
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4">
          <div
            className={`pointer-events-none absolute inset-x-4 -top-3 z-[60] flex -translate-y-full justify-center transition-all duration-200 ease-out ${
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

      <IntakeFieldSheet
        ref={sheetBodyRef}
        open={sheetOpen}
        icon={sheetStep === "consent" ? ShieldCheck : INTAKE_SHEETS[activeSheetKey].icon}
        title={sheetStep === "consent" ? "외부 AI 분석 동의가 필요해요" : INTAKE_SHEETS[activeSheetKey].title}
        onClose={closeSheet}
      >
        {sheetStep === "consent" ? (
          <div
            className="flex flex-1 flex-col justify-center gap-6 transition-[min-height] duration-200 ease-out"
            style={{ minHeight: consentStepMinHeight ?? undefined }}
          >
            <p className="text-[13px] leading-relaxed text-[#6b7684]">
              입력한 내용{image != null ? "과 첨부한 이미지는" : "은"} 유출 유형 분석을 위해 외부 AI
              서비스(업스테이지)로 전송돼요. 동의해야 대응 분석을 시작할 수 있어요.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSheetConsentAgree}
                className="w-full rounded-full bg-[#08257e] py-3.5 text-[15px] font-bold text-white transition-opacity active:opacity-85"
                style={{ borderRadius: "9999px" }}
              >
                동의하고 계속하기
              </button>
              <button
                type="button"
                onClick={handleSheetConsentCancel}
                className="w-full rounded-full py-3.5 text-[14px] font-bold text-[#6b7684] transition-colors active:bg-[#f2f4f6]"
                style={{ borderRadius: "9999px" }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeSheetKey === "image" && (
              <ImageCaptureField
                image={image}
                imagePreviewUrl={imagePreviewUrl}
                fileInputRef={fileInputRef}
                onFileChange={handleImageChange}
                onRemoveImage={handleRemoveImage}
              />
            )}
            {activeSheetKey === "text" && (
              <TextDescriptionField
                message={message}
                onMessageChange={setMessage}
                textLength={textLength}
                nearLimit={nearLimit}
                maxTextLength={MAX_TEXT_LENGTH}
              />
            )}
            {activeSheetKey === "type" && (
              <BreachTypeField
                types={selectableBreachTypes}
                icons={BREACH_TYPE_ICONS}
                selectedTypeId={selectedTypeId}
                onSelect={setSelectedTypeId}
              />
            )}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSheetSubmit}
              className="w-full rounded-full bg-[#08257e] py-3.5 text-[15px] font-bold text-white transition-opacity active:opacity-80 disabled:opacity-50"
              style={{ borderRadius: "9999px" }}
            >
              {isSubmitting ? "분석 중" : "유출·대응 시작하기"}
            </button>
          </>
        )}
      </IntakeFieldSheet>

      <ExternalAiConsentSheet
        open={showConsentSheet}
        imageAttached={image != null}
        onAgree={handleConsentAgree}
        onClose={handleConsentClose}
      />
    </PageBackground>
  );
}
