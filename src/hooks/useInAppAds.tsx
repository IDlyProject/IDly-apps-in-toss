import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useToast } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";

interface Reward {
  unitType: string;
  unitAmount: number;
}

interface UseInAppAdsReturn {
  isAdLoaded: boolean;
  isSupported: boolean;
  showAd: () => void;
  lastReward: Reward | null;
}

// 참고문서: https://developers-apps-in-toss.toss.im/ads/intro.html
export function useInAppAds(adGroupId: string): UseInAppAdsReturn {
  const toast = useToast();

  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [lastReward, setLastReward] = useState<Reward | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  /**
   * 광고를 로드합니다.
   */
  const load = useCallback(() => {
    setIsAdLoaded(false);

    try {
      unregisterRef.current = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type === "loaded") {
            setIsAdLoaded(true);
          }
        },
        onError: (error) => {
          console.error("광고 로드 실패:", error);
        },
      });
    } catch (error) {
      console.error("광고 로드 실패:", error);
      setIsAdLoaded(false);
    }
  }, [adGroupId]);

  useEffect(() => {
    try {
      const supported = loadFullScreenAd.isSupported();
      setIsSupported(supported);

      if (supported) {
        load();
      }
    } catch (error) {
      console.info("현재 환경에서는 인앱 광고가 지원되지 않습니다.", error);
      setIsSupported(false);
    }

    return () => {
      try {
        unregisterRef.current?.();
      } catch (error) {
        console.error("광고 정리(cleanup) 중 에러:", error);
      }
    };
  }, [load]);

  /**
   * 광고를 실제로 화면에 표시합니다.
   * - 지원되지 않는 환경이거나, 아직 로드되지 않은 경우에는 아무 동작도 하지 않습니다.
   */
  const showAd = useCallback(() => {
    if (!isSupported) {
      console.info("현재 환경에서는 인앱 광고가 지원되지 않습니다.");
      return;
    }

    if (!isAdLoaded) {
      console.info("아직 광고가 로드되지 않았습니다.");
      return;
    }

    try {
      showFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          switch (event.type) {
            case "userEarnedReward":
              toast.openToast(
                `보상 획득: ${event.data.unitType} ${event.data.unitAmount}개`,
              );
              setLastReward(event.data);
              break;
            case "dismissed":
              setIsAdLoaded(false);
              load();
              break;
            case "failedToShow":
              console.error("광고 표시 실패");
              setIsAdLoaded(false);
              // 실패한 경우에도 다시 로드를 시도해 다음 기회를 준비합니다.
              load();
              break;
          }
        },
        onError: (error) => {
          console.error("광고 표시 실패:", error);
          setIsAdLoaded(false);
          load();
        },
      });
    } catch (error) {
      console.error("광고 표시 실패:", error);
      setIsAdLoaded(false);
      load();
    }
  }, [adGroupId, isAdLoaded, isSupported, load, toast]);

  return { isAdLoaded, isSupported, showAd, lastReward };
}
