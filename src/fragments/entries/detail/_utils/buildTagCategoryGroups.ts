import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';

export type TagCategoryGroup = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
  tags: TagViewItem[];
  isMissing: boolean;
};

const MISSING_TAG_CATEGORY_LABEL = '삭제된 카테고리';

export const buildTagCategoryGroups = ({
  categories,
  tags,
}: {
  categories: TagCategory[];
  tags: TagViewItem[];
}): TagCategoryGroup[] => {
  const tagsByCategoryId = new Map<string, TagViewItem[]>();

  tags.forEach(tag => {
    const currentTags = tagsByCategoryId.get(tag.categoryId) ?? [];

    currentTags.push(tag);
    tagsByCategoryId.set(tag.categoryId, currentTags);
  });

  const groups: TagCategoryGroup[] = categories.map(category => ({
    id: category.id,
    label: category.label,
    icon: category.icon,
    color: category.color,
    minSelect: category.minSelect,
    maxSelect: category.maxSelect,
    required: category.required,
    tags: tagsByCategoryId.get(category.id) ?? [],
    isMissing: false,
  }));

  const categoryIds = new Set(categories.map(category => category.id));

  tagsByCategoryId.forEach((categoryTags, categoryId) => {
    if (categoryIds.has(categoryId)) {
      return;
    }

    groups.push({
      id: categoryId,
      label: MISSING_TAG_CATEGORY_LABEL,
      icon: null,
      color: null,
      minSelect: 0,
      maxSelect: null,
      required: false,
      tags: categoryTags,
      isMissing: true,
    });
  });

  return groups;
};
