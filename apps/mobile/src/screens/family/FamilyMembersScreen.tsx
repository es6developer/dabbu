import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  contribution: number;
  role: 'Admin' | 'Member';
}

const initialMembers: FamilyMember[] = [
  { id: '1', name: 'Rajesh Sharma', relationship: 'Self', phone: '+91 98765 43210', contribution: 85000, role: 'Admin' },
  { id: '2', name: 'Priya Sharma', relationship: 'Spouse', phone: '+91 98765 43211', contribution: 45000, role: 'Admin' },
  { id: '3', name: 'Aarav Sharma', relationship: 'Son', phone: '+91 98765 43212', contribution: 0, role: 'Member' },
  { id: '4', name: 'Ananya Sharma', relationship: 'Daughter', phone: '+91 98765 43213', contribution: 0, role: 'Member' },
  { id: '5', name: 'Suresh Sharma', relationship: 'Father', phone: '+91 98765 43214', contribution: 25000, role: 'Member' },
];

const relationships = ['Self', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other'];

const RoleBadge: React.FC<{ role: 'Admin' | 'Member' }> = ({ role }) => {
  const isAdmin = role === 'Admin';
  return (
    <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.memberBadge]}>
      <Text style={[styles.roleText, isAdmin ? styles.adminRoleText : styles.memberRoleText]}>
        {role}
      </Text>
    </View>
  );
};

const SwipeableMemberCard: React.FC<{
  member: FamilyMember;
  onDelete: (id: string) => void;
}> = ({ member, onDelete }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    Animated.event([null, { dx: translateX }], { useNativeDriver: false })
  ).current;

  const handleSwipeComplete = useCallback(() => {
    Animated.timing(translateX, {
      toValue: -width,
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      onDelete(member.id);
    });
  }, [member.id, onDelete, translateX]);

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  }, [translateX]);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={styles.swipeContainer}>
      <TouchableOpacity style={styles.deleteAction} onPress={handleSwipeComplete}>
        <AntDesign name="delete" size={24} color="#FFF" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
      <Animated.View
        style={[styles.memberCard, { transform: [{ translateX }] }]}
        {...panResponder}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => {
            Alert.alert('Delete Member', `Remove ${member.name}?`, [
              { text: 'Cancel', style: 'cancel', onPress: resetPosition },
              { text: 'Delete', style: 'destructive', onPress: handleSwipeComplete },
            ]);
          }}
        >
          <View style={styles.memberContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <AntDesign name="user" size={28} color="#10B981" />
              </View>
            </View>
            <View style={styles.memberInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.memberName}>{member.name}</Text>
                <RoleBadge role={member.role} />
              </View>
              <Text style={styles.relationship}>{member.relationship}</Text>
              <View style={styles.phoneRow}>
                <AntDesign name="phone" size={12} color="#6B7280" />
                <Text style={styles.phone}>{member.phone}</Text>
              </View>
              <View style={styles.contributionRow}>
                <AntDesign name="arrowup" size={12} color="#10B981" />
                <Text style={styles.contribution}>
                  Contributes {formatCurrency(member.contribution)}/mo
                </Text>
              </View>
            </View>
            <AntDesign name="right" size={16} color="#6B7280" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function FamilyMembersScreen() {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Self');
  const [newPhone, setNewPhone] = useState('');
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  const handleDelete = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleAddMember = useCallback(() => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      name: newName.trim(),
      relationship: newRelationship,
      phone: newPhone.trim() || 'Not provided',
      contribution: 0,
      role: 'Member',
    };
    setMembers(prev => [...prev, newMember]);
    setNewName('');
    setNewPhone('');
    setNewRelationship('Self');
    setShowAddSheet(false);
  }, [newName, newRelationship, newPhone]);

  const totalContribution = members.reduce((sum, m) => sum + m.contribution, 0);
  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Members</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddSheet(true)}
        >
          <AntDesign name="adduser" size={20} color="#0A0A0A" />
          <Text style={styles.addButtonText}>Add Member</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Members</Text>
          <Text style={styles.summaryValue}>{members.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Contribution</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalContribution)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {members.map(member => (
          <SwipeableMemberCard
            key={member.id}
            member={member}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      {showAddSheet && (
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayBg}
            activeOpacity={1}
            onPress={() => setShowAddSheet(false)}
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Family Member</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Amit Kumar"
                placeholderTextColor="#6B7280"
                value={newName}
                onChangeText={setNewName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Relationship</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowRelationPicker(!showRelationPicker)}
              >
                <Text style={styles.pickerText}>{newRelationship}</Text>
                <AntDesign
                  name={showRelationPicker ? 'up' : 'down'}
                  size={14}
                  color="#6B7280"
                />
              </TouchableOpacity>
              {showRelationPicker && (
                <View style={styles.pickerDropdown}>
                  {relationships.map(rel => (
                    <TouchableOpacity
                      key={rel}
                      style={[
                        styles.pickerOption,
                        rel === newRelationship && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setNewRelationship(rel);
                        setShowRelationPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          rel === newRelationship && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {rel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor="#6B7280"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddMember}>
              <AntDesign name="check" size={20} color="#0A0A0A" />
              <Text style={styles.submitText}>Add Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A0A0A',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2C2C2E',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  swipeContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  memberCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  memberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A2E2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10B98120',
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: '#10B98120',
  },
  memberBadge: {
    backgroundColor: '#3B82F620',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adminRoleText: {
    color: '#10B981',
  },
  memberRoleText: {
    color: '#3B82F6',
  },
  relationship: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  phone: {
    fontSize: 12,
    color: '#6B7280',
  },
  contributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contribution: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3C',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F9FAFB',
  },
  pickerButton: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  pickerDropdown: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  pickerOptionSelected: {
    backgroundColor: '#10B98120',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#F9FAFB',
  },
  pickerOptionTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});
