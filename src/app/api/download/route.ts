import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    console.log('Download requested for:', filename);

    if (!filename) {
      return NextResponse.json({ error: 'Dosya adı gerekli' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: 'leveldergi',
      Key: `level-dergiler-sayfalar/output/${filename}`,
    });

    const response = await s3Client.send(command);
    const stream = response.Body as Readable;

    if (!stream) {
      throw new Error('PDF stream alınamadı');
    }

    console.log('Stream received from S3');

    // Stream'i buffer'a çevir
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    console.log('Buffer size:', buffer.length);

    // Buffer'ı base64'e çevir
    const base64 = buffer.toString('base64');
    console.log('Base64 length:', base64.length);

    // Content-Type'ı doğru şekilde belirt
    const dataUrl = `data:application/pdf;base64,${base64}`;
    console.log('Data URL length:', dataUrl.length);

    return NextResponse.json({ data: dataUrl });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Dosya indirme hatası oluştu' },
      { status: 500 }
    );
  }
} 