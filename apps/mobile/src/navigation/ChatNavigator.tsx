import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { CreateChatScreen } from '../screens/chat/CreateChatScreen';

const Stack = createNativeStackNavigator();

export function ChatNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={iosTransitionOptions(theme)}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Chat' }} />
      <Stack.Screen
        name="CreateChat"
        component={CreateChatScreen}
        options={{ title: 'New Chat' }}
      />
    </Stack.Navigator>
  );
}
