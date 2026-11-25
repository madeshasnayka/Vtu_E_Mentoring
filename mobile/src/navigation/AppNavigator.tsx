import React, { useState, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Path, Circle, Line, Polyline } from 'react-native-svg';
import { useAuthStore } from '../context/useAuthStore';
import { VtuSessionLoader } from '../components/VtuSessionLoader';

// Auth Screen
import * as LoginScreenModule from '../screens/auth/LoginScreen';
// Admin Screens
import * as AdminHomeScreenModule from '../screens/admin/AdminHomeScreen';
import * as BatchCreateScreenModule from '../screens/admin/BatchCreateScreen';
import * as ConfigScreenModule from '../screens/admin/ConfigScreen';
import * as ReportScreenModule from '../screens/admin/ReportScreen';
import * as ApprovalsScreenModule from '../screens/admin/ApprovalsScreen';
// Mentor Screens
import * as MenteeListScreenModule from '../screens/mentor/MenteeListScreen';
import * as TaskDeskScreenModule from '../screens/mentor/TaskDeskScreen';
import * as MentorTaskDetailScreenModule from '../screens/mentor/MentorTaskDetailScreen';
import * as MenteeDocsScreenModule from '../screens/mentor/MenteeDocsScreen';
import * as MentorMoreScreenModule from '../screens/mentor/MentorMoreScreen';
// Student Screens
import * as StudentHomeScreenModule from '../screens/student/StudentHomeScreen';
import * as StudentTasksScreenModule from '../screens/student/StudentTasksScreen';
import * as StudentTaskDetailScreenModule from '../screens/student/StudentTaskDetailScreen';
import * as DocumentUploadScreenModule from '../screens/student/DocumentUploadScreen';
import * as InquiriesScreenModule from '../screens/student/InquiriesScreen';

const resolveScreen = (mod: any, namedKey: string) =>
  mod?.[namedKey] || mod?.default || mod;

const LoginScreen = resolveScreen(LoginScreenModule, 'LoginScreen');
const AdminHomeScreen = resolveScreen(AdminHomeScreenModule, 'AdminHomeScreen');
const BatchCreateScreen = resolveScreen(BatchCreateScreenModule, 'BatchCreateScreen');
const ConfigScreen = resolveScreen(ConfigScreenModule, 'ConfigScreen');
const ReportScreen = resolveScreen(ReportScreenModule, 'ReportScreen');
const ApprovalsScreen = resolveScreen(ApprovalsScreenModule, 'ApprovalsScreen');

const MenteeListScreen = resolveScreen(MenteeListScreenModule, 'MenteeListScreen');
const TaskDeskScreen = resolveScreen(TaskDeskScreenModule, 'TaskDeskScreen');
const MentorTaskDetailScreen = resolveScreen(
  MentorTaskDetailScreenModule,
  'MentorTaskDetailScreen'
);
const MenteeDocsScreen = resolveScreen(MenteeDocsScreenModule, 'MenteeDocsScreen');
const MentorMoreScreen = resolveScreen(MentorMoreScreenModule, 'MentorMoreScreen');

const StudentHomeScreen = resolveScreen(StudentHomeScreenModule, 'StudentHomeScreen');
const StudentTasksScreen = resolveScreen(StudentTasksScreenModule, 'StudentTasksScreen');
const StudentTaskDetailScreen = resolveScreen(
  StudentTaskDetailScreenModule,
  'StudentTaskDetailScreen'
);
const DocumentUploadScreen = resolveScreen(
  DocumentUploadScreenModule,
  'DocumentUploadScreen'
);
const InquiriesScreen = resolveScreen(InquiriesScreenModule, 'InquiriesScreen');

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Crisp 2px SVG Vector Icons
const TabSvgIcon = ({
  name,
  focused,
  activeColor = '#315fc4',
  activeBg = '#e8efff',
}: {
  name: 'grid' | 'users' | 'sliders' | 'chart' | 'tasks' | 'folder' | 'chat';
  focused: boolean;
  activeColor?: string;
  activeBg?: string;
}) => {
  const stroke = focused ? activeColor : '#8ba09d';
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: activeBg }]}>
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {name === 'grid' && (
          <>
            <Rect x="3" y="3" width="7" height="9" rx="1" />
            <Rect x="14" y="3" width="7" height="5" rx="1" />
            <Rect x="14" y="12" width="7" height="9" rx="1" />
            <Rect x="3" y="16" width="7" height="5" rx="1" />
          </>
        )}
        {name === 'users' && (
          <>
            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <Circle cx="9" cy="7" r="4" />
            <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        )}
        {name === 'sliders' && (
          <>
            <Line x1="4" y1="21" x2="4" y2="14" />
            <Line x1="4" y1="10" x2="4" y2="3" />
            <Line x1="12" y1="21" x2="12" y2="12" />
            <Line x1="12" y1="8" x2="12" y2="3" />
            <Line x1="20" y1="21" x2="20" y2="16" />
            <Line x1="20" y1="12" x2="20" y2="3" />
            <Line x1="1" y1="14" x2="7" y2="14" />
            <Line x1="9" y1="8" x2="15" y2="8" />
            <Line x1="17" y1="16" x2="23" y2="16" />
          </>
        )}
        {name === 'chart' && (
          <>
            <Path d="M18 20V10" />
            <Path d="M12 20V4" />
            <Path d="M6 20v-6" />
          </>
        )}
        {name === 'tasks' && (
          <>
            <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <Polyline points="9 14 11 16 15 12" />
          </>
        )}
        {name === 'folder' && (
          <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        )}
        {name === 'chat' && (
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        )}
      </Svg>
    </View>
  );
};

// ============================================================================
// ADMIN TAB NAVIGATOR
// ============================================================================
function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.floatingTabBar,
          { height: 60 + bottomPad, paddingBottom: bottomPad },
        ],
        tabBarActiveTintColor: '#315fc4',
        tabBarInactiveTintColor: '#8ba09d',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Overview"
        component={AdminHomeScreen}
        options={{
          tabBarLabel: 'Faculty',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="grid" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Batch Fig 4"
        component={BatchCreateScreen}
        options={{
          tabBarLabel: 'Batch Ops',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="users" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigScreen}
        options={{
          tabBarLabel: 'Config',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="sliders" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Report Fig 7"
        component={ReportScreen}
        options={{
          tabBarLabel: 'Rankings',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="chart" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// MENTOR TAB NAVIGATOR
// ============================================================================
function MentorTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.floatingTabBar,
          { height: 60 + bottomPad, paddingBottom: bottomPad },
        ],
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#8ba09d',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Mentees"
        component={MenteeListScreen}
        options={{
          tabBarLabel: 'Mentees',
          tabBarIcon: ({ focused }) => (
            <TabSvgIcon
              name="users"
              focused={focused}
              activeColor="#4f46e5"
              activeBg="#eef2ff"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TaskDeskScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <TabSvgIcon
              name="tasks"
              focused={focused}
              activeColor="#4f46e5"
              activeBg="#eef2ff"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Docs"
        component={MenteeDocsScreen}
        options={{
          tabBarLabel: 'Docs',
          tabBarIcon: ({ focused }) => (
            <TabSvgIcon
              name="folder"
              focused={focused}
              activeColor="#4f46e5"
              activeBg="#eef2ff"
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MentorMoreScreen}
        options={{
          tabBarLabel: 'Eval',
          tabBarIcon: ({ focused }) => (
            <TabSvgIcon
              name="sliders"
              focused={focused}
              activeColor="#4f46e5"
              activeBg="#eef2ff"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// STUDENT TAB NAVIGATOR
// ============================================================================
function StudentTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.floatingTabBar,
          { height: 60 + bottomPad, paddingBottom: bottomPad },
        ],
        tabBarActiveTintColor: '#315fc4',
        tabBarInactiveTintColor: '#8ba09d',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Overview"
        component={StudentHomeScreen}
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="grid" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={StudentTasksScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="tasks" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Docs"
        component={DocumentUploadScreen}
        options={{
          tabBarLabel: 'Docs',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="folder" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Inquiries"
        component={InquiriesScreen}
        options={{
          tabBarLabel: 'Inquiries',
          tabBarIcon: ({ focused }) => <TabSvgIcon name="chat" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ============================================================================
// ROOT STACK NAVIGATOR
// ============================================================================
export default function AppNavigator() {
  const { user, token, sessionTransitionText } = useAuthStore();
  const isAuthenticated = Boolean(token && user);
  const [isBooting, setIsBooting] = useState(true);
  const didBootRef = useRef(false);

  useEffect(() => {
    if (didBootRef.current) return;
    didBootRef.current = true;
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f6fc' }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'admin' ? (
          <>
            <Stack.Screen name="AdminRoot" component={AdminTabs} />
            <Stack.Screen name="Approvals" component={ApprovalsScreen} />
          </>
        ) : user?.role === 'mentor' ? (
          <>
            <Stack.Screen name="MentorRoot" component={MentorTabs} />
            <Stack.Screen name="MentorTaskDetail" component={MentorTaskDetailScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentRoot" component={StudentTabs} />
            <Stack.Screen name="StudentTaskDetail" component={StudentTaskDetailScreen} />
          </>
        )}
      </Stack.Navigator>
      <VtuSessionLoader
        asModal
        visible={isBooting || Boolean(sessionTransitionText)}
        statusText={
          sessionTransitionText || 'INITIALIZING VTU E-MENTORING PORTAL...'
        }
      />
    </View>
  );
}

export { AppNavigator };

const styles = StyleSheet.create({
  floatingTabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#dce5f3',
    paddingTop: 6,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    marginTop: 2,
  },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});