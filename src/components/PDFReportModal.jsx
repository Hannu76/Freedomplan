import React, { useRef, useEffect } from 'react'

export default function PDFReportModal({ isOpen, onClose, title, htmlContent }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    if (isOpen && htmlContent) {
      const timer = setTimeout(() => {
        handlePrint()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, htmlContent])

  if (!isOpen || !htmlContent) return null

  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus()
        iframeRef.current.contentWindow.print()
      }
    } catch (e) {
      console.error('Print error:', e)
    }
  }

  const handleDownloadFile = () => {
    try {
      const cleanTitle = (title || 'Report').replace(/[^a-zA-Z0-9_\-]/g, '_')
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${cleanTitle}.html`
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (e) {
      console.error('Download file error:', e)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#84cc16] text-[#0f172a] font-extrabold flex items-center justify-center text-sm shadow">
              FP
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-tight">{title || 'Freedom Plan Report'}</h3>
              <p className="text-[11px] text-slate-400 font-medium">On-Screen PDF Preview & Download</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-[#84cc16] hover:bg-[#93e33c] text-[#0f172a] font-bold text-xs transition-transform active:scale-95 shadow flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-transform active:scale-95 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download File</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-4 overflow-hidden relative">
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title={title}
            className="w-full h-full rounded-xl bg-white border border-slate-800 shadow-inner"
          />
        </div>
      </div>
    </div>
  )
}
