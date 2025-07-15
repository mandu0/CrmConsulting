import React, { useState, useEffect } from "react";
import EyeInfoInput from "./CornealCalculation";
import SlideContainer from "./SlideContainer";
import "./App.css";

// 별 위치를 컴포넌트 밖에 고정
const stars = Array.from({ length: 60 }, () => ({
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  animationDuration: `${5 + Math.random() * 5}s`,
  animationDelay: `${Math.random() * 10}s`,
  size: `${Math.random() * 1.5 + 1}px`,
}));

export default function CornealCalculation() {
  const [submittedData, setSubmittedData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="page-wrapper">
      {/* ✅ 날짜 + 홈 버튼 함께 배치 */}
      <div className="date-time-wrapper">
        <button
          className="home-button"
          onClick={() => (window.location.href = "/")}
          aria-label="홈으로"
        >
          <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>

        <div className="date-time-display">{formattedTime}</div>
      </div>

      {/* ⭐ 반짝이는 별들 */}
      {stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDuration: star.animationDuration,
            animationDelay: star.animationDelay,
          }}
        />
      ))}

      {/* 🌠 대각선 유성 */}
      {[...Array(4)].map((_, i) => (
        <div
          key={`meteor-${i}`}
          className="shooting-star"
          style={{
            top: `${Math.random() * 50}%`,
            left: `${Math.random() * 70}%`,
            animationDelay: `${i * 5 + Math.random() * 3}s`,
          }}
        />
      ))}

      {!submittedData ? (
        <EyeInfoInput onSubmit={setSubmittedData} />
      ) : (
        <SlideContainer data={submittedData} />
      )}
    </div>
  );
}
