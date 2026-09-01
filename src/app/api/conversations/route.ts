import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const id = searchParams.get('id');
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    const db = await getDatabase(customUri);
    const collection = db.collection('conversations');

    if (id) {
      const item = await collection.findOne({ id });
      if (!item) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return NextResponse.json(item);
    }

    const query: any = {};
    if (userId && userId !== 'all') {
      query.$or = [{ userId }, { userId: { $exists: false } }];
    }

    const list = await collection
      .find(query, { projection: { audioBase64: 0 } })
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json(list);
  } catch (error: any) {
    console.error('MongoDB GET /api/conversations error:', error);
    return NextResponse.json({ error: error.message || 'Database connection error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    const collection = db.collection('conversations');

    const conversationData = {
      ...body,
      userId: body.userId || 'default_user',
      updatedAt: Date.now()
    };

    await collection.updateOne(
      { id: body.id },
      { $set: conversationData },
      { upsert: true }
    );

    return NextResponse.json({ success: true, id: body.id });
  } catch (error: any) {
    console.error('MongoDB POST /api/conversations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save conversation' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    await db.collection('conversations').deleteOne({ id });
    await db.collection('tasks').deleteMany({ conversationId: id });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('MongoDB DELETE /api/conversations error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete conversation' }, { status: 500 });
  }
}
