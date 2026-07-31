import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageBackground from "@/components/layouts/PageBackground";
import { ROUTES } from "@/constants/routes";

import ActionListBubble from "./components/ActionListBubble";
import AdStripBubble from "./components/AdStripBubble";
import AssistantRow from "./components/AssistantRow";
import ChatHeader from "./components/ChatHeader";
import ChatInputBar from "./components/ChatInputBar";
import NavMenuBubble from "./components/NavMenuBubble";
import QuickReplyBubble from "./components/QuickReplyBubble";
import SuccessBubble from "./components/SuccessBubble";
import TextBubble from "./components/TextBubble";
import TipBubble from "./components/TipBubble";
import UserBubble from "./components/UserBubble";
import WarningBubble from "./components/WarningBubble";

// TODO: 실제 서비스 계정 정보는 백엔드에서 serviceAccountId로 조회해서 채워주세요.
const SERVICE = { name: "Disney+" };

const ACTION_DEFS = [
  {
    id: "password",
    icon: "password",
    title: "비밀번호 변경하기",
    subtitle: "고유한 비밀번호로 변경",
    link: { title: "비밀번호 변경", url: "disneyplus.com/account/password" },
    ad: {
      text: "비밀번호 하나 뚫리면 어디까지 털릴까?\n3분이면 끝나는 재사용 끊기",
      linkLabel: "카드뉴스",
      href: "#",
    },
  },
  {
    id: "twofactor",
    icon: "twofactor",
    title: "2단계 인증 설정",
    subtitle: "추가 보안 계층 활성화",
    link: { title: "2단계 인증 설정", url: "disneyplus.com/account/security" },
    ad: {
      text: "계정 하나 털리면 어디까지 새어나갈까?\n2단계 인증으로 막아보세요",
      linkLabel: "카드뉴스",
      href: "#",
    },
  },
  {
    id: "logout",
    icon: "logout",
    title: "모든 기기 로그아웃",
    subtitle: "의심 기기 접근 차단",
    link: { title: "모든 기기 로그아웃", url: "disneyplus.com/account/devices" },
    ad: {
      text: "낯선 기기 로그인, 지금 끊어야 안전해요\n의심 기기부터 바로 확인하기",
      linkLabel: "카드뉴스",
      href: "#",
    },
  },
];

function makeActionListPayload(title, completedIds) {
  return {
    kind: "action_list",
    title,
    actions: ACTION_DEFS.map((action) => ({
      id: action.id,
      icon: action.icon,
      title: action.title,
      subtitle: action.subtitle,
      status: completedIds.includes(action.id) ? "done" : "pending",
    })),
  };
}

function nextId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AccountAction() {
  const navigate = useNavigate();
  const { serviceAccountId } = useParams();

  const [messages, setMessages] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [awaitingFollowUp, setAwaitingFollowUp] = useState(false);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState(null);
  const scrollRef = useRef(null);
  const toastTimerRef = useRef(null);

  function showToast(text) {
    setToast(text);
    if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2000);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    // TODO: 백엔드 연동 시 serviceAccountId로 실제 조치 항목/경고 문구를 조회해 오세요.
    setMessages([
      {
        id: nextId(),
        sender: "assistant",
        kind: "warning",
        description: "새로운 기기에서 로그인이 감지되었고,\n다른 사이트와 같은 비밀번호를 사용 중이에요.",
      },
      { id: nextId(), sender: "assistant", ...makeActionListPayload("추천 조치 사항", []) },
      { id: nextId(), sender: "assistant", kind: "text", text: "이 조치들 중 하나부터 시작해 보세요." },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceAccountId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function pushMessage(message) {
    setMessages((prev) => [...prev, { id: nextId(), ...message }]);
  }

  function handleSelectAction(actionId) {
    const action = ACTION_DEFS.find((item) => item.id === actionId);
    if (!action || pendingActionId != null) return;

    navigator.clipboard?.writeText(action.link.url).catch(() => {});
    showToast("복사되었어요!");

    pushMessage({ sender: "user", text: action.title });
    pushMessage({
      sender: "assistant",
      kind: "text",
      text: `${action.link.title} 링크를 복사했어요. ${SERVICE.name} 앱이나 사이트에 붙여넣어 바로 이동해보세요!`,
    });
    pushMessage({ sender: "assistant", kind: "ad_strip", news: action.ad });
    pushMessage({
      sender: "assistant",
      kind: "tip",
      text: "완료 후 다시 돌아오시면, 나머지 조치도 도와드릴게요!",
    });
    pushMessage({ sender: "assistant", kind: "quick_reply" });
    setPendingActionId(actionId);
  }

  function handleQuickReply(choice) {
    if (pendingActionId == null) return;

    if (choice === "done") {
      pushMessage({ sender: "user", text: "조치를 완료했어요!" });

      const updatedCompleted = [...completedIds, pendingActionId];
      setCompletedIds(updatedCompleted);

      const remaining = ACTION_DEFS.filter((action) => !updatedCompleted.includes(action.id));

      if (remaining.length > 0) {
        pushMessage({
          sender: "assistant",
          kind: "text",
          text: `완료! 남은 조치 ${remaining.length}가지 같이 해요.`,
        });
        pushMessage({
          sender: "assistant",
          ...makeActionListPayload("남은 조치 사항", updatedCompleted),
        });
      } else {
        pushMessage({
          sender: "assistant",
          ...makeActionListPayload("모든 조치 완료", updatedCompleted),
        });
        pushMessage({
          sender: "assistant",
          kind: "success",
          serviceName: SERVICE.name,
          description: `${ACTION_DEFS.length}가지 보안 조치를 모두 마쳤어요. 비정상적인 접근이 생기면 바로 알려드릴게요.`,
        });
        pushMessage({
          sender: "assistant",
          kind: "nav_menu",
          items: [
            { id: "home", icon: "home", label: "홈으로 돌아가기" },
            { id: "next-account", icon: "security", label: "다음 계정 보안 조치 하기" },
            { id: "report", icon: "report", label: "보안 리포트 보러 가기" },
          ],
        });
      }
    } else {
      pushMessage({ sender: "user", text: "조치하지 못했어요" });
      pushMessage({
        sender: "assistant",
        kind: "text",
        text: "어떤 부분이 막히셨나요? IDly와 다시 해봐요!",
      });
      setAwaitingFollowUp(true);
    }

    setPendingActionId(null);
  }

  function handleNavMenuSelect(id) {
    if (id === "home") {
      navigate(ROUTES.HOME);
    } else if (id === "report") {
      navigate(ROUTES.SECURITY_ASSISTANT);
    }
    // "next-account"는 백엔드에서 다음 취약 계정을 조회해야 하므로 현재는 별도 동작 없음.
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;

    setInput("");
    pushMessage({ sender: "user", text });

    // TODO: 백엔드 연동 시 이 목업 응답을 실제 API 호출로 교체하세요.
    pushMessage({ sender: "assistant", kind: "text", text: "확인했어요! 곧 도와드릴게요." });
    setAwaitingFollowUp(false);
  }

  function renderAssistantContent(message) {
    switch (message.kind) {
      case "warning":
        return <WarningBubble description={message.description} />;
      case "action_list":
        return (
          <ActionListBubble
            title={message.title}
            actions={message.actions}
            onSelect={handleSelectAction}
          />
        );
      case "ad_strip":
        return <AdStripBubble news={message.news} />;
      case "tip":
        return <TipBubble text={message.text} />;
      case "quick_reply":
        return <QuickReplyBubble onSelect={handleQuickReply} />;
      case "success":
        return <SuccessBubble serviceName={message.serviceName} description={message.description} />;
      case "nav_menu":
        return <NavMenuBubble items={message.items} onSelect={handleNavMenuSelect} />;
      case "text":
      default:
        return <TextBubble text={message.text} />;
    }
  }

  return (
    <PageBackground variant="frost">
      <div className="relative flex h-dvh flex-col">
        <div className="pt-[max(12px,env(safe-area-inset-top))]">
          <ChatHeader title="지금 바로 조치하기" onBack={() => navigate(-1)} />
        </div>

        {toast && (
          <div className="pointer-events-none absolute inset-x-0 bottom-24 z-10 flex justify-center">
            <div
              className="rounded-full bg-[#191f28]/90 px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(16,24,46,0.16)]"
              style={{ borderRadius: "9999px" }}
            >
              {toast}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const isNewTurn = !previous || previous.sender !== message.sender;
            const spacingClass = index === 0 ? "" : isNewTurn ? "mt-4" : "mt-2";

            if (message.sender === "user") {
              return (
                <div key={message.id} className={spacingClass}>
                  <UserBubble text={message.text} />
                </div>
              );
            }

            const showAvatar = !previous || previous.sender !== "assistant";

            return (
              <div key={message.id} className={spacingClass}>
                <AssistantRow showAvatar={showAvatar}>{renderAssistantContent(message)}</AssistantRow>
              </div>
            );
          })}
        </div>

        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder={awaitingFollowUp ? "막힌 부분을 알려주세요" : "메시지를 입력하세요"}
        />
      </div>
    </PageBackground>
  );
}
