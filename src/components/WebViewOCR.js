import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const OCR_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js"></script>
</head>
<body style="margin:0;padding:0;background:#000;">
  <script>
    function sendToNative(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    var activeJob = null;
    async function receive(e) {
      try {
        var msg = JSON.parse(e.data);
        if (msg.type === 'START_OCR') {
          if (activeJob === msg.jobId) return;
          activeJob = msg.jobId;
          sendToNative({ type: 'PROGRESS', percent: 20, status: 'OCR motoru hazırlanıyor...' });
          
          if (!window.Tesseract) {
            sendToNative({ type: 'ERROR', message: 'Tesseract kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.' });
            return;
          }

          sendToNative({ type: 'PROGRESS', percent: 40, status: 'Görsel taranıyor...' });

          const worker = await Tesseract.createWorker('tur+eng', 1, {
            logger: function(m) {
              if (m.status === 'recognizing text') {
                var p = Math.round((m.progress || 0) * 50) + 40;
                sendToNative({ type: 'PROGRESS', percent: p, status: 'Yazılar okunuyor: %' + Math.round((m.progress || 0) * 100) });
              }
            }
          });

          let ret;
          try { ret = await worker.recognize(msg.image); } finally { await worker.terminate(); }

          sendToNative({
            type: 'SUCCESS',
            text: ret.data.text, jobId: msg.jobId
          });
        }
      } catch (err) {
        sendToNative({ type: 'ERROR', message: err.message || 'Görsel işlenemedi', jobId: activeJob });
      }
    }
    window.addEventListener('message', receive);
    document.addEventListener('message', receive);

    sendToNative({ type: 'READY' });
  </script>
</body>
</html>
`;

export default function WebViewOCR({ onMessage, webViewRef }) {
  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ html: OCR_HTML }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            onMessage(data);
          } catch (e) {
            console.error('WebView message parse error:', e);
          }
        }}
        onError={() => onMessage({ type: 'ERROR', message: 'OCR motoru yüklenemedi.' })}
        onHttpError={() => onMessage({ type: 'ERROR', message: 'OCR bağlantısı başarısız.' })}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    top: -100,
    left: -100
  }
});
