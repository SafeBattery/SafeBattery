// PEMFC 한 객체의 데이터 구조 정의
export interface PemfcInstance {
  modelName: string;
  state: 'NORMAL' | 'WARNING' | 'DANGER';
  manufacturedDate: string;
  clientName: string;
  lat: number;
  lng: number;
}