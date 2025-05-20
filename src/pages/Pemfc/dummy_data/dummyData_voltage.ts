export interface Pemfc {
  id: number;
  clientId: number;
  powerState: string;
  voltageState: string;
  temperatureState: string;
  lat: number;
  lng: number;
  modelName: string;
  manufacturedDate: string;
}

export interface RankItem {
  pemfc: Pemfc;
  totalCount: number;
  errorCount: number;
  errorRate: number;
}

export const dummyData_voltage: RankItem[] = [ 
  {
    pemfc: {
      id: 3,
      clientId: 1,
      powerState: "NORMAL",
      voltageState: "NORMAL",
      temperatureState: "NORMAL",
      lat: 34.0,
      lng: 127.0,
      modelName: "testPemfc-001",
      manufacturedDate: "2025-03-03"
    },
    totalCount: 50,
    errorCount: 20,
    errorRate: 0.40
  },
  {
    pemfc: {
      id: 1,
      clientId: 1,
      powerState: "NORMAL",
      voltageState: "NORMAL",
      temperatureState: "NORMAL",
      lat: 34.0,
      lng: 127.0,
      modelName: "testPemfc-001",
      manufacturedDate: "2025-01-01"
    },
    totalCount: 50,
    errorCount: 32,
    errorRate: 0.64
  },
  {
    pemfc: {
      id: 2,
      clientId: 1,
      powerState: "NORMAL",
      voltageState: "NORMAL",
      temperatureState: "NORMAL",
      lat: 34.0,
      lng: 127.0,
      modelName: "testPemfc-001",
      manufacturedDate: "2025-02-02"
    },
    totalCount: 50,
    errorCount: 10,
    errorRate: 0.20
  }
];