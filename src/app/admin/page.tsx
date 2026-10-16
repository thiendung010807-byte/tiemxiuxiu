'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { firebaseAuth, firebaseConfigured, googleProvider } from '@/lib/firebase-client';
import { RefreshCw, LogIn, LogOut, PackageCheck, Banknote, Clock3, Search, CheckCircle2, XCircle } from 'lucide-react';

type Order = Record<string, string>;
const money = (value: string | number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const paymentLabels: Record<string, string> = { pending_confirmation: 'Chờ xác nhận', paid: 'Đã thanh toán', rejected: 'Không khớp giao dịch' };
const statusLabels: Record<string, string> = { new: 'Đơn mới', preparing: 'Đang chuẩn bị', ready_for_pickup: 'Sẵn sàng nhận', delivered: 'Đã giao/nhận', cancelled: 'Đã hủy' };

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authorizationChecked, setAuthorizationChecked] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) { setAuthReady(true); return; }
    return onAuthStateChanged(firebaseAuth, current => { setUser(current); setAuthReady(true); });
  }, []);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Vui lòng đăng nhập tài khoản quản trị');
    return user.getIdToken();
  }, [user]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 403) { setAccessDenied(true); setOrders([]); }
        throw new Error(body.error || 'Không tải được đơn');
      }
      setAccessDenied(false); setOrders(body.orders || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra'); }
    finally { setLoading(false); setAuthorizationChecked(true); }
  }, [getToken, user]);

  useEffect(() => { if (user) void loadOrders(); }, [user, loadOrders]);

  const update = async (order: Order, paymentStatus: string, orderStatus?: string) => {
    if (!user) return;
    setSaving(order.order_id); setError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId: order.order_id, paymentStatus, ...(orderStatus ? { orderStatus } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không cập nhật được đơn');
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra'); }
    finally { setSaving(null); }
  };

  const filtered = useMemo(() => orders.filter(order => [order.order_id, order.customer_name, order.customer_phone, order.recipient_name].join(' ').toLowerCase().includes(query.toLowerCase())), [orders, query]);
  const revenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const waiting = orders.filter(o => o.payment_status === 'pending_confirmation').length;

  if (!authReady) return <div className="p-10 text-center">Đang kiểm tra đăng nhập…</div>;
  if (!firebaseConfigured || !firebaseAuth) return <div className="rounded-2xl border-2 border-dashed border-red-300 bg-white p-8"><h2 className="text-xl font-bold">Chưa cấu hình Firebase</h2><p className="mt-2 text-sm">Hãy điền các biến NEXT_PUBLIC_FIREBASE_* theo README và triển khai lại.</p></div>;
  if (!user) return <div className="mx-auto max-w-md rounded-3xl border-2 border-black bg-white p-8 text-center shadow-sticker"><div className="text-5xl">🔐</div><h2 className="mt-4 text-2xl font-bold">Góc nhỏ của chủ tiệm</h2><p className="mt-2 text-sm text-gray-600">Đăng nhập bằng Google. Chỉ email được khai báo trong ADMIN_EMAILS ở máy chủ mới được đọc hoặc sửa đơn.</p><button onClick={() => signInWithPopup(firebaseAuth, googleProvider).catch(e => setError(e.message))} className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-yellows px-5 py-3 font-bold"><LogIn size={18}/> Đăng nhập Google</button>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}</div>;

  if (!authorizationChecked) return <div className="p-10 text-center">Đang xác minh quyền quản trị…</div>;
  if (accessDenied) return <div className="mx-auto max-w-lg rounded-3xl border-2 border-black bg-white p-8 text-center shadow-sticker"><div className="text-5xl">⛔</div><h2 className="mt-4 text-2xl font-bold">Email này chưa có quyền quản trị</h2><p className="mt-3 text-sm text-gray-600">Bạn đã đăng nhập Google nhưng email <b>{user.email}</b> chưa nằm trong biến ADMIN_EMAILS trên môi trường server. Hãy thêm đúng email chủ tiệm vào Vercel Environment Variables rồi redeploy, hoặc đăng xuất và dùng tài khoản đã được cấp quyền.</p><button onClick={() => signOut(firebaseAuth)} className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-pinky px-5 py-3 font-bold"><LogOut size={18}/> Đăng xuất / đổi tài khoản</button><button onClick={() => void loadOrders()} className="ml-2 mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-5 py-3 font-bold"><RefreshCw size={16}/> Thử lại</button></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gray-500">Đang đăng nhập: {user.email}</p><h1 className="text-3xl font-bold">Bảng điều khiển tiệm 🌷</h1></div><div className="flex gap-2"><button onClick={() => void loadOrders()} className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 font-bold"><RefreshCw size={16}/> Làm mới</button><button onClick={() => signOut(firebaseAuth)} className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-pinky px-3 py-2 font-bold"><LogOut size={16}/> Đăng xuất</button></div></div>
    {error && <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<PackageCheck/>} title="Tổng đơn" value={String(orders.length)}/><Metric icon={<Clock3/>} title="Chờ xác nhận tiền" value={String(waiting)}/><Metric icon={<Banknote/>} title="Doanh thu đã xác nhận" value={money(revenue)}/></div>
    <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-sticker"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Đơn hàng</h2><label className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-3 py-2"><Search size={16}/><input className="min-w-0 outline-none" placeholder="Tìm mã, tên, số điện thoại" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
      {loading ? <p className="p-8 text-center">Đang tải đơn…</p> : filtered.length === 0 ? <p className="p-8 text-center text-gray-500">Chưa có đơn phù hợp.</p> : <div className="space-y-4">{filtered.map(order => <article key={order.order_id} className="rounded-2xl border-2 border-dashed border-gray-300 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-pink-700">{order.order_id}</p><p className="text-sm text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : ''}</p><h3 className="mt-2 font-bold">{order.customer_name} · {order.customer_phone}</h3><p className="text-sm">{order.customer_address}</p></div><div className="text-right"><p className="text-xl font-bold">{money(order.total_amount)}</p><p className="text-sm">{paymentLabels[order.payment_status] || order.payment_status}</p><p className="text-sm">{statusLabels[order.order_status] || order.order_status}</p></div></div>
      <div className="mt-3 rounded-xl bg-paper p-3 text-sm"><p><b>Hình thức:</b> {order.gift_option === 'shop' ? 'Tiệm gửi hộ (+3.000đ)' : 'Tự nhận/gửi'}</p>{order.gift_option === 'shop' && <><p><b>Người nhận:</b> {order.recipient_name} · {order.recipient_phone}</p><p><b>Địa chỉ:</b> {order.recipient_address}</p><p><b>Lời nhắn:</b> {order.card_message || '(không có)'}</p></>}<p className="mt-1"><b>Sản phẩm:</b> {formatProducts(order.products_json)}</p>{order.payment_proof_url && <p className="mt-2"><b>Ảnh minh chứng:</b> <a className="font-bold text-blue-700 underline" href={order.payment_proof_url} target="_blank" rel="noreferrer">Mở ảnh chuyển khoản ↗</a></p>}</div>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={saving === order.order_id || order.payment_status === 'paid'} onClick={() => void update(order, 'paid')} className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-greeny px-3 py-2 text-sm font-bold disabled:opacity-50"><CheckCircle2 size={16}/> Xác nhận đã nhận tiền</button><button disabled={saving === order.order_id || order.payment_status === 'rejected'} onClick={() => void update(order, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-pinky px-3 py-2 text-sm font-bold disabled:opacity-50"><XCircle size={16}/> Không khớp giao dịch</button><select aria-label="Trạng thái đơn" value={order.order_status} disabled={saving === order.order_id} onChange={e => void update(order, order.payment_status, e.target.value)} className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div>}
    </div>
  </div>;
}

function Metric({ icon, title, value }: { icon: ReactNode; title: string; value: string }) { return <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-sticker"><div className="flex items-center gap-2 text-gray-500">{icon}<span className="font-bold">{title}</span></div><p className="mt-3 text-3xl font-bold">{value}</p></div>; }
function formatProducts(value: string) { try { return (JSON.parse(value) as Array<{name:string;quantity:number;line_total:number}>).map(p => `${p.name} × ${p.quantity} (${money(p.line_total)})`).join(', '); } catch { return value || '—'; } }
