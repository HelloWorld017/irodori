import {
  BookPlus,
  Calendar,
  ChevronLeft,
  Pencil,
  Plus,
  Search,
  SquarePlus,
  Trash,
  X,
} from 'lucide-react';
import type { ComponentProps, ComponentType } from 'react';

const wrapLucideComponent = <T extends ComponentType>(LucideIcon: T) => {
  const IconComponent = (props: ComponentProps<T>) => {
    const Icon = LucideIcon as ComponentType<{ width: string; height: string }>;
    return <Icon width="1em" height="1em" stroke="currentColor" {...props} />;
  };

  IconComponent.displayName = LucideIcon.displayName && `Icon${LucideIcon.displayName}`;

  return IconComponent;
};

export const IconBookPlus = wrapLucideComponent(BookPlus);
export const IconCalendar = wrapLucideComponent(Calendar);
export const IconChevronLeft = wrapLucideComponent(ChevronLeft);
export const IconPencil = wrapLucideComponent(Pencil);
export const IconPlus = wrapLucideComponent(Plus);
export const IconSearch = wrapLucideComponent(Search);
export const IconSquarePlus = wrapLucideComponent(SquarePlus);
export const IconTrash = wrapLucideComponent(Trash);
export const IconX = wrapLucideComponent(X);
