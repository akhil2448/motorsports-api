import { useEffect, useRef, useState } from "react";
import "../styles/components/wheel-picker.css";

export default function WheelPicker({ value, onChange, options }) {
  const containerRef = useRef(null);
  const scrollTimeout = useRef(null);

  const itemHeight = 40;
  const containerHeight = 120;
  const centerOffset = containerHeight / 2 - itemHeight / 2;

  const [tempValue, setTempValue] = useState(value);

  const snapToIndex = (index) => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: index * itemHeight,
      behavior: "smooth",
    });
  };

  // sync when opening
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // scroll to current value
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = options.indexOf(value);

    requestAnimationFrame(() => {
      container.scrollTo({
        top: index * itemHeight,
        behavior: "auto",
      });
    });
  }, [value, options]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(options.length - 1, index));

    const selected = options[clampedIndex];

    setTempValue(selected);

    // ✅ detect scroll end
    clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      snapToIndex(clampedIndex);
    }, 70); // small delay = feels natural
  };

  // expose commit function
  const commit = () => {
    onChange(tempValue);
  };

  return (
    <div className="wheel-wrapper">
      <div
        className="wheel-container"
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          paddingTop: `${centerOffset}px`,
          paddingBottom: `${centerOffset}px`,
        }}>
        {options.map((opt, i) => (
          <div
            key={i}
            className={`wheel-item ${opt === tempValue ? "active" : ""}`}>
            {opt} min
          </div>
        ))}
      </div>

      <div className="wheel-highlight" />

      {/* hidden commit hook */}
      <button style={{ display: "none" }} id="wheel-commit" onClick={commit} />
    </div>
  );
}
