import {
  TossAds,
  type TossAdsAttachBannerOptions,
  type TossAdsAttachBannerResult,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useState } from "react";

let initializeStarted = false;
let initializeCompleted = false;

interface UseTossBannerReturn {
  isInitialized: boolean;
  isSupported: boolean;
  attachBanner: (
    adGroupId: string,
    element: HTMLElement,
    options?: TossAdsAttachBannerOptions,
  ) => TossAdsAttachBannerResult | undefined;
}

export function useTossBanner(): UseTossBannerReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(initializeCompleted);

  useEffect(() => {
    try {
      if (!TossAds.initialize.isSupported()) {
        setIsSupported(false);
        return;
      }

      setIsSupported(true);

      if (initializeCompleted) {
        setIsInitialized(true);
        return;
      }

      if (initializeStarted) {
        return;
      }

      initializeStarted = true;
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            initializeCompleted = true;
            setIsInitialized(true);
          },
          onInitializationFailed: (error) => {
            initializeStarted = false;
            initializeCompleted = false;
            setIsInitialized(false);
            console.error("Toss Ads SDK 초기화 실패:", error);
          },
        },
      });
    } catch (error) {
      setIsSupported(false);
      setIsInitialized(false);
      console.info("현재 환경에서는 배너 광고가 지원되지 않습니다.", error);
    }
  }, []);

  const attachBanner = useCallback(
    (
      adGroupId: string,
      element: HTMLElement,
      options?: TossAdsAttachBannerOptions,
    ) => {
      if (!isInitialized || !TossAds.attachBanner.isSupported()) {
        return undefined;
      }

      return TossAds.attachBanner(adGroupId, element, options);
    },
    [isInitialized],
  );

  return { isInitialized, isSupported, attachBanner };
}
