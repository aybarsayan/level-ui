import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { hash } from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, email } = body;

    const client = await clientPromise;
    const db = client.db("leveldb");
    const users = db.collection("users");

    // Kullanıcı adı veya email kontrolü
    const existingUser = await users.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Bu kullanıcı adı veya email zaten kullanımda' },
        { status: 400 }
      );
    }

    // Şifreyi hashle
    const hashedPassword = await hash(password, 10);

    // Yeni kullanıcı oluştur
    const result = await users.insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return NextResponse.json(
      { success: true, userId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
} 