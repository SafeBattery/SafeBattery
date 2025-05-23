import { useState, useEffect, useRef } from 'react';
import { PemfcInstance } from './types/pemfc';
import { StatusCard, PemfcRow, RegistrationModal, RankRow } from './components';
import api from "../../api/axiosInstance";
import L from 'leaflet';
import locationIcon from './assets/location_on.png';
import styles from './Pemfc.module.css';
import 'leaflet/dist/leaflet.css';

const Pemfc = () => {

  // PEMFC 개별 인스턴스 관리 관련
  const [pemfcData, setPemfcData] = useState<PemfcInstance[]>([]);

  // PEMFC 상태 실시간 동적 렌더링 관련 (첫 번째 줄 - 총 PEMFC 수, 상태별 PEMFC 수, 빈 카드) - O
  const [totalPemfcCount, setTotalPemfcCount] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [dangerCount, setDangerCount] = useState(0);

  // PEMFC 상태 결정
  const determineState = (
    powerState: 'NORMAL' | 'WARNING' | 'ERROR',
    voltageState: 'NORMAL' | 'WARNING' | 'ERROR',
    temperatureState: 'NORMAL' | 'WARNING' | 'ERROR'
  ): 'NORMAL' | 'WARNING' | 'ERROR' => {
    if (powerState === 'ERROR' || voltageState === 'ERROR' || temperatureState === 'ERROR' ) return 'ERROR';
    else if (powerState === 'WARNING' || voltageState === 'WARNING' || temperatureState === 'WARNING') return 'WARNING';
    return 'NORMAL';
  };

  const [selectedGroup, setSelectedGroup] = useState("pw");

  const [clientName, setClientName] = useState<string>('');

  // PEMFC 위치 표시 지도 관련 
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [markerRefs, setMarkerRefs] = useState<L.Marker[]>([]);


  // PEMFC 테이블 관련
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // PEMFC 등록 관련 
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false); 

  // 특정 PEMFC 삭제 관련 
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // API 데이터 불러오기 (마운트 시 한 번 실행)
  useEffect(() => {
  const fetchPemfcData = async () => {
    try {
      const response = await api.get(
        '/api/client/1/pemfc/all'
      );

      const rawData = response.data;
      console.log('PEMFC API 데이터 가져오기 성공! : /api/client/1/pemfc/all'); 

      const processedData: PemfcInstance[] = rawData.map((item: any) => {
        const state = determineState(item.powerState, item.voltageState, item.temperatureState);

        return {
          id: item.id,
          clientId: item.clientId,
          modelName: item.modelName,
          manufacturedDate: item.manufacturedDate,
          lat: item.lat,
          lng: item.lng,
          powerState: item.powerState,
          voltageState: item.voltageState,
          temperatureState: item.temperatureState,
          state: state,
        };
      });

      setPemfcData(processedData);
    } catch (error) {
      console.error('PEMFC API 데이터 가져오기 실패:', error);
    }
  };

  fetchPemfcData(); 
}, []);


  useEffect(() => {
  const fetchClientName = async () => {
    try {
      const response = await api.get(
        '/api/client/1/name'
      );

      console.log('클라이언트 이름 가져오기 성공!: /api/client/1/name');
      setClientName(response.data);
    } catch (error) {
      console.error('클라이언트 이름 가져오기 실패:', error);
    }
  };

  fetchClientName();
}, []);

  // 상태 동기화 (pemfcData 변경 시마다) - O
  useEffect(() => {
    setTotalPemfcCount(pemfcData.length);
    setNormalCount(pemfcData.filter((item) => item.state === 'NORMAL').length);
    setWarningCount(pemfcData.filter((item) => item.state === 'WARNING').length);
    setDangerCount(pemfcData.filter((item) => item.state === 'ERROR').length);
  }, [pemfcData]);

  // leaflet 지도 초기화 - O
  useEffect(() => {
    if (mapRef.current && mapRef.current.childElementCount === 0) {
      const initialZoom = 6;

      const map = L.map(mapRef.current, {
        zoom: initialZoom,
        minZoom: initialZoom, 
        scrollWheelZoom: true,
      }).setView([36.6354, 127.8375], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);
      setLeafletMap(map);
    }
  }, []);

  // pemfcData가 변경될 때 지도 마커 초기화 후 재렌더링
  useEffect(() => {
    if (!leafletMap) return;

    markerRefs.forEach((marker) => {
      leafletMap.removeLayer(marker);
    });

    const newMarkers: L.Marker[] = [];
    const customIcon = L.icon({
      iconUrl: locationIcon,
      iconSize: [32, 32],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      shadowSize: [41, 41],
    });

    pemfcData.forEach((item) => {
      const lat = typeof item.lat === 'string' ? parseFloat(item.lat) : item.lat;
      const lng = typeof item.lng === 'string' ? parseFloat(item.lng) : item.lng;

      if (!isNaN(lat) && !isNaN(lng)) {
        const marker = L.marker([lat, lng], { icon: customIcon })
          .addTo(leafletMap)
          .bindPopup(`${clientName}`)
          .openPopup();
        newMarkers.push(marker);
      }
    });

    setMarkerRefs(newMarkers);
  }, [leafletMap, pemfcData]);

  // PEMFC 등록 
  const handleRegister = async (formData: {
    modelName: string;
    clientId: number;
    lat: number;
    lng: number;
    manufacturedDate: string;
  }) => {
    try {
      const payload = {
        ...formData,
        powerState: 'NORMAL',
        voltageState: 'NORMAL',
        temperatureState: 'NORMAL',
      };
      await api.post('/api/pemfc/', payload);
      alert('PEMFC 등록 성공!');
      console.log('PEMFC 등록 성공!: /api/pemfc/')
      setIsRegistrationModalOpen(false);
    } catch (error) {
      alert('등록 실패');
      console.error('PEMFC 등록 실패', error);
    }
  };

  // 모든 PEMFC 데이터 재조회 - O
  const handleReload = async () => {
  try {
    const response = await api.get(
      `/api/client/1/pemfc/all`
    );
    const rawData = response.data;

    if (Array.isArray(rawData)) {
      console.log('PEMFC 데이터 재조회 성공: /api/client/1/pemfc/all'); 

      const mappedData = rawData.map((item: any) => ({
        id: item.id,
        modelName: item.modelName,
        clientId: item.clientId,
        lat: item.lat,
        lng: item.lng,
        manufacturedDate: item.manufacturedDate,
        powerState: item.powerState,
        voltageState: item.voltageState,
        temperatureState: item.temperatureState,
        state: determineState(item.powerState, item.voltageState, item.temperatureState),
      }));

      setPemfcData(mappedData);
    } else {
      console.warn('응답 데이터가 배열이 아닙니다');
    }
  } catch (error) {
    console.error('PEMFC 데이터 재조회 오류:', error);
  }
};

  // 모든 PEMFC 삭제
  const handleDeleteAll = async () => {
  const confirmed = window.confirm("모든 PEMFC 데이터를 삭제하시겠습니까?");
  if (!confirmed) return;

  try {
    const response = await api.get("/api/client/1/pemfc/all");
    const rawData = response.data;

    if (!Array.isArray(rawData) || rawData.length === 0) {
      alert("삭제할 PEMFC 데이터가 없습니다.");
      return;
    }

    const deletableIds: number[] = [];

    await Promise.all(
      rawData.map(async (item: { id: number }) => {
        try {
          await api.delete(`/api/pemfc/${item.id}/delete`);
          deletableIds.push(item.id);
        } catch (error) {
          console.warn(`PEMFC ${item.id} 삭제 실패 (삭제 불가 대상일 수 있음).`);
        }
      })
    );

    // 삭제된 항목 기준으로 상태 업데이트
    const remaining = pemfcData.filter((item) => !deletableIds.includes(item.id));
    setPemfcData(remaining);

    // 마커 갱신
    if (leafletMap) {
      const newMarkers: typeof markerRefs = [];
      remaining.forEach((pemfc, idx) => {
        const marker = markerRefs.find((m, i) => pemfcData[i]?.id === pemfc.id);
        if (marker) {
          newMarkers.push(marker);
        }
      });

      // 지도에서 삭제된 마커 제거
      markerRefs.forEach((marker, i) => {
        if (!remaining.find((pemfc) => pemfc.id === pemfcData[i]?.id)) {
          leafletMap.removeLayer(marker);
        }
      });

      setMarkerRefs(newMarkers);
    }

    setSelectedIndex(null);
    setIsDeleteModalOpen(false);

    alert(`${deletableIds.length}개의 PEMFC가 삭제되었습니다.`);
    console.log(`${deletableIds.length}개 PEMFC가 삭제 완료`)
  } catch (error) {
    console.error("PEMFC 전체 삭제 중 오류:", error);
    alert("일부 데이터를 삭제하는 중 오류가 발생했습니다.");
  }
};

  // 특정 PEMFC 삭제
  const handleDelete = async (index: number) => {
  const pemfcToDelete = pemfcData[index];
  const pemfcId = pemfcToDelete?.id;

  if (!pemfcId) {
    console.error("삭제할 PEMFC의 ID를 찾을 수 없습니다.");
    return;
  }

  const confirmed = window.confirm(`정말로 PEMFC를 삭제하시겠습니까?`);
  if (!confirmed) return;

  try {
    // DELETE 요청
    await api.delete(`/api/pemfc/${pemfcId}/delete`);

    // UI 상태 동기화
    const updatedData = [...pemfcData];
    updatedData.splice(index, 1);
    setPemfcData(updatedData);

    // 마커 제거
    if (leafletMap) {
      const markerToRemove = markerRefs[index];
      if (markerToRemove) {
        leafletMap.removeLayer(markerToRemove);
      }
    }

    const updatedMarkers = [...markerRefs];
    updatedMarkers.splice(index, 1);
    setMarkerRefs(updatedMarkers);

    setSelectedIndex(null);

    alert(`PEMFC 삭제 완료`);
    console.log(`PEMFC 삭제 완료: ${pemfcId}`);
  } catch (error) {
    console.error("PEMFC 삭제 중 오류 발생:", error);
    alert("삭제 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
};

  // 특정 PEMFC 삭제 모달 열기
  const openDeleteModal = (index: number) => {
    setDeleteIndex(index); 
    setIsDeleteModalOpen(true); 
  };

  // 특정 PEMFC 삭제 모달 닫기
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false); 
  };

  return (
    <>
      {/* Header */}
      <div className={styles.container}>
        <div className={styles.header}>SAFE BATTERY 모니터링 시스템</div>
        <div className={styles.subtext}>
          모든 PEMFC 장비의 상태를 SAFE BATTERY 모니터링 시스템을 통해 간편하게 확인하세요.
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={() => setIsRegistrationModalOpen(true)}>
            <span className="material-icons" style={{ fontSize: '16px', display: 'flex', alignItems: 'center', lineHeight: 1, marginRight: '6px', position: 'relative', top: '1px' }}>
              add
            </span>
            새로 등록
          </button>
        </div>
      </div>

      <main className={styles.body}>

        {/* Main UI 첫 번쨰 줄 - cards */}
        <div className={styles.cardSection}>
          {/* 첫 번쨰 카드 */}
          <div className={`${styles.card} ${styles.total}`}>
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>총 PEMFC 개수</div>
              <div className={styles.cardValue}>{totalPemfcCount}개</div>
            </div>
          </div>

          {/* 두 번쨰 카드 */}
          <div className={`${styles.card} ${styles.status}`}>
            <div className={styles.cardTitle}>상태별 PEMFC 개수</div>
            <div className={styles.statusBoxContainer}>
              <StatusCard label="정상" count={normalCount} type="normal" styles={styles} /> {/* 정상 카드 */}
              <StatusCard label="경고" count={warningCount} type="warning" styles={styles} /> {/* 경고 카드 */}
              <StatusCard label="위험" count={dangerCount} type="error" styles={styles} /> {/* 위험 카드 */}
            </div>
          </div>

          {/* 세 번째 카드 */}
          <div className={`${styles.card} ${styles.rank}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>에러별 PEMFC 위험도 랭킹</div>
              <select
                className={styles.selectDropdown}
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                aria-label="Select data group"
              >
                {["pw", "u_totV", "t_3"].map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <RankRow selectedGroup={selectedGroup} />
          </div>
        </div>

        {/* Main UI 두 번쨰 줄 (map, list) */}
        <div className={styles.sectionMapList}>

          {/* 지도 섹션*/}
          <div className={styles.mapSection}>
            <div className={styles.mapContainer}>s
              <div
                ref={mapRef}
                style={{ width: '100%', height: '400px', borderRadius: '8px' }}
              />
            </div>
          </div>

          {/* 리스트 섹션*/}
          <div className={styles.listSection}>
            <div className={styles.listContainer}>
              <div className={styles.listHeader}>
                <div className={styles.listTitle}>모든 PEMFC</div>
                <button className={styles.refreshButton} onClick={handleReload}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>
                    autorenew
                  </span>
                  재조회
                </button>
                <button className={styles.deleteButton} onClick={handleDeleteAll}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>
                    delete
                  </span>
                  모두 삭제
                </button>
              </div>
              <table className={styles.deviceTable}>
                <thead>
                  <tr>
                    <th>PEMFC명</th>
                    <th>상태</th>
                    <th>제조 날짜</th>
                    <th>고객명</th>
                    <th>기타</th>
                  </tr>
                </thead>
                <tbody>
                  {pemfcData.map((item, index) => (
                    <PemfcRow
                      key={index}
                      item={item}
                      index={index}
                      selectedIndex={selectedIndex}
                      setSelectedIndex={setSelectedIndex}
                      handleDelete={handleDelete}
                      styles={styles}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* 삭제 확인 모달 */}
          {isDeleteModalOpen && (
            <div className={styles.deleteModalOverlay}>
              <div className={styles.deleteModal}>
                <h2>정말로 삭제하시겠습니까?</h2>
                <div className={styles.deleteModalActions}>
                  <button onClick={() => handleDelete(deleteIndex!)}>예</button>
                  <button onClick={closeDeleteModal}>아니요</button>
                </div>
              </div>
            </div>
          )}
        
        {isRegistrationModalOpen && (<RegistrationModal onClose={() => setIsRegistrationModalOpen(false)} onSubmit={handleRegister}/>)}
      </main>
    </>
  );
};

export default Pemfc;
