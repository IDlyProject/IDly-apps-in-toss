import { ClipboardList, FilePlus2, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function TopNavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const active =
    pathname === ROUTES.RECORDS ? "records" : pathname === ROUTES.CHAT ? "chat" : "create";

  return (
    <nav className="top-nav-bar" aria-label="주요 메뉴">
      <button
        type="button"
        className={active === "create" ? "top-nav-btn active" : "top-nav-btn"}
        onClick={() => navigate(ROUTES.HOME)}
      >
        <FilePlus2 size={20} />
        <span>대응 생성</span>
      </button>
      <button
        type="button"
        className={active === "chat" ? "top-nav-btn active" : "top-nav-btn"}
        onClick={() => navigate(ROUTES.CHAT)}
      >
        <MessageCircle size={20} />
        <span>대응 시작</span>
      </button>
      <button
        type="button"
        className={active === "records" ? "top-nav-btn active" : "top-nav-btn"}
        onClick={() => navigate(ROUTES.RECORDS)}
      >
        <ClipboardList size={20} />
        <span>대응 기록</span>
      </button>
    </nav>
  );
}
