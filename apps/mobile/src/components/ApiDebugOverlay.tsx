import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { requestLog, RequestLogEntry } from '../services/api';

function formatMs(ms?: number): string {
  if (ms === undefined || ms === null) {
    return '...';
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function shortUrl(url: string): string {
  const cleaned = url.replace(/^\/shared-finance\//, '');
  return cleaned.length > 55 ? cleaned.slice(0, 52) + '...' : cleaned;
}

export function ApiDebugOverlay() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setEntries([...requestLog]);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const pending = entries.filter((e) => e.status === 'pending');
  const done = entries.filter((e) => e.status !== undefined && e.status !== null);

  if (Platform.OS !== 'web' && !__DEV__) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>📡 API Calls</Text>
        {entries.length === 0 && <Text style={styles.empty}>waiting...</Text>}
        {entries.map((e, i) => (
          <View key={i} style={[styles.row, e.status === 'pending' && styles.pendingRow]}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    e.status === 'pending'
                      ? '#FFD43B'
                      : e.status === 'done'
                        ? '#40C057'
                        : '#FF6B6B',
                },
              ]}
            />
            <View style={styles.info}>
              <Text style={styles.method}>{e.method}</Text>
              <Text style={styles.url} numberOfLines={1}>
                {shortUrl(e.url)}
              </Text>
            </View>
            <Text style={[styles.time, e.status === 'pending' && { color: '#FFD43B' }]}>
              {e.status === 'pending' ? `${formatMs(Date.now() - e.start)}` : formatMs(e.ms)}
            </Text>
          </View>
        ))}
        {pending.length > 0 && (
          <Text style={styles.footer}>
            {pending.length} pending / {done.length} done
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 8,
    maxWidth: 320,
    maxHeight: 360,
    zIndex: 9999,
  },
  scroll: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  content: {
    gap: 4,
  },
  heading: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  pendingRow: {
    opacity: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  method: {
    color: '#aaa',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  url: {
    color: '#ddd',
    fontSize: 10,
  },
  time: {
    color: '#40C057',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
});
