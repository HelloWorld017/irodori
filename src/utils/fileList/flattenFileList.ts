export const flattenFileList = (fileList: FileList | null) =>
  Array.from({ length: fileList?.length ?? 0 }, (_, index) => fileList?.item(index)).filter(
    (file): file is File => file !== null
  );
