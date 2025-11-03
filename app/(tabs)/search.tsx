import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  salary: { iconName: 'wallet', color: '#29B6F6' },
  side_job: { iconName: 'bicycle', color: '#AB47BC' },
  other: { iconName: 'ellipsis-horizontal-circle', color: '#BDBDBD' }
};

const getIconInfo = (categoryId?: string) => {
  return categoryMap[categoryId ?? ''] ?? { iconName: 'help-circle', color: 'gray' };
};
// 修正: ProfitDataの型定義をNextScreenと合わせる
type ProfitData = Record<string, ProfitItem[]>; // 日付をキーとし、値がProfitItemの配列

export default function IncomeListScreen() {
  const [items, setItems] = useState<ProfitItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [fromDate, setFromDate] = useState(dayjs().startOf('month'));
  const [toDate, setToDate] = useState(dayjs().endOf('month'));
  const [isFromPickerVisible, setFromPickerVisible] = useState(false);
  const [isToPickerVisible, setToPickerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const json = await AsyncStorage.getItem('profitData');
          if (json) {
            const rawData: ProfitData = JSON.parse(json);
            
            // 修正: rawDataがRecord<string, ProfitItem[]>なので、それをフラットにする
            const allItems: ProfitItem[] = [];
            Object.entries(rawData).forEach(([date, dailyItems]) => {
              if (Array.isArray(dailyItems)) { // dailyItemsが配列であることを確認
                dailyItems.forEach(item => {
                  allItems.push({
                    ...item,
                    date: date, // item自体にはdateプロパティがない可能性があるので、キーのdateを追加
                    memo: item.memo || '', // memoがundefinedの場合に空文字列を設定
                    type: item.type || 'expense', // typeがundefinedの場合にデフォルト値を設定 (適宜調整)
                  });
                });
              } else {
                 // 旧形式のデータ（単一のProfitItem）が直接日付に紐付いている場合への対応
                 const oldItem = dailyItems as ProfitItem;
                 if (oldItem.amount !== undefined) {
                     allItems.push({
                         ...oldItem,
                         date: date,
                         memo: oldItem.memo || '',
                         type: oldItem.type || 'expense',
                     });
                 }
              }
            });
            setItems(allItems);
          }
        } catch (e) {
          console.error('読み込み失敗:', e);
        }
      };
      loadData();
    }, [])
  );

  const filteredItems = items.filter((item) => {
    const itemDate = dayjs(item.date); // item.dateが存在することを前提
    const inRange = itemDate.isSameOrAfter(fromDate, 'day') && itemDate.isSameOrBefore(toDate, 'day');
    const typeMatch = filterType === 'all' || item.type === filterType;
    return inRange && typeMatch;
  });

  const grouped = filteredItems.reduce<Record<string, ProfitItem[]>>((acc, item) => {
    if (!acc[item.date]) acc[item.date] = [];
    acc[item.date].push(item);
    return acc;
  }, {});

  const RenderEntry = memo(({ item }: { item: ProfitItem }) => {
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
        {/* RenderEntryではitem.dateではなく、グループのdateを使っているのでここは削除するか、適切なdateを表示するように変更が必要 */}
        {/* <Text style={styles.date}>{item.date}</Text> */} 
      </View>
    );
  });


  return (
    <SafeAreaView style={styles.safeArea}>
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
          themeVariant='light'
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
                  sum + (e.type === 'expense' ? -Math.abs(e.amount) : Math.abs(e.amount)), 0
                ).toLocaleString()}
              </Text>
              {entries.map((entry) => (
                <RenderEntry key={entry.id} item={entry} />
              ))}
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  datePickerText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 6,
    color: '#333',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  tab: {
    fontSize: 16,
    color: '#888',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  selectedTab: {
    color: '#000',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginVertical: 6,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  icon: {
    marginRight: 10,
  },
  entryText: {
    flex: 1,
  },
  memo: {
    fontSize: 12,
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#aaa',
  },
  profit: {
    color: 'red',
    fontSize: 16,
  },
  loss: {
    color: 'blue',
    fontSize: 16,
  },
});
