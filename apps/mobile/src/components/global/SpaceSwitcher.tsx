import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useActiveSpace, ActiveSpaceProvider } from '../../providers/ActiveSpaceProvider';
import { Space } from '../../store/spaceStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

function SpaceSwitcherInner() {
  const { activeSpace, spaces, setActiveSpaceById } = useActiveSpace();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const emoji = SPACE_EMOJI[activeSpace?.type || 'PERSONAL'] || '📁';

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        style={styles.trigger}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: colors.text.primary }]}
        >
          {activeSpace?.name || 'Personal'}
        </Text>
        <AntDesign name="down" size={10} color={colors.text.tertiary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bg.primary,
                paddingTop: insets.top + 16,
                maxHeight: SCREEN_HEIGHT * 0.6,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>
                Spaces
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <AntDesign name="close" size={22} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            >
              {spaces.map((space) => {
                const isActive = space.id === activeSpace?.id;
                const sEmoji = SPACE_EMOJI[space.type] || '📁';
                return (
                  <TouchableOpacity
                    key={space.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: isActive
                          ? colors.accent.primary + '12'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setActiveSpaceById(space.id);
                      setOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemEmoji}>{sEmoji}</Text>
                    <View style={styles.itemInfo}>
                      <Text
                        style={[
                          styles.itemName,
                          { color: colors.text.primary },
                        ]}
                      >
                        {space.name}
                      </Text>
                      <Text
                        style={[
                          styles.itemType,
                          { color: colors.text.tertiary },
                        ]}
                      >
                        {space.type} · {space.memberCount} members
                      </Text>
                    </View>
                    {isActive && (
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
    </>
  );
}

export function SpaceSwitcher() {
  return (
    <ActiveSpaceProvider>
      <SpaceSwitcherInner />
    </ActiveSpaceProvider>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 28,
    maxWidth: 160,
  },
  emoji: { fontSize: 16 },
  name: { fontSize: 14, fontWeight: '700', maxWidth: 100 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  list: { paddingBottom: 44 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 30,
    marginBottom: 4,
  },
  itemEmoji: { fontSize: 22 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemType: { fontSize: 11, marginTop: 2, fontWeight: '500' },
});
