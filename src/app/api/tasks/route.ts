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

    const tasks = await db
      .collection('tasks')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error('MongoDB GET /api/tasks error:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    const db = await getDatabase(customUri);
    const collection = db.collection('tasks');

    if (Array.isArray(body)) {
      // Bulk sync tasks
      const bulkOps = body.map((task: any) => ({
        updateOne: {
          filter: { id: task.id },
          update: { $set: { ...task, userId: task.userId || 'default_user' } },
          upsert: true
        }
      }));
      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
      return NextResponse.json({ success: true, count: bulkOps.length });
    }

    const newTask = {
      ...body,
      id: body.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: body.userId || 'default_user',
      createdAt: body.createdAt || Date.now()
    };

    await collection.updateOne(
      { id: newTask.id },
      { $set: newTask },
      { upsert: true }
    );

    return NextResponse.json(newTask);
  } catch (error: any) {
    console.error('MongoDB POST /api/tasks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save task' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    await db.collection('tasks').updateOne(
      { id: body.id },
      { $set: { completed: body.completed } }
    );

    return NextResponse.json({ success: true, id: body.id, completed: body.completed });
  } catch (error: any) {
    console.error('MongoDB PUT /api/tasks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update task' }, { status: 500 });
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
    await db.collection('tasks').deleteOne({ id });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('MongoDB DELETE /api/tasks error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete task' }, { status: 500 });
  }
}
