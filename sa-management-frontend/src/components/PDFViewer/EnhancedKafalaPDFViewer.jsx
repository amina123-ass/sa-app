// src/components/PDFViewer/EnhancedKafalaPDFViewer.jsx
import React, { useState, useEffect, useCallback } from 'react';

const EnhancedKafalaPDFViewer = ({ kafalaId, reference, height = 700 }) => {
  const [pdfState, setPdfState] = useState({
    url: null,
    loading: true,
    error: null,
    exists: false,
    retryCount: 0
  });

  // Maximum retry attempts
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Check if PDF exists first
  const checkPdfExists = useCallback(async () => {
    try {
      const response = await fetch(`/api/upas/kafalas/${kafalaId}/pdf-exists`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success && data.data?.exists;
    } catch (error) {
      console.error('Error checking PDF existence:', error);
      return false;
    }
  }, [kafalaId]);

  // Load PDF with retry mechanism
  const loadPdf = useCallback(async (retryAttempt = 0) => {
    try {
      setPdfState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        retryCount: retryAttempt 
      }));

      // First check if PDF exists
      const exists = await checkPdfExists();
      
      if (!exists) {
        setPdfState(prev => ({
          ...prev,
          loading: false,
          error: 'لا يوجد مستند PDF لهذه الكفالة',
          exists: false
        }));
        return;
      }

      // Attempt to fetch the PDF
      const response = await fetch(`/api/upas/kafalas/${kafalaId}/pdf-stream`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('الاستجابة المستلمة ليست ملف PDF صالح');
      }

      const blob = await response.blob();
      
      // Validate blob size
      if (blob.size === 0) {
        throw new Error('ملف PDF فارغ');
      }

      const url = URL.createObjectURL(blob);
      
      setPdfState(prev => ({
        ...prev,
        url: url,
        loading: false,
        error: null,
        exists: true
      }));

    } catch (error) {
      console.error(`PDF load attempt ${retryAttempt + 1} failed:`, error);
      
      // Retry logic
      if (retryAttempt < MAX_RETRIES) {
        setPdfState(prev => ({
          ...prev,
          loading: false,
          error: `محاولة ${retryAttempt + 1} من ${MAX_RETRIES + 1} فشلت، إعادة المحاولة...`
        }));
        
        setTimeout(() => {
          loadPdf(retryAttempt + 1);
        }, RETRY_DELAY);
      } else {
        setPdfState(prev => ({
          ...prev,
          loading: false,
          error: `فشل في تحميل المستند بعد ${MAX_RETRIES + 1} محاولات: ${error.message}`
        }));
      }
    }
  }, [kafalaId, checkPdfExists]);

  // Manual retry function
  const handleRetry = useCallback(() => {
    loadPdf(0);
  }, [loadPdf]);

  // Open PDF in new tab
  const openInNewTab = useCallback(() => {
    const url = `/api/upas/kafalas/${kafalaId}/pdf`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [kafalaId]);

  // Download PDF
  const downloadPdf = useCallback(async () => {
    try {
      const response = await fetch(`/api/upas/kafalas/${kafalaId}/pdf-stream`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `kafala_${reference || kafalaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('فشل في تحميل الملف: ' + error.message);
    }
  }, [kafalaId, reference]);

  // Initialize PDF loading
  useEffect(() => {
    if (kafalaId) {
      loadPdf(0);
    }

    // Cleanup function
    return () => {
      if (pdfState.url) {
        URL.revokeObjectURL(pdfState.url);
      }
    };
  }, [kafalaId, loadPdf]);

  // Loading state
  if (pdfState.loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #e3e3e3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
        <p style={{ color: '#6c757d', margin: '0' }}>
          {pdfState.retryCount > 0 
            ? `إعادة المحاولة ${pdfState.retryCount}...`
            : 'جاري تحميل المستند...'
          }
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (pdfState.error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        backgroundColor: '#fff3cd',
        border: '2px solid #ffeaa7',
        borderRadius: '8px',
        textAlign: 'center',
        padding: '30px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h3 style={{ 
          color: '#856404', 
          marginBottom: '15px',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          خطأ في تحميل المستند
        </h3>
        <p style={{ 
          color: '#856404', 
          marginBottom: '25px',
          fontSize: '14px',
          lineHeight: '1.5',
          maxWidth: '400px'
        }}>
          {pdfState.error}
        </p>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRetry}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffc107',
              color: '#856404',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#e0a800';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#ffc107';
            }}
          >
            🔄 إعادة المحاولة
          </button>
          <button
            onClick={openInNewTab}
            style={{
              padding: '12px 24px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#007bff';
            }}
          >
            🔗 فتح في نافذة جديدة
          </button>
        </div>
      </div>
    );
  }

  // No PDF available
  if (!pdfState.exists || !pdfState.url) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${height}px`,
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '8px',
        textAlign: 'center',
        padding: '30px'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px', opacity: 0.6 }}>📄</div>
        <h3 style={{ 
          color: '#6c757d', 
          marginBottom: '15px',
          fontSize: '18px'
        }}>
          لا يوجد مستند متاح
        </h3>
        <p style={{ 
          color: '#6c757d',
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          لم يتم رفع أي مستند PDF لهذه الكفالة
        </p>
        <button
          onClick={handleRetry}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔍 التحقق مرة أخرى
        </button>
      </div>
    );
  }

  // Success state - PDF viewer
  return (
    <div style={{
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      {/* PDF Controls Header */}
      <div style={{
        padding: '15px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📄</span>
          <span style={{ 
            fontWeight: 'bold', 
            color: '#333',
            fontSize: '16px'
          }}>
            مستند الكفالة {reference && `- ${reference}`}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={downloadPdf}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="تحميل المستند"
          >
            💾 تحميل
          </button>
          
          <button
            onClick={openInNewTab}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="فتح في نافذة جديدة"
          >
            🔗 فتح جديد
          </button>
          
          <button
            onClick={handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title="إعادة تحميل"
          >
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* PDF Iframe */}
      <div style={{ position: 'relative' }}>
        <iframe
          src={`${pdfState.url}#toolbar=0&navpanes=0&scrollbar=1&page=1&zoom=page-fit`}
          width="100%"
          height={height}
          title={`مستند الكفالة - ${reference || kafalaId}`}
          style={{
            border: 'none',
            backgroundColor: '#fff',
            display: 'block'
          }}
          onLoad={() => {
            console.log('PDF loaded successfully in iframe');
          }}
          onError={() => {
            console.error('Iframe failed to load PDF');
            setPdfState(prev => ({
              ...prev,
              error: 'فشل في عرض المستند في المتصفح'
            }));
          }}
        />
        
        {/* Overlay for additional protection */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(transparent 95%, rgba(248,249,250,0.8) 100%)'
        }} />
      </div>
      
      {/* Footer info */}
      <div style={{
        padding: '10px 15px',
        backgroundColor: '#f8f9fa',
        borderTop: '1px solid #e0e0e0',
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        📋 يمكنك استخدام عجلة الماوس للتكبير والتصغير داخل المستند
      </div>
    </div>
  );
};

export default EnhancedKafalaPDFViewer;