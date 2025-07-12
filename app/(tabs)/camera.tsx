import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const cameraRef = useRef<CameraView | null>(null);

  if (permission === null || mediaPermission === null) {
    // 許可状況がまだ読み込まれていない
    return null;
  }

  if (!permission.granted || !mediaPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>カメラとメディアライブラリのアクセス許可が必要です</Text>
        <Button onPress={() => {
          requestPermission();
          requestMediaPermission();
        }} title="許可する" />
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        default: return 'off';
      }
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(currentZoom => {
      const newZoom = direction === 'in'
        ? Math.min(currentZoom + 0.1, 1)
        : Math.max(currentZoom - 0.1, 0);
      return Number(newZoom.toFixed(1));
    });
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      Alert.alert('成功', '写真を保存しました！');
    } catch (error) {
      Alert.alert('エラー', '写真の撮影または保存に失敗しました');
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        zoom={zoom}
        flash={flash}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.circleButton} onPress={toggleCameraFacing}>
          <Text style={styles.buttonText}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleButton} onPress={() => handleZoom('in')}>
          <Text style={styles.buttonText}>➕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.circleButton} onPress={() => handleZoom('out')}>
          <Text style={styles.buttonText}>➖</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  circleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
    bottom: 80
  },
  buttonText: {
    fontSize: 24,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    bottom: 80
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white'
  },
});