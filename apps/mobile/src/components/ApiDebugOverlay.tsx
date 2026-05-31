import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { requestLog, RequestLogEntry } from '../services/api';

function formatMs(ms?: number): string {
  if (ms === undefined || ms === null) {
    return '...';
  }
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function shortUrl(url: string): string {
  return url.replace(/^\/shared-finance\//, '').replace(/^\/?/, '/');
}

export function ApiDebugOverlay() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => setEntries([...requestLog]), 300);
    return () => clearInterval(iv);
  }, []);

  const pending = entries.filter((e) => e.status === 'pending');
  const done = entries.filter((e) => e.status !== undefined && e.status !== null);

  if (entries.length === 0 && !expanded) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {expanded ? '▼' : '▶'}{' '}
          {pending.length > 0 ? `⏳ ${pending.length} pending` : `${done.length} calls`}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          nestedScrollEnabled
        >
          {entries.length === 0 && <Text style={styles.empty}>waiting for API calls...</Text>}
          {entries.map((e, i) => (
            <View key={i} style={styles.row}>
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
              <Text style={styles.method}>{e.method}</Text>
              <Text style={styles.url} numberOfLines={1}>
                {shortUrl(e.url)}
              </Text>
              <Text
                style={[styles.time, { color: e.status === 'pending' ? '#FFD43B' : '#40C057' }]}
              >
                {e.status === 'pending'
                  ? `⏳ ${formatMs(Date.now() - e.start)}`
                  : `✓ ${formatMs(e.ms)}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(0,0,0,0.88)',
    borderRadius: 8,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  toggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  toggleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  scroll: {
    maxHeight: 180,
  },
  content: {
    paddingHorizontal: 10,
    paddingBottom: 6,
    gap: 3,
  },
  empty: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  method: {
    color: '#aaa',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    width: 28,
  },
  url: {
    color: '#ddd',
    fontSize: 9,
    flex: 1,
    fontFamily: 'monospace',
  },
  time: {
    color: '#40C057',
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    width: 60,
    textAlign: 'right',
    fontFamily: 'monospace',
  },
});
