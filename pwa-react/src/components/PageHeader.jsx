// src/components/PageHeader.jsx

import { useEffect, useState } from "react";

export default function PageHeader({
  title,
  useLocalTime,
  setUseLocalTime,
  showToggle,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`page-header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-content">
        <h1 className="header-title">{title}</h1>

        {showToggle && (
          <div className={`header-toggle ${scrolled ? "inline" : ""}`}>
            <div className="time-toggle-inner">
              <button
                className={!useLocalTime ? "active" : ""}
                onClick={() => setUseLocalTime(false)}>
                Your Time
              </button>

              <button
                className={useLocalTime ? "active" : ""}
                onClick={() => setUseLocalTime(true)}>
                Track Time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
