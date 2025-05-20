// PEMFC 한 객체의 데이터 구조 정의
export interface PemfcInstance {
  id: number;
  clientId: number;
  modelName: string;
  manufacturedDate: string; 
  lat: number;
  lng: number;
  powerState: 'NORMAL' | 'WARNING' | 'DANGER';
  voltageState: 'NORMAL' | 'WARNING' | 'DANGER';
  temperatureState: 'NORMAL' | 'WARNING' | 'DANGER';
  state: 'NORMAL' | 'WARNING' | 'DANGER';
}