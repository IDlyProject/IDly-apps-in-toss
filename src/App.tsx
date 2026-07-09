import { getAnonymousKey } from "@apps-in-toss/web-framework";
import { Button, SegmentedControl, Top, useToast } from "@toss/tds-mobile";
import { useEffect, useMemo, useRef, useState } from "react";

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

function App() {
  const toast = useToast();

  const [view, setView] = useState<View>("chat");
  const [userId, setUserId] = useState<string | null>(null);
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

  const selectedType = useMemo(
    () => breachTypes.find((type) => type.id === selectedTypeId) ?? null,
    [breachTypes, selectedTypeId],
  );

  useEffect(() => {
    void initUserId();
  }, []);

  useEffect(() => {
    if (userId != null) {
      void loadInitialData(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatEntries]);

  async function initUserId() {
    const result = await getAnonymousKey();
    if (result != null && result !== "INVALID_CATEGORY" && result !== "ERROR" && result.type === "HASH") {
      setUserId(result.hash);
    } else {
      setUserId("local-demo");
    }
  }

  async function loadInitialData(uid: string) {
    try {
      const [types, logs] = await Promise.all([getBreachTypes(), getMyActions(uid)]);
      setBreachTypes(types);
      setStatusLogs(logs);
      setActionStatuses(Object.fromEntries(logs.map((log) => [log.actionItemId, log.status])));
    } catch (error) {
      toast.openToast(getErrorMessage(error));
    }
  }

  async function refreshStatusLogs() {
    try {
      const logs = await getMyActions(userId ?? "local-demo");
      setStatusLogs(logs);
      setActionStatuses(Object.fromEntries(logs.map((log) => [log.actionItemId, log.status])));
    } catch (error) {
      toast.openToast(getErrorMessage(error));
    }
  }

  async function handleAnalyze() {
    if (isSubmitting) {
      return;
    }

    if (message.trim().length === 0 && image == null && selectedTypeId == null) {
      toast.openToast("상황 설명, 캡처 이미지, 직접 선택 중 하나는 필요해요.");
      return;
    }

    if (image != null && !consent) {
      toast.openToast("이미지 분석을 위해 외부 AI 전송 동의가 필요해요.");
      return;
    }

    setIsSubmitting(true);

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
        userId: userId ?? "local-demo",
      });

      setChatEntries((entries) => [
        ...entries,
        { id: crypto.randomUUID(), role: "assistant", result },
      ]);
      setMessage("");
      setImage(null);
      setConsent(false);
      setSelectedTypeId(null);
      if (fileInputRef.current != null) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.openToast(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleAction(action: ActionItem) {
    const currentStatus = actionStatuses[action.id] ?? "pending";
    const nextStatus: ActionStatus = currentStatus === "done" ? "pending" : "done";

    setActionStatuses((statuses) => ({ ...statuses, [action.id]: nextStatus }));

    try {
      await setActionStatus({ actionId: action.id, status: nextStatus, userId: userId ?? "local-demo" });
      await refreshStatusLogs();
    } catch (error) {
      setActionStatuses((statuses) => ({ ...statuses, [action.id]: currentStatus }));
      toast.openToast(getErrorMessage(error));
    }
  }

  async function handleActionClick(action: ActionItem | SpecialistReferral) {
    if (action.actionType === "tel") {
      window.location.href = `tel:${action.value}`;
      return;
    }

    try {
      await navigator.clipboard.writeText(action.value);
      toast.openToast("복사했어요. 필요한 곳에 붙여넣어 주세요.");
    } catch {
      toast.openToast(action.value);
    }
  }

  function handleReset() {
    setChatEntries([WELCOME_ENTRY]);
    setMessage("");
    setImage(null);
    setConsent(false);
    setSelectedTypeId(null);
  }

  return (
    <main className="app-shell">
      <Top
        title={<Top.TitleParagraph size={22}>{view === "chat" ? "유출·해킹 대응" : "내 대응 현황"}</Top.TitleParagraph>}
      />

      <div style={{ margin: "14px 16px 12px" }}>
        <SegmentedControl value={view} onChange={(v) => setView(v as View)}>
          <SegmentedControl.Item value="chat">대응 시작</SegmentedControl.Item>
          <SegmentedControl.Item value="status">내 대응 현황</SegmentedControl.Item>
        </SegmentedControl>
      </div>

      {view === "chat" ? (
        <>
          <section className="chat-list" aria-label="AI 대응 안내">
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

          {chatEntries.some((e) => e.role === "user") ? (
            <section className="input-panel followup-panel" aria-label="후속 입력">
              <textarea
                className="incident-textarea"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="카드사명이나 추가 상황을 알려주세요."
                rows={2}
              />
              <div className="followup-row">
                <Button variant="weak" onClick={handleReset}>
                  새로 시작
                </Button>
                <Button
                  className="followup-send"
                  disabled={isSubmitting || message.trim().length === 0}
                  loading={isSubmitting}
                  onClick={handleAnalyze}
                >
                  전송
                </Button>
              </div>
            </section>
          ) : (
            <section className="input-panel" aria-label="사고 상황 입력">
              <div className="greeting-lines">
                <p>어떤 유출이 발생했나요?</p>
                <p>상황을 알려주시면 지금 바로 해야 할 행동을 알려드릴게요.</p>
              </div>

              <button
                className="upload-zone"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="camera-icon" aria-hidden="true" />
                <strong>문자 · 알림 캡처 첨부하기</strong>
                <span>받은 문자/이메일 스크린샷을 그대로 올려주세요</span>
              </button>

              <div className="upload-row">
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImage(event.target.files?.[0] ?? null)}
                />
                {image != null && <span className="file-name">{image.name}</span>}
              </div>

              {image != null && (
                <label className="consent-box">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    <b>[필수] 이미지 AI 분석 동의</b>
                    <br />
                    업로드한 이미지는 AI 분석을 위해 외부 AI 서비스(업스테이지)로
                    전송되며, 최대 30일간 보관될 수 있어요. 카드번호·주민번호가 꼭
                    필요한 경우가 아니라면 가려서 올려주세요.
                  </span>
                </label>
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
                  placeholder="예: 신한카드에서 카드정보 유출 안내 문자를 받았어요."
                  rows={4}
                />
              </div>

              <div className="fallback-row">
                <span>사진·설명 없이 바로 고를래요</span>
              </div>

              <div className="type-grid" aria-label="유형 직접 선택">
                {breachTypes.map((type) => (
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

              <Button
                className="primary-cta"
                disabled={isSubmitting}
                loading={isSubmitting}
                onClick={handleAnalyze}
              >
                대응카드 만들기
              </Button>
            </section>
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
      <div className="chat-bubble assistant-bubble">
        <p style={{ whiteSpace: "pre-line" }}>{result.aiMessage}</p>
        <span className="source-pill ai-badge">AI 생성 결과</span>
        {result.source === "local" && <span className="source-pill">로컬 분석</span>}
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
        <Button variant="weak" size="small" onClick={() => void onActionClick(action)}>
          {action.actionType === "tel" ? "전화 걸기" : "링크 복사"}
        </Button>
        <Button
          size="small"
          variant={status === "done" ? "weak" : "primary"}
          onClick={() => void onToggleAction(action)}
        >
          {status === "done" ? "완료됨" : "완료"}
        </Button>
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
      <Button variant="weak" style={{ width: "100%", marginTop: "10px" }} onClick={() => void onActionClick(referral)}>
        전화
      </Button>
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
        <Button variant="weak" size="small" onClick={() => void onRefresh()}>
          새로고침
        </Button>
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

export default App;
