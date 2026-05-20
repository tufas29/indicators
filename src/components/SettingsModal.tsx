import { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertSettings,
  INTERVAL_OPTIONS,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from '../notifications/settings';

const ACCENT = '#16a34a';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const DANGER = '#dc2626';

interface SettingsModalProps {
  visible: boolean;
  initial: AlertSettings;
  onCancel: () => void;
  onSave: (next: AlertSettings) => void;
}

function formatThreshold(t: number): string {
  return Number.isInteger(t) ? `${t}` : t.toFixed(1);
}

export function SettingsModal({
  visible,
  initial,
  onCancel,
  onSave,
}: SettingsModalProps) {
  const [interval, setInterval] = useState<number>(initial.intervalMinutes);
  const [thresholds, setThresholds] = useState<number[]>(initial.thresholds);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setInterval(initial.intervalMinutes);
      setThresholds([...initial.thresholds]);
      setInput('');
      setError(null);
    }
  }, [visible, initial]);

  const canSave = thresholds.length > 0;

  const intervalChoice = useMemo(() => {
    return (
      INTERVAL_OPTIONS.find((o) => o.value === interval) ?? INTERVAL_OPTIONS[0]
    );
  }, [interval]);

  const onAddThreshold = () => {
    const trimmed = input.trim().replace('%', '');
    const parsed = Number(trimmed);
    if (!trimmed || !isFinite(parsed)) {
      setError('Enter a number');
      return;
    }
    const rounded = Math.round(parsed * 10) / 10;
    if (rounded < THRESHOLD_MIN || rounded > THRESHOLD_MAX) {
      setError(`Must be between ${THRESHOLD_MIN} and ${THRESHOLD_MAX}`);
      return;
    }
    if (thresholds.includes(rounded)) {
      setError('Already added');
      return;
    }
    setThresholds([...thresholds, rounded].sort((a, b) => a - b));
    setInput('');
    setError(null);
    Keyboard.dismiss();
  };

  const onRemove = (t: number) => {
    setThresholds(thresholds.filter((x) => x !== t));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable onPress={onCancel} hitSlop={10}>
              <Text style={styles.headerCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle}>Settings</Text>
            <Pressable
              onPress={() =>
                canSave && onSave({ thresholds, intervalMinutes: interval })
              }
              disabled={!canSave}
              hitSlop={10}
            >
              <Text
                style={[
                  styles.headerSave,
                  !canSave && styles.headerSaveDisabled,
                ]}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>Check frequency</Text>
            <Text style={styles.sectionHint}>
              How often the app checks indices in the background. The operating
              system may run the check less often than this.
            </Text>
            <View style={styles.chipRow}>
              {INTERVAL_OPTIONS.map((opt) => {
                const selected = opt.value === interval;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setInterval(opt.value)}
                    style={[
                      styles.choiceChip,
                      selected && styles.choiceChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        selected && styles.choiceChipTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.summary}>
              Selected: {intervalChoice.label}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Drawdown thresholds</Text>
            <Text style={styles.sectionHint}>
              Send a notification when an index falls this many percent below
              its all-time high. Each threshold fires once until you reset or
              remove it.
            </Text>

            {thresholds.length === 0 ? (
              <Text style={styles.emptyText}>
                No thresholds yet — add one below.
              </Text>
            ) : (
              <View style={styles.chipRow}>
                {thresholds.map((t) => (
                  <View key={t} style={styles.thresholdChip}>
                    <Text style={styles.thresholdChipText}>
                      -{formatThreshold(t)}%
                    </Text>
                    <Pressable
                      onPress={() => onRemove(t)}
                      hitSlop={8}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7.5"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                value={input}
                onChangeText={(v) => {
                  setInput(v);
                  if (error) setError(null);
                }}
                onSubmitEditing={onAddThreshold}
                returnKeyType="done"
              />
              <Text style={styles.percent}>%</Text>
              <Pressable
                onPress={onAddThreshold}
                style={({ pressed }) => [
                  styles.addBtn,
                  pressed && styles.addBtnPressed,
                ]}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}

            {!canSave && (
              <Text style={styles.errorText}>
                Add at least one threshold to save.
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { color: '#16181d', fontSize: 17, fontWeight: '700' },
  headerCancel: { color: MUTED, fontSize: 15 },
  headerSave: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  headerSaveDisabled: { color: '#9ca3af' },
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: {
    color: '#16181d',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionHint: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f9fafb',
  },
  choiceChipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: ACCENT,
  },
  choiceChipText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  choiceChipTextSelected: { color: ACCENT },
  summary: { color: MUTED, fontSize: 12, marginTop: 10 },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 24,
  },
  emptyText: { color: MUTED, fontSize: 13, fontStyle: 'italic' },
  thresholdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f9fafb',
  },
  thresholdChipText: {
    color: '#16181d',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  removeBtnText: {
    color: '#374151',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: '#16181d',
    backgroundColor: '#ffffff',
  },
  percent: { color: MUTED, fontSize: 15 },
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  addBtnPressed: { backgroundColor: '#15803d' },
  addBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  errorText: { color: DANGER, fontSize: 12, marginTop: 8 },
});
