import 'server-only';
export async function verifyUploadedProof(orderId: string, publicId: string, secureUrl: string) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME, key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) throw new Error('Cloudinary chưa được cấu hình');
  if (!publicId.startsWith(`tiem-xiu-xiu/payment-proofs/${orderId}_`)) throw new Error('Ảnh minh chứng không thuộc đơn hàng');
  const api = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload/${publicId.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(api, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('Không tìm thấy ảnh minh chứng trên Cloudinary');
  const asset = await response.json() as { secure_url?: string; public_id?: string; bytes?: number; format?: string; created_at?: string; resource_type?: string };
  if (asset.public_id !== publicId || asset.secure_url !== secureUrl || !['jpg','jpeg','png','webp'].includes(asset.format || '') || (asset.bytes || 0) < 100 || (asset.bytes || 0) > 5 * 1024 * 1024) throw new Error('Ảnh minh chứng không hợp lệ');
  if (!asset.created_at || Date.now() - new Date(asset.created_at).getTime() > 100 * 60 * 1000 || new Date(asset.created_at).getTime() > Date.now() + 60000) throw new Error('Ảnh minh chứng đã hết thời hạn sử dụng');
  return { uploadedAt: asset.created_at };
}
