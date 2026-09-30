"use client";

import { API_BASE } from "@/lib/config";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ExternalLink, Download, FileText, RefreshCw, Sparkles, AlertTriangle } from "@/components/icons";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
  formCode?: string;
  payload?: Record<string, any>;
  title: string;
  reportNo?: string;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  formCode,
  payload,
  title,
  reportNo,
}: PdfPreviewModalProps) {
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveSynced, setIsLiveSynced] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  const cleanupBlob = useCallback(() => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  }, []);

  const loadPdf = useCallback(async () => {
    setLoadError(null);
    if (!formCode && !pdfUrl) return;

    // Default fallback url
    const fallbackUrl =
      pdfUrl ||
      `${API_BASE}/api/tpi/preview/${formCode || "TP02"}.pdf`;

    setIsLoading(true);

    if (formCode && payload) {
      try {
        const response = await fetch(
          `${API_BASE}/api/tpi/render/${formCode}.pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (response.ok) {
          const blob = await response.blob();
          cleanupBlob();
          const pdfBlob = new Blob([blob], { type: "application/pdf" });
          const blobUrl = URL.createObjectURL(pdfBlob);
          blobRef.current = blobUrl;
          setActiveUrl(blobUrl);
          setIsLiveSynced(true);
          setIsLoading(false);
          return;
        } else {
          console.warn("Live PDF render failed, falling back to static preview:", response.statusText);
        }
      } catch (err) {
        console.warn("Failed to reach live PDF endpoint, trying fallback:", err);
      }
    }

    // Try fallback preview endpoint
    try {
      const response = await fetch(fallbackUrl);
      if (response.ok) {
        const blob = await response.blob();
        cleanupBlob();
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(pdfBlob);
        blobRef.current = blobUrl;
        setActiveUrl(blobUrl);
        setIsLiveSynced(false);
        setIsLoading(false);
        return;
      } else {
        console.warn("Static preview fetch returned error status:", response.status);
      }
    } catch (err) {
      console.warn("Failed to fetch static preview:", err);
    }

    // Both endpoints failed or network/SSL error occurred
    cleanupBlob();
    setActiveUrl("");
    setIsLiveSynced(false);
    setIsLoading(false);
    setLoadError(
      `Unable to connect to the PDF rendering service at ${API_BASE}. The backend may be offline or unreachable due to an SSL certificate configuration issue.`
    );
  }, [formCode, payload, pdfUrl, cleanupBlob]);

  useEffect(() => {
    if (isOpen) {
      loadPdf();
    } else {
      cleanupBlob();
      setActiveUrl("");
      setLoadError(null);
      setIsLoading(false);
    }
    return () => {
      cleanupBlob();
    };
  }, [isOpen, loadPdf, cleanupBlob]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-5xl h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950 text-[#0084bf] flex items-center justify-center border border-sky-200 dark:border-sky-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-heading">
                  {title}
                </h3>
                {reportNo && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#003366] text-white">
                    {reportNo}
                  </span>
                )}
                {isLiveSynced && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Live Synced</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pixel-matched controlled inspection PDF preview (US Letter format)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPdf()}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh Live PDF"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-sky-500" : ""}`} />
              <span>Refresh</span>
            </button>

            {activeUrl && (
              <>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in New Tab</span>
                </a>

                <a
                  href={activeUrl}
                  download={reportNo ? `${reportNo}.pdf` : `${formCode || "IQE"}_Report.pdf`}
                  className="px-3.5 py-2 rounded-xl bg-[#0084bf] hover:bg-[#0073a8] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Iframe Body */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950 p-2 sm:p-4">
          {isLoading && (
            <div className="absolute inset-4 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl">
              <div className="w-10 h-10 border-3 border-[#0084bf] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Rendering Live Controlled PDF...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Compiling latest inspection form data with WeasyPrint
              </p>
            </div>
          )}

          {activeUrl ? (
            <object
              data={`${activeUrl}#toolbar=1&navpanes=0`}
              type="application/pdf"
              className="w-full h-full rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner bg-white overflow-hidden"
            >
              <iframe
                src={`${activeUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full rounded-2xl border-0 bg-white"
                title="PDF Preview"
              />
            </object>
          ) : loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 shadow-xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                Live PDF Preview Unavailable
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mb-4 leading-relaxed">
                {loadError}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadPdf()}
                  className="px-4 py-2 rounded-xl bg-[#0084bf] hover:bg-[#0073a8] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Connection</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
              Preparing live preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
