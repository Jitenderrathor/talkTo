import { NextResponse } from 'next/server';
import { getDatabase, getMongoClient } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const customUri = request.headers.get('x-mongodb-uri') || undefined;
    const client = await getMongoClient(customUri);
    await client.db('admin').command({ ping: 1 });

    const db = await getDatabase(customUri);
    const conversationsCount = await db.collection('conversations').countDocuments();
    const tasksCount = await db.collection('tasks').countDocuments();
    const notesCount = await db.collection('notes').countDocuments();
    const usersCount = await db.collection('users').countDocuments();

    return NextResponse.json({
      connected: true,
      message: 'MongoDB connection successful',
      stats: {
        conversations: conversationsCount,
        tasks: tasksCount,
        notes: notesCount,
        users: usersCount
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      message: error.message || 'Could not connect to MongoDB'
    }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { conversations, tasks, notes, users } = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    const db = await getDatabase(customUri);

    let syncedConversations = 0;
    let syncedTasks = 0;
    let syncedNotes = 0;

    if (Array.isArray(conversations) && conversations.length > 0) {
      const ops = conversations.map((c: any) => ({
        updateOne: {
          filter: { id: c.id },
          update: { $set: c },
          upsert: true
        }
      }));
      const res = await db.collection('conversations').bulkWrite(ops);
      syncedConversations = res.upsertedCount + res.modifiedCount;
    }

    if (Array.isArray(tasks) && tasks.length > 0) {
      const ops = tasks.map((t: any) => ({
        updateOne: {
          filter: { id: t.id },
          update: { $set: t },
          upsert: true
        }
      }));
      const res = await db.collection('tasks').bulkWrite(ops);
      syncedTasks = res.upsertedCount + res.modifiedCount;
    }

    if (Array.isArray(notes) && notes.length > 0) {
      const ops = notes.map((n: any) => ({
        updateOne: {
          filter: { id: n.id },
          update: { $set: n },
          upsert: true
        }
      }));
      const res = await db.collection('notes').bulkWrite(ops);
      syncedNotes = res.upsertedCount + res.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      synced: {
        conversations: syncedConversations,
        tasks: syncedTasks,
        notes: syncedNotes
      }
    });
  } catch (error: any) {
    console.error('MongoDB sync error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
