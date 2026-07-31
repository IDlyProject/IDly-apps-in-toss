import { TossAds } from "@apps-in-toss/web-framework";
import { useEffect, useRef } from "react";

// TODO: 서비스를 출시하기 전에 앱인토스 콘솔에서 발급한 광고그룹ID로 변경해주세요.
const TEST_BANNER_AD_GROUP_ID = "ait-ad-test-banner-id";

export default function InAppAdBanner() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const destroyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (containerRef.current == null) return;

    try {
      if (!TossAds.attachBanner.isSupported()) return;

      const { destroy } = TossAds.attachBanner(TEST_BANNER_AD_GROUP_ID, containerRef.current, {
        theme: "light",
      });
      destroyRef.current = destroy;
    } catch (error) {
      console.info("현재 환경에서는 배너 광고를 사용할 수 없어요.", error);
    }

    return () => {
      try {
        destroyRef.current?.();
      } catch (error) {
        console.error("배너 광고 정리(cleanup) 중 에러:", error);
      }
      destroyRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="mx-4 mt-2 empty:hidden" />;
}
