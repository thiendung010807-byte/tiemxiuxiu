import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "tiệm xíu xiu ♡", description: "Đội SVTN Đồng hương Bắc Ninh - NEU" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-hand min-h-screen selection:bg-pinky selection:text-black relative flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mt-20 border-t-4 border-black bg-white p-6 md:p-10 relative overflow-hidden">
             <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 justify-between relative z-10">
                <div className="flex-1">
                   <h3 className="text-xl font-bold mb-4 text-pink-600">Đội Sinh viên Tình nguyện Đồng hương Bắc Ninh - NEU</h3>
                   <p className="font-medium text-sm mb-2">Tiệm Xíu Xiu ♡ - Trao gửi yêu thương mùa 20/10</p>
                   <p className="text-xs text-gray-600">Mọi lợi nhuận từ tiệm sẽ được đóng góp vào quỹ hoạt động thiện nguyện của Đội.</p>
                   <a href="/privacy" className="mt-3 inline-block text-xs underline">Chính sách dữ liệu cá nhân</a>
                </div>
                <div className="flex-1 space-y-2 text-sm font-bold">
                   <p className="flex items-center gap-2">📞 Hotline: <a href="tel:0983272798" className="text-blue-600">0983.272.798 (Mr. Phạm Tuấn Minh)</a></p>
                   <p className="flex items-center gap-2">🌐 Fanpage: <a href="https://www.facebook.com/doisinhvientinhnguyendonghuongbacninh" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Đội Sinh viên Tình nguyện Đồng hương Bắc Ninh - NEU</a></p>
                   <p className="flex items-center gap-2">🎵 Tiktok: <a href="https://www.tiktok.com/@bnc_neu" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@bnc_neu</a></p>
                   <p className="flex items-center gap-2">✉️ Email: doisinhvientinhnguyendonghuongbacninh@gmail.com</p>
                </div>
             </div>
        </footer>
      </body>
    </html>
  );
}
