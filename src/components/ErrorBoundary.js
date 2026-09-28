import React from 'react';
import { View, Text, Button } from 'react-native';

export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <View style={{ padding: 24, gap: 16 }}><Text>Beklenmeyen bir ekran hatası oluştu. Kayıtların silinmedi.</Text><Text>Tekrar dene. Sorun sürerse tarayıcı verilerini temizlemeden sayfayı yenile.</Text><Button title="Tekrar dene" onPress={() => this.setState({ failed: false })} /></View>;
    return this.props.children;
  }
}
