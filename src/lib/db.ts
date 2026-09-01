import { get, set, del } from 'idb-keyval';

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

export interface ConversationMetadata {
  id: string;
  userId?: string;
  date: string;       // YYYY-MM-DD format
  timestamp: number;  // Epoch millisecond
  title: string;
  transcript: string;
  structured: {
    summary: string;
    takeaways: string[];
    toWorkOn: string[];
  };
  transcriptStructured?: {
    summary: string;
    conversation: string;
    takeaways: string[];
    toWorkOn: string[];
  };
  duration?: number;  // Duration in seconds
}

export interface ConversationDetail extends ConversationMetadata {
  audioBlob?: Blob;
}

export interface TaskItem {
  id: string;
  userId?: string;
  text: string;
  completed: boolean;
  createdAt: number;
  conversationId?: string;
  conversationTitle?: string;
}

export interface WorkingNote {
  id: string;
  userId?: string;
  title: string;
  content: string;
  createdAt: number;
}

const METADATA_KEY = 'talkto_conversations_metadata';
const TASKS_KEY = 'talkto_global_tasks';
const NOTES_KEY = 'talkto_working_notes';
const USERS_KEY = 'talkto_user_profiles';
const ACTIVE_USER_KEY = 'talkto_active_user';

const isClient = typeof window !== 'undefined';

function getMongoCustomHeader(): HeadersInit {
  if (!isClient) return {};
  const uri = localStorage.getItem('talkto_mongodb_uri') || '';
  if (uri) {
    return { 'x-mongodb-uri': uri };
  }
  return {};
}

/**
 * User Profile & Switcher Operations
 */
export async function getCurrentUser(): Promise<UserProfile> {
  if (!isClient) return { id: 'default_user', name: 'My Profile', createdAt: Date.now() };
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  const defaultUser = { id: 'default_user', name: 'My Profile', createdAt: Date.now() };
  setCurrentUser(defaultUser);
  return defaultUser;
}

export function setCurrentUser(user: UserProfile): void {
  if (!isClient) return;
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
}

export async function getUserProfiles(): Promise<UserProfile[]> {
  if (!isClient) return [];
  try {
    // Try MongoDB first
    const res = await fetch('/api/users', { headers: getMongoCustomHeader() }).catch(() => null);
    if (res && res.ok) {
      const users: UserProfile[] = await res.json();
      if (users && users.length > 0) {
        await set(USERS_KEY, users);
        return users;
      }
    }
  } catch (e) {}

  // Fallback to local
  try {
    const local = await get<UserProfile[]>(USERS_KEY);
    if (local && local.length > 0) return local;
  } catch (e) {}

  const initialUsers: UserProfile[] = [
    { id: 'default_user', name: 'My Profile', createdAt: Date.now() }
  ];
  await set(USERS_KEY, initialUsers);
  return initialUsers;
}

export async function createUserProfile(name: string): Promise<UserProfile> {
  const newUser: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    createdAt: Date.now()
  };

  // Try MongoDB
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
      body: JSON.stringify(newUser)
    });
  } catch (e) {}

  // Save locally
  const current = await getUserProfiles();
  const updated = [...current, newUser];
  await set(USERS_KEY, updated);
  setCurrentUser(newUser);
  return newUser;
}

/**
 * Conversations Operations (MongoDB Server with IndexedDB fallback)
 */
export async function getConversationsMetadata(): Promise<ConversationMetadata[]> {
  if (!isClient) return [];
  const user = await getCurrentUser();

  // 1. Try fetching from MongoDB
  try {
    const res = await fetch(`/api/conversations?userId=${encodeURIComponent(user.id)}`, {
      headers: getMongoCustomHeader()
    });
    if (res.ok) {
      const mongoList: ConversationMetadata[] = await res.json();
      if (Array.isArray(mongoList)) {
        await set(METADATA_KEY, mongoList);
        return mongoList.sort((a, b) => b.timestamp - a.timestamp);
      }
    }
  } catch (error) {
    // MongoDB offline/local fallback
  }

  // 2. Fallback to IndexedDB
  try {
    const list = await get<ConversationMetadata[]>(METADATA_KEY);
    const userList = list ? list.filter(c => !c.userId || c.userId === user.id || user.id === 'default_user') : [];
    return userList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get conversation metadata from IndexedDB:', error);
    return [];
  }
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!isClient) return null;

  let metadata: ConversationMetadata | null = null;

  // 1. Try MongoDB
  try {
    const res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      headers: getMongoCustomHeader()
    });
    if (res.ok) {
      metadata = await res.json();
    }
  } catch (e) {}

  // 2. Fallback to local
  if (!metadata) {
    const metadataList = await get<ConversationMetadata[]>(METADATA_KEY);
    metadata = metadataList?.find(c => c.id === id) || null;
  }

  if (!metadata) return null;

  // Load corresponding audio blob if it exists locally
  const audioBlob = await get<Blob>(`talkto_audio_${id}`);
  return {
    ...metadata,
    audioBlob,
  };
}

export async function saveConversation(
  conversation: ConversationMetadata,
  audioBlob?: Blob
): Promise<void> {
  if (!isClient) return;
  const user = await getCurrentUser();
  const conversationWithUser = {
    ...conversation,
    userId: conversation.userId || user.id
  };

  // 1. Save locally in IndexedDB
  try {
    const metadataList = (await get<ConversationMetadata[]>(METADATA_KEY)) || [];
    const index = metadataList.findIndex(c => c.id === conversation.id);
    if (index >= 0) {
      metadataList[index] = conversationWithUser;
    } else {
      metadataList.unshift(conversationWithUser);
    }
    await set(METADATA_KEY, metadataList);

    if (audioBlob) {
      await set(`talkto_audio_${conversation.id}`, audioBlob);
    }

    // Sync tasks
    const globalTasks = (await get<TaskItem[]>(TASKS_KEY)) || [];
    const existingConvTasks = globalTasks.filter(t => t.conversationId === conversation.id);
    const completedTaskTexts = new Set(
      existingConvTasks.filter(t => t.completed).map(t => t.text)
    );
    const otherTasks = globalTasks.filter(t => t.conversationId !== conversation.id);

    const workOnList = conversation.transcriptStructured?.toWorkOn || conversation.structured.toWorkOn || [];
    const newTasks: TaskItem[] = workOnList.map((item, idx) => ({
      id: `${conversation.id}_task_${idx}`,
      userId: user.id,
      text: item.trim(),
      completed: completedTaskTexts.has(item.trim()),
      createdAt: conversation.timestamp,
      conversationId: conversation.id,
      conversationTitle: conversation.title
    }));

    await saveGlobalTasks([...otherTasks, ...newTasks]);
  } catch (err) {
    console.error('IndexedDB save error:', err);
  }

  // 2. Push to MongoDB API
  try {
    await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getMongoCustomHeader()
      },
      body: JSON.stringify(conversationWithUser)
    });
  } catch (err) {
    console.warn('MongoDB sync deferred (offline or not configured)');
  }
}

export async function deleteConversation(id: string): Promise<void> {
  if (!isClient) return;

  // 1. Delete from local IndexedDB
  try {
    const metadataList = (await get<ConversationMetadata[]>(METADATA_KEY)) || [];
    await set(METADATA_KEY, metadataList.filter(c => c.id !== id));
    await del(`talkto_audio_${id}`);

    const globalTasks = (await get<TaskItem[]>(TASKS_KEY)) || [];
    await saveGlobalTasks(globalTasks.filter(t => t.conversationId !== id));
  } catch (e) {}

  // 2. Delete from MongoDB API
  try {
    await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getMongoCustomHeader()
    });
  } catch (e) {}
}

/**
 * Task Operations
 */
export async function getGlobalTasks(): Promise<TaskItem[]> {
  if (!isClient) return [];
  const user = await getCurrentUser();

  // Try MongoDB
  try {
    const res = await fetch(`/api/tasks?userId=${encodeURIComponent(user.id)}`, {
      headers: getMongoCustomHeader()
    });
    if (res.ok) {
      const mongoTasks: TaskItem[] = await res.json();
      if (Array.isArray(mongoTasks)) {
        await set(TASKS_KEY, mongoTasks);
        return mongoTasks.sort((a, b) => b.createdAt - a.createdAt);
      }
    }
  } catch (e) {}

  // Fallback to IndexedDB
  try {
    const list = await get<TaskItem[]>(TASKS_KEY);
    const userTasks = list ? list.filter(t => !t.userId || t.userId === user.id || user.id === 'default_user') : [];
    return userTasks.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    return [];
  }
}

export async function saveGlobalTasks(tasks: TaskItem[]): Promise<void> {
  if (!isClient) return;
  await set(TASKS_KEY, tasks);

  // Sync to MongoDB in background
  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
      body: JSON.stringify(tasks)
    });
  } catch (e) {}
}

export async function addGlobalTask(
  text: string,
  conversationId?: string,
  conversationTitle?: string
): Promise<TaskItem> {
  const user = await getCurrentUser();
  const newTask: TaskItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.id,
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    conversationId,
    conversationTitle
  };

  const tasks = await getGlobalTasks();
  tasks.unshift(newTask);
  await saveGlobalTasks(tasks);
  return newTask;
}

export async function toggleGlobalTask(id: string): Promise<void> {
  const tasks = await getGlobalTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index >= 0) {
    tasks[index].completed = !tasks[index].completed;
    await saveGlobalTasks(tasks);

    // Update in MongoDB
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
        body: JSON.stringify({ id, completed: tasks[index].completed })
      });
    } catch (e) {}
  }
}

export async function deleteGlobalTask(id: string): Promise<void> {
  const tasks = await getGlobalTasks();
  const filtered = tasks.filter(t => t.id !== id);
  await saveGlobalTasks(filtered);

  // Delete from MongoDB
  try {
    await fetch(`/api/tasks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getMongoCustomHeader()
    });
  } catch (e) {}
}

/**
 * Working Notes Operations
 */
export async function getWorkingNotes(): Promise<WorkingNote[]> {
  if (!isClient) return [];
  const user = await getCurrentUser();

  // Try MongoDB
  try {
    const res = await fetch(`/api/notes?userId=${encodeURIComponent(user.id)}`, {
      headers: getMongoCustomHeader()
    });
    if (res.ok) {
      const mongoNotes: WorkingNote[] = await res.json();
      if (Array.isArray(mongoNotes)) {
        await set(NOTES_KEY, mongoNotes);
        return mongoNotes.sort((a, b) => b.createdAt - a.createdAt);
      }
    }
  } catch (e) {}

  // Fallback to IndexedDB
  try {
    const list = await get<WorkingNote[]>(NOTES_KEY);
    const userNotes = list ? list.filter(n => !n.userId || n.userId === user.id || user.id === 'default_user') : [];
    return userNotes.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    return [];
  }
}

export async function saveWorkingNotes(notes: WorkingNote[]): Promise<void> {
  if (!isClient) return;
  await set(NOTES_KEY, notes);

  try {
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
      body: JSON.stringify(notes)
    });
  } catch (e) {}
}

export async function addWorkingNote(title: string, content: string): Promise<WorkingNote> {
  const user = await getCurrentUser();
  const newNote: WorkingNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: user.id,
    title: title.trim(),
    content: content.trim(),
    createdAt: Date.now()
  };

  const notes = await getWorkingNotes();
  notes.unshift(newNote);
  await saveWorkingNotes(notes);
  return newNote;
}

export async function updateWorkingNote(id: string, title: string, content: string): Promise<void> {
  const notes = await getWorkingNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index >= 0) {
    notes[index].title = title.trim();
    notes[index].content = content.trim();
    await saveWorkingNotes(notes);

    try {
      await fetch('/api/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
        body: JSON.stringify({ id, title, content })
      });
    } catch (e) {}
  }
}

export async function deleteWorkingNote(id: string): Promise<void> {
  const notes = await getWorkingNotes();
  const filtered = notes.filter(n => n.id !== id);
  await saveWorkingNotes(filtered);

  try {
    await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getMongoCustomHeader()
    });
  } catch (e) {}
}

/**
 * Test Connection & Full Sync
 */
export async function checkMongoDBStatus(): Promise<{ connected: boolean; message: string; stats?: any }> {
  try {
    const res = await fetch('/api/sync', { headers: getMongoCustomHeader() });
    return await res.json();
  } catch (error: any) {
    return { connected: false, message: error.message || 'Connection failed' };
  }
}

export async function syncAllToMongoDB(): Promise<{ success: boolean; synced?: any; error?: string }> {
  if (!isClient) return { success: false, error: 'Not client' };
  try {
    const conversations = (await get<ConversationMetadata[]>(METADATA_KEY)) || [];
    const tasks = (await get<TaskItem[]>(TASKS_KEY)) || [];
    const notes = (await get<WorkingNote[]>(NOTES_KEY)) || [];

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getMongoCustomHeader() },
      body: JSON.stringify({ conversations, tasks, notes })
    });

    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message || 'Sync failed' };
  }
}
