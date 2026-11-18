/**
 * 지하철 노선 선: 노선 색, 역 연결 순서(이름 기준), 선 구간 생성.
 * 실제 선로 곡선이 아니라 인접한 역 사이를 이은 직선이다.
 */

/** 서울교통공사 공식 노선 색(1~8호선). 출처: 서울교통공사 노선별 대표 색상 안내. */
export const LINE_COLORS: Readonly<Record<number, string>> = {
  1: '#0052A4', 2: '#00A84D', 3: '#EF7C1C', 4: '#00A5DE',
  5: '#996CAC', 6: '#CD7C2F', 7: '#747F00', 8: '#E6186C',
};
export const LINE_IDS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** 역 번호 순서는 믿을 수 없어(6호선 봉화산·8호선 남위례·1호선 동묘앞 등 밀림) 이름 순서로 적는다. */
export type Route = {label: string; names: readonly string[]; closed?: boolean};
export const LINE_ROUTES: Readonly<Record<number, readonly Route[]>> = {
  1: [{label: '본선', names: ['서울', '시청', '종각', '종로3가', '종로5가', '동대문', '동묘앞', '신설동', '제기동', '청량리']}],
  2: [
    {label: '순환선', closed: true, names: ['시청', '을지로입구', '을지로3가', '을지로4가', '동대문역사문화공원', '신당', '상왕십리', '왕십리', '한양대', '뚝섬', '성수', '건대입구', '구의', '강변', '잠실나루', '잠실', '잠실새내', '종합운동장', '삼성', '선릉', '역삼', '강남', '교대', '서초', '방배', '사당', '낙성대', '서울대입구', '봉천', '신림', '신대방', '구로디지털단지', '대림', '신도림', '문래', '영등포구청', '당산', '합정', '홍대입구', '신촌', '이대', '아현', '충정로']},
    {label: '성수지선', names: ['성수', '용답', '신답', '용두', '신설동']},
    {label: '신정지선', names: ['신도림', '도림천', '양천구청', '신정네거리', '까치산']},
  ],
  3: [{label: '본선', names: ['지축', '구파발', '연신내', '불광', '녹번', '홍제', '무악재', '독립문', '경복궁', '안국', '종로3가', '을지로3가', '충무로', '동대입구', '약수', '금호', '옥수', '압구정', '신사', '잠원', '고속터미널', '교대', '남부터미널', '양재', '매봉', '도곡', '대치', '학여울', '대청', '일원', '수서', '가락시장', '경찰병원', '오금']}],
  4: [{label: '본선', names: ['당고개', '상계', '노원', '창동', '쌍문', '수유', '미아', '미아사거리', '길음', '성신여대입구', '한성대입구', '혜화', '동대문', '동대문역사문화공원', '충무로', '명동', '회현', '서울', '숙대입구', '삼각지', '신용산', '이촌', '동작', '총신대입구', '사당', '남태령']}],
  5: [
    {label: '본선(방화~강동)', names: ['방화', '개화산', '김포공항', '송정', '마곡', '발산', '우장산', '화곡', '까치산', '신정', '목동', '오목교', '양평', '영등포구청', '영등포시장', '신길', '여의도', '여의나루', '마포', '공덕', '애오개', '충정로', '서대문', '광화문', '종로3가', '을지로4가', '동대문역사문화공원', '청구', '신금호', '행당', '왕십리', '마장', '답십리', '장한평', '군자', '아차산', '광나루', '천호', '강동']},
    {label: '마천 갈래', names: ['강동', '둔촌동', '올림픽공원', '방이', '오금', '개롱', '거여', '마천']},
    {label: '하남 갈래', names: ['강동', '길동', '굽은다리', '명일', '고덕', '상일동', '강일', '미사', '하남풍산', '하남시청', '하남검단산']},
  ],
  6: [
    {label: '응암 순환', closed: true, names: ['응암', '역촌', '불광', '독바위', '연신내', '구산']},
    {label: '본선(응암~신내)', names: ['응암', '새절', '증산', '디지털미디어시티', '월드컵경기장', '마포구청', '망원', '합정', '상수', '광흥창', '대흥', '공덕', '효창공원앞', '삼각지', '녹사평', '이태원', '한강진', '버티고개', '약수', '청구', '신당', '동묘앞', '창신', '보문', '안암', '고려대', '월곡', '상월곡', '돌곶이', '석계', '태릉입구', '화랑대', '봉화산', '신내']},
  ],
  7: [{label: '본선', names: ['장암', '도봉산', '수락산', '마들', '노원', '중계', '하계', '공릉', '태릉입구', '먹골', '중화', '상봉', '면목', '사가정', '용마산', '중곡', '군자', '어린이대공원', '건대입구', '뚝섬유원지', '청담', '강남구청', '학동', '논현', '반포', '고속터미널', '내방', '총신대입구', '남성', '숭실대입구', '상도', '장승배기', '신대방삼거리', '보라매', '신풍', '대림', '남구로', '가산디지털단지', '철산', '광명사거리', '천왕', '온수']}],
  8: [{label: '본선', names: ['암사', '천호', '강동구청', '몽촌토성', '잠실', '석촌', '송파', '가락시장', '문정', '장지', '복정', '남위례', '산성', '남한산성입구', '단대오거리', '신흥', '수진', '모란']}],
};

/** 인접한 두 역 사이가 이 거리(km)보다 멀면 직선으로 잇지 않는다(잘못된 연결 방지). */
export const MAX_SEGMENT_KM = 4.5;

type Pt = {id: string; line: number; name: string; lat: number; lng: number};
export type Polyline = {line: number; route: string; ids: string[]};
export type Anomaly = {line: number; route: string; from: string; to: string; km: number};
export type LineBuild = {polylines: Polyline[]; anomalies: Anomaly[]; missing: {line: number; route: string; name: string}[]; unused: string[]; maxKm: number; segments: number};

export function distanceKm(a: {lat: number; lng: number}, b: {lat: number; lng: number}): number {
  const rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** 역 마스터와 노선 순서로 선 구간을 만든다. 이름이 없거나 너무 먼 구간은 잇지 않고 보고 목록에 담는다. */
export function buildLineSegments(stations: readonly Pt[], routes: Readonly<Record<number, readonly Route[]>> = LINE_ROUTES, maxKm = MAX_SEGMENT_KM): LineBuild {
  const byLineName = new Map<string, Pt>();
  for (const s of stations) byLineName.set(`${s.line}|${s.name}`, s);
  const out: LineBuild = {polylines: [], anomalies: [], missing: [], unused: [], maxKm: 0, segments: 0};
  const used = new Set<string>();
  for (const [lineKey, list] of Object.entries(routes)) {
    const line = Number(lineKey);
    for (const route of list) {
      const pts: (Pt | null)[] = route.names.map(name => {
        const s = byLineName.get(`${line}|${name}`);
        if (!s) { out.missing.push({line, route: route.label, name}); return null; }
        used.add(s.id); return s;
      });
      if (route.closed) pts.push(pts[0]);
      let cur: string[] = [];
      const flush = () => { if (cur.length > 1) out.polylines.push({line, route: route.label, ids: cur}); cur = []; };
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = i > 0 ? pts[i - 1] : null;
        if (!p) { flush(); continue; }
        if (!q) { cur = [p.id]; continue; }
        const km = distanceKm(q, p);
        if (km > maxKm) { out.anomalies.push({line, route: route.label, from: q.name, to: p.name, km: Math.round(km * 10) / 10}); flush(); cur = [p.id]; continue; }
        out.maxKm = Math.max(out.maxKm, km); out.segments++;
        if (!cur.length) cur = [q.id];
        cur.push(p.id);
      }
      flush();
    }
  }
  out.unused = stations.filter(s => !used.has(s.id)).map(s => `${s.line}호선 ${s.name}`);
  return out;
}
