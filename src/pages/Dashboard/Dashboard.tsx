import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './Dashboard.module.css';
import LineCharts from './components/LineCharts';
import ImpactCharts from './components/ImpactCharts';
import axios from 'axios';

function Dashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [latestValues, setLatestValues] = useState({
    pw: null as number | null,
    u_totV: null as number | null,
    t_3: null as number | null,
  });

  // 시작 화면으로 이동
  const handleHomeClick = () => {
    navigate("/"); 
  };

  // 시간 업데이트
  useEffect(() => {
    const interval = setInterval(() => {setCurrentTime(new Date());}, 1000);
    return () => clearInterval(interval);
  }, []);

  // 데이터 API 호출
  useEffect(() => {
  if (!id) return;

  axios.get(`http://localhost:8080/api/pemfc/${id}/record/all`)
    .then(response => {
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        const last = data[data.length - 1];
        setLatestValues({
          pw: last.pw,
          u_totV: last.u_totV,
          t_3: last.t_3,
        });
      }
    })
    .catch(error => {
      console.error("API 호출 실패:", error);
    });
}, [id]);

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

  return (
    <>
      {/* 헤더 */}
      <div className={styles.container}>
        <div className={styles.header}>
          {id ? `${id}의 대시보드 페이지입니다.` : '장비 ID를 불러오는 중입니다...'}
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
            <span
              className="material-icons"
              style={{
                fontSize: '100px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
                marginRight: '6px',
                position: 'relative',
                top: '1px',
                color: '#000'
              }}
            >
              power
            </span>
            <div className={styles.powerValue}>
              {latestValues.pw !== null ? `${latestValues.pw}W` : '...'} / ...
            </div>
          </div>
          {/* {u_totV 카드} */}
          <div className={`${styles.card} ${styles.voltage}`}>
            <span
              className="material-icons"
              style={{
                fontSize: '100px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
                marginRight: '6px',
                position: 'relative',
                top: '1px',
                color: '#000'
              }}
            >
              flash_on
            </span>
            <div className={styles.voltageValue}>
              {latestValues.u_totV !== null ? `${latestValues.u_totV}V` : '...'} / ...
            </div>
          </div>
          {/* {t_3} */}
          <div className={`${styles.card} ${styles.thermo}`}>
            <span
              className="material-icons"
              style={{
                fontSize: '100px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
                marginRight: '6px',
                position: 'relative',
                top: '1px',
                color: '#000'
              }}>
              device_thermostat
            </span>
            <div className={styles.thermoValue}>
              {latestValues.t_3 !== null ? `${latestValues.t_3}°C` : '...'} / ...
            </div>
          </div>
        </div>
        <div className={`${styles.cardSection} ${styles.history}`}>
          <div className={styles.card}>
            <LineCharts />
          </div>
          <div className={styles.card}>
            <ImpactCharts />
          </div>
        </div>
      </main>
    </>
  )
}

export default Dashboard;

