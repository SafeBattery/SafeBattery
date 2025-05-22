import { useEffect, useState } from "react";
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
  const [clientName, setClientName] = useState<string>("");
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

  // 클라이언트 이름 불러오기
  useEffect(() => {
    if (!item.clientId) return;

    fetch(`http://ec2-3-39-41-151.ap-northeast-2.compute.amazonaws.com:8080/api/client/${item.clientId}/name`)
      .then(res => res.text())
      .then(name => setClientName(name))
      .catch(err => {
        console.error("클라이언트 이름 불러오기 실패:", err);
        setClientName("(알 수 없음)");
      });
  }, [item.clientId]);

  return (
    <tr>
      <td>
        {item.modelName}
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
      <td>{clientName}</td>
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
