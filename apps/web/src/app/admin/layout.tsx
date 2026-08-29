import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-bold text-white">
              Kablet <span className="text-violet-400 text-xs font-medium ml-1">ADMIN</span>
            </span>
            <Link href="/admin" className="text-sm text-gray-400 hover:text-white">
  Overview
</Link>
<Link href="/admin/fulfillments" className="text-sm text-gray-400 hover:text-white">
  Fulfillments
</Link>
<Link href="/admin/merchants" className="text-sm text-gray-400 hover:text-white">
  Merchants
</Link>
<Link href="/admin/opportunities" className="text-sm text-gray-400 hover:text-white">
  Opportunities
</Link>
<Link href="/admin/site-check" className="text-sm text-gray-400 hover:text-white">
  Site Checker
</Link>
<Link href="/admin/payouts" className="text-sm text-gray-400 hover:text-white">
  Payouts
</Link>
          </div>
          <span className="text-xs text-gray-500">Internal only</span>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}