import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

type ProfitItem = {
  amount: number;
  categoryId?: string;
  type: 'income' | 'expense'; // ★追加
};


type ProfitData = Record<string, ProfitItem>;

export default function GraphScreen() {
  const [profitData, setProfitData] = useState<ProfitData>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [labels, setLabels] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const json = await AsyncStorage.getItem('profitData');
        if (json) {
          const allData: ProfitData = JSON.parse(json);
          setProfitData(allData);
        }
      };
      loadData();
    }, [])
  );

  useEffect(() => {
    const filteredDates = Object.keys(profitData)
      .filter(date => date.startsWith(selectedMonth))
      .sort();

    const values = filteredDates.map(date => {
      const item = profitData[date];
      if (!item || typeof item.amount !== 'number') return 0;
      const amount = Math.abs(item.amount);
      return item.type === 'expense' ? -amount : amount;
    });


    setLabels(filteredDates.map(d => d.slice(8)));

    const cumulativeValues = values.reduce<number[]>((acc, val) => {
      const last = acc.length > 0 ? acc[acc.length - 1] : 0;
      acc.push(last + val);
      return acc;
    }, []);

    setDataPoints(cumulativeValues);
    setTotalProfit(cumulativeValues[cumulativeValues.length - 1] || 0);
  }, [profitData, selectedMonth]);


  const chartWidth = Math.max(labels.length * 50, Dimensions.get('window').width - 16);
  const year = 2025;

  const monthItems = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    return <Picker.Item key={value} label={`${year}年${month}月`} value={value} />;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <Text style={styles.title}>月別損益グラフ</Text>

      <Picker
        selectedValue={selectedMonth}
        onValueChange={setSelectedMonth}
        style={styles.picker}
      >
        {monthItems}
      </Picker>

      {/* グラフ or データなしメッセージ */}
      <View style={styles.graphWrapper}>
        {dataPoints.length > 0 ? (
          <LineChart
            data={{
              labels: labels,
              datasets: [{ data: dataPoints }],
            }}
            width={chartWidth}
            height={280}
            yAxisSuffix="円"
            fromZero
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: '#00adf5',
              },
            }}
            style={{ marginVertical: 80, borderRadius: 16, paddingTop: 24 }}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>この月のデータはありません。</Text>
          </View>
        )}
      </View>

      <Text style={styles.totalText}>合計損益：{totalProfit.toLocaleString()}円</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 80,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  picker: {
    marginVertical: 20,
    marginHorizontal: 32,
    height: 56,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 20,
  },
  graphWrapper: {
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 60,
    color: '#333',
  },
});
