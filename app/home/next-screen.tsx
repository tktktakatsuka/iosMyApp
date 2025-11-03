import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs'; // 追加：id生成用
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler';

// ProfitItem の型定義を更新 (idを追加)
type ProfitItem = {
  id: string; // 各項目を一意に識別するためのID
  amount: number;
  categoryId?: string;
  type: 'income' | 'expense';
  // 必要であれば、timestampなどを追加して詳細なソートなどに利用可能
};

type Category = {
  id: string;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
};

// ProfitData の型定義を ProfitItem の配列を保持するように変更
type ProfitData = Record<string, ProfitItem[]>;

export default function NextScreen() {
  const { date } = useLocalSearchParams();
  const router = useRouter();
  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [profitType, setProfitType] = useState<'income' | 'expense'>('expense');
  const [dailyProfitItems, setDailyProfitItems] = useState<ProfitItem[]>([]); // その日の損益項目を保持
  const [editingItemId, setEditingItemId] = useState<string | null>(null); // 編集中アイテムのID

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
    { id: 'side_job', label: '副業', iconName: 'bicycle', color: '#AB47BC' },
    { id: 'other', label: 'その他', iconName: 'ellipsis-horizontal-circle', color: '#BDBDBD' }
  ];

  // カテゴリIDからカテゴリオブジェクトを取得するヘルパー関数
  const getCategoryById = (categoryId: string | undefined): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  // その日の損益データを読み込む
  const loadDailyProfitItems = async (targetDate: string) => {
    try {
      const json = await AsyncStorage.getItem('profitData');
      if (json) {
        const data: ProfitData = JSON.parse(json);
        // data[targetDate]が配列でない場合も考慮して、変換処理を挟む
        const itemsForDate = Array.isArray(data[targetDate]) ? data[targetDate] : [];

        // 旧形式（単一のProfitItem）から新形式（ProfitItem[]）への変換をここでも考慮
        if (itemsForDate.length === 0 && data[targetDate] && !Array.isArray(data[targetDate])) {
          const oldItem = data[targetDate] as ProfitItem; // 型アサーション
          if (oldItem.amount !== undefined) { // amountがあれば旧形式と判断
            const newItem: ProfitItem = {
              ...oldItem,
              id: oldItem.id || dayjs(targetDate).format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 10)
            };
            setDailyProfitItems([newItem]);
            // AsyncStorageのデータも新しい形式に更新すると良いが、今回は表示優先
            return;
          }
        }

        setDailyProfitItems(itemsForDate);
      } else {
        setDailyProfitItems([]); // データがない場合は空配列
      }
    } catch (e) {
      console.error('読み込み失敗:', e);
      setDailyProfitItems([]);
    }
  };

  // 新しい損益項目を保存または既存の損益項目を更新する
  const saveProfitItem = async () => {
    if (typeof date !== 'string') return;

    const numericValue = parseInt(amount);
    if (isNaN(numericValue) || numericValue <= 0) { // 0以下の金額は入力させない
      Alert.alert('金額', '有効な金額を入力してください（0より大きい数字）。');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('カテゴリ', 'カテゴリを選択してください。');
      return;
    }

    try {
      const json = await AsyncStorage.getItem('profitData');
      const allProfitData: ProfitData = json ? JSON.parse(json) : {};

      // 対象日付の項目リストを取得 (存在しない場合は空の配列)
      const currentDayItems = Array.isArray(allProfitData[date]) ? [...allProfitData[date]] : [];

      if (editingItemId) {
        // 既存の項目を更新
        const updatedItems = currentDayItems.map(item =>
          item.id === editingItemId
            ? { ...item, amount: numericValue, categoryId: selectedCategory, type: profitType }
            : item
        );
        allProfitData[date] = updatedItems;
      } else {
        // 新しい項目を追加
        const newItem: ProfitItem = {
          id: dayjs().format('YYYYMMDDHHmmss') + Math.random().toString(36).substring(2, 10), // ユニークIDを生成
          amount: numericValue,
          categoryId: selectedCategory,
          type: profitType,
        };
        currentDayItems.push(newItem);
        allProfitData[date] = currentDayItems;
      }

      await AsyncStorage.setItem('profitData', JSON.stringify(allProfitData));
      Alert.alert('保存しました');

      // 保存後にリストを再読み込みし、入力フォームをクリア
      loadDailyProfitItems(date);
      clearForm();
    } catch (e) {
      console.error('保存失敗:', e);
    }
  };

  // フォームをクリアする
  const clearForm = () => {
    setAmount('');
    setSelectedCategory(null);
    setProfitType('expense'); // デフォルトは支出
    setEditingItemId(null); // 編集モードを終了
  };

  // 項目を編集モードにする
  const editItem = (item: ProfitItem) => {
    setAmount(String(item.amount));
    setSelectedCategory(item.categoryId ?? null);
    setProfitType(item.type);
    setEditingItemId(item.id);
  };

  // 項目を削除する
  const deleteItem = async (itemId: string) => {
    if (typeof date !== 'string') return;

    Alert.alert(
      '削除の確認',
      'この項目を削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await AsyncStorage.getItem('profitData');
              const allProfitData: ProfitData = json ? JSON.parse(json) : {};

              const currentDayItems = Array.isArray(allProfitData[date]) ? [...allProfitData[date]] : [];
              const updatedItems = currentDayItems.filter(item => item.id !== itemId);

              if (updatedItems.length === 0) {
                // その日の項目がなくなったら、その日付のエントリ自体を削除
                delete allProfitData[date];
              } else {
                allProfitData[date] = updatedItems;
              }

              await AsyncStorage.setItem('profitData', JSON.stringify(allProfitData));
              Alert.alert('削除しました');
              loadDailyProfitItems(date); // リストを再読み込み
              clearForm(); // フォームをクリア
            } catch (e) {
              console.error('削除失敗:', e);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };


  useEffect(() => {
    if (typeof date === 'string') {
      loadDailyProfitItems(date);
    }
  }, [date]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Stack.Screen options={{ title: '損益詳細' }} />
          <Text style={styles.dateLabel}>{date} の損益</Text>

          {/* 既存の損益リスト */}
          <Text style={styles.sectionHeader}>登録済みの項目</Text>
          {dailyProfitItems.length === 0 ? (
            <Text style={styles.noItemsText}>この日の記録はありません。</Text>
          ) : (
            <FlatList
              data={dailyProfitItems}
              keyExtractor={(item) => item.id}
              style={styles.dailyProfitList} renderItem={({ item }) => {
                const category = getCategoryById(item.categoryId);
                return (
                  <View style={styles.recordItem}>
                    <View style={styles.recordItemLeft}>
                      {category && <Ionicons name={category.iconName} size={24} color={category.color} />}
                      <Text style={styles.recordItemCategory}>{category?.label || '未分類'}</Text>
                    </View>
                    <View style={styles.recordItemCenter}>
                      <Text style={[
                        styles.recordItemAmount,
                        item.type === 'expense' ? styles.loss : styles.profit
                      ]}>
                        {item.type === 'expense' ? '-' : '+'}{item.amount} 円
                      </Text>
                    </View>
                    <View style={styles.recordItemRight}>
                      <TouchableOpacity onPress={() => editItem(item)} style={styles.actionButton}>
                        <Ionicons name="create-outline" size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.actionButton}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              // スクロールを無効にする（親のScrollViewがスクロールするため）
              scrollEnabled={false}
            />
          )}

          <Text style={styles.sectionHeader}>{editingItemId ? '項目を編集' : '新しい項目を追加'}</Text>

          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, profitType === 'income' && styles.toggleSelected]}
              onPress={() => setProfitType('income')}
            >
              <Text style={[styles.toggleText, profitType === 'income' && styles.toggleTextSelected]}>収入</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, profitType === 'expense' && styles.toggleSelected]}
              onPress={() => setProfitType('expense')}
            >
              <Text style={[styles.toggleText, profitType === 'expense' && styles.toggleTextSelected]}>支出</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="金額を入力"
              maxLength={9}
            />
            <TouchableOpacity
              onPress={() => setAmount('0')}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>カテゴリを選択</Text>

          <FlatList
            data={categories}
            numColumns={3}
            keyExtractor={(item) => item.id}
            style={styles.categorySelectionList}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    isSelected && { backgroundColor: '#e0f7fa', borderColor: item.color, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedCategory(item.id)}
                >
                  <Ionicons name={item.iconName} size={30} color={item.color} style={styles.icon} />
                  <Text style={styles.categoryLabel}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.categoryListContent}
            // スクロールを無効にする（親のScrollViewがスクロールするため）
            scrollEnabled={false}
          />
          {editingItemId && (
            <Button title="キャンセル" onPress={clearForm} color="#888" />
          )}
          <View style={styles.saveButtonContainer}>
            <Button title={editingItemId ? "更新する" : "追加する"} onPress={saveProfitItem} />
          </View>

        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  dateLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  noItemsText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 10,
    marginBottom: 20,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  recordItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordItemCategory: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  recordItemCenter: {
    flex: 1,
    alignItems: 'flex-end',
  },
  recordItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordItemRight: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    marginLeft: 10,
    padding: 5,
  },
  profit: {
    color: 'red',
  },
  loss: {
    color: 'blue',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleSelected: {
    backgroundColor: '#00bcd4',
  },
  toggleText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleTextSelected: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#aaa',
  },
  label: {
    marginTop: 10,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#333',
    fontSize: 16,
  },
  categoryListContent: {
    paddingBottom: 20,
  },
  categoryItem: {
    width: Dimensions.get('window').width / 3 - 24,
    height: 100,
    margin: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  icon: {
    marginBottom: 5,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  saveButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },

  // dailyProfitList と categorySelectionList のスタイルを修正
  dailyProfitList: {
    marginBottom: 20,
  },
  categorySelectionList: {
    marginBottom: 20,
  },
});