import { useState, useEffect, useRef } from 'react';
import { PemfcInstance } from './types/pemfc';
import { StatusCard, PemfcRow, RegistrationModal } from './components';
import axios from 'axios'
import L from 'leaflet';
import locationIcon from './assets/location_on.png';
import styles from './Pemfc.module.css';
import 'leaflet/dist/leaflet.css';

const Pemfc = () => {

  // PEMFC 모달 관련
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false); 

  // 개별 PEMFC 삭제 관련
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);  

  // PEMFC 개별 인스턴스 관리 관련
  const [pemfcData, setPemfcData] = useState<PemfcInstance[]>([]);

  // PEMFC 상태 실시간 동적 렌더링 관련 (첫 번째 줄 - 총 PEMFC 수, 상태별 PEMFC 수, 빈 카드) - O
  const [totalPemfcCount, setTotalPemfcCount] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [dangerCount, setDangerCount] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const determineState = (
    powerVoltageState: 'NORMAL' | 'WARNING' | 'DANGER',
    temperatureState: 'NORMAL' | 'WARNING' | 'DANGER'
  ): 'NORMAL' | 'WARNING' | 'DANGER' => {
    if (powerVoltageState === 'DANGER' || temperatureState === 'DANGER') return 'DANGER';
    if (powerVoltageState === 'WARNING' || temperatureState === 'WARNING') return 'WARNING';
    return 'NORMAL';
  };

  // 지도 관련 - O
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [markerRefs, setMarkerRefs] = useState<L.Marker[]>([]);

  // API 데이터 불러오기 (마운트 시 한 번 실행) - O
  useEffect(() => {
    const fetchPemfcData = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/client/1/pemfc/all');
        const rawData = response.data;

        const processedData: PemfcInstance[] = rawData.map((item: any) => {
          let state: 'NORMAL' | 'WARNING' | 'DANGER' = 'NORMAL';

          if (item.powerVoltageState === 'DANGER' || item.temperatureState === 'DANGER') {
            state = 'DANGER';
          } else if (item.powerVoltageState === 'WARNING' || item.temperatureState === 'WARNING') {
            state = 'WARNING';
          }

          return {
            id: item.id,
            clientId: item.clientId, 
            modelName: item.modelName,
            manufacturedDate: item.manufacturedDate,
            lat: item.lat,
            lng: item.lng,
            powerVoltageState: item.powerVoltageState,
            temperatureState: item.temperatureState,
            state,
          };
        });

        setPemfcData(processedData); 

      } catch (error) {
        console.error('PEMFC API 데이터 가져오기 실패:', error);
      }
    };

    fetchPemfcData();
  }, []);

  // 상태 동기화 (pemfcData 변경 시마다) - O
  useEffect(() => {
    setTotalPemfcCount(pemfcData.length);
    setNormalCount(pemfcData.filter((item) => item.state === 'NORMAL').length);
    setWarningCount(pemfcData.filter((item) => item.state === 'WARNING').length);
    setDangerCount(pemfcData.filter((item) => item.state === 'DANGER').length);
  }, [pemfcData]);

  // leaflet 지도 초기화 - O
  useEffect(() => {
    if (mapRef.current && mapRef.current.childElementCount === 0) {
      const map = L.map(mapRef.current).setView([36.6354, 127.8375], 6);
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
          .bindPopup(`${item.clientId}입니다.`)
          .openPopup();
        newMarkers.push(marker);
      }
    });

    setMarkerRefs(newMarkers);
  }, [leafletMap, pemfcData]);

  // PEMFC 등록
  const handleRegister = async (formData: {
    clientId: number;
    modelName: string;
    lat: number;
    lng: number;
    manufacturedDate: string;
  }) => {
    try {
      const payload = {
        ...formData,
        powerVoltageState: 'NORMAL',
        temperatureState: 'NORMAL',
      };

      await axios.post('http://localhost:8080/api/pemfc', payload);
      alert('PEMFC 등록 성공!');
      setIsRegistrationModalOpen(false);
    } catch (error) {
      alert('등록 실패');
      console.error(error);
    }
  };

  // 모든 PEMFC 데이터 재조회
  const handleReload = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/client/{clientId}/pemfc/all');
      const rawData = response.data;

      if (Array.isArray(rawData)) {
        const mappedData = rawData.map((item: any) => ({
          id: item.id,
          modelName: item.modelName,
          clientId: item.clientId, // 필요한 경우 어딘가에서 주입
          lat: item.lat,
          lng: item.lng,
          manufacturedDate: item.manufacturedDate,
          powerVoltageState: item.powerVoltageState,
          temperatureState: item.temperatureState,
          state: determineState(item.powerVoltageState, item.temperatureState),
        }));

        setPemfcData(mappedData);
      }
    } catch (error) {
      console.error('PEMFC 데이터 불러오기 오류:', error);
    }
  };

  // 모든 PEMFC 삭제
  const handleDeleteAll = () => {
    if (window.confirm('모든 PEMFC 데이터를 삭제하시겠습니까?')) {
      localStorage.removeItem('pemfcData');
      setPemfcData([]);
      if (leafletMap) {
        leafletMap.eachLayer((layer) => {
          if (layer instanceof L.Marker) leafletMap.removeLayer(layer);
        });
      }
      alert('모든 PEMFC 데이터가 삭제되었습니다.');
    }
  };

  // 특정 PEMFC 삭제
  const handleDelete = (index: number) => {
    const updatedData = [...pemfcData];
    updatedData.splice(index, 1); 
    setPemfcData(updatedData);

    localStorage.setItem('pemfcData', JSON.stringify(updatedData));

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
    setIsDeleteModalOpen(false); 
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
              <StatusCard label="위험" count={dangerCount} type="danger" styles={styles} /> {/* 위험 카드 */}
            </div>
          </div>

          {/* 세 번째 카드 */}
          <div className={styles.card}>
            
          </div>
        </div>

        {/* Main UI 두 번쨰 줄 (map, list) */}
        <div className={styles.sectionMapList}>

          {/* 지도 섹션*/}
          <div className={styles.mapSection}>
            <div className={styles.mapContainer}>
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
                    <th>장비명</th>
                    <th>상태</th>
                    <th>측정시간</th>
                    <th>주소</th>
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
                      handleDelete={openDeleteModal}
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
