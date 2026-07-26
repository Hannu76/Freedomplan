import React from 'react'

export default function AnimatedDownloadButton({ onDownload, text = "Download my report" }) {
  const handleClick = (e) => {
    if (onDownload) {
      try {
        onDownload()
      } catch (err) {
        console.error('Download trigger error:', err)
      }
    }
  }

  return (
    <div className="repayment-dl-container">
      <button
        type="button"
        className="repayment-dl-label hover:scale-[1.02] active:scale-95 transition-transform"
        onClick={handleClick}
        title={text}
      >
        <span className="repayment-dl-circle">
          <svg
            className="repayment-dl-icon"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 19V5m0 14-4-4m4 4 4-4"
            ></path>
          </svg>
        </span>
        <span className="repayment-dl-btn-text">
          {text}
        </span>
      </button>
    </div>
  )
}
