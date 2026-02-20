import { Sidebar } from '@/components/sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-950 p-6">{children}</main>
    </div>
  );
}
