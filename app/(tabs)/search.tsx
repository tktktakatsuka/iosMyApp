import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ProfitItem = {
  id: string;
  date: string;
  categoryId?: string;
  amount: number;
  memo?: string;
  type?: 'income' | 'expense';
};

type ProfitData = Record<string, ProfitItem>;

export default function IncomeListScreen() {
  const [items, setItems] = useState<ProfitItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const json = await AsyncStorage.getItem('profitData');
        if (json) {
          const rawData: Record<string, ProfitItem> = JSON.parse(json);
          // ProfitItemにidとdateを追加してリスト化
          const parsed: ProfitItem[] = Object.entries(rawData).map(([date, item]) => ({
            id: date,
            date,
            amount: item.amount,
            categoryId: item.categoryId,
            type: item.type,
            memo: '', // メモがない前提（必要なら保存側も修正）
          }));
          setItems(parsed);
        }
      } catch (e) {
        console.error('読み込み失敗:', e);
      }
    };
    loadData();
  }, []);

  const grouped = items.reduce<Record<string, ProfitItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const renderEntry = (item: ProfitItem) => (
    <View style={styles.entry} key={item.id}>
      <Ionicons name="cash" size={20} color="orange" style={styles.icon} />
      <View style={styles.entryText}>
        <Text style={{ color: '#0077cc' }}>￥{item.amount}</Text>
        {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
      </View>
      <Text style={styles.date}>{item.date}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>2025年7月1日（火）〜7月31日（木）</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity><Text style={styles.tab}>支出</Text></TouchableOpacity>
        <TouchableOpacity><Text style={[styles.tab, styles.selectedTab]}>収入</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.tab}>その他</Text></TouchableOpacity>
      </View>

      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([date]) => date}
        renderItem={({ item: [date, entries] }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateLabel}>
              {dayjs(date).format('D日（ddd）')} ¥
              {entries.reduce((sum, e) => sum + e.amount, 0)}
            </Text>
            {entries.map((entry) => (
              <View key={entry.id}>
                {renderEntry(entry)}
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 10 },
  header: { textAlign: 'center', fontSize: 16, marginBottom: 10 },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  tab: { fontSize: 16, color: '#888' },
  selectedTab: { color: '#000', fontWeight: 'bold', textDecorationLine: 'underline' },
  dateGroup: { marginBottom: 20 },
  dateLabel: { fontSize: 14, fontWeight: 'bold', marginVertical: 6 },
  entry: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  icon: { marginRight: 10 },
  entryText: { flex: 1 },
  memo: { fontSize: 12, color: '#666' },
  date: { fontSize: 10, color: '#aaa' },
});
