import React from 'react';
import styles from '../Dashboard.module.css';
import trendChart from '../assets/trend_chart.png';

interface TrendModalProps {
  onClose: () => void;
}

const TrendModal: React.FC<TrendModalProps> = ({ onClose }) => {
  return (
    <div className={styles.trendModalOverlay}>
      <div className={styles.trendModal}>
        <div className={styles.trendModalActions}>
          <button onClick={onClose} aria-label="Close modal">
            <div className="material-icons">close</div>
          </button>
        </div>

        <h2 className={styles.cardTitle}>센서 데이터 및 상태 트렌드 차트 해석 방법</h2>
        <br />
        <br />
        <div className={styles.description}>
          <p>
            이 섹션에서는 센서 데이터와 머신러닝 모델을 통해 예측한 pw, u_totV, t_3 값들의 변화를 분석하여 장비 상태의 경향성을 파악합니다.
          </p>
          <h4>1) Informer란?</h4>
          <p>
            Informer는 시계열 데이터 예측에 특화된 딥러닝 모델로, 효율적이고 정확한 예측을 지원합니다.
          </p>
          <h4>2) 모델 구성</h4>
          <p>
            pw와 u_totV는 하나의 멀티타스크 Informer 모델에서 함께 예측되며, t_3 값은 별도의 Informer 모델에서 개별적으로 예측됩니다.
          </p>
          <h4>3) 차트 해석법</h4>
          <img src={trendChart} alt="센서 데이터 및 상태 트렌드 차트" style={{ width: '100%' }} />
          <div className={styles.subText}>*본 차트는 실제 차트와 다를 수 있습니다.</div>
          <br />
          <ul>
            <li>실선: 센서에서 측정된 실제 데이터 값 / 회색 점선: 모델이 예측한 값</li>
            <li>배경 색상: 초록 - 정상 / 주황 - 경고 / 빨강 - 위험 </li>
            <li>Zoom & crossline 기능: 데이터 값 정밀하게 식별 가능 </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrendModal;
