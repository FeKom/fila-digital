"use client";

import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const Error = ({ error, reset }: ErrorProps) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-page">
      <div className="error-page-inner">
        <div className="error-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M12 7v5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <h2 className="error-title">Algo deu errado</h2>
        <p className="error-desc">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button className="fd-btn fd-btn-primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
};

export default Error;
