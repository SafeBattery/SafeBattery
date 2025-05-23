import React from 'react';
import styles from '../Dashboard.module.css';
import dynamaskChart from '../assets/dynamask_chart.png';
import dynamaskChart_1 from '../assets/dynamask_chart_1.png';

interface DynamaskModalProps {
  onClose: () => void;
}

const DynamaskModal: React.FC<DynamaskModalProps> = ({ onClose }) => {
  return (
    <div className={styles.dynamaskModalOverlay}>
      <div className={styles.dynamaskModal}>
        <div className={styles.dynamaskModalActions}>
          <button onClick={onClose}>
            <div className="material-icons">close</div>
          </button>
        </div>
        <div className={styles.cardTitle}>피처 영향도 분석 차트 해석 방법</div>
        <br />
        <br />
        <div className={styles.description}>
          <p>
            이 섹션에서는 Informer 모델에서 각각의 피처가 예측에 얼마나 영향을 미쳤는지를 분석합니다.
            이를 통해 모델의 해석 가능성과 피처 엔지니어링 방향을 파악할 수 있습니다.
          </p>
          <h4>1) Dynamask란?</h4>
          <p>
            Dynamask는 SAFE BATTERY가 머신러닝 모델에 도입한 기법으로, 각각의 피처가 예측에 얼마나 영향을 미쳤는지를 분석합니다. 모델의 입력 시퀀스에 대해 0과 1 사이의 마스크 값을 도출하며, <br />
            -  1에 가까울수록 해당 피처가 예측 결과에 큰 영향<br />
            -  0에 가까울수록 예측 결과에 영향이 적음을 의미합니다.
          </p>
          <h4>2) 차트 해석 방법</h4>
          <img src={dynamaskChart} alt="다이너마스크 차트 이미지" style={{ width: '60%' }} />
          <div className={styles.subText}>*본 차트는 실제 차트와 다를 수 있습니다.</div>
          <br />
          <p>
            이 차트는 예측 대상(종속 변수)에 대해, 입력 피처(독립 변수)가 예측에 미친 영향을 시간의 흐름에 따라 시각화한 것입니다.<br />
            -  파란 실선: 시간에 따른 Dynamask 마스크값. 오른쪽으로 갈수록 최신 시점을 의미 <br />
            -  배경 색상: 초록 - 해당 시점에서 피처의 영향이 작음 / 빨강: 해당 시점에서 피처의 영향이 큼 <br />
            -  Zoom 기능: 차트를 확대하여 피처 간의 영향도를 정밀하게 비교 가능
          </p>
          <h4>3) 분석 포인트</h4>
          <img src={dynamaskChart_1} alt="다이너마스크 차트 이미지1" style={{ width: '60%' }} />
          <div className={styles.subText}>*본 차트는 실제 차트와 다를 수 있습니다.</div>
          <br />
          <ul>
            <li><strong>행 분석:</strong> 특정 피처가 어느 시점에서 영향을 미쳤는지 확인할 수 있습니다 (예: IA 피처가 어느 순간 초록에서 빨강으로 바뀜)</li>
            <li><strong>열 분석:</strong> 특정 시점에서 어떤 피처가 더 큰 영향을 미쳤는지 비교할 수 있습니다(예: 특정 T 시점에서 IA 피처가 IA_DIFF 피처보다 더 큰 영향을 끼침)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DynamaskModal;
