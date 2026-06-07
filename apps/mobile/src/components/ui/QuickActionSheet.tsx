import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActionItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: ActionItem[];
}

export function QuickActionSheet({ visible, onClose, actions }: QuickActionSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 25, stiffness: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              st.sheet,
              {
                backgroundColor: colors.bg.secondary,
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }],
              },
            ]}
          >
            <View style={[st.handle, { backgroundColor: colors.border.subtle }]} />
            <Text style={[st.title, { color: colors.text.primary }]}>Quick Actions</Text>
            <View style={st.grid}>
              {actions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[st.item, { backgroundColor: colors.bg.tertiary }]}
                  activeOpacity={0.7}
                  onPress={() => { onClose(); action.onPress(); }}
                >
                  <LinearGradient
                    colors={[action.color, `${action.color}CC`]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={st.iconBox}
                  >
                    <Ionicons name={action.icon} size={22} color="#FFF" />
                  </LinearGradient>
                  <Text style={[st.itemLabel, { color: colors.text.primary }]} numberOfLines={2}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[st.cancelBtn, { backgroundColor: colors.bg.tertiary }]}
              onPress={onClose} activeOpacity={0.7}
            >
              <Text style={[st.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const st = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { width: '30%', flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 18, gap: 10, minWidth: 90 },
  iconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  cancelBtn: { marginTop: 14, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '700' },
});
