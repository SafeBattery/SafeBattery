import React from 'react';
import styles from './DeleteModal.module.css'; 

interface DeleteModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ onClose, onConfirm }) => {
  return (
    <div className={styles.deleteModalOverlay}>
      <div className={styles.deleteModal}>
        <h2>정말로 삭제하시겠습니까?</h2>
        <div className={styles.deleteModalActions}>
          <button onClick={onConfirm}>예</button>
          <button onClick={onClose}>아니요</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;