
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListChecks, Users, BarChart3, LogOut, Settings, Package, X as XIcon, Wrench, Tag, MessageSquare, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/appointments', label: 'Appointments', icon: ListChecks },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/enquiries', label: 'Enquiries', icon: MessageSquare },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

interface AdminSidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function AdminSidebar({ isMobileOpen, setMobileOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleLinkClick = () => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
  };

  return (
    <aside 
      className={cn(
        "bg-card border-r flex flex-col space-y-4 transition-transform duration-300 ease-in-out",
        "md:w-64 md:relative md:translate-x-0 md:sticky md:top-0 md:h-screen", 
        "fixed inset-y-0 left-0 z-50 w-64 p-4 h-screen", 
        isMobileOpen ? "translate-x-0" : "-translate-x-full" 
      )}
    >
      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-2xl font-bold text-primary">Classic Solution</div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        >
          <XIcon className="h-6 w-6" />
        </Button>
      </div>
      <nav className="flex-grow space-y-1 overflow-y-auto">
        {adminNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={handleLinkClick}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div>
        <Button variant="outline" className="w-full justify-start" onClick={() => { logout(); handleLinkClick();}}>
          <LogOut className="mr-2 h-5 w-5" /> Logout
        </Button>
      </div>
    </aside>
  );
}
