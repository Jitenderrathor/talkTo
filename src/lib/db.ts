import { get, set, del } from 'idb-keyval';

export interface ConversationMetadata {
  id: string;
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
  text: string;
  completed: boolean;
  createdAt: number;
  conversationId?: string;
  conversationTitle?: string;
}

const METADATA_KEY = 'talkto_conversations_metadata';
const TASKS_KEY = 'talkto_global_tasks';

// Safely execute client-side IndexedDB calls
const isClient = typeof window !== 'undefined';

/**
 * Get all conversation metadata (without heavy audio blobs)
 */
export async function getConversationsMetadata(): Promise<ConversationMetadata[]> {
  if (!isClient) return [];
  try {
    const list = await get<ConversationMetadata[]>(METADATA_KEY);
    return list ? list.sort((a, b) => b.timestamp - a.timestamp) : [];
  } catch (error) {
    console.error('Failed to get conversation metadata from IndexedDB:', error);
    return [];
  }
}

/**
 * Get a specific conversation including its audio blob
 */
export async function getConversation(id: string): Promise<ConversationDetail | null> {
  if (!isClient) return null;
  try {
    const metadataList = await getConversationsMetadata();
    const metadata = metadataList.find(c => c.id === id);
    if (!metadata) return null;

    // Load corresponding audio blob if it exists
    const audioBlob = await get<Blob>(`talkto_audio_${id}`);
    return {
      ...metadata,
      audioBlob,
    };
  } catch (error) {
    console.error(`Failed to get conversation ${id} from IndexedDB:`, error);
    return null;
  }
}

/**
 * Save/update a conversation (metadata is updated in the list, audio blob stored separately)
 */
export async function saveConversation(
  conversation: ConversationMetadata,
  audioBlob?: Blob
): Promise<void> {
  if (!isClient) return;
  try {
    // 1. Update metadata list
    const metadataList = await getConversationsMetadata();
    const index = metadataList.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      metadataList[index] = conversation;
    } else {
      metadataList.push(conversation);
    }
    
    await set(METADATA_KEY, metadataList);

    // 2. Update audio blob if provided
    if (audioBlob) {
      await set(`talkto_audio_${conversation.id}`, audioBlob);
    }

    // 3. Sync tasks to global tasks store
    const globalTasks = await getGlobalTasks();
    
    // Find already checked/completed tasks for this conversation so we don't overwrite their completed state!
    const existingConvTasks = globalTasks.filter(t => t.conversationId === conversation.id);
    const completedTaskTexts = new Set(
      existingConvTasks.filter(t => t.completed).map(t => t.text)
    );

    // Keep other tasks
    const otherTasks = globalTasks.filter(t => t.conversationId !== conversation.id);

    // Generate new tasks from the conversation's toWorkOn list, preserving checked status if the text matches!
    const newTasks: TaskItem[] = conversation.structured.toWorkOn.map((item, idx) => ({
      id: `${conversation.id}_task_${idx}`,
      text: item.trim(),
      completed: completedTaskTexts.has(item.trim()),
      createdAt: conversation.timestamp,
      conversationId: conversation.id,
      conversationTitle: conversation.title
    }));

    await saveGlobalTasks([...otherTasks, ...newTasks]);
  } catch (error) {
    console.error('Failed to save conversation to IndexedDB:', error);
    throw error;
  }
}

/**
 * Delete a conversation and its associated audio blob
 */
export async function deleteConversation(id: string): Promise<void> {
  if (!isClient) return;
  try {
    // 1. Remove from metadata list
    const metadataList = await getConversationsMetadata();
    const filteredList = metadataList.filter(c => c.id !== id);
    await set(METADATA_KEY, filteredList);

    // 2. Remove audio blob
    await del(`talkto_audio_${id}`);

    // 3. Remove tasks associated with this conversation
    const globalTasks = await getGlobalTasks();
    const updatedTasks = globalTasks.filter(t => t.conversationId !== id);
    await saveGlobalTasks(updatedTasks);
  } catch (error) {
    console.error(`Failed to delete conversation ${id} from IndexedDB:`, error);
    throw error;
  }
}

/**
 * Clear all conversations
 */
export async function clearAllConversations(): Promise<void> {
  if (!isClient) return;
  try {
    const metadataList = await getConversationsMetadata();
    for (const item of metadataList) {
      await del(`talkto_audio_${item.id}`);
    }
    await set(METADATA_KEY, []);
    
    // Clear all tasks linked to conversations, keeping custom ones
    const globalTasks = await getGlobalTasks();
    const customTasks = globalTasks.filter(t => !t.conversationId);
    await saveGlobalTasks(customTasks);
  } catch (error) {
    console.error('Failed to clear conversations from IndexedDB:', error);
    throw error;
  }
}

/**
 * Task Board Helper Methods
 */

export async function getGlobalTasks(): Promise<TaskItem[]> {
  if (!isClient) return [];
  try {
    const list = await get<TaskItem[]>(TASKS_KEY);
    return list ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch (error) {
    console.error('Failed to get global tasks from IndexedDB:', error);
    return [];
  }
}

export async function saveGlobalTasks(tasks: TaskItem[]): Promise<void> {
  if (!isClient) return;
  try {
    await set(TASKS_KEY, tasks);
  } catch (error) {
    console.error('Failed to save global tasks to IndexedDB:', error);
    throw error;
  }
}

export async function addGlobalTask(
  text: string,
  conversationId?: string,
  conversationTitle?: string
): Promise<TaskItem> {
  const newTask: TaskItem = {
    id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    text: text.trim(),
    completed: false,
    createdAt: Date.now(),
    conversationId,
    conversationTitle
  };
  const tasks = await getGlobalTasks();
  tasks.unshift(newTask); // Add to the top of list
  await saveGlobalTasks(tasks);
  return newTask;
}

export async function toggleGlobalTask(id: string): Promise<void> {
  const tasks = await getGlobalTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index >= 0) {
    tasks[index].completed = !tasks[index].completed;
    await saveGlobalTasks(tasks);
  }
}

export async function deleteGlobalTask(id: string): Promise<void> {
  const tasks = await getGlobalTasks();
  const filtered = tasks.filter(t => t.id !== id);
  await saveGlobalTasks(filtered);
}
