import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

interface FormSectionProps {
  title?: string;
  children: ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
}

export function FormSection({ title, children, spacing = 'md' }: FormSectionProps) {
  const { colors, typography } = useTheme();
  const gap = spacing === 'sm' ? 6 : spacing === 'lg' ? 16 : 10;

  return (
    <View style={{ marginBottom: 8 }}>
      {title && (
        <View style={styles.sectionHeader}>
          <Text
            style={[
              typography.subheadBold,
              {
                color: colors.text.tertiary,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.bg.card,
            borderColor: colors.border.subtle,
            gap,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  sectionCard: {
    borderRadius: 28,
    padding: 16,
  },
});
