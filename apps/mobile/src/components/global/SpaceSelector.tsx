import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useSpaceStore, Space } from '../../store/spaceStore';

const SPACE_EMOJI: Record<string, string> = {
  PERSONAL: '💼',
  COUPLE: '❤️',
  FAMILY: '👨‍👩‍👧‍👦',
  TRIP: '🌍',
  HOME: '🏠',
  BABY: '👶',
  WEDDING: '💍',
  CAR: '🚗',
  EDUCATION: '🎓',
  VACATION: '🌴',
  RETIREMENT: '📈',
  BUSINESS: '💼',
  CUSTOM: '📁',
};

interface SpaceSelectorProps {
  selectedSpaceId: string | null;
  onSelect: (spaceId: string) => void;
  label?: string;
}

export function SpaceSelector({
  selectedSpaceId,
  onSelect,
  label = 'Space',
}: SpaceSelectorProps) {
  const { colors } = useTheme();
  const spaces = useSpaceStore((s) => s.spaces);
  const [open, setOpen] = useState(false);

  const selected = spaces.find((s) => s.id === selectedSpaceId);
  const sEmoji = SPACE_EMOJI[selected?.type || ''] || '📁';

  return (
    <View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text.secondary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bg.card,
          padding: 14,
          borderRadius: 12,
          gap: 8,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18 }}>{sEmoji}</Text>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: colors.text.primary,
          }}
        >
          {selected?.name || 'Select space'}
        </Text>
        <AntDesign name="down" size={14} color={colors.text.tertiary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.bg.primary,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: '60%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text.primary }}>
                {label}
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <AntDesign name="close" size={22} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {spaces.map((space) => {
                const isSelected = space.id === selectedSpaceId;
                const e = SPACE_EMOJI[space.type] || '📁';
                return (
                  <TouchableOpacity
                    key={space.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      marginBottom: 4,
                      backgroundColor: isSelected
                        ? colors.accent.primary + '12'
                        : 'transparent',
                    }}
                    onPress={() => {
                      onSelect(space.id);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: colors.text.primary,
                        }}
                      >
                        {space.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          marginTop: 2,
                          color: colors.text.tertiary,
                          fontWeight: '500',
                        }}
                      >
                        {space.type}
                      </Text>
                    </View>
                    {isSelected && (
                      <AntDesign
                        name="checkcircle"
                        size={18}
                        color={colors.accent.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
