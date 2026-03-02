import { BookPlus, Pencil, Trash, X } from 'lucide-react';
import type { ComponentProps, ComponentType } from 'react';

const wrapLucideComponent = <T extends ComponentType>(LucideIcon: T) => {
  const IconComponent = (props: ComponentProps<T>) => {
    const Icon = LucideIcon as ComponentType<{ width: string; height: string }>;
    return <Icon width="1em" height="1em" {...props} />;
  };

  IconComponent.displayName = LucideIcon.displayName && `Icon${LucideIcon.displayName}`;

  return IconComponent;
};

export const IconBookPlus = wrapLucideComponent(BookPlus);
export const IconTrash = wrapLucideComponent(Trash);
export const IconPencil = wrapLucideComponent(Pencil);
export const IconX = wrapLucideComponent(X);
