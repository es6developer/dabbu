import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Avatar } from './Avatar';

interface ProfileBubbleProps {
  uri?: string | null;
  name?: string;
  size?: number;
  onPress?: () => void;
}

export function ProfileBubble({ uri, name, size = 40, onPress }: ProfileBubbleProps) {
  const bubble = <Avatar uri={uri} name={name} size={size} />;

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{bubble}</TouchableOpacity>;
  }
  return bubble;
}
