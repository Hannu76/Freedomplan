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
    <div className="flex justify-center mt-2">
      <button
        type="button"
        className="free-dl-btn"
        onClick={handleClick}
        title={text}
      >
        <span>
          {text}
        </span>
      </button>
    </div>
  )
}
