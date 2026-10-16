# V9 - Sua loi build Vercel

Sua Firestore document mapping trong src/app/api/admin/orders/route.ts: khai bao du lieu doc.data() la Record<string, unknown> truoc khi spread. Sua ca danh sach giao hang va danh sach don hang. Khong thay doi business logic.

Build production chua xac nhan do npm ci khong hoan tat trong moi truong kiem thu.
