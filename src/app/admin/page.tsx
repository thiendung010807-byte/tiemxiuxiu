'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { firebaseAuth, firebaseConfigured, googleProvider } from '@/lib/firebase-client';
import { RefreshCw, LogIn, LogOut, PackageCheck, Banknote, Clock3, Search, CheckCircle2, XCircle } from 'lucide-react';

type Order = Record<string, string>;
type Product = { id: string; name: string; desc: string; details: string; price: number; images: string[]; color: string; active?: boolean };
const money = (value: string | number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const paymentLabels: Record<string, string> = { pending_confirmation: 'Chờ xác nhận', paid: 'Đã thanh toán', rejected: 'Không khớp giao dịch' };
const statusLabels: Record<string, string> = { new: 'Đơn mới', preparing: 'Đang chuẩn bị', ready_for_pickup: 'Sẵn sàng nhận', delivered: 'Đã giao/nhận', cancelled: 'Đã hủy' };

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('hoa-xinh');
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productColor, setProductColor] = useState('bg-pinky');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productActive, setProductActive] = useState(true);
  const [productSaving, setProductSaving] = useState(false);
  const [productUploading, setProductUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
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

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const body = await response.json();
      if (response.ok) setProducts(body.products || []);
    } catch { /* orders dashboard remains usable if catalog load fails */ }
  }, [getToken, user]);

  useEffect(() => { if (user && authorizationChecked && !accessDenied) void loadProducts(); }, [user, authorizationChecked, accessDenied, loadProducts]);

  const selectProduct = (product: Product) => {
    setProductId(product.id); setProductName(product.name); setProductDesc(product.desc || '');
    setProductDetails(product.details || ''); setProductPrice(String(product.price)); setProductColor(product.color || 'bg-pinky');
    setProductImages(product.images || []); setProductActive(product.active !== false);
  };

  const saveProduct = async () => {
    if (!user) return;
    setProductSaving(true); setError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: productId.trim(), name: productName, desc: productDesc, details: productDetails, price: Number(productPrice), color: productColor, images: productImages, active: productActive }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không lưu được sản phẩm');
      await loadProducts();
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được sản phẩm'); }
    finally { setProductSaving(false); }
  };

  const uploadProductImages = async (files: FileList | null) => {
    if (!user || !files?.length) return;
    setProductUploading(true); setError('');
    try {
      const token = await getToken();
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) throw new Error('Mỗi ảnh phải là định dạng ảnh và tối đa 8 MB.');
        const signedResponse = await fetch('/api/admin/products/sign', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: productId.trim() }) });
        const signed = await signedResponse.json();
        if (!signedResponse.ok) throw new Error(signed.error || 'Không ký được ảnh');
        const form = new FormData(); form.append('file', file); form.append('api_key', signed.apiKey); form.append('timestamp', String(signed.timestamp)); form.append('public_id', signed.publicId); form.append('upload_preset', signed.uploadPreset); form.append('signature', signed.signature);
        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: 'POST', body: form });
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploaded.error?.message || 'Tải ảnh lên thất bại');
        added.push(uploaded.secure_url);
      }
      setProductImages(prev => [...prev, ...added].slice(0, 12));
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được ảnh'); }
    finally { setProductUploading(false); }
  };

  const update = async (order: Order, paymentStatus: string, orderStatus?: string) => {
    if (!user) return;
    setSaving(order.order_id); setError('');
    try {
      const token = await getToken();
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId: order.order_id, paymentStatus, ...(orderStatus ? { orderStatus } : {}) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không cập nhật được đơn');
      await loadOrders();
      if (body.sheetSync === false) setError('Đã cập nhật đơn trong Firestore nhưng chưa đồng bộ được Google Sheets. Kiểm tra tab, hàng tiêu đề và quyền truy cập Sheets.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Có lỗi xảy ra'); }
    finally { setSaving(null); }
  };

  const filtered = useMemo(() => orders.filter(order => [order.order_id, order.customer_name, order.customer_phone, order.recipient_name].join(' ').toLowerCase().includes(query.toLowerCase()) && (paymentFilter === 'all' || order.payment_status === paymentFilter) && (orderFilter === 'all' || order.order_status === orderFilter)), [orders, query, paymentFilter, orderFilter]);
  const revenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const waiting = orders.filter(o => o.payment_status === 'pending_confirmation').length;

  if (!authReady) return <div className="p-10 text-center">Đang kiểm tra đăng nhập…</div>;
  if (!firebaseConfigured || !firebaseAuth) return <div className="rounded-2xl border-2 border-dashed border-red-300 bg-white p-8"><h2 className="text-xl font-bold">Chưa cấu hình Firebase</h2><p className="mt-2 text-sm">Hãy điền các biến NEXT_PUBLIC_FIREBASE_* theo README và triển khai lại.</p></div>;
  if (!user) return <div className="mx-auto max-w-md rounded-3xl border-2 border-black bg-white p-8 text-center shadow-sticker"><div className="text-5xl">🔐</div><h2 className="mt-4 text-2xl font-bold">Góc nhỏ của chủ tiệm</h2><p className="mt-2 text-sm text-gray-600">Đăng nhập bằng Google. Chỉ email được khai báo trong ADMIN_EMAILS ở máy chủ mới được đọc hoặc sửa đơn.</p><button
  onClick={() => {
    if (!firebaseAuth) {
      setError("Firebase chưa được khởi tạo. Vui lòng tải lại trang.");
      return;
    }

    void signInWithPopup(firebaseAuth, googleProvider)
      .catch((e) => setError(e.message));
  }}
  className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-yellows px-5 py-3 font-bold"
>
  <LogIn size={18} />
  Đăng nhập Google
</button>{error && <p className="mt-4 text-sm text-red-600">{error}</p>}</div>;

  if (!authorizationChecked) return <div className="p-10 text-center">Đang xác minh quyền quản trị…</div>;
  if (accessDenied) return <div className="mx-auto max-w-lg rounded-3xl border-2 border-black bg-white p-8 text-center shadow-sticker"><div className="text-5xl">⛔</div><h2 className="mt-4 text-2xl font-bold">Email này chưa có quyền quản trị</h2><p className="mt-3 text-sm text-gray-600">Bạn đã đăng nhập Google nhưng email <b>{user.email}</b> chưa nằm trong biến ADMIN_EMAILS trên môi trường server. Hãy thêm đúng email chủ tiệm vào Vercel Environment Variables rồi redeploy, hoặc đăng xuất và dùng tài khoản đã được cấp quyền.</p><button onClick={() => {
  if (!firebaseAuth) {
    setError("Firebase chưa được khởi tạo. Vui lòng tải lại trang.");
    return;
  }

  void signOut(firebaseAuth).catch((e) => {
    setError(e instanceof Error ? e.message : "Không thể đăng xuất.");
  });
}} className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-pinky px-5 py-3 font-bold"><LogOut size={18}/> Đăng xuất / đổi tài khoản</button><button onClick={() => void loadOrders()} className="ml-2 mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-5 py-3 font-bold"><RefreshCw size={16}/> Thử lại</button></div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-gray-500">Đang đăng nhập: {user.email}</p><h1 className="text-3xl font-bold">Bảng điều khiển tiệm 🌷</h1></div><div className="flex gap-2"><button onClick={() => void loadOrders()} className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-3 py-2 font-bold"><RefreshCw size={16}/> Làm mới</button><button onClick={() => {
  if (!firebaseAuth) {
    setError("Firebase chưa được khởi tạo. Vui lòng tải lại trang.");
    return;
  }

  void signOut(firebaseAuth).catch((e) => {
    setError(e instanceof Error ? e.message : "Không thể đăng xuất.");
  });
}} className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-pinky px-3 py-2 font-bold"><LogOut size={16}/> Đăng xuất</button></div></div>
    {error && <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<PackageCheck/>} title="Tổng đơn" value={String(orders.length)}/><Metric icon={<Clock3/>} title="Chờ xác nhận tiền" value={String(waiting)}/><Metric icon={<Banknote/>} title="Doanh thu đã xác nhận" value={money(revenue)}/></div>
    <section className="rounded-2xl border-2 border-black bg-white p-4 shadow-sticker space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Quản lý sản phẩm</h2><button onClick={() => { setProductId(''); setProductName(''); setProductDesc(''); setProductDetails(''); setProductPrice(''); setProductColor('bg-pinky'); setProductImages([]); setProductActive(true); }} className="rounded-lg border-2 border-black bg-yellows px-3 py-2 text-sm font-bold">+ Sản phẩm mới</button></div>
      <div className="flex flex-wrap gap-2">{products.map(product => <button key={product.id} onClick={() => selectProduct(product)} className="rounded-lg border-2 border-black bg-paper px-3 py-2 text-sm font-bold">{product.name}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Mã sản phẩm (chữ thường, số, dấu -)<input value={productId} onChange={e => setProductId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2" /></label>
        <label className="text-sm font-bold">Tên sản phẩm<input value={productName} onChange={e => setProductName(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2" /></label>
        <label className="text-sm font-bold">Giá (VNĐ)<input type="number" min="0" value={productPrice} onChange={e => setProductPrice(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2" /></label>
        <label className="text-sm font-bold">Màu thẻ (Tailwind)<select value={productColor} onChange={e => setProductColor(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2"><option value="bg-pinky">Hồng</option><option value="bg-yellows">Vàng</option><option value="bg-bluey">Xanh</option><option value="bg-greeny">Xanh lá</option></select></label>
        <label className="text-sm font-bold sm:col-span-2">Mô tả ngắn<textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2" rows={2} /></label>
        <label className="text-sm font-bold sm:col-span-2">Mô tả chi tiết<textarea value={productDetails} onChange={e => setProductDetails(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-200 p-2" rows={3} /></label>
        <div className="sm:col-span-2"><label className="block text-sm font-bold">Tải ảnh sản phẩm (tối đa 8 MB/ảnh)<input type="file" accept="image/*" multiple disabled={productUploading} onChange={e => { void uploadProductImages(e.target.files); e.currentTarget.value = ''; }} className="mt-1 block w-full" /></label>{productUploading && <p className="mt-1 text-sm">Đang tải ảnh lên…</p>}<div className="mt-3 flex flex-wrap gap-3">{productImages.map((url, index) => <div key={`${url}-${index}`} className="w-24"><img src={url} alt={`Ảnh ${index+1}`} className="h-24 w-24 rounded-lg border object-cover"/><button type="button" onClick={() => setProductImages(prev => prev.filter((_, i) => i !== index))} className="mt-1 text-xs font-bold text-red-600 underline">Xóa ảnh</button></div>)}</div></div>
        <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={productActive} onChange={e => setProductActive(e.target.checked)} />Đang hiển thị trên cửa hàng</label>
      </div>
      <button onClick={() => void saveProduct()} disabled={productSaving || productUploading || !productId.trim() || !productName.trim() || !productPrice || productImages.length === 0} className="rounded-xl border-2 border-black bg-greeny px-5 py-3 font-bold disabled:opacity-50">{productSaving ? 'Đang lưu…' : 'Lưu sản phẩm'}</button>
      <p className="text-xs text-gray-500">Ảnh và thông tin mới được lưu vào Firestore/Cloudinary; sản phẩm cũ vẫn được giữ nguyên nếu chưa chỉnh sửa.</p>
    </section>
    <div className="rounded-2xl border-2 border-black bg-white p-4 shadow-sticker"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Đơn hàng</h2><div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-3 py-2"><Search size={16}/><input className="min-w-0 outline-none" placeholder="Tìm mã, tên, số điện thoại" value={query} onChange={e => setQuery(e.target.value)}/></label><select aria-label="Lọc trạng thái thanh toán" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="rounded-xl border-2 border-gray-200 px-3 py-2"><option value="all">Mọi trạng thái thanh toán</option><option value="pending_confirmation">Chờ xác nhận</option><option value="paid">Đã thanh toán</option><option value="rejected">Không khớp giao dịch</option></select><select aria-label="Lọc trạng thái đơn" value={orderFilter} onChange={e => setOrderFilter(e.target.value)} className="rounded-xl border-2 border-gray-200 px-3 py-2"><option value="all">Mọi trạng thái đơn</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
      {loading ? <p className="p-8 text-center">Đang tải đơn…</p> : filtered.length === 0 ? <p className="p-8 text-center text-gray-500">Chưa có đơn phù hợp.</p> : <div className="space-y-4">{filtered.map(order => <article key={order.order_id} className="rounded-2xl border-2 border-dashed border-gray-300 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-pink-700">{order.order_id}</p><p className="text-sm text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : ''}</p><h3 className="mt-2 font-bold">{order.customer_name} · {order.customer_phone}</h3><p className="text-sm">{order.customer_address}</p></div><div className="text-right"><p className="text-xl font-bold">{money(order.total_amount)}</p><p className="text-sm">{paymentLabels[order.payment_status] || order.payment_status}</p><p className="text-sm">{statusLabels[order.order_status] || order.order_status}</p></div></div>
      <div className="mt-3 rounded-xl bg-paper p-3 text-sm"><p><b>Hình thức:</b> {order.gift_option === 'shop' ? 'Tiệm gửi hộ (+3.000đ)' : 'Tự nhận/gửi'}</p>{order.gift_option === 'shop' && <><p><b>Người nhận:</b> {order.recipient_name} · {order.recipient_phone}</p><p><b>Địa chỉ:</b> {order.recipient_address}</p><p><b>Lời nhắn:</b> {order.card_message || '(không có)'}</p></>}<p className="mt-1"><b>Sản phẩm:</b> {formatProducts(order.products_json)}</p>{order.payment_proof_url && <p className="mt-2"><b>Ảnh minh chứng:</b> <a className="font-bold text-blue-700 underline" href={order.payment_proof_url} target="_blank" rel="noreferrer">Mở ảnh chuyển khoản ↗</a></p>}</div>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={saving === order.order_id || order.payment_status === 'paid'} onClick={() => void update(order, 'paid')} className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-greeny px-3 py-2 text-sm font-bold disabled:opacity-50"><CheckCircle2 size={16}/> Xác nhận đã nhận tiền</button><button disabled={saving === order.order_id || order.payment_status === 'rejected'} onClick={() => void update(order, 'rejected')} className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-pinky px-3 py-2 text-sm font-bold disabled:opacity-50"><XCircle size={16}/> Không khớp giao dịch</button><select aria-label="Trạng thái đơn" value={order.order_status} disabled={saving === order.order_id} onChange={e => void update(order, order.payment_status, e.target.value)} className="rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-bold">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></article>)}</div>}
    </div>
  </div>;
}

function Metric({ icon, title, value }: { icon: ReactNode; title: string; value: string }) { return <div className="rounded-2xl border-2 border-black bg-white p-5 shadow-sticker"><div className="flex items-center gap-2 text-gray-500">{icon}<span className="font-bold">{title}</span></div><p className="mt-3 text-3xl font-bold">{value}</p></div>; }
function formatProducts(value: string) { try { return (JSON.parse(value) as Array<{name:string;quantity:number;line_total:number}>).map(p => `${p.name} × ${p.quantity} (${money(p.line_total)})`).join(', '); } catch { return value || '—'; } }
