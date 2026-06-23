import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, LayoutAnimation } from 'react-native';
import { useTheme } from '../../theme';
import { useLens } from '../../hooks/useLens';
import { useToast } from '../../store/ToastContext';
import type { LensMode } from '../../types';
import { alertService } from "./";

const LENS_DETAILS: Record<LensMode, { label: string; description: string; icon: string }> = {
  PERSONAL: { label: 'Personal', description: 'Your personal finances', icon: 'user' },
  PARTNERED: { label: 'Partnered', description: 'Shared finances with your partner', icon: 'heart' },
  FAMILY: { label: 'Family', description: 'Household and family finances', icon: 'team' },
  FULL: { label: 'Full Access', description: 'Everything at a glance', icon: 'appstore' },
};

interface LensPickerProps {
  visible: boolean;
  onClose: () => void;
}

export function LensPicker({ visible, onClose }: LensPickerProps) {
  const { colors } = useTheme();
  const lens = useLens();
  const { showToast } = useToast();
  const [switching, setSwitching] = useState<LensMode | null>(null);

  const handleSelect = async (targetLens: LensMode) => {
    LayoutAnimation.configureNext({
      duration: 300,
      update: { type: 'easeInEaseOut' },
    });
    if (targetLens === lens.activeLens) {
      onClose();
      return;
    }

    if (!lens.canAccess(targetLens)) {
      const lensInfo = LENS_DETAILS[targetLens];
      alertService.alert(
        `${lensInfo.label} Not Available`,
        `To use the ${lensInfo.label} lens, you need to set up a ${targetLens === 'PARTNERED' ? 'partner connection' : 'family group'} first.`,
      );
      return;
    }

    setSwitching(targetLens);
    try {
      await lens.switchLens(null, targetLens);
      const iconLabel = LENS_DETAILS[targetLens].label;
      showToast(`App icon updated to ${iconLabel} lens`, 'success');
    } catch (err: any) {
      alertService.alert('Switch Failed', err?.message || 'Could not switch lens');
    } finally {
      setSwitching(null);
      onClose();
    }
  };

  const allLenses: LensMode[] = ['PERSONAL', 'PARTNERED', 'FAMILY', 'FULL'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.bg.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.bg.secondary }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Choose Lens</Text>
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
            Switch your financial view
          </Text>

          <FlatList
            data={allLenses}
            keyExtractor={(item) => item}
            renderItem={({ item: lensType }) => {
              const details = LENS_DETAILS[lensType];
              const isActive = lensType === lens.activeLens;
              const isAvailable = lens.canAccess(lensType) || isActive;
              const isSwitching = switching === lensType;

              return (
                <TouchableOpacity
                  style={[
                    styles.lensItem,
                    {
                      backgroundColor: isActive ? colors.bg.highlight : colors.bg.card,
                      borderColor: isActive ? colors.accent.primary : colors.border.subtle,
                      opacity: isAvailable ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => handleSelect(lensType)}
                  disabled={!isAvailable || isSwitching || lens.isLoading}
                >
                  <View style={styles.lensInfo}>
                    <Text style={[styles.lensLabel, { color: isActive ? colors.accent.primary : colors.text.primary }]}>
                      {details.label}
                    </Text>
                    <Text style={[styles.lensDesc, { color: colors.text.secondary }]}>
                      {details.description}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.accent.primary }]}>
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  )}
                  {!isAvailable && (
                    <Text style={[styles.lockedText, { color: colors.status.warning }]}>Locked</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.bg.tertiary }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: colors.text.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  lensItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  lensInfo: {
    flex: 1,
  },
  lensLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  lensDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  lockedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
