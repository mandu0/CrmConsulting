import React, { useState, useCallback, useMemo, useEffect } from "react";
import ResultComponent from "./ResultComponent";
import "./SlideContainer.css";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const DonutGauge = React.memo(
  ({ label, targetPercent, color, rank, isQualified, disableReason }) => {
    const [progress, setProgress] = useState(0);

    const finalPercent = useMemo(
      () => (isQualified ? targetPercent : 100),
      [targetPercent, isQualified]
    );

    useEffect(() => {
      let animationFrame;
      let start;
      const duration = 700;

      function animate(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progressPercent = Math.min(
          (elapsed / duration) * finalPercent,
          finalPercent
        );
        setProgress(progressPercent);

        if (elapsed < duration) {
          animationFrame = requestAnimationFrame(animate);
        }
      }

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [finalPercent]);

    return (
      <div className="donut-chart">
        <h4 className="label">{label}</h4>
        <CircularProgressbarWithChildren
          value={progress}
          maxValue={100}
          styles={buildStyles({
            pathColor: isQualified
              ? `rgba(${color}, 0.6)`
              : "rgba(255, 0, 0, 0.6)",
            trailColor: "rgba(255, 255, 255, 0.1)",
          })}
        >
          {isQualified && (
            <div
              className="ShortFall"
              style={{
                fontSize: 18,
                color: "#fff",
                fontWeight: "bold",
                textShadow: "0 0 8px rgba(255,255,255,0.1)",
              }}
            >
              {rank}순위
            </div>
          )}
        </CircularProgressbarWithChildren>
        {!isQualified && disableReason && (
          <div
            className="danger-warning"
            style={{ marginTop: 8, fontWeight: "bold", color: "red" }}
          >
            <span className="eyes" style={{ marginRight: 4 }}>
              {disableReason === "수술 불가" ||
              disableReason.includes("수술 불가")
                ? "❌"
                : "👁️"}
            </span>
            {disableReason}
          </div>
        )}
      </div>
    );
  }
);

export default function SlideContainer({ data }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [residualData, setResidualData] = useState(null);

  const handleResidualCalculated = useCallback(
    (residuals, ablations, exclusionFlags, smile6mm) => {
      setResidualData({
        ...residuals,
        smile6mm,
      });
    },
    []
  );

  const totalSlides = 5;

  const nextPage = useCallback(
    () => setCurrentPage((prev) => (prev + 1) % totalSlides),
    [totalSlides]
  );
  const prevPage = useCallback(
    () => setCurrentPage((prev) => (prev - 1 + totalSlides) % totalSlides),
    [totalSlides]
  );

  const calculatePercent = useCallback((value, max, rank, isQualified) => {
    if (!isQualified || !rank) return 0;
    const baseRatio = value / max;
    if (rank === 1) return 85 + baseRatio * 15;
    if (rank === 2) return 60 + baseRatio * 15;
    if (rank === 3) return 30 + baseRatio * 10;
    return 0;
  }, []);

  const renderEyeRecommendations = useMemo(() => {
    if (!residualData) return null;

    const getRecommendations = (eyeName, smileResiduals, lasikResiduals, smile6mm) => {
      const smileResidual = smileResiduals?.[0];
      const lasikResidual = lasikResiduals?.[1];
      const smileAblation = eyeName === "R" ? smile6mm?.right : smile6mm?.left;
      const myopia = eyeName === "R" ? Number(data.rightMyopia) : Number(data.leftMyopia);

      // 총잔여각막 계산 (threshold 빼기)
      const totalLasikResidual = lasikResidual - 70;         // 라섹
      const totalSmileLasikResidual = smileResidual - 110;   // 스마일 라식
      const totalSmileProResidual = smileResidual - 100;     // 스마일 프로

      // 콘솔 출력
      console.log(`[${eyeName} 눈] 라섹 잔여각막: ${lasikResidual}, 총 잔여각막(라섹-70): ${totalLasikResidual}`);
      console.log(`[${eyeName} 눈] 스마일 잔여각막: ${smileResidual}`);
      console.log(`[${eyeName} 눈] 총 잔여각막(스마일라식-110): ${totalSmileLasikResidual}, 총 잔여각막(스마일프로-100): ${totalSmileProResidual}`);
      console.log(`[${eyeName} 눈] 절삭량: ${smileAblation}, 근시: ${myopia}`);

      const isMyopiaOutOfRange = myopia >= -0.25 || myopia <= -8.5;
      const isAblationTooHigh = smileAblation >= 140;

      const procedures = [
        {
          type: "스마일 프로",
          value: totalSmileProResidual,
          minResidual: 300,
          max: 500,
          ablationTooMuch: isAblationTooHigh,
          myopiaOutOfRange: isMyopiaOutOfRange,
        },
        {
          type: "스마일 라식",
          value: totalSmileLasikResidual,
          minResidual: 310,
          max: 500,
          ablationTooMuch: isAblationTooHigh,
          myopiaOutOfRange: isMyopiaOutOfRange,
        },
        {
          type: "라섹",
          value: totalLasikResidual,
          minResidual: 320,
          max: 500,
          ablationTooMuch: false,
          myopiaOutOfRange: false,
        },
      ];

      const priorityMap = {
        "스마일 프로": 1,
        "스마일 라식": 2,
        "라섹": 3,
      };

      const qualified = procedures
        .filter(
          (p) =>
            p.value != null &&
            p.value >= p.minResidual &&
            !p.ablationTooMuch &&
            !p.myopiaOutOfRange
        )
        .sort((a, b) => {
          const pa = priorityMap[a.type];
          const pb = priorityMap[b.type];
          if (pa !== pb) return pa - pb;
          return b.value - a.value;
        });

      const unqualified = procedures.filter((p) => !qualified.includes(p));

      const sorted = [
        ...qualified.map((p, i) => ({
          ...p,
          isQualified: true,
          displayRank: i + 1,
          disableReason: null,
        })),
        ...unqualified.map((p) => ({
          ...p,
          isQualified: false,
          displayRank: null,
          disableReason: p.ablationTooMuch
            ? "수술 불가 (절삭량 과다)"
            : p.myopiaOutOfRange
            ? "수술 불가 (근시 기준 미충족)"
            : "각막 얇음",
        })),
      ];

      const color = "255, 255, 255";

      return (
        <div className="recommendation-block" key={eyeName}>
          <h3 className="eyeColor">{eyeName}</h3>
          <div className="donut-container">
            {sorted.map((proc) => (
              <DonutGauge
                key={`${eyeName}-${proc.type}`}
                label={proc.type}
                targetPercent={calculatePercent(
                  proc.value - proc.minResidual,
                  proc.max - proc.minResidual,
                  proc.displayRank,
                  proc.isQualified
                )}
                color={color}
                rank={proc.displayRank}
                isQualified={proc.isQualified}
                disableReason={proc.disableReason}
              />
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="recommendation-row">
        {getRecommendations(
          "R",
          residualData.smile.right,
          residualData.lasik.right,
          residualData.smile6mm
        )}
        {getRecommendations(
          "L",
          residualData.smile.left,
          residualData.lasik.left,
          residualData.smile6mm
        )}
      </div>
    );
  }, [residualData, calculatePercent, data.rightMyopia, data.leftMyopia]);

  return (
    <div className="slide-container">
      <button className="slide-btn left" onClick={prevPage}></button>
      <button className="slide-btn right" onClick={nextPage}></button>

      {currentPage === 0 && (
        <div className="slide-page">
          <ResultComponent data={data} onResidualCalculated={handleResidualCalculated} />
        </div>
      )}

      {currentPage === 1 && (
        <div className="slide-page ai-page">
          <div className="background-gif" />
          <div className="content-layer">
            <h2 className="resultTite">AI 수술 추천 결과</h2>
            {renderEyeRecommendations || <p>잔여 각막 데이터를 불러오는 중입니다...</p>}
          </div>
        </div>
      )}

      {currentPage === 2 && (
        <div className="slide-page2">
          <iframe
            className="videoBox"
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/yQczkQz8sKU?autoplay=1&mute=1&modestbranding=1&rel=0"
            title="LASEK 설명 영상"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {currentPage === 3 && (
        <div className="slide-page2">
          <iframe
            className="videoBox"
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/Yui5iXw3QlM?autoplay=1&mute=1&modestbranding=1&rel=0"
            title="LASIK 설명 영상"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {currentPage === 4 && (
        <div className="slide-page2">
          <iframe
            className="videoBox"
            width="100%"
            height="100%"
            src="https://www.youtube.com/embed/Z1kTHTcKGOQ?autoplay=1&mute=1&modestbranding=1&rel=0"
            title="SMILE 설명 영상"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
        </div>
      )}
    </div>
  );
}
