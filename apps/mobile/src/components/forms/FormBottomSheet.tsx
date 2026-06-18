import React, { useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FormBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  snapPoints?: number[];
}

export function FormBottomSheet({
  visible,
  onClose,
  title,
  children,
}: FormBottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > SCREEN_HEIGHT * 0.15) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, damping: 20, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity, backgroundColor: 'rgba(0,0,0,0.5)' },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onClose();
            }}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg.secondary,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handleBar, { backgroundColor: colors.border.default }]} />
          </View>
          {title && (
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          )}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              bounces
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
});
