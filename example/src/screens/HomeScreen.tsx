import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  type ActiveLivenessResult,
  checkInfo,
  failedCheck,
  FaceLiveness,
  FaceLivenessEngine,
} from 'face-liveness-sdk';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { demoLicense } from '../license';
import type { RootStackParamList } from '../navigation';
import { loadSettings, toOptions, type LivenessSettings } from '../settings';
import { card, FP } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * Home: engine status, the two liveness demos, settings and about.
 *
 * Mirrors Android `ui/MainActivity` + `activity_main.xml` and iOS `ViewController` — hero header
 * with the status pill, an Active-liveness and a Passive-liveness card, Settings and About tiles,
 * and a row that opens the integration guide.
 */
export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState('Loading on-device models…');
  const [statusColor, setStatusColor] = useState<string>(FP.statusInfo);
  const [livenessAllowed, setLivenessAllowed] = useState(false);
  const [settings, setSettings] = useState<LivenessSettings | null>(null);

  // Settings can change while this screen is in the stack, so re-read on focus.
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        loadSettings().then(setSettings);
      }),
    [navigation]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await FaceLivenessEngine.start(demoLicense());
      const message = await FaceLivenessEngine.statusMessage();
      if (cancelled) return;
      setStatus(message);
      setStatusColor(FaceLivenessEngine.isReady ? FP.statusOk : FP.statusError);
      setLivenessAllowed(FaceLivenessEngine.license.liveness);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toast = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('', message);
    }
  }, []);

  const ensureAllowed = useCallback((): boolean => {
    if (!FaceLivenessEngine.isReady) {
      toast('SDK not ready');
      return false;
    }
    if (!livenessAllowed) {
      toast('Liveness is not available on this license');
      return false;
    }
    return true;
  }, [livenessAllowed, toast]);

  /** The demo only reports the verdict; a real integration would act on it. */
  const describe = (result: ActiveLivenessResult): string => {
    if (result.passed) return 'Liveness confirmed — live person';
    if (!result.passivePassed) {
      return 'Anti-spoofing check failed — no challenges were asked';
    }
    const failed = failedCheck(result);
    if (failed) {
      return `Liveness not confirmed — “${checkInfo(failed).title}” was not completed`;
    }
    return 'Liveness not confirmed';
  };

  const openActive = useCallback(async () => {
    if (!ensureAllowed()) return;
    const current = settings ?? (await loadSettings());
    const result = await FaceLiveness.startActiveLiveness(toOptions(current));
    if (result) toast(describe(result));
  }, [ensureAllowed, settings, toast]);

  const openPassive = useCallback(async () => {
    if (!ensureAllowed()) return;
    const current = settings ?? (await loadSettings());
    await FaceLiveness.startPassiveLiveness({
      useFrontCamera: current.useFrontCamera,
      livenessThreshold: current.livenessThreshold,
    });
  }, [ensureAllowed, settings]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* Hero */}
      <LinearGradient
        colors={[FP.heroFrom, FP.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL('https://faceplugin.com')}
        >
          <Image
            source={require('../assets/fp_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.tagline}>On-device face liveness</Text>
        <Text style={styles.subtitle}>
          Passive anti-spoofing and guided active checks. Every frame is
          processed on this phone — no biometric data leaves the device.
        </Text>
        <View style={styles.pillRow}>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: `${statusColor}26`,
                borderColor: `${statusColor}66`,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: statusColor }]}>
              {status}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <Text style={styles.section}>LIVENESS CHECKS</Text>

      {/* Active liveness — the primary card */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openActive}
        style={{ opacity: livenessAllowed ? 1 : 0.45 }}
      >
        <LinearGradient
          colors={[FP.brandViolet, FP.brandVioletDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bigCard}
        >
          <View
            style={[
              styles.bubble,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
            ]}
          >
            <Text style={styles.bubbleGlyph}>⚡</Text>
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleOn}>Active liveness</Text>
            <Text style={styles.cardSubtitleOn}>
              Anti-spoofing gate, then blink, smile, turn your head
            </Text>
          </View>
          <Text style={styles.chevronOn}>›</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Passive liveness */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openPassive}
        style={[
          styles.bigCard,
          card(24),
          { opacity: livenessAllowed ? 1 : 0.45 },
        ]}
      >
        <View style={[styles.bubble, { backgroundColor: FP.accentDim }]}>
          <Text style={[styles.bubbleGlyph, { color: FP.accent }]}>◎</Text>
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Passive liveness</Text>
          <Text style={styles.cardSubtitle}>
            Single-frame anti-spoofing with a live score HUD
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={styles.section}>MORE</Text>

      <View style={styles.tileRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.tile, card(24)]}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={[styles.bubble, { backgroundColor: FP.accentDim }]}>
            <Text style={[styles.bubbleGlyph, { color: FP.accent }]}>⚙</Text>
          </View>
          <Text style={styles.tileTitle}>Settings</Text>
          <Text style={styles.tileSubtitle}>
            Camera, thresholds, challenge sequence
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.tile, card(24)]}
          onPress={() => navigation.navigate('About')}
        >
          <View style={[styles.bubble, { backgroundColor: FP.accentDim }]}>
            <Text style={[styles.bubbleGlyph, { color: FP.accent }]}>i</Text>
          </View>
          <Text style={styles.tileTitle}>About</Text>
          <Text style={styles.tileSubtitle}>SDK, license and contact</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.docsRow, card()]}
        onPress={() => Linking.openURL('https://doc.faceplugin.com')}
      >
        <Text
          style={[styles.bubbleGlyph, { color: FP.accent, marginRight: 14 }]}
        >
          ▤
        </Text>
        <Text style={styles.docsText}>Open the integration guide</Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FP.bg },
  content: { paddingHorizontal: 16 },

  hero: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: FP.stroke,
    padding: 20,
    paddingVertical: 22,
  },
  logo: { width: 180, height: 40 },
  tagline: {
    color: FP.text,
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 16,
    lineHeight: 30,
  },
  subtitle: { color: FP.muted, fontSize: 14, lineHeight: 19, marginTop: 10 },
  pillRow: { flexDirection: 'row', marginTop: 14 },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  section: {
    color: FP.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 12,
  },

  bigCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { color: FP.text, fontSize: 18, fontWeight: 'bold' },
  cardTitleOn: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: FP.muted, fontSize: 13, lineHeight: 17, marginTop: 4 },
  cardSubtitleOn: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 17,
    marginTop: 4,
  },
  chevron: { color: FP.muted, fontSize: 24 },
  chevronOn: { color: '#FFFFFF', fontSize: 24 },

  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleGlyph: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },

  tileRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, padding: 16 },
  tileTitle: { color: FP.text, fontSize: 16, fontWeight: '600', marginTop: 10 },
  tileSubtitle: { color: FP.muted, fontSize: 12, lineHeight: 16, marginTop: 4 },

  docsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 12,
  },
  docsText: { flex: 1, color: FP.text, fontSize: 15, fontWeight: '500' },
});
