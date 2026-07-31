import { useEffect, useRef, useState } from "react";

import { useTossBanner } from "../hooks/useTossBanner";

export function TossBannerAd() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isInitialized, isSupported, attachBanner } = useTossBanner();
  const [isVisible, setIsVisible] = useState(true);
  const adGroupId = import.meta.env.VITE_TOSS_BANNER_AD_GROUP_ID;

  useEffect(() => {
    if (adGroupId == null || adGroupId.length === 0 || !isInitialized || !isSupported || containerRef.current == null) {
      return;
    }

    setIsVisible(true);

    const attached = attachBanner(adGroupId, containerRef.current, {
      theme: "auto",
      tone: "blackAndWhite",
      variant: "expanded",
      callbacks: {
        onAdRendered: (payload) => {
          console.info("배너 광고 렌더링 완료:", payload.slotId);
        },
        onAdImpression: (payload) => {
          console.info("배너 광고 노출:", payload.slotId);
        },
        onAdViewable: (payload) => {
          console.info("배너 광고 수익 노출 기록:", payload.slotId);
        },
        onAdClicked: (payload) => {
          console.info("배너 광고 클릭:", payload.slotId);
        },
        onNoFill: (payload) => {
          console.info("표시할 배너 광고가 없습니다:", payload.slotId);
          setIsVisible(false);
        },
        onAdFailedToRender: (payload) => {
          console.error("배너 광고 렌더링 실패:", payload.error.message);
          setIsVisible(false);
        },
      },
    });

    return () => {
      attached?.destroy();
    };
  }, [adGroupId, attachBanner, isInitialized, isSupported]);

  if (adGroupId == null || adGroupId.length === 0 || !isSupported || !isVisible) {
    return null;
  }

  return (
    <div className="banner-ad-slot" aria-label="광고">
      <div ref={containerRef} className="banner-ad-target" />
    </div>
  );
}
