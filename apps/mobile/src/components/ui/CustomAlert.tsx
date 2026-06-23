import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { borderRadius } from '../../theme/design';
import { useToast } from '../../store/ToastContext';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  type?: AlertType;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  type: AlertType;
}

const ICON_MAP: Record<AlertType, string> = {
  success: 'checkcircle',
  error: 'exclamationcircle',
  warning: 'warning',
  info: 'infocirlce',
};

function CustomAlert({
  alertState,
  dismiss,
}: {
  alertState: AlertState;
  dismiss: () => void;
}) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const { visible, title, message, buttons, type } = alertState;
  const isActionSheet = buttons.length >= 3;
  const btns = buttons.length === 0 ? [{ text: 'OK' }] : buttons;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, fadeAnim, scaleAnim]);

  const accentColor = colors.status[type] || colors.accent.primary;
  const iconName = ICON_MAP[type];

  const handlePress = useCallback(
    (btn: AlertButton) => {
      btn.onPress?.();
      dismiss();
    },
    [dismiss],
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <BlurView intensity={15} tint="dark" style={styles.overlay}>
        <Pressable style={styles.overlayInner} onPress={dismiss}>
          <Pressable
            style={[styles.alertContainer, { backgroundColor: colors.bg.secondary }]}
            onPress={() => {}}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                alignItems: 'center',
                width: '100%',
              }}
            >
              <View style={[styles.handleBar, { backgroundColor: colors.text.tertiary }]} />

              {iconName && (
                <AntDesign
                  name={iconName as any}
                  size={44}
                  color={accentColor}
                  style={styles.icon}
                />
              )}

              <Text style={[styles.title, { color: colors.text.primary }]}>
                {title}
              </Text>
              {message ? (
                <Text style={[styles.message, { color: colors.text.secondary }]}>
                  {message}
                </Text>
              ) : null}

              {isActionSheet ? (
                <View style={styles.actionSheetButtons}>
                  {btns.map((btn, i) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.actionBtn,
                          isCancel && styles.cancelBtn,
                          isDestructive && {
                            backgroundColor: colors.status.error,
                          },
                          !isCancel &&
                            !isDestructive && {
                              backgroundColor: colors.bg.tertiary,
                            },
                          i === btns.length - 1 && { marginBottom: 0 },
                        ]}
                        onPress={() => handlePress(btn)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.actionBtnText,
                            isCancel && {
                              color: colors.text.secondary,
                              fontWeight: '600',
                            },
                            isDestructive && { color: '#FFFFFF' },
                            !isCancel &&
                              !isDestructive && { color: colors.text.primary },
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  {btns.map((btn, i) => {
                    const isCancel = btn.style === 'cancel';
                    const isDestructive = btn.style === 'destructive';
                    const isSingle = btns.length === 1;

                    if (isSingle) {
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.singleBtn,
                            {
                              backgroundColor: isDestructive
                                ? colors.status.error
                                : accentColor,
                            },
                          ]}
                          onPress={() => handlePress(btn)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.singleBtnText}>{btn.text}</Text>
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.button,
                          isCancel && { backgroundColor: colors.bg.tertiary },
                          isDestructive && {
                            backgroundColor: colors.status.error,
                          },
                          !isCancel &&
                            !isDestructive && { backgroundColor: accentColor },
                        ]}
                        onPress={() => handlePress(btn)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isCancel && { color: colors.text.primary },
                            !isCancel && { color: '#FFFFFF' },
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    type: 'info',
  });

  const alert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions,
    ) => {
      setAlertState({
        visible: true,
        title,
        message: message || '',
        buttons: buttons || [],
        type: options?.type || 'info',
      });
    },
    [],
  );

  const dismiss = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  return { alertState, alert, dismiss };
}

type AlertListener = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) => void;

class AlertService {
  private listener: AlertListener | null = null;

  setListener(listener: AlertListener) {
    this.listener = listener;
  }

  removeListener() {
    this.listener = null;
  }

  alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
  ) {
    this.listener?.(title, message, buttons, options);
  }
}

export const alertService = new AlertService();

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { alertState, alert, dismiss } = useCustomAlert();
  const { showToast } = useToast();

  useEffect(() => {
    alertService.setListener((title, message, buttons, options) => {
      if (!buttons || buttons.length === 0) {
        const toastType = (
          options?.type === 'warning' ? 'info' : options?.type || 'info'
        ) as 'success' | 'error' | 'info';
        showToast(message || title, toastType);
        return;
      }
      alert(title, message, buttons, options);
    });
    return () => alertService.removeListener();
  }, [alert, showToast]);

  return (
    <>
      {children}
      <CustomAlert alertState={alertState} dismiss={dismiss} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  alertContainer: {
    width: '100%',
    borderRadius: borderRadius['2xl'],
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
    maxWidth: 340,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    alignSelf: 'center',
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  singleBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  actionSheetButtons: {
    width: '100%',
    gap: 8,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
});

export default CustomAlert;
