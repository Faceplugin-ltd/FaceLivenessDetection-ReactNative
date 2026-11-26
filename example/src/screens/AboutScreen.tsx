import { FaceLivenessEngine } from 'face-liveness-sdk';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { card, FP } from '../theme';

/**
 * About — company, product, what the licence unlocks, and contact.
 *
 * Mirrors Android `ui/AboutActivity` and iOS `AboutViewController`.
 */
export default function AboutScreen() {
  const license = FaceLivenessEngine.license;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Image
        source={require('../assets/fp_logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.company}>FacePlugin</Text>
      <Text style={styles.product}>Face Liveness SDK</Text>

      <View style={[styles.card, card()]}>
        <Text style={styles.licenseText}>License: {license.label}</Text>
      </View>

      <View style={[styles.card, card()]}>
        <Text style={styles.body}>
          FacePlugin builds on-device identity technology — face recognition,
          liveness, and document reading — so biometric data never has to leave
          the phone.
        </Text>
      </View>

      <View style={[styles.card, card()]}>
        <Text style={styles.body}>
          This app demos face liveness on React Native: passive anti-spoofing
          from a single frame, and active liveness as an anti-spoofing gate
          followed by a guided challenge sequence. Both screens are the native
          FacePlugin implementations, and everything runs fully on-device.
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => Linking.openURL('https://faceplugin.com')}
      >
        <Text style={styles.link}>faceplugin.com</Text>
      </TouchableOpacity>
      <Text style={styles.copyright}>
        © 2026 FacePlugin. All rights reserved.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FP.bg },
  content: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'stretch',
  },
  logo: { width: 200, height: 44, alignSelf: 'center' },
  company: {
    color: FP.text,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
  },
  product: {
    color: FP.accent,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 4,
  },
  card: { padding: 16, marginTop: 16 },
  licenseText: { color: FP.text, fontSize: 13, textAlign: 'center' },
  body: { color: FP.text, fontSize: 14, lineHeight: 19 },
  link: { color: FP.accent, fontSize: 14, textAlign: 'center', marginTop: 20 },
  copyright: {
    color: FP.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
