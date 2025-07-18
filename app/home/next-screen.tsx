import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';

type ProfitItem = {
  amount: number;
  categoryId?: string;
  type: 'income' | 'expense'; // ←追加
};

type Category = {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
};

type ProfitData = Record<string, ProfitItem>;

export default function NextScreen() {
  const { date } = useLocalSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [profitType, setProfitType] = useState<'income' | 'expense'>('expense');
  const categories: Category[] = [
    { id: 'food', label: '食費', iconName: 'restaurant', color: '#FDD835' },
    { id: 'clothes', label: '衣服', iconName: 'shirt', color: '#42A5F5' },
    { id: 'hobby', label: '趣味', iconName: 'game-controller', color: '#AB47BC' },
    { id: 'transport', label: '交通費', iconName: 'bus', color: '#26C6DA' },
    { id: 'daily', label: '生活用品', iconName: 'cart', color: '#66BB6A' },
    { id: 'social', label: '交際費', iconName: 'people', color: '#FFA726' },
    { id: 'rent', label: '家賃', iconName: 'home', color: '#EF5350' },
    { id: 'communication', label: '通信費', iconName: 'wifi', color: '#7E57C2' },
    { id: 'salary', label: '給料', iconName: 'wallet', color: '#29B6F6' },
    { id: 'other', label: 'その他', iconName: 'ellipsis-horizontal-circle', color: '#BDBDBD' }
  ];
  


  const loadProfit = async (targetDate: string) => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      if (json) {
        const data: ProfitData = JSON.parse(json);
        const item = data[targetDate];
        if (item !== undefined && typeof item.amount === 'number') {
          setAmount(String(item.amount));
          setSelectedCategory(item.categoryId ?? null); // ← カテゴリ復元もここで
          setProfitType(item.type || 'expense'); // ←収支タイプの復元
        }
      }
    } catch (e) {
      console.error('読み込み失敗:', e);
    }
  };

  const saveProfit = async () => {
    if (typeof date !== 'string') return;

    const numericValue = parseInt(amount);
    if (isNaN(numericValue)) {
      Alert.alert('数字を入力してください');
      return;
    }

    try {
      const json = await AsyncStorage.getItem('profitData');
      const data: ProfitData = json ? JSON.parse(json) : {};

      data[date] = {
        amount: numericValue,
        categoryId: selectedCategory || '',
        type: profitType,
      };

      await AsyncStorage.setItem('profitData', JSON.stringify(data));

      Alert.alert('保存しました');
      router.back();
    } catch (e) {
      console.error('保存失敗:', e);
    }
  };

  const onSelect = (item: Category) => {
    setSelectedCategory(item.id);
  };

  useEffect(() => {
    if (typeof date === 'string') {
      loadProfit(date);
    }
  }, [date]);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Stack.Screen options={{ title: '損益入力' }} />
        <Text style={styles.label}>{date} の損益</Text>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, profitType === 'income' && styles.toggleSelected]}
            onPress={() => setProfitType('income')}
          >
            <Text style={styles.toggleText}>収入</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, profitType === 'expense' && styles.toggleSelected]}
            onPress={() => setProfitType('expense')}
          >
            <Text style={styles.toggleText}>支出</Text>
          </TouchableOpacity>
        </View>



        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="例: 2000"
        />

        <Text style={styles.label}>カテゴリを選択</Text>

        <FlatList
          data={categories}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  isSelected && { backgroundColor: '#e0f7fa', borderColor: item.color, borderWidth: 2 },
                ]}
                onPress={() => onSelect(item)}
              >
                <Ionicons name={item.iconName} size={40} color={item.color} style={styles.icon} />
                <Text>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <Button title="保存する" onPress={saveProfit} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  item: {
    width: 90,
    height: 90,
    flex: 1,
    margin: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 10,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    borderRadius: 6,
  },
  icon: {
    width: 40,
    height: 40,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aaa',
    backgroundColor: '#f0f0f0',
  },
  toggleSelected: {
    backgroundColor: '#00bcd4',
    borderColor: '#00bcd4',
  },
  toggleText: {
    color: '#333',
    fontWeight: 'bold',
  },
});
