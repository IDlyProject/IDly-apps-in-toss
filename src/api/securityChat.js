const API_BASE_URL = import.meta.env.VITE_IDLY_API_BASE_URL ?? "http://localhost:3001";

// ---------------------------------------------------------------------------
// 백엔드 연동 코드 (준비되면 아래 주석을 해제하고, 하단의 로컬 목업 구현을 제거하세요)
// ---------------------------------------------------------------------------
// export async function getSecurityChat() {
//   const response = await fetch(`${API_BASE_URL}/security-chat`, {
//     credentials: "include",
//     headers: { "X-IDLY-Client": "web" },
//   });
//
//   if (!response.ok) {
//     const error = new Error("보안 채팅 내역을 불러오지 못했어요.");
//     error.status = response.status;
//     throw error;
//   }
//
//   return response.json();
// }
//
// export async function sendSecurityChatMessage(text) {
//   const response = await fetch(`${API_BASE_URL}/security-chat/messages`, {
//     method: "POST",
//     credentials: "include",
//     headers: {
//       "Content-Type": "application/json",
//       "X-IDLY-Client": "web",
//     },
//     body: JSON.stringify({ text }),
//   });
//
//   if (!response.ok) {
//     const error = new Error("메시지를 보내지 못했어요.");
//     error.status = response.status;
//     throw error;
//   }
//
//   return response.json();
// }

// ---------------------------------------------------------------------------
// 프론트 단독 확인용 로컬 목업 (백엔드 연동 전까지 사용, 연동 후 제거 예정)
// ---------------------------------------------------------------------------
void API_BASE_URL;

let mockMessages = [
  {
    id: "mock-welcome",
    role: "assistant",
    type: "action_list",
    text: "조치가 필요한 항목",
    metadata: {
      actionList: {
        items: [
          {
            id: "disneyplus",
            actionTitle: "지금 바로 조치하기",
            serviceName: "Disney+",
            status: "pending",
            serviceAccountId: "disneyplus",
          },
        ],
      },
    },
  },
];

export async function getSecurityChat() {
  return { messages: mockMessages };
}

export async function sendSecurityChatMessage(text) {
  mockMessages = [
    ...mockMessages,
    { id: `mock-${Date.now()}`, role: "user", type: "text", text },
    {
      id: `mock-reply-${Date.now()}`,
      role: "assistant",
      type: "text",
      text: "확인했어요! 곧 도와드릴게요.",
    },
  ];
  return { ok: true };
}
