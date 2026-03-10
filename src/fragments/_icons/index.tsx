import {
  BookPlus,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Delete,
  Pencil,
  Plus,
  Search,
  SquarePlus,
  Trash,
  X,
} from 'lucide-react';
import { DynamicIcon as LucideDynamicIcon } from 'lucide-react/dynamic';
import type { ComponentProps, ComponentType, ReactNode } from 'react';

const wrapLucideComponent = <TProps,>(LucideIcon: ComponentType<TProps>) => {
  const IconComponent = (props: TProps) => {
    const Icon = LucideIcon as ComponentType<{ width: string; height: string }>;
    return <Icon width="1em" height="1em" stroke="currentColor" {...props} />;
  };

  IconComponent.displayName = LucideIcon.displayName && `Icon${LucideIcon.displayName}`;

  return IconComponent;
};

export const IconBookPlus = wrapLucideComponent(BookPlus);
export const IconCalendar = wrapLucideComponent(Calendar);
export const IconChevronDown = wrapLucideComponent(ChevronDown);
export const IconChevronLeft = wrapLucideComponent(ChevronLeft);
export const IconDelete = wrapLucideComponent(Delete);
export const IconPencil = wrapLucideComponent(Pencil);
export const IconPlus = wrapLucideComponent(Plus);
export const IconSearch = wrapLucideComponent(Search);
export const IconSquarePlus = wrapLucideComponent(SquarePlus);
export const IconTrash = wrapLucideComponent(Trash);
export const IconX = wrapLucideComponent(X);

type DynamicIconType = (
  props: Omit<ComponentProps<typeof LucideDynamicIcon>, 'name'> & { name: string }
) => ReactNode;

export const DynamicIcon = wrapLucideComponent(LucideDynamicIcon) as DynamicIconType;
