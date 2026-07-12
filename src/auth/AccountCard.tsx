import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, font, radius, spacing } from '../theme';
import { displayName, useAuthStore } from './authStore';

/**
 * 帳號卡：Email 註冊 / 登入 / 登出。
 * 這是 Phase 2 的第一步，先讓真正的帳號系統跑起來（雲端資料在下一個增量接上）。
 */
export function AccountCard() {
  const session = useAuthStore((s) => s.session);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (session) {
    return (
      <View style={styles.card}>
        <Text style={styles.signedLabel}>已登入</Text>
        <Text style={styles.email}>{displayName(session)} · {session.user.email}</Text>
        <Button label="登出" variant="ghost" onPress={() => signOut()} style={{ marginTop: spacing.md }} />
      </View>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const err =
      mode === 'in'
        ? await signIn(email, password)
        : await signUp(email, password, name);
    setBusy(false);
    if (err) setMsg(err);
    else if (mode === 'up') setMsg('註冊成功！若開了信箱驗證，請收信點確認後再登入。');
  };

  return (
    <View style={styles.card}>
      <View style={styles.tabs}>
        <Text
          style={[styles.tab, mode === 'in' && styles.tabOn]}
          onPress={() => setMode('in')}
        >
          登入
        </Text>
        <Text
          style={[styles.tab, mode === 'up' && styles.tabOn]}
          onPress={() => setMode('up')}
        >
          註冊
        </Text>
      </View>

      {mode === 'up' ? (
        <TextInput
          style={styles.input}
          placeholder="暱稱"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={16}
        />
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="密碼（至少 6 碼）"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      <Button
        label={mode === 'in' ? '登入' : '建立帳號'}
        onPress={submit}
        loading={busy}
        disabled={!email.trim() || password.length < 6 || (mode === 'up' && !name.trim())}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  signedLabel: { color: colors.accent, fontSize: font.size.xs, fontWeight: font.weight.bold },
  email: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  tabs: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xs },
  tab: { color: colors.textMuted, fontSize: font.size.lg, fontWeight: font.weight.bold },
  tabOn: { color: colors.text, textDecorationLine: 'underline' },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.md,
  },
  msg: { color: colors.danger, fontSize: font.size.sm },
});
