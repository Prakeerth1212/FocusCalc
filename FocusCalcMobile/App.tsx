import React, {useState, useEffect, useCallback} from 'react';
import {NativeModules} from 'react-native';
const {FocusBlocker} = NativeModules;
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';

const API = 'http://10.0.2.2:5000';

const getToday = () => new Date().toISOString().split('T')[0];

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function App() {
  const [page, setPage] = useState('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [blockerItems, setBlockerItems] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [focusActive, setFocusActive] = useState(false);
  const [weekStats, setWeekStats] = useState({tasks: 0, hours: '0', streak: 0});
  const [dayData, setDayData] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const [showAddBlocker, setShowAddBlocker] = useState(false);
  const [blockerTab, setBlockerTab] = useState<'app' | 'website'>('app');
  const [installedApps, setInstalledApps] = useState<any[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [loadingApps, setLoadingApps] = useState(false);
  const [newBlockerName, setNewBlockerName] = useState('');
  const [newBlockerValue, setNewBlockerValue] = useState('');

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tasks?date=${getToday()}`);
      setTasks(await res.json());
    } catch (e) {
      Alert.alert('Error', 'Cannot connect to backend. Is it running?');
    }
  }, []);

  const loadBlocker = useCallback(async () => {
    try {
      const res = await fetch(`${API}/blocker/items`);
      setBlockerItems(await res.json());
    } catch (e) {}
  }, []);

  const loadFocusStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/focus/status`);
      const data = await res.json();
      setFocusActive(data.active);
    } catch (e) {}
  }, []);

  const loadReport = useCallback(async () => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    let totalTasks = 0,
      totalSeconds = 0,
      streak = 0;
    const data = [];
    for (const date of days) {
      const res = await fetch(`${API}/tasks?date=${date}`);
      const dayTasks = await res.json();
      const completed = dayTasks.filter((t: any) => t.completed).length;
      const seconds = dayTasks.reduce(
        (sum: number, t: any) => sum + t.time_spent,
        0,
      );
      totalTasks += completed;
      totalSeconds += seconds;
      data.push({date, completed, seconds});
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].completed > 0) streak++;
      else break;
    }
    setWeekStats({
      tasks: totalTasks,
      hours: (totalSeconds / 3600).toFixed(1),
      streak,
    });
    setDayData(data);
  }, []);

  useEffect(() => {
    // rollover incomplete tasks from yesterday
    fetch(`${API}/tasks/rollover`, {method: 'POST'})
      .then(r => r.json())
      .then(data => {
        if (data.rolled > 0) {
          Alert.alert(
            'Tasks Rolled Over',
            `${data.rolled} incomplete task(s) from yesterday moved to today.`,
          );
        }
      })
      .catch(() => {});
    loadTasks();
    loadBlocker();
    loadFocusStatus();
    const interval = setInterval(() => {
      loadTasks();
      loadBlocker();
      loadFocusStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (page === 'report') loadReport();
  }, [page]);

  const openAddBlocker = async () => {
    setShowAddBlocker(true);
    setBlockerTab('app');
    setAppSearch('');
    setLoadingApps(true);
    try {
      const apps = await FocusBlocker?.getInstalledApps();
      Alert.alert('Apps found', `${apps?.length ?? 0} apps installed`);
      const sorted = [...(apps || [])].sort((a: any, b: any) =>
        a.name.localeCompare(b.name),
      );
      setInstalledApps(sorted);
    } catch (e: any) {
      Alert.alert('Error', 'Could not load apps: ' + e?.message);
    }
    setLoadingApps(false);
  };

  const addApp = async (app: any) => {
    const alreadyAdded = blockerItems.find(b => b.value === app.packageName);
    if (alreadyAdded) {
      Alert.alert(
        'Already added',
        `${app.name} is already in your block list.`,
      );
      return;
    }
    await fetch(`${API}/blocker/items`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: app.name,
        value: app.packageName,
        type: 'app',
        category: '',
      }),
    });
    loadBlocker();
  };

  const submitWebsite = async () => {
    if (!newBlockerName.trim() || !newBlockerValue.trim()) {
      Alert.alert('Error', 'Name and domain are required.');
      return;
    }
    await fetch(`${API}/blocker/items`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name: newBlockerName.trim(),
        value: newBlockerValue.trim(),
        type: 'website',
        category: '',
      }),
    });
    setNewBlockerName('');
    setNewBlockerValue('');
    setShowAddBlocker(false);
    loadBlocker();
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await fetch(`${API}/tasks`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: newTask.trim(), date: getToday()}),
    });
    setNewTask('');
    loadTasks();
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await fetch(`${API}/tasks/${id}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({completed: !completed}),
    });
    loadTasks();
  };

  const deleteTask = async (id: string) => {
    await fetch(`${API}/tasks/${id}`, {method: 'DELETE'});
    loadTasks();
  };

  const toggleTimer = async (task: any) => {
    if (task.timer_running) {
      const elapsed = Math.floor(Date.now() / 1000 - task.start_time);
      await fetch(`${API}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          timer_running: false,
          time_spent: task.time_spent + elapsed,
          start_time: null,
        }),
      });
    } else {
      await fetch(`${API}/tasks/${task.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          timer_running: true,
          start_time: Date.now() / 1000,
        }),
      });
    }
    loadTasks();
  };

  const toggleFocus = async () => {
    if (focusActive) {
      await fetch(`${API}/focus/stop`, {method: 'POST'});
      setFocusActive(false);
      FocusBlocker?.setFocusActive(false);
      FocusBlocker?.setBlockedApps([]);
    } else {
      const enabled = await FocusBlocker?.isAccessibilityEnabled();
      if (!enabled) {
        Alert.alert(
          'Permission Required',
          'FocusCalc needs Accessibility permission to block apps.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings',
              onPress: () => FocusBlocker?.openAccessibilitySettings(),
            },
          ],
        );
        return;
      }
      await fetch(`${API}/focus/start`, {method: 'POST'});
      setFocusActive(true);
      const packages = blockerItems
        .filter(b => b.type === 'app')
        .map(b => b.value);
      FocusBlocker?.setFocusActive(true);
      FocusBlocker?.setBlockedApps(packages);
    }
  };

  const deleteBlocker = async (id: string) => {
    await fetch(`${API}/blocker/items/${id}`, {method: 'DELETE'});
    loadBlocker();
  };

  const getLiveTime = (task: any) => {
    if (task.timer_running && task.start_time) {
      const elapsed = Math.floor(Date.now() / 1000 - task.start_time);
      return formatTime(task.time_spent + elapsed);
    }
    return formatTime(task.time_spent);
  };

  const filteredApps = installedApps.filter(a =>
    a.name.toLowerCase().includes(appSearch.toLowerCase()),
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      <View style={s.header}>
        <Text style={s.headerTitle}>FocusCalc</Text>
        <Text style={s.headerDate}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {page === 'tasks' && (
          <View>
            <Text style={s.pageTitle}>Today's Tasks</Text>
            <View style={s.addRow}>
              <TextInput
                style={s.input}
                placeholder="Add a new task..."
                placeholderTextColor="#555"
                value={newTask}
                onChangeText={setNewTask}
                onSubmitEditing={addTask}
              />
              <TouchableOpacity style={s.addBtn} onPress={addTask}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {tasks.length === 0 && (
              <Text style={s.empty}>No tasks yet. Add one above.</Text>
            )}
            {tasks.map(task => (
              <View key={task.id} style={s.taskCard}>
                <TouchableOpacity
                  onPress={() => toggleComplete(task.id, task.completed)}>
                  <View style={[s.checkbox, task.completed && s.checkboxDone]}>
                    {task.completed && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
                <View style={s.taskNameRow}>
                  <Text
                    style={[s.taskName, task.completed && s.taskDone]}
                    numberOfLines={1}>
                    {task.name}
                  </Text>
                  {task.rollover_count > 0 && (
                    <View style={s.rolloverBadge}>
                      <Text style={s.rolloverBadgeText}>
                        ↻{task.rollover_count}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={s.taskTime}>{getLiveTime(task)}</Text>
                <TouchableOpacity
                  style={s.timerBtn}
                  onPress={() => toggleTimer(task)}>
                  <Text style={s.timerBtnText}>
                    {task.timer_running ? '⏸' : '▶'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => deleteTask(task.id)}>
                  <Text style={s.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {page === 'focus' && (
          <View>
            <Text style={s.pageTitle}>Focus Mode</Text>
            <View style={s.card}>
              <View style={s.focusStatusRow}>
                <View style={[s.statusDot, focusActive && s.statusDotActive]} />
                <Text style={s.focusStatusText}>
                  {focusActive ? 'Focus mode is ON' : 'Focus mode is off'}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.focusBtn, focusActive && s.focusBtnStop]}
                onPress={toggleFocus}>
                <Text style={s.focusBtnText}>
                  {focusActive ? '■ Stop Focus' : '▶ Start Focus'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Block List</Text>
                <TouchableOpacity style={s.smallBtn} onPress={openAddBlocker}>
                  <Text style={s.smallBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {blockerItems.length === 0 && (
                <Text style={s.empty}>No items blocked yet.</Text>
              )}
              {blockerItems.map(item => (
                <View key={item.id} style={s.blockerRow}>
                  <Text style={s.blockerName}>{item.name}</Text>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteBlocker(item.id)}>
                    <Text style={s.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {page === 'report' && (
          <View>
            <Text style={s.pageTitle}>Weekly Report</Text>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{weekStats.tasks}</Text>
                <Text style={s.statLabel}>Tasks Done</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{weekStats.hours}h</Text>
                <Text style={s.statLabel}>Hours</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{weekStats.streak}</Text>
                <Text style={s.statLabel}>Streak</Text>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Daily Breakdown</Text>
              {dayData.map(d => {
                const max = Math.max(...dayData.map(x => x.seconds), 1);
                const pct = d.seconds / max;
                const name = new Date(d.date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                });
                return (
                  <View key={d.date} style={s.dayRow}>
                    <Text style={s.dayName}>{name}</Text>
                    <View style={s.barWrap}>
                      <View style={[s.bar, {width: `${pct * 100}%`}]} />
                    </View>
                    <Text style={s.dayHours}>
                      {(d.seconds / 3600).toFixed(1)}h
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {showAddBlocker && (
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add to Block List</Text>
              <TouchableOpacity onPress={() => setShowAddBlocker(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, blockerTab === 'app' && s.tabActive]}
                onPress={() => setBlockerTab('app')}>
                <Text
                  style={[s.tabText, blockerTab === 'app' && s.tabTextActive]}>
                  📱 Apps
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, blockerTab === 'website' && s.tabActive]}
                onPress={() => setBlockerTab('website')}>
                <Text
                  style={[
                    s.tabText,
                    blockerTab === 'website' && s.tabTextActive,
                  ]}>
                  🌐 Website
                </Text>
              </TouchableOpacity>
            </View>

            {blockerTab === 'app' && (
              <View style={s.appPicker}>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search apps..."
                  placeholderTextColor="#555"
                  value={appSearch}
                  onChangeText={setAppSearch}
                />
                {loadingApps ? (
                  <Text style={s.empty}>Loading apps...</Text>
                ) : filteredApps.length === 0 ? (
                  <Text style={s.empty}>No apps found.</Text>
                ) : (
                  <FlatList
                    data={filteredApps}
                    keyExtractor={item => item.packageName}
                    style={s.appList}
                    renderItem={({item}) => {
                      const isAdded = blockerItems.some(
                        b => b.value === item.packageName,
                      );
                      return (
                        <TouchableOpacity
                          style={s.appRow}
                          onPress={() => addApp(item)}
                          disabled={isAdded}>
                          <View style={s.appIcon}>
                            <Text style={s.appIconText}>
                              {item.name[0].toUpperCase()}
                            </Text>
                          </View>
                          <View style={s.appInfo}>
                            <Text
                              style={[s.appName, isAdded && s.appNameAdded]}>
                              {item.name}
                            </Text>
                            <Text style={s.appPackage} numberOfLines={1}>
                              {item.packageName}
                            </Text>
                          </View>
                          {isAdded ? (
                            <Text style={s.addedBadge}>Added</Text>
                          ) : (
                            <Text style={s.addAppBtn}>+ Add</Text>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            )}

            {blockerTab === 'website' && (
              <View>
                <Text style={s.modalLabel}>Name</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g. Instagram"
                  placeholderTextColor="#555"
                  value={newBlockerName}
                  onChangeText={setNewBlockerName}
                />
                <Text style={s.modalLabel}>Domain</Text>
                <TextInput
                  style={s.modalInput}
                  placeholder="e.g. instagram.com"
                  placeholderTextColor="#555"
                  value={newBlockerValue}
                  onChangeText={setNewBlockerValue}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.modalAddBtn} onPress={submitWebsite}>
                  <Text style={s.modalAddText}>Add Website</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={s.nav}>
        {['tasks', 'focus', 'report'].map(p => (
          <TouchableOpacity
            key={p}
            style={s.navItem}
            onPress={() => setPage(p)}>
            <Text style={s.navIcon}>
              {p === 'tasks' ? '📋' : p === 'focus' ? '🔒' : '📊'}
            </Text>
            <Text style={[s.navLabel, page === p && s.navLabelActive]}>
              {p === 'tasks' ? 'Tasks' : p === 'focus' ? 'Focus' : 'Report'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {fontSize: 20, fontWeight: '700', color: '#4ade80'},
  headerDate: {fontSize: 13, color: '#555'},
  content: {flex: 1, padding: 16},
  pageTitle: {fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16},
  addRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: '#4ade80',
    borderRadius: 8,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {fontSize: 24, color: '#0f0f0f', fontWeight: '700'},
  empty: {color: '#555', textAlign: 'center', padding: 20},
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {backgroundColor: '#4ade80', borderColor: '#4ade80'},
  checkmark: {color: '#0f0f0f', fontWeight: '700', fontSize: 13},
  taskName: {color: '#fff', fontSize: 14},
  taskNameRow: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6},
  rolloverBadge: {
    backgroundColor: '#854d0e',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rolloverBadgeText: {color: '#fef08a', fontSize: 11},
  taskDone: {textDecorationLine: 'line-through', color: '#555'},
  taskTime: {color: '#4ade80', fontSize: 12, minWidth: 45},
  timerBtn: {backgroundColor: '#2a2a2a', borderRadius: 6, padding: 6},
  timerBtnText: {fontSize: 12},
  deleteBtn: {padding: 6},
  deleteBtnText: {color: '#ef4444', fontSize: 14},
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {color: '#fff', fontWeight: '600'},
  smallBtn: {
    backgroundColor: '#4ade80',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallBtnText: {color: '#0f0f0f', fontWeight: '700', fontSize: 13},
  focusStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  statusDotActive: {backgroundColor: '#4ade80'},
  focusStatusText: {color: '#ccc', fontSize: 14},
  focusBtn: {
    backgroundColor: '#4ade80',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  focusBtnStop: {backgroundColor: '#ef4444'},
  focusBtnText: {color: '#0f0f0f', fontWeight: '700', fontSize: 15},
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 10,
  },
  blockerName: {flex: 1, color: '#fff', fontSize: 14},
  badge: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {color: '#888', fontSize: 11},
  statsRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {fontSize: 28, fontWeight: '700', color: '#4ade80'},
  statLabel: {fontSize: 12, color: '#666', marginTop: 4},
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dayName: {width: 70, color: '#888', fontSize: 12},
  barWrap: {flex: 1, backgroundColor: '#2a2a2a', borderRadius: 4, height: 8},
  bar: {height: 8, backgroundColor: '#4ade80', borderRadius: 4},
  dayHours: {width: 35, color: '#4ade80', fontSize: 12, textAlign: 'right'},
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    backgroundColor: '#0f0f0f',
  },
  navItem: {flex: 1, alignItems: 'center', paddingVertical: 10},
  navIcon: {fontSize: 20},
  navLabel: {fontSize: 11, color: '#555', marginTop: 2},
  navLabelActive: {color: '#4ade80'},
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  modalClose: {color: '#888', fontSize: 18, padding: 4},
  tabRow: {flexDirection: 'row', gap: 10, marginBottom: 16},
  tab: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  tabActive: {backgroundColor: '#4ade80'},
  tabText: {color: '#888', fontSize: 14, fontWeight: '600'},
  tabTextActive: {color: '#0f0f0f'},
  appPicker: {height: 400},
  searchInput: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  appList: {flex: 1},
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {color: '#4ade80', fontWeight: '700', fontSize: 16},
  appInfo: {flex: 1},
  appName: {color: '#fff', fontSize: 14, fontWeight: '500'},
  appNameAdded: {color: '#555'},
  appPackage: {color: '#555', fontSize: 11, marginTop: 2},
  addAppBtn: {color: '#4ade80', fontSize: 13, fontWeight: '700'},
  addedBadge: {color: '#555', fontSize: 12},
  modalLabel: {color: '#888', fontSize: 13, marginBottom: 6},
  modalInput: {
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 16,
  },
  modalAddBtn: {
    backgroundColor: '#4ade80',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalAddText: {color: '#0f0f0f', fontWeight: '700', fontSize: 15},
});
