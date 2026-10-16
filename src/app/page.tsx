"use client";
import { useState, useEffect, useRef } from "react";
import { PRODUCTS } from "@/lib/pricing";
import { ShoppingBag, Heart, Star, Sparkles, Send, Check, X, ChevronLeft, ChevronRight, Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type CartItem = { id: string; quantity: number };
type Product = { id: string; name: string; desc: string; details: string; price: number; color: string; images: string[]; active?: boolean };

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<"shop" | "cart" | "checkout" | "payment" | "success">("shop");
  
  const [products, setProducts] = useState<Product[]>(PRODUCTS as Product[]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const [flyingImage, setFlyingImage] = useState<{ src: string, startX: number, startY: number, id: number } | null>(null);
  const cartIconRef = useRef<HTMLButtonElement>(null);

  const [giftOption, setGiftOption] = useState<"self" | "shop">("self");
  
  const [selfName, setSelfName] = useState("");
  const [selfPhone, setSelfPhone] = useState("");
  const [selfAddress, setSelfAddress] = useState("");
  const [selfTime, setSelfTime] = useState("");
  
  const [senderName, setSenderName] = useState(""); 
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [recipName, setRecipName] = useState("");
  const [recipPhone, setRecipPhone] = useState("");
  const [recipAddress, setRecipAddress] = useState("");
  const [recipTime, setRecipTime] = useState("");
  const [recipMessage, setRecipMessage] = useState("");

  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderResult, setOrderResult] = useState<{id: string, total: number, qrUrl: string | null, bank: {bankId: string, accountNo: string, accountName: string} | null, sheetSync: boolean} | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [proofError, setProofError] = useState("");

  const totalQty = cart.reduce((a, b) => a + b.quantity, 0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    if (selectedProduct) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; }
  }, [selectedProduct]);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" }).then(r => r.json()).then(data => {
      if (Array.isArray(data.products) && data.products.length) setProducts(data.products);
    }).catch(() => undefined).finally(() => setProductsLoaded(true));
  }, []);

  useEffect(() => {
    if (!productsLoaded) return;
    const saved = localStorage.getItem("xiuxiu_v4");
    if (saved) try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setCart(parsed.filter((item: unknown): item is CartItem => {
        if (!item || typeof item !== 'object') return false;
        const value = item as Partial<CartItem>;
        return typeof value.id === 'string' && products.some(product => product.id === value.id) && Number.isInteger(value.quantity) && Number(value.quantity) >= 1 && Number(value.quantity) <= 20;
      }));
    } catch(e) { localStorage.removeItem("xiuxiu_v4"); }
    setCartLoaded(true);
  }, [products, productsLoaded]);

  useEffect(() => {
    if (!cartLoaded) return;
    localStorage.setItem("xiuxiu_v4", JSON.stringify(cart));
  }, [cart, cartLoaded]);

  const triggerFlyAnimation = (e: React.MouseEvent, imgSrc: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyingImage({ src: imgSrc, startX: rect.left + rect.width / 2, startY: rect.top + rect.height / 2, id: Date.now() });
    setTimeout(() => setFlyingImage(null), 800);
  };

  const handleAddToCart = (e: React.MouseEvent, id: string, qty: number, imgSrc: string) => {
    e.stopPropagation();
    if(isAdding) return;
    setIsAdding(true);
    triggerFlyAnimation(e, imgSrc);
    
    setCart(prev => {
      const ex = prev.find(i => i.id === id);
      if (ex) return prev.map(i => i.id === id ? { ...i, quantity: Math.min(i.quantity + qty, 20) } : i);
      return [...prev, { id, quantity: qty }];
    });
    
    if (selectedProduct) {
       setTimeout(() => {
           setSelectedProduct(null);
           setIsAdding(false);
       }, 400);
    } else {
       setTimeout(() => setIsAdding(false), 400);
    }
  };

  // FIX: Restore Cart Item Display & Update Qty
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: Math.min(newQ, 20) } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeCartItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  const pricing = (() => {
    const subtotal = cart.reduce((sum, item) => sum + (products.find(p => p.id === item.id)?.price || 0) * item.quantity, 0);
    const gift_service_fee = giftOption === "shop" ? 3000 : 0;
    return { subtotal, gift_service_fee, delivery_fee: 0, total: subtotal + gift_service_fee };
  })();

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!consent) { setError("Cậu nhớ tick đồng ý nhen!"); return; }
    setLoading(true);
    try {
      const payload = {
        items: cart, giftOption, consent: true, note,
        customer: giftOption === 'self'
          ? { name: selfName, phone: selfPhone, address: selfAddress, time: selfTime }
          : { name: senderName.trim() || 'Người đặt quà', phone: senderPhone, address: senderAddress, time: '' },
        sender: giftOption === 'shop' ? { name: senderName, phone: senderPhone, address: senderAddress } : undefined,
        recipient: giftOption === 'shop' ? { name: recipName, phone: recipPhone, address: recipAddress, time: recipTime, message: recipMessage } : undefined,
      };
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Tiệm chưa tạo được đơn. Cậu thử lại nhé.');
      setOrderResult({ id: body.orderId, total: body.total, qrUrl: body.qrUrl, bank: body.bank, sheetSync: body.sheetSync !== false });
      setProofFile(null); setProofUploaded(false); setProofError("");
      setStep('payment');
    } catch (err) { setError(err instanceof Error ? err.message : 'Lỗi kết nối. Cậu thử lại nhé.'); }
    finally { setLoading(false); }
  };

  const handleProofUpload = async () => {
    if (!orderResult || !proofFile) { setProofError("Cậu chọn ảnh chụp giao dịch trước nhé."); return; }
    if (!proofFile.type.startsWith("image/")) { setProofError("File phải là ảnh."); return; }
    if (proofFile.size > 5 * 1024 * 1024) { setProofError("Ảnh tối đa 5 MB nhé."); return; }
    setProofUploading(true); setProofError("");
    try {
      const signResponse = await fetch("/api/payment-proof/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: orderResult.id }) });
      const sign = await signResponse.json();
      if (!signResponse.ok) throw new Error(sign.error || "Không chuẩn bị được tải ảnh.");
      const form = new FormData();
      form.append("file", proofFile); form.append("api_key", sign.apiKey); form.append("timestamp", String(sign.timestamp));
      form.append("public_id", sign.publicId); form.append("upload_preset", sign.uploadPreset); form.append("signature", sign.signature);
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body: form });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error?.message || "Cloudinary không nhận được ảnh.");
      const saveResponse = await fetch("/api/payment-proof/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: orderResult.id, secureUrl: uploaded.secure_url, publicId: uploaded.public_id }) });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || "Ảnh tải lên rồi nhưng chưa gắn được vào đơn.");
      setProofUploaded(true);
    } catch (err) { setProofError(err instanceof Error ? err.message : "Không tải được ảnh, cậu thử lại nhé."); }
    finally { setProofUploading(false); }
  };

  const handleFinalSubmit = () => {
    if (!proofUploaded) { setProofError("Cậu cần tải ảnh minh chứng trước khi hoàn tất nhé."); return; }
    setCart([]);
    setStep('success');
  };

  return (
    <main className="max-w-2xl mx-auto p-4 pt-10 relative">
      {(loading || proofUploading) && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4" role="status" aria-live="polite"><div className="rounded-2xl border-2 border-black bg-white px-6 py-5 text-center shadow-sticker"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-600"/><p className="font-bold">{loading ? 'Đang tạo đơn hàng…' : 'Đang tải ảnh minh chứng…'}</p><p className="mt-1 text-sm text-gray-600">Vui lòng đợi, đừng đóng trang hoặc gửi lại.</p></div></div>}
      <AnimatePresence>
        {flyingImage && (
          <motion.img
            key={flyingImage.id} src={flyingImage.src}
            className="fixed z-[100] w-16 h-16 rounded-full object-cover border-2 border-black"
            initial={{ x: flyingImage.startX - 32, y: flyingImage.startY - 32, scale: 1, opacity: 1 }}
            animate={{ 
              x: cartIconRef.current?.getBoundingClientRect().left || window.innerWidth - 100,
              y: cartIconRef.current?.getBoundingClientRect().top || 20,
              scale: 0.2, opacity: 0
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 cursor-pointer" onClick={() => setStep("shop")}>
          <Heart className="fill-pinky text-black animate-wiggle" />
          tiệm xíu xiu
        </h1>
        {cart.length > 0 && step !== "success" && (
          <button ref={cartIconRef} onClick={() => setStep(step === "cart" ? "shop" : "cart")} className="crayon-border px-4 py-2 bg-white shadow-sticker font-bold flex gap-2 items-center hover:-translate-y-1 transition-transform z-10">
            <ShoppingBag size={20} />
            <span className="bg-yellows px-2 rounded-full border border-black">{totalQty}</span>
          </button>
        )}
      </header>

      {step === "shop" && (
        <div className="space-y-12 animate-fade-in">
          <section className="text-center space-y-4">
            <h2 className="text-4xl font-bold leading-tight">20/10 này,<br/>tặng cậu một chút xíu yêu thương ♡</h2>
            <div className="flex justify-center gap-4 text-pinky pt-4">
               <Star className="fill-yellows text-black animate-float" size={32} />
               <Sparkles className="fill-bluey text-black animate-float delay-100" size={32} />
            </div>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            {products.map(p => (
              <div key={p.id} className={`crayon-border ${p.color} p-4 shadow-sticker flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer`}
                onClick={() => { setSelectedProduct(p); setDetailQty(1); setCurrentImgIdx(0); }}
              >
                <div>
                  <div className="relative w-full aspect-square mb-4 crayon-border overflow-hidden bg-white">
                    <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 break-words">{p.name}</h3>
                  {p.desc && <p className="mb-3 text-sm text-gray-700">{p.desc}</p>}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-lg">{p.price.toLocaleString("vi-VN")}đ</span>
                  <button disabled={isAdding} onClick={(e) => handleAddToCart(e, p.id, 1, p.images[0])} className="crayon-border bg-white px-3 py-1 font-bold hover:bg-black hover:text-white transition-colors">
                    + Thêm
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      <AnimatePresence>
      {selectedProduct && (
        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
           className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
           onClick={() => setSelectedProduct(null)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="crayon-border bg-white p-6 shadow-sticker max-w-md w-full max-h-[90vh] overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-[60] p-2 bg-white/90 border-2 border-black rounded-full hover:bg-gray-200 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <X size={20} />
            </button>
            
            <div className="relative w-full aspect-square crayon-border overflow-hidden mb-3 bg-gray-100 z-10">
              <Image src={selectedProduct.images[Math.min(currentImgIdx, selectedProduct.images.length - 1)] || "/images/hoa-xinh.svg"} alt={selectedProduct.name} fill className="object-cover" />
            </div>
            {selectedProduct.images.length > 1 && <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{selectedProduct.images.map((src, index) => <button key={`${src}-${index}`} onClick={() => setCurrentImgIdx(index)} aria-label={`Xem ảnh ${index + 1}`} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${currentImgIdx === index ? 'border-pink-600' : 'border-gray-300'}`}><Image src={src} alt={`${selectedProduct.name} ${index + 1}`} fill className="object-cover" /></button>)}</div>}

            <h2 className="text-2xl font-bold mb-2">{selectedProduct.name}</h2>
            <p className="text-xl font-bold text-pink-600 mb-4">{selectedProduct.price.toLocaleString("vi-VN")}đ</p>
            <p className="font-medium mb-6 text-sm">{selectedProduct.details}</p>

            <div className="flex items-center gap-4 bg-gray-100 p-4 rounded-xl border-2 border-dashed border-gray-400 mb-6">
              <span className="font-bold">Số lượng:</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="w-8 h-8 rounded-full bg-white crayon-border font-bold text-xl flex items-center justify-center">-</button>
                <span className="w-6 text-center font-bold text-xl">{detailQty}</span>
                <button onClick={() => setDetailQty(Math.min(20, detailQty + 1))} className="w-8 h-8 rounded-full bg-white crayon-border font-bold text-xl flex items-center justify-center">+</button>
              </div>
            </div>

            <button disabled={isAdding} onClick={(e) => handleAddToCart(e, selectedProduct.id, detailQty, selectedProduct.images[0])}
              className="w-full crayon-border bg-yellows shadow-sticker py-4 font-bold text-xl hover:translate-y-1 transition-transform disabled:opacity-50">
              {isAdding ? "Đang thêm..." : `Thêm ${detailQty} vào giỏ!`}
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* FIX: Re-added cart item display */}
      {step === "cart" && (
         <div className="crayon-border bg-white p-6 shadow-sticker animate-fade-in">
             <div className="flex items-center gap-2 mb-6 border-b-2 border-black pb-4">
                 <button onClick={() => setStep("shop")} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                 <h2 className="text-2xl font-bold">Giỏ hàng xíu xiu</h2>
             </div>
             {cart.length === 0 ? (
                 <div className="text-center py-10">
                   <p className="font-bold text-lg">Giỏ hàng trống trơn! 🍃</p>
                   <button onClick={() => setStep("shop")} className="mt-4 underline font-bold">Quay lại chọn quà</button>
                 </div>
             ) : (
                 <div className="space-y-6">
                   {cart.map(item => {
                     const p = products.find(x => x.id === item.id);
                     if (!p) return null;
                     return (
                       <div key={item.id} className="flex gap-4 items-center border-b-2 border-dashed border-gray-300 pb-4">
                         <div className="w-20 h-20 relative crayon-border shrink-0">
                           <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <h4 className="font-bold truncate text-lg">{p.name}</h4>
                           <p className="text-sm font-bold text-pink-600">{p.price.toLocaleString("vi-VN")}đ</p>
                           
                           <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center gap-2">
                               <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-full bg-gray-200 font-bold border-2 border-black flex items-center justify-center">-</button>
                               <span className="w-6 text-center font-bold">{item.quantity}</span>
                               <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-full bg-gray-200 font-bold border-2 border-black flex items-center justify-center">+</button>
                             </div>
                             <button onClick={() => removeCartItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                                <Trash2 size={20} />
                             </button>
                           </div>
                         </div>
                       </div>
                     )
                   })}
                   
                   <div className="pt-4 flex justify-between font-bold text-xl">
                     <span>Tạm tính:</span>
                     <span>{pricing.subtotal.toLocaleString("vi-VN")}đ</span>
                   </div>
                   
                   <button onClick={() => setStep("checkout")} className="w-full crayon-border bg-greeny py-4 font-bold text-xl mt-6 hover:translate-y-1 transition-transform">
                     Tiến hành đặt quà!
                   </button>
                 </div>
             )}
         </div>
      )}

      {step === "checkout" && (
         <form onSubmit={handleCheckoutSubmit} className="space-y-6 animate-fade-in">
             <div className="flex items-center gap-2 mb-4 cursor-pointer" onClick={() => setStep("cart")}>
               <ChevronLeft /> <span className="font-bold">Giỏ hàng</span>
             </div>
             
             <div className="crayon-border bg-white p-6 shadow-sticker">
                 <h3 className="font-bold text-xl mb-4 text-center">Chọn cách gửi</h3>
                 <div className="flex gap-2 mb-2">
                    <label className={`flex-1 p-3 cursor-pointer font-bold crayon-border ${giftOption==='self'?'bg-bluey':'bg-gray-100'}`}>
                       <input type="radio" checked={giftOption==="self"} onChange={()=>setGiftOption("self")} className="mr-2"/>Tớ tự gửi
                    </label>
                    <label className={`flex-1 p-3 cursor-pointer font-bold crayon-border ${giftOption==='shop'?'bg-pinky':'bg-gray-100'}`}>
                       <input type="radio" checked={giftOption==="shop"} onChange={()=>setGiftOption("shop")} className="mr-2"/>Tiệm gửi hộ (+3k/đơn)
                    </label>
                 </div>
             </div>
             
             {giftOption === "self" && (
                <div className="crayon-border bg-bluey p-6 shadow-sticker space-y-4">
                  <h3 className="font-bold text-xl mb-4">Thông tin nhận quà từ tiệm</h3>
                  <input required placeholder="Họ và tên cậu" className="crayon-input w-full" value={selfName} onChange={e => setSelfName(e.target.value)} />
                  <input required type="tel" placeholder="Số điện thoại" className="crayon-input w-full" value={selfPhone} onChange={e => setSelfPhone(e.target.value)} />
                  <div><input required placeholder="Điểm nhận quà từ tiệm" className="crayon-input w-full" value={selfAddress} onChange={e => setSelfAddress(e.target.value)} /><p className="mt-1 text-xs text-gray-600">Ví dụ: lớp học, điểm hẹn…</p></div>
                  <label className="block"><span className="mb-1 block text-sm font-bold">Thời gian muốn nhận</span><input required type="datetime-local" className="crayon-input w-full" value={selfTime} onChange={e => setSelfTime(e.target.value)} /></label>
                </div>
              )}

              {giftOption === "shop" && (
                <div className="space-y-6">
                  <div className="crayon-border bg-bluey p-6 shadow-sticker space-y-4">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Heart size={20}/> Thông tin người gửi</h3>
                    <p className="text-xs font-medium mb-2">Phòng khi người nhận không liên hệ được thì hoàn lại cho bạn.</p>
                    <div><input placeholder="Họ tên người gửi" className="crayon-input w-full" value={senderName} onChange={e => setSenderName(e.target.value)} /><p className="mt-1 text-xs text-gray-600">Có thể ghi biệt danh hoặc danh xưng đặc biệt.</p></div>
                    <input required type="tel" placeholder="Số điện thoại của bạn" className="crayon-input w-full" value={senderPhone} onChange={e => setSenderPhone(e.target.value)} />
                    <input required placeholder="Địa chỉ của bạn" className="crayon-input w-full" value={senderAddress} onChange={e => setSenderAddress(e.target.value)} />
                  </div>

                  <div className="crayon-border bg-pinky p-6 shadow-sticker space-y-4">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2"><Send size={20}/> Thông tin người nhận</h3>
                    <input required placeholder="Họ tên người nhận" className="crayon-input w-full" value={recipName} onChange={e => setRecipName(e.target.value)} />
                    <div><input required type="text" placeholder="SĐT hoặc link Facebook người nhận" className="crayon-input w-full" value={recipPhone} onChange={e => setRecipPhone(e.target.value)} /><p className="mt-1 text-xs text-gray-600">Nhập số điện thoại hoặc đường dẫn Facebook để tiệm liên hệ người nhận.</p></div>
                    <div><input required placeholder="Địa chỉ người nhận" className="crayon-input w-full" value={recipAddress} onChange={e => setRecipAddress(e.target.value)} /><p className="mt-1 text-xs text-gray-600">Ví dụ: nhà ở, phòng học, thư viện…</p></div>
                    <label className="block"><span className="mb-1 block text-sm font-bold">Thời gian muốn giao</span><input required type="datetime-local" className="crayon-input w-full" value={recipTime} onChange={e => setRecipTime(e.target.value)} /></label>
                    
                    <div>
                       <textarea maxLength={500} placeholder="Lời nhắn gửi kèm thiệp..." className="crayon-input w-full h-24 resize-none" value={recipMessage} onChange={e => setRecipMessage(e.target.value)} />
                       <p className="text-xs text-right mt-1 font-bold">{recipMessage.length}/500</p>
                     </div>
                  </div>
                </div>
              )}

             {error && <p role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-3 text-center font-bold text-red-700">{error}</p>}
             <div className="crayon-border bg-yellows p-6 shadow-sticker">
                 <h3 className="font-bold text-xl mb-2">Tổng kết</h3>
                 <div className="mb-4"><textarea placeholder="Ghi chú thêm cho tiệm" className="crayon-input w-full h-20 resize-none" value={note} onChange={e => setNote(e.target.value)} /><p className="mt-1 text-xs text-gray-600">Không bắt buộc.</p></div>
                 <div className="flex justify-between font-bold text-2xl mb-4"><span>Tổng cộng:</span><span className="text-pink-600">{pricing.total.toLocaleString("vi-VN")}đ</span></div>
                 <label className="flex items-start gap-2 mb-4 cursor-pointer">
                    <input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 w-5 h-5 shrink-0"/>
                    <span className="text-sm font-medium leading-tight">Tớ xác nhận các thông tin trên là chính xác và đồng ý cung cấp để tiệm liên hệ giao quà.</span>
                 </label>
                 <button type="submit" disabled={loading} className="w-full crayon-border bg-white py-4 font-bold text-xl hover:bg-black hover:text-white transition-colors disabled:opacity-50">{loading ? "Đang tạo đơn…" : "Tạo đơn & xem mã QR 💸"}</button>
             </div>
         </form>
      )}

      {step === "payment" && orderResult && (
         <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setStep("shop"); }}><ChevronLeft /> <span className="font-bold">Về cửa tiệm</span></div>
            <div className="crayon-border bg-white p-6 shadow-sticker max-w-sm mx-auto">
               <h3 className="font-bold text-2xl mb-2 text-center">Một bước nữa thui ♡</h3>
               <p className="text-sm text-center mb-4">Mã đơn: <b>{orderResult.id}</b></p>
               <p className="text-center text-3xl font-bold text-pink-600 mb-4">{orderResult.total.toLocaleString("vi-VN")}đ</p>
               {orderResult.qrUrl ? <img src={orderResult.qrUrl} alt="Mã QR chuyển khoản cho đơn hàng" className="w-full aspect-square object-contain border-4 border-dashed border-black rounded-2xl p-2" /> : <div className="rounded-xl border-2 border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">Tiệm chưa cấu hình tài khoản nhận tiền nên chưa tạo được mã QR. Đơn đã được ghi nhận; vui lòng liên hệ tiệm trước khi chuyển khoản.</div>}
               {orderResult.bank && <div className="mt-4 space-y-2 rounded-xl bg-paper p-3 text-sm"><p><b>Ngân hàng:</b> {orderResult.bank.bankId}</p><p><b>Số tài khoản:</b> {orderResult.bank.accountNo}</p><p><b>Chủ tài khoản:</b> {orderResult.bank.accountName}</p><p><b>Nội dung chuyển khoản:</b> TIEM {orderResult.id}</p><button onClick={() => navigator.clipboard?.writeText(`TIEM ${orderResult.id}`)} className="rounded-lg border border-black bg-white px-3 py-2 font-bold">Sao chép nội dung</button></div>}
               {!orderResult.sheetSync && <p className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-amber-800">Đơn đã lưu trong hệ thống; thông tin liên hệ chưa đồng bộ được sang Google Sheets. Tiệm vẫn nhận được đơn trong dashboard.</p>}
               <div className="mt-5 rounded-xl border-2 border-dashed border-black p-4">
                 <h4 className="font-bold text-lg">📸 Gửi ảnh minh chứng chuyển khoản</h4>
                 <p className="mt-1 text-sm">Chụp màn hình giao dịch sau khi chuyển khoản. Chỉ tải ảnh; tiệm vẫn sẽ đối chiếu tiền thực nhận.</p>
                 <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setProofFile(e.target.files?.[0] || null); setProofUploaded(false); setProofError(""); }} className="mt-3 block w-full text-sm" />
                 {proofFile && <p className="mt-2 break-words text-xs text-gray-600">Đã chọn: {proofFile.name} · {(proofFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                 {proofError && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{proofError}</p>}
                 {proofUploaded ? <p className="mt-3 font-bold text-green-700">✓ Ảnh minh chứng đã gửi thành công.</p> : <button type="button" disabled={!proofFile || proofUploading || loading} onClick={() => void handleProofUpload()} className="mt-3 w-full crayon-border bg-yellows py-3 font-bold disabled:opacity-50">{proofUploading ? "Đang tải ảnh…" : "Tải ảnh minh chứng lên"}</button>}
               </div>
               <p className="mt-4 text-sm leading-relaxed">Sau khi chuyển khoản và gửi ảnh, tiệm sẽ kiểm tra giao dịch. Đơn chưa được coi là đã thanh toán cho đến khi tiệm xác minh tiền thực nhận.</p>
               <button disabled={!proofUploaded || proofUploading || loading} onClick={handleFinalSubmit} className="mt-5 w-full crayon-border bg-greeny py-4 font-bold text-lg hover:bg-black hover:text-white transition-colors disabled:opacity-50">{proofUploaded ? "Đã gửi minh chứng, hoàn tất ♡" : "Tải ảnh minh chứng để hoàn tất"}</button>
            </div>
         </div>
      )}

      {step === "success" && (
         <div className="text-center py-20 animate-fade-in">
           <Heart className="mx-auto text-pinky fill-pinky animate-wiggle" size={80} />
           <h2 className="text-4xl font-bold mt-4">Thành công! 🎉</h2>
           <p className="font-medium text-lg mt-2">Tiệm đã ghi nhận đơn của cậu.</p>
           <p className="text-sm font-medium mt-6 bg-bluey p-3 rounded-full border-2 border-black inline-block">
             Mã đơn: <span className="font-bold">{orderResult?.id || "—"}</span><br/>Trạng thái: <span className="font-bold">Chờ tiệm xác nhận thanh toán</span>
           </p>
           <div className="pt-8">
             <button onClick={() => { setStep("shop"); setOrderResult(null); }} className="underline font-bold text-lg">Quay về trang chủ</button>
           </div>
         </div>
      )}
    </main>
  );
}
