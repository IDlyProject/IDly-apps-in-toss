import {
  Component,
  type ErrorInfo,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Analytics } from "@apps-in-toss/web-analytics";
import { ArrowRight, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";

import { TossBannerAd } from "./components/TossBannerAd";
import {
  type ActionItem,
  type ActionStatus,
  type AnalyzeResult,
  type SpecialistReferral,
  type UserActionLog,
  analyzeIncident,
  getMyActions,
  setActionStatus,
} from "./api/idlyApi";
import TopNavBar from "./components/TopNavBar";
import { ROUTES } from "./constants/routes";
import ActionListBubble from "./pages/AccountAction/components/ActionListBubble";
import AssistantRow from "./pages/AccountAction/components/AssistantRow";
import ChatInputBar from "./pages/AccountAction/components/ChatInputBar";
import NavMenuBubble from "./pages/AccountAction/components/NavMenuBubble";
import QuickReplyBubble from "./pages/AccountAction/components/QuickReplyBubble";
import SuccessBubble from "./pages/AccountAction/components/SuccessBubble";
import TextBubble from "./pages/AccountAction/components/TextBubble";
import TipBubble from "./pages/AccountAction/components/TipBubble";
import TypingIndicator from "./pages/AccountAction/components/TypingIndicator";
import UserBubble from "./pages/AccountAction/components/UserBubble";
import "./App.css";

type NavMenuItem = { id: string; icon: string; label: string };
type ChatEntry =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; result: AnalyzeResult; incidentTitle: string }
  | { id: string; role: "assistant"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "tip"; text: string }
  | { id: string; role: "assistant"; kind: "quick_reply"; actionId: string }
  | { id: string; role: "assistant"; kind: "success"; title: string; description: string }
  | { id: string; role: "assistant"; kind: "nav_menu"; items: NavMenuItem[] }
  | { id: string; role: "assistant"; kind: "remaining_actions"; title: string; actions: ActionItem[] };

const MAX_TEXT_LENGTH = 2_000;
const TYPING_DELAY_MS = 650;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current != null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [chatEntries, setChatEntries] = useState<ChatEntry[]>([]);
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({});
  const [statusLogs, setStatusLogs] = useState<UserActionLog[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingQuickReplyActionId, setPendingQuickReplyActionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const didLoadInitialData = useRef(false);
  const processedLocationState = useRef<unknown>(null);

  const hasUserEntries = chatEntries.some((entry) => entry.role === "user");
  const hasExternalAiInput = message.trim().length > 0;

  useEffect(() => {
    if (didLoadInitialData.current) return;
    didLoadInitialData.current = true;
    void loadInitialData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatEntries]);

  // /report(IncidentIntakePage)에서 제출 완료 후 navigate(state)로 넘어온 결과를 채팅에 반영
  useEffect(() => {
    const submitted = location.state as { userText?: string; result?: AnalyzeResult } | null;
    if (submitted?.result == null) return;

    // StrictMode가 개발 모드에서 이 effect를 동일한 location.state로 두 번 호출하는 걸 방지
    if (processedLocationState.current === location.state) return;
    processedLocationState.current = location.state;

    setChatEntries((entries) => [
      ...entries,
      { id: crypto.randomUUID(), role: "user", text: submitted.userText ?? "" },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        result: submitted.result!,
        incidentTitle: submitted.userText ?? "제출한 상황",
      },
    ]);
    navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // actionStatuses는 "이번 대응"에서만 유효한 세션 상태예요 — DB에 남아있는 과거 완료 기록과는
  // 별개로, 새로 시작한 대응의 조치는 항상 미완료(pending)로 보여줘야 해서 여기서 채우지 않아요.
  async function loadInitialData() {
    void getMyActions()
      .then((logs) => setStatusLogs(logs))
      .catch(() => {
        // 로그 로드 실패해도 채팅·분석은 정상 동작
      });
  }

  async function refreshStatusLogs() {
    try {
      const logs = await getMyActions();
      setStatusLogs(logs);
    } catch (error) {
      showToast(getErrorMessage(error));
    }
  }

  async function handleAnalyze() {
    if (isSubmitting) {
      return;
    }

    if (message.trim().length === 0) {
      showToast("추가로 알려주실 내용을 입력해주세요.");
      return;
    }

    if (message.trim().length > MAX_TEXT_LENGTH) {
      showToast(`상황 설명은 ${MAX_TEXT_LENGTH}자 이내로 입력해 주세요.`);
      return;
    }

    setIsSubmitting(true);
    Analytics.click({
      log_name: "analysis_start",
      breach_type: "none",
      has_image: false,
      has_text: message.trim().length > 0,
    });

    const userText = message.trim();

    setChatEntries((entries) => [
      ...entries,
      { id: crypto.randomUUID(), role: "user", text: userText },
    ]);
    setIsTyping(true);

    try {
      const [result] = await Promise.all([
        analyzeIncident({
          text: message,
          image: null,
          selectedTypeId: null,
          consentToExternalAI: consent,
        }),
        wait(TYPING_DELAY_MS),
      ]);

      setChatEntries((entries) => [
        ...entries,
        { id: crypto.randomUUID(), role: "assistant", result, incidentTitle: userText },
      ]);
      Analytics.impression({
        log_name: "analysis_complete",
        action_count: result.actions.length,
        confidence: result.confidence,
        source: result.source,
      });
      setMessage("");
      setConsent(false);
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setIsTyping(false);
      setIsSubmitting(false);
    }
  }

  // 여러 말풍선을 한 번에 쏟아내지 않고, 진짜 챗봇처럼 "입력 중" 표시 후 한 개씩 순서대로 보여줘요.
  async function pushAssistantEntry(entry: ChatEntry) {
    setIsTyping(true);
    await wait(TYPING_DELAY_MS);
    setIsTyping(false);
    setChatEntries((entries) => [...entries, entry]);
  }

  async function applyActionStatus(
    actionId: string,
    nextStatus: ActionStatus,
    incidentId: string,
    incidentTitle: string,
  ) {
    const previousStatus = actionStatuses[actionId] ?? "pending";
    setActionStatuses((statuses) => ({ ...statuses, [actionId]: nextStatus }));

    try {
      await setActionStatus({ actionId, status: nextStatus, incidentId, incidentTitle });
      await refreshStatusLogs();
    } catch (error) {
      setActionStatuses((statuses) => ({ ...statuses, [actionId]: previousStatus }));
      showToast(getErrorMessage(error));
    }
  }

  async function handleActionSelect(action: ActionItem | SpecialistReferral) {
    const isTel = action.actionType === "tel";

    try {
      await navigator.clipboard.writeText(action.value);
      showToast(isTel ? "전화번호가 복사됐어요. 전화를 연결할게요!" : "복사되었어요!");
    } catch {
      showToast(action.value);
    }

    if (isTel) {
      window.location.href = `tel:${action.value}`;
    }

    // ActionItem에만 id가 있음 — SpecialistReferral은 완료 상태를 추적하지 않음
    if (!("id" in action)) return;

    const owningEntry = findResultEntryForAction(action.id);
    const hasOtherActions = owningEntry != null && owningEntry.result.actions.length > 1;

    setChatEntries((entries) => [
      ...entries,
      { id: crypto.randomUUID(), role: "user", text: action.title },
    ]);

    await pushAssistantEntry({
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "text",
      text: isTel
        ? `${action.title} 전화번호(${action.value})로 연결할게요. 통화 후 다시 알려주세요!`
        : `${action.title} 링크를 복사했어요. 사이트나 앱에 붙여넣어 바로 이동해보세요!`,
    });
    if (hasOtherActions) {
      await pushAssistantEntry({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "tip",
        text: "완료 후 다시 알려주시면, 나머지 조치도 도와드릴게요!",
      });
    }
    await pushAssistantEntry({
      id: crypto.randomUUID(),
      role: "assistant",
      kind: "quick_reply",
      actionId: action.id,
    });

    setPendingQuickReplyActionId(action.id);
  }

  function findResultEntryForAction(
    actionId: string,
  ): { id: string; result: AnalyzeResult; incidentTitle: string } | null {
    for (const entry of chatEntries) {
      if ("result" in entry && entry.result.actions.some((action) => action.id === actionId)) {
        return entry;
      }
    }
    return null;
  }

  async function handleQuickReply(actionId: string, choice: "done" | "failed") {
    if (pendingQuickReplyActionId !== actionId) return;
    setPendingQuickReplyActionId(null);

    if (choice === "done") {
      const owningEntry = findResultEntryForAction(actionId);

      setChatEntries((entries) => [
        ...entries,
        { id: crypto.randomUUID(), role: "user", text: "조치를 완료했어요!" },
      ]);
      await applyActionStatus(
        actionId,
        "done",
        owningEntry?.id ?? "unknown",
        owningEntry?.incidentTitle ?? "기타 보안 조치",
      );

      const result = owningEntry?.result ?? null;
      const updatedStatuses = { ...actionStatuses, [actionId]: "done" as ActionStatus };
      const allDone =
        result != null && result.actions.every((action) => updatedStatuses[action.id] === "done");

      if (allDone) {
        await pushAssistantEntry({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "success",
          title: "추천 조치를 모두 완료했어요!",
          description: "수고하셨어요.",
        });
        await pushAssistantEntry({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "nav_menu",
          items: [
            { id: "status", icon: "security", label: "내 대응 현황 보러가기" },
            { id: "new", icon: "home", label: "새로운 대응 만들기" },
          ],
        });
      } else if (result != null) {
        const remaining = result.actions.filter((action) => updatedStatuses[action.id] !== "done");
        await pushAssistantEntry({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "text",
          text: `완료! 남은 조치 ${remaining.length}가지 같이 해요.`,
        });
        await pushAssistantEntry({
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "remaining_actions",
          title: "남은 조치 사항",
          actions: remaining,
        });
      }
    } else {
      setChatEntries((entries) => [
        ...entries,
        { id: crypto.randomUUID(), role: "user", text: "조치하지 못했어요" },
      ]);
      await pushAssistantEntry({
        id: crypto.randomUUID(),
        role: "assistant",
        kind: "text",
        text: "어떤 부분이 막히셨나요? 다시 도와드릴게요!",
      });
    }
  }

  function handleContinueIncident(incidentId: string) {
    navigate(ROUTES.CHAT);
    requestAnimationFrame(() => {
      const target = document.getElementById(incidentId);
      if (target != null) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        showToast("이 대응은 새로고침되어 채팅에서 이어갈 수 없어요. 새로 시작해주세요.");
      }
    });
  }

  function handleNavMenuSelect(id: string) {
    if (id === "status") {
      navigate(ROUTES.RECORDS);
    } else if (id === "new") {
      handleReset();
    }
  }

  function handleReset() {
    navigate(ROUTES.HOME);
  }

  const outletContext: ChatOutletContext = {
    chatEntries,
    actionStatuses,
    statusLogs,
    message,
    consent,
    isSubmitting,
    isTyping,
    hasUserEntries,
    hasExternalAiInput,
    chatEndRef,
    setMessage,
    setConsent,
    handleAnalyze,
    handleActionSelect,
    handleQuickReply,
    handleNavMenuSelect,
    handleContinueIncident,
  };

  return (
    <main className="app-shell">
      {toastMsg != null && <div className="simple-toast">{toastMsg}</div>}

      <TopNavBar />
      <TossBannerAd />

      <Outlet context={outletContext} />
    </main>
  );
}

interface ChatOutletContext {
  chatEntries: ChatEntry[];
  actionStatuses: Record<string, ActionStatus>;
  statusLogs: UserActionLog[];
  message: string;
  consent: boolean;
  isSubmitting: boolean;
  isTyping: boolean;
  hasUserEntries: boolean;
  hasExternalAiInput: boolean;
  chatEndRef: Ref<HTMLDivElement>;
  setMessage: (value: string) => void;
  setConsent: (value: boolean) => void;
  handleAnalyze: () => Promise<void>;
  handleActionSelect: (action: ActionItem | SpecialistReferral) => Promise<void>;
  handleQuickReply: (actionId: string, choice: "done" | "failed") => Promise<void>;
  handleNavMenuSelect: (id: string) => void;
  handleContinueIncident: (incidentId: string) => void;
}

export function ChatTab() {
  const navigate = useNavigate();
  const {
    chatEntries,
    actionStatuses,
    message,
    consent,
    isSubmitting,
    isTyping,
    hasUserEntries,
    hasExternalAiInput,
    chatEndRef,
    setMessage,
    setConsent,
    handleAnalyze,
    handleActionSelect,
    handleQuickReply,
    handleNavMenuSelect,
  } = useOutletContext<ChatOutletContext>();

  return (
    <div className="chat-view-body">
      <section className="chat-list chat-list-scrollable relative" aria-label="AI 대응 안내">
        {chatEntries.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/owl-large.png" alt="" className="h-40 w-40 object-contain opacity-90" />
          </div>
        )}
        {chatEntries.map((entry, index) => {
          if (entry.role === "user") {
            return <UserBubble key={entry.id} text={entry.text} />;
          }

          const previous = chatEntries[index - 1];
          const showAvatar = previous == null || previous.role !== "assistant";

          if ("result" in entry) {
            return (
              <div key={entry.id} id={entry.id}>
                <AssistantBubble
                  result={entry.result}
                  statuses={actionStatuses}
                  onActionSelect={handleActionSelect}
                  showAvatar={showAvatar}
                />
              </div>
            );
          }

          return (
            <AssistantRow key={entry.id} showAvatar={showAvatar}>
              {entry.kind === "text" && <TextBubble text={entry.text} />}
              {entry.kind === "tip" && <TipBubble text={entry.text} />}
              {entry.kind === "success" && (
                <SuccessBubble title={entry.title} description={entry.description} />
              )}
              {entry.kind === "quick_reply" && (
                <QuickReplyBubble
                  onSelect={(choice: "done" | "failed") =>
                    void handleQuickReply(entry.actionId, choice)
                  }
                />
              )}
              {entry.kind === "nav_menu" && (
                <NavMenuBubble items={entry.items} onSelect={handleNavMenuSelect} />
              )}
              {entry.kind === "remaining_actions" && (
                <ActionListBubble
                  title={entry.title}
                  actions={entry.actions.map((action) => ({
                    id: action.id,
                    icon: action.actionType === "tel" ? "tel" : "copy",
                    title: action.title,
                    subtitle: action.description,
                    status: actionStatuses[action.id] ?? "pending",
                  }))}
                  onSelect={(id: string) => {
                    const action = entry.actions.find((item) => item.id === id);
                    if (action) void handleActionSelect(action);
                  }}
                />
              )}
            </AssistantRow>
          );
        })}
        {isTyping && <TypingIndicator />}
        <div ref={chatEndRef} />
      </section>

      {hasUserEntries ? (
        <section aria-label="후속 입력">
          {hasExternalAiInput && (
            <div className="px-4 pb-2">
              <ExternalAiConsent checked={consent} imageAttached={false} onChange={setConsent} />
            </div>
          )}
          <ChatInputBar
            value={message}
            onChange={setMessage}
            onSend={handleAnalyze}
            disabled={isSubmitting}
            placeholder="카드사명이나 추가 상황을 알려주세요."
          />
        </section>
      ) : (
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
            style={{ borderRadius: "16px" }}
          >
            <p className="text-[15px] font-bold text-[#191f28]">어떤 유출이 발생했나요?</p>
            <p
              className="mt-2.5 text-[13px] font-medium leading-relaxed text-[#8b95a1]"
              style={{ marginTop: "10px" }}
            >
              문자 캡처를 올리거나 상황을 설명하면 바로 대응카드를 만들어드려요.
            </p>
            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full bg-[#08257e] py-3.5 text-[14px] font-bold text-white"
              style={{ borderRadius: "9999px", marginTop: "24px" }}
            >
              지금 확인하기
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RecordsTab() {
  const { chatEntries, actionStatuses, statusLogs, handleContinueIncident } =
    useOutletContext<ChatOutletContext>();

  return (
    <StatusView
      chatEntries={chatEntries}
      actionStatuses={actionStatuses}
      statusLogs={statusLogs}
      onContinue={handleContinueIncident}
    />
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
  onActionSelect,
  showAvatar,
}: {
  result: AnalyzeResult;
  statuses: Record<string, ActionStatus>;
  onActionSelect: (action: ActionItem | SpecialistReferral) => Promise<void>;
  showAvatar: boolean;
}) {
  const isReferral = result.safetyFlag === "refer_to_specialist";

  const referralItems = (result.specialistReferrals ?? []).map((referral) => ({
    id: referral.title,
    icon: referral.actionType === "tel" ? "tel" : "copy",
    title: referral.title,
    subtitle: referral.description,
    status: "pending" as ActionStatus,
  }));

  const actionItems = result.actions.map((action) => ({
    id: action.id,
    icon: action.actionType === "tel" ? "tel" : "copy",
    title: action.title,
    subtitle: action.description,
    status: statuses[action.id] ?? "pending",
  }));

  return (
    <AssistantRow showAvatar={showAvatar}>
      <div className="space-y-2.5">
        <TextBubble text={result.aiMessage} />

        {isReferral
          ? referralItems.length > 0 && (
              <ActionListBubble
                title="지금 연락할 곳"
                actions={referralItems}
                onSelect={(id: string) => {
                  const referral = result.specialistReferrals?.find((item) => item.title === id);
                  if (referral) void onActionSelect(referral);
                }}
              />
            )
          : actionItems.length > 0 && (
              <ActionListBubble
                title="추천 조치 사항"
                actions={actionItems}
                onSelect={(id: string) => {
                  const action = result.actions.find((item) => item.id === id);
                  if (action) void onActionSelect(action);
                }}
              />
            )}

        {result.clarifyingQuestion != null && <TextBubble text={result.clarifyingQuestion} />}
      </div>
    </AssistantRow>
  );
}

interface IncidentGroupRow {
  actionItemId: string;
  title: string;
  status: ActionStatus;
  completedAt: string | null;
}

interface IncidentGroup {
  key: string;
  label: string;
  rows: IncidentGroupRow[];
}

// 각 채팅(대응)에서 추천된 조치 전체 목록은 서버가 아니라 이 세션의 chatEntries에만 있어요.
// statusLogs(서버/메모리 기록)에는 사용자가 실제로 클릭해본 조치만 남기 때문에,
// 아직 손대지 않은 "대기중" 조치까지 보여주려면 chatEntries를 기준으로 합쳐야 해요.
function buildIncidentGroups(
  chatEntries: ChatEntry[],
  actionStatuses: Record<string, ActionStatus>,
  statusLogs: UserActionLog[],
): IncidentGroup[] {
  const groups: IncidentGroup[] = [];
  const coveredIncidentIds = new Set<string>();

  for (const entry of chatEntries) {
    if (!("result" in entry) || entry.result.actions.length === 0) continue;

    const rows: IncidentGroupRow[] = entry.result.actions.map((action) => {
      const status = actionStatuses[action.id] ?? "pending";
      const matchingLog = statusLogs.find(
        (log) => log.actionItemId === action.id && log.incidentId === entry.id,
      );
      return {
        actionItemId: action.id,
        title: action.title,
        status,
        completedAt: matchingLog?.completedAt ?? null,
      };
    });

    coveredIncidentIds.add(entry.id);
    groups.push({ key: entry.id, label: entry.incidentTitle, rows });
  }

  // 새로고침 전 세션 등, 현재 chatEntries에는 없지만 서버에 기록만 남아있는 과거 대응
  const pastGroupsByKey = new Map<string, IncidentGroup>();
  for (const log of statusLogs) {
    if (coveredIncidentIds.has(log.incidentId)) continue;

    const row: IncidentGroupRow = {
      actionItemId: log.actionItemId,
      title: log.action.title,
      status: log.status,
      completedAt: log.completedAt,
    };

    const existing = pastGroupsByKey.get(log.incidentId);
    if (existing != null) {
      existing.rows.push(row);
    } else {
      pastGroupsByKey.set(log.incidentId, { key: log.incidentId, label: log.incidentTitle, rows: [row] });
    }
  }

  for (const group of [...groups, ...pastGroupsByKey.values()]) {
    group.rows.sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : 1));
  }

  // 최근 채팅이 위로 오도록 뒤집고, 과거 기록은 그 아래에 붙임
  return [...groups].reverse().concat([...pastGroupsByKey.values()].reverse());
}

function StatusView({
  chatEntries,
  actionStatuses,
  statusLogs,
  onContinue,
}: {
  chatEntries: ChatEntry[];
  actionStatuses: Record<string, ActionStatus>;
  statusLogs: UserActionLog[];
  onContinue: (incidentId: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const groups = buildIncidentGroups(chatEntries, actionStatuses, statusLogs);
  const allRows = groups.flatMap((group) => group.rows);
  const doneCount = allRows.filter((row) => row.status === "done").length;
  const pendingCount = allRows.filter((row) => row.status === "pending").length;

  function toggleGroup(key: string) {
    setExpanded((current) => ({ ...current, [key]: !(current[key] ?? true) }));
  }

  return (
    <section className="status-panel" aria-label="내 대응 현황">
      <div
        className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, #0b1a52 0%, #2454d8 100%)", borderRadius: "20px" }}
      >
        <p className="text-[14px] font-bold text-white">이번 달 보안 조치</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/10 py-4 text-center" style={{ borderRadius: "16px" }}>
            <CheckCircle2 size={22} className="mx-auto text-[#43d97b]" />
            <p className="mt-2 text-[26px] font-extrabold text-white">{doneCount}</p>
            <p className="mt-0.5 text-[12px] font-medium text-white/70">완료</p>
          </div>
          <div className="rounded-2xl bg-white/10 py-4 text-center" style={{ borderRadius: "16px" }}>
            <Loader2 size={22} className="mx-auto text-[#f2c94c]" />
            <p className="mt-2 text-[26px] font-extrabold text-white">{pendingCount}</p>
            <p className="mt-0.5 text-[12px] font-medium text-white/70">진행중</p>
          </div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state mt-4">아직 저장된 대응 항목이 없어요.</div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {groups.map((group) => {
            const isExpanded = expanded[group.key] ?? true;
            const doneInGroup = group.rows.filter((row) => row.status === "done").length;
            const allDoneInGroup = doneInGroup === group.rows.length;

            return (
              <div
                key={group.key}
                className="rounded-2xl bg-white shadow-[0_1px_2px_rgba(16,24,46,0.04)]"
                style={{ borderRadius: "16px" }}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-bold text-[#191f28]">{group.label}</span>
                    <span
                      className={`block text-[13px] font-medium ${
                        allDoneInGroup ? "text-[#43a047]" : "text-[#8b95a1]"
                      }`}
                    >
                      {allDoneInGroup ? "모든 조치 완료" : `${doneInGroup}/${group.rows.length}건 완료`}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-[#b0b8c1] transition-transform ${isExpanded ? "" : "rotate-180"}`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-[#f0f1f4]">
                    {group.rows.map((row, index) => (
                      <button
                        key={row.actionItemId}
                        type="button"
                        onClick={() => onContinue(group.key)}
                        className={`flex w-full items-center gap-2.5 px-4 py-3.5 text-left active:bg-[#f8f9fb] ${
                          index < group.rows.length - 1 ? "border-b border-[#f5f6f8]" : ""
                        }`}
                      >
                        {row.status === "done" ? (
                          <CheckCircle2 size={16} className="shrink-0 text-[#43a047]" />
                        ) : (
                          <span className="h-4 w-4 shrink-0 rounded-full border-2 border-dashed border-[#d1d6db]" />
                        )}
                        <span className="min-w-0 flex-1 break-words text-[14px] font-medium text-[#191f28]">
                          {row.title}
                        </span>
                        <span
                          className={`shrink-0 text-[12px] font-medium ${
                            row.status === "done" ? "text-[#8b95a1]" : "text-[#b0b8c1]"
                          }`}
                        >
                          {row.status === "done" ? `${formatDate(row.completedAt)} 완료` : "대기중"}
                        </span>
                        <ChevronDown size={14} className="-rotate-90 shrink-0 text-[#d1d6db]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
