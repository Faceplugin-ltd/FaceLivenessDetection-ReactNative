import { ACTIVE_CHECKS, type ActiveCheckKey } from 'face-liveness-sdk';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  loadSettings,
  restoreDefaults,
  saveSettings,
  type LivenessSettings,
} from '../settings';
import { card, FP } from '../theme';

/**
 * Settings — camera lens, the passive score threshold, and the full active-liveness configuration.
 *
 * Mirrors Android `ui/SettingsActivity` + `xml/root_preferences` and iOS `SettingsViewController`.
 * The screen only writes preferences; `toOptions` turns them into what the native screen runs with.
 *
 * Numeric values use steppers rather than a slider so the demo needs no extra native dependency.
 */
export default function SettingsScreen() {
  const [s, setS] = useState<LivenessSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setS);
  }, []);

  if (!s) return <View style={styles.root} />;

  const update = (patch: Partial<LivenessSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    saveSettings(next);
  };

  const togglePool = (key: ActiveCheckKey, on: boolean) => {
    const wanted = new Set(s.pool);
    if (on) {
      wanted.add(key);
    } else {
      wanted.delete(key);
    }
    if (wanted.size === 0) return; // the native screen needs at least one challenge
    // Keep the canonical order so the pool is stable when randomize is off.
    update({
      pool: ACTIVE_CHECKS.map((c) => c.key).filter((k) => wanted.has(k)),
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Section title="Camera">
        <Row title="Camera lens">
          <Segmented
            options={[
              { label: 'Front', value: true },
              { label: 'Back', value: false },
            ]}
            value={s.useFrontCamera}
            onChange={(v) => update({ useFrontCamera: v })}
          />
        </Row>
      </Section>

      <Section title="Passive liveness">
        <Stepper
          title="Score threshold"
          summary="Minimum score to count as live (0.0–1.0). The engine’s own operating point is 0.5, and the active check uses the same gate."
          value={s.livenessThreshold}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ livenessThreshold: v })}
        />
      </Section>

      <Section title="Active liveness">
        <Text style={styles.sub}>
          Challenges — pool the sequence is drawn from
        </Text>
        {ACTIVE_CHECKS.map((check) => (
          <Row key={check.key} title={check.title}>
            <Switch
              value={s.pool.includes(check.key)}
              onValueChange={(on) => togglePool(check.key, on)}
              trackColor={{ true: FP.accent, false: FP.stroke }}
              thumbColor={FP.text}
            />
          </Row>
        ))}
        <Stepper
          title="Challenges per attempt"
          value={s.count}
          step={1}
          min={1}
          max={6}
          onChange={(v) => update({ count: v })}
        />
        <Row
          title="Random order"
          summary="Shuffle the sequence on every attempt so a recording cannot be replayed"
        >
          <Switch
            value={s.randomize}
            onValueChange={(v) => update({ randomize: v })}
            trackColor={{ true: FP.accent, false: FP.stroke }}
            thumbColor={FP.text}
          />
        </Row>
      </Section>

      <Section title="Active liveness tuning">
        <Stepper
          title="Frames allowed per stage"
          summary="About 15 frames a second. Higher is more forgiving, lower fails faster (30–600)"
          value={s.framesWait}
          step={10}
          min={30}
          max={600}
          onChange={(v) => update({ framesWait: v })}
        />
        <Stepper
          title="Head turn angle (°)"
          value={s.yaw}
          step={1}
          min={5}
          max={60}
          onChange={(v) => update({ yaw: v })}
        />
        <Stepper
          title="Head tilt angle (°)"
          value={s.pitch}
          step={1}
          min={5}
          max={60}
          onChange={(v) => update({ pitch: v })}
        />
        <Stepper
          title="Smile confidence"
          value={s.smile}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ smile: v })}
        />
        <Stepper
          title="Eye-closed confidence"
          value={s.blink}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ blink: v })}
        />
        <Stepper
          title="Blinks required"
          value={s.blinksNumber}
          step={1}
          min={1}
          max={6}
          onChange={(v) => update({ blinksNumber: v })}
        />
        <Stepper
          title="Move-closer growth"
          value={s.perspective}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ perspective: v })}
        />
        <Stepper
          title="Start alignment tolerance (°)"
          value={s.alignAngle}
          step={1}
          min={1}
          max={45}
          onChange={(v) => update({ alignAngle: v })}
        />
        <Stepper
          title="Minimum face size"
          summary="How much of the frame the face has to fill before it can be scored"
          value={s.minFace}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ minFace: v })}
        />
        <Stepper
          title="Minimum image quality"
          summary="Below this the frame is called too dark or blurry to judge"
          value={s.quality}
          step={0.05}
          min={0}
          max={1}
          decimals={2}
          onChange={(v) => update({ quality: v })}
        />
        <Row
          title="Invert left / right"
          summary="Flip this if the turn challenges accept the opposite direction on your device"
        >
          <Switch
            value={s.invertTurn}
            onValueChange={(v) => update({ invertTurn: v })}
            trackColor={{ true: FP.accent, false: FP.stroke }}
            thumbColor={FP.text}
          />
        </Row>
        <Row
          title="Invert up / down"
          summary="Flip this if the look-up and look-down challenges are the wrong way round"
        >
          <Switch
            value={s.invertTilt}
            onValueChange={(v) => update({ invertTilt: v })}
            trackColor={{ true: FP.accent, false: FP.stroke }}
            thumbColor={FP.text}
          />
        </Row>
      </Section>

      <Section title="Reset">
        <TouchableOpacity onPress={() => restoreDefaults().then(setS)}>
          <Text style={styles.reset}>Restore default settings</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={[styles.card, card()]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        <Text style={styles.rowTitle}>{title}</Text>
        {summary ? <Text style={styles.rowSummary}>{summary}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Segmented<T>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.label)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** A dependency-free numeric control: − value +, clamped and rounded to `decimals`. */
function Stepper({
  title,
  summary,
  value,
  step,
  min,
  max,
  decimals = 0,
  onChange,
}: {
  title: string;
  summary?: string;
  value: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  onChange: (value: number) => void;
}) {
  const clamp = (next: number) => {
    const bounded = Math.min(max, Math.max(min, next));
    const factor = 10 ** decimals;
    return Math.round(bounded * factor) / factor;
  };
  return (
    <Row title={title} summary={summary}>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(clamp(value - step))}
        >
          <Text style={styles.stepGlyph}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value.toFixed(decimals)}</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(clamp(value + step))}
        >
          <Text style={styles.stepGlyph}>+</Text>
        </TouchableOpacity>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FP.bg },
  content: { padding: 16, paddingBottom: 32 },
  card: { padding: 14, marginBottom: 16 },
  sectionTitle: {
    color: FP.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sub: { color: FP.muted, fontSize: 12, marginBottom: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { flex: 1, paddingRight: 12 },
  rowTitle: { color: FP.text, fontSize: 16 },
  rowSummary: { color: FP.muted, fontSize: 12, lineHeight: 16, marginTop: 2 },

  segmented: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: FP.stroke,
    overflow: 'hidden',
  },
  segment: { paddingHorizontal: 14, paddingVertical: 7 },
  segmentActive: { backgroundColor: FP.accentDim },
  segmentText: { color: FP.muted, fontSize: 14 },
  segmentTextActive: { color: FP.accent, fontWeight: '600' },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FP.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { color: FP.accent, fontSize: 18, lineHeight: 20 },
  stepValue: {
    color: FP.accent,
    fontSize: 15,
    minWidth: 54,
    textAlign: 'center',
  },

  reset: { color: FP.accent, fontSize: 16, paddingVertical: 4 },
});
