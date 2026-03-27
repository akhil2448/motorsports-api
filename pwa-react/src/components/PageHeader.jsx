// src/components/PageHeader.jsx

import { useEffect, useState } from "react";

export default function PageHeader({ title }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`page-header ${scrolled ? "scrolled" : ""}`}>
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
      </div>
    </div>
  );
}
