import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

type ProfitItem = {
  amount: number;
  categoryId?: string;
  type: 'income' | 'expense';
};

type ProfitData = Record<string, ProfitItem>;

const categoryColors: Record<string, string> = {
  salary: '#4caf50',
  food: '#f44336',
  shopping: '#ff9800',
  entertainment: '#9c27b0',
  other: '#607d8b',
};

export default function ReportScreen() {
  const [profitData, setProfitData] = useState<ProfitData>({});
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [pieData, setPieData] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  // 支出・収入を動的計算用にステート化
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const json = await AsyncStorage.getItem('profitData');
          if (json) {
            setProfitData(JSON.parse(json));
          } else {
            setProfitData({});
          }
        } catch (e) {
          console.error('データ読み込みエラー:', e);
        }
      };
      loadData();
    }, [])
  );

  useEffect(() => {
    const filteredEntries = Object.entries(profitData)
      .filter(([date]) => date.startsWith(selectedMonth))
      .map(([, item]) => item);

    // 集計：カテゴリ別金額（絶対値で集計）
    const grouped: Record<string, number> = {};
    filteredEntries.forEach(item => {
      const id = item.categoryId ?? 'other';
      const amount = Math.abs(item.amount);
      grouped[id] = (grouped[id] || 0) + amount;
    });

    // 円グラフ用データ生成
    const entries = Object.entries(grouped);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    setTotalAmount(total);

    const data = entries.map(([categoryId, amount]) => ({
      name: categoryId,
      amount,
      color: categoryColors[categoryId] || '#999999',
      legendFontColor: '#333333',
      legendFontSize: 14,
    }));

    setPieData(data);

    // 支出と収入の合計計算
    const expenseSum = filteredEntries
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const incomeSum = filteredEntries
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    setTotalExpense(expenseSum);
    setTotalIncome(incomeSum);
  }, [profitData, selectedMonth]);

  const displayMonthJP = dayjs(selectedMonth).format('YYYY年M月');
  const period = `${displayMonthJP}1日 〜 ${displayMonthJP}末日`;

  // 収支計算
  const balance = totalIncome - totalExpense;
  // 予算は仮に固定値。必要ならstate化して動的にできます
  const budget = 65300;

  const chartWidth = 200;
  const chartHeight = 200;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.toggleButton}>
          <Text style={styles.toggleTextSelected}>月別</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggleButton}>
          <Text style={styles.toggleText}>年間</Text>
        </TouchableOpacity>
        <View style={styles.settings}>
          <Text style={styles.settingsText}>設定</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 収支概要 */}
        <View style={styles.summaryContainer}>
          <Text style={styles.availableText}>あと ￥0 使えます</Text>
          <Text style={styles.remainingText}>残り16日 1日あたり ￥0</Text>
        </View>

        {/* 各種項目 */}
        <View style={styles.grid}>
          <View style={styles.cardRed}>
            <Text style={styles.cardTitle}>支出</Text>
            <Text style={styles.cardAmountRed}>¥{totalExpense.toLocaleString()}</Text>
          </View>
          <View style={styles.cardBlue}>
            <Text style={styles.cardTitle}>収入</Text>
            <Text style={styles.cardAmountBlue}>¥{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={styles.cardGreen}>
            <Text style={styles.cardTitle}>予算</Text>
            <Text style={styles.cardAmountGreen}>¥{budget.toLocaleString()}</Text>
          </View>
          <View style={styles.cardGray}>
            <Text style={styles.cardTitle}>収支</Text>
            <Text style={styles.cardAmountGray}>¥{balance.toLocaleString()}</Text>
          </View>
        </View>

        {/* 総資産 */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>残り総資産</Text>
          <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#2e7d32' : '#ff4444' }]}>
            ¥{balance.toLocaleString()}
          </Text>
        </View>

        {/* カテゴリセレクター */}
        <TouchableOpacity style={styles.dropdown}>
          <Text>カテゴリ別収入 ⌄</Text>
        </TouchableOpacity>

      {/* 円グラフ */}
<View style={{ position: 'relative', width: chartWidth, height: chartHeight, alignSelf: 'center' }}>
  <PieChart
    data={pieData}
    width={chartWidth * 2} 
    height={chartHeight}
    chartConfig={{
      color: () => '#000',
      labelColor: () => '#000',
    }}
    accessor="amount"
    backgroundColor="transparent"
    paddingLeft="0"
    hasLegend={false} // 自分で凡例作るため非表示に
  />

  {/* 中央に文字 */}
  <View style={styles.centeredTextWrapper}>
    <Text style={styles.centeredText}>カテゴリ別収入</Text> 
    {/* ここを好きな文字列に */}
  </View>
</View>

{/* 凡例部分 */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 10 }}>
  {pieData.map(({ name, color }) => (
    <View key={name} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginVertical: 4 }}>
      <View style={{ width: 16, height: 16, backgroundColor: color, borderRadius: 4, marginRight: 6 }} />
      <Text>{name}</Text>
    </View>
  ))}
</View>

        {/* 日付選択 */}
        <View style={styles.dateSelector}>
          <Text>← 先月</Text>
          <Text>{displayMonthJP}</Text>
          <Text>翌月 →</Text>
        </View>
        <Text style={styles.dateRange}>{period}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf7f1' },
  scrollContainer: { paddingBottom: 80 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 8 },
  toggleTextSelected: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  toggleText: { fontSize: 16, color: '#888' },
  settings: { padding: 8 },
  settingsText: { fontSize: 14, color: '#555' },

  summaryContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  availableText: { fontSize: 20, fontWeight: 'bold' },
  remainingText: { fontSize: 14, color: '#555' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  cardRed: {
    backgroundColor: '#ffe5e5',
    width: '45%',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardBlue: {
    backgroundColor: '#e5f0ff',
    width: '45%',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardGreen: {
    backgroundColor: '#e0fbe0',
    width: '45%',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardGray: {
    backgroundColor: '#f0f0f0',
    width: '45%',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardTitle: { fontSize: 14, color: '#555' },
  cardAmountRed: { fontSize: 18, fontWeight: 'bold', color: '#ff3333' },
  cardAmountBlue: { fontSize: 18, fontWeight: 'bold', color: '#007bff' },
  cardAmountGreen: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  cardAmountGray: { fontSize: 18, fontWeight: 'bold', color: '#888' },

  balanceContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 14, color: '#555' },
  balanceAmount: { fontSize: 20, fontWeight: 'bold' },

  dropdown: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    alignItems: 'center',
  },

  chartWrapper: {
    alignItems: 'center',
    marginVertical: 20,
  },

  chartPlaceholder: {
    backgroundColor: '#fcb900',
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartText: { fontWeight: 'bold', color: '#333' },

  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 24,
    color: '#333',
  },

  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    marginTop: 12,
  },
  dateRange: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },

  centeredTextWrapper: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  centeredText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  centeredAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
});
