import React, { useState, useRef } from "react";
import "../src/cornealCalculation.css";

export default function EyeInfoInput({ onSubmit }) {
  const [formData, setFormData] = useState({
    leftCornealThickness: "",
    leftMyopia: "",
    leftAstigmatism: "",
    leftPupilSize: "",
    leftTargetVision: "",
    rightCornealThickness: "",
    rightMyopia: "",
    rightAstigmatism: "",
    rightPupilSize: "",
    rightTargetVision: "",
  });

  const [errors, setErrors] = useState({});
  const [showError, setShowError] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRefs = useRef([]);

  const validValueList = [
    0.0, -0.25, -0.5, -0.75, -1.0, -1.25, -1.5, -1.75, -2.0, -2.25, -2.5, -2.75, -3.0,
    -3.25, -3.5, -3.75, -4.0, -4.25, -4.5, -4.75, -5.0, -5.25, -5.5, -5.75,
    -6.0, -6.25, -6.5, -6.75, -7.0, -7.25, -7.5, -7.75, -8.0, -8.25, -8.5,
    -8.75, -9.0, -9.25, -9.5, -9.75, -10.0, -10.25, -10.5, -10.75, -11.0, -11.25,
    -11.5, -11.75, -12.0
  ];
  const validValuesSet = new Set(validValueList);

  const formatNegativeDecimal = (value) => {
    if (value === "") return "";
    let num = Number(value);
    if (isNaN(num)) return "";
    if (num > 0) num = -num / 100;
    return num.toFixed(2);
  };

  const formatPupilSize = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "";
    return (num > 10 ? num / 10 : num).toFixed(1);
  };

  // 목표 시력 입력 형식 포맷
  const formatTargetVision = (val) => {
    if (!val) return "";

    // 10 → 1.0, 12 → 1.2 자동 변환
    if (/^\d{2}$/.test(val)) {
      const intVal = parseInt(val, 10);
      return (intVal / 10).toFixed(1);
    }

    // 10-1 → 1.0-1, 12-2 → 1.2-2
    if (/^\d{2}-\d$/.test(val)) {
      const [main, sub] = val.split("-");
      const formattedMain = (parseInt(main, 10) / 10).toFixed(1);
      return `${formattedMain}-${sub}`;
    }

    return val; // 나머지는 그대로 둠
  };

  const validateTargetVision = (val) => {
    if (val === "") return false;
    const regex = /^(\d+(\.\d+)?)(-\d+)?$/;
    return regex.test(val);
  };

  const handleBlur = (field) => {
    let formatted = formData[field];
    let newValue = formatted;

    if (field.includes("Myopia") || field.includes("Astigmatism")) {
      newValue = formatNegativeDecimal(formatted);
      if (!validValuesSet.has(Number(newValue))) {
        setErrors((prev) => ({ ...prev, [field]: "❌ 허용된 수치만 입력하세요." }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    } else if (field.includes("PupilSize")) {
      newValue = formatPupilSize(formatted);
      const num = Number(newValue);
      if (isNaN(num) || num < 0 || num >= 10) {
        setErrors((prev) => ({ ...prev, [field]: "❌ 수치를 다시 확인 해 주세요." }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    } else if (field.includes("TargetVision")) {
      newValue = formatTargetVision(formatted);
      if (!validateTargetVision(newValue)) {
        setErrors((prev) => ({ ...prev, [field]: "❌ 올바른 목표 시력을 입력하세요." }));
      } else {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    }

    setFormData((prev) => ({ ...prev, [field]: newValue }));
  };

  const isFormValid = () => {
    const required = [
      "leftCornealThickness", "rightCornealThickness",
      "leftMyopia", "rightMyopia",
      "leftAstigmatism", "rightAstigmatism",
      "leftPupilSize", "rightPupilSize",
      "leftTargetVision", "rightTargetVision"
    ];
    const hasErrors = Object.values(errors).some((e) => e);
    const allFilled = required.every((key) => formData[key] !== "");
    return allFilled && !hasErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isInputFocused) return;
    if (!isFormValid()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onSubmit(formData);
  };

  const inputsMeta = [
    { label: "각막 두께", name: "rightCornealThickness", placeholder: "예: 540", step: "1" },
    { label: "근시", name: "rightMyopia", placeholder: "예: -1.25" },
    { label: "난시", name: "rightAstigmatism", placeholder: "예: -1.00" },
    { label: "동공 크기", name: "rightPupilSize", placeholder: "예: 6.5", step: "0.1" },
    { label: "목표 시력", name: "rightTargetVision", placeholder: "예: 1.0-1", step: "0.1" },

    { label: "각막 두께", name: "leftCornealThickness", placeholder: "예: 540", step: "1" },
    { label: "근시", name: "leftMyopia", placeholder: "예: -1.25" },
    { label: "난시", name: "leftAstigmatism", placeholder: "예: -1.00" },
    { label: "동공 크기", name: "leftPupilSize", placeholder: "예: 6.5", step: "0.1" },
    { label: "목표 시력", name: "leftTargetVision", placeholder: "예: 1.0-1", step: "0.1" },
  ];

  const renderInput = (label, name, placeholder, step = "0.01", index) => {
    const isTargetVision = name.includes("TargetVision");
    return (
      <div key={name}>
        <label>{label}</label>
        <input
          name={name}
          type={isTargetVision ? "text" : "number"}
          step={step}
          value={formData[name]}
          onChange={handleChange}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => {
            handleBlur(name);
            setIsInputFocused(false);
          }}
          placeholder={placeholder}
          onKeyDown={(e) => handleKeyDown(e, index)}
          ref={(el) => (inputRefs.current[index] = el)}
        />
        {errors[name] && <div className="error-message">{errors[name]}</div>}
      </div>
    );
  };

  return (
    <form className="input-container" onSubmit={handleSubmit} noValidate>
      <h2>푸른세상안과 시력교정술</h2>
      {showError && (
        <p className="error-message">⚠️ 정확한 수치 값을 입력 해 주세요</p>
      )}

      <div className="eye-section" style={{ display: "flex", gap: "2rem" }}>
        <div className="eye-block" style={{ flex: 1 }}>
          <h3>R</h3>
          {inputsMeta.slice(0, 5).map((input, i) =>
            renderInput(input.label, input.name, input.placeholder, input.step, i)
          )}
        </div>

        <div className="eye-block" style={{ flex: 1 }}>
          <h3>L</h3>
          {inputsMeta.slice(5, 10).map((input, i) =>
            renderInput(input.label, input.name, input.placeholder, input.step, i + 5)
          )}
        </div>
      </div>

      <button type="submit" disabled={!isFormValid()}>
        {isInputFocused ? "입력 중…" : "결과"}
      </button>
    </form>
  );
}
