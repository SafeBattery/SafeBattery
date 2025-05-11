interface StatusCardProps {
  label: string;
  count: number;
  type: 'normal' | 'warning' | 'danger';
  styles: { [key: string]: string };
}

const StatusCard: React.FC<StatusCardProps> = ({ label, count, type, styles }) => {
  return (
    <div className={`${styles.statusBox} ${styles[type]}`}>
      <div className={styles.label}>{label}</div>
      <hr className={styles.divider} />
      <div className={styles.count}>{count}개</div>
    </div>
  );
};

export default StatusCard;
