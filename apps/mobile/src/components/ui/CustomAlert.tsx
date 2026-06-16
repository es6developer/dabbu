import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { borderRadius } from '../../theme/design';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type?: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

interface AlertOptions {
  type?: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

const ICON_MAP: Record<AlertType, string> = {
  success: 'checkcircle',
  error: 'exclamationcircle',
  warning: 'warning',
  info: 'infocirlce',
};

function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
  onDismiss,
}: CustomAlertProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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

  const accentColor = colors.status[type];
  const iconName = ICON_MAP[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: colors.bg.overlay }]}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              backgroundColor: colors.bg.card,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <AntDesign
            name={iconName as any}
            size={48}
            color={accentColor}
            style={styles.icon}
          />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {message}
          </Text>
          <View style={styles.buttonRow}>
            {cancelLabel && onCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.bg.tertiary },
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: colors.text.primary }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: accentColor },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function useCustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<AlertOptions>({});

  const alert = useCallback(
    (t: string, msg: string, opts?: AlertOptions) => {
      setTitle(t);
      setMessage(msg);
      setOptions(opts ?? {});
      setVisible(true);
    },
    [],
  );

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    alert,
    dismiss,
    visible,
    title,
    message,
    type: options.type,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    onConfirm: () => {
      options.onConfirm?.();
      dismiss();
    },
    onCancel: () => {
      options.onCancel?.();
      dismiss();
    },
    onDismiss: () => {
      options.onDismiss?.();
      dismiss();
    },
  };
}

type AlertListener = (
  title: string,
  message: string,
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

  alert(title: string, message: string, options?: AlertOptions) {
    this.listener?.(title, message, options);
  }
}

export const alertService = new AlertService();

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { alert, ...alertProps } = useCustomAlert();

  useEffect(() => {
    alertService.setListener((t, msg, opts) => {
      alert(t, msg, opts);
    });
    return () => alertService.removeListener();
  }, [alert]);

  return (
    <>
      {children}
      <CustomAlert {...alertProps} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default CustomAlert;
