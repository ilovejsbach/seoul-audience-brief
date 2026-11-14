import type {DataMeaningProps} from './DataMeaning';
export const dataMeaningContent:Record<string,DataMeaningProps>={
 population:{term:'생활인구',definition:'선택한 날짜와 시간에 지역에 머문 내국인 인구의 추정치입니다.',interpretation:'같은 날짜·시간·성별·연령 조건으로 지역 간 머무름의 차이를 비교하세요.',caution:'길을 지난 사람 수, 광고 도달 인원, 하루 고유 방문자 수가 아닙니다. 비공개값이 포함된 타깃 합계는 자료 없음으로 표시합니다.',source:'서울 열린데이터광장 · 내국인 행정동별 서울 생활인구'},
 mobility:{term:'생활이동',definition:'원본 자료일자에 포함된 이동 기록을 출발 또는 도착 시간대로 묶은 추정 이동 건수입니다.',interpretation:'유입은 다른 지역에서 들어오는 이동, 유출은 다른 지역으로 나가는 이동입니다. 이 화면은 같은 구 안의 이동을 제외합니다.',caution:'반복 이동을 포함하므로 고유 인원수가 아닙니다. 원본 기준일자는 개별 이동의 달력상 도착일을 보장하지 않습니다.',source:'서울 열린데이터광장 · 수도권 생활이동 OA-22300'},
 migrationannual:{term:'거주지 이동',definition:'주민등록 거주지를 옮긴 전입·전출의 연간 통계입니다. 순이동은 전입에서 전출을 뺀 값입니다.',interpretation:'구 또는 동 중 한 공간 단위를 골라 연간 주거 인구의 이동 방향을 비교하세요.',caution:'일상 방문이나 출퇴근과 다릅니다. 구 총계와 동 수치를 함께 더하지 않으며, 결측값과 공식 제공처 차이를 유지합니다.',source:'서울 통계 대시보드·서울 데이터 허브'},
 commercequarter:{term:'분기 추정매출',definition:'상권 또는 행정동의 제공 업종별 매출 추정치를 원본 분기 코드에 따라 표시합니다.',interpretation:'같은 공간 단위·업종·분기의 매출 규모를 비교하세요. 실제 개별 점포의 회계 매출과는 다릅니다.',caution:'모든 소비를 포함하는 총액이 아닙니다. 서로 겹치는 상권을 더하거나 다른 시기의 생활인구로 나눠 전환율을 만들지 마세요.',source:'서울시 상권분석서비스 · 추정매출'},
 marginal:{term:'세부 기준',definition:'성별·연령·요일·시간대 자료는 각각 따로 집계된 주변분포입니다.',interpretation:'한 가지 기준을 골라 같은 조건끼리 비교하세요. 예를 들어 시간대별 매출은 그 시간대 전체의 값입니다.',caution:'성별 비율과 연령 비율을 곱해 여성 20대 매출처럼 교차 집단의 수치를 만들 수 없습니다.',source:'서울시 상권분석서비스 원본 필드'},
 marketPopulation:{term:'상권 유동인구',definition:'상권별로 제공되는 분기 유동인구 지표입니다. 단위는 명이며 원본 추정치를 유지합니다.',interpretation:'같은 분기와 같은 세부 기준에서 상권의 상대적 규모와 변화를 보세요.',caution:'분기 중 고유 방문자 수나 하루 순방문자 수로 해석하지 마세요. 생활인구·이동건수와 정의가 다릅니다.',source:'서울시 상권분석서비스 · 길단위인구-상권'},
 axis:{term:'세로축 범위',definition:'0 포함은 규모 비교, 자동 맞춤은 관측 범위의 변화를 확대하는 설정입니다. 직접 지정은 입력한 최솟값·최댓값으로 축을 고정합니다. 기준 100 보기의 기본 축은 100을 중심으로 최대 편차에 여유 20%를 더하며, 여유 10·20·30%를 고를 수 있습니다. 변화가 없으면 최소 ±1포인트를 확보합니다.',interpretation:'0이 빠진 축에서는 작은 변화도 크게 보일 수 있으므로 눈금과 실제 값을 함께 확인하세요.',caution:'직접 지정한 범위 밖 값은 화면에서 잘릴 수 있습니다. 축을 바꿔도 원래 데이터 값은 변하지 않습니다.'},
 distributionSnapshot:{term:'두 시점 분포',definition:'같은 날짜·타깃 조건의 두 시간대 생활인구를 나란히 표시합니다.',interpretation:'두 지도는 공통 색상 눈금을 사용하므로 같은 색은 같은 값 구간입니다.',caution:'두 시점의 값을 합쳐 하루 인원으로 계산하지 마세요. 특정 사람이 어느 지역으로 이동했는지는 이 지도만으로 알 수 없습니다.'},
 delta:{term:'분포 증감',definition:'각 지역의 비교 시점 생활인구에서 기준 시점 생활인구를 뺀 값입니다.',interpretation:'양수는 머무는 인구 증가, 음수는 감소입니다. 증가·감소에 대칭 색상 눈금을 적용합니다.',caution:'이동 경로나 순유입을 직접 뜻하지 않습니다. 어느 시점이든 비공개·결측이면 증감을 계산하지 않습니다.'},
 odshare:{term:'이동 비중',definition:'선택한 방향의 전체 이동량을 분모로 삼아 각 출발지 또는 도착지의 비중을 계산합니다.',interpretation:'유입과 유출의 방향, 화면에 표시된 분모와 외부 지역 포함 여부를 함께 확인하세요.',caution:'서울 외 지역은 하나로 묶여 있을 수 있습니다. 표시된 일부 상위 지역의 비중 합계가 전체 100%일 필요는 없습니다.'},
 quarterChange:{term:'직전 분기 변화',definition:'선택 분기의 값에서 직전 분기의 같은 조건 값을 뺀 변화입니다.',interpretation:'지역·업종·세부 기준을 유지하고 변화 방향과 실제 규모를 함께 보세요.',caution:'광고나 특정 사업이 변화를 일으켰다는 인과관계를 뜻하지 않습니다. 어느 분기가 결측이면 차이를 계산하지 않습니다.'},
 indexPositive:{term:'기준 시점 지수',definition:'양수인 기준 시점의 값을 100으로 두고, 각 시점 값을 기준 값으로 나눠 나타냅니다.',interpretation:'120은 기준보다 20% 크고 80은 20% 작다는 뜻입니다.',caution:'기준 값이 0·음수·결측이면 지수를 계산하지 않습니다. 서로 다른 기준 시점의 지수는 같은 규모를 뜻하지 않습니다.'}
};
export const DATA_MEANINGS=dataMeaningContent;
export default dataMeaningContent;
/** Shared UI keys; legacy descriptive keys remain available for direct consumers. */
export const meaningContent:Record<string,DataMeaningProps>={...dataMeaningContent,migration:dataMeaningContent.migrationannual,commerce:dataMeaningContent.commercequarter,distributionDelta:dataMeaningContent.delta,odShare:dataMeaningContent.odshare};
