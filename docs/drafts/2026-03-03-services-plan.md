## 서비스

### EntriesService

- `listByNotebookId(notebookId)`: 엔트리 목록용 데이터를 조회한다 (본문 제외, 태그/스티커 포함).
- `getById(entryId)`: 엔트리 상세 데이터를 조회한다 (본문 포함, 편집 화면용).
- `create(input)`: 엔트리를 생성하고 sync 문서를 stage 한다.
- `update(input)`: 엔트리 제목/본문/커버를 수정하고 sync 문서를 stage 한다.
- `remove(input)`: 엔트리를 삭제(soft delete)하고 sync 문서를 stage 한다.

### EntryMetadataService

- `getByEntryId(entryId)`: 단일 엔트리의 태그/스티커 메타데이터를 조회한다.
- `replaceTags(entryId, tagIds)`: 엔트리의 태그 집합을 교체한다.
- `setSticker(entryId, slot, stickerId)`: 엔트리 스티커 슬롯에 값을 설정한다.
- `clearSticker(entryId, slot)`: 엔트리 스티커 슬롯을 비운다.

### TagCategoriesService

- `listByNotebookId(notebookId)`: 현재 선택된 Notebook의 TagCategory 전체를 조회한다.
- `create(input)`: TagCategory를 생성하고 sync 문서를 stage 한다.
- `update(input)`: TagCategory를 수정하고 sync 문서를 stage 한다.
- `remove(input)`: TagCategory를 삭제하고 sync 문서를 stage 한다.

### TagsService

- `listByCategoryId(categoryId)`: 현재 선택된 TagCategory의 Tag 전체를 조회한다.
- `create(input)`: Tag를 생성하고 sync 문서를 stage 한다.
- `update(input)`: Tag를 수정하고 sync 문서를 stage 한다.
- `remove(input)`: Tag를 삭제하고 sync 문서를 stage 한다.

### StickersService

- `list()`: 스티커 전체를 조회한다.
- `create(input)`: 스티커를 생성하고 sync 문서를 stage 한다.
- `update(input)`: 스티커를 수정하고 sync 문서를 stage 한다.
- `remove(input)`: 스티커를 삭제하고 sync 문서를 stage 한다.

## 레포지토리

### EntriesRepository

- `listEntrySummariesByNotebookId(notebookId)`: 엔트리 목록용 요약 데이터(본문 제외)를 조회한다.

### EntryTagsRepository

- `listEntryTagsByEntryIds(entryIds)`: 여러 엔트리의 태그 연결을 `IN` 쿼리로 일괄 조회한다.

### EntryStickersRepository

- `listEntryStickersByEntryIds(entryIds)`: 여러 엔트리의 스티커 연결을 `IN` 쿼리로 일괄 조회한다.

### TagsRepository

- `listTagsByIds(tagIds)`: Tag id 목록으로 `IN` 쿼리 일괄 조회한다.

### StickersRepository

- `listStickersByIds(stickerIds)`: 스티커 id 목록으로 `IN` 쿼리 일괄 조회한다.

## 유저플로우

### Notebook 선택 후 Entries 탭 진입

- `EntriesService.listByNotebookId`: 본문 없이 엔트리 목록을 빠르게 렌더링하고 태그/스티커를 함께 표시하기 위함.
- `TagCategoriesService.listByNotebookId`: 현재 Notebook의 메타데이터 필터(카테고리)를 즉시 구성하기 위함.

### Entries 목록 렌더링

- `EntriesService.listByNotebookId`: 엔트리 요약을 조회하고 내부적으로 태그/스티커를 batch 조회해 카드 단위 뷰 모델을 만들기 위함.

### Entry 상세 열기

- `EntriesService.getById`: 본문 포함 상세 데이터를 로드해 에디터를 초기화하기 위함.
- `EntryMetadataService.getByEntryId`: 상세 화면의 태그/스티커 패널 상태를 동기화하기 위함.

### TagCategory 관리

- `TagCategoriesService.create`: 현재 Notebook에 새 카테고리를 추가하기 위함.
- `TagCategoriesService.update`: 카테고리 라벨/정렬/속성을 수정하기 위함.
- `TagCategoriesService.remove`: 더 이상 사용하지 않는 카테고리를 제거하기 위함.

### TagCategory 선택 후 Tag 목록 표시

- `TagsService.listByCategoryId`: 현재 선택된 TagCategory의 Tag만 필터링해 보여주기 위함.

### Tag 관리

- `TagsService.create`: 선택 카테고리에 새 Tag를 추가하기 위함.
- `TagsService.update`: Tag 라벨/색상/정렬/아카이브 상태를 수정하기 위함.
- `TagsService.remove`: Tag를 삭제하기 위함.

### Sticker 관리

- `StickersService.list`: 선택 가능한 스티커 목록을 렌더링하기 위함.
- `StickersService.create`: 새 스티커(emoji/custom)를 추가하기 위함.
- `StickersService.update`: 스티커 속성을 수정하기 위함.
- `StickersService.remove`: 스티커를 삭제하기 위함.

### Entry 태그/스티커 편집

- `EntryMetadataService.replaceTags`: 엔트리의 태그 선택 상태를 저장하기 위함.
- `EntryMetadataService.setSticker`: 엔트리의 특정 슬롯에 스티커를 배치하기 위함.
- `EntryMetadataService.clearSticker`: 엔트리의 특정 슬롯 스티커를 제거하기 위함.

### Entry 작성/수정/삭제

- `EntriesService.create`: 새 엔트리를 만들고 목록/상세로 이어지게 하기 위함.
- `EntriesService.update`: 본문과 메타 변경을 저장하기 위함.
- `EntriesService.remove`: 엔트리를 목록에서 제거하고 sync 삭제 상태를 반영하기 위함.
