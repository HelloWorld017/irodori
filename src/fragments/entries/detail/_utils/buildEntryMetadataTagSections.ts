import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';

export type EntryMetadataTagCategorySection = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  tags: TagViewItem[];
};

export type EntryMetadataTagSections = {
  missingTags: TagViewItem[];
  categories: EntryMetadataTagCategorySection[];
};

export const buildEntryMetadataTagSections = ({
  categories,
  tags,
}: {
  categories: TagCategory[];
  tags: TagViewItem[];
}): EntryMetadataTagSections => {
  const categoryIds = new Set(categories.map(category => category.id));
  const tagsByCategoryId = new Map<string, TagViewItem[]>();

  tags.forEach(tag => {
    const currentTags = tagsByCategoryId.get(tag.categoryId) ?? [];

    currentTags.push(tag);
    tagsByCategoryId.set(tag.categoryId, currentTags);
  });

  return {
    missingTags: tags.filter(tag => !categoryIds.has(tag.categoryId)),
    categories: categories.map(category => ({
      id: category.id,
      label: category.label,
      icon: category.icon,
      color: category.color,
      minSelect: category.minSelect,
      maxSelect: category.maxSelect,
      required: category.required,
      tags: tagsByCategoryId.get(category.id) ?? [],
    })),
  };
};
