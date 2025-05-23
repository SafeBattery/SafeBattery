import React, { useState } from 'react';
import styles from '../Pemfc.module.css';

interface RegistrationModalProps {
  onClose: () => void;
  onSubmit: (data: {
    modelName: string;
    clientId: number;
    lat: number;
    lng: number;
    manufacturedDate: string;
  }) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ onClose, onSubmit }) => {
  const [modelName, setModelName] = useState('');
  const [clientId, setClientId] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState('');

  const handleSubmit = () => {
    console.log('Submitting clientId:', clientId);
    onSubmit({
      modelName,
      clientId: parseInt(clientId, 10),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      manufacturedDate,
    });
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.formRegistration}>
          <div className={styles.legend}>
            <div className={styles.formTitle}>PEMFC 등록</div>
          </div>
          <div className={styles.inputField}>
            <div className={styles.label}>PEMFC명</div>
            <input
              className={styles.input}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="PEMFC명을 입력하세요"
            />
          </div>
          <div className={styles.inputField}>
            <div className={styles.label}>고객 식별번호</div>
            <input
              className={styles.input}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="고객 식별번호를 입력하세요"
            />
          </div>
          <div className={styles.inputField}>
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
          <div className={styles.inputField}>
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
            <button className={styles.cancelButton} onClick={onClose}>
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;
