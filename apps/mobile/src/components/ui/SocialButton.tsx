import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface SocialButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

export function SocialButton({ provider, onPress, disabled }: SocialButtonProps) {
  const isGoogle = provider === 'google';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
    >
      <View style={styles.iconContainer}>
        {isGoogle ? (
          <AntDesign name="google" size={18} color="#4285F4" />
        ) : (
          <AntDesign name="apple1" size={20} color="#000000" />
        )}
      </View>
      <Text style={styles.text}>Continue with {isGoogle ? 'Google' : 'Apple'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
});
