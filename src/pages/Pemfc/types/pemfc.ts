// PEMFC 한 객체의 데이터 구조 정의
export interface PemfcInstance {
  id: number;
  clientId: number;
  modelName: string;
  manufacturedDate: string; 
  lat: number;
  lng: number;
  powerState: 'NORMAL' | 'WARNING' | 'ERROR';
  voltageState: 'NORMAL' | 'WARNING' | 'ERROR';
  temperatureState: 'NORMAL' | 'WARNING' | 'ERROR';
  state: 'NORMAL' | 'WARNING' | 'ERROR';
}