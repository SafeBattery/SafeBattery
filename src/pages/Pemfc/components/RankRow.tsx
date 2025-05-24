import { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import styles from "../Pemfc.module.css";

type Pemfc = {
  id: number;
  modelName: string;
  powerState: string;
  manufacturedDate: string;
};

type RankDataItem = {
  pemfc: Pemfc;
  errorRate: number;
};

// 그룹 키에 따라 API 엔드포인트 반환
const getEndpoint = (group: string): string => {
  const endpoints: Record<string, string> = {
    pw: "power",
    u_totV: "voltage",
    t_3: "temperature",
  };
  return endpoints[group] || "voltage";
};

// 상태에 따른 라벨 및 스타일 반환
const getStatusLabelAndStyle = (state: string) => {
  const statusMap: Record<string, { label: string; style: string }> = {
    NORMAL: { label: "정상", style: styles.normal },
    WARNING: { label: "경고", style: styles.warning },
    ERROR: { label: "위험", style: styles.danger },
  };
  return statusMap[state] || { label: "알 수 없음", style: "" };
};

interface RankRowProps {
  selectedGroup: string;
}

const RankRow = ({ selectedGroup }: RankRowProps) => {
  const [rankData, setRankData] = useState<RankDataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankData = async () => {
      const endpoint = getEndpoint(selectedGroup);
  
      try {
        setLoading(true);
        setError(null);
  
        const response = await api.get<RankDataItem[]>(`/api/rank/${endpoint}`);
        const top3 = response.data
          .sort((a, b) => b.errorRate - a.errorRate)
          .slice(0, 3);
  
        setRankData(top3);
        console.log(`데이터 가져오기 성공: /api/rank/${endpoint}`);
      } catch (err) {
        console.error(`데이터 요청 실패:`, err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setRankData([]);
      } finally {
        setLoading(false);
      }
    };
  
    // 처음 실행
    fetchRankData();
    // 5초마다 실행
    const interval = setInterval(fetchRankData, 5000);
    // cleanup
    return () => clearInterval(interval);
  }, [selectedGroup]);
  

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>{error}</p>;
  if (rankData.length === 0) return <p>데이터 없음</p>;

  return (
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
  );
};

export default RankRow;
