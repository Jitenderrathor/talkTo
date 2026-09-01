import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const customUri = request.headers.get('x-mongodb-uri') || undefined;
    const db = await getDatabase(customUri);

    const users = await db
      .collection('users')
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    if (users.length === 0) {
      // Default user
      const defaultUser = {
        id: 'default_user',
        name: 'My Profile',
        createdAt: Date.now()
      };
      await db.collection('users').insertOne(defaultUser);
      return NextResponse.json([defaultUser]);
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('MongoDB GET /api/users error:', error);
    // Return default local user if offline
    return NextResponse.json([{ id: 'default_user', name: 'My Profile', createdAt: Date.now() }]);
  }
}

export async function POST(request: Request) {
  try {
    const { name, id } = await request.json();
    const customUri = request.headers.get('x-mongodb-uri') || undefined;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 });
    }

    const db = await getDatabase(customUri);
    const userId = id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const userDoc = {
      id: userId,
      name: name.trim(),
      createdAt: Date.now()
    };

    await db.collection('users').updateOne(
      { id: userId },
      { $set: userDoc },
      { upsert: true }
    );

    return NextResponse.json(userDoc);
  } catch (error: any) {
    console.error('MongoDB POST /api/users error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
