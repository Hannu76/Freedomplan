import React, { useState, useRef } from 'react'

export default function AnimatedDownloadButton({ onDownload, text = "Download my report" }) {
  const [isChecked, setIsChecked] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const timeoutRef = useRef(null)

  const handleClick = (e) => {
    // ALWAYS trigger onDownload on every click (first click, re-click, or green circle click)
    if (onDownload) {
      try {
        onDownload()
      } catch (err) {
        console.error('Download trigger error:', err)
      }
    }

    if (isChecked) return

    setIsChecked(true)
    setIsAnimating(true)

    // Run button progress animation
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
      setIsCompleted(true)
    }, 3500)
  }

  return (
    <div className="repayment-dl-container">
      <button
        type="button"
        className={`repayment-dl-label ${isChecked ? 'is-checked' : ''} ${isCompleted ? 'is-completed' : ''}`}
        onClick={handleClick}
        title={isCompleted ? "Open Repayment Report" : text}
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
          <div className="repayment-dl-square"></div>
        </span>
        <p className="repayment-dl-title">{text}</p>
        <p className="repayment-dl-title">Open</p>
      </button>
    </div>
  )
}
