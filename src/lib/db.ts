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
  duration?: number;  // Duration in seconds
}

export interface ConversationDetail extends ConversationMetadata {
  audioBlob?: Blob;
}

const METADATA_KEY = 'talkto_conversations_metadata';

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
  } catch (error) {
    console.error('Failed to clear conversations from IndexedDB:', error);
    throw error;
  }
}
