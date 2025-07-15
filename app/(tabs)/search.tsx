import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useFocusEffect } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.locale('ja');

type ProfitItem = {
  id: string;
  date: string;
  categoryId?: string;
  amount: number;
  memo?: string;
  type?: 'income' | 'expense';
};

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

const getIconInfo = (categoryId?: string) => {
  return categoryMap[categoryId ?? ''] ?? { iconName: 'help-circle', color: 'gray' };
};

type ProfitData = Record<string, ProfitItem>;

export default function IncomeListScreen() {
  const [items, setItems] = useState<ProfitItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [fromDate, setFromDate] = useState(dayjs('2025-07-01'));
  const [toDate, setToDate] = useState(dayjs('2025-07-31'));
  const [isFromPickerVisible, setFromPickerVisible] = useState(false);
  const [isToPickerVisible, setToPickerVisible] = useState(false);

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
  }, );

  const filteredItems = items.filter((item) => {
    const itemDate = dayjs(item.date);
    const inRange = itemDate.isSameOrAfter(fromDate, 'day') && itemDate.isSameOrBefore(toDate, 'day');
    const typeMatch = filterType === 'all' || item.type === filterType;
    return inRange && typeMatch;
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

      <TouchableOpacity onPress={() => setFromPickerVisible(true)}>
        <Text style={styles.datePickerText}>開始日: {fromDate.format('YYYY-MM-DD')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setToPickerVisible(true)}>
        <Text style={styles.datePickerText}>終了日: {toDate.format('YYYY-MM-DD')}</Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={isFromPickerVisible}
        mode="date"
        date={fromDate.toDate()}
        onConfirm={(date) => {
          setFromDate(dayjs(date));
          setFromPickerVisible(false);
        }}
        onCancel={() => setFromPickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={isToPickerVisible}
        mode="date"
        date={toDate.toDate()}
        onConfirm={(date) => {
          setToDate(dayjs(date));
          setToPickerVisible(false);
        }}
        onCancel={() => setToPickerVisible(false)}
      />

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
  datePickerText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 4,
    color: '#333',
  },
});
