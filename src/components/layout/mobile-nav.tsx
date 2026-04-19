'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface MobileNavProps {
  title: string;
  links: ReactNode;
  userMenu: ReactNode;
}

export function MobileNav({ title, links, userMenu }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer when the route changes — otherwise the overlay stays
  // painted on top of the new page after a link click. Reset-on-prop-change
  // pattern from https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2 px-4">{links}</nav>
        <div className="mt-6 border-t px-4 pt-4">{userMenu}</div>
      </SheetContent>
    </Sheet>
  );
}
