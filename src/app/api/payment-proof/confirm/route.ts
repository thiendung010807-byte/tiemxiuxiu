import { NextResponse } from 'next/server';
// Endpoint cũ đã ngừng sử dụng: tạo đơn chỉ diễn ra khi bấm hoàn tất tại /api/orders.
export async function POST() {
  return NextResponse.json({ error: 'Vui lòng hoàn tất đơn qua luồng thanh toán mới.' }, { status: 410 });
}
