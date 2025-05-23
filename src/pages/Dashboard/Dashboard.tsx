import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { LineChart, LineCharts, DynamaskModal, TrendModal } from './components'
import api from '../../api/axiosInstance';
import { ToggleGroup } from './components/ToggleGroup/ToggleGroup';

function Dashboard() {

  // 모델명 렌더링
  const [modelName, setModelName] = useState<string | null>(null);
  const { id } = useParams();

  // 시작 화면
  const navigate = useNavigate();
  const handleHomeClick = () => {
    navigate("/");
  };

  // 시간 카드
  const [currentTime, setCurrentTime] = useState(new Date());
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}시 ${minutes}분`;
  };

  const formatDate = (date: Date) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = days[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${dayName}, ${month}월 ${day}일`;
  };

  // 가장 최근 센서 데이터값
  const [latestValues, setLatestValues] = useState({
    pw: null as number | null,
    u_totV: null as number | null,
    t_3: null as number | null,
  });

   // 가장 최근 pemfc 상태
   const [latestStates, setLatestStates] = useState({
    powerState: null as 'NORMAL' | 'WARNING' | 'ERROR' | null,
    voltageState: null as 'NORMAL' | 'WARNING' | 'ERROR' | null,
    temperatureState: null as 'NORMAL' | 'WARNING' | 'ERROR' | null,
  });

  const groups: string[] = ["pw", "u_totV", "t_3"];
  // 렌더링할 항목 선택 - LineChart
  type AllowedGroup = "pw" | "u_totV" | "t_3";

  const [selectedGroup1, setSelectedGroup1] = useState<AllowedGroup>("pw");

  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showDynamaskModal, setShowDynamaskModal] = useState(false);

  // 렌더링할 항목 선택 - ImpactChart
  const [selectedGroup2, setSelectedGroup2] = useState("voltagepower");

  const setSelectedGroups = (value: string) => {
    if (value == groups[2]) { // t_3일때만 temperature로 설정
      setSelectedGroup2("temperature")
    } else {
      setSelectedGroup2("voltagepower")
    }
    setSelectedGroup1(value as AllowedGroup)
  };

  // 각 그룹별 체크 항목
  const voltageFeatures = [
    "iA",
    "iA_diff",
    "P_H2_supply",
    "P_H2_inlet",
    "P_Air_supply",
    "P_Air_inlet",
    "m_Air_write",
    "m_H2_write",
    "T_Stack_inlet",
  ];

  const temperatureFeatures = [
    "P_H2_inlet",
    "P_Air_inlet",
    "T_Heater",
    "T_Stack_inlet",
  ];


  // CSV 다운로드
  const handleCsvDownload = async () => {
  try {
    const response = await api.get(
      `/api/pemfc/${id}/csv`,
      { responseType: 'blob' }
    );

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pemfc_${id}_data.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    console.log(`CSV 다운로드 성공! : /api/pemfc/${id}/csv`); 
  } catch (error) {
    console.error('CSV 다운로드 실패:', error);
  }
};
 
  // pemfc 상태
  useEffect(() => {
    if (!id) return;
  
    const fetchPemfcState = () => {
      api
        .get(`/api/pemfc/${id}`)
        .then(response => {
          const { modelName, powerState, voltageState, temperatureState } = response.data;
          console.log('모델 이름 및 상태 API 호출 성공:', response.data);
  
          setModelName(modelName);
          setLatestStates(prev => ({
            ...prev,
            powerState,
            voltageState,
            temperatureState,
          }));
        })
        .catch(error => {
          console.error("모델 이름 및 상태 API 호출 실패:", error);
        });
    };
  
    // 첫 fetch
    fetchPemfcState();
  
    // 5초마다 반복 fetch
    const interval = setInterval(fetchPemfcState, 5000);
  
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => clearInterval(interval);
  }, [id]);

  // 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 최근 센서 데이터 API 호출
  // useEffect(() => {
  //   if (!id) return;

  //   api.get(`/api/pemfc/${id}/record/recent600`)
  //     .then(response => {
  //       console.log(`최근 센서 데이터 API 호출 성공!: /api/pemfc/${id}/record/recent600`);

  //       const data = response.data;
  //       if (Array.isArray(data) && data.length > 0) {
  //         const last = data[0];

  //         setLatestValues({
  //           pw: last.pw,
  //           u_totV: last.u_totV,
  //           t_3: last.t_3,
  //           powerState: last.powerState,
  //           voltageState: last.voltageState,
  //           temperatureState: last.temperatureState
  //         });
  //       }
  //     })
  //     .catch(error => {
  //       console.error("최근 센서 데이터 API 호출 실패:", error);
  //     });
  // }, [id]);
  useEffect(() => {
    if (!id) return;
  
    const fetchLatest = () => {
      api.get(`/api/pemfc/${id}/record/recent600`)
        .then(response => {
          console.log(`최근 센서 데이터 API 호출 성공!: /api/pemfc/${id}/record/recent600`);
          const data = response.data;
          if (Array.isArray(data) && data.length > 0) {
            const last = data[0]; //ok
            setLatestValues({
              pw: last.pw,
              u_totV: last.u_totV,
              t_3: last.t_3,
            });
          }
        })
        .catch(error => {
          console.error("최근 센서 데이터 API 호출 실패:", error);
        });
    };
  
    fetchLatest(); 
    const intervalId = setInterval(fetchLatest, 5000); 
  
    return () => clearInterval(intervalId); 
  }, [id]);
  

  const [selectedFeatures, setSelectedFeatures] = React.useState<string[]>([]);


  function toggleFeature(feature: string) {
    setSelectedFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature); 
      } else {
        return [...prev, feature]; 
      }
    });
  }

  const featuresToRender =
    selectedGroup2 === "voltagepower" ? voltageFeatures : temperatureFeatures;


  return (
    <>
      {/* 헤더 */}
      <div className={styles.container}>
        <div className={styles.header}>
          {modelName ? `${modelName}의 대시보드 페이지입니다.` : '장비 ID를 불러오는 중입니다...'}
        </div>
        <div className={styles.subtext}>
          PEMFC 장비의 상태를 SAFE BATTERY 대시보드를 통해 간편하게 확인하세요.
        </div>
        <span className="material-icons"
          style={{
            fontSize: '40px',
            color: '#000',
            position: 'absolute',
            top: '24px',
            right: '30px',
            cursor: 'pointer'
          }}
          onClick={handleHomeClick}
        >
          home
        </span>
      </div>
      <main className={styles.body}>
        <div className={`${styles.cardSection} ${styles.now}`}>

          {/* {시간 카드} */}
          <div className={`${styles.card} ${styles.time}`}>
            <div className={styles.timeContent}>
              <div className={styles.timeDate}>{formatDate(currentTime)}</div>
              <div className={styles.timeTime}>{formatTime(currentTime)}</div>
            </div>
          </div>

          {/* {power 카드} */}
          <div className={`${styles.card} ${styles.power}`}>

            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>전력</div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.powerStateWrapper}>
                <span className={styles.simptipPositionTop} data-tooltip="초록: 정상(0.6 ~ 0.9), 노랑: 경고, 빨강: 위험">
                  <div
                    className={styles.powerState}
                    style={{
                      backgroundColor:
                        latestStates.powerState === 'ERROR'
                          ? '#d9534f'
                          : latestStates.powerState === 'WARNING'
                            ? '#f0ad4e'
                            : '#14ca74',
                    }}
                  >
                  </div>
                </span>
                
              </div>
              <div className={styles.powerValue}>
                {latestValues.pw !== null ? `${latestValues.pw}W` : '...'}
              </div>
            </div>
          </div>

          {/* {u_totV 카드} */}
          <div className={`${styles.card} ${styles.voltage}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>전압</div>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.simptipPositionTop} data-tooltip="초록: 정상(0.6 ~ 0.9), 노랑: 경고, 빨강: 위험">
                  <div
                    className={styles.voltageState}
                    style={{
                      backgroundColor:
                        latestStates.voltageState === 'ERROR'
                          ? '#d9534f'
                          : latestStates.voltageState === 'WARNING'
                            ? '#f0ad4e'
                            : '#14ca74',
                    }}
                  >
                  </div>
                </span>
              <div className={styles.voltageValue}>
                {latestValues.u_totV !== null ? `${latestValues.u_totV}V` : '...'}
              </div>
            </div>
          </div>

          {/* {t_3} */}
          <div className={`${styles.card} ${styles.temperature}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>온도</div>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.simptipPositionTop} data-tooltip="초록: 정상(0.6 ~ 0.9), 노랑: 경고, 빨강: 위험">
                  <div
                    className={styles.temperatureState}
                    style={{
                      backgroundColor:
                        latestStates.temperatureState === 'ERROR'
                          ? '#d9534f'
                          : latestStates.temperatureState === 'WARNING'
                            ? '#f0ad4e'
                            : '#14ca74',
                    }}
                  >
                  </div>
                </span>
              <div className={styles.temperatureValue}>
                {latestValues.t_3 !== null ? `${latestValues.t_3}°C` : '...'}
              </div>
            </div>
          </div>
        </div>


        <div className={`${styles.cardSection} ${styles.history}`}>
          <div className={`${styles.card} ${styles.trend}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                센서 데이터 및 상태 트렌드
              </div>
              <div className="material-icons"
                  style={{cursor: "pointer"}}
                  onClick={() => setShowTrendModal(true)}
              >help
              </div>
              {showTrendModal && <TrendModal onClose={() => setShowTrendModal(false)} />}
              <ToggleGroup
                items={groups}
                value={selectedGroup1}
                onChange={(event) => setSelectedGroups(event)}
                aria-label="Select data group"
              />
              <button className={styles.excelDownloadButton} onClick={handleCsvDownload}>
                <span className="material-icons" style={{ fontSize: '16px', marginRight: '6px' }}>download</span>
                전체 데이터셋 다운로드
              </button>
            </div>

            {/* 센서 데이터 트렌드 */}
            <div className={styles.trendCharts}>
              <LineChart selectedGroup={selectedGroup1} />
            </div>
          </div>

          {/* 센서 상태 트렌드 */}
          <div className={`${styles.card} ${styles.dynamask}`}>
            <div className={`${styles.card} ${styles.trend}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>피처 영향도 분석</div>
                <div className="material-icons"
                  style={{cursor: "pointer"}}
                  onClick={() => setShowDynamaskModal(true)}
                >help
                </div>
                {showDynamaskModal && <DynamaskModal onClose={() => setShowDynamaskModal(false)} />}
              </div>

              <LineCharts selectedGroup={selectedGroup1} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export default Dashboard;