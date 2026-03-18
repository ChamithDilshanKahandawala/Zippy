import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Modal, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../context/UserContext';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth'; // Import signOut
import { db, storage, auth } from '../config/firebase'; // Import auth
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types/api'; // Import type for safety

// Helper Component for Settings Row (The 'Uber' Look)
const SettingsRow = ({ 
  icon, 
  label, 
  onPress, 
  color = "#9CA3AF", 
  rightComponent,
  isDestructive = false
}: { 
  icon: any, 
  label: string, 
  onPress: () => void, 
  color?: string, 
  rightComponent?: React.ReactNode,
  isDestructive?: boolean
}) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    className="flex-row items-center py-4 border-b border-gray-800"
  >
    <View className={`w-10 items-center justify-center mr-3`}>
      <Feather name={icon} size={22} color={isDestructive ? '#EF4444' : color} />
    </View>
    <Text className={`flex-1 text-base font-medium ${isDestructive ? 'text-red-500' : 'text-white'}`}>
      {label}
    </Text>
    {rightComponent || <Feather name="chevron-right" size={20} color="#4B5563" />}
  </TouchableOpacity>
);

export default function ProfileScreen({ navigation }: any) {
  const { user } = useUser();
  const userData = user as UserProfile; // Ensure type safety

  // ── State ──────────────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialize edit fields when user data is available
  useEffect(() => {
    if (userData) {
      setEditName(userData.fullName || '');
      setEditPhone(userData.phoneNumber || '');
    }
  }, [userData]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need permission to access your gallery!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!userData?.uid) return;
    setUploadingImage(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profiles/${userData.uid}.jpg`);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        profilePicUrl: downloadUrl
      });
      
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading image: ', error);
      Alert.alert('Error', error.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!userData?.uid) return;
    if (!editName.trim() || !editPhone.trim()) {
      Alert.alert('Invalid Input', 'Name and Phone Number are required.');
      return;
    }
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        fullName: editName,
        phoneNumber: editPhone,
      });
      setModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Update Error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!userData?.uid) return;
    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        notificationsEnabled: value
      });
    } catch (error: any) {
      console.error("Error updating notification preference:", error);
      Alert.alert("Error", "Failed to update notification settings.");
    }
  };

  // Professional Logout Logic
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out of Zippy?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation/index.tsx handles state change automatically
            } catch (err) {
              Alert.alert('Error', 'Failed to log out');
            }
          }
        }
      ]
    );
  };

  if (!userData) {
    return (
      <View className="flex-1 bg-zippy-bg items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zippy-bg" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* ── Dynamic Header ── */}
        <View className="items-center py-8 border-b border-gray-800 bg-zippy-bg">
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden items-center justify-center border-2 border-zippy-border">
              {userData.profilePicUrl ? (
                <Image source={{ uri: userData.profilePicUrl }} className="w-full h-full" />
              ) : (
                <Ionicons name="person" size={48} color="#9CA3AF" />
              )}
            </View>
             <View className="absolute bottom-0 right-0 bg-zippy-accent p-2 rounded-full border-2 border-zippy-bg">
               <Feather name="camera" size={14} color="white" />
             </View>
          </TouchableOpacity>
          
          <View className="items-center space-y-1">
            <View className="flex-row items-center">
              <Text className="text-white text-xl font-bold mr-2">{userData.fullName}</Text>
              {userData.isVerified && (
                <MaterialIcons name="verified" size={20} color="#4ADE80" />
              )}
            </View>
            <Text className="text-gray-400 text-sm">{userData.email}</Text>
          </View>
        </View>

        {/* ── Settings List (The 'Uber' Look) ── */}
        <View className="mt-4 px-4">
          <Text className="text-gray-500 font-bold mb-2 text-xs uppercase tracking-wider">Account Settings</Text>
          
          <SettingsRow 
            icon="edit-2" 
            label="Edit Profile" 
            onPress={() => setModalVisible(true)} 
          />
          
          <SettingsRow 
            icon="credit-card" 
            label="Payment Methods" 
            onPress={() => navigation.navigate('Payment')} 
          />
          
          <SettingsRow 
            icon="bell" 
            label="Notifications"
            onPress={() => {}} 
            rightComponent={
              <Switch 
                trackColor={{ false: "#374151", true: "#7C3AED" }} 
                thumbColor={"#f4f3f4"} 
                ios_backgroundColor="#3e3e3e"
                onValueChange={handleToggleNotifications}
                value={userData.notificationsEnabled ?? true} 
              />
            }
          />
          
          <SettingsRow 
            icon="help-circle" 
            label="Help & Support" 
            onPress={() => {}} 
          />
          
          {/* Logout Button */}
          <View className="mt-8">
             <SettingsRow 
              icon="log-out" 
              label="Logout" 
              onPress={handleLogout} 
              isDestructive={true}
              rightComponent={<View />} // Hide chevron
            />
          </View>
        </View>

        {/* ── Edit Profile Modal Stub ── */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end bg-black/80"
          >
            <TouchableOpacity className="flex-1" onPress={() => setModalVisible(false)} />
            <View className="bg-zippy-bg border-t border-zippy-border rounded-t-3xl p-6 pb-10">
              <Text className="text-white text-xl font-bold mb-6">Edit Profile</Text>
              
               <View className="space-y-4 mb-6">
                <View>
                  <Text className="text-gray-400 mb-2 text-xs font-bold uppercase">Full Name</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    className="bg-zippy-surface text-white p-4 rounded-xl border border-zippy-border"
                    placeholder="Full Name"
                    placeholderTextColor="#6B7280"
                  />
                </View>
                <View>
                  <Text className="text-gray-400 mb-2 text-xs font-bold uppercase">Phone Number</Text>
                  <TextInput
                    value={editPhone}
                    onChangeText={setEditPhone}
                    className="bg-zippy-surface text-white p-4 rounded-xl border border-zippy-border"
                    placeholder="Phone Number"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleUpdateProfile}
                disabled={loading}
                className="bg-zippy-accent p-4 rounded-xl items-center"
              >
                 {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
