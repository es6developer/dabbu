import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

export function CoupleBudgetAdjustScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: colors.bg.tertiary }]}>
            <AntDesign  name="left" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text.primary }]}>Adjust Budget</Text>
        </View>
      </View>
      <View style={s.placeholder}>
        <AntDesign  name="setting" size={48} color={colors.accent.primary} />
        <Text style={[s.placeholderTitle, { color: colors.text.primary }]}>Coming Soon</Text>
        <Text style={[s.placeholderText, { color: colors.text.secondary }]}>
          Budget adjustment form will be available in the next update.
        </Text>
        <TouchableOpacity style={[s.backButton, { backgroundColor: colors.accent.primary }]} onPress={() => navigation.goBack()}>
          <Text style={[s.backButtonText, { color: colors.text.inverse }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  placeholderTitle: { fontSize: 20, fontWeight: '700' },
  placeholderText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  backButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  backButtonText: { fontSize: 14, fontWeight: '700' },
});
