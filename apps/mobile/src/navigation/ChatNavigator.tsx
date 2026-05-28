import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatRoomScreen } from '../screens/chat/ChatRoomScreen';
import { CreateChatScreen } from '../screens/chat/CreateChatScreen';

const Stack = createNativeStackNavigator();

export function ChatNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0F' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0A0A0F' },
      }}
    >
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="CreateChat" component={CreateChatScreen} options={{ title: 'New Chat' }} />
    </Stack.Navigator>
  );
}
