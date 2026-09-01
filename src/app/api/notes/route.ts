import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    const db = await getDatabase(customUri);
    const query: any = {};
    if (userId && userId !== 'all') {
      query.$or = [{ userId }, { userId: { $exists: false } }];
    }

    const notes = await db
      .collection('notes')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(notes);
  } catch (error: any) {
    console.error('MongoDB GET /api/notes error:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    const db = await getDatabase(customUri);
    const collection = db.collection('notes');

    if (Array.isArray(body)) {
      const bulkOps = body.map((note: any) => ({
        updateOne: {
          filter: { id: note.id },
          update: { $set: { ...note, userId: note.userId || 'default_user' } },
          upsert: true
        }
      }));
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      return NextResponse.json({ success: true, count: bulkOps.length });
    }

    const newNote = {
      ...body,
      id: body.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: body.userId || 'default_user',
      createdAt: body.createdAt || Date.now()
    };

    await collection.updateOne(
      { id: newNote.id },
      { $set: newNote },
      { upsert: true }
    );

    return NextResponse.json(newNote);
  } catch (error: any) {
    console.error('MongoDB POST /api/notes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save note' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing note id' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    await db.collection('notes').updateOne(
      { id: body.id },
      { $set: { title: body.title, content: body.content, updatedAt: Date.now() } }
    );

    return NextResponse.json({ success: true, id: body.id });
  } catch (error: any) {
    console.error('MongoDB PUT /api/notes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    await db.collection('notes').deleteOne({ id });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('MongoDB DELETE /api/notes error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete note' }, { status: 500 });
  }
}
