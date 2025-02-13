import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import clientPromise from '@/lib/mongodb';
import { hash, compare } from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const client = await clientPromise;
    const db = client.db("leveldb"); // veritabanı adınız
    const users = db.collection("users");

    // Kullanıcıyı bul
    const user = await users.findOne({ username });

    if (!user) {
      return NextResponse.json(
        { message: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Şifre kontrolü
    const passwordMatch = await compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      );
    }

    // Başarılı giriş
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );
    
    // Token oluştur ve cookie'ye kaydet
    response.cookies.set('auth_token', user._id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 saat
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Sunucu hatası oluştu' },
      { status: 500 }
    );
  }
} 