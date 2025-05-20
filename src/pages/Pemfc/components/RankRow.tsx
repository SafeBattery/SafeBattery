import { useEffect, useState } from "react";
import axios from "axios";
import styles from "../Pemfc.module.css";
import {
  dummyData_power,
  dummyData_voltage,
  dummyData_temperature,
} from "../dummy_data";

type RankDataItem = {
  pemfc: {
    id: number;
    modelName: string;
    powerState: string;
    manufacturedDate: string;
  };
  errorRate: number;
};

const RankRow = ({ selectedGroup }: { selectedGroup: string }) => {
  const [rankData, setRankData] = useState<RankDataItem[]>([]);

  const getDummy = (group: string): RankDataItem[] => {
    switch (group) {
      case "pw":
        return dummyData_power;
      case "u_totV":
        return dummyData_voltage;
      case "t_3":
        return dummyData_temperature;
      default:
        return dummyData_power;
    }
  };

  const getEndpoint = (group: string): string => {
    switch (group) {
      case "pw":
        return "power";
      case "u_totV":
        return "voltage";
      case "t_3":
        return "temperature";
      default:
        return "voltage";
    }
  };

  const getStatusLabelAndStyle = (state: string) => {
    switch (state) {
      case "NORMAL":
        return { label: "정상", style: styles.normal };
      case "WARNING":
        return { label: "경고", style: styles.warning };
      case "DANGER":
        return { label: "위험", style: styles.danger };
      default:
        return { label: "알 수 없음", style: "" };
    }
  };

  useEffect(() => {
    const fetchRank = async () => {
      try {
        const url = `http://localhost:8080/api/rank/${getEndpoint(selectedGroup)}`;
        const res = await axios.get(url);
        const data = res.data;

        if (Array.isArray(data) && data.length === 0) {
          processData(getDummy(selectedGroup));
        } else {
          console.log(`${url}의 데이터를 가져왔습니다.`);
          processData(data);
        }
      } catch (e) {
        processData(getDummy(selectedGroup));
      }
    };

    const processData = (data: RankDataItem[]) => {
      const sorted = data.sort((a, b) => b.errorRate - a.errorRate).slice(0, 3);
      setRankData(sorted);
    };

    fetchRank();
  }, [selectedGroup]);

  return (
    <div>
      {rankData.length === 0 ? (
        <p>데이터 없음</p>
      ) : (
        <table className={styles.rankTable}>
          <thead>
            <tr>
              <th>순위</th>
              <th>모델명</th>
              <th>상태</th>
              <th>위험도</th>
            </tr>
          </thead>
          <tbody>
            {rankData.map((item, index) => {
              const { label, style } = getStatusLabelAndStyle(item.pemfc.powerState);

              return (
                <tr key={item.pemfc.id}>
                  <td>{index + 1}</td>
                  <td>{item.pemfc.modelName}</td>
                  <td>
                    <div className={`${styles.deviceStatus} ${style}`}>{label}</div>
                  </td>
                  <td>{item.errorRate.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RankRow;
