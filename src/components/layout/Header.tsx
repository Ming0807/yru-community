'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Search,
  Menu,
  X,
  PenSquare,
  User,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { APP_NAME, CATEGORIES } from '@/lib/constants';
import type { Profile } from '@/types';
import SearchBar from '@/components/search/SearchBar';
import { ThemeToggle } from '@/components/ThemeToggle';

import { useUser } from '@/components/UserProvider';

export default function Header() {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0"
        >
          <Image 
            src="/logo-horizontal.png" 
            alt="YRU Community Logo" 
            width={40} 
            height={40} 
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-sm dark:shadow-none transition-all dark:brightness-110"
            priority
          />
          <span className="hidden font-bold text-lg sm:block bg-clip-text text-transparent bg-linear-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)]">
            {APP_NAME}
          </span>
        </Link>

        {/* Search - Desktop */}
        <div className="hidden flex-1 max-w-md mx-8 md:block">
          <SearchBar />
        </div>

    
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Search - Mobile */}
          <Link href="/search" className="md:hidden">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          {/* Create Post - Desktop */}
          {user && (
            <Link href="/post/create" className="hidden sm:block">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] hover:opacity-90 text-white shadow-md gap-1.5"
              >
                <PenSquare className="h-4 w-4" />
                ตั้งกระทู้
              </Button>
            </Link>
          )}

          {/* User Menu */}
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-border">
                    <AvatarImage
                      src={user.avatar_url ?? undefined}
                      alt={user.display_name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)] text-sm font-semibold">
                      {user.display_name?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{user.display_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    โปรไฟล์
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  ออกจากระบบ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบ
              </Button>
            </Link>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-12">
              <nav className="flex flex-col gap-1">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted ${
                      pathname === `/category/${cat.slug}`
                        ? 'bg-muted font-medium'
                        : ''
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
