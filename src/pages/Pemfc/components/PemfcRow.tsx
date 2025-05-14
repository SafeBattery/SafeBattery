import { PemfcInstance } from "../types/pemfc";
import { useNavigate } from "react-router-dom";

interface PemfcRowProps {
  item: PemfcInstance;
  index: number;
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
  handleDelete: (index: number) => void;
  styles: { [key: string]: string };
}

const PemfcRow: React.FC<PemfcRowProps> = ({
  item,
  index,
  selectedIndex,
  setSelectedIndex,
  handleDelete,
  styles,
}) => {

  const navigate = useNavigate();
  const handleOpenDashboard = (id: number) => {
    navigate(`/${id}/dashboard`);
  };
  const statusLabel =
    item.state === 'NORMAL' ? '정상' : item.state === 'WARNING' ? '경고' : '위험';
  const statusStyle =
    item.state === 'NORMAL'
      ? styles.normal
      : item.state === 'WARNING'
      ? styles.warning
      : styles.danger;

  return (
    <tr>
      <td>
        {item.id}
        <span className="material-icons" 
          style = {{ verticalAlign: 'middle',
            marginLeft: '10px',
            color: '#4f7bf6',
            cursor: 'pointer' }}
          onClick={() => handleOpenDashboard(item.id)}
          >
            open_in_new
          </span>
      </td>
      <td>
        <div className={`${styles.deviceStatus} ${statusStyle}`}>{statusLabel}</div>
      </td>
      <td>{item.manufacturedDate}</td>
      <td>{item.clientId}</td>
      <td style={{ position: 'relative' }}>
        <span
          className="material-icons"
          style={{ cursor: 'pointer', verticalAlign: 'middle', color: 'gray' }}
          onClick={() => handleDelete(index)}
        >
          delete
        </span>
      </td>
    </tr>
  );
};

export default PemfcRow;
