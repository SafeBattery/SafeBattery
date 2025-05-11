import React, { useState, useEffect, useRef } from 'react';
import styles from './Pemfc.module.css';
import { PemfcInstance } from './types/pemfc';
import StatusCard from './components/StatusCard';
import PemfcRow from './components/PemfcRow';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import locationIcon from './assets/location_on.png';

const Pemfc = () => {

  // PEMFC 등록 모달 관련
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false); 
  const [modelName, setModelName] = useState(''); 
  const [clientName, setClientName] = useState(''); 
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState('');

  // PEMFC 개별 인스턴스 관리 관련
  const [pemfcData, setPemfcData] = useState<PemfcInstance[]>([]);

  // PEMFC 상태 실시간 동적 렌더링 관련 (첫 번째 줄 - 총 PEMFC 수, 상태별 PEMFC 수, 빈 카드)
  const [totalPemfcCount, setTotalPemfcCount] = useState(0);
  const [normalCount, setNormalCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [dangerCount, setDangerCount] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 지도 관련
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletMap, setLeafletMap] = useState<L.Map | null>(null);
  const [markerRefs, setMarkerRefs] = useState<L.Marker[]>([]);

  // 개별 PEMFC 삭제 관련
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);  

  // 데이터 불러오기 (초기 마운트용)
  useEffect(() => {
    const data = localStorage.getItem('pemfcData');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setPemfcData(parsed);
          setNormalCount(parsed.filter((item) => item.state === 'NORMAL').length);
          setWarningCount(parsed.filter((item) => item.state === 'WARNING').length);
          setDangerCount(parsed.filter((item) => item.state === 'DANGER').length);
          setTotalPemfcCount(parsed.length);
        }
      } catch (err) {
        console.error('로컬 스토리지 데이터 파싱 오류:', err);
      }
    }
  }, []);

  // 데이터 불러오기 (데이터 바뀔 때마다 동기화)
  useEffect(() => {
    setTotalPemfcCount(pemfcData.length);
    setNormalCount(pemfcData.filter((item) => item.state === 'NORMAL').length);
    setWarningCount(pemfcData.filter((item) => item.state === 'WARNING').length);
    setDangerCount(pemfcData.filter((item) => item.state === 'DANGER').length);
  }, [pemfcData]);

  // leaflet 지도 초기화
  useEffect(() => {
    if (mapRef.current && mapRef.current.childElementCount === 0) {
      const map = L.map(mapRef.current).setView([37.55083, 127.07389], 13);
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
          .bindPopup(`${item.clientName}입니다.`)
          .openPopup();
        newMarkers.push(marker);
      }
    });

    setMarkerRefs(newMarkers);
  }, [leafletMap, pemfcData]);

  // 입력한 PEMFC 데이터 로컬 저장소에 추가
  const handleSubmit = async () => {
    try {
      const newEntry: PemfcInstance = {
        modelName,
        clientName,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        manufacturedDate,
        state: 'NORMAL',
      };
      const updatedData = [...pemfcData, newEntry];
      localStorage.setItem('pemfcData', JSON.stringify(updatedData));
      setPemfcData(updatedData);
      alert('PEMFC 등록 성공! (로컬 저장)');
      setIsRegistrationModalOpen(false);
    } catch (error) {
      alert('로컬 저장 중 오류 발생');
      console.error(error);
    }
  };

  // 모든 PEMFC 데이터 로컬 저장소에서 삭제
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

  // 모든 PEMFC 데이터 재조회
  const handleReload = () => {
    const data = localStorage.getItem('pemfcData');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) setPemfcData(parsed);
      } catch (err) {
        console.error('로컬 스토리지 데이터 파싱 오류:', err);
      }
    }
  };

  const handleDelete = (index: number) => {
    const updatedData = [...pemfcData];
    updatedData.splice(index, 1); // 리스트에서 데이터 삭제
    setPemfcData(updatedData);

    // 로컬스토리지 업데이트
    localStorage.setItem('pemfcData', JSON.stringify(updatedData));

    // 지도에서 해당 마커 제거
    if (leafletMap) {
      const markerToRemove = markerRefs[index];  
      if (markerToRemove) {
        leafletMap.removeLayer(markerToRemove); 
      }
    }

    // 마커 배열에서 해당 마커 제거
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

        {/* 등록 모달 */}
        {isRegistrationModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.formRegistration}>
                <div className={styles.legend}>
                  <div className={styles.formTitle}>PEMFC 등록</div>
                </div>
                <div className={`${styles.inputField} ${styles.deviceName}`}>
                  <div className={styles.label}>PEMFC명</div>
                  <input
                    className={styles.input}
                    placeholder="PEMFC명을 입력하세요."
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
                <div className={`${styles.inputField} ${styles.clientName}`}>
                  <div className={styles.label}>고객명</div>
                  <input
                    className={styles.input}
                    placeholder="고객명을 입력하세요."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className={`${styles.inputField} ${styles.deviceLocation}`}>
                  <div className={styles.label}>
                    위치
                    <span className={styles.exampleLocationText}>
                      {' '}
                      (EX. 37.55083, 127.07389 → 세종대학교)
                    </span>
                  </div>
                  <div className={styles.locationInputs}>

                      <input
                        className={styles.input}
                        placeholder="위도"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                      />


                      <input
                        className={styles.input}
                        placeholder="경도"
                        value={lng}
                        onChange={(e) => setLng(e.target.value)}
                      />

                  </div>
                </div>
                <div className={`${styles.inputField} ${styles.manufacturedDate}`}>
                  <div className={styles.label}>제조 날짜</div>
                  <input
                    className={styles.input}
                    type="date"
                    value={manufacturedDate}
                    onChange={(e) => setManufacturedDate(e.target.value)}
                  />
                </div>
                <div className={styles.buttonGroup}>
                  <button className={styles.registerButton2} onClick={handleSubmit}>
                    등록하기
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setIsRegistrationModalOpen(false)}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Pemfc;
