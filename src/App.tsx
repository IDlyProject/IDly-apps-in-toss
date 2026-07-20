import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Analytics } from "@apps-in-toss/web-analytics";

import { TossBannerAd } from "./components/TossBannerAd";
import {
  type ActionItem,
  type ActionStatus,
  type AnalyzeResult,
  type BreachType,
  type SpecialistReferral,
  type UserActionLog,
  analyzeIncident,
  getBreachTypes,
  getMyActions,
  setActionStatus,
} from "./api/idlyApi";
import "./App.css";

type View = "chat" | "status";
type ChatEntry =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; result: AnalyzeResult };

const goldenTimeLabels: Record<BreachType["goldenTime"], string> = {
  immediate: "즉시 대응",
  hours: "몇 시간 내",
  flexible: "확인 후 대응",
  registration: "등록형 대응",
};

const MAX_TEXT_LENGTH = 2_000;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

const WELCOME_ENTRY: ChatEntry = {
  id: "welcome",
  role: "assistant",
  result: {
    detectedTypes: [],
    confidence: "medium",
    clarifyingQuestion: null,
    safetyFlag: null,
    actions: [],
    aiMessage:
      "생성형 AI를 활용해 개인정보 유출 상황을 분석하고 대응 방법을 안내해요. AI가 생성한 결과는 참고용이며, 중요한 결정 전에 공식 기관에 확인해 주세요.\n\n유출 문자나 알림 캡처를 올리거나, 지금 상황을 적어주세요. 바로 실행할 수 있는 대응카드로 정리해드릴게요.",
    source: "local",
  },
};

const DEFAULT_BREACH_TYPES: BreachType[] = [
  { id: "card_payment_leak", nameKr: "카드/계좌 결제정보 유출", goldenTime: "immediate", triggerKeywords: [], requiresProviderSelection: false },
  { id: "telecom_personal_info_leak", nameKr: "통신사 개인정보 유출", goldenTime: "hours", triggerKeywords: [], requiresProviderSelection: false },
  { id: "account_password_leak", nameKr: "이메일/계정 비밀번호 유출", goldenTime: "flexible", triggerKeywords: [], requiresProviderSelection: false },
  { id: "resident_id_leak", nameKr: "주민번호/신분증 유출", goldenTime: "registration", triggerKeywords: [], requiresProviderSelection: false },
  { id: "smishing_phishing", nameKr: "스미싱/피싱 의심 문자·전화", goldenTime: "immediate", triggerKeywords: [], requiresProviderSelection: false },
  { id: "id_card_loss", nameKr: "신분증 분실·유출", goldenTime: "immediate", triggerKeywords: [], requiresProviderSelection: false },
];

function App() {
  const [view, setView] = useState<View>("chat");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current != null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);
  const [breachTypes, setBreachTypes] = useState<BreachType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([WELCOME_ENTRY]);
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({});
  const [statusLogs, setStatusLogs] = useState<UserActionLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectableBreachTypes = breachTypes.length > 0 ? breachTypes : DEFAULT_BREACH_TYPES;
  const hasUserEntries = chatEntries.some((entry) => entry.role === "user");
  const selectedType = useMemo(
    () => selectableBreachTypes.find((type) => type.id === selectedTypeId) ?? null,
    [selectableBreachTypes, selectedTypeId],
  );
  const hasExternalAiInput = message.trim().length > 0 || image != null;

  useEffect(() => {
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatEntries]);

  async function loadInitialData() {
    // 유형 목록과 로그를 독립적으로 로드 — DB 실패가 카드 선택에 영향 안 주도록
    void getBreachTypes()
      .then(setBreachTypes)
      .catch((error) => showToast(getErrorMessage(error)));

    void getMyActions()
      .then((logs) => {
        setStatusLogs(logs);
        setActionStatuses(Object.fromEntries(logs.map((log) => [log.actionItemId, log.status])));
      })
      .catch(() => {
        // 로그 로드 실패해도 카드 선택·분석은 정상 동작
      });
  }

  async function refreshStatusLogs() {
    try {
      const logs = await getMyActions();
      setStatusLogs(logs);
      setActionStatuses(Object.fromEntries(logs.map((log) => [log.actionItemId, log.status])));
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  async function handleAnalyze() {
    if (isSubmitting) {
      return;
    }

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
    Analytics.click({
      log_name: "analysis_start",
      breach_type: selectedTypeId ?? "none",
      has_image: image != null,
      has_text: message.trim().length > 0,
    });

    const userText = [
      message.trim(),
      image == null ? "" : `첨부 이미지: ${image.name}`,
      selectedType == null ? "" : `직접 선택: ${selectedType.nameKr}`,
    ]
      .filter(Boolean)
      .join("\n");

    setChatEntries((entries) => [
      ...entries,
      { id: crypto.randomUUID(), role: "user", text: userText },
    ]);

    try {
      const result = await analyzeIncident({
        text: message,
        image,
        selectedTypeId,
        consentToExternalAI: consent,
      });

      setChatEntries((entries) => [
        ...entries,
        { id: crypto.randomUUID(), role: "assistant", result },
      ]);
      Analytics.impression({
        log_name: "analysis_complete",
        action_count: result.actions.length,
        confidence: result.confidence,
        source: result.source,
      });
      setMessage("");
      setImage(null);
      setConsent(false);
      setSelectedTypeId(null);
      if (fileInputRef.current != null) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleAction(action: ActionItem) {
    const currentStatus = actionStatuses[action.id] ?? "pending";
    const nextStatus: ActionStatus = currentStatus === "done" ? "pending" : "done";

    setActionStatuses((statuses) => ({ ...statuses, [action.id]: nextStatus }));

    if (nextStatus === "done") {
      Analytics.click({ log_name: "action_complete", action_id: action.id });
    }

    try {
      await setActionStatus({ actionId: action.id, status: nextStatus });
      await refreshStatusLogs();
    } catch (error) {
      setActionStatuses((statuses) => ({ ...statuses, [action.id]: currentStatus }));
      showToast(getErrorMessage(error));
    }
  }

  async function handleActionClick(action: ActionItem | SpecialistReferral) {
    Analytics.click({
      log_name: "action_card_link",
      action_type: action.actionType,
      action_title: action.title,
    });

    if (action.actionType === "tel") {
      window.location.href = `tel:${action.value}`;
      return;
    }

    try {
      await navigator.clipboard.writeText(action.value);
      showToast("복사했어요. 필요한 곳에 붙여넣어 주세요.");
    } catch {
      showToast(action.value);
    }
  }

  function handleReset() {
    setChatEntries([WELCOME_ENTRY]);
    setMessage("");
    setImage(null);
    setConsent(false);
    setSelectedTypeId(null);
  }

  function handleImageChange(file: File | null) {
    if (file != null && file.size > MAX_IMAGE_SIZE) {
      showToast("이미지는 6MB 이하만 업로드할 수 있어요.");
      setImage(null);
      if (fileInputRef.current != null) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setImage(file);
  }

  return (
    <main className="app-shell">
      {toastMsg != null && <div className="simple-toast">{toastMsg}</div>}

      <div className="simple-tabs">
        <button className={view === "chat" ? "simple-tab active" : "simple-tab"} onClick={() => setView("chat")}>대응 시작</button>
        <button className={view === "status" ? "simple-tab active" : "simple-tab"} onClick={() => { setView("status"); Analytics.screen({ log_name: "status_view" }); }}>내 대응 현황</button>
      </div>

      {view === "chat" ? (
        <>
          <section
            className={hasUserEntries ? "chat-list chat-list-scrollable" : "chat-list chat-list-with-sheet"}
            aria-label="AI 대응 안내"
          >
            {chatEntries.map((entry) =>
              entry.role === "user" ? (
                <UserBubble key={entry.id} text={entry.text} />
              ) : (
                <AssistantBubble
                  key={entry.id}
                  result={entry.result}
                  statuses={actionStatuses}
                  onActionClick={handleActionClick}
                  onToggleAction={handleToggleAction}
                />
              ),
            )}
            <div ref={chatEndRef} />
          </section>

          {hasUserEntries ? (
            <>
              <TossBannerAd />
              <section className="input-panel followup-panel" aria-label="후속 입력">
                <textarea
                  className="incident-textarea"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="카드사명이나 추가 상황을 알려주세요."
                  rows={2}
                />
                {hasExternalAiInput && (
                  <ExternalAiConsent checked={consent} imageAttached={image != null} onChange={setConsent} />
                )}
                <div className="followup-row">
                  <button className="app-button app-button-weak" type="button" onClick={handleReset}>
                    새로 시작
                  </button>
                  <button
                    className="app-button app-button-primary followup-send"
                    type="button"
                    disabled={isSubmitting || message.trim().length === 0}
                    onClick={handleAnalyze}
                  >
                    {isSubmitting ? "분석 중" : "전송"}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <DraggableToastSheet>
              <section className="input-panel input-panel-sheet" aria-label="사고 상황 입력">
                <div className="greeting-lines">
                  <p>어떤 유출이 발생했나요?</p>
                  <p>상황을 알려주시면 지금 바로 해야 할 행동을 알려드릴게요.</p>
                </div>

                <button
                  className="upload-zone"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="upload-icon" aria-hidden="true" size={30} strokeWidth={2} />
                  <strong>문자 · 알림 캡처 첨부하기</strong>
                  <span>받은 문자/이메일 스크린샷을 그대로 올려주세요</span>
                </button>

                <div className="upload-row">
                  <input
                    ref={fileInputRef}
                    className="file-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImageChange(event.target.files?.[0] ?? null)}
                  />
                  {image != null && <span className="file-name">{image.name}</span>}
                </div>

                {hasExternalAiInput && (
                  <ExternalAiConsent checked={consent} imageAttached={image != null} onChange={setConsent} />
                )}

                <div className="or-divider">
                  <span />
                  <b>또는</b>
                  <span />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor="incident-message">
                    텍스트로 설명하기
                  </label>
                  <textarea
                    id="incident-message"
                    className="incident-textarea"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={MAX_TEXT_LENGTH}
                    placeholder="예: 신한카드에서 카드정보 유출 안내 문자를 받았어요."
                    rows={4}
                  />
                </div>

                <div className="fallback-row">
                  <span>사진·설명 없이 바로 고를래요</span>
                </div>

                <div className="type-grid" aria-label="유형 직접 선택">
                  {selectableBreachTypes.map((type) => (
                    <button
                      key={type.id}
                      className={selectedTypeId === type.id ? "type-chip selected" : "type-chip"}
                      type="button"
                      onClick={() => setSelectedTypeId((current) => (current === type.id ? null : type.id))}
                    >
                      <strong>{type.nameKr}</strong>
                      <span>{goldenTimeLabels[type.goldenTime]}</span>
                    </button>
                  ))}
                </div>

                <button
                  className="app-button app-button-primary primary-cta"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAnalyze}
                >
                  {isSubmitting ? "분석 중" : "대응카드 만들기"}
                </button>
              </section>
            </DraggableToastSheet>
          )}
        </>
      ) : (
        <StatusView logs={statusLogs} onRefresh={refreshStatusLogs} />
      )}
    </main>
  );
}

function UserBubble({ text }: { text: string }) {
  return <div className="chat-bubble user-bubble">{text}</div>;
}

function DraggableToastSheet({ children }: { children: ReactNode }) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [minOffset, setMinOffset] = useState(0);
  const [maxOffset, setMaxOffset] = useState(280);
  const dragRef = useRef({ startY: 0, startOffset: 0, pointerId: -1 });

  useEffect(() => {
    function updateMaxOffset() {
      if (sheetRef.current == null) {
        return;
      }

      const fullHeight = sheetRef.current.getBoundingClientRect().height;
      // Keep header and upload insertion area visible when collapsed.
      const visibleHeight = Math.min(360, Math.max(260, Math.round(window.innerHeight * 0.42)));
      const next = Math.max(0, Math.round(fullHeight - visibleHeight));
      // Ensure fully expanded state never goes beyond the top edge.
      const nextMin = Math.max(0, Math.round(fullHeight - window.innerHeight + 12));
      const boundedMin = Math.min(nextMin, next);

      setMinOffset(boundedMin);
      setMaxOffset(next);
      setOffsetY((current) => Math.min(next, Math.max(boundedMin, current)));
    }

    updateMaxOffset();
    window.addEventListener("resize", updateMaxOffset);
    return () => window.removeEventListener("resize", updateMaxOffset);
  }, []);

  return (
    <div
      ref={sheetRef}
      className="toast-sheet"
      style={{ bottom: `${-offsetY}px`, transition: dragging ? "none" : "bottom 180ms ease" }}
      role="dialog"
      aria-label="입력 패널"
      aria-modal="false"
    >
      <div className="toast-sheet-body">
        <button
          className="toast-sheet-handle"
          type="button"
          aria-label="입력 패널 위치 조절"
          onPointerDown={(event) => {
            setDragging(true);
            dragRef.current = {
              startY: event.clientY,
              startOffset: offsetY,
              pointerId: event.pointerId,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragging || dragRef.current.pointerId !== event.pointerId) {
              return;
            }

            const distance = event.clientY - dragRef.current.startY;
            const nextOffset = Math.min(maxOffset, Math.max(minOffset, dragRef.current.startOffset + distance));
            setOffsetY(nextOffset);
          }}
          onPointerUp={(event) => {
            if (dragRef.current.pointerId !== event.pointerId) {
              return;
            }

            setDragging(false);
            setOffsetY((current) => {
              const midpoint = (minOffset + maxOffset) / 2;
              return current > midpoint ? maxOffset : minOffset;
            });
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={(event) => {
            if (dragRef.current.pointerId !== event.pointerId) {
              return;
            }

            setDragging(false);
            setOffsetY((current) => {
              const midpoint = (minOffset + maxOffset) / 2;
              return current > midpoint ? maxOffset : minOffset;
            });
          }}
        >
          <span className="toast-sheet-grabber" aria-hidden="true" />
        </button>

        {children}
        <div className="toast-sheet-navigation" aria-hidden="true">
          <span className="toast-sheet-home-indicator" />
        </div>
      </div>
    </div>
  );
}

function ExternalAiConsent({
  checked,
  imageAttached,
  onChange,
}: {
  checked: boolean;
  imageAttached: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="consent-box">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <b>{imageAttached ? "[필수] 외부 AI 분석 동의" : "[선택] 외부 AI 분석 동의"}</b>
        <br />
        동의하면 입력한 내용{imageAttached ? "과 이미지" : ""}이 AI 분석을 위해
        외부 AI 서비스(업스테이지)로 전송될 수 있어요. 동의하지 않으면 기기 밖
        외부 AI 호출 없이 로컬 규칙으로만 분석해요.
      </span>
    </label>
  );
}

function AssistantBubble({
  result,
  statuses,
  onActionClick,
  onToggleAction,
}: {
  result: AnalyzeResult;
  statuses: Record<string, ActionStatus>;
  onActionClick: (action: ActionItem | SpecialistReferral) => Promise<void>;
  onToggleAction: (action: ActionItem) => Promise<void>;
}) {
  return (
    <div className="assistant-block">
      <div className="assistant-message-shell">
        <img className="assistant-avatar" src="/부엉이.png" alt="" aria-hidden="true" />
        <div className="chat-bubble assistant-bubble">
          <p style={{ whiteSpace: "pre-line" }}>{result.aiMessage}</p>
        </div>
      </div>

      {result.safetyFlag === "refer_to_specialist" ? (
        <div className="referral-list">
          {result.specialistReferrals?.map((referral) => (
            <ReferralCard
              key={`${referral.title}-${referral.value}`}
              referral={referral}
              onActionClick={onActionClick}
            />
          ))}
        </div>
      ) : (
        result.actions.length > 0 && (
          <div className="action-list">
            {result.actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                status={statuses[action.id] ?? "pending"}
                onActionClick={onActionClick}
                onToggleAction={onToggleAction}
              />
            ))}
          </div>
        )
      )}

      {result.clarifyingQuestion != null && (
        <div className="chat-bubble assistant-bubble">
          <p className="clarifying-question">{result.clarifyingQuestion}</p>
        </div>
      )}
    </div>
  );
}

function ActionCard({
  action,
  status,
  onActionClick,
  onToggleAction,
}: {
  action: ActionItem;
  status: ActionStatus;
  onActionClick: (action: ActionItem) => Promise<void>;
  onToggleAction: (action: ActionItem) => Promise<void>;
}) {
  return (
    <article className={status === "done" ? "action-card done" : "action-card"}>
      <span className={action.priority === 1 ? "priority-flag urgent" : "priority-flag"}>
        {action.priority === 1 ? "지금 바로 · 우선순위 1" : `우선순위 ${action.priority}`}
      </span>
      <div className="action-card-main">
        <span className={status === "done" ? "card-checkbox checked" : "card-checkbox"} />
        <div>
          <h3>{action.title}</h3>
          <p>{action.description}</p>
          <small>{action.actionType === "tel" ? action.value : "링크/문구 복사"}</small>
        </div>
      </div>
      <div className="action-controls">
        <button className="app-button app-button-weak app-button-small" type="button" onClick={() => void onActionClick(action)}>
          {action.actionType === "tel" ? "전화 걸기" : "링크 복사"}
        </button>
        <button
          className={status === "done" ? "app-button app-button-weak app-button-small" : "app-button app-button-primary app-button-small"}
          type="button"
          onClick={() => void onToggleAction(action)}
        >
          {status === "done" ? "완료됨" : "완료"}
        </button>
      </div>
    </article>
  );
}

function ReferralCard({
  referral,
  onActionClick,
}: {
  referral: SpecialistReferral;
  onActionClick: (action: SpecialistReferral) => Promise<void>;
}) {
  return (
    <article className="referral-card">
      <h3>{referral.title}</h3>
      <p>{referral.description}</p>
      <button className="app-button app-button-weak referral-action" type="button" onClick={() => void onActionClick(referral)}>
        전화
      </button>
    </article>
  );
}

function StatusView({
  logs,
  onRefresh,
}: {
  logs: UserActionLog[];
  onRefresh: () => Promise<void>;
}) {
  const sortedLogs = [...logs].sort((a, b) => {
    if (a.status === b.status) {
      return b.createdAt.localeCompare(a.createdAt);
    }
    return a.status === "pending" ? -1 : 1;
  });

  return (
    <section className="status-panel" aria-label="내 대응 현황">
      <div className="status-header">
        <div>
          <div className="tab-row">
            <span className="tab active">진행중 ({logs.filter((log) => log.status === "pending").length})</span>
            <span className="tab inactive">완료 ({logs.filter((log) => log.status === "done").length})</span>
          </div>
        </div>
        <button className="app-button app-button-weak app-button-small" type="button" onClick={() => void onRefresh()}>
          새로고침
        </button>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="empty-state">아직 저장된 대응 항목이 없어요.</div>
      ) : (
        <div className="status-list">
          {sortedLogs.map((log) => (
            <article key={log.actionItemId} className="status-row">
              <span className={log.status === "done" ? "status-dot done" : "status-dot"} />
              <div>
                <h3>{log.action.title}</h3>
                <p>{log.action.description}</p>
                <small>
                  {log.status === "done"
                    ? `완료 ${formatDate(log.completedAt)}`
                    : `진행중 ${formatDate(log.createdAt)}`}
                </small>
              </div>
              <span className={log.status === "done" ? "status-chip done" : "status-chip"}>
                {log.status === "done" ? "완료" : "미완료"}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요.";
}

function formatDate(value: string | null): string {
  if (value == null) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error != null) {
      return (
        <div style={{ padding: 24, color: "#f04452", fontSize: 14 }}>
          <b>앱 오류:</b> {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

export default App;
