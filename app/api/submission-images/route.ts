import { randomUUID } from 'node:crypto';
import { IMAGE_BUCKET, imageReceipt } from '../image-receipt';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const error = (message: string, status: number) => Response.json({ error: message }, { status });
  if (request.headers.get('origin') !== new URL(request.url).origin) return error('이 웹사이트에서 제출해 주세요.', 403);
  const type = request.headers.get('content-type');
  if (!type || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) return error('PNG, JPG, WEBP 이미지만 제출할 수 있습니다.', 415);
  const owner = request.headers.get('x-student-number');
  if (!owner || !/^\d{4}$/.test(owner)) return error('4자리 학번을 확인해 주세요.', 400);
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return error('제출 서버 연결 설정이 필요합니다.', 503);
  try {
    const reader = request.body?.getReader();
    if (!reader) return error('이미지가 없습니다.', 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024) { await reader.cancel(); return error('이미지는 한 장당 2MB 이하로 제출해 주세요.', 413); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!(type === 'image/png' ? png : type === 'image/jpeg' ? jpeg : webp)) return error('이미지 파일 형식이 올바르지 않습니다.', 400);
    const path = `uploads/${randomUUID()}.${type.split('/')[1]}`;
    const response = await fetch(`${url.replace(/\/$/, '')}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': type, 'x-upsert': 'false' },
      body: new Uint8Array(bytes), signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return error('이미지를 저장하지 못했습니다. Storage 버킷 설정을 확인해 주세요.', 502);
    return Response.json({ imagePath: path, imageReceipt: imageReceipt(path, owner) }, { status: 201 });
  } catch { return error('이미지 업로드에 실패했습니다. 다시 제출해 주세요.', 502); }
}
