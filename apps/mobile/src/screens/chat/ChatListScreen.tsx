import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { ListSkeleton } from '../../components/ui/AnimatedSkeleton';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { api, setAccessToken } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { useTheme } from '../../theme';
import { spacing, borderRadius, shadows } from '../../theme/design';

export function ChatListScreen() {
  const navigation = useNavigation<any>();
  const { accessToken, user } = useAuth();
  const { colors } = useTheme();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
    loadChats();
  }, [accessToken]);

  async function loadChats() {
    try {
      const res = await api.get<any>('/chat');
      setChats(Array.isArray(res) ? res : []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  }, []);

  function getChatTitle(chat: any): string {
    if (chat.title) {
      return chat.title;
    }
    if (chat.type === 'direct') {
      const other = chat.participants?.find((p: any) => p.userId !== user?.id);
      const name = other
        ? `${other.user?.firstName || ''} ${other.user?.lastName || ''}`.trim()
        : '';
      return name || 'Chat';
    }
    return 'Group Chat';
  }

  function getLastMessage(chat: any): string {
    const lastMsg = chat.messages?.[0];
    if (!lastMsg) {
      return 'No messages yet';
    }
    const prefix = lastMsg.senderId === user?.id ? 'You: ' : '';
    return `${prefix}${lastMsg.content || ''}`;
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg.primary }]}>
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Chats</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateChat')}
          style={[styles.headerBtn, { backgroundColor: `${colors.accent.primary}15` }]}
        >
          <AntDesign  name="edit" size={20} color={colors.accent.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const title = getChatTitle(item);
          return (
            <TouchableOpacity
              style={[styles.chatRow, { backgroundColor: colors.bg.tertiary }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ChatRoom', { chatId: item.id, title })}
            >
              <Avatar name={title} size={46} />
              <View style={styles.chatInfo}>
                <Text style={[styles.chatName, { color: colors.text.primary }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.lastMsg, { color: colors.text.tertiary }]} numberOfLines={1}>
                  {getLastMessage(item)}
                </Text>
              </View>
              <AntDesign  name="right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AntDesign  name="message1" size={52} color={colors.text.tertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              No conversations
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.text.tertiary }]}>
              Start a new chat with your family
            </Text>
          </View>
        }
        windowSize={10}
        maxToRenderPerBatch={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['6xl'],
    paddingBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: '700' },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius['3xl'],
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '600', marginBottom: spacing.xs },
  lastMsg: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: spacing['4xl'], gap: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyDesc: { fontSize: 14 },
});
