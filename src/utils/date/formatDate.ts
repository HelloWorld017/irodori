export const formatDate = (dateValue: number | string | Date) => {
  const date = new Date(dateValue);
  const pad2 = (value: number) => value.toString().padStart(2, '0');

  return `${date.getFullYear()}. ${pad2(date.getMonth() + 1)}. ${pad2(date.getDate())}`;
};

export const formatDateShort = (dateValue: number | string | Date) => {
  const date = new Date(dateValue);
  const pad2 = (value: number) => value.toString().padStart(2, '0');

  return `${pad2(date.getMonth() + 1)}. ${pad2(date.getDate())}`;
};
