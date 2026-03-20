import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StyleSheet, Animated, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../config/firebase';
import { useUser } from '../context/UserContext';

// ── Animated pulsing dot ─────────────────────────────────────────────────────
function PulseDot() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[styles.pulseDot, { opacity }]} />;
}

// ── Document upload row ──────────────────────────────────────────────────────
type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

interface DocRowProps {
  label: string;
  status: UploadStatus;
  progress: number;
  url: string;
  onPick: () => void;
}

function DocRow({ label, status, progress, url, onPick }: DocRowProps) {
  const statusColor =
    status === 'done'      ? '#10B981' :
    status === 'uploading' ? '#7C3AED' :
    status === 'error'     ? '#EF4444' : '#64748B';

  const statusLabel =
    status === 'done'      ? '✓ Uploaded' :
    status === 'uploading' ? `Uploading ${progress}%` :
    status === 'error'     ? 'Failed — tap to retry' : 'Tap to upload';

  return (
    <TouchableOpacity onPress={onPick} activeOpacity={0.75} style={styles.docRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.docLabel}>{label}</Text>
        {status === 'uploading' ? (
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
        ) : (
          <Text style={[styles.docStatus, { color: statusColor }]}>{statusLabel}</Text>
        )}
      </View>
      {status === 'uploading' ? (
        <ActivityIndicator size="small" color="#7C3AED" />
      ) : status === 'done' ? (
        <View style={styles.doneCircle}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
        </View>
      ) : (
        <View style={styles.uploadIcon}>
          <Text style={{ color: '#7C3AED', fontSize: 18, lineHeight: 22 }}>↑</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────
type DocKey = 'nic' | 'license' | 'insurance';
type DocState = { status: UploadStatus; progress: number; url: string };

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function PendingApprovalScreen() {
  const { user, logout } = useUser();

  const rd            = (user as any)?.riderDetails;
  const isRejected    = !!rd?.rejectionReason;
  const rejectionReason = rd?.rejectionReason ?? '';

  // ── Form state ────────────────────────────────────────────────────────────
  const [vehicleModel, setVehicleModel] = useState<string>(rd?.vehicleModel ?? '');
  const [vehiclePlate, setVehiclePlate] = useState<string>(rd?.vehiclePlate ?? '');
  const [vehicleType,  setVehicleType]  = useState<string>(rd?.vehicleType  ?? '');

  const [docs, setDocs] = useState<Record<DocKey, DocState>>({
    nic:       { status: rd?.documents?.nicUrl       ? 'done' : 'idle', progress: 0, url: rd?.documents?.nicUrl       ?? '' },
    license:   { status: rd?.documents?.licenseUrl   ? 'done' : 'idle', progress: 0, url: rd?.documents?.licenseUrl   ?? '' },
    insurance: { status: rd?.documents?.insuranceUrl ? 'done' : 'idle', progress: 0, url: rd?.documents?.insuranceUrl ?? '' },
  });

  const [saving, setSaving]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Upload a single image to Firebase Storage ────────────────────────────
  const uploadDoc = async (key: DocKey) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow photo library access to upload documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri  = result.assets[0].uri;
    const blob = await (await fetch(uri)).blob();
    const path = `drivers/${user?.uid}/documents/${key}_${Date.now()}.jpg`;
    const storageRef = ref(storage, path);

    setDocs((prev) => ({ ...prev, [key]: { ...prev[key], status: 'uploading', progress: 0 } }));

    const task = uploadBytesResumable(storageRef, blob);

    task.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setDocs((prev) => ({ ...prev, [key]: { ...prev[key], progress: pct } }));
      },
      (_err) => {
        setDocs((prev) => ({ ...prev, [key]: { ...prev[key], status: 'error', progress: 0 } }));
        Alert.alert('Upload Failed', 'Could not upload the image. Please try again.');
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setDocs((prev) => ({ ...prev, [key]: { status: 'done', progress: 100, url } }));
      },
    );
  };

  // ── Save everything to Firestore ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!vehicleModel.trim() || !vehiclePlate.trim() || !vehicleType) {
      Alert.alert('Missing Info', 'Please fill in vehicle model, plate, and vehicle type.');
      return;
    }
    if (docs.nic.status !== 'done' || docs.license.status !== 'done' || docs.insurance.status !== 'done') {
      Alert.alert('Missing Documents', 'Please upload all three documents before submitting.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        'riderDetails.vehicleModel': vehicleModel.trim(),
        'riderDetails.vehiclePlate': vehiclePlate.trim().toUpperCase(),
        'riderDetails.vehicleType':  vehicleType,
        'riderDetails.documents.nicUrl':       docs.nic.url,
        'riderDetails.documents.licenseUrl':   docs.license.url,
        'riderDetails.documents.insuranceUrl': docs.insurance.url,
        'riderDetails.rejectionReason': '', // clear any previous rejection
      });
      setSubmitted(true);
    } catch (e) {
      Alert.alert('Save Failed', 'Could not save your details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const allDocsUploaded = docs.nic.status === 'done' && docs.license.status === 'done' && docs.insurance.status === 'done';
  const docUrlMatch = rd?.documents?.nicUrl === docs.nic.url &&
                      rd?.documents?.licenseUrl === docs.license.url &&
                      rd?.documents?.insuranceUrl === docs.insurance.url;
  const alreadySubmitted = docUrlMatch && allDocsUploaded && !isRejected;

  const VEHICLE_TYPES = [
    { value: 'tuk',     label: '🛺  Tuk-Tuk' },
    { value: 'budget',  label: '🚗  Budget Car' },
    { value: 'luxury',  label: '🚙  Luxury Car' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#07070F' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={styles.avatarRing}>
            <Text style={{ fontSize: 36 }}>{isRejected ? '❌' : submitted || alreadySubmitted ? '📋' : '⏳'}</Text>
          </View>
          <Text style={styles.title}>
            {isRejected
              ? 'Application Rejected'
              : submitted || alreadySubmitted
              ? 'Documents Submitted'
              : 'Complete Your Profile'}
          </Text>
          <Text style={styles.subtitle}>
            {isRejected
              ? 'See the reason below and re-upload the required documents.'
              : submitted || alreadySubmitted
              ? 'Our team is reviewing your documents. You\'ll be notified once approved.'
              : 'Upload your vehicle info and documents to complete registration.'}
          </Text>
        </View>

        {/* ── Rejection Reason ── */}
        {isRejected && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
          </View>
        )}

        {/* ── Live sync indicator ── */}
        {(submitted || alreadySubmitted) && !isRejected && (
          <View style={styles.syncBox}>
            <PulseDot />
            <Text style={styles.syncText}>
              <Text style={{ color: '#E2E8F0', fontWeight: '600' }}>Live sync active. </Text>
              Your app will automatically unlock the moment admin approves.
            </Text>
          </View>
        )}

        {/* ── Vehicle Info Form ── */}
        {(!alreadySubmitted || isRejected) && (
          <>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>

            <Text style={styles.fieldLabel}>Vehicle Model</Text>
            <TextInput
              value={vehicleModel}
              onChangeText={setVehicleModel}
              placeholder="e.g. Toyota Prius"
              placeholderTextColor="#475569"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>License Plate</Text>
            <TextInput
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              placeholder="e.g. CAR-1234"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Vehicle Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {VEHICLE_TYPES.map((vt) => (
                <TouchableOpacity
                  key={vt.value}
                  onPress={() => setVehicleType(vt.value)}
                  style={[styles.typeChip, vehicleType === vt.value && styles.typeChipSelected]}
                >
                  <Text style={[styles.typeChipText, vehicleType === vt.value && styles.typeChipTextSelected]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Documents ── */}
            <Text style={styles.sectionTitle}>Upload Documents</Text>
            <View style={styles.docsCard}>
              <DocRow label="National ID / Passport"     {...docs.nic}       onPick={() => uploadDoc('nic')}       />
              <DocRow label="Driving Licence"             {...docs.license}   onPick={() => uploadDoc('license')}   />
              <DocRow label="Vehicle Insurance Certificate" {...docs.insurance} onPick={() => uploadDoc('insurance')} />
            </View>

            {/* ── Submit ── */}
            <TouchableOpacity
              onPress={submitted ? undefined : handleSubmit}
              disabled={saving || submitted}
              style={[styles.submitBtn, (saving || submitted) && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : submitted ? (
                <Text style={styles.submitText}>✓  Submitted — Awaiting Review</Text>
              ) : (
                <Text style={styles.submitText}>Submit for Review →</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── Sign out ── */}
        <TouchableOpacity onPress={logout} style={{ alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#475569', fontSize: 13 }}>
            Sign out?{' '}
            <Text style={{ color: '#9F67FF', fontWeight: '700' }}>Sign Out</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 2, borderColor: 'rgba(251,191,36,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: {
    fontSize: 24, fontWeight: '900', color: '#E2E8F0',
    textAlign: 'center', letterSpacing: -0.5, marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#64748B', textAlign: 'center',
    lineHeight: 20, maxWidth: 300,
  },
  rejectionBox: {
    backgroundColor: 'rgba(127,29,29,0.3)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: '#F87171', textTransform: 'uppercase', marginBottom: 4 },
  rejectionText: { fontSize: 13, color: '#FCA5A5', lineHeight: 18 },
  syncBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#11111C', borderWidth: 1, borderColor: '#2A2A40',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  syncText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#11111C', borderWidth: 1, borderColor: '#2A2A40',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: '#E2E8F0', marginBottom: 14,
  },
  typeChip: {
    flex: 1, borderWidth: 1.5, borderColor: '#2A2A40', borderRadius: 10,
    backgroundColor: '#11111C', padding: 10, alignItems: 'center',
  },
  typeChipSelected: { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.12)' },
  typeChipText: { fontSize: 12, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  typeChipTextSelected: { color: '#9F67FF' },
  docsCard: {
    backgroundColor: '#11111C', borderWidth: 1, borderColor: '#2A2A40',
    borderRadius: 16, paddingHorizontal: 14, marginBottom: 20,
  },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A2E',
  },
  docLabel: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginBottom: 3 },
  docStatus: { fontSize: 11, fontWeight: '500' },
  progressBg: { height: 4, backgroundColor: '#1e293b', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: '#7C3AED', borderRadius: 2 },
  doneCircle: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 8,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
});
