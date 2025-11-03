import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker'; // 月選択用にPickerをインポート
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

// ProfitItem の型定義にidを追加 (GraphScreenやCalendarScreenと一貫性を保つため)
type ProfitItem = {
  id: string; // 各項目を一意に識別するためのID
  categoryId?: string;
  amount: number;
  memo?: string;
  type?: 'income' | 'expense'; // typeが未定義の場合のデフォルト値を設定できるように任意型に
};

// ProfitData の型定義を ProfitItem の配列を保持するように変更
type ProfitData = Record<string, ProfitItem[]>; // keyは日付文字列（YYYY-MM-DD）

const categories = [
  { id: 'food', label: '食費', color: '#FDD835' },
  { id: 'clothes', label: '衣服', color: '#42A5F5' },
  { id: 'hobby', label: '趣味', color: '#AB47BC' },
  { id: 'transport', label: '交通費', color: '#26C6DA' },
  { id: 'daily', label: '生活用品', color: '#66BB6A' },
  { id: 'social', label: '交際費', color: '#FFA726' },
  { id: 'rent', label: '家賃', color: '#EF5350' },
  { id: 'communication', label: '通信費', color: '#7E57C2' },
  { id: 'salary', label: '給料', color: '#29B6F6' },
  { id: 'other_expense', label: 'その他支出', color: '#BDBDBD' },
  { id: 'other_income', label: 'その他収入', color: '#BDBDBD' },
  // 未分類項目用のデフォルトカラー
  { id: 'other', label: '未分類', color: '#999999' },
];

const categoryInfo = categories.reduce((map, item) => {
  map[item.id] = item;
  return map;
}, {} as Record<string, { id: string; label: string; color: string }>);

const screenWidth = Dimensions.get('window').width;

export default function ReportScreen() {
  const [profitData, setProfitData] = useState<ProfitData>({});
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'));

  const [pieData, setPieData] = useState<any[]>([]);
  const [totalCategoryAmount, setTotalCategoryAmount] = useState<number>(0); // 円グラフに表示されている合計額

  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);

  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense'); // デフォルトを支出に変更

  // Picker用の月リストを生成
  const generateMonthItems = () => {
    const items = [];
    const currentYear = dayjs().year();
    // 例: 現在の年から過去1年分と未来1年分の月を表示
    for (let i = -12; i <= 12; i++) {
      const month = dayjs().add(i, 'month');
      const value = month.format('YYYY-MM');
      const label = month.format('YYYY年M月');
      items.push(<Picker.Item key={value} label={label} value={value} />);
    }
    return items;
  };

  useFocusEffect(
    useCallback(() => {
      const loadProfitData = async () => {
        try {
          const json = await AsyncStorage.getItem('profitData');
          if (json) {
            const rawData = JSON.parse(json);
            let convertedData: ProfitData = {};

            if (rawData && typeof rawData === 'object' && Object.keys(rawData).length > 0) {
              for (const dateString in rawData) {
                if (Object.prototype.hasOwnProperty.call(rawData, dateString)) {
                  const value = rawData[dateString];

                  if (Array.isArray(value)) {
                    convertedData[dateString] = value;
                  } else if (typeof value === 'object' && value !== null && 'amount' in value) {
                    const itemWithId: ProfitItem = {
                      ...value,
                      id: value.id || dayjs(dateString).format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 10),
                      type: value.type ?? 'expense' // typeがない場合はexpenseをデフォルトに
                    };
                    convertedData[dateString] = [itemWithId];
                  }
                }
              }
            }
            setProfitData(convertedData);
          } else {
            setProfitData({});
          }
        } catch (e) {
          console.error('データ読み込みエラー:', e);
        }
      };
      loadProfitData();
    }, [])
  );

  useEffect(() => {
    // 全てのProfitItemをフラットな配列に変換
    const allItemsInMonth: ProfitItem[] = Object.entries(profitData)
      .filter(([date]) => date.startsWith(selectedMonth))
      .flatMap(([, items]) => items); // ここでProfitItem[]を展開

    // 収入・支出合計計算
    const expenseSum = allItemsInMonth
      .filter(item => item.type === 'expense')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    const incomeSum = allItemsInMonth
      .filter(item => item.type === 'income')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    setTotalExpense(expenseSum);
    setTotalIncome(incomeSum);

    // 円グラフ用のカテゴリ別合計
    const filteredForPieChart = allItemsInMonth
      .filter(item => (item.type ?? 'expense') === selectedType); // typeが未定義ならexpense扱い

    const grouped: Record<string, number> = {};
    filteredForPieChart.forEach(item => {
      const id = item.categoryId ?? 'other'; // categoryIdがない場合は'other'に分類
      grouped[id] = (grouped[id] || 0) + Math.abs(item.amount);
    });

    const entries = Object.entries(grouped);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    setTotalCategoryAmount(total); // 円グラフに表示される合計

    const data = entries.map(([categoryId, amount]) => ({
      name: categoryInfo[categoryId]?.label ?? categoryId, // ラベルを表示
      amount,
      color: categoryInfo[categoryId]?.color || categoryInfo['other'].color,
      legendFontColor: '#333333',
      legendFontSize: 14,
    }));

    setPieData(data);

  }, [profitData, selectedMonth, selectedType]);

  const displayMonthJP = dayjs(selectedMonth).format('YYYY年M月');
  const monthStart = dayjs(selectedMonth).startOf('month');
  const monthEnd = dayjs(selectedMonth).endOf('month');
  const today = dayjs();

  const remainingDaysInMonth = monthEnd.diff(today, 'day') + 1; // 今日を含む残り日数

  const balance = totalIncome - totalExpense;
  const availableForRestOfMonth = totalIncome - totalExpense; // 月間の収支

  // 1日あたりの使用可能額（残り日数が0以下になることも考慮）
  const perDayAllowance = remainingDaysInMonth > 0 ? Math.max(0, availableForRestOfMonth / remainingDaysInMonth) : 0;


  const chartSize = screenWidth * 0.7; // 画面幅の70%を使用
  const pieChartRadius = chartSize / 2;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.toggleButton}>
          <Text style={styles.toggleTextSelected}>月別</Text>
        </TouchableOpacity>
        {/* 年間機能はまだ実装されていないことを示す */}
        <TouchableOpacity style={styles.toggleButton} onPress={() => alert('年間表示機能は準備中です！')}>
          <Text style={styles.toggleText}>年間</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settings} onPress={() => alert('設定機能は準備中です！')}>
          <Text style={styles.settingsText}>設定</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.summaryContainer}>
          <Text style={styles.availableText}>
            あと{' '}
            <Text style={{ color: availableForRestOfMonth >= 0 ? '#2e7d32' : '#ff4444' }}>
              ￥{availableForRestOfMonth.toLocaleString()}
            </Text>{' '}
            使えます
          </Text>
          {remainingDaysInMonth > 0 ? (
            <Text style={styles.remainingText}>
              残り{remainingDaysInMonth}日 1日あたり ￥{Math.round(perDayAllowance).toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.remainingText}>今月の残日数はありません。</Text>
          )}
        </View>

        <View style={styles.grid}>
          <View style={styles.cardRed}>
            <Text style={styles.cardTitle}>支出</Text>
            <Text style={styles.cardAmountRed}>¥{totalExpense.toLocaleString()}</Text>
          </View>
          <View style={styles.cardBlue}>
            <Text style={styles.cardTitle}>収入</Text>
            <Text style={styles.cardAmountBlue}>¥{totalIncome.toLocaleString()}</Text>
          </View>
          <View style={styles.cardGray}>
            <Text style={styles.cardTitle}>収支</Text>
            <Text style={styles.cardAmountGray}>¥{balance.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>月間の収支</Text>
          <Text style={[styles.balanceAmount, { color: balance >= 0 ? '#2e7d32' : '#ff4444' }]}>
            ¥{balance.toLocaleString()}
          </Text>
        </View>

        {/* 月選択 Picker */}
        <View style={styles.monthPickerContainer}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={(itemValue) => setSelectedMonth(itemValue)}
            style={styles.monthPicker}
            itemStyle={styles.monthPickerItem}
          >
            {generateMonthItems()}
          </Picker>
        </View>

        {/* ▼ 収支切替トグル */}
        <View style={styles.typeToggleButtonGroup}>
          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'expense' && styles.typeButtonSelected]}
            onPress={() => setSelectedType('expense')}
          >
            <Text style={selectedType === 'expense' ? styles.typeButtonTextSelected : styles.typeButtonText}>
              支出
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, selectedType === 'income' && styles.typeButtonSelected]}
            onPress={() => setSelectedType('income')}
          >
            <Text style={selectedType === 'income' ? styles.typeButtonTextSelected : styles.typeButtonText}>
              収入
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative', width: chartSize, height: chartSize, alignSelf: 'center' }}>
          {pieData.length > 0 && totalCategoryAmount > 0 ? (
            <PieChart
              data={pieData}
              width={chartSize}
              height={chartSize}
              chartConfig={{ color: () => '#000', labelColor: () => '#000' }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft={`${pieChartRadius * 0.1}`} // パディングを円のサイズに合わせて調整
              center={[0, 0]} // チャートの中心
              hasLegend={false}
              absolute // 金額を絶対値で表示
            />
          ) : (
            <View style={styles.noChartDataContainer}>
              <Text style={styles.noChartDataText}>データがありません</Text>
            </View>
          )}

          <View style={styles.centeredTextWrapper}>
            <Text style={styles.centeredLabelText}>カテゴリ別{selectedType === 'income' ? '収入' : '支出'}</Text>
            <Text style={styles.centeredTotalText}>￥{totalCategoryAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* 凡例 */}
        <View style={styles.legendContainer}>
          {pieData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>
                {item.name} ({((item.amount / totalCategoryAmount) * 100).toFixed(1)}%)
              </Text>
            </View>
          ))}
          {pieData.length === 0 && (
             <Text style={styles.legendNoDataText}>この月の{selectedType === 'income' ? '収入' : '支出'}データはありません。</Text>
          )}
        </View>

        <Text style={styles.dateRange}>
          {monthStart.format('YYYY年M月D日')} 〜 {monthEnd.format('YYYY年M月D日')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf7f1' },
  scrollContainer: { paddingBottom: 80 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: 20, alignItems: 'center',
  },
  toggleButton: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 6, borderRadius: 6 },
  toggleTextSelected: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  toggleText: { fontSize: 16, color: '#888' },
  settings: { padding: 8 },
  settingsText: { fontSize: 14, color: '#555' },

  summaryContainer: { alignItems: 'center', marginTop: 16, marginBottom: 8 },
  availableText: { fontSize: 20, fontWeight: 'bold' },
  remainingText: { fontSize: 14, color: '#555' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginTop: 12 },
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
  cardGray: {
    backgroundColor: '#f0f0f0',
    width: '45%',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: '#555',
  },
  cardAmountRed: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff3333',
  },
  cardAmountBlue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  cardAmountGray: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  balanceContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#555',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthPickerContainer: {
    marginVertical: 10,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden', // iOSでPickerの枠からはみ出るのを防ぐ
  },
  monthPicker: {
    height: 50,
    width: '100%',
  },
  monthPickerItem: {
    height: 50,
    fontSize: 16,
  },
  typeToggleButtonGroup: { // 収支切替ボタンのグループ
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    marginBottom: 20,
  },
  typeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#eee',
  },
  typeButtonSelected: {
    backgroundColor: '#00adf5',
  },
  typeButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  centeredTextWrapper: {
    position: 'absolute',
    top: '50%', // 中心に配置
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }], // テキストの高さ分調整
  },
  centeredLabelText: {
    fontSize: 14,
    color: '#555',
  },
  centeredTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  noChartDataContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)', // グラフがないことを示すため半透明の背景
    borderRadius: Dimensions.get('window').width * 0.35, // 円の形に合わせる
  },
  noChartDataText: {
    fontSize: 16,
    color: '#888',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
    width: '45%', // 2列表示
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#333',
  },
  legendNoDataText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  dateRange: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 20,
  },
});