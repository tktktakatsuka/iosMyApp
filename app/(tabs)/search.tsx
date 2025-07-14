import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ProfitItem = {
  id: string;
  date: string;
  categoryId?: string;
  amount: number;
  memo?: string;
  type?: 'income' | 'expense';
};

// カテゴリごとのアイコンと色のマップを定義（NextScreenと同じに）
const categoryMap: Record<string, { iconName: keyof typeof Ionicons.glyphMap; color: string }> = {
  food: { iconName: 'restaurant', color: '#FDD835' },
  clothes: { iconName: 'shirt', color: '#42A5F5' },
  hobby: { iconName: 'game-controller', color: '#AB47BC' },
  transport: { iconName: 'bus', color: '#26C6DA' },
  daily: { iconName: 'cart', color: '#66BB6A' },
  social: { iconName: 'people', color: '#FFA726' },
  rent: { iconName: 'home', color: '#EF5350' },
  communication: { iconName: 'wifi', color: '#7E57C2' },
};

// カテゴリIDからアイコン名と色を取得（なければデフォルト）
const getIconInfo = (categoryId?: string) => {
  return categoryMap[categoryId ?? ''] ?? { iconName: 'help-circle', color: 'gray' };
};


type ProfitData = Record<string, ProfitItem>;

export default function IncomeListScreen() {
  const [items, setItems] = useState<ProfitItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  useFocusEffect(() => {
    const loadData = async () => {
      try {
        const json = await AsyncStorage.getItem('profitData');
        if (json) {
          const rawData: ProfitData = JSON.parse(json);
          const parsed: ProfitItem[] = Object.entries(rawData).map(([date, item]) => ({
            id: date,
            date,
            amount: item.amount,
            categoryId: item.categoryId,
            type: item.type,
            memo: '',
          }));
          setItems(parsed);
        }
      } catch (e) {
        console.error('読み込み失敗:', e);
      }
    };
    loadData();
  },);

  // フィルター処理
  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const grouped = filteredItems.reduce<Record<string, ProfitItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const renderEntry = (item: ProfitItem) => {
    const { iconName, color } = getIconInfo(item.categoryId);
    return (
      <View style={styles.entry} key={item.id}>
        <Ionicons name={iconName} size={20} color={color} style={styles.icon} />
        <View style={styles.entryText}>
          <Text style={item.type === 'expense' ? styles.loss : styles.profit}>
            {item.type === 'expense' ? `-￥${Math.abs(item.amount)}` : `+￥${item.amount}`}
          </Text>
          {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </View>
    );
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.header}>2025年7月1日（火）〜7月31日（木）</Text>

      {/* タブ切り替え */}
      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setFilterType('expense')}>
          <Text style={[styles.tab, filterType === 'expense' && styles.selectedTab]}>支出</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterType('income')}>
          <Text style={[styles.tab, filterType === 'income' && styles.selectedTab]}>収入</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterType('all')}>
          <Text style={[styles.tab, filterType === 'all' && styles.selectedTab]}>すべて</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={Object.entries(grouped)}
        keyExtractor={([date]) => date}
        renderItem={({ item: [date, entries] }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateLabel}>
              {dayjs(date).format('D日（ddd）')} ¥
              {entries.reduce((sum, e) =>
                sum + (e.type === 'expense' ? -Math.abs(e.amount) : Math.abs(e.amount)), 0)}
            </Text>
            {entries.map((entry) => (
              <View key={entry.id}>{renderEntry(entry)}</View>
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
  profit: { color: 'red', fontSize: 14 },
  loss: { color: 'blue', fontSize: 14 },
});
