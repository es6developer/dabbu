import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { AntDesign } from '@expo/vector-icons';
import { useTheme, borderRadius } from '../../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <BlurView intensity={15} tint="dark" style={styles.overlay}>
        <Pressable style={styles.overlayInner} onPress={onCancel}>
          <Pressable
            style={[styles.dialog, { backgroundColor: colors.bg.tertiary }]}
            onPress={() => {}}
          >
            <View style={styles.handleBar} />

            {icon && (
              <AntDesign
                name={icon as any}
                size={28}
                color={destructive ? colors.status.error : colors.accent.primary}
                style={styles.icon}
              />
            )}

            <Text style={[styles.title, { color: colors.text.primary }]}>
              {title}
            </Text>

            <Text style={[styles.message, { color: colors.text.secondary }]}>
              {message}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.bg.card }]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.btn,
                  { backgroundColor: destructive ? colors.status.error : colors.accent.primary },
                ]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 36,
  },
  dialog: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    padding: 28,
    paddingTop: 24,
    alignItems: 'center',
    maxWidth: 340,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#3A3A3C',
    borderRadius: 28,
    marginBottom: 20,
    alignSelf: 'center',
  },
  icon: {
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 28,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
