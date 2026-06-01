# 송파구 필지 데이터 뷰어

송파구 연속지적도, 토지 정보, 건축물대장 데이터를 활용한 지도 기반 필지 데이터 뷰어입니다.

## 주요 기능

- 전체 화면 지도
- VWorld WMTS 배경지도, API 키가 없으면 OpenStreetMap 대체 표시
- 송파구 필지 경계 표시
- 건축물 주용도별 필지 색상 구분
- 주용도별 필터와 투명도 조절
- 필지 클릭 시 팝업 및 우측 상세 패널 표시
- 송파구 전체 필지 수, 면적, 건물 수, 주용도별 통계 표시

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:5173
```

## 환경 변수

`.env.example`을 참고하여 `.env` 파일을 만들고 VWorld API 키를 설정할 수 있습니다.

```text
VITE_VWORLD_API_KEY=YOUR_VWORLD_API_KEY
```

API 키가 없으면 OpenStreetMap 배경지도를 사용합니다.

## 데이터 전처리

현재 프로젝트의 원본 데이터로 GeoJSON을 다시 생성하려면 아래 명령을 실행합니다.

```bash
npm run preprocess
```

생성되는 파일:

- `public/data/parcels.geojson`
- `public/data/boundaries.geojson`

## GitHub Pages 배포

`main` 브랜치에 push하면 GitHub Actions가 `npm run build`를 실행하고 `dist`를 GitHub Pages에 배포합니다.

VWorld API 키를 배포 환경에서도 사용하려면 GitHub 저장소의 Actions Secret에 아래 이름으로 등록합니다.

```text
VITE_VWORLD_API_KEY
```
